import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import {
  transactionsTable,
  ilolitClaimsTable,
  listingsTable,
  usersTable,
  notificationsTable,
  auctionsTable,
  offersTable,
} from "@workspace/db";
import { eq, and, or, desc, sql } from "drizzle-orm";
import { newId } from "../lib/ids";
import { formatListing } from "../lib/listing";

const router: IRouter = Router();

async function formatTransaction(
  tx: typeof transactionsTable.$inferSelect,
) {
  const [listing, buyer, seller, claim] = await Promise.all([
    db.query.listingsTable.findFirst({
      where: eq(listingsTable.id, tx.listingId),
    }),
    db.query.usersTable.findFirst({ where: eq(usersTable.id, tx.buyerId) }),
    db.query.usersTable.findFirst({ where: eq(usersTable.id, tx.sellerId) }),
    db.query.ilolitClaimsTable.findFirst({
      where: eq(ilolitClaimsTable.transactionId, tx.id),
    }),
  ]);

  return {
    id: tx.id,
    amount: tx.amount,
    listingPrice: tx.listingPrice,
    ilolitFee: tx.ilolitFee,
    shippingFee: tx.shippingFee,
    totalAmount: tx.totalAmount,
    currency: tx.currency,
    status: tx.status,
    paymentMethod: tx.paymentMethod,
    isIlolitActive: tx.isIlolitActive,
    shippingAddress: tx.shippingAddress,
    shippingMethod: tx.shippingMethod,
    trackingNumber: tx.trackingNumber,
    createdAt: tx.createdAt,
    completedAt: tx.completedAt,
    paidAt: tx.paidAt,
    listing: listing
      ? {
          id: listing.id,
          title: listing.title,
          price: listing.price,
          currency: listing.currency,
        }
      : null,
    buyer: buyer
      ? {
          id: buyer.id,
          username: buyer.username,
          fullName: buyer.fullName,
          avatarUrl: buyer.avatarUrl,
        }
      : null,
    seller: seller
      ? {
          id: seller.id,
          username: seller.username,
          fullName: seller.fullName,
          avatarUrl: seller.avatarUrl,
        }
      : null,
    ilolitClaim: claim ?? null,
  };
}

router.get("/transactions", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.clerkId, clerkId),
  });
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  const { page = "1", limit = "20", role, listingId } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, parseInt(limit));
  const offset = (pageNum - 1) * limitNum;

  const roleFilter =
    role === "buyer"
      ? eq(transactionsTable.buyerId, user.id)
      : role === "seller"
        ? eq(transactionsTable.sellerId, user.id)
        : or(
            eq(transactionsTable.buyerId, user.id),
            eq(transactionsTable.sellerId, user.id),
          );

  const where = listingId
    ? and(roleFilter, eq(transactionsTable.listingId, listingId))
    : roleFilter;

  const [rows, totalRows] = await Promise.all([
    db.query.transactionsTable.findMany({
      where,
      orderBy: desc(transactionsTable.createdAt),
      limit: limitNum,
      offset,
    }),
    db
      .select({ count: sql<number>`count(*)` })
      .from(transactionsTable)
      .where(where),
  ]);

  const items = await Promise.all(rows.map(formatTransaction));
  const total = Number(totalRows[0]?.count ?? 0);

  res.json({ items, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) });
});

router.post("/transactions", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.clerkId, clerkId),
  });
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  const { listingId, isIlolitActive = true, paymentMethod, shippingAddress, shippingMethod } = req.body;
  if (!listingId) {
    res.status(400).json({ error: "listingId required" });
    return;
  }

  const listing = await db.query.listingsTable.findFirst({
    where: eq(listingsTable.id, listingId),
  });
  if (!listing) {
    res.status(404).json({ error: "Listing not found" });
    return;
  }
  if (listing.userId === user.id) {
    res.status(400).json({ error: "Cannot buy own listing" });
    return;
  }
  if (listing.isSold) {
    res.status(400).json({ error: "Listing already sold" });
    return;
  }

  // Deal (accepted offer) and auction-won purchases already have a server-created
  // PENDING draft transaction (created on offer accept / auction settlement).
  // Reuse that draft instead of creating a new one to avoid duplicate transactions
  // and to guarantee the negotiated/won price is charged, not the raw listing price.
  const existingDraft = await db.query.transactionsTable.findFirst({
    where: and(
      eq(transactionsTable.listingId, listingId),
      eq(transactionsTable.status, "PENDING"),
    ),
    orderBy: desc(transactionsTable.createdAt),
  });

  let tx: typeof transactionsTable.$inferSelect | undefined;

  if (listing.listingType === "AUCTION") {
    const auction = await db.query.auctionsTable.findFirst({
      where: eq(auctionsTable.listingId, listingId),
    });
    if (!auction || auction.status !== "ENDED" || auction.winnerId !== user.id) {
      res.status(403).json({ error: "Csak az aukció nyertese vásárolhatja meg ezt a terméket" });
      return;
    }
    if (!existingDraft || existingDraft.buyerId !== user.id) {
      res.status(409).json({ error: "A tranzakció még nem áll készen, próbáld újra röviddel később" });
      return;
    }
    tx = existingDraft;
  } else {
    const acceptedOffer = await db.query.offersTable.findFirst({
      where: and(
        eq(offersTable.listingId, listingId),
        eq(offersTable.status, "ACCEPTED"),
      ),
      orderBy: desc(offersTable.updatedAt),
    });
    if (acceptedOffer) {
      if (acceptedOffer.buyerId !== user.id) {
        res.status(403).json({ error: "Csak az elfogadott ajánlat tulajdonosa vásárolhatja meg ezt a terméket" });
        return;
      }
      if (!existingDraft || existingDraft.buyerId !== user.id) {
        res.status(409).json({ error: "A tranzakció még nem áll készen, próbáld újra röviddel később" });
        return;
      }
      tx = existingDraft;
    }
  }

  if (tx) {
    await db
      .update(transactionsTable)
      .set({
        paymentMethod: paymentMethod ?? null,
        shippingAddress: shippingAddress ?? null,
        shippingMethod: shippingMethod ?? null,
        isIlolitActive,
      })
      .where(eq(transactionsTable.id, tx.id));
  } else {
    const listingPrice = listing.price;
    const shippingFee = 990;
    const ilolitFee = isIlolitActive
      ? Math.min(5000, Math.max(200, listingPrice * 0.05))
      : 0;
    const totalAmount = listingPrice + shippingFee + ilolitFee;

    const id = newId();
    await db.insert(transactionsTable).values({
      id,
      amount: listingPrice,
      listingPrice,
      ilolitFee,
      shippingFee,
      totalAmount,
      paymentMethod: paymentMethod ?? null,
      isIlolitActive,
      shippingAddress: shippingAddress ?? null,
      shippingMethod: shippingMethod ?? null,
      listingId,
      buyerId: user.id,
      sellerId: listing.userId,
      status: "PENDING",
    });
    tx = await db.query.transactionsTable.findFirst({
      where: eq(transactionsTable.id, id),
    });
  }

  await db
    .update(listingsTable)
    .set({ status: "PENDING", isSold: false })
    .where(eq(listingsTable.id, listingId));

  const finalTx = await db.query.transactionsTable.findFirst({
    where: eq(transactionsTable.id, tx!.id),
  });
  res.status(201).json(await formatTransaction(finalTx!));
});

router.get("/transactions/seller-payout-summary", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.clerkId, clerkId) });
  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  const allTxs = await db.query.transactionsTable.findMany({
    where: eq(transactionsTable.sellerId, user.id),
  });

  const pendingEscrow = allTxs
    .filter((t) => t.status === "PAID_PENDING_CONFIRMATION")
    .reduce((sum, t) => sum + t.listingPrice, 0);

  const confirmedPayout = allTxs
    .filter((t) => t.status === "COMPLETED")
    .reduce((sum, t) => sum + t.listingPrice, 0);

  const totalEarnings = allTxs
    .filter((t) => t.status === "COMPLETED")
    .reduce((sum, t) => sum + t.listingPrice, 0);

  res.json({ pendingEscrow, confirmedPayout, totalEarnings, currency: "HUF" });
});

router.get("/transactions/:id", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.clerkId, clerkId),
  });
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  const tx = await db.query.transactionsTable.findFirst({
    where: eq(transactionsTable.id, req.params.id),
  });
  if (!tx) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (tx.buyerId !== user.id && tx.sellerId !== user.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  res.json(await formatTransaction(tx));
});

router.patch("/transactions/:id/status", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.clerkId, clerkId),
  });
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  const tx = await db.query.transactionsTable.findFirst({
    where: eq(transactionsTable.id, req.params.id),
  });
  if (!tx) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (tx.buyerId !== user.id && tx.sellerId !== user.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const { status, trackingNumber } = req.body;
  const updates: Partial<typeof transactionsTable.$inferInsert> = {
    status,
    updatedAt: new Date(),
  };
  if (trackingNumber) updates.trackingNumber = trackingNumber;
  if (status === "CONFIRMED" || status === "DELIVERED") {
    updates.completedAt = new Date();
  }
  if (status === "CONFIRMED") {
    await db
      .update(listingsTable)
      .set({ status: "SOLD", isSold: true })
      .where(eq(listingsTable.id, tx.listingId));
    await db
      .update(usersTable)
      .set({ soldCount: sql`${usersTable.soldCount} + 1` })
      .where(eq(usersTable.id, tx.sellerId));
  }

  const [updated] = await db
    .update(transactionsTable)
    .set(updates)
    .where(eq(transactionsTable.id, tx.id))
    .returning();

  res.json(await formatTransaction(updated));
});

router.post("/transactions/:id/initiate-payment", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.clerkId, clerkId) });
  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  const channel: string = req.body?.channel;
  if (channel !== "web" && channel !== "mobile") {
    res.status(400).json({ error: "channel must be 'web' or 'mobile'" });
    return;
  }

  const tx = await db.query.transactionsTable.findFirst({ where: eq(transactionsTable.id, req.params.id) });
  if (!tx) { res.status(404).json({ error: "Not found" }); return; }
  if (tx.buyerId !== user.id) { res.status(403).json({ error: "Only buyer can initiate payment" }); return; }
  if (!["PENDING", "PAYMENT_PENDING"].includes(tx.status)) {
    res.status(400).json({ error: "Transaction is not in a payable state" });
    return;
  }

  const { getUncachableStripeClient, getStripePublishableKey } = await import("../stripeClient");
  const stripe = await getUncachableStripeClient();
  const listing = await db.query.listingsTable.findFirst({ where: eq(listingsTable.id, tx.listingId) });
  const domain = process.env.REPLIT_DOMAINS?.split(",")[0] ?? "localhost:80";
  const baseUrl = `https://${domain}`;

  if (channel === "web") {
    // Web: create/reuse a PaymentIntent only (Stripe Elements)
    const publishableKey = await getStripePublishableKey();
    let piClientSecret: string | null = null;
    let paymentIntentId = tx.paymentIntentId;

    if (paymentIntentId) {
      const existing = await stripe.paymentIntents.retrieve(paymentIntentId);
      if (existing.status === "succeeded") {
        res.status(400).json({ error: "Payment already completed" });
        return;
      }
      if (existing.status !== "canceled") {
        piClientSecret = existing.client_secret;
      }
    }

    if (!piClientSecret) {
      const pi = await stripe.paymentIntents.create({
        amount: Math.round(tx.totalAmount * 100),
        currency: tx.currency.toLowerCase(),
        metadata: { transactionId: tx.id },
        description: `Loloit: ${listing?.title ?? tx.listingId}`,
      });
      paymentIntentId = pi.id;
      piClientSecret = pi.client_secret;
      await db.update(transactionsTable)
        .set({ paymentIntentId: pi.id, status: "PAYMENT_PENDING", updatedAt: new Date() })
        .where(eq(transactionsTable.id, tx.id));
    }

    res.json({
      clientSecret: piClientSecret,
      publishableKey,
      amount: tx.totalAmount,
      currency: tx.currency.toLowerCase(),
    });
  } else {
    // Mobile: create a Checkout Session only (hosted checkout via browser)
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: tx.currency.toLowerCase(),
          unit_amount: Math.round(tx.totalAmount * 100),
          product_data: { name: listing?.title ?? "Loloit vásárlás" },
        },
        quantity: 1,
      }],
      mode: "payment",
      metadata: { transactionId: tx.id },
      success_url: `${baseUrl}/checkout/success?tx=${tx.id}`,
      cancel_url: `${baseUrl}/checkout/cancel?tx=${tx.id}`,
    });
    await db.update(transactionsTable)
      .set({ status: "PAYMENT_PENDING", updatedAt: new Date() })
      .where(eq(transactionsTable.id, tx.id));
    res.json({
      checkoutUrl: session.url,
      amount: tx.totalAmount,
      currency: tx.currency.toLowerCase(),
    });
  }
});

router.post("/transactions/:id/payment-intent", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.clerkId, clerkId) });
  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  const tx = await db.query.transactionsTable.findFirst({ where: eq(transactionsTable.id, req.params.id) });
  if (!tx) { res.status(404).json({ error: "Not found" }); return; }
  if (tx.buyerId !== user.id) { res.status(403).json({ error: "Only buyer can initiate payment" }); return; }
  if (!["PENDING", "PAYMENT_PENDING"].includes(tx.status)) {
    res.status(400).json({ error: "Transaction is not in a payable state" });
    return;
  }

  const { getUncachableStripeClient, getStripePublishableKey } = await import("../stripeClient");

  const stripe = await getUncachableStripeClient();
  const publishableKey = await getStripePublishableKey();

  let paymentIntentId = tx.paymentIntentId;

  if (paymentIntentId) {
    const existing = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (existing.status === "succeeded") {
      res.status(400).json({ error: "Payment already completed" });
      return;
    }
    if (existing.status !== "canceled") {
      res.json({
        clientSecret: existing.client_secret,
        publishableKey,
        amount: tx.totalAmount,
        currency: tx.currency.toLowerCase(),
      });
      return;
    }
  }

  const listing = await db.query.listingsTable.findFirst({ where: eq(listingsTable.id, tx.listingId) });

  const pi = await stripe.paymentIntents.create({
    amount: Math.round(tx.totalAmount * 100),
    currency: tx.currency.toLowerCase(),
    metadata: { transactionId: tx.id },
    description: `Loloit: ${listing?.title ?? tx.listingId}`,
  });

  await db.update(transactionsTable)
    .set({ paymentIntentId: pi.id, status: "PAYMENT_PENDING", updatedAt: new Date() })
    .where(eq(transactionsTable.id, tx.id));

  res.json({
    clientSecret: pi.client_secret,
    publishableKey,
    amount: tx.totalAmount,
    currency: tx.currency.toLowerCase(),
  });
});

router.post("/transactions/:id/checkout-session", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.clerkId, clerkId) });
  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  const tx = await db.query.transactionsTable.findFirst({ where: eq(transactionsTable.id, req.params.id) });
  if (!tx) { res.status(404).json({ error: "Not found" }); return; }
  if (tx.buyerId !== user.id) { res.status(403).json({ error: "Only buyer can initiate payment" }); return; }
  if (!["PENDING", "PAYMENT_PENDING"].includes(tx.status)) {
    res.status(400).json({ error: "Transaction is not in a payable state" });
    return;
  }

  const listing = await db.query.listingsTable.findFirst({ where: eq(listingsTable.id, tx.listingId) });
  const { getUncachableStripeClient } = await import("../stripeClient");
  const stripe = await getUncachableStripeClient();

  const domain = process.env.REPLIT_DOMAINS?.split(",")[0] ?? "localhost:80";
  const baseUrl = `https://${domain}`;

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: tx.currency.toLowerCase(),
          unit_amount: Math.round(tx.totalAmount * 100),
          product_data: {
            name: listing?.title ?? "Loloit vásárlás",
            description: `Ilolit védelem tartalmazza (${Math.round(tx.ilolitFee)} Ft)`,
          },
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    metadata: { transactionId: tx.id },
    success_url: `${baseUrl}/checkout/success?tx=${tx.id}`,
    cancel_url: `${baseUrl}/checkout/cancel?tx=${tx.id}`,
  });

  await db.update(transactionsTable)
    .set({ status: "PAYMENT_PENDING", updatedAt: new Date() })
    .where(eq(transactionsTable.id, tx.id));

  res.json({ url: session.url });
});

router.post("/transactions/:id/confirm", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.clerkId, clerkId) });
  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  const tx = await db.query.transactionsTable.findFirst({ where: eq(transactionsTable.id, req.params.id) });
  if (!tx) { res.status(404).json({ error: "Not found" }); return; }
  if (tx.buyerId !== user.id) { res.status(403).json({ error: "Only buyer can confirm delivery" }); return; }
  if (tx.status !== "PAID_PENDING_CONFIRMATION") {
    res.status(400).json({ error: "Transaction must be PAID_PENDING_CONFIRMATION to confirm" });
    return;
  }

  const { confirmAndPayout } = await import("../jobs/escrowRelease");
  await confirmAndPayout(tx.id, "buyer");

  const updated = await db.query.transactionsTable.findFirst({ where: eq(transactionsTable.id, tx.id) });
  res.json(await formatTransaction(updated!));
});

router.post("/transactions/:id/dispute", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.clerkId, clerkId) });
  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  const tx = await db.query.transactionsTable.findFirst({ where: eq(transactionsTable.id, req.params.id) });
  if (!tx) { res.status(404).json({ error: "Not found" }); return; }
  if (tx.buyerId !== user.id) { res.status(403).json({ error: "Only buyer can dispute" }); return; }
  if (!["PAID_PENDING_CONFIRMATION", "COMPLETED"].includes(tx.status)) {
    res.status(400).json({ error: "Transaction cannot be disputed in its current state" });
    return;
  }

  const { reason = "Nem kaptam meg / Hibás termék", description = "" } = req.body ?? {};

  await db.update(transactionsTable)
    .set({ status: "DISPUTED", updatedAt: new Date() })
    .where(eq(transactionsTable.id, tx.id));

  const [buyer, listing] = await Promise.all([
    db.query.usersTable.findFirst({ where: eq(usersTable.id, tx.buyerId) }),
    db.query.listingsTable.findFirst({ where: eq(listingsTable.id, tx.listingId) }),
  ]);

  await db.insert(notificationsTable).values({
    id: newId(),
    userId: tx.sellerId,
    type: "purchase",
    title: "⚠️ Vevő problémát jelzett",
    message: `A vevő (${buyer?.username ?? "ismeretlen"}) problémát jelzett a(z) "${listing?.title ?? tx.listingId}" termékkel kapcsolatban. Ok: ${reason}. Hamarosan felvesszük veled a kapcsolatot.`,
    link: `/dashboard/transactions`,
  });

  // Notify admin of dispute
  const adminClerkId = process.env.ADMIN_CLERK_ID;
  if (adminClerkId) {
    const admin = await db.query.usersTable.findFirst({ where: eq(usersTable.clerkId, adminClerkId) });
    if (admin) {
      await db.insert(notificationsTable).values({
        id: newId(),
        userId: admin.id,
        type: "system",
        title: "🚨 Vita beérkezett",
        message: `${buyer?.username ?? "Ismeretlen vevő"} vitát kezdeményezett: "${listing?.title ?? tx.listingId}" (Tranzakció: ${tx.id}). Ok: ${reason}. Leírás: ${description || "–"}`,
        link: `/dashboard/transactions`,
      });
    }
  } else {
    req.log.warn({ txId: tx.id, reason }, "Dispute filed — set ADMIN_CLERK_ID env var to enable admin notifications");
  }

  const updated = await db.query.transactionsTable.findFirst({ where: eq(transactionsTable.id, tx.id) });
  res.json(await formatTransaction(updated!));
});

router.post("/transactions/:id/ilolit-claim", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.clerkId, clerkId),
  });
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  const tx = await db.query.transactionsTable.findFirst({
    where: eq(transactionsTable.id, req.params.id),
  });
  if (!tx) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (tx.buyerId !== user.id) {
    res.status(403).json({ error: "Only buyer can file Ilolit claim" });
    return;
  }
  if (!tx.isIlolitActive) {
    res.status(400).json({ error: "Ilolit not active on this transaction" });
    return;
  }

  const { reason, description, evidenceImages = [] } = req.body;
  const [claim] = await db
    .insert(ilolitClaimsTable)
    .values({
      id: newId(),
      reason,
      description,
      evidenceImages,
      transactionId: tx.id,
    })
    .returning();

  await db
    .update(transactionsTable)
    .set({ status: "DISPUTED", updatedAt: new Date() })
    .where(eq(transactionsTable.id, tx.id));

  res.status(201).json(claim);
});

export default router;

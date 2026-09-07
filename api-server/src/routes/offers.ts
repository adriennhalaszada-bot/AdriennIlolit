import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import {
  offersTable,
  listingsTable,
  usersTable,
  notificationsTable,
} from "@workspace/db";
import { eq, or, and, desc } from "drizzle-orm";
import { newId } from "../lib/ids";
import { formatListing } from "../lib/listing";
import { transactionsTable } from "@workspace/db";

const router: IRouter = Router();

const OFFER_EXPIRY_HOURS = 48;
const MAX_ROUNDS = 3;

async function formatOffer(offer: typeof offersTable.$inferSelect) {
  const [listing, buyer, seller] = await Promise.all([
    db.query.listingsTable.findFirst({ where: eq(listingsTable.id, offer.listingId) }),
    db.query.usersTable.findFirst({ where: eq(usersTable.id, offer.buyerId) }),
    db.query.usersTable.findFirst({ where: eq(usersTable.id, offer.sellerId) }),
  ]);

  return {
    id: offer.id,
    listingId: offer.listingId,
    listing: listing ? await formatListing(listing) : null,
    buyerId: offer.buyerId,
    buyer: buyer ? { id: buyer.id, username: buyer.username, avatarUrl: buyer.avatarUrl } : null,
    sellerId: offer.sellerId,
    seller: seller ? { id: seller.id, username: seller.username, avatarUrl: seller.avatarUrl } : null,
    amount: offer.amount,
    message: offer.message,
    status: offer.status,
    round: offer.round,
    parentOfferId: offer.parentOfferId,
    expiresAt: offer.expiresAt,
    createdAt: offer.createdAt,
  };
}

router.get("/offers", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.clerkId, clerkId) });
  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  const { role } = req.query as { role?: string };

  const now = new Date();
  let offers: (typeof offersTable.$inferSelect)[];

  if (role === "buyer") {
    offers = await db.query.offersTable.findMany({
      where: eq(offersTable.buyerId, user.id),
      orderBy: desc(offersTable.createdAt),
    });
  } else if (role === "seller") {
    offers = await db.query.offersTable.findMany({
      where: eq(offersTable.sellerId, user.id),
      orderBy: desc(offersTable.createdAt),
    });
  } else {
    offers = await db.query.offersTable.findMany({
      where: or(
        eq(offersTable.buyerId, user.id),
        eq(offersTable.sellerId, user.id),
      ),
      orderBy: desc(offersTable.createdAt),
    });
  }

  for (const offer of offers) {
    if (offer.status === "PENDING" && offer.expiresAt <= now) {
      await db
        .update(offersTable)
        .set({ status: "EXPIRED", updatedAt: new Date() })
        .where(eq(offersTable.id, offer.id));
      offer.status = "EXPIRED";
    }
  }

  const formatted = await Promise.all(offers.map(formatOffer));
  res.json(formatted);
});

router.post("/offers", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.clerkId, clerkId) });
  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  const { listingId, amount, message } = req.body;

  if (!listingId || !amount || typeof amount !== "number" || amount <= 0) {
    res.status(400).json({ error: "Hiányzó vagy érvénytelen mezők" });
    return;
  }

  const listing = await db.query.listingsTable.findFirst({
    where: eq(listingsTable.id, listingId),
  });
  if (!listing) { res.status(404).json({ error: "Hirdetés nem található" }); return; }

  if (listing.listingType !== "NEGOTIABLE") {
    res.status(400).json({ error: "Ez a hirdetés nem alkudozható" });
    return;
  }
  if (listing.userId === user.id) {
    res.status(400).json({ error: "Saját hirdetésre nem tehetsz ajánlatot" });
    return;
  }
  if (listing.isSold || listing.status !== "ACTIVE") {
    res.status(409).json({ error: "Erre a hirdetésre már nem tehető ajánlat" });
    return;
  }

  const activeOffer = await db.query.offersTable.findFirst({
    where: and(
      eq(offersTable.listingId, listingId),
      eq(offersTable.buyerId, user.id),
      eq(offersTable.status, "PENDING"),
    ),
  });
  if (activeOffer) {
    res.status(400).json({ error: "Már van függőben lévő ajánlatod erre a termékre" });
    return;
  }

  const expiresAt = new Date(Date.now() + OFFER_EXPIRY_HOURS * 60 * 60 * 1000);
  const offerId = newId();

  await db.insert(offersTable).values({
    id: offerId,
    listingId,
    buyerId: user.id,
    sellerId: listing.userId,
    amount,
    message: message ?? null,
    status: "PENDING",
    round: 1,
    expiresAt,
  });

  const notifId = newId();
  await db.insert(notificationsTable).values({
    id: notifId,
    userId: listing.userId,
    type: "offer",
    title: "Új Loloit Deal ajánlat!",
    message: `${user.username} ${amount.toLocaleString("hu-HU")} Ft-ot ajánlott a(z) "${listing.title}" termékért.`,
    link: `/product/${listingId}`,
  });

  const offer = await db.query.offersTable.findFirst({ where: eq(offersTable.id, offerId) });
  res.status(201).json(await formatOffer(offer!));
});

router.get("/offers/:id", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.clerkId, clerkId) });
  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  const offer = await db.query.offersTable.findFirst({
    where: eq(offersTable.id, req.params.id),
  });
  if (!offer) { res.status(404).json({ error: "Ajánlat nem található" }); return; }
  if (offer.buyerId !== user.id && offer.sellerId !== user.id) {
    res.status(403).json({ error: "Forbidden" }); return;
  }
  res.json(await formatOffer(offer));
});

router.post("/offers/:id/respond", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.clerkId, clerkId) });
  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  const offer = await db.query.offersTable.findFirst({
    where: eq(offersTable.id, req.params.id),
  });
  if (!offer) { res.status(404).json({ error: "Ajánlat nem található" }); return; }
  if (offer.status !== "PENDING" && offer.status !== "COUNTERED") {
    res.status(400).json({ error: "Ez az ajánlat már nem aktív" }); return;
  }
  if (offer.expiresAt && offer.expiresAt < new Date()) {
    await db.update(offersTable).set({ status: "EXPIRED", updatedAt: new Date() }).where(eq(offersTable.id, offer.id));
    res.status(400).json({ error: "Az ajánlat lejárt (48 óra)" }); return;
  }
  if (offer.sellerId !== user.id && offer.buyerId !== user.id) {
    res.status(403).json({ error: "Nincs jogosultságod ehhez az ajánlathoz" }); return;
  }

  const { action, counterAmount, message } = req.body;

  if (action === "accept") {
    if (offer.sellerId !== user.id) {
      res.status(403).json({ error: "Csak az eladó fogadhatja el az ajánlatot" }); return;
    }

    try {
      await db.transaction(async (tx) => {
        const freshListing = await tx.query.listingsTable.findFirst({
          where: eq(listingsTable.id, offer.listingId),
        });
        if (!freshListing || freshListing.isSold || freshListing.status !== "ACTIVE") {
          throw new Error("LISTING_LOCKED");
        }
        const alreadyAccepted = await tx.query.offersTable.findFirst({
          where: and(
            eq(offersTable.listingId, offer.listingId),
            eq(offersTable.status, "ACCEPTED"),
          ),
        });
        if (alreadyAccepted) {
          throw new Error("LISTING_LOCKED");
        }

        await tx
          .update(offersTable)
          .set({ status: "ACCEPTED", updatedAt: new Date() })
          .where(eq(offersTable.id, offer.id));

        // Any other still-open offers on this listing are now moot.
        await tx
          .update(offersTable)
          .set({ status: "REJECTED", updatedAt: new Date() })
          .where(
            and(
              eq(offersTable.listingId, offer.listingId),
              or(eq(offersTable.status, "PENDING"), eq(offersTable.status, "COUNTERED")),
            ),
          );

        // Lock the listing immediately so no other offer can be accepted
        // and direct/auction purchase paths can't race with this deal.
        await tx
          .update(listingsTable)
          .set({ status: "PENDING" })
          .where(eq(listingsTable.id, offer.listingId));

        const ILOLIT_FEE = (price: number) =>
          Math.min(5000, Math.max(200, Math.round(price * 0.05)));

        const ilolitFee = ILOLIT_FEE(offer.amount);
        const shippingFee = 990;
        const totalAmount = offer.amount + shippingFee + ilolitFee;

        await tx.insert(transactionsTable).values({
          id: newId(),
          amount: offer.amount,
          listingPrice: offer.amount,
          ilolitFee,
          shippingFee,
          totalAmount,
          currency: "HUF",
          status: "PENDING",
          isIlolitActive: true,
          listingId: offer.listingId,
          buyerId: offer.buyerId,
          sellerId: offer.sellerId,
        });
      });
    } catch (err) {
      if (err instanceof Error && err.message === "LISTING_LOCKED") {
        res.status(409).json({ error: "Erre a hirdetésre már elfogadtak egy ajánlatot, vagy folyamatban van a vásárlása" });
        return;
      }
      throw err;
    }

    const notifId = newId();
    await db.insert(notificationsTable).values({
      id: notifId,
      userId: offer.buyerId,
      type: "offer",
      title: "Ajánlatod elfogadták!",
      message: `Az eladó elfogadta a(z) ${offer.amount.toLocaleString("hu-HU")} Ft-os ajánlatodat. Lépj tovább a fizetéshez!`,
      link: `/checkout/${offer.listingId}?offerId=${offer.id}`,
    });
  } else if (action === "reject") {
    const isParty = offer.sellerId === user.id || offer.buyerId === user.id;
    if (!isParty) { res.status(403).json({ error: "Forbidden" }); return; }
    await db
      .update(offersTable)
      .set({ status: "REJECTED", updatedAt: new Date() })
      .where(eq(offersTable.id, offer.id));

    const notifUserId = offer.sellerId === user.id ? offer.buyerId : offer.sellerId;
    await db.insert(notificationsTable).values({
      id: newId(),
      userId: notifUserId,
      type: "offer",
      title: "Ajánlatot elutasítottak",
      message: `Az ajánlat ${offer.amount.toLocaleString("hu-HU")} Ft-ra elutasításra került.`,
      link: `/product/${offer.listingId}`,
    });
  } else if (action === "counter") {
    if (!counterAmount || typeof counterAmount !== "number" || counterAmount <= 0) {
      res.status(400).json({ error: "Érvénytelen visszaajánlat összeg" }); return;
    }
    if (offer.round >= MAX_ROUNDS) {
      res.status(400).json({ error: `Elértétek a maximális ${MAX_ROUNDS} körös alkudozási limitet` }); return;
    }

    const isSeller = offer.sellerId === user.id;
    const isBuyer = offer.buyerId === user.id;
    if (!isSeller && !isBuyer) { res.status(403).json({ error: "Forbidden" }); return; }

    await db
      .update(offersTable)
      .set({ status: "COUNTERED", updatedAt: new Date() })
      .where(eq(offersTable.id, offer.id));

    const expiresAt = new Date(Date.now() + OFFER_EXPIRY_HOURS * 60 * 60 * 1000);
    const newOfferId = newId();
    await db.insert(offersTable).values({
      id: newOfferId,
      listingId: offer.listingId,
      buyerId: offer.buyerId,
      sellerId: offer.sellerId,
      amount: counterAmount,
      message: message ?? null,
      status: "PENDING",
      round: offer.round + 1,
      parentOfferId: offer.id,
      expiresAt,
    });

    const notifUserId = isSeller ? offer.buyerId : offer.sellerId;
    await db.insert(notificationsTable).values({
      id: newId(),
      userId: notifUserId,
      type: "offer",
      title: "Visszaajánlat érkezett!",
      message: `Új ajánlat: ${counterAmount.toLocaleString("hu-HU")} Ft (${offer.round + 1}. kör).`,
      link: `/product/${offer.listingId}`,
    });
  } else {
    res.status(400).json({ error: "Érvénytelen akció (accept | reject | counter)" }); return;
  }

  const updated = await db.query.offersTable.findFirst({
    where: eq(offersTable.id, offer.id),
  });
  res.json(await formatOffer(updated!));
});

router.post("/offers/:id/withdraw", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.clerkId, clerkId) });
  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  const offer = await db.query.offersTable.findFirst({
    where: eq(offersTable.id, req.params.id),
  });
  if (!offer) { res.status(404).json({ error: "Ajánlat nem található" }); return; }
  if (offer.buyerId !== user.id) { res.status(403).json({ error: "Csak a vevő vonhatja vissza" }); return; }
  if (offer.status !== "PENDING" && offer.status !== "COUNTERED") {
    res.status(400).json({ error: "Ez az ajánlat már nem visszavonható" }); return;
  }

  await db
    .update(offersTable)
    .set({ status: "WITHDRAWN", updatedAt: new Date() })
    .where(eq(offersTable.id, offer.id));

  const updated = await db.query.offersTable.findFirst({
    where: eq(offersTable.id, offer.id),
  });
  res.json(await formatOffer(updated!));
});

export default router;

import { db } from "@workspace/db";
import { transactionsTable, usersTable, listingsTable, notificationsTable } from "@workspace/db";
import { eq, and, lte, isNotNull, sql } from "drizzle-orm";
import { newId } from "../lib/ids";
import { logger } from "../lib/logger";

const ESCROW_RELEASE_DAYS = 14;

async function releaseExpiredEscrows() {
  const cutoff = new Date(Date.now() - ESCROW_RELEASE_DAYS * 24 * 60 * 60 * 1000);

  const expiredTxs = await db.query.transactionsTable.findMany({
    where: and(
      eq(transactionsTable.status, "PAID_PENDING_CONFIRMATION"),
      isNotNull(transactionsTable.paidAt),
      lte(transactionsTable.paidAt, cutoff),
    ),
  });

  for (const tx of expiredTxs) {
    try {
      await confirmAndPayout(tx.id, "auto-release");
      logger.info({ txId: tx.id }, "Escrow auto-released after 14 days");
    } catch (err) {
      logger.error({ err, txId: tx.id }, "Escrow auto-release failed");
    }
  }
}

export async function confirmAndPayout(
  txId: string,
  triggeredBy: "buyer" | "auto-release",
): Promise<void> {
  const now = new Date();

  // Atomic status guard: only update if still PAID_PENDING_CONFIRMATION — prevents double-execution
  const [updated] = await db
    .update(transactionsTable)
    .set({ status: "COMPLETED", completedAt: now, updatedAt: now })
    .where(
      and(
        eq(transactionsTable.id, txId),
        eq(transactionsTable.status, "PAID_PENDING_CONFIRMATION"),
      ),
    )
    .returning();

  if (!updated) {
    // Another call already processed this transaction — skip silently
    logger.info({ txId }, "confirmAndPayout skipped — status already advanced (idempotent)");
    return;
  }

  const [seller, listing] = await Promise.all([
    db.query.usersTable.findFirst({ where: eq(usersTable.id, updated.sellerId) }),
    db.query.listingsTable.findFirst({ where: eq(listingsTable.id, updated.listingId) }),
  ]);

  // Finalize marketplace state: mark listing SOLD + increment seller soldCount (idempotent)
  if (listing && !listing.isSold) {
    await db
      .update(listingsTable)
      .set({ status: "SOLD", isSold: true, updatedAt: new Date() })
      .where(eq(listingsTable.id, updated.listingId));
    await db
      .update(usersTable)
      .set({ soldCount: sql`${usersTable.soldCount} + 1`, updatedAt: new Date() })
      .where(eq(usersTable.id, updated.sellerId));
    logger.info({ txId, listingId: updated.listingId, sellerId: updated.sellerId }, "Listing marked SOLD, seller soldCount incremented");
  }

  // Attempt Stripe Transfer to connected seller account
  let transferId: string | null = null;
  try {
    const { getUncachableStripeClient } = await import("../stripeClient");
    const stripe = await getUncachableStripeClient();

    if (seller?.stripeAccountId) {
      const transfer = await stripe.transfers.create({
        amount: Math.round(updated.listingPrice * 100),
        currency: updated.currency.toLowerCase(),
        destination: seller.stripeAccountId,
        metadata: { transactionId: txId, triggeredBy },
        description: `Loloit payout: ${listing?.title ?? txId}`,
      });
      transferId = transfer.id;
      logger.info({ txId, transferId, sellerId: seller.id }, "Stripe Transfer created");
    } else {
      logger.warn(
        { txId, sellerId: updated.sellerId },
        "Seller has no connected Stripe account — manual payout required (Stripe Connect not configured)",
      );
    }
  } catch (err) {
    logger.error({ err, txId }, "Stripe Transfer failed — payout must be processed manually");
  }

  if (transferId) {
    await db
      .update(transactionsTable)
      .set({ stripeTransferId: transferId, updatedAt: new Date() })
      .where(eq(transactionsTable.id, txId));
  }

  // Notify seller
  const label =
    triggeredBy === "auto-release"
      ? "Automatikusan felszabadult (14 nap eltelt)"
      : "A vevő visszaigazolta a kézbesítést";

  if (seller) {
    await db.insert(notificationsTable).values({
      id: newId(),
      userId: seller.id,
      type: "purchase",
      title: "💸 Kifizetés elindult!",
      message: `A(z) "${listing?.title ?? txId}" termék vételára (${Math.round(updated.listingPrice).toLocaleString("hu-HU")} Ft) kifizetés alatt. ${label}.${transferId ? ` (Átutalás: ${transferId})` : " Hamarosan feldolgozzuk."}`,
      link: `/dashboard/transactions`,
    });
  }
}

export function startEscrowReleaseJob() {
  const INTERVAL_MS = 60 * 60 * 1000;
  releaseExpiredEscrows().catch((err) =>
    logger.error({ err }, "Initial escrow release failed"),
  );
  setInterval(() => {
    releaseExpiredEscrows().catch((err) =>
      logger.error({ err }, "Escrow release job failed"),
    );
  }, INTERVAL_MS);
  logger.info("Escrow release job started (1h interval, 14-day auto-release)");
}

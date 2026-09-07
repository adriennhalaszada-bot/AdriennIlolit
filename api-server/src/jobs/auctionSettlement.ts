import { db } from "@workspace/db";
import { auctionsTable, bidsTable, listingsTable, notificationsTable, transactionsTable } from "@workspace/db";
import { eq, and, lte, desc } from "drizzle-orm";
import { newId } from "../lib/ids";
import { logger } from "../lib/logger";

const ILOLIT_FEE = (price: number) =>
  Math.min(5000, Math.max(200, Math.round(price * 0.05)));

async function settleExpiredAuctions() {
  const now = new Date();

  const expiredAuctions = await db.query.auctionsTable.findMany({
    where: and(
      eq(auctionsTable.status, "ACTIVE"),
      lte(auctionsTable.endsAt, now),
    ),
  });

  for (const auction of expiredAuctions) {
    try {
      const listing = await db.query.listingsTable.findFirst({
        where: eq(listingsTable.id, auction.listingId),
      });

      if (auction.bidCount < 2) {
        await db
          .update(auctionsTable)
          .set({ status: "NO_WINNER", updatedAt: new Date() })
          .where(eq(auctionsTable.id, auction.id));

        if (listing) {
          await db.insert(notificationsTable).values({
            id: newId(),
            userId: listing.userId,
            type: "offer",
            title: "Aukció lezárult – nincs nyertes",
            message: `A(z) "${listing.title}" aukciója lezárult, de nem érkezett elegendő licit (minimum 2 szükséges).`,
            link: `/product/${listing.id}`,
          });
        }
        logger.info({ auctionId: auction.id }, "Auction closed with NO_WINNER (< 2 bids)");
        continue;
      }

      const winningBid = await db.query.bidsTable.findFirst({
        where: eq(bidsTable.auctionId, auction.id),
        orderBy: desc(bidsTable.amount),
      });

      if (!winningBid) {
        await db
          .update(auctionsTable)
          .set({ status: "NO_WINNER", updatedAt: new Date() })
          .where(eq(auctionsTable.id, auction.id));
        continue;
      }

      await db
        .update(auctionsTable)
        .set({
          status: "ENDED",
          winnerId: winningBid.userId,
          currentPrice: winningBid.amount,
          updatedAt: new Date(),
        })
        .where(eq(auctionsTable.id, auction.id));

      if (listing) {
        const winningPrice = winningBid.amount;
        const shippingFee = 990;
        const ilolitFee = ILOLIT_FEE(winningPrice);
        const totalAmount = winningPrice + shippingFee + ilolitFee;

        await db.insert(transactionsTable).values({
          id: newId(),
          amount: winningPrice,
          listingPrice: winningPrice,
          ilolitFee,
          shippingFee,
          totalAmount,
          currency: "HUF",
          status: "PENDING",
          isIlolitActive: true,
          listingId: listing.id,
          buyerId: winningBid.userId,
          sellerId: listing.userId,
        });

        await db
          .update(listingsTable)
          .set({ price: winningPrice })
          .where(eq(listingsTable.id, listing.id));

        await Promise.all([
          db.insert(notificationsTable).values({
            id: newId(),
            userId: winningBid.userId,
            type: "offer",
            title: "🎉 Nyertél az aukcióban!",
            message: `Megnyerted a(z) "${listing.title}" aukciót ${winningPrice.toLocaleString("hu-HU")} Ft-ért! A fizetési folyamat hamarosan indul.`,
            link: `/product/${listing.id}`,
          }),
          db.insert(notificationsTable).values({
            id: newId(),
            userId: listing.userId,
            type: "offer",
            title: "Aukció lezárult – nyertessel!",
            message: `A(z) "${listing.title}" aukciója lezárult. Nyertes licit: ${winningPrice.toLocaleString("hu-HU")} Ft.`,
            link: `/product/${listing.id}`,
          }),
        ]);

        logger.info({ auctionId: auction.id, winnerId: winningBid.userId, price: winningPrice }, "Auction settled with winner");
      }
    } catch (err) {
      logger.error({ err, auctionId: auction.id }, "Error settling auction");
    }
  }
}

export function startAuctionSettlementJob() {
  const INTERVAL_MS = 60 * 1000;
  settleExpiredAuctions().catch((err) => logger.error({ err }, "Initial auction settlement failed"));
  setInterval(() => {
    settleExpiredAuctions().catch((err) => logger.error({ err }, "Auction settlement job failed"));
  }, INTERVAL_MS);
  logger.info("Auction settlement job started (60s interval)");
}

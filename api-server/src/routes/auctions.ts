import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import {
  auctionsTable,
  bidsTable,
  listingsTable,
  usersTable,
  notificationsTable,
} from "@workspace/db";
import { eq, desc, and, sql } from "drizzle-orm";
import { newId } from "../lib/ids";
import { formatListing } from "../lib/listing";

const router: IRouter = Router();

const AUTO_EXTEND_MINUTES = 5;

async function formatAuction(auction: typeof auctionsTable.$inferSelect) {
  const listing = await db.query.listingsTable.findFirst({
    where: eq(listingsTable.id, auction.listingId),
  });
  let winner = null;
  if (auction.winnerId) {
    winner = await db.query.usersTable.findFirst({
      where: eq(usersTable.id, auction.winnerId),
    });
  }
  return {
    id: auction.id,
    listingId: auction.listingId,
    listing: listing ? await formatListing(listing) : null,
    startingPrice: auction.startingPrice,
    currentPrice: auction.currentPrice,
    minBidIncrement: auction.minBidIncrement,
    bidCount: auction.bidCount,
    status: auction.status,
    autoExtend: auction.autoExtend,
    winnerId: auction.winnerId,
    winner: winner
      ? { id: winner.id, clerkId: winner.clerkId, username: winner.username, avatarUrl: winner.avatarUrl }
      : null,
    endsAt: auction.endsAt,
    createdAt: auction.createdAt,
  };
}

async function formatBid(bid: typeof bidsTable.$inferSelect, includeListingId?: string) {
  const [user, auction] = await Promise.all([
    db.query.usersTable.findFirst({ where: eq(usersTable.id, bid.userId) }),
    db.query.auctionsTable.findFirst({ where: eq(auctionsTable.id, bid.auctionId) }),
  ]);
  let listing = null;
  if (auction) {
    const l = await db.query.listingsTable.findFirst({
      where: eq(listingsTable.id, auction.listingId),
    });
    if (l) listing = await formatListing(l);
  }
  return {
    id: bid.id,
    auctionId: bid.auctionId,
    userId: bid.userId,
    user: user ? { id: user.id, username: user.username, avatarUrl: user.avatarUrl } : null,
    amount: bid.amount,
    listingId: auction?.listingId ?? null,
    listing,
    createdAt: bid.createdAt,
  };
}

router.get("/auctions", async (req, res) => {
  const { page = "1", limit = "20" } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  const [rows, totalRows] = await Promise.all([
    db.query.auctionsTable.findMany({
      where: eq(auctionsTable.status, "ACTIVE"),
      orderBy: desc(auctionsTable.endsAt),
      limit: limitNum,
      offset,
    }),
    db.select({ count: sql<number>`count(*)` })
      .from(auctionsTable)
      .where(eq(auctionsTable.status, "ACTIVE")),
  ]);

  const items = await Promise.all(rows.map(formatAuction));
  const total = Number(totalRows[0]?.count ?? 0);

  res.json({ items, total, page: pageNum, limit: limitNum });
});

router.get("/auctions/my/bids", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.clerkId, clerkId) });
  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  const bids = await db.query.bidsTable.findMany({
    where: eq(bidsTable.userId, user.id),
    orderBy: desc(bidsTable.createdAt),
  });

  const formatted = await Promise.all(bids.map((b) => formatBid(b)));
  res.json(formatted);
});

router.get("/auctions/:listingId", async (req, res) => {
  const { listingId } = req.params;
  const auction = await db.query.auctionsTable.findFirst({
    where: eq(auctionsTable.listingId, listingId),
  });
  if (!auction) { res.status(404).json({ error: "Auction not found" }); return; }
  res.json(await formatAuction(auction));
});

router.get("/auctions/:listingId/bids", async (req, res) => {
  const { listingId } = req.params;
  const auction = await db.query.auctionsTable.findFirst({
    where: eq(auctionsTable.listingId, listingId),
  });
  if (!auction) { res.status(404).json({ error: "Auction not found" }); return; }

  const bids = await db.query.bidsTable.findMany({
    where: eq(bidsTable.auctionId, auction.id),
    orderBy: desc(bidsTable.createdAt),
  });
  const formatted = await Promise.all(bids.map((b) => formatBid(b, listingId)));
  res.json(formatted);
});

router.post("/auctions/:listingId/bids", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.clerkId, clerkId) });
  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  const { listingId } = req.params;
  const { amount } = req.body;

  if (!amount || typeof amount !== "number" || amount <= 0) {
    res.status(400).json({ error: "Érvénytelen licit összeg" });
    return;
  }

  const listing = await db.query.listingsTable.findFirst({
    where: eq(listingsTable.id, listingId),
  });

  if (listing?.userId === user.id) {
    res.status(400).json({ error: "Saját termékre nem licitálhatsz" });
    return;
  }

  const bidId = newId();

  const result: { auctionNotFound: boolean; error: string | null } = await db.transaction(
    async (tx) => {
      // Row-level lock on the auction so concurrent bids on the same auction
      // are serialized: each bid validates against the authoritative,
      // just-locked currentPrice instead of a stale read from before the tx.
      const [auction] = await tx
        .select()
        .from(auctionsTable)
        .where(eq(auctionsTable.listingId, listingId))
        .for("update");

      if (!auction) {
        return { auctionNotFound: true, error: null };
      }

      const now = new Date();
      if (auction.status !== "ACTIVE") {
        return { auctionNotFound: false, error: "Az aukció már nem aktív" };
      }
      if (auction.endsAt <= now) {
        return { auctionNotFound: false, error: "Az aukció már lejárt" };
      }

      const minRequired = auction.currentPrice + auction.minBidIncrement;
      if (amount < minRequired) {
        return {
          auctionNotFound: false,
          error: `A minimális licit: ${minRequired} Ft (jelenlegi: ${auction.currentPrice} Ft + ${auction.minBidIncrement} Ft emelés)`,
        };
      }

      await tx.insert(bidsTable).values({
        id: bidId,
        auctionId: auction.id,
        userId: user.id,
        amount,
      });

      let newEndsAt = auction.endsAt;
      const extendThreshold = new Date(now.getTime() + AUTO_EXTEND_MINUTES * 60 * 1000);
      if (auction.autoExtend && auction.endsAt <= extendThreshold) {
        newEndsAt = new Date(auction.endsAt.getTime() + AUTO_EXTEND_MINUTES * 60 * 1000);
      }

      await tx
        .update(auctionsTable)
        .set({
          currentPrice: amount,
          bidCount: auction.bidCount + 1,
          endsAt: newEndsAt,
          updatedAt: new Date(),
        })
        .where(eq(auctionsTable.id, auction.id));

      await tx
        .update(listingsTable)
        .set({ price: amount })
        .where(eq(listingsTable.id, listingId));

      return { auctionNotFound: false, error: null };
    },
  );

  if (result.auctionNotFound) {
    res.status(404).json({ error: "Aukció nem található" });
    return;
  }
  if (result.error) {
    res.status(400).json({ error: result.error });
    return;
  }

  if (listing) {
    await db.insert(notificationsTable).values({
      id: newId(),
      userId: listing.userId,
      type: "offer",
      title: "Új licit érkezett!",
      message: `${user.username} ${amount.toLocaleString("hu-HU")} Ft-ot licitált a(z) "${listing.title}" termékre.`,
      link: `/product/${listingId}`,
    });
  }

  const bid = await db.query.bidsTable.findFirst({ where: eq(bidsTable.id, bidId) });
  res.status(201).json(await formatBid(bid!, listingId));
});

export default router;

import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import {
  usersTable,
  listingsTable,
  transactionsTable,
  notificationsTable,
} from "@workspace/db";
import { eq, and, or, sql, desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/dashboard/stats", async (req, res) => {
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

  const [
    activeListings,
    totalSales,
    totalPurchases,
    unreadNotifications,
    recentSales,
  ] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(listingsTable)
      .where(
        and(
          eq(listingsTable.userId, user.id),
          eq(listingsTable.status, "ACTIVE"),
        ),
      ),
    db
      .select({ count: sql<number>`count(*)`, total: sql<number>`coalesce(sum(listing_price), 0)` })
      .from(transactionsTable)
      .where(eq(transactionsTable.sellerId, user.id)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(transactionsTable)
      .where(eq(transactionsTable.buyerId, user.id)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(notificationsTable)
      .where(
        and(
          eq(notificationsTable.userId, user.id),
          eq(notificationsTable.isRead, false),
        ),
      ),
    db.query.transactionsTable.findMany({
      where: eq(transactionsTable.sellerId, user.id),
      orderBy: desc(transactionsTable.createdAt),
      limit: 5,
    }),
  ]);

  res.json({
    activeListings: Number(activeListings[0]?.count ?? 0),
    totalSales: Number(totalSales[0]?.count ?? 0),
    totalEarnings: Number(totalSales[0]?.total ?? 0),
    totalPurchases: Number(totalPurchases[0]?.count ?? 0),
    unreadNotifications: Number(unreadNotifications[0]?.count ?? 0),
    rating: user.rating,
    reviewCount: user.reviewCount,
    recentSales: recentSales.map((s) => ({
      id: s.id,
      amount: s.listingPrice,
      status: s.status,
      createdAt: s.createdAt,
    })),
  });
});

router.get("/marketplace/stats", async (_req, res) => {
  const [totalUsers, totalListings, totalTransactions] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(usersTable),
    db
      .select({ count: sql<number>`count(*)` })
      .from(listingsTable)
      .where(eq(listingsTable.status, "ACTIVE")),
    db.select({ count: sql<number>`count(*)` }).from(transactionsTable),
  ]);

  res.json({
    totalUsers: Number(totalUsers[0]?.count ?? 0),
    activeListings: Number(totalListings[0]?.count ?? 0),
    totalTransactions: Number(totalTransactions[0]?.count ?? 0),
  });
});

export default router;

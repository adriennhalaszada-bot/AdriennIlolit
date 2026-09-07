import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { reviewsTable, usersTable, transactionsTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { newId } from "../lib/ids";

const router: IRouter = Router();

router.get("/users/:username/reviews", async (req, res) => {
  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.username, req.params.username),
  });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const { page = "1", limit = "20" } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, parseInt(limit));
  const offset = (pageNum - 1) * limitNum;

  const [rows, totalRows] = await Promise.all([
    db.query.reviewsTable.findMany({
      where: eq(reviewsTable.targetId, user.id),
      orderBy: desc(reviewsTable.createdAt),
      limit: limitNum,
      offset,
    }),
    db
      .select({ count: sql<number>`count(*)` })
      .from(reviewsTable)
      .where(eq(reviewsTable.targetId, user.id)),
  ]);

  const authorIds = [...new Set(rows.map((r) => r.authorId))];
  const authors =
    authorIds.length > 0
      ? await db.query.usersTable.findMany({
          where: (u, { inArray }) => inArray(u.id, authorIds),
        })
      : [];
  const authorMap = Object.fromEntries(authors.map((a) => [a.id, a]));

  const items = rows.map((r) => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.createdAt,
    author: authorMap[r.authorId]
      ? {
          id: authorMap[r.authorId].id,
          username: authorMap[r.authorId].username,
          fullName: authorMap[r.authorId].fullName,
          avatarUrl: authorMap[r.authorId].avatarUrl,
        }
      : null,
  }));

  const total = Number(totalRows[0]?.count ?? 0);
  res.json({ items, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) });
});

router.post("/reviews", async (req, res) => {
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

  const { transactionId, rating, comment } = req.body;
  if (!transactionId || !rating) {
    res.status(400).json({ error: "transactionId and rating required" });
    return;
  }

  const tx = await db.query.transactionsTable.findFirst({
    where: eq(transactionsTable.id, transactionId),
  });
  if (!tx) {
    res.status(404).json({ error: "Transaction not found" });
    return;
  }
  const isBuyer = tx.buyerId === user.id;
  const isSeller = tx.sellerId === user.id;
  if (!isBuyer && !isSeller) {
    res.status(403).json({ error: "Not part of this transaction" });
    return;
  }

  const targetId = isBuyer ? tx.sellerId : tx.buyerId;

  const existing = await db.query.reviewsTable.findFirst({
    where: and(
      eq(reviewsTable.transactionId, transactionId),
      eq(reviewsTable.authorId, user.id),
    ),
  });
  if (existing) {
    res.status(400).json({ error: "Already reviewed" });
    return;
  }

  const [review] = await db
    .insert(reviewsTable)
    .values({
      id: newId(),
      rating,
      comment: comment ?? null,
      transactionId,
      authorId: user.id,
      targetId,
    })
    .returning();

  const allReviews = await db.query.reviewsTable.findMany({
    where: eq(reviewsTable.targetId, targetId),
  });
  const avgRating =
    allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

  await db
    .update(usersTable)
    .set({ rating: Math.round(avgRating * 10) / 10, reviewCount: allReviews.length })
    .where(eq(usersTable.id, targetId));

  res.status(201).json(review);
});

export default router;

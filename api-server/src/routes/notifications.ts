import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { notificationsTable, usersTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { newId } from "../lib/ids";

const router: IRouter = Router();

router.get("/notifications", async (req, res) => {
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

  const { page = "1", limit = "20", unreadOnly } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, parseInt(limit));
  const offset = (pageNum - 1) * limitNum;

  const conditions = [eq(notificationsTable.userId, user.id)];
  if (unreadOnly === "true") conditions.push(eq(notificationsTable.isRead, false));

  const [rows, totalRows] = await Promise.all([
    db.query.notificationsTable.findMany({
      where: and(...conditions),
      orderBy: desc(notificationsTable.createdAt),
      limit: limitNum,
      offset,
    }),
    db
      .select({ count: sql<number>`count(*)` })
      .from(notificationsTable)
      .where(and(...conditions)),
  ]);

  const total = Number(totalRows[0]?.count ?? 0);
  res.json({ items: rows, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) });
});

router.post("/notifications/read-all", async (req, res) => {
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

  await db
    .update(notificationsTable)
    .set({ isRead: true })
    .where(eq(notificationsTable.userId, user.id));

  res.json({ success: true });
});

router.post("/notifications/:id/read", async (req, res) => {
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

  await db
    .update(notificationsTable)
    .set({ isRead: true })
    .where(
      and(
        eq(notificationsTable.id, req.params.id),
        eq(notificationsTable.userId, user.id),
      ),
    );

  res.json({ success: true });
});

export default router;

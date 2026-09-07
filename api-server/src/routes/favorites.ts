import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import {
  favoritesTable,
  listingsTable,
  usersTable,
} from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { newId } from "../lib/ids";
import { formatListing } from "../lib/listing";

const router: IRouter = Router();

function requireAuth(clerkId: string | null | undefined): clerkId is string {
  return !!clerkId;
}

router.get("/favorites", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!requireAuth(clerkId)) {
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

  const { page = "1", limit = "24" } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, parseInt(limit));
  const offset = (pageNum - 1) * limitNum;

  const [favRows, totalRows] = await Promise.all([
    db.query.favoritesTable.findMany({
      where: eq(favoritesTable.userId, user.id),
      orderBy: desc(favoritesTable.createdAt),
      limit: limitNum,
      offset,
    }),
    db
      .select({ count: sql<number>`count(*)` })
      .from(favoritesTable)
      .where(eq(favoritesTable.userId, user.id)),
  ]);

  const listingIds = favRows.map((f) => f.listingId);
  const listings = listingIds.length
    ? await db.query.listingsTable.findMany({
        where: (l, { inArray }) => inArray(l.id, listingIds),
      })
    : [];

  const items = await Promise.all(listings.map((l) => formatListing(l, user.id)));
  const total = Number(totalRows[0]?.count ?? 0);

  res.json({
    items,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum),
  });
});

router.post("/favorites/:listingId", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!requireAuth(clerkId)) {
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

  const { listingId } = req.params;
  const existing = await db.query.favoritesTable.findFirst({
    where: and(
      eq(favoritesTable.userId, user.id),
      eq(favoritesTable.listingId, listingId),
    ),
  });
  if (existing) {
    res.json({ success: true, favorited: true });
    return;
  }

  await db.insert(favoritesTable).values({
    id: newId(),
    userId: user.id,
    listingId,
  });

  await db
    .update(listingsTable)
    .set({ favoriteCount: sql`${listingsTable.favoriteCount} + 1` })
    .where(eq(listingsTable.id, listingId));

  res.json({ success: true, favorited: true });
});

router.delete("/favorites/:listingId", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!requireAuth(clerkId)) {
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

  const { listingId } = req.params;
  await db
    .delete(favoritesTable)
    .where(
      and(
        eq(favoritesTable.userId, user.id),
        eq(favoritesTable.listingId, listingId),
      ),
    );

  await db
    .update(listingsTable)
    .set({ favoriteCount: sql`GREATEST(${listingsTable.favoriteCount} - 1, 0)` })
    .where(eq(listingsTable.id, listingId));

  res.json({ success: true, favorited: false });
});

router.get("/favorites/check/:listingId", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!requireAuth(clerkId)) {
    res.json({ isFavorited: false });
    return;
  }
  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.clerkId, clerkId),
  });
  if (!user) {
    res.json({ isFavorited: false });
    return;
  }

  const { listingId } = req.params;
  const fav = await db.query.favoritesTable.findFirst({
    where: and(
      eq(favoritesTable.userId, user.id),
      eq(favoritesTable.listingId, listingId),
    ),
  });
  res.json({ isFavorited: !!fav });
});

export default router;

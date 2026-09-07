import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import {
  listingsTable,
  listingImagesTable,
  usersTable,
  categoriesTable,
  auctionsTable,
  transactionsTable,
} from "@workspace/db";
import { eq, and, or, ilike, gte, lte, desc, asc, ne, sql } from "drizzle-orm";
import { newId } from "../lib/ids";
import { formatListing } from "../lib/listing";

const router: IRouter = Router();

router.get("/listings", async (req, res) => {
  const {
    page = "1",
    limit = "24",
    category,
    categorySlug,
    subcategory,
    condition,
    minPrice,
    maxPrice,
    q,
    search,
    sortBy = "newest",
    userId: filterUserId,
    listingType,
    brand: filterBrand,
    color: filterColor,
    size: filterSize,
  } = req.query as Record<string, string>;

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  const { userId: clerkId } = getAuth(req);
  let currentUser: { id: string } | null = null;
  if (clerkId) {
    const u = await db.query.usersTable.findFirst({
      where: eq(usersTable.clerkId, clerkId),
    });
    if (u) currentUser = u;
  }

  const conditions = [eq(listingsTable.status, "ACTIVE")];
  const categoryLookup = category || categorySlug;
  if (categoryLookup) {
    const cat = await db.query.categoriesTable.findFirst({
      where: eq(categoriesTable.slug, categoryLookup),
    });
    if (cat) conditions.push(eq(listingsTable.categoryId, cat.id));
  }
  if (subcategory) conditions.push(eq(listingsTable.subcategoryId, subcategory));
  if (condition)
    conditions.push(
      eq(listingsTable.condition, condition as typeof listingsTable.$inferSelect.condition),
    );
  if (minPrice) conditions.push(gte(listingsTable.price, parseFloat(minPrice)));
  if (maxPrice) conditions.push(lte(listingsTable.price, parseFloat(maxPrice)));
  if (listingType)
    conditions.push(
      eq(listingsTable.listingType, listingType as typeof listingsTable.$inferSelect.listingType),
    );
  if (filterBrand) conditions.push(ilike(listingsTable.brand, `%${filterBrand}%`));
  if (filterColor) conditions.push(ilike(listingsTable.color, `%${filterColor}%`));
  if (filterSize) conditions.push(ilike(listingsTable.size, `%${filterSize}%`));
  const searchText = q || search;
  if (searchText)
    conditions.push(
      or(
        ilike(listingsTable.title, `%${searchText}%`),
        ilike(listingsTable.description, `%${searchText}%`),
        ilike(listingsTable.brand, `%${searchText}%`),
      )!,
    );
  if (filterUserId) conditions.push(eq(listingsTable.userId, filterUserId));

  const orderCol =
    sortBy === "price_asc"
      ? asc(listingsTable.price)
      : sortBy === "price_desc"
        ? desc(listingsTable.price)
        : sortBy === "popular"
          ? desc(listingsTable.favoriteCount)
          : desc(listingsTable.createdAt);

  const [rows, totalRows] = await Promise.all([
    db.query.listingsTable.findMany({
      where: and(...conditions),
      orderBy: orderCol,
      limit: limitNum,
      offset,
    }),
    db
      .select({ count: sql<number>`count(*)` })
      .from(listingsTable)
      .where(and(...conditions)),
  ]);

  const items = await Promise.all(
    rows.map((r) => formatListing(r, currentUser?.id)),
  );
  const total = Number(totalRows[0]?.count ?? 0);

  res.json({
    items,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum),
  });
});

router.get("/listings/featured", async (req, res) => {
  const { limit = "12" } = req.query as Record<string, string>;
  const limitNum = Math.min(50, Math.max(1, parseInt(limit)));

  const { userId: clerkId } = getAuth(req);
  let currentUser: { id: string } | null = null;
  if (clerkId) {
    const u = await db.query.usersTable.findFirst({
      where: eq(usersTable.clerkId, clerkId),
    });
    if (u) currentUser = u;
  }

  const rows = await db.query.listingsTable.findMany({
    where: eq(listingsTable.status, "ACTIVE"),
    orderBy: desc(listingsTable.favoriteCount),
    limit: limitNum,
  });

  const items = await Promise.all(
    rows.map((r) => formatListing(r, currentUser?.id)),
  );
  res.json(items);
});

router.get("/listings/:id", async (req, res) => {
  const { id } = req.params;
  const listing = await db.query.listingsTable.findFirst({
    where: eq(listingsTable.id, id),
  });
  if (!listing) {
    res.status(404).json({ error: "Listing not found" });
    return;
  }

  await db
    .update(listingsTable)
    .set({ viewCount: listing.viewCount + 1 })
    .where(eq(listingsTable.id, id));

  const { userId: clerkId } = getAuth(req);
  let currentUser: { id: string } | null = null;
  if (clerkId) {
    const u = await db.query.usersTable.findFirst({
      where: eq(usersTable.clerkId, clerkId),
    });
    if (u) currentUser = u;
  }

  res.json(await formatListing({ ...listing, viewCount: listing.viewCount + 1 }, currentUser?.id));
});

router.post("/listings", async (req, res) => {
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

  const {
    title,
    description,
    price,
    originalPrice,
    condition,
    listingType = "DIRECT",
    brand,
    size,
    color,
    shippingModes,
    bundleDiscountPercent,
    categoryId,
    subcategoryId,
    images = [],
    auctionStartingPrice,
    auctionMinBidIncrement,
    auctionEndsAt,
  } = req.body;

  if (!title || !description || !condition || !categoryId) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  if (listingType === "AUCTION") {
    if (!auctionStartingPrice || !auctionEndsAt) {
      res.status(400).json({ error: "Aukciónál kötelező a kezdőár és a végzési idő" });
      return;
    }
    if (new Date(auctionEndsAt) <= new Date()) {
      res.status(400).json({ error: "Az aukció végzési ideje a jövőben kell legyen" });
      return;
    }
  } else if (price == null) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const id = newId();
  await db.insert(listingsTable).values({
    id,
    title,
    description,
    price: listingType === "AUCTION" ? auctionStartingPrice : price,
    originalPrice: originalPrice ?? null,
    condition,
    listingType,
    brand: brand ?? null,
    size: size ?? null,
    color: color ?? null,
    shippingModes: shippingModes ?? [],
    bundleDiscountPercent: bundleDiscountPercent ?? null,
    categoryId,
    subcategoryId: subcategoryId ?? null,
    userId: user.id,
    status: "ACTIVE",
  });

  if (images.length > 0) {
    await db.insert(listingImagesTable).values(
      images.map(
        (img: string | { url: string; alt?: string }, i: number) => ({
          id: newId(),
          url: typeof img === "string" ? img : img.url,
          alt: typeof img === "string" ? null : (img.alt ?? null),
          order: i,
          listingId: id,
        }),
      ),
    );
  }

  if (listingType === "AUCTION") {
    await db.insert(auctionsTable).values({
      id: newId(),
      listingId: id,
      startingPrice: auctionStartingPrice,
      currentPrice: auctionStartingPrice,
      minBidIncrement: auctionMinBidIncrement ?? 100,
      status: "ACTIVE",
      autoExtend: true,
      endsAt: new Date(auctionEndsAt),
    });
  }

  await db
    .update(usersTable)
    .set({ listingCount: user.listingCount + 1 })
    .where(eq(usersTable.id, user.id));

  const newListing = await db.query.listingsTable.findFirst({
    where: eq(listingsTable.id, id),
  });
  res.status(201).json(await formatListing(newListing!, user.id));
});

router.patch("/listings/:id", async (req, res) => {
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
  const listing = await db.query.listingsTable.findFirst({
    where: eq(listingsTable.id, req.params.id),
  });
  if (!listing) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (listing.userId !== user.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const {
    title,
    description,
    price,
    originalPrice,
    condition,
    brand,
    size,
    color,
    shippingModes,
    bundleDiscountPercent,
    status,
    images,
    categoryId,
    subcategoryId,
  } = req.body;

  const updates: Partial<typeof listingsTable.$inferInsert> = { updatedAt: new Date() };
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (price !== undefined) updates.price = price;
  if (originalPrice !== undefined) updates.originalPrice = originalPrice;
  if (condition !== undefined) updates.condition = condition;
  if (brand !== undefined) updates.brand = brand;
  if (size !== undefined) updates.size = size;
  if (color !== undefined) updates.color = color;
  if (shippingModes !== undefined) updates.shippingModes = shippingModes;
  if (bundleDiscountPercent !== undefined) updates.bundleDiscountPercent = bundleDiscountPercent;
  if (status !== undefined) updates.status = status;
  if (categoryId !== undefined) updates.categoryId = categoryId;
  if (subcategoryId !== undefined) updates.subcategoryId = subcategoryId ?? null;

  const [updated] = await db
    .update(listingsTable)
    .set(updates)
    .where(eq(listingsTable.id, listing.id))
    .returning();

  if (images !== undefined) {
    await db
      .delete(listingImagesTable)
      .where(eq(listingImagesTable.listingId, listing.id));
    if (images.length > 0) {
      await db.insert(listingImagesTable).values(
        images.map((img: string | { url: string; alt?: string }, i: number) => ({
          id: newId(),
          url: typeof img === "string" ? img : img.url,
          alt: typeof img === "string" ? null : (img.alt ?? null),
          order: i,
          listingId: listing.id,
        })),
      );
    }
  }

  res.json(await formatListing(updated, user.id));
});

router.delete("/listings/:id", async (req, res) => {
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
  const listing = await db.query.listingsTable.findFirst({
    where: eq(listingsTable.id, req.params.id),
  });
  if (!listing) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (listing.userId !== user.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const existingTransaction = await db.query.transactionsTable.findFirst({
    where: eq(transactionsTable.listingId, listing.id),
  });
  if (existingTransaction) {
    res.status(400).json({
      error: "Nem törölhető, mert már történt vásárlás ehhez a hirdetéshez. Rejtsd el helyette.",
    });
    return;
  }
  try {
    await db.delete(listingsTable).where(eq(listingsTable.id, listing.id));
  } catch (err) {
    req.log.error({ err }, "Failed to delete listing");
    res.status(400).json({
      error: "A hirdetés nem törölhető (kapcsolódó adatok miatt). Rejtsd el helyette.",
    });
    return;
  }
  res.json({ success: true });
});

router.get("/listings/:id/similar", async (req, res) => {
  const { id } = req.params;
  const { limit = "6" } = req.query as Record<string, string>;
  const limitNum = Math.min(20, Math.max(1, parseInt(limit)));

  const listing = await db.query.listingsTable.findFirst({
    where: eq(listingsTable.id, id),
  });
  if (!listing) {
    res.json([]);
    return;
  }

  const rows = await db.query.listingsTable.findMany({
    where: and(
      eq(listingsTable.status, "ACTIVE"),
      eq(listingsTable.categoryId, listing.categoryId),
      ne(listingsTable.id, id),
    ),
    orderBy: desc(listingsTable.createdAt),
    limit: limitNum,
  });

  const items = await Promise.all(rows.map((r) => formatListing(r)));
  res.json(items);
});

router.get("/users/:username/listings", async (req, res) => {
  const { username } = req.params;
  const {
    page = "1",
    limit = "20",
    status,
  } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, parseInt(limit));
  const offset = (pageNum - 1) * limitNum;

  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.username, username),
  });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const { userId: clerkId } = getAuth(req);
  const isOwner = !!clerkId && clerkId === user.clerkId;

  const conditions = [eq(listingsTable.userId, user.id)];
  if (status === "ALL") {
    if (!isOwner) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    // no status filter — owner sees all of their own listings regardless of status
  } else if (status) {
    conditions.push(eq(listingsTable.status, status as typeof listingsTable.$inferSelect.status));
  } else {
    conditions.push(eq(listingsTable.status, "ACTIVE"));
  }

  const [rows, totalRows] = await Promise.all([
    db.query.listingsTable.findMany({
      where: and(...conditions),
      orderBy: desc(listingsTable.createdAt),
      limit: limitNum,
      offset,
    }),
    db
      .select({ count: sql<number>`count(*)` })
      .from(listingsTable)
      .where(and(...conditions)),
  ]);

  const items = await Promise.all(rows.map((r) => formatListing(r)));
  const total = Number(totalRows[0]?.count ?? 0);

  res.json({
    items,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum),
  });
});

export default router;

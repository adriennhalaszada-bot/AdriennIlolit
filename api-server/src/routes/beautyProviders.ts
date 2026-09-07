import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import {
  beautyProvidersTable,
  beautyServiceOfferingsTable,
  beautyPortfolioTable,
  beautyTimeSlotsTable,
  beautyBookingsTable,
  beautyReviewsTable,
  beautyFavoritesTable,
  usersTable,
} from "@workspace/db";
import { eq, and, or, desc, sql, ilike } from "drizzle-orm";
import { newId } from "../lib/ids";

const router: IRouter = Router();

const ALLOWED_FONTS = new Set([
  "Inter",
  "Playfair Display",
  "Poppins",
  "Montserrat",
  "Cormorant Garamond",
  "Dancing Script",
]);

function requireAuth(clerkId: string | null | undefined): clerkId is string {
  return !!clerkId;
}

async function getCurrentUser(clerkId: string) {
  return db.query.usersTable.findFirst({ where: eq(usersTable.clerkId, clerkId) });
}

async function formatProvider(provider: typeof beautyProvidersTable.$inferSelect) {
  const [services, portfolio] = await Promise.all([
    db.query.beautyServiceOfferingsTable.findMany({
      where: eq(beautyServiceOfferingsTable.providerId, provider.id),
    }),
    db.query.beautyPortfolioTable.findMany({
      where: eq(beautyPortfolioTable.providerId, provider.id),
      orderBy: beautyPortfolioTable.sortOrder,
    }),
  ]);
  return {
    id: provider.id,
    userId: provider.userId,
    displayName: provider.displayName,
    bio: provider.bio,
    profileImageUrl: provider.profileImageUrl,
    region: provider.region,
    county: provider.county,
    address: provider.address,
    phone: provider.phone,
    instagramHandle: provider.instagramHandle,
    websiteUrl: provider.websiteUrl,
    rating: provider.rating,
    totalReviews: provider.totalReviews,
    completedBookings: provider.completedBookings,
    isVerified: provider.isVerified,
    isActive: provider.isActive,
    templateId: provider.templateId,
    fontFamily: provider.fontFamily,
    slotIntervalMinutes: provider.slotIntervalMinutes,
    cancellationPolicyHours: provider.cancellationPolicyHours ?? 24,
    cancellationFeePercent: provider.cancellationFeePercent ?? 50,
    googleCalendarSyncEnabled: provider.googleCalendarSyncEnabled ?? false,
    icalFeedToken: provider.icalFeedToken ?? provider.id,
    reminder24hEnabled: provider.reminder24hEnabled ?? true,
    reminder2hEnabled: provider.reminder2hEnabled ?? true,
    isFeatured: provider.isFeatured ?? false,
    featuredUntil: provider.featuredUntil ?? null,
    services,
    portfolio,
    createdAt: provider.createdAt,
  };
}

router.get("/beauty/providers", async (req, res) => {
  const { region, serviceType, search, page = "1", limit = "20" } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  const conditions = [eq(beautyProvidersTable.isActive, true)];
  if (region) conditions.push(eq(beautyProvidersTable.region, region));
  if (search) conditions.push(ilike(beautyProvidersTable.displayName, `%${search}%`));

  let providerIds: string[] | null = null;
  if (serviceType) {
    const matches = await db.query.beautyServiceOfferingsTable.findMany({
      where: eq(beautyServiceOfferingsTable.serviceType, serviceType),
    });
    providerIds = [...new Set(matches.map((m) => m.providerId))];
    if (providerIds.length === 0) {
      res.json({ items: [], total: 0, page: pageNum, limit: limitNum });
      return;
    }
  }

  const where = providerIds
    ? and(...conditions, sql`${beautyProvidersTable.id} IN ${providerIds}`)
    : and(...conditions);

  const [rows, totalRows] = await Promise.all([
    db.query.beautyProvidersTable.findMany({
      where,
      limit: limitNum,
      offset,
      orderBy: [desc(beautyProvidersTable.isFeatured), desc(beautyProvidersTable.rating), desc(beautyProvidersTable.totalReviews)],
    }),
    db.query.beautyProvidersTable.findMany({ where }),
  ]);

  const items = await Promise.all(rows.map(formatProvider));
  res.json({ items, total: totalRows.length, page: pageNum, limit: limitNum });
});

router.post("/beauty/providers", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!requireAuth(clerkId)) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await getCurrentUser(clerkId);
  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  const existing = await db.query.beautyProvidersTable.findFirst({
    where: eq(beautyProvidersTable.userId, user.id),
  });
  if (existing) { res.status(400).json({ error: "Már regisztráltál szolgáltatóként" }); return; }

  const { displayName, region } = req.body;
  if (!displayName || !region) {
    res.status(400).json({ error: "displayName és region kötelező" });
    return;
  }

  const {
    bio, profileImageUrl, county, address, phone, instagramHandle, websiteUrl, templateId,
    fontFamily, slotIntervalMinutes,
  } = req.body;

  const allowedTemplateIds = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  const safeTemplateId = allowedTemplateIds.has(templateId) ? templateId : 1;
  const allowedIntervals = new Set([15, 30, 60]);
  const safeSlotIntervalMinutes = allowedIntervals.has(slotIntervalMinutes)
    ? slotIntervalMinutes
    : 30;
  const safeFontFamily = ALLOWED_FONTS.has(fontFamily) ? fontFamily : "Inter";

  const id = newId();
  await db.insert(beautyProvidersTable).values({
    id,
    userId: user.id,
    displayName,
    bio: bio ?? null,
    profileImageUrl: profileImageUrl ?? null,
    region,
    county: county ?? null,
    address: address ?? null,
    phone: phone ?? null,
    instagramHandle: instagramHandle ?? null,
    websiteUrl: websiteUrl ?? null,
    templateId: safeTemplateId,
    fontFamily: safeFontFamily,
    slotIntervalMinutes: safeSlotIntervalMinutes,
  });

  const provider = await db.query.beautyProvidersTable.findFirst({ where: eq(beautyProvidersTable.id, id) });
  res.status(201).json(await formatProvider(provider!));
});

router.get("/beauty/providers/me", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!requireAuth(clerkId)) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await getCurrentUser(clerkId);
  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  const provider = await db.query.beautyProvidersTable.findFirst({
    where: eq(beautyProvidersTable.userId, user.id),
  });
  if (!provider) { res.status(404).json({ error: "Szolgáltató nem található" }); return; }

  res.json(await formatProvider(provider));
});

router.get("/beauty/providers/:id", async (req, res) => {
  const provider = await db.query.beautyProvidersTable.findFirst({
    where: eq(beautyProvidersTable.id, req.params.id),
  });
  if (!provider) { res.status(404).json({ error: "Szolgáltató nem található" }); return; }
  res.json(await formatProvider(provider));
});

router.patch("/beauty/providers/:id", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!requireAuth(clerkId)) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await getCurrentUser(clerkId);
  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  const provider = await db.query.beautyProvidersTable.findFirst({
    where: eq(beautyProvidersTable.id, req.params.id),
  });
  if (!provider) { res.status(404).json({ error: "Szolgáltató nem található" }); return; }
  if (provider.userId !== user.id) { res.status(403).json({ error: "Forbidden" }); return; }

  const {
    displayName, bio, profileImageUrl, region, county, address, phone,
    instagramHandle, websiteUrl, isActive, templateId, fontFamily, slotIntervalMinutes,
    cancellationPolicyHours, cancellationFeePercent, googleCalendarSyncEnabled, icalFeedToken,
    reminder24hEnabled, reminder2hEnabled
  } = req.body;

  const allowedTemplateIds = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  if (templateId !== undefined && !allowedTemplateIds.has(templateId)) {
    res.status(400).json({ error: "Érvénytelen templateId" });
    return;
  }
  const allowedIntervals = new Set([15, 30, 60]);
  if (slotIntervalMinutes !== undefined && !allowedIntervals.has(slotIntervalMinutes)) {
    res.status(400).json({ error: "Érvénytelen slotIntervalMinutes" });
    return;
  }
  if (fontFamily !== undefined && !ALLOWED_FONTS.has(fontFamily)) {
    res.status(400).json({ error: "Érvénytelen fontFamily" });
    return;
  }

  await db.update(beautyProvidersTable).set({
    ...(displayName !== undefined ? { displayName } : {}),
    ...(bio !== undefined ? { bio } : {}),
    ...(profileImageUrl !== undefined ? { profileImageUrl } : {}),
    ...(region !== undefined ? { region } : {}),
    ...(county !== undefined ? { county } : {}),
    ...(address !== undefined ? { address } : {}),
    ...(phone !== undefined ? { phone } : {}),
    ...(instagramHandle !== undefined ? { instagramHandle } : {}),
    ...(websiteUrl !== undefined ? { websiteUrl } : {}),
    ...(isActive !== undefined ? { isActive } : {}),
    ...(templateId !== undefined ? { templateId } : {}),
    ...(fontFamily !== undefined ? { fontFamily } : {}),
    ...(slotIntervalMinutes !== undefined ? { slotIntervalMinutes } : {}),
    ...(cancellationPolicyHours !== undefined ? { cancellationPolicyHours } : {}),
    ...(cancellationFeePercent !== undefined ? { cancellationFeePercent } : {}),
    ...(googleCalendarSyncEnabled !== undefined ? { googleCalendarSyncEnabled } : {}),
    ...(icalFeedToken !== undefined ? { icalFeedToken } : {}),
    ...(reminder24hEnabled !== undefined ? { reminder24hEnabled } : {}),
    ...(reminder2hEnabled !== undefined ? { reminder2hEnabled } : {}),
    updatedAt: new Date(),
  }).where(eq(beautyProvidersTable.id, provider.id));

  const updated = await db.query.beautyProvidersTable.findFirst({ where: eq(beautyProvidersTable.id, provider.id) });
  res.json(await formatProvider(updated!));
});

router.post("/beauty/providers/:id/promote", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!requireAuth(clerkId)) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await getCurrentUser(clerkId);
  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  const provider = await db.query.beautyProvidersTable.findFirst({
    where: eq(beautyProvidersTable.id, req.params.id),
  });
  if (!provider) { res.status(404).json({ error: "Szolgáltató nem található" }); return; }
  if (provider.userId !== user.id) { res.status(403).json({ error: "Forbidden" }); return; }

  const { days = 7 } = req.body as { days?: number };
  const featuredUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  await db.update(beautyProvidersTable).set({
    isFeatured: true,
    featuredUntil,
    updatedAt: new Date(),
  }).where(eq(beautyProvidersTable.id, provider.id));

  const updated = await db.query.beautyProvidersTable.findFirst({ where: eq(beautyProvidersTable.id, provider.id) });
  res.json(await formatProvider(updated!));
});

router.post("/beauty/providers/:id/services", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!requireAuth(clerkId)) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await getCurrentUser(clerkId);
  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  const provider = await db.query.beautyProvidersTable.findFirst({
    where: eq(beautyProvidersTable.id, req.params.id),
  });
  if (!provider) { res.status(404).json({ error: "Szolgáltató nem található" }); return; }
  if (provider.userId !== user.id) { res.status(403).json({ error: "Forbidden" }); return; }

  const { serviceType, name, description, price, durationMinutes, isAvailable } = req.body;
  if (!serviceType || !name || typeof price !== "number" || price <= 0) {
    res.status(400).json({ error: "Hiányzó vagy érvénytelen mezők" });
    return;
  }

  const id = newId();
  await db.insert(beautyServiceOfferingsTable).values({
    id,
    providerId: provider.id,
    serviceType,
    name,
    description: description ?? null,
    price,
    durationMinutes: durationMinutes ?? 30,
    isAvailable: isAvailable ?? true,
  });

  const service = await db.query.beautyServiceOfferingsTable.findFirst({
    where: eq(beautyServiceOfferingsTable.id, id),
  });
  res.status(201).json(service);
});

router.patch("/beauty/services/:id", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!requireAuth(clerkId)) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await getCurrentUser(clerkId);
  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  const service = await db.query.beautyServiceOfferingsTable.findFirst({
    where: eq(beautyServiceOfferingsTable.id, req.params.id),
  });
  if (!service) { res.status(404).json({ error: "Szolgáltatás nem található" }); return; }

  const provider = await db.query.beautyProvidersTable.findFirst({
    where: eq(beautyProvidersTable.id, service.providerId),
  });
  if (!provider || provider.userId !== user.id) { res.status(403).json({ error: "Forbidden" }); return; }

  const { serviceType, name, description, price, durationMinutes, isAvailable } = req.body;
  await db.update(beautyServiceOfferingsTable).set({
    ...(serviceType !== undefined ? { serviceType } : {}),
    ...(name !== undefined ? { name } : {}),
    ...(description !== undefined ? { description } : {}),
    ...(price !== undefined ? { price } : {}),
    ...(durationMinutes !== undefined ? { durationMinutes } : {}),
    ...(isAvailable !== undefined ? { isAvailable } : {}),
  }).where(eq(beautyServiceOfferingsTable.id, service.id));

  const updated = await db.query.beautyServiceOfferingsTable.findFirst({
    where: eq(beautyServiceOfferingsTable.id, service.id),
  });
  res.json(updated);
});

router.delete("/beauty/services/:id", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!requireAuth(clerkId)) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await getCurrentUser(clerkId);
  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  const service = await db.query.beautyServiceOfferingsTable.findFirst({
    where: eq(beautyServiceOfferingsTable.id, req.params.id),
  });
  if (!service) { res.status(404).json({ error: "Szolgáltatás nem található" }); return; }

  const provider = await db.query.beautyProvidersTable.findFirst({
    where: eq(beautyProvidersTable.id, service.providerId),
  });
  if (!provider || provider.userId !== user.id) { res.status(403).json({ error: "Forbidden" }); return; }

  await db.delete(beautyServiceOfferingsTable).where(eq(beautyServiceOfferingsTable.id, service.id));
  res.json({ success: true });
});

router.post("/beauty/providers/:id/portfolio", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!requireAuth(clerkId)) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await getCurrentUser(clerkId);
  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  const provider = await db.query.beautyProvidersTable.findFirst({
    where: eq(beautyProvidersTable.id, req.params.id),
  });
  if (!provider) { res.status(404).json({ error: "Szolgáltató nem található" }); return; }
  if (provider.userId !== user.id) { res.status(403).json({ error: "Forbidden" }); return; }

  const { imageUrl, serviceType, title, sortOrder } = req.body;
  if (!imageUrl) { res.status(400).json({ error: "imageUrl kötelező" }); return; }

  const id = newId();
  await db.insert(beautyPortfolioTable).values({
    id,
    providerId: provider.id,
    imageUrl,
    serviceType: serviceType ?? null,
    title: title ?? null,
    sortOrder: sortOrder ?? 0,
  });

  const item = await db.query.beautyPortfolioTable.findFirst({ where: eq(beautyPortfolioTable.id, id) });
  res.status(201).json(item);
});

router.delete("/beauty/portfolio/:id", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!requireAuth(clerkId)) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await getCurrentUser(clerkId);
  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  const item = await db.query.beautyPortfolioTable.findFirst({
    where: eq(beautyPortfolioTable.id, req.params.id),
  });
  if (!item) { res.status(404).json({ error: "Elem nem található" }); return; }

  const provider = await db.query.beautyProvidersTable.findFirst({
    where: eq(beautyProvidersTable.id, item.providerId),
  });
  if (!provider || provider.userId !== user.id) { res.status(403).json({ error: "Forbidden" }); return; }

  await db.delete(beautyPortfolioTable).where(eq(beautyPortfolioTable.id, item.id));
  res.json({ success: true });
});

router.get("/beauty/providers/:id/time-slots", async (req, res) => {
  const slots = await db.query.beautyTimeSlotsTable.findMany({
    where: eq(beautyTimeSlotsTable.providerId, req.params.id),
  });
  res.json(slots);
});

router.put("/beauty/providers/:id/time-slots", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!requireAuth(clerkId)) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await getCurrentUser(clerkId);
  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  const provider = await db.query.beautyProvidersTable.findFirst({
    where: eq(beautyProvidersTable.id, req.params.id),
  });
  if (!provider) { res.status(404).json({ error: "Szolgáltató nem található" }); return; }
  if (provider.userId !== user.id) { res.status(403).json({ error: "Forbidden" }); return; }

  const { slots } = req.body as {
    slots: { dayOfWeek: number; startTime: string; endTime: string }[];
  };
  if (!Array.isArray(slots)) { res.status(400).json({ error: "slots tömb kötelező" }); return; }

  await db.transaction(async (tx) => {
    await tx.delete(beautyTimeSlotsTable).where(eq(beautyTimeSlotsTable.providerId, provider.id));
    if (slots.length > 0) {
      await tx.insert(beautyTimeSlotsTable).values(
        slots.map((s) => ({
          id: newId(),
          providerId: provider.id,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
        })),
      );
    }
  });

  const updated = await db.query.beautyTimeSlotsTable.findMany({
    where: eq(beautyTimeSlotsTable.providerId, provider.id),
  });
  res.json(updated);
});

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60).toString().padStart(2, "0");
  const m = (mins % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

router.get("/beauty/providers/:id/availability", async (req, res) => {
  const { date, serviceOfferingId } = req.query as Record<string, string>;
  if (!date || !serviceOfferingId) {
    res.status(400).json({ error: "date és serviceOfferingId kötelező" });
    return;
  }

  const service = await db.query.beautyServiceOfferingsTable.findFirst({
    where: eq(beautyServiceOfferingsTable.id, serviceOfferingId),
  });
  if (!service || service.providerId !== req.params.id) {
    res.status(404).json({ error: "Szolgáltatás nem található" });
    return;
  }

  const provider = await db.query.beautyProvidersTable.findFirst({
    where: eq(beautyProvidersTable.id, req.params.id),
  });
  if (!provider) {
    res.status(404).json({ error: "Szolgáltató nem található" });
    return;
  }

  const parsedDate = new Date(`${date}T00:00:00`);
  const dayOfWeek = parsedDate.getDay();

  const daySlots = await db.query.beautyTimeSlotsTable.findMany({
    where: and(
      eq(beautyTimeSlotsTable.providerId, req.params.id),
      eq(beautyTimeSlotsTable.dayOfWeek, dayOfWeek),
      eq(beautyTimeSlotsTable.isAvailable, true),
    ),
  });

  if (daySlots.length === 0) {
    res.json([]);
    return;
  }

  const existingBookings = await db.query.beautyBookingsTable.findMany({
    where: and(
      eq(beautyBookingsTable.providerId, req.params.id),
      eq(beautyBookingsTable.bookingDate, date),
      or(
        eq(beautyBookingsTable.status, "PENDING"),
        eq(beautyBookingsTable.status, "CONFIRMED"),
      ),
    ),
  });

  const duration = service.durationMinutes;
  const STEP_MINUTES = provider.slotIntervalMinutes;
  const availableTimes: string[] = [];

  for (const slot of daySlots) {
    const start = timeToMinutes(slot.startTime);
    const end = timeToMinutes(slot.endTime);
    for (let t = start; t + duration <= end; t += STEP_MINUTES) {
      const candidateStart = t;
      const candidateEnd = t + duration;
      const overlaps = existingBookings.some((b) => {
        const bStart = timeToMinutes(b.bookingTime);
        const bEnd = bStart + b.durationMinutes;
        return candidateStart < bEnd && bStart < candidateEnd;
      });
      if (!overlaps) availableTimes.push(minutesToTime(candidateStart));
    }
  }

  res.json(availableTimes);
});

router.get("/beauty/providers/:id/reviews", async (req, res) => {
  const { page = "1", limit = "20" } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, parseInt(limit));
  const offset = (pageNum - 1) * limitNum;

  const [rows, totalRows] = await Promise.all([
    db.query.beautyReviewsTable.findMany({
      where: eq(beautyReviewsTable.providerId, req.params.id),
      orderBy: desc(beautyReviewsTable.createdAt),
      limit: limitNum,
      offset,
    }),
    db.select({ count: sql<number>`count(*)` }).from(beautyReviewsTable)
      .where(eq(beautyReviewsTable.providerId, req.params.id)),
  ]);

  const customerIds = [...new Set(rows.map((r) => r.customerId))];
  const customers = customerIds.length
    ? await db.query.usersTable.findMany({ where: (u, { inArray }) => inArray(u.id, customerIds) })
    : [];
  const customerMap = Object.fromEntries(customers.map((c) => [c.id, c]));

  const items = rows.map((r) => ({
    id: r.id,
    providerId: r.providerId,
    customerId: r.customerId,
    customer: customerMap[r.customerId]
      ? { id: customerMap[r.customerId].id, username: customerMap[r.customerId].username, avatarUrl: customerMap[r.customerId].avatarUrl }
      : null,
    bookingId: r.bookingId,
    rating: r.rating,
    reviewText: r.reviewText,
    createdAt: r.createdAt,
  }));

  const total = Number(totalRows[0]?.count ?? 0);
  res.json({ items, total, page: pageNum, limit: limitNum });
});

router.get("/beauty/favorites", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!requireAuth(clerkId)) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await getCurrentUser(clerkId);
  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  const favs = await db.query.beautyFavoritesTable.findMany({
    where: eq(beautyFavoritesTable.userId, user.id),
    orderBy: desc(beautyFavoritesTable.createdAt),
  });
  const providerIds = favs.map((f) => f.providerId);
  const providers = providerIds.length
    ? await db.query.beautyProvidersTable.findMany({ where: (p, { inArray }) => inArray(p.id, providerIds) })
    : [];
  const items = await Promise.all(providers.map(formatProvider));
  res.json(items);
});

router.post("/beauty/favorites/:providerId", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!requireAuth(clerkId)) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await getCurrentUser(clerkId);
  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  const { providerId } = req.params;
  const existing = await db.query.beautyFavoritesTable.findFirst({
    where: and(eq(beautyFavoritesTable.userId, user.id), eq(beautyFavoritesTable.providerId, providerId)),
  });
  if (existing) { res.json({ success: true, favorited: true }); return; }

  await db.insert(beautyFavoritesTable).values({ id: newId(), userId: user.id, providerId });
  res.json({ success: true, favorited: true });
});

router.delete("/beauty/favorites/:providerId", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!requireAuth(clerkId)) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await getCurrentUser(clerkId);
  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  const { providerId } = req.params;
  await db.delete(beautyFavoritesTable).where(
    and(eq(beautyFavoritesTable.userId, user.id), eq(beautyFavoritesTable.providerId, providerId)),
  );
  res.json({ success: true, favorited: false });
});

export { formatProvider };
export default router;

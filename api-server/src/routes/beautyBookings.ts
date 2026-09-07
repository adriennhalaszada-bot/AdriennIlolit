import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import {
  beautyBookingsTable,
  beautyProvidersTable,
  beautyServiceOfferingsTable,
  beautyReviewsTable,
  usersTable,
  notificationsTable,
} from "@workspace/db";
import { eq, and, or, desc, lt } from "drizzle-orm";
import { newId } from "../lib/ids";
import { formatProvider } from "./beautyProviders";

const router: IRouter = Router();

const BOOKING_EXPIRY_HOURS = 48;

function requireAuth(clerkId: string | null | undefined): clerkId is string {
  return !!clerkId;
}

async function getCurrentUser(clerkId: string) {
  return db.query.usersTable.findFirst({ where: eq(usersTable.clerkId, clerkId) });
}

function timeToMinutes(t: string): number {
  const [h, m] = (t || "00:00").split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function checkOverlap(
  existingBookings: Array<{ bookingTime: string; durationMinutes: number; id: string; status: string }>,
  targetTime: string,
  targetDuration: number,
  excludeBookingId?: string
): boolean {
  const targetStart = timeToMinutes(targetTime);
  const targetEnd = targetStart + targetDuration;

  for (const b of existingBookings) {
    if (excludeBookingId && b.id === excludeBookingId) continue;
    if (b.status === "REJECTED" || b.status === "CANCELLED") continue;
    const bStart = timeToMinutes(b.bookingTime);
    const bEnd = bStart + b.durationMinutes;

    if (targetStart < bEnd && bStart < targetEnd) {
      return true;
    }
  }
  return false;
}

async function formatBooking(booking: typeof beautyBookingsTable.$inferSelect) {
  const [provider, customer, serviceOffering] = await Promise.all([
    db.query.beautyProvidersTable.findFirst({ where: eq(beautyProvidersTable.id, booking.providerId) }),
    db.query.usersTable.findFirst({ where: eq(usersTable.id, booking.customerId) }),
    db.query.beautyServiceOfferingsTable.findFirst({ where: eq(beautyServiceOfferingsTable.id, booking.serviceOfferingId) }),
  ]);
  return {
    id: booking.id,
    providerId: booking.providerId,
    provider: provider ? await formatProvider(provider) : null,
    customerId: booking.customerId,
    customer: customer ? { id: customer.id, username: customer.username, avatarUrl: customer.avatarUrl } : null,
    serviceOfferingId: booking.serviceOfferingId,
    serviceOffering: serviceOffering ?? null,
    bookingDate: booking.bookingDate,
    bookingTime: booking.bookingTime,
    durationMinutes: booking.durationMinutes,
    status: booking.status,
    customerNotes: booking.customerNotes,
    providerNotes: booking.providerNotes,
    totalPrice: booking.totalPrice,
    rescheduledCount: booking.rescheduledCount ?? 0,
    rescheduledAt: booking.rescheduledAt ?? null,
    originalBookingDate: booking.originalBookingDate ?? null,
    originalBookingTime: booking.originalBookingTime ?? null,
    cancellationPenaltyApplied: booking.cancellationPenaltyApplied ?? false,
    cancellationFeeAmount: booking.cancellationFeeAmount ?? null,
    isFirstVisitorDiscountApplied: booking.isFirstVisitorDiscountApplied ?? false,
    discountAmount: booking.discountAmount ?? 0,
    loyaltyPointsUsed: booking.loyaltyPointsUsed ?? 0,
    loyaltyPointsEarned: booking.loyaltyPointsEarned ?? 0,
    createdAt: booking.createdAt,
    confirmedAt: booking.confirmedAt,
    cancelledAt: booking.cancelledAt,
    completedAt: booking.completedAt,
  };
}

router.post("/beauty/bookings", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!requireAuth(clerkId)) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await getCurrentUser(clerkId);
  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  const { providerId, serviceOfferingId, bookingDate, bookingTime, customerNotes, loyaltyPointsUsed = 0 } = req.body;
  if (!providerId || !serviceOfferingId || !bookingDate || !bookingTime) {
    res.status(400).json({ error: "Hiányzó mezők" });
    return;
  }

  const [provider, service] = await Promise.all([
    db.query.beautyProvidersTable.findFirst({ where: eq(beautyProvidersTable.id, providerId) }),
    db.query.beautyServiceOfferingsTable.findFirst({ where: eq(beautyServiceOfferingsTable.id, serviceOfferingId) }),
  ]);
  if (!provider || !provider.isActive) { res.status(404).json({ error: "Szolgáltató nem található" }); return; }
  if (!service || service.providerId !== providerId || !service.isAvailable) {
    res.status(404).json({ error: "Szolgáltatás nem található" });
    return;
  }
  if (provider.userId === user.id) {
    res.status(400).json({ error: "Saját magadhoz nem foglalhatsz időpontot" });
    return;
  }

  // Check overlap with existing active bookings for this provider on the same date
  const sameDayBookings = await db.query.beautyBookingsTable.findMany({
    where: and(
      eq(beautyBookingsTable.providerId, providerId),
      eq(beautyBookingsTable.bookingDate, bookingDate)
    ),
  });

  if (checkOverlap(sameDayBookings, bookingTime, service.durationMinutes)) {
    res.status(409).json({ error: "Ez az időpont átfedésben van egy másik foglalással." });
    return;
  }

  // Section 5.2: Check if customer is a first-time visitor (has 0 previous bookings)
  const previousBookings = await db.query.beautyBookingsTable.findMany({
    where: eq(beautyBookingsTable.customerId, user.id),
  });
  const isFirstVisitor = previousBookings.length === 0;
  const discountAmount = isFirstVisitor ? Math.round(service.price * 0.10) : 0;
  const ptsUsed = Math.max(0, parseInt(loyaltyPointsUsed) || 0);
  const finalPrice = Math.max(0, service.price - discountAmount - ptsUsed);
  const loyaltyPointsEarned = Math.round(finalPrice * 0.05);

  const bookingId = newId();
  try {
    await db.insert(beautyBookingsTable).values({
      id: bookingId,
      providerId,
      customerId: user.id,
      serviceOfferingId,
      bookingDate,
      bookingTime,
      durationMinutes: service.durationMinutes,
      status: "PENDING",
      customerNotes: customerNotes ?? null,
      totalPrice: finalPrice,
      isFirstVisitorDiscountApplied: isFirstVisitor,
      discountAmount,
      loyaltyPointsUsed: ptsUsed,
      loyaltyPointsEarned,
      expiresAt: new Date(Date.now() + BOOKING_EXPIRY_HOURS * 60 * 60 * 1000),
    });
  } catch {
    res.status(409).json({ error: "Ez az időpont már foglalt" });
    return;
  }

  await db.insert(notificationsTable).values({
    id: newId(),
    userId: provider.userId,
    type: "system",
    title: "Új időpontfoglalás – Beauty Lolit",
    message: `${user.username} időpontot foglalt: ${service.name} (${bookingDate} ${bookingTime}).`,
    link: `/beauty/bookings/${bookingId}`,
  });

  const booking = await db.query.beautyBookingsTable.findFirst({ where: eq(beautyBookingsTable.id, bookingId) });
  res.status(201).json(await formatBooking(booking!));
});

router.get("/beauty/bookings", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!requireAuth(clerkId)) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await getCurrentUser(clerkId);
  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  const { role } = req.query as { role?: string };

  let bookings: (typeof beautyBookingsTable.$inferSelect)[];
  if (role === "provider") {
    const provider = await db.query.beautyProvidersTable.findFirst({
      where: eq(beautyProvidersTable.userId, user.id),
    });
    bookings = provider
      ? await db.query.beautyBookingsTable.findMany({
          where: eq(beautyBookingsTable.providerId, provider.id),
          orderBy: desc(beautyBookingsTable.createdAt),
        })
      : [];
  } else if (role === "customer") {
    bookings = await db.query.beautyBookingsTable.findMany({
      where: eq(beautyBookingsTable.customerId, user.id),
      orderBy: desc(beautyBookingsTable.createdAt),
    });
  } else {
    const provider = await db.query.beautyProvidersTable.findFirst({
      where: eq(beautyProvidersTable.userId, user.id),
    });
    bookings = await db.query.beautyBookingsTable.findMany({
      where: provider
        ? or(eq(beautyBookingsTable.customerId, user.id), eq(beautyBookingsTable.providerId, provider.id))
        : eq(beautyBookingsTable.customerId, user.id),
      orderBy: desc(beautyBookingsTable.createdAt),
    });
  }

  const formatted = await Promise.all(bookings.map(formatBooking));
  res.json(formatted);
});

router.get("/beauty/bookings/:id", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!requireAuth(clerkId)) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await getCurrentUser(clerkId);
  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  const booking = await db.query.beautyBookingsTable.findFirst({ where: eq(beautyBookingsTable.id, req.params.id) });
  if (!booking) { res.status(404).json({ error: "Foglalás nem található" }); return; }

  const provider = await db.query.beautyProvidersTable.findFirst({ where: eq(beautyProvidersTable.id, booking.providerId) });
  const isParty = booking.customerId === user.id || provider?.userId === user.id;
  if (!isParty) { res.status(403).json({ error: "Forbidden" }); return; }

  res.json(await formatBooking(booking));
});

router.post("/beauty/bookings/:id/respond", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!requireAuth(clerkId)) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await getCurrentUser(clerkId);
  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  const booking = await db.query.beautyBookingsTable.findFirst({ where: eq(beautyBookingsTable.id, req.params.id) });
  if (!booking) { res.status(404).json({ error: "Foglalás nem található" }); return; }

  const provider = await db.query.beautyProvidersTable.findFirst({ where: eq(beautyProvidersTable.id, booking.providerId) });
  if (!provider || provider.userId !== user.id) { res.status(403).json({ error: "Csak a szolgáltató válaszolhat" }); return; }
  if (booking.status !== "PENDING") { res.status(400).json({ error: "Ez a foglalás már nem függőben van" }); return; }

  const { action, providerNotes } = req.body as { action: "confirm" | "reject"; providerNotes?: string };
  if (action !== "confirm" && action !== "reject") {
    res.status(400).json({ error: "Érvénytelen akció (confirm | reject)" });
    return;
  }

  const newStatus = action === "confirm" ? "CONFIRMED" : "REJECTED";
  await db.update(beautyBookingsTable).set({
    status: newStatus,
    providerNotes: providerNotes ?? booking.providerNotes,
    ...(action === "confirm" ? { confirmedAt: new Date() } : { cancelledAt: new Date() }),
  }).where(eq(beautyBookingsTable.id, booking.id));

  await db.insert(notificationsTable).values({
    id: newId(),
    userId: booking.customerId,
    type: "system",
    title: action === "confirm" ? "Foglalásod visszaigazolva!" : "Foglalásod elutasítva",
    message: action === "confirm"
      ? `A(z) ${provider.displayName} visszaigazolta az időpontodat (${booking.bookingDate} ${booking.bookingTime}).`
      : `A(z) ${provider.displayName} elutasította az időpontfoglalásodat.`,
    link: `/beauty/bookings/${booking.id}`,
  });

  const updated = await db.query.beautyBookingsTable.findFirst({ where: eq(beautyBookingsTable.id, booking.id) });
  res.json(await formatBooking(updated!));
});

router.post("/beauty/bookings/:id/reschedule", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!requireAuth(clerkId)) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await getCurrentUser(clerkId);
  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  const booking = await db.query.beautyBookingsTable.findFirst({ where: eq(beautyBookingsTable.id, req.params.id) });
  if (!booking) { res.status(404).json({ error: "Foglalás nem található" }); return; }

  const provider = await db.query.beautyProvidersTable.findFirst({ where: eq(beautyProvidersTable.id, booking.providerId) });
  const isCustomer = booking.customerId === user.id;
  const isProvider = provider?.userId === user.id;
  if (!isCustomer && !isProvider) { res.status(403).json({ error: "Forbidden" }); return; }

  if (booking.status !== "PENDING" && booking.status !== "CONFIRMED") {
    res.status(400).json({ error: "Ez a foglalás már nem módosítható" });
    return;
  }

  const { newBookingDate, newBookingTime } = req.body as { newBookingDate: string; newBookingTime: string };
  if (!newBookingDate || !newBookingTime) {
    res.status(400).json({ error: "Az új dátum és időpont megadása kötelező!" });
    return;
  }

  // Check overlap for the requested new slot
  const sameDayBookings = await db.query.beautyBookingsTable.findMany({
    where: and(
      eq(beautyBookingsTable.providerId, booking.providerId),
      eq(beautyBookingsTable.bookingDate, newBookingDate)
    ),
  });

  if (checkOverlap(sameDayBookings, newBookingTime, booking.durationMinutes, booking.id)) {
    res.status(409).json({ error: "A kiválasztott új időpont átfedésben van egy másik foglalással." });
    return;
  }

  await db.update(beautyBookingsTable).set({
    bookingDate: newBookingDate,
    bookingTime: newBookingTime,
    rescheduledCount: (booking.rescheduledCount || 0) + 1,
    rescheduledAt: new Date(),
    originalBookingDate: booking.originalBookingDate || booking.bookingDate,
    originalBookingTime: booking.originalBookingTime || booking.bookingTime,
  }).where(eq(beautyBookingsTable.id, booking.id));

  const notifyUserId = isCustomer ? provider?.userId : booking.customerId;
  if (notifyUserId) {
    await db.insert(notificationsTable).values({
      id: newId(),
      userId: notifyUserId,
      type: "system",
      title: "Foglalás átidőzítve",
      message: `A foglalás új időpontja: ${newBookingDate} ${newBookingTime}.`,
      link: `/beauty/bookings/${booking.id}`,
    });
  }

  const updated = await db.query.beautyBookingsTable.findFirst({ where: eq(beautyBookingsTable.id, booking.id) });
  res.json(await formatBooking(updated!));
});

router.post("/beauty/bookings/:id/no-show", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!requireAuth(clerkId)) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await getCurrentUser(clerkId);
  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  const booking = await db.query.beautyBookingsTable.findFirst({ where: eq(beautyBookingsTable.id, req.params.id) });
  if (!booking) { res.status(404).json({ error: "Foglalás nem található" }); return; }

  const provider = await db.query.beautyProvidersTable.findFirst({ where: eq(beautyProvidersTable.id, booking.providerId) });
  if (!provider || provider.userId !== user.id) { res.status(403).json({ error: "Csak a szolgáltató jelölheti a távolmaradást" }); return; }

  await db.update(beautyBookingsTable).set({
    status: "NO_SHOW",
  }).where(eq(beautyBookingsTable.id, booking.id));

  await db.insert(notificationsTable).values({
    id: newId(),
    userId: booking.customerId,
    type: "system",
    title: "Nem jelent meg a foglaláson (No-show)",
    message: `A(z) ${provider.displayName} megjelölte, hogy nem jelentél meg az alábbi időponton: ${booking.bookingDate} ${booking.bookingTime}.`,
    link: `/beauty/bookings/${booking.id}`,
  });

  const updated = await db.query.beautyBookingsTable.findFirst({ where: eq(beautyBookingsTable.id, booking.id) });
  res.json(await formatBooking(updated!));
});

router.post("/beauty/bookings/:id/cancel", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!requireAuth(clerkId)) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await getCurrentUser(clerkId);
  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  const booking = await db.query.beautyBookingsTable.findFirst({ where: eq(beautyBookingsTable.id, req.params.id) });
  if (!booking) { res.status(404).json({ error: "Foglalás nem található" }); return; }

  const provider = await db.query.beautyProvidersTable.findFirst({ where: eq(beautyProvidersTable.id, booking.providerId) });
  const isCustomer = booking.customerId === user.id;
  const isProvider = provider?.userId === user.id;
  if (!isCustomer && !isProvider) { res.status(403).json({ error: "Forbidden" }); return; }
  if (booking.status !== "PENDING" && booking.status !== "CONFIRMED") {
    res.status(400).json({ error: "Ez a foglalás már nem lemondható" });
    return;
  }

  // Calculate cancellation penalty if customer cancels within policy hours (e.g. 24h)
  let penaltyApplied = false;
  let feeAmount = 0;

  if (isCustomer && provider) {
    const policyHours = provider.cancellationPolicyHours || 24;
    const bookingDateTime = new Date(`${booking.bookingDate}T${booking.bookingTime}:00`);
    const hoursRemaining = (bookingDateTime.getTime() - Date.now()) / (1000 * 60 * 60);

    if (hoursRemaining < policyHours && hoursRemaining > 0) {
      penaltyApplied = true;
      feeAmount = Math.round(booking.totalPrice * ((provider.cancellationFeePercent || 50) / 100));
    }
  }

  await db.update(beautyBookingsTable).set({
    status: "CANCELLED",
    cancelledAt: new Date(),
    cancellationPenaltyApplied: penaltyApplied,
    cancellationFeeAmount: penaltyApplied ? feeAmount : null,
  }).where(eq(beautyBookingsTable.id, booking.id));

  const notifyUserId = isCustomer ? provider?.userId : booking.customerId;
  if (notifyUserId) {
    const feeNotice = penaltyApplied ? ` (${feeAmount} Ft lemondási díj terhelve).` : ".";
    await db.insert(notificationsTable).values({
      id: newId(),
      userId: notifyUserId,
      type: "system",
      title: "Foglalás lemondva",
      message: `A(z) ${booking.bookingDate} ${booking.bookingTime} időpontú foglalás lemondásra került${feeNotice}`,
      link: `/beauty/bookings/${booking.id}`,
    });
  }

  const updated = await db.query.beautyBookingsTable.findFirst({ where: eq(beautyBookingsTable.id, booking.id) });
  res.json(await formatBooking(updated!));
});

router.post("/beauty/bookings/:id/complete", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!requireAuth(clerkId)) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await getCurrentUser(clerkId);
  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  const booking = await db.query.beautyBookingsTable.findFirst({ where: eq(beautyBookingsTable.id, req.params.id) });
  if (!booking) { res.status(404).json({ error: "Foglalás nem található" }); return; }

  const provider = await db.query.beautyProvidersTable.findFirst({ where: eq(beautyProvidersTable.id, booking.providerId) });
  if (!provider || provider.userId !== user.id) { res.status(403).json({ error: "Csak a szolgáltató zárhatja le" }); return; }
  if (booking.status !== "CONFIRMED") { res.status(400).json({ error: "Csak visszaigazolt foglalás zárható le" }); return; }

  await db.transaction(async (tx) => {
    await tx.update(beautyBookingsTable).set({
      status: "COMPLETED",
      completedAt: new Date(),
    }).where(eq(beautyBookingsTable.id, booking.id));

    await tx.update(beautyProvidersTable).set({
      completedBookings: provider.completedBookings + 1,
      updatedAt: new Date(),
    }).where(eq(beautyProvidersTable.id, provider.id));
  });

  await db.insert(notificationsTable).values({
    id: newId(),
    userId: booking.customerId,
    type: "system",
    title: "Foglalás teljesítve",
    message: `A(z) ${provider.displayName} lezárta a foglalásodat. Oszd meg a véleményed!`,
    link: `/beauty/bookings/${booking.id}`,
  });

  const updated = await db.query.beautyBookingsTable.findFirst({ where: eq(beautyBookingsTable.id, booking.id) });
  res.json(await formatBooking(updated!));
});

router.post("/beauty/bookings/:id/reviews", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!requireAuth(clerkId)) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await getCurrentUser(clerkId);
  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  const booking = await db.query.beautyBookingsTable.findFirst({ where: eq(beautyBookingsTable.id, req.params.id) });
  if (!booking) { res.status(404).json({ error: "Foglalás nem található" }); return; }
  if (booking.customerId !== user.id) { res.status(403).json({ error: "Csak a vevő értékelhet" }); return; }
  if (booking.status !== "COMPLETED") { res.status(400).json({ error: "Csak teljesített foglalás értékelhető" }); return; }

  const existing = await db.query.beautyReviewsTable.findFirst({ where: eq(beautyReviewsTable.bookingId, booking.id) });
  if (existing) { res.status(400).json({ error: "Ezt a foglalást már értékelted" }); return; }

  const { rating, reviewText } = req.body;
  if (!rating || typeof rating !== "number" || rating < 1 || rating > 5) {
    res.status(400).json({ error: "Érvénytelen értékelés (1-5)" });
    return;
  }

  const reviewId = newId();
  await db.insert(beautyReviewsTable).values({
    id: reviewId,
    providerId: booking.providerId,
    customerId: user.id,
    bookingId: booking.id,
    rating,
    reviewText: reviewText ?? null,
  });

  const allReviews = await db.query.beautyReviewsTable.findMany({
    where: eq(beautyReviewsTable.providerId, booking.providerId),
  });
  const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

  await db.update(beautyProvidersTable).set({
    rating: Math.round(avgRating * 10) / 10,
    totalReviews: allReviews.length,
    updatedAt: new Date(),
  }).where(eq(beautyProvidersTable.id, booking.providerId));

  const review = await db.query.beautyReviewsTable.findFirst({ where: eq(beautyReviewsTable.id, reviewId) });
  res.status(201).json(review);
});

export default router;
export { BOOKING_EXPIRY_HOURS };

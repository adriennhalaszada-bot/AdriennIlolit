import { verifyToken } from "@clerk/backend";

interface Env {
  MEDIA_BUCKET: R2Bucket;
  CLERK_SECRET_KEY: string;
}

type Context = EventContext<Env, string, Record<string, unknown>>;
const BOOKING_PREFIX = "data/bookings/";
const PROVIDER_PREFIX = "data/providers/";

function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
    },
  });
}

function routeParts(context: Context): string[] {
  const value = context.params.path;
  return (Array.isArray(value) ? value : typeof value === "string" ? value.split("/") : [])
    .map(String)
    .filter(Boolean);
}

async function currentUserId(request: Request, env: Env): Promise<string | null> {
  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ") || !env.CLERK_SECRET_KEY) return null;
  try {
    const payload = await verifyToken(authorization.slice(7), { secretKey: env.CLERK_SECRET_KEY });
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

async function readJson(env: Env, key: string): Promise<any | null> {
  const object = await env.MEDIA_BUCKET.get(key);
  if (!object) return null;
  try { return await object.json(); } catch { return null; }
}

async function writeBooking(env: Env, booking: any): Promise<void> {
  await env.MEDIA_BUCKET.put(`${BOOKING_PREFIX}${booking.id}.json`, JSON.stringify(booking), {
    httpMetadata: { contentType: "application/json" },
    customMetadata: { customerId: booking.customerId, providerOwnerId: booking.providerOwnerId },
  });
}

async function allBookings(env: Env): Promise<any[]> {
  const listed = await env.MEDIA_BUCKET.list({ prefix: BOOKING_PREFIX, limit: 1000 });
  return (await Promise.all(listed.objects.map((object) => readJson(env, object.key)))).filter(Boolean);
}

function safeText(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

const HUNGARIAN_WEEKDAYS = ["Vasárnap", "Hétfő", "Kedd", "Szerda", "Csütörtök", "Péntek", "Szombat"];

function weekdayFor(date: string): string {
  return HUNGARIAN_WEEKDAYS[new Date(`${date}T12:00:00Z`).getUTCDay()] || "";
}

export const onRequest: PagesFunction<Env> = async (rawContext) => {
  const context = rawContext as Context;
  const method = context.request.method.toUpperCase();
  if (method === "OPTIONS") return json(null, 204);

  const route = routeParts(context);
  if (method === "GET" && route[0] === "availability") {
    const url = new URL(context.request.url);
    const providerId = safeText(url.searchParams.get("providerId"), 160);
    const bookingDate = safeText(url.searchParams.get("date"), 10);
    if (!providerId || !/^\d{4}-\d{2}-\d{2}$/.test(bookingDate)) {
      return json({ error: "Hiányzó vagy hibás szolgáltató és dátum." }, 400);
    }
    const provider = await readJson(context.env, `${PROVIDER_PREFIX}${providerId}.json`);
    if (!provider?.isPublished) return json({ error: "A szolgáltató nem található." }, 404);
    const weekday = weekdayFor(bookingDate);
    const occupied = new Set((await allBookings(context.env))
      .filter((booking) => booking.providerId === providerId && booking.bookingDate === bookingDate && ["PENDING", "CONFIRMED"].includes(booking.status))
      .map((booking) => booking.bookingTime));
    const slots = (Array.isArray(provider.slots) ? provider.slots : [])
      .filter((slot: any) => slot.isAvailable !== false && slot.day === weekday)
      .map((slot: any) => ({ id: slot.id, startTime: slot.startTime, endTime: slot.endTime, time: `${slot.startTime} - ${slot.endTime}` }))
      .filter((slot: any) => !occupied.has(slot.time));
    return json({ providerId, bookingDate, weekday, slots });
  }

  const userId = await currentUserId(context.request, context.env);
  if (!userId) return json({ error: "A foglaláshoz jelentkezz be." }, 401);

  if (method === "GET" && route[0] === "me") {
    const bookings = (await allBookings(context.env))
      .filter((booking) => booking.customerId === userId || booking.providerOwnerId === userId)
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
      .map((booking) => ({ ...booking, role: booking.providerOwnerId === userId ? "provider" : "customer" }));
    return json({ items: bookings, total: bookings.length });
  }

  if (method === "POST" && route.length === 0) {
    let input: any;
    try { input = await context.request.json(); } catch { return json({ error: "Érvénytelen foglalási adat." }, 400); }

    const providerId = safeText(input.providerId, 160);
    const serviceId = safeText(input.serviceId, 100);
    const bookingDate = safeText(input.bookingDate, 10);
    const bookingTime = safeText(input.bookingTime, 30);
    if (!providerId || !serviceId || !/^\d{4}-\d{2}-\d{2}$/.test(bookingDate) || !bookingTime) {
      return json({ error: "Hiányzó vagy hibás szolgáltatás, dátum vagy időpont." }, 400);
    }
    const selectedDate = new Date(`${bookingDate}T00:00:00Z`);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    if (Number.isNaN(selectedDate.getTime()) || selectedDate < today) {
      return json({ error: "Múltbeli időpontra nem lehet foglalni." }, 400);
    }

    const provider = await readJson(context.env, `${PROVIDER_PREFIX}${providerId}.json`);
    if (!provider?.isPublished) return json({ error: "A szolgáltató nem található vagy nem fogad foglalást." }, 404);
    const service = provider.services?.find((item: any) => item.id === serviceId && item.isAvailable !== false);
    if (!service) return json({ error: "A kiválasztott szolgáltatás nem elérhető." }, 404);
    const matchingSlot = provider.slots?.some((slot: any) =>
      slot.isAvailable !== false &&
      slot.day === weekdayFor(bookingDate) &&
      `${slot.startTime} - ${slot.endTime}` === bookingTime,
    );
    if (!matchingSlot) return json({ error: "A kiválasztott időpont nem szerepel a szolgáltató szabad idősávjai között." }, 409);

    const collision = (await allBookings(context.env)).some((booking) =>
      booking.providerId === providerId &&
      booking.bookingDate === bookingDate &&
      booking.bookingTime === bookingTime &&
      ["PENDING", "CONFIRMED"].includes(booking.status),
    );
    if (collision) return json({ error: "Ezt az időpontot időközben lefoglalták. Válassz másikat." }, 409);

    const now = new Date().toISOString();
    const depositPercentage = service.requiresDeposit ? Number(service.depositPercentage || 0) : 0;
    const booking = {
      id: crypto.randomUUID(),
      customerId: userId,
      providerId,
      providerOwnerId: provider.ownerId,
      providerName: provider.displayName,
      serviceId: service.id,
      serviceName: service.name,
      price: Number(service.price) || 0,
      durationMinutes: Number(service.durationMinutes) || 60,
      depositPercentage,
      depositAmount: Math.round((Number(service.price) || 0) * depositPercentage / 100),
      bookingDate,
      bookingTime,
      customerName: safeText(input.customerName, 160),
      customerPhone: safeText(input.customerPhone, 50),
      customerEmail: safeText(input.customerEmail, 180),
      notes: safeText(input.notes, 2000),
      status: "PENDING",
      createdAt: now,
      updatedAt: now,
    };
    if (!booking.customerName || !booking.customerPhone || !booking.customerEmail) {
      return json({ error: "A név, telefonszám és e-mail-cím kötelező." }, 400);
    }
    await writeBooking(context.env, booking);
    return json(booking, 201);
  }

  const bookingId = route[0];
  if (method === "PATCH" && bookingId && route[1] === "respond") {
    const booking = await readJson(context.env, `${BOOKING_PREFIX}${bookingId}.json`);
    if (!booking || booking.providerOwnerId !== userId) return json({ error: "A foglalás nem található." }, 404);
    let input: any;
    try { input = await context.request.json(); } catch { return json({ error: "Érvénytelen válasz." }, 400); }
    if (!['CONFIRMED', 'REJECTED'].includes(input.status)) return json({ error: "Érvénytelen foglalási állapot." }, 400);
    if (booking.status !== "PENDING") return json({ error: "Erre a foglalásra már válaszoltál." }, 409);
    booking.status = input.status;
    booking.updatedAt = new Date().toISOString();
    await writeBooking(context.env, booking);
    return json(booking);
  }

  if (method === "PATCH" && bookingId && route[1] === "reschedule") {
    const booking = await readJson(context.env, `${BOOKING_PREFIX}${bookingId}.json`);
    if (!booking || booking.customerId !== userId) return json({ error: "A foglalás nem található." }, 404);
    if (!["PENDING", "CONFIRMED"].includes(booking.status)) return json({ error: "Lezárt foglalás nem időzíthető át." }, 409);
    let input: any;
    try { input = await context.request.json(); } catch { return json({ error: "Érvénytelen átfoglalási adat." }, 400); }
    const bookingDate = safeText(input.bookingDate, 10);
    const bookingTime = safeText(input.bookingTime, 30);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(bookingDate) || !bookingTime) return json({ error: "Adj meg érvényes dátumot és időpontot." }, 400);
    const selectedDate = new Date(`${bookingDate}T00:00:00Z`);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    if (Number.isNaN(selectedDate.getTime()) || selectedDate < today) return json({ error: "Múltbeli időpontra nem lehet átfoglalni." }, 400);

    const provider = await readJson(context.env, `${PROVIDER_PREFIX}${booking.providerId}.json`);
    const matchingSlot = provider?.slots?.some((slot: any) =>
      slot.isAvailable !== false && slot.day === weekdayFor(bookingDate) && `${slot.startTime} - ${slot.endTime}` === bookingTime,
    );
    if (!matchingSlot) return json({ error: "A kiválasztott új időpont már nem foglalható." }, 409);
    const collision = (await allBookings(context.env)).some((item) =>
      item.id !== booking.id && item.providerId === booking.providerId && item.bookingDate === bookingDate &&
      item.bookingTime === bookingTime && ["PENDING", "CONFIRMED"].includes(item.status),
    );
    if (collision) return json({ error: "Ezt az időpontot időközben lefoglalták." }, 409);

    booking.rescheduleHistory = [
      ...(Array.isArray(booking.rescheduleHistory) ? booking.rescheduleHistory : []),
      { bookingDate: booking.bookingDate, bookingTime: booking.bookingTime, changedAt: new Date().toISOString() },
    ].slice(-10);
    booking.bookingDate = bookingDate;
    booking.bookingTime = bookingTime;
    booking.status = "PENDING";
    booking.rescheduledCount = Number(booking.rescheduledCount || 0) + 1;
    booking.updatedAt = new Date().toISOString();
    await writeBooking(context.env, booking);
    return json(booking);
  }

  if (method === "PATCH" && bookingId && route[1] === "cancel") {
    const booking = await readJson(context.env, `${BOOKING_PREFIX}${bookingId}.json`);
    if (!booking || (booking.customerId !== userId && booking.providerOwnerId !== userId)) {
      return json({ error: "A foglalás nem található." }, 404);
    }
    if (["REJECTED", "CANCELLED"].includes(booking.status)) return json({ error: "A foglalás már lezárt." }, 409);
    booking.status = "CANCELLED";
    booking.cancelledBy = booking.providerOwnerId === userId ? "provider" : "customer";
    booking.updatedAt = new Date().toISOString();
    await writeBooking(context.env, booking);
    return json(booking);
  }

  return json({ error: "Ismeretlen foglalási végpont." }, 404);
};

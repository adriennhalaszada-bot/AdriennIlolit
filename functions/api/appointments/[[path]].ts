import { verifyToken } from "@clerk/backend";
import {
  buildAppointmentLinks,
  emitUnifiedNotification,
  PUSH_SUB_PREFIX,
  UNIFIED_NOTIF_PREFIX,
  type StoredPushSubscription,
  type UnifiedNotificationCategory,
  type UnifiedNotificationRecord,
} from "../../_shared/unifiedNotifications";

interface Env {
  MEDIA_BUCKET: R2Bucket;
  CLERK_SECRET_KEY: string;
  VAPID_PUBLIC_KEY?: string;
}

type Context = EventContext<Env, string, Record<string, unknown>>;

const APPOINTMENT_PREFIX = "data/appointments/";
const REAL_ESTATE_VIEWING_PREFIX = "data/real-estate/viewings/";
const REAL_ESTATE_PROPERTY_PREFIX = "data/real-estate/properties/";
const REAL_ESTATE_AUDIT_PREFIX = "data/real-estate/audit/";
const REAL_ESTATE_NOTIF_PREFIX = "data/real-estate/notifications/";
const PHONE_PREFIX = "data/real-estate/phone-verifications/";
const BOOKING_PREFIX = "data/bookings/";
const PROVIDER_PREFIX = "data/providers/";
const LISTING_PREFIX = "data/listings/";

export type UnifiedAppointmentType = "SERVICE" | "PROPERTY_VIEWING" | "VEHICLE_VIEWING";
export type UnifiedAppointmentStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PROPOSED_NEW_TIME"
  | "REJECTED"
  | "CANCELLED"
  | "COMPLETED";

function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    },
  });
}

function routeParts(context: Context): string[] {
  const value = context.params.path;
  return (Array.isArray(value) ? value : typeof value === "string" ? value.split("/") : [])
    .map((p) => decodeURIComponent(String(p)))
    .filter(Boolean);
}

async function currentUserId(request: Request, env: Env, allowQueryToken = false): Promise<string | null> {
  if (!env.CLERK_SECRET_KEY) return null;
  const authorization = request.headers.get("Authorization");
  let token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
  if (!token && allowQueryToken) {
    const url = new URL(request.url);
    token = url.searchParams.get("token");
  }
  if (!token) return null;
  try {
    const payload = await verifyToken(token, { secretKey: env.CLERK_SECRET_KEY });
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

async function readJson<T = any>(env: Env, key: string): Promise<T | null> {
  const obj = await env.MEDIA_BUCKET.get(key);
  if (!obj) return null;
  try {
    return await obj.json<T>();
  } catch {
    return null;
  }
}

async function writeJson(
  env: Env,
  key: string,
  value: unknown,
  customMetadata?: Record<string, string>,
): Promise<void> {
  await env.MEDIA_BUCKET.put(key, JSON.stringify(value), {
    httpMetadata: { contentType: "application/json" },
    customMetadata,
  });
}

async function listJsonPrefix<T = any>(env: Env, prefix: string): Promise<T[]> {
  const listed = await env.MEDIA_BUCKET.list({ prefix, limit: 1000 });
  const items = await Promise.all(listed.objects.map((o) => readJson<T>(env, o.key)));
  return items.filter(Boolean) as T[];
}

function safeText(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function addMinutes(startTime: string, durationMinutes: number): string {
  const [hStr, mStr] = startTime.split(":");
  const total = (Number(hStr) || 0) * 60 + (Number(mStr) || 0) + durationMinutes;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function extractTimeRange(timeStr: string, durationMinutes = 60): { start: string; end: string } {
  const match = String(timeStr || "").match(/(\d{2}:\d{2})(?:\s*[-–]\s*(\d{2}:\d{2}))?/);
  if (match) {
    const start = match[1];
    const end = match[2] || addMinutes(start, durationMinutes);
    return { start, end };
  }
  return { start: "10:00", end: addMinutes("10:00", durationMinutes) };
}

function mapPropertyStatus(raw: string, dateStr: string, startTime: string): UnifiedAppointmentStatus {
  if (raw === "APPROVED") {
    const ms = new Date(`${dateStr}T${startTime || "23:59"}:00`).getTime();
    if (Number.isFinite(ms) && ms + 3_600_000 < Date.now()) return "COMPLETED";
    return "CONFIRMED";
  }
  if (raw === "PROPOSED_NEW_TIME") return "PROPOSED_NEW_TIME";
  if (raw === "REJECTED") return "REJECTED";
  if (raw === "REVOKED_BY_OWNER" || raw === "CANCELLED_BY_REQUESTER" || raw === "CANCELLED") return "CANCELLED";
  if (raw === "COMPLETED") return "COMPLETED";
  return "PENDING";
}

function mapServiceStatus(raw: string, dateStr: string, startTime: string): UnifiedAppointmentStatus {
  if (raw === "CONFIRMED") {
    const ms = new Date(`${dateStr}T${startTime || "23:59"}:00`).getTime();
    if (Number.isFinite(ms) && ms + 3_600_000 < Date.now()) return "COMPLETED";
    return "CONFIRMED";
  }
  if (raw === "PROPOSED_NEW_TIME") return "PROPOSED_NEW_TIME";
  if (raw === "REJECTED") return "REJECTED";
  if (raw === "CANCELLED") return "CANCELLED";
  if (raw === "COMPLETED") return "COMPLETED";
  return "PENDING";
}

function computeReminderFlags(status: UnifiedAppointmentStatus, date: string, startTime: string, r24: boolean, r2: boolean) {
  if (status !== "CONFIRMED" || !date || !startTime) {
    return { reminder_24h_due: false, reminder_2h_due: false };
  }
  const ms = new Date(`${date}T${startTime}:00`).getTime();
  if (!Number.isFinite(ms)) return { reminder_24h_due: false, reminder_2h_due: false };
  const diffHours = (ms - Date.now()) / 3_600_000;
  return {
    reminder_24h_due: Boolean(r24 && diffHours > 0 && diffHours <= 24),
    reminder_2h_due: Boolean(r2 && diffHours > 0 && diffHours <= 2),
  };
}

function parseVehicleBasics(listing: any): {
  brand: string;
  model: string;
  year: string;
  city: string;
  fuel: string;
  km: string;
} {
  const title = String(listing?.title || "");
  const yearMatch = title.match(/\b(19[6-9]\d|20[0-3]\d)\b/) || String(listing?.description || "").match(/\b(19[6-9]\d|20[0-3]\d)\b/);
  const kmMatch = String(listing?.description || "").match(/(\d[\d\s.]{2,8})\s*km/i);
  const fuelMatch = String(`${title} ${listing?.description || ""}`).match(/\b(benzin|dízel|dizel|hibrid|hybrid|elektromos|plug-in)\b/i);
  const parts = title.replace(/\b(19[6-9]\d|20[0-3]\d)\b/g, "").trim().split(/\s+/).filter(Boolean);
  const brand = safeText(listing?.brand, 60) || parts[0] || "Jármű";
  const model = parts.length > 1 ? parts.slice(1, 4).join(" ") : title;
  const city = safeText(listing?.location || listing?.user?.location, 100) || "Magyarország";
  return {
    brand,
    model,
    year: yearMatch ? yearMatch[1] : "",
    city,
    fuel: fuelMatch ? fuelMatch[1] : "",
    km: kmMatch ? `${kmMatch[1].trim()} km` : "",
  };
}

function normalizePropertyViewing(v: any, userId: string) {
  const status = mapPropertyStatus(v.status, v.date, v.startTime);
  const r24 = v.reminder24hEnabled !== false;
  const r2 = Boolean(v.reminder2hEnabled);
  const reminders = computeReminderFlags(status, v.date, v.startTime, r24, r2);
  const { deepLink, webUrl } = buildAppointmentLinks("PROPERTY_VIEWING", v.id);
  const approx = String(v.propertyPublicLocation || "Magyarország");
  const city = approx.split(",")[0]?.trim() || approx;

  return {
    appointment_id: v.id,
    user_id: v.requesterId,
    listing_id: v.propertyId,
    appointment_type: "PROPERTY_VIEWING" as UnifiedAppointmentType,
    requested_datetime: v.date && v.startTime ? `${v.date}T${v.startTime}:00` : v.createdAt,
    confirmed_datetime: status === "CONFIRMED" || status === "COMPLETED" ? `${v.date}T${v.startTime}:00` : null,
    date: v.date,
    start_time: v.startTime,
    end_time: v.endTime || addMinutes(v.startTime || "10:00", v.durationMinutes || 30),
    duration_minutes: Number(v.durationMinutes || 30),
    status,
    seller_id: v.ownerId,
    seller_name: v.ownerName || "ILOLIT hirdető",
    requester_name: v.requesterName || "Érdeklődő",
    phone_verified: Boolean(v.requesterPhoneVerified),
    location_released: status === "CONFIRMED" && Boolean(v.requesterPhoneVerified),
    created_at: v.createdAt,
    updated_at: v.updatedAt || v.createdAt,
    cancellation_reason: v.cancellationReason || (v.status === "REVOKED_BY_OWNER" ? v.ownerResponseNote || "A hirdető visszavonta a megtekintést." : null),
    seller_message: v.ownerResponseNote || v.proposedNote || null,
    buyer_message: v.message || null,
    proposed_datetime: v.proposedDate && v.proposedStartTime ? `${v.proposedDate}T${v.proposedStartTime}:00` : null,
    proposed_date: v.proposedDate || null,
    proposed_start_time: v.proposedStartTime || null,
    proposed_end_time: v.proposedEndTime || null,
    proposed_note: v.proposedNote || null,
    reminder_24h_enabled: r24,
    reminder_2h_enabled: r2,
    ...reminders,
    role: v.ownerId === userId ? ("seller" as const) : ("buyer" as const),
    source: "real_estate" as const,
    title: v.propertyTitle || "Ingatlan megtekintés",
    cover_image: v.propertyCoverImage || "",
    city,
    approx_location: approx,
    price: Number(v.propertyPrice || 0),
    transaction_type: v.propertyTransactionType || "sale",
    deep_link: deepLink,
    web_url: webUrl,
  };
}

function normalizeServiceBooking(b: any, userId: string) {
  const range = extractTimeRange(b.bookingTime, Number(b.durationMinutes || 60));
  const status = mapServiceStatus(b.status, b.bookingDate, range.start);
  const reminders = computeReminderFlags(status, b.bookingDate, range.start, true, false);
  const { deepLink, webUrl } = buildAppointmentLinks("SERVICE", b.id);

  return {
    appointment_id: b.id,
    user_id: b.customerId,
    listing_id: b.providerId,
    appointment_type: "SERVICE" as UnifiedAppointmentType,
    requested_datetime: `${b.bookingDate}T${range.start}:00`,
    confirmed_datetime: status === "CONFIRMED" || status === "COMPLETED" ? `${b.bookingDate}T${range.start}:00` : null,
    date: b.bookingDate,
    start_time: range.start,
    end_time: range.end,
    duration_minutes: Number(b.durationMinutes || 60),
    status,
    seller_id: b.providerOwnerId,
    seller_name: b.providerName || "Szolgáltató",
    requester_name: b.customerName || "Ügyfél",
    phone_verified: Boolean(b.customerPhone),
    location_released: status === "CONFIRMED",
    created_at: b.createdAt,
    updated_at: b.updatedAt || b.createdAt,
    cancellation_reason: b.cancelledBy ? (b.cancelledBy === "provider" ? "A szolgáltató lemondta." : "Ügyfél által lemondva.") : null,
    seller_message: b.providerNotes || null,
    buyer_message: b.notes || null,
    proposed_datetime: null,
    proposed_date: null,
    proposed_start_time: null,
    proposed_end_time: null,
    proposed_note: null,
    reminder_24h_enabled: true,
    reminder_2h_enabled: false,
    ...reminders,
    role: b.providerOwnerId === userId ? ("seller" as const) : ("buyer" as const),
    source: "service_booking" as const,
    title: b.serviceName || "Szolgáltatási időpont",
    service_name: b.serviceName || "",
    cover_image: "",
    city: "",
    approx_location: b.providerName || "",
    price: Number(b.price || 0),
    deposit_amount: Number(b.depositAmount || 0),
    deposit_status: b.depositPayment?.status || undefined,
    deep_link: deepLink,
    web_url: webUrl,
  };
}

function normalizeNativeAppointment(a: any, userId: string) {
  const status = mapServiceStatus(a.status, a.date, a.start_time);
  const r24 = a.reminder_24h_enabled !== false;
  const r2 = Boolean(a.reminder_2h_enabled);
  const reminders = computeReminderFlags(status, a.date, a.start_time, r24, r2);
  const { deepLink, webUrl } = buildAppointmentLinks(a.appointment_type || "VEHICLE_VIEWING", a.appointment_id);

  // Strip exact meeting location and buyer phone from summary list payloads!
  const {
    exact_location: _omitExact,
    exact_latitude: _omitLat,
    exact_longitude: _omitLng,
    seller_phone: _omitPhone,
    buyer_phone_hash: _omitHash,
    ...safe
  } = a;

  return {
    ...safe,
    status,
    location_released: status === "CONFIRMED" && Boolean(a.phone_verified),
    ...reminders,
    role: a.seller_id === userId ? ("seller" as const) : ("buyer" as const),
    source: "native" as const,
    deep_link: deepLink,
    web_url: webUrl,
  };
}

async function getAllUnifiedForUser(env: Env, userId: string) {
  const [nativeList, reViewings, serviceBookings] = await Promise.all([
    listJsonPrefix<any>(env, APPOINTMENT_PREFIX),
    listJsonPrefix<any>(env, REAL_ESTATE_VIEWING_PREFIX),
    listJsonPrefix<any>(env, BOOKING_PREFIX),
  ]);

  const items: any[] = [];

  for (const a of nativeList) {
    const isBuyer = a.user_id === userId && !a.hidden_by_buyer;
    const isSeller = a.seller_id === userId && !a.hidden_by_seller;
    if (!isBuyer && !isSeller) continue;
    items.push(normalizeNativeAppointment(a, userId));
  }

  for (const v of reViewings) {
    const isBuyer = v.requesterId === userId && !v.hiddenByRequester;
    const isSeller = v.ownerId === userId && !v.hiddenByOwner;
    if (!isBuyer && !isSeller) continue;
    items.push(normalizePropertyViewing(v, userId));
  }

  for (const b of serviceBookings) {
    const isBuyer = b.customerId === userId && !b.hiddenByCustomer;
    const isSeller = b.providerOwnerId === userId && !b.hiddenByProvider;
    if (!isBuyer && !isSeller) continue;
    items.push(normalizeServiceBooking(b, userId));
  }

  items.sort((a, b) => String(b.updated_at || b.created_at).localeCompare(String(a.updated_at || a.created_at)));

  // Auto-generate deduplicated 24h / 2h reminder notifications for upcoming confirmed buyer viewings
  const reminderEmissions: Promise<any>[] = [];
  for (const item of items) {
    if (item.role !== "buyer" || item.status !== "CONFIRMED") continue;
    const cat: UnifiedNotificationCategory =
      item.appointment_type === "PROPERTY_VIEWING"
        ? "INGATLAN"
        : item.appointment_type === "VEHICLE_VIEWING"
          ? "JARMU"
          : "SZOLGALTATAS";
    const typeText =
      item.appointment_type === "PROPERTY_VIEWING"
        ? "ingatlanmegtekintésed"
        : item.appointment_type === "VEHICLE_VIEWING"
          ? "járműmegtekintésed"
          : "szolgáltatási időpontod";

    if (item.reminder_24h_due) {
      reminderEmissions.push(
        emitUnifiedNotification(env, userId, {
          category: cat,
          eventType: "APPOINTMENT_REMINDER_24H",
          title: `Holnap ${typeText} lesz`,
          body: `${item.start_time} – ${item.approx_location || item.city || item.title}`,
          appointmentId: item.appointment_id,
          appointmentType: item.appointment_type,
          listingId: item.listing_id,
          listingTitle: item.title,
          coverImage: item.cover_image,
          date: item.date,
          startTime: item.start_time,
          shortLocation: item.approx_location || item.city,
          deepLink: item.deep_link,
          webUrl: item.web_url,
          popupRequired: false,
          dedupeKey: `rem24:${item.appointment_id}:${item.date}:${item.start_time}`,
        }),
      );
    }
    if (item.reminder_2h_due) {
      reminderEmissions.push(
        emitUnifiedNotification(env, userId, {
          category: cat,
          eventType: "APPOINTMENT_REMINDER_2H",
          title: `2 órán belül kezdődik a(z) ${typeText}`,
          body: `${item.start_time} – ${item.approx_location || item.city || item.title}`,
          appointmentId: item.appointment_id,
          appointmentType: item.appointment_type,
          listingId: item.listing_id,
          listingTitle: item.title,
          coverImage: item.cover_image,
          date: item.date,
          startTime: item.start_time,
          shortLocation: item.approx_location || item.city,
          deepLink: item.deep_link,
          webUrl: item.web_url,
          popupRequired: true,
          dedupeKey: `rem2:${item.appointment_id}:${item.date}:${item.start_time}`,
        }),
      );
    }
  }
  if (reminderEmissions.length > 0) {
    await Promise.allSettled(reminderEmissions);
  }

  const buyerItems = items.filter((i) => i.role === "buyer");
  const isActive = (s: UnifiedAppointmentStatus) => s === "PENDING" || s === "CONFIRMED" || s === "PROPOSED_NEW_TIME";
  const todayIso = new Date().toISOString().slice(0, 10);

  const upcomingCandidates = buyerItems
    .filter((i) => isActive(i.status) && i.date && i.date >= todayIso)
    .sort((a, b) => `${a.date}T${a.start_time}`.localeCompare(`${b.date}T${b.start_time}`));

  // Prioritize upcoming PROPERTY_VIEWING or VEHICLE_VIEWING for "Következő megtekintésed", fallback to SERVICE
  const nextViewing =
    upcomingCandidates.find((i) => i.appointment_type === "PROPERTY_VIEWING" || i.appointment_type === "VEHICLE_VIEWING") ||
    upcomingCandidates[0] ||
    null;

  const propBuyer = buyerItems.filter((i) => i.appointment_type === "PROPERTY_VIEWING");
  const vehBuyer = buyerItems.filter((i) => i.appointment_type === "VEHICLE_VIEWING");
  const srvBuyer = buyerItems.filter((i) => i.appointment_type === "SERVICE");

  return {
    items,
    counts: {
      all: buyerItems.length,
      service: srvBuyer.filter((i) => isActive(i.status)).length,
      serviceTotal: srvBuyer.length,
      property: propBuyer.filter((i) => isActive(i.status)).length,
      propertyTotal: propBuyer.length,
      propertyPending: propBuyer.filter((i) => i.status === "PENDING").length,
      propertyConfirmed: propBuyer.filter((i) => i.status === "CONFIRMED").length,
      propertyProposed: propBuyer.filter((i) => i.status === "PROPOSED_NEW_TIME").length,
      vehicle: vehBuyer.filter((i) => isActive(i.status)).length,
      vehicleTotal: vehBuyer.length,
      vehiclePending: vehBuyer.filter((i) => i.status === "PENDING").length,
      vehicleConfirmed: vehBuyer.filter((i) => i.status === "CONFIRMED").length,
      vehicleProposed: vehBuyer.filter((i) => i.status === "PROPOSED_NEW_TIME").length,
      sellerVehiclePending: items.filter((i) => i.role === "seller" && i.appointment_type === "VEHICLE_VIEWING" && i.status === "PENDING").length,
    },
    nextUpcoming: nextViewing,
    remindersDue: buyerItems.filter((i) => i.reminder_24h_due || i.reminder_2h_due),
    serverTime: new Date().toISOString(),
  };
}

async function getUnifiedNotificationsForUser(env: Env, userId: string) {
  const [unified, legacyRe] = await Promise.all([
    readJson<UnifiedNotificationRecord[]>(env, `${UNIFIED_NOTIF_PREFIX}${userId}.json`),
    readJson<any[]>(env, `${REAL_ESTATE_NOTIF_PREFIX}${userId}.json`),
  ]);

  const list: UnifiedNotificationRecord[] = Array.isArray(unified) ? [...unified] : [];
  const existingKeys = new Set(list.map((n) => n.appointmentId ? `${n.appointmentId}:${n.eventType}:${n.title}` : n.id));

  // Seamlessly bridge any pre-existing real-estate notifications so nothing is lost
  for (const old of Array.isArray(legacyRe) ? legacyRe : []) {
    const eventType =
      old.type === "VIEWING_APPROVED"
        ? "APPOINTMENT_CONFIRMED"
        : old.type === "VIEWING_PROPOSED"
          ? "APPOINTMENT_PROPOSED_NEW_TIME"
          : old.type === "VIEWING_REJECTED"
            ? "APPOINTMENT_REJECTED"
            : old.type === "VIEWING_CANCELLED" || old.type === "VIEWING_REVOKED"
              ? "APPOINTMENT_CANCELLED"
              : "APPOINTMENT_REQUESTED";

    const key = old.viewingId ? `${old.viewingId}:${eventType}:${old.title}` : old.id;
    if (existingKeys.has(key)) continue;

    const links = old.viewingId
      ? buildAppointmentLinks("PROPERTY_VIEWING", old.viewingId)
      : { deepLink: "ilolit://appointments/property", webUrl: "/dashboard/bookings/properties" };

    list.push({
      id: `re_${old.id}`,
      userId,
      category: "INGATLAN",
      eventType: eventType as any,
      title: old.title || "Ingatlan értesítés",
      body: old.body || "",
      appointmentId: old.viewingId,
      appointmentType: "PROPERTY_VIEWING",
      listingId: old.propertyId,
      deepLink: links.deepLink,
      webUrl: links.webUrl,
      read: Boolean(old.read),
      popupRequired: false,
      popupDismissed: true,
      createdAt: old.createdAt || new Date().toISOString(),
    });
  }

  list.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

  const countsByCategory: Record<UnifiedNotificationCategory, number> = {
    INGATLAN: 0,
    JARMU: 0,
    SZOLGALTATAS: 0,
    PIACTER: 0,
    OKTATAS: 0,
  };
  let unreadCount = 0;
  for (const n of list) {
    if (!n.read) {
      unreadCount += 1;
      if (countsByCategory[n.category] !== undefined) {
        countsByCategory[n.category] += 1;
      }
    }
  }

  const pendingPopups = list.filter((n) => n.popupRequired && !n.popupDismissed && !n.read);

  return {
    items: list,
    unreadCount,
    countsByCategory,
    pendingPopups,
  };
}

async function appendRealEstateAudit(env: Env, propertyId: string, entry: Record<string, any>) {
  const key = `${REAL_ESTATE_AUDIT_PREFIX}${propertyId}.json`;
  const existing = (await readJson<any[]>(env, key)) || [];
  await writeJson(
    env,
    key,
    [{ id: crypto.randomUUID(), propertyId, ...entry, timestamp: new Date().toISOString() }, ...existing].slice(0, 500),
  );
}

export const onRequest: PagesFunction<Env> = async (rawContext) => {
  const context = rawContext as Context;
  const method = context.request.method.toUpperCase();
  if (method === "OPTIONS") return json(null, 204);

  const route = routeParts(context);
  const env = context.env;

  // =========================================================================
  // 1. REAL-TIME SERVER-SENT EVENTS STREAM (GET /api/appointments/stream)
  // =========================================================================
  if (method === "GET" && route[0] === "stream") {
    const userId = await currentUserId(context.request, env, true);
    if (!userId) return json({ error: "Bejelentkezés szükséges." }, 401);

    const encoder = new TextEncoder();
    let closed = false;

    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: string, data: unknown) => {
          if (closed) return;
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        };

        let lastSignature = "";
        try {
          for (let tick = 0; tick < 6; tick += 1) {
            if (closed || context.request.signal.aborted) break;
            const [appts, notifs] = await Promise.all([
              getAllUnifiedForUser(env, userId),
              getUnifiedNotificationsForUser(env, userId),
            ]);
            const sig = JSON.stringify({
              a: appts.items.map((i) => `${i.appointment_id}:${i.status}:${i.updated_at}`),
              n: notifs.items.slice(0, 10).map((n) => `${n.id}:${n.read}:${n.popupDismissed}`),
            });
            if (sig !== lastSignature || tick === 0) {
              lastSignature = sig;
              send("sync", {
                appointments: appts,
                notifications: notifs,
              });
            } else {
              send("ping", { ts: Date.now() });
            }
            if (tick < 5) {
              await new Promise((resolve) => setTimeout(resolve, 4000));
            }
          }
        } catch {
          // Gracefully close stream so EventSource reconnects automatically
        } finally {
          if (!closed) {
            closed = true;
            try {
              controller.close();
            } catch {
              // ignore
            }
          }
        }
      },
      cancel() {
        closed = true;
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Connection: "keep-alive",
      },
    });
  }

  const userId = await currentUserId(context.request, env);
  if (!userId) return json({ error: "A művelethez jelentkezz be." }, 401);

  // =========================================================================
  // 2. PUSH SUBSCRIPTION & DEVICE TOKEN STORAGE (NOT SMS!)
  // =========================================================================
  if (route[0] === "push") {
    const subKey = `${PUSH_SUB_PREFIX}${userId}.json`;

    if (method === "GET" && route[1] === "status") {
      const subs = (await readJson<StoredPushSubscription[]>(env, subKey)) || [];
      return json({
        subscribed: subs.length > 0,
        webSubscriptionsCount: subs.filter((s) => s.platform === "web").length,
        mobileDevicesCount: subs.filter((s) => s.platform !== "web").length,
        vapidPublicKey: env.VAPID_PUBLIC_KEY || null,
        devices: subs.map((s) => ({
          id: s.id,
          platform: s.platform,
          deviceLabel: s.deviceLabel || (s.platform === "web" ? "Webes böngésző" : "Mobil eszköz"),
          updatedAt: s.updatedAt,
        })),
      });
    }

    if (method === "POST" && route[1] === "subscribe") {
      const body = await context.request.json<any>().catch(() => ({}));
      const platform = (["web", "ios", "android", "expo"].includes(body.platform) ? body.platform : "web") as
        | "web"
        | "ios"
        | "android"
        | "expo";
      const endpoint = safeText(body.endpoint || body.subscription?.endpoint, 800);
      const p256dh = safeText(body.keys?.p256dh || body.subscription?.keys?.p256dh, 300);
      const auth = safeText(body.keys?.auth || body.subscription?.keys?.auth, 300);
      const deviceToken = safeText(body.deviceToken || body.token, 500);
      const deviceLabel = safeText(body.deviceLabel, 120) || (platform === "web" ? "Aktuális böngésző" : "ILOLIT Mobil");

      if (platform === "web" && !endpoint && !deviceToken) {
        return json({ error: "Hiányzó push feliratkozási azonosító." }, 400);
      }
      if (platform !== "web" && !deviceToken) {
        return json({ error: "Hiányzó eszköz token (deviceToken)." }, 400);
      }

      const subs = (await readJson<StoredPushSubscription[]>(env, subKey)) || [];
      const now = new Date().toISOString();
      const filtered = subs.filter((s) => {
        if (endpoint && s.endpoint === endpoint) return false;
        if (deviceToken && s.deviceToken === deviceToken) return false;
        return true;
      });

      const entry: StoredPushSubscription = {
        id: crypto.randomUUID(),
        platform,
        endpoint: endpoint || undefined,
        keys: p256dh && auth ? { p256dh, auth } : undefined,
        deviceToken: deviceToken || undefined,
        deviceLabel,
        createdAt: now,
        updatedAt: now,
      };

      const next = [entry, ...filtered].slice(0, 15);
      await writeJson(env, subKey, next);
      return json({ subscribed: true, id: entry.id, totalDevices: next.length }, 201);
    }

    if (method === "DELETE" && route[1] === "unsubscribe") {
      const body = await context.request.json<any>().catch(() => ({}));
      const endpoint = safeText(body.endpoint, 800);
      const deviceToken = safeText(body.deviceToken || body.token, 500);
      const id = safeText(body.id, 120);
      const subs = (await readJson<StoredPushSubscription[]>(env, subKey)) || [];
      const next = subs.filter((s) => {
        if (id && s.id === id) return false;
        if (endpoint && s.endpoint === endpoint) return false;
        if (deviceToken && s.deviceToken === deviceToken) return false;
        return true;
      });
      await writeJson(env, subKey, next);
      return json({ unsubscribed: true, totalDevices: next.length });
    }
  }

  // =========================================================================
  // 3. UNIFIED CATEGORIZED NOTIFICATIONS
  // =========================================================================
  if (route[0] === "notifications") {
    const key = `${UNIFIED_NOTIF_PREFIX}${userId}.json`;

    if (method === "GET" && route.length === 1) {
      const result = await getUnifiedNotificationsForUser(env, userId);
      return json(result);
    }

    if (method === "POST" && route[1] === "read") {
      const body = await context.request.json<any>().catch(() => ({}));
      const targetId = safeText(body.id, 120);
      const items = (await readJson<UnifiedNotificationRecord[]>(env, key)) || [];
      const updated = items.map((n) => (!targetId || n.id === targetId ? { ...n, read: true } : n));
      await writeJson(env, key, updated);

      // Also mark legacy real estate notifications read if marking all or matching re_ id
      const legacyKey = `${REAL_ESTATE_NOTIF_PREFIX}${userId}.json`;
      const legacy = (await readJson<any[]>(env, legacyKey)) || [];
      if (legacy.length > 0 && (!targetId || targetId.startsWith("re_"))) {
        const rawTarget = targetId.replace(/^re_/, "");
        const updatedLegacy = legacy.map((n) => (!targetId || n.id === rawTarget ? { ...n, read: true } : n));
        await writeJson(env, legacyKey, updatedLegacy);
      }

      return json({ ok: true });
    }

    if (method === "POST" && route[1] && route[2] === "dismiss-popup") {
      const targetId = route[1];
      const items = (await readJson<UnifiedNotificationRecord[]>(env, key)) || [];
      const updated = items.map((n) =>
        n.id === targetId ? { ...n, popupDismissed: true } : n,
      );
      await writeJson(env, key, updated);
      return json({ ok: true });
    }

    if (method === "DELETE" && route[1]) {
      const targetId = route[1];
      const items = (await readJson<UnifiedNotificationRecord[]>(env, key)) || [];
      await writeJson(env, key, items.filter((n) => n.id !== targetId));
      return json({ deleted: true });
    }
  }

  // =========================================================================
  // 4. LIST UNIFIED APPOINTMENTS (GET /api/appointments/me)
  // =========================================================================
  if (method === "GET" && route[0] === "me") {
    const url = new URL(context.request.url);
    const typeFilter = url.searchParams.get("type");
    const roleFilter = url.searchParams.get("role");
    const data = await getAllUnifiedForUser(env, userId);
    let items = data.items;
    if (typeFilter && ["SERVICE", "PROPERTY_VIEWING", "VEHICLE_VIEWING"].includes(typeFilter)) {
      items = items.filter((i) => i.appointment_type === typeFilter);
    }
    if (roleFilter === "buyer" || roleFilter === "seller") {
      items = items.filter((i) => i.role === roleFilter);
    }
    return json({ ...data, items });
  }

  // =========================================================================
  // 5. CREATE UNIFIED APPOINTMENT (POST /api/appointments) — VEHICLE_VIEWING
  // =========================================================================
  if (method === "POST" && route.length === 0) {
    const body = await context.request.json<any>().catch(() => ({}));
    const appointmentType = safeText(body.appointment_type, 30) as UnifiedAppointmentType;
    const listingId = safeText(body.listing_id, 140);
    const date = safeText(body.date, 10);
    const startTime = safeText(body.start_time, 5);
    const durationMinutes = Math.max(15, Math.min(180, Math.round(Number(body.duration_minutes) || 30)));
    const requesterName = safeText(body.requester_name, 120) || "ILOLIT érdeklődő";
    const buyerMessage = safeText(body.message, 1000);

    if (appointmentType !== "VEHICLE_VIEWING") {
      return json({ error: "Ezen a végponton jelenleg járműmegtekintés hozható létre." }, 400);
    }
    if (!listingId || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(startTime)) {
      return json({ error: "A jármű, a dátum és az időpont megadása kötelező." }, 400);
    }
    const todayIso = new Date().toISOString().slice(0, 10);
    if (date < todayIso) {
      return json({ error: "Múltbeli időpontra nem küldhető megtekintési kérelem." }, 400);
    }

    // Mandatory verified phone check
    const phoneRec = await readJson<any>(env, `${PHONE_PREFIX}${userId}.json`);
    if (!phoneRec?.phoneVerified) {
      return json({ error: "A járműmegtekintéshez előbb igazold mobiltelefonszámodat SMS-kóddal." }, 403);
    }

    const listing = await readJson<any>(env, `${LISTING_PREFIX}${listingId}.json`);
    if (!listing) {
      return json({ error: "A kiválasztott járműhirdetés nem található." }, 404);
    }
    const sellerId = listing.userId || listing.user?.id || listing.ownerId;
    if (!sellerId) {
      return json({ error: "A jármű hirdetője nem azonosítható." }, 400);
    }
    if (sellerId === userId) {
      return json({ error: "A saját járműhirdetésedre nem küldhetsz megtekintési kérelmet." }, 409);
    }

    // Prevent duplicate active vehicle viewing request from same buyer on same vehicle
    const existingAll = await listJsonPrefix<any>(env, APPOINTMENT_PREFIX);
    const alreadyExists = existingAll.find(
      (a) =>
        a.appointment_type === "VEHICLE_VIEWING" &&
        a.listing_id === listingId &&
        (a.user_id === userId || (phoneRec.phoneHash && a.buyer_phone_hash === phoneRec.phoneHash)) &&
        ["PENDING", "CONFIRMED", "PROPOSED_NEW_TIME"].includes(a.status),
    );
    if (alreadyExists) {
      return json({ error: "Erre a járműre már van folyamatban lévő megtekintési kérelmed." }, 409);
    }

    const basics = parseVehicleBasics(listing);
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const endTime = addMinutes(startTime, durationMinutes);
    const links = buildAppointmentLinks("VEHICLE_VIEWING", id);

    const record = {
      appointment_id: id,
      user_id: userId,
      listing_id: listingId,
      appointment_type: "VEHICLE_VIEWING" as UnifiedAppointmentType,
      requested_datetime: `${date}T${startTime}:00`,
      confirmed_datetime: null,
      date,
      start_time: startTime,
      end_time: endTime,
      duration_minutes: durationMinutes,
      status: "PENDING" as UnifiedAppointmentStatus,
      seller_id: sellerId,
      seller_name: listing.user?.fullName || listing.user?.username || "ILOLIT hirdető",
      seller_username: listing.user?.username || undefined,
      requester_name: requesterName,
      phone_verified: true,
      buyer_phone_hash: phoneRec.phoneHash || undefined,
      location_released: false,
      created_at: now,
      updated_at: now,
      cancellation_reason: null,
      seller_message: null,
      buyer_message: buyerMessage || null,
      proposed_datetime: null,
      proposed_date: null,
      proposed_start_time: null,
      proposed_end_time: null,
      proposed_note: null,
      reminder_24h_enabled: body.reminder_24h_enabled !== false,
      reminder_2h_enabled: Boolean(body.reminder_2h_enabled),
      title: listing.title || `${basics.brand} ${basics.model}`,
      cover_image: listing.images?.[0]?.url || "",
      city: basics.city,
      approx_location: basics.city,
      price: Number(listing.price || 0),
      vehicle_brand: basics.brand,
      vehicle_model: basics.model,
      vehicle_year: basics.year,
      vehicle_fuel: basics.fuel,
      vehicle_km: basics.km,
      exact_location: null as string | null,
      seller_phone: null as string | null,
    };

    await writeJson(env, `${APPOINTMENT_PREFIX}${id}.json`, record, {
      appointmentType: "VEHICLE_VIEWING",
      userId,
      sellerId,
    });

    await emitUnifiedNotification(env, sellerId, {
      category: "JARMU",
      eventType: "APPOINTMENT_REQUESTED",
      title: "Új járműmegtekintési kérelem",
      body: `${requesterName} időpontot kért: ${record.title} (${date} ${startTime}).`,
      appointmentId: id,
      appointmentType: "VEHICLE_VIEWING",
      listingId,
      listingTitle: record.title,
      coverImage: record.cover_image,
      date,
      startTime,
      shortLocation: basics.city,
      deepLink: links.deepLink,
      webUrl: `/dashboard/bookings/vehicles`,
      popupRequired: true,
    });

    return json(normalizeNativeAppointment(record, userId), 201);
  }

  // =========================================================================
  // 6. SINGLE APPOINTMENT OPERATIONS (/api/appointments/:id/...)
  // =========================================================================
  const appointmentId = route[0];
  const action = route[1];
  if (!appointmentId) return json({ error: "Ismeretlen végpont." }, 404);

  // Locate record across unified stores (native -> real estate viewing -> service booking)
  const nativeRec = await readJson<any>(env, `${APPOINTMENT_PREFIX}${appointmentId}.json`);
  const reRec = nativeRec ? null : await readJson<any>(env, `${REAL_ESTATE_VIEWING_PREFIX}${appointmentId}.json`);
  const srvRec = nativeRec || reRec ? null : await readJson<any>(env, `${BOOKING_PREFIX}${appointmentId}.json`);

  if (!nativeRec && !reRec && !srvRec) {
    return json({ error: "A megtekintési vagy foglalási rekord nem található." }, 404);
  }

  // GET /api/appointments/:id
  if (method === "GET" && !action) {
    if (nativeRec) {
      if (nativeRec.user_id !== userId && nativeRec.seller_id !== userId) return json({ error: "Nincs jogosultságod." }, 403);
      return json(normalizeNativeAppointment(nativeRec, userId));
    }
    if (reRec) {
      if (reRec.requesterId !== userId && reRec.ownerId !== userId) return json({ error: "Nincs jogosultságod." }, 403);
      return json(normalizePropertyViewing(reRec, userId));
    }
    if (srvRec) {
      if (srvRec.customerId !== userId && srvRec.providerOwnerId !== userId) return json({ error: "Nincs jogosultságod." }, 403);
      return json(normalizeServiceBooking(srvRec, userId));
    }
  }

  // GET /api/appointments/:id/details — STRICT SERVER-SIDE EXACT LOCATION GATE
  if (method === "GET" && action === "details") {
    if (reRec) {
      const isOwner = reRec.ownerId === userId;
      const isBuyer = reRec.requesterId === userId;
      if (!isOwner && !isBuyer) return json({ error: "Nincs jogosultságod ehhez a megtekintéshez." }, 403);
      if (reRec.status !== "APPROVED") {
        return json({ error: "A pontos cím kizárólag visszaigazolt megtekintés esetén érhető el." }, 403);
      }
      if (isBuyer) {
        const phoneRec = await readJson<any>(env, `${PHONE_PREFIX}${userId}.json`);
        if (!phoneRec?.phoneVerified) {
          return json({ error: "Ellenőrzött mobiltelefonszám szükséges a pontos cím megtekintéséhez." }, 403);
        }
      }
      const prop = await readJson<any>(env, `${REAL_ESTATE_PROPERTY_PREFIX}${reRec.propertyId}.json`);
      if (!prop || prop.status === "DELETED") return json({ error: "Az ingatlan már nem érhető el." }, 404);

      if (isBuyer) {
        await appendRealEstateAudit(env, reRec.propertyId, {
          action: "ADDRESS_ACCESSED",
          actorId: userId,
          actorName: reRec.requesterName,
          viewingId: reRec.id,
          slotSummary: `${reRec.date} ${reRec.startTime}-${reRec.endTime}`,
          details: "A jóváhagyott érdeklődő megnyitotta a pontos címet a Fiókom / Megtekintéseim felületen.",
        });
      }

      const ea = prop.exactAddress || {};
      const fullAddress = [
        `${ea.postalCode || ""} ${ea.city || ""}`.trim(),
        ea.district || "",
        `${ea.streetName || ""} ${ea.streetType || ""} ${ea.houseNumber || ""}`.trim(),
        ea.floorDoor || "",
      ].filter(Boolean).join(", ");

      return json({
        appointment_id: reRec.id,
        appointment_type: "PROPERTY_VIEWING",
        listing_id: prop.id,
        title: prop.title,
        date: reRec.date,
        start_time: reRec.startTime,
        end_time: reRec.endTime,
        duration_minutes: reRec.durationMinutes,
        exact_address_text: fullAddress,
        exact_address: ea,
        latitude: ea.latitude ?? null,
        longitude: ea.longitude ?? null,
        navigation_url:
          ea.latitude && ea.longitude
            ? `https://www.google.com/maps/dir/?api=1&destination=${ea.latitude},${ea.longitude}`
            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`,
        seller_name: prop.ownerName || "ILOLIT hirdető",
        seller_phone: prop.ownerPhoneShareMode === "approved_only" && prop.ownerPhone ? prop.ownerPhone : null,
        seller_message: reRec.ownerResponseNote || null,
        instructions: ea.viewingInstructions || null,
      });
    }

    if (nativeRec) {
      const isSeller = nativeRec.seller_id === userId;
      const isBuyer = nativeRec.user_id === userId;
      if (!isSeller && !isBuyer) return json({ error: "Nincs jogosultságod." }, 403);
      if (nativeRec.status !== "CONFIRMED" && nativeRec.status !== "COMPLETED") {
        return json({ error: "A pontos találkozási hely csak visszaigazolt megtekintésnél érhető el." }, 403);
      }
      if (isBuyer) {
        const phoneRec = await readJson<any>(env, `${PHONE_PREFIX}${userId}.json`);
        if (!phoneRec?.phoneVerified) {
          return json({ error: "Ellenőrzött telefonszám szükséges a részletek megnyitásához." }, 403);
        }
      }
      const exactLocationText = nativeRec.exact_location || nativeRec.approx_location || nativeRec.city || "Magyarország";
      return json({
        appointment_id: nativeRec.appointment_id,
        appointment_type: nativeRec.appointment_type,
        listing_id: nativeRec.listing_id,
        title: nativeRec.title,
        date: nativeRec.date,
        start_time: nativeRec.start_time,
        end_time: nativeRec.end_time,
        duration_minutes: nativeRec.duration_minutes,
        exact_address_text: exactLocationText,
        latitude: nativeRec.exact_latitude ?? null,
        longitude: nativeRec.exact_longitude ?? null,
        navigation_url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(exactLocationText)}`,
        seller_name: nativeRec.seller_name,
        seller_phone: nativeRec.seller_phone || null,
        seller_message: nativeRec.seller_message || null,
        instructions: nativeRec.seller_instructions || nativeRec.seller_message || null,
        vehicle_basics: {
          brand: nativeRec.vehicle_brand || "",
          model: nativeRec.vehicle_model || "",
          year: nativeRec.vehicle_year || "",
          fuel: nativeRec.vehicle_fuel || "",
          km: nativeRec.vehicle_km || "",
          price: nativeRec.price || 0,
        },
      });
    }

    if (srvRec) {
      if (srvRec.customerId !== userId && srvRec.providerOwnerId !== userId) return json({ error: "Nincs jogosultságod." }, 403);
      const provider = await readJson<any>(env, `${PROVIDER_PREFIX}${srvRec.providerId}.json`);
      const address = provider?.address || provider?.city || "";
      return json({
        appointment_id: srvRec.id,
        appointment_type: "SERVICE",
        listing_id: srvRec.providerId,
        title: `${srvRec.providerName} – ${srvRec.serviceName}`,
        date: srvRec.bookingDate,
        start_time: extractTimeRange(srvRec.bookingTime, srvRec.durationMinutes).start,
        end_time: extractTimeRange(srvRec.bookingTime, srvRec.durationMinutes).end,
        duration_minutes: srvRec.durationMinutes || 60,
        exact_address_text: address,
        navigation_url: address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : null,
        seller_name: srvRec.providerName,
        seller_phone: provider?.phone || null,
        seller_message: srvRec.providerNotes || null,
        instructions: null,
      });
    }
  }

  // PATCH /api/appointments/:id/respond (Seller confirms, proposes new time, rejects, cancels, completes)
  if (method === "PATCH" && action === "respond") {
    const body = await context.request.json<any>().catch(() => ({}));
    const sellerAction = safeText(body.action, 30);
    const note = safeText(body.note || body.seller_message, 800);
    const now = new Date().toISOString();

    if (nativeRec) {
      if (nativeRec.seller_id !== userId) return json({ error: "Csak a hirdető válaszolhat erre a kérelemre." }, 403);
      const links = buildAppointmentLinks("VEHICLE_VIEWING", nativeRec.appointment_id);

      if (sellerAction === "CONFIRM" || sellerAction === "APPROVE") {
        const phoneRec = await readJson<any>(env, `${PHONE_PREFIX}${nativeRec.user_id}.json`);
        if (!phoneRec?.phoneVerified) {
          return json({ error: "Az érdeklődő telefonszáma nincs ellenőrizve." }, 409);
        }
        nativeRec.status = "CONFIRMED";
        nativeRec.confirmed_datetime = `${nativeRec.date}T${nativeRec.start_time}:00`;
        nativeRec.location_released = true;
        nativeRec.exact_location = safeText(body.exact_location, 240) || nativeRec.approx_location || nativeRec.city;
        nativeRec.seller_instructions = safeText(body.instructions, 800) || note || null;
        nativeRec.seller_message = note || nativeRec.seller_message || null;
        nativeRec.seller_phone = safeText(body.seller_phone, 30) || null;
        nativeRec.updated_at = now;
        await writeJson(env, `${APPOINTMENT_PREFIX}${appointmentId}.json`, nativeRec);

        await emitUnifiedNotification(
          env,
          nativeRec.user_id,
          {
            category: "JARMU",
            eventType: "APPOINTMENT_CONFIRMED",
            title: "Járműmegtekintés visszaigazolva",
            body: `A hirdető elfogadta a megtekintési időpontodat (${nativeRec.date} ${nativeRec.start_time}). Koppints a helyszín és a részletek megtekintéséhez.`,
            appointmentId: nativeRec.appointment_id,
            appointmentType: "VEHICLE_VIEWING",
            listingId: nativeRec.listing_id,
            listingTitle: nativeRec.title,
            coverImage: nativeRec.cover_image,
            date: nativeRec.date,
            startTime: nativeRec.start_time,
            shortLocation: nativeRec.city,
            deepLink: links.deepLink,
            webUrl: links.webUrl,
            popupRequired: true,
          },
          {
            sendPush: true,
            pushTitle: "Járműmegtekintés visszaigazolva",
            pushBody: `A hirdető elfogadta a megtekintési időpontodat (${nativeRec.date} ${nativeRec.start_time}). Koppints a helyszín és a részletek megtekintéséhez.`,
          },
        );
        return json(normalizeNativeAppointment(nativeRec, userId));
      }

      if (sellerAction === "PROPOSE_NEW_TIME") {
        const proposedDate = safeText(body.proposed_date || body.proposedDate, 10);
        const proposedStart = safeText(body.proposed_start_time || body.proposedStartTime, 5);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(proposedDate) || !/^\d{2}:\d{2}$/.test(proposedStart)) {
          return json({ error: "Adj meg érvényes javasolt dátumot és időpontot." }, 400);
        }
        nativeRec.status = "PROPOSED_NEW_TIME";
        nativeRec.proposed_date = proposedDate;
        nativeRec.proposed_start_time = proposedStart;
        nativeRec.proposed_end_time = addMinutes(proposedStart, nativeRec.duration_minutes || 30);
        nativeRec.proposed_datetime = `${proposedDate}T${proposedStart}:00`;
        nativeRec.proposed_note = note || null;
        nativeRec.location_released = false;
        nativeRec.updated_at = now;
        await writeJson(env, `${APPOINTMENT_PREFIX}${appointmentId}.json`, nativeRec);

        await emitUnifiedNotification(env, nativeRec.user_id, {
          category: "JARMU",
          eventType: "APPOINTMENT_PROPOSED_NEW_TIME",
          title: "Új időpont elfogadásra vár",
          body: `A hirdető másik időpontot javasolt (${proposedDate} ${proposedStart}) a(z) ${nativeRec.title} megtekintésére.`,
          appointmentId: nativeRec.appointment_id,
          appointmentType: "VEHICLE_VIEWING",
          listingId: nativeRec.listing_id,
          listingTitle: nativeRec.title,
          coverImage: nativeRec.cover_image,
          date: proposedDate,
          startTime: proposedStart,
          shortLocation: nativeRec.city,
          deepLink: links.deepLink,
          webUrl: links.webUrl,
          popupRequired: true,
        });
        return json(normalizeNativeAppointment(nativeRec, userId));
      }

      if (sellerAction === "REJECT" || sellerAction === "CANCEL" || sellerAction === "REVOKE") {
        const isCancel = sellerAction === "CANCEL" || sellerAction === "REVOKE";
        nativeRec.status = isCancel ? "CANCELLED" : "REJECTED";
        nativeRec.location_released = false;
        nativeRec.cancellation_reason = note || (isCancel ? "A hirdető lemondta a megtekintést." : "A hirdető elutasította a kérelmet.");
        nativeRec.seller_message = note || nativeRec.seller_message;
        nativeRec.updated_at = now;
        await writeJson(env, `${APPOINTMENT_PREFIX}${appointmentId}.json`, nativeRec);

        await emitUnifiedNotification(env, nativeRec.user_id, {
          category: "JARMU",
          eventType: isCancel ? "APPOINTMENT_CANCELLED" : "APPOINTMENT_REJECTED",
          title: isCancel ? "Járműmegtekintés lemondva" : "Járműmegtekintés elutasítva",
          body: `A hirdető ${isCancel ? "lemondta" : "nem tudta elfogadni"} a(z) ${nativeRec.date} ${nativeRec.start_time} időpontot (${nativeRec.title}).`,
          appointmentId: nativeRec.appointment_id,
          appointmentType: "VEHICLE_VIEWING",
          listingId: nativeRec.listing_id,
          listingTitle: nativeRec.title,
          coverImage: nativeRec.cover_image,
          date: nativeRec.date,
          startTime: nativeRec.start_time,
          shortLocation: nativeRec.city,
          deepLink: links.deepLink,
          webUrl: links.webUrl,
          popupRequired: true,
        });
        return json(normalizeNativeAppointment(nativeRec, userId));
      }

      if (sellerAction === "COMPLETE") {
        nativeRec.status = "COMPLETED";
        nativeRec.updated_at = now;
        await writeJson(env, `${APPOINTMENT_PREFIX}${appointmentId}.json`, nativeRec);
        return json(normalizeNativeAppointment(nativeRec, userId));
      }
    }

    return json({ error: "Érvénytelen művelet vagy jogosultság." }, 400);
  }

  // PATCH /api/appointments/:id/accept-proposal (Buyer accepts proposed new time)
  if (method === "PATCH" && action === "accept-proposal") {
    const now = new Date().toISOString();
    if (reRec) {
      if (reRec.requesterId !== userId) return json({ error: "Nincs jogosultságod." }, 403);
      if (reRec.status !== "PROPOSED_NEW_TIME" || !reRec.proposedDate || !reRec.proposedStartTime) {
        return json({ error: "Nincs elfogadható javaslat." }, 409);
      }
      const phoneRec = await readJson<any>(env, `${PHONE_PREFIX}${userId}.json`);
      if (!phoneRec?.phoneVerified) return json({ error: "Ellenőrzött telefonszám szükséges." }, 403);

      reRec.date = reRec.proposedDate;
      reRec.startTime = reRec.proposedStartTime;
      reRec.endTime = reRec.proposedEndTime || addMinutes(reRec.proposedStartTime, reRec.durationMinutes || 30);
      reRec.status = "APPROVED";
      reRec.approvedAt = now;
      reRec.addressUnlockedAt = now;
      reRec.updatedAt = now;
      await writeJson(env, `${REAL_ESTATE_VIEWING_PREFIX}${appointmentId}.json`, reRec);

      const links = buildAppointmentLinks("PROPERTY_VIEWING", reRec.id);
      await emitUnifiedNotification(env, reRec.ownerId, {
        category: "INGATLAN",
        eventType: "APPOINTMENT_CONFIRMED",
        title: "Javasolt időpont elfogadva",
        body: `${reRec.requesterName} elfogadta a javasolt időpontot (${reRec.date} ${reRec.startTime}) – ${reRec.propertyTitle}.`,
        appointmentId: reRec.id,
        appointmentType: "PROPERTY_VIEWING",
        listingId: reRec.propertyId,
        listingTitle: reRec.propertyTitle,
        coverImage: reRec.propertyCoverImage,
        date: reRec.date,
        startTime: reRec.startTime,
        shortLocation: reRec.propertyPublicLocation,
        deepLink: links.deepLink,
        webUrl: `/real-estate/admin/${reRec.propertyId}`,
        popupRequired: true,
      });

      return json(normalizePropertyViewing(reRec, userId));
    }

    if (nativeRec) {
      if (nativeRec.user_id !== userId) return json({ error: "Nincs jogosultságod." }, 403);
      if (nativeRec.status !== "PROPOSED_NEW_TIME" || !nativeRec.proposed_date || !nativeRec.proposed_start_time) {
        return json({ error: "Nincs elfogadható javaslat." }, 409);
      }
      nativeRec.date = nativeRec.proposed_date;
      nativeRec.start_time = nativeRec.proposed_start_time;
      nativeRec.end_time = nativeRec.proposed_end_time || addMinutes(nativeRec.proposed_start_time, nativeRec.duration_minutes || 30);
      nativeRec.confirmed_datetime = `${nativeRec.date}T${nativeRec.start_time}:00`;
      nativeRec.status = "CONFIRMED";
      nativeRec.location_released = true;
      nativeRec.updated_at = now;
      await writeJson(env, `${APPOINTMENT_PREFIX}${appointmentId}.json`, nativeRec);

      const links = buildAppointmentLinks("VEHICLE_VIEWING", nativeRec.appointment_id);
      await emitUnifiedNotification(env, nativeRec.seller_id, {
        category: "JARMU",
        eventType: "APPOINTMENT_CONFIRMED",
        title: "Javasolt járműmegtekintési időpont elfogadva",
        body: `${nativeRec.requester_name} elfogadta az új időpontot (${nativeRec.date} ${nativeRec.start_time}) – ${nativeRec.title}.`,
        appointmentId: nativeRec.appointment_id,
        appointmentType: "VEHICLE_VIEWING",
        listingId: nativeRec.listing_id,
        listingTitle: nativeRec.title,
        coverImage: nativeRec.cover_image,
        date: nativeRec.date,
        startTime: nativeRec.start_time,
        shortLocation: nativeRec.city,
        deepLink: links.deepLink,
        webUrl: `/dashboard/bookings/vehicles`,
        popupRequired: true,
      });
      return json(normalizeNativeAppointment(nativeRec, userId));
    }
  }

  // PATCH /api/appointments/:id/request-other-time (Buyer counters a proposed time with another preference)
  if (method === "PATCH" && action === "request-other-time") {
    const body = await context.request.json<any>().catch(() => ({}));
    const reqDate = safeText(body.date, 10);
    const reqStart = safeText(body.start_time, 5);
    const note = safeText(body.note, 600);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(reqDate) || !/^\d{2}:\d{2}$/.test(reqStart)) {
      return json({ error: "Adj meg érvényes dátumot és időpontot." }, 400);
    }
    const now = new Date().toISOString();

    if (reRec) {
      if (reRec.requesterId !== userId) return json({ error: "Nincs jogosultságod." }, 403);
      reRec.date = reqDate;
      reRec.startTime = reqStart;
      reRec.endTime = addMinutes(reqStart, reRec.durationMinutes || 30);
      reRec.status = "PENDING";
      reRec.proposedDate = undefined;
      reRec.proposedStartTime = undefined;
      reRec.proposedEndTime = undefined;
      reRec.message = note || `Érdeklődő új időpont-kérése: ${reqDate} ${reqStart}`;
      reRec.updatedAt = now;
      await writeJson(env, `${REAL_ESTATE_VIEWING_PREFIX}${appointmentId}.json`, reRec);

      await emitUnifiedNotification(env, reRec.ownerId, {
        category: "INGATLAN",
        eventType: "APPOINTMENT_REQUESTED",
        title: "Érdeklődő másik időpontot kért",
        body: `${reRec.requesterName} másik időpontot javasolt: ${reqDate} ${reqStart} (${reRec.propertyTitle}).`,
        appointmentId: reRec.id,
        appointmentType: "PROPERTY_VIEWING",
        listingId: reRec.propertyId,
        listingTitle: reRec.propertyTitle,
        coverImage: reRec.propertyCoverImage,
        date: reqDate,
        startTime: reqStart,
        shortLocation: reRec.propertyPublicLocation,
        webUrl: `/real-estate/admin/${reRec.propertyId}`,
        popupRequired: true,
      });
      return json(normalizePropertyViewing(reRec, userId));
    }

    if (nativeRec) {
      if (nativeRec.user_id !== userId) return json({ error: "Nincs jogosultságod." }, 403);
      nativeRec.date = reqDate;
      nativeRec.start_time = reqStart;
      nativeRec.end_time = addMinutes(reqStart, nativeRec.duration_minutes || 30);
      nativeRec.requested_datetime = `${reqDate}T${reqStart}:00`;
      nativeRec.status = "PENDING";
      nativeRec.proposed_date = null;
      nativeRec.proposed_start_time = null;
      nativeRec.proposed_end_time = null;
      nativeRec.buyer_message = note || nativeRec.buyer_message;
      nativeRec.updated_at = now;
      await writeJson(env, `${APPOINTMENT_PREFIX}${appointmentId}.json`, nativeRec);

      await emitUnifiedNotification(env, nativeRec.seller_id, {
        category: "JARMU",
        eventType: "APPOINTMENT_REQUESTED",
        title: "Érdeklődő másik időpontot kért",
        body: `${nativeRec.requester_name} új időpontot kért (${reqDate} ${reqStart}) – ${nativeRec.title}.`,
        appointmentId: nativeRec.appointment_id,
        appointmentType: "VEHICLE_VIEWING",
        listingId: nativeRec.listing_id,
        listingTitle: nativeRec.title,
        coverImage: nativeRec.cover_image,
        date: reqDate,
        startTime: reqStart,
        shortLocation: nativeRec.city,
        webUrl: `/dashboard/bookings/vehicles`,
        popupRequired: true,
      });
      return json(normalizeNativeAppointment(nativeRec, userId));
    }
  }

  // PATCH /api/appointments/:id/cancel
  if (method === "PATCH" && action === "cancel") {
    const body = await context.request.json<any>().catch(() => ({}));
    const reason = safeText(body.reason, 400);
    const now = new Date().toISOString();

    if (reRec) {
      const isBuyer = reRec.requesterId === userId;
      const isOwner = reRec.ownerId === userId;
      if (!isBuyer && !isOwner) return json({ error: "Nincs jogosultságod." }, 403);
      reRec.status = isOwner ? "REVOKED_BY_OWNER" : "CANCELLED_BY_REQUESTER";
      reRec.cancellationReason = reason || undefined;
      reRec.updatedAt = now;
      await writeJson(env, `${REAL_ESTATE_VIEWING_PREFIX}${appointmentId}.json`, reRec);

      const targetUser = isOwner ? reRec.requesterId : reRec.ownerId;
      const links = buildAppointmentLinks("PROPERTY_VIEWING", reRec.id);
      await emitUnifiedNotification(env, targetUser, {
        category: "INGATLAN",
        eventType: "APPOINTMENT_CANCELLED",
        title: "Ingatlanmegtekintés lemondva",
        body: isOwner
          ? `A hirdető lemondta a(z) ${reRec.date} ${reRec.startTime} megtekintést (${reRec.propertyTitle}).`
          : `${reRec.requesterName} lemondta a(z) ${reRec.date} ${reRec.startTime} megtekintést (${reRec.propertyTitle}).`,
        appointmentId: reRec.id,
        appointmentType: "PROPERTY_VIEWING",
        listingId: reRec.propertyId,
        listingTitle: reRec.propertyTitle,
        coverImage: reRec.propertyCoverImage,
        date: reRec.date,
        startTime: reRec.startTime,
        shortLocation: reRec.propertyPublicLocation,
        deepLink: links.deepLink,
        webUrl: isOwner ? links.webUrl : `/real-estate/admin/${reRec.propertyId}`,
        popupRequired: true,
      });
      return json(normalizePropertyViewing(reRec, userId));
    }

    if (nativeRec) {
      const isBuyer = nativeRec.user_id === userId;
      const isSeller = nativeRec.seller_id === userId;
      if (!isBuyer && !isSeller) return json({ error: "Nincs jogosultságod." }, 403);
      nativeRec.status = "CANCELLED";
      nativeRec.location_released = false;
      nativeRec.cancellation_reason = reason || (isSeller ? "A hirdető lemondta." : "Az érdeklődő lemondta.");
      nativeRec.updated_at = now;
      await writeJson(env, `${APPOINTMENT_PREFIX}${appointmentId}.json`, nativeRec);

      const targetUser = isSeller ? nativeRec.user_id : nativeRec.seller_id;
      const links = buildAppointmentLinks("VEHICLE_VIEWING", nativeRec.appointment_id);
      await emitUnifiedNotification(env, targetUser, {
        category: "JARMU",
        eventType: "APPOINTMENT_CANCELLED",
        title: "Járműmegtekintés lemondva",
        body: isSeller
          ? `A hirdető lemondta a(z) ${nativeRec.date} ${nativeRec.start_time} megtekintést (${nativeRec.title}).`
          : `${nativeRec.requester_name} lemondta a(z) ${nativeRec.date} ${nativeRec.start_time} megtekintést (${nativeRec.title}).`,
        appointmentId: nativeRec.appointment_id,
        appointmentType: "VEHICLE_VIEWING",
        listingId: nativeRec.listing_id,
        listingTitle: nativeRec.title,
        coverImage: nativeRec.cover_image,
        date: nativeRec.date,
        startTime: nativeRec.start_time,
        shortLocation: nativeRec.city,
        deepLink: links.deepLink,
        webUrl: isSeller ? links.webUrl : `/dashboard/bookings/vehicles`,
        popupRequired: true,
      });
      return json(normalizeNativeAppointment(nativeRec, userId));
    }

    if (srvRec) {
      const isBuyer = srvRec.customerId === userId;
      const isSeller = srvRec.providerOwnerId === userId;
      if (!isBuyer && !isSeller) return json({ error: "Nincs jogosultságod." }, 403);
      srvRec.status = "CANCELLED";
      srvRec.cancelledBy = isSeller ? "provider" : "customer";
      if (srvRec.depositPayment?.status === "paid") {
        srvRec.depositPayment = {
          ...srvRec.depositPayment,
          refundStatus: "required",
          refundRequiredAt: now,
        };
      }
      srvRec.updatedAt = now;
      await writeJson(env, `${BOOKING_PREFIX}${appointmentId}.json`, srvRec);

      const targetUser = isSeller ? srvRec.customerId : srvRec.providerOwnerId;
      await emitUnifiedNotification(env, targetUser, {
        category: "SZOLGALTATAS",
        eventType: "APPOINTMENT_CANCELLED",
        title: "Szolgáltatási foglalás lemondva",
        body: `${srvRec.serviceName} (${srvRec.bookingDate} ${srvRec.bookingTime}) lemondásra került.`,
        appointmentId: srvRec.id,
        appointmentType: "SERVICE",
        listingId: srvRec.providerId,
        listingTitle: srvRec.serviceName,
        date: srvRec.bookingDate,
        startTime: extractTimeRange(srvRec.bookingTime).start,
        shortLocation: srvRec.providerName,
        webUrl: "/dashboard/bookings/services",
        popupRequired: true,
      });
      return json(normalizeServiceBooking(srvRec, userId));
    }
  }

  // PATCH /api/appointments/:id/reminders
  if (method === "PATCH" && action === "reminders") {
    const body = await context.request.json<any>().catch(() => ({}));
    const r24 = Boolean(body.reminder_24h_enabled);
    const r2 = Boolean(body.reminder_2h_enabled);
    const now = new Date().toISOString();

    if (reRec) {
      if (reRec.requesterId !== userId && reRec.ownerId !== userId) return json({ error: "Nincs jogosultságod." }, 403);
      reRec.reminder24hEnabled = r24;
      reRec.reminder2hEnabled = r2;
      reRec.updatedAt = now;
      await writeJson(env, `${REAL_ESTATE_VIEWING_PREFIX}${appointmentId}.json`, reRec);
      return json(normalizePropertyViewing(reRec, userId));
    }

    if (nativeRec) {
      if (nativeRec.user_id !== userId && nativeRec.seller_id !== userId) return json({ error: "Nincs jogosultságod." }, 403);
      nativeRec.reminder_24h_enabled = r24;
      nativeRec.reminder_2h_enabled = r2;
      nativeRec.updated_at = now;
      await writeJson(env, `${APPOINTMENT_PREFIX}${appointmentId}.json`, nativeRec);
      return json(normalizeNativeAppointment(nativeRec, userId));
    }
  }

  // DELETE /api/appointments/:id (Manual cleanup of old or closed appointments)
  if (method === "DELETE" && !action) {
    const todayIso = new Date().toISOString().slice(0, 10);

    if (reRec) {
      if (reRec.ownerId !== userId && reRec.requesterId !== userId) return json({ error: "Nincs jogosultságod." }, 403);
      const isClosed = ["REJECTED", "REVOKED_BY_OWNER", "CANCELLED_BY_REQUESTER"].includes(reRec.status);
      const isPast = Boolean(reRec.date && reRec.date < todayIso);
      if (!isClosed && !isPast) return json({ error: "Aktív, jövőbeli megtekintés nem törölhető közvetlenül." }, 409);
      if (reRec.ownerId === userId) reRec.hiddenByOwner = true;
      if (reRec.requesterId === userId) reRec.hiddenByRequester = true;
      reRec.updatedAt = new Date().toISOString();
      await writeJson(env, `${REAL_ESTATE_VIEWING_PREFIX}${appointmentId}.json`, reRec);
      return json({ deleted: true, id: appointmentId });
    }

    if (nativeRec) {
      if (nativeRec.user_id !== userId && nativeRec.seller_id !== userId) return json({ error: "Nincs jogosultságod." }, 403);
      const isClosed = ["REJECTED", "CANCELLED", "COMPLETED"].includes(nativeRec.status);
      const isPast = Boolean(nativeRec.date && nativeRec.date < todayIso);
      if (!isClosed && !isPast) return json({ error: "Aktív, jövőbeli megtekintés nem törölhető közvetlenül." }, 409);
      if (nativeRec.user_id === userId) nativeRec.hidden_by_buyer = true;
      if (nativeRec.seller_id === userId) nativeRec.hidden_by_seller = true;
      nativeRec.updated_at = new Date().toISOString();
      await writeJson(env, `${APPOINTMENT_PREFIX}${appointmentId}.json`, nativeRec);
      return json({ deleted: true, id: appointmentId });
    }

    if (srvRec) {
      if (srvRec.customerId !== userId && srvRec.providerOwnerId !== userId) return json({ error: "Nincs jogosultságod." }, 403);
      const isClosed = ["REJECTED", "CANCELLED", "COMPLETED"].includes(srvRec.status);
      const isPast = Boolean(srvRec.bookingDate && srvRec.bookingDate < todayIso);
      if (!isClosed && !isPast) return json({ error: "Aktív, jövőbeli foglalás nem törölhető közvetlenül." }, 409);
      if (srvRec.customerId === userId) srvRec.hiddenByCustomer = true;
      if (srvRec.providerOwnerId === userId) srvRec.hiddenByProvider = true;
      srvRec.updatedAt = new Date().toISOString();
      await writeJson(env, `${BOOKING_PREFIX}${appointmentId}.json`, srvRec);
      return json({ deleted: true, id: appointmentId });
    }
  }

  return json({ error: "Ismeretlen appointments művelet." }, 404);
};

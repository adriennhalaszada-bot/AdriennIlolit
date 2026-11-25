import { verifyToken } from "@clerk/backend";
import { buildAppointmentLinks, emitUnifiedNotification } from "../../_shared/unifiedNotifications";
import {
  checkSafeVisitVerificationEligibility,
  createSafeVisitCredentials,
  decryptSafeVisitSecret,
  MAX_FAILED_VERIFY_ATTEMPTS,
  sanitizeSafeVisitForList,
  timingSafeEqualHex,
  VERIFY_LOCKOUT_MS,
  type SafeVisitIdCheckResult,
} from "../../_shared/safeVisit";

interface Env {
  MEDIA_BUCKET: R2Bucket;
  CLERK_SECRET_KEY: string;
  RENTAL_LISTING_FEE?: string;
  REAL_ESTATE_TEST_MODE?: string;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_FROM_NUMBER?: string;
  SAFEVISIT_SECRET?: string;
  SAFEVISIT_WINDOW_BEFORE_MIN?: string;
  SAFEVISIT_WINDOW_AFTER_MIN?: string;
}

type Context = EventContext<Env, string, Record<string, unknown>>;

const PROPERTY_PREFIX = "data/real-estate/properties/";
const VIEWING_PREFIX = "data/real-estate/viewings/";
const PHONE_PREFIX = "data/real-estate/phone-verifications/";
const PHONE_INDEX_PREFIX = "data/real-estate/phone-index/";
const AUDIT_PREFIX = "data/real-estate/audit/";
const MESSAGE_PREFIX = "data/real-estate/messages/";
const BLOCK_PREFIX = "data/real-estate/blocks/";
const REPORT_PREFIX = "data/real-estate/reports/";
const NOTIFICATION_PREFIX = "data/real-estate/notifications/";
const FAVORITE_PREFIX = "data/real-estate/favorites/";
const DECLARATION_PREFIX = "data/real-estate/declarations/";
const MODERATION_USER_PREFIX = "data/real-estate/moderation-users/";
const SPAM_SIGNAL_PREFIX = "data/real-estate/spam-signals/";
const MSG_ACTIVITY_PREFIX = "data/real-estate/msg-activity/";

const ALLOWED_VIEWING_PURPOSES = new Set([
  "own_purchase",
  "own_rent",
  "family_friend",
  "real_estate_agent",
]);

const SOLICITATION_SIGNAL_PHRASES = [
  "segítek eladni",
  "segitek eladni",
  "van vevőm",
  "van vevom",
  "szerződjünk",
  "szerzodjunk",
  "megbízási szerződés",
  "jutalék",
  "jutalek",
  "ingatlaniroda",
  "portfóliónkba",
];

async function recordSpamSignal(
  env: Env,
  entry: {
    userId: string;
    propertyId?: string;
    signalType: string;
    details: string;
    score: number;
  },
) {
  const id = crypto.randomUUID();
  await writeJson(env, `${SPAM_SIGNAL_PREFIX}${id}.json`, {
    id,
    ...entry,
    createdAt: new Date().toISOString(),
  });
}

async function getUserModerationRecord(env: Env, targetUserId: string) {
  const rec = (await readJson<any>(env, `${MODERATION_USER_PREFIX}${targetUserId}.json`)) || {
    userId: targetUserId,
    restrictionLevel: "none",
    warningsCount: 0,
    reportsCount: 0,
    restrictedUntil: null,
    phoneRiskFlag: false,
    updatedAt: new Date().toISOString(),
  };
  // Automatically expire temporary/extended restrictions once restrictedUntil passes
  if (
    (rec.restrictionLevel === "temp_restricted" || rec.restrictionLevel === "extended_restricted") &&
    rec.restrictedUntil &&
    new Date(rec.restrictedUntil).getTime() <= Date.now()
  ) {
    rec.restrictionLevel = rec.warningsCount > 0 ? "warning" : "none";
    rec.restrictedUntil = null;
  }
  return rec;
}

async function buildRequesterTrustProfile(
  env: Env,
  requesterId: string,
  viewing: any,
  allViewings: any[],
) {
  const [phoneRec, modRec] = await Promise.all([
    readJson<any>(env, `${PHONE_PREFIX}${requesterId}.json`),
    getUserModerationRecord(env, requesterId),
  ]);
  const userViewings = allViewings.filter((v) => v.requesterId === requesterId);
  const todayIso = new Date().toISOString().slice(0, 10);
  const completedViewings = userViewings.filter(
    (v) => v.status === "APPROVED" && v.date && v.date < todayIso,
  ).length;
  const cancelledViewings = userViewings.filter(
    (v) => v.status === "CANCELLED_BY_REQUESTER",
  ).length;
  const earliestViewing = userViewings
    .map((v) => v.createdAt)
    .filter(Boolean)
    .sort()[0];
  const accountCreatedAt =
    viewing.requesterAccountCreatedAt ||
    phoneRec?.verifiedAt ||
    earliestViewing ||
    viewing.createdAt;

  // Strictly factual trust profile — NEVER AI "risk score" or stigmatizing labels
  return {
    displayName: viewing.requesterName || "Érdeklődő",
    phoneVerified: Boolean(phoneRec?.phoneVerified || viewing.requesterPhoneVerified),
    emailVerified: viewing.requesterEmailVerified !== false,
    profileComplete: viewing.requesterProfileComplete !== false && Boolean(viewing.requesterName?.trim().length >= 3),
    accountCreatedAt,
    totalViewings: userViewings.length,
    completedViewings,
    cancelledViewings,
    previousReportsCount: Number(modRec.reportsCount || 0),
    restrictionLevel: modRec.restrictionLevel || "none",
    restrictedUntil: modRec.restrictedUntil || null,
  };
}

const DEFAULT_RENTAL_LISTING_FEE = 499;
const LISTING_PERIOD_DAYS = 30;
const LISTING_PERIOD_MS = LISTING_PERIOD_DAYS * 86_400_000;

function computeNextExpiresAt(existingExpiresAt?: string | null): string {
  const nowMs = Date.now();
  const currentExpMs = existingExpiresAt ? new Date(existingExpiresAt).getTime() : 0;
  const baseMs = Number.isFinite(currentExpMs) && currentExpMs > nowMs ? currentExpMs : nowMs;
  return new Date(baseMs + LISTING_PERIOD_MS).toISOString();
}

function computeDaysRemaining(expiresAt?: string | null): number {
  if (!expiresAt) return 0;
  const diff = new Date(expiresAt).getTime() - Date.now();
  return diff > 0 ? Math.ceil(diff / 86_400_000) : 0;
}

async function enforceExpirationIfNeeded(env: Env, prop: any): Promise<any> {
  if (!prop || prop.status !== "ACTIVE") return prop;
  if (!prop.expiresAt) return prop;
  const expMs = new Date(prop.expiresAt).getTime();
  if (Number.isFinite(expMs) && expMs <= Date.now()) {
    prop.status = "EXPIRED";
    prop.updatedAt = new Date().toISOString();
    await writeJson(env, `${PROPERTY_PREFIX}${prop.id}.json`, prop, {
      ownerId: prop.ownerId,
      status: "EXPIRED",
    });
    await pushNotification(env, prop.ownerId, {
      type: "VIEWING_REVOKED",
      title: "Ingatlanhirdetésed 30 napos időszaka lejárt",
      body: `A(z) „${prop.title}” hirdetés lejárt. A Saját Ingatlan Adminban újabb 30 napra meghosszabbíthatod.`,
      propertyId: prop.id,
    });
  }
  return prop;
}

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

async function currentUserId(request: Request, env: Env): Promise<string | null> {
  const authorization = request.headers.get("Authorization");
  const bearer = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
  if (!bearer || !env.CLERK_SECRET_KEY) return null;
  try {
    const payload = await verifyToken(bearer, { secretKey: env.CLERK_SECRET_KEY });
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

function safeText(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function safeNum(value: unknown): number | null {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function normalizePhone(raw: string): string {
  const cleaned = raw.replace(/[\s\-()]/g, "");
  if (cleaned.startsWith("00")) return `+${cleaned.slice(2)}`;
  if (cleaned.startsWith("06") && cleaned.length >= 10) return `+36${cleaned.slice(2)}`;
  if (cleaned.startsWith("36") && !cleaned.startsWith("+")) return `+${cleaned}`;
  return cleaned;
}

function maskPhone(phone: string): string {
  if (phone.length < 7) return "***";
  return `${phone.slice(0, 4)} *** **${phone.slice(-2)}`;
}

function getRentalListingFee(env: Env): number {
  if (env.RENTAL_LISTING_FEE !== undefined && env.RENTAL_LISTING_FEE !== "") {
    const parsed = Number(env.RENTAL_LISTING_FEE);
    if (Number.isFinite(parsed) && parsed >= 0) return Math.round(parsed);
  }
  return DEFAULT_RENTAL_LISTING_FEE;
}

export function computeRealEstateFee(
  transactionType: string,
  price: number,
  env: Env,
): { fee: number; tierLabel: string } {
  if (transactionType === "rent") {
    return {
      fee: getRentalListingFee(env),
      tierLabel: "Kiadó ingatlan hirdetési díj (külön díjszabás)",
    };
  }
  const safePrice = Math.max(0, Math.round(Number(price) || 0));
  if (safePrice <= 10_000_000) return { fee: 499, tierLabel: "10 000 000 Ft-ig" };
  if (safePrice <= 30_000_000) return { fee: 699, tierLabel: "10 000 001 – 30 000 000 Ft" };
  if (safePrice <= 60_000_000) return { fee: 999, tierLabel: "30 000 001 – 60 000 000 Ft" };
  return { fee: 1299, tierLabel: "60 000 001 Ft felett" };
}

/**
 * Deterministic ~400-550m jitter so exact street address cannot be reverse-engineered
 * from public map coordinates.
 */
function approximateCoords(
  propertyId: string,
  lat: number | null,
  lng: number | null,
): { approxLatitude: number | null; approxLongitude: number | null } {
  if (lat === null || lng === null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { approxLatitude: null, approxLongitude: null };
  }
  let hash = 0;
  for (let i = 0; i < propertyId.length; i += 1) {
    hash = (hash * 31 + propertyId.charCodeAt(i)) | 0;
  }
  const angle = ((Math.abs(hash) % 360) * Math.PI) / 180;
  const radiusDegLat = 0.0042; // ~460m
  const radiusDegLng = 0.0058; // ~440m at Hungary latitude
  const approxLat = Math.round((lat + Math.sin(angle) * radiusDegLat) * 1000) / 1000;
  const approxLng = Math.round((lng + Math.cos(angle) * radiusDegLng) * 1000) / 1000;
  return { approxLatitude: approxLat, approxLongitude: approxLng };
}

function buildPublicLocation(propertyId: string, exactAddress: any) {
  const { approxLatitude, approxLongitude } = approximateCoords(
    propertyId,
    safeNum(exactAddress?.latitude),
    safeNum(exactAddress?.longitude),
  );
  const showStreet = exactAddress?.showPublicStreet === true;
  const streetDisplay =
    showStreet && exactAddress?.streetName
      ? `${safeText(exactAddress.streetName, 100)} ${safeText(exactAddress.streetType, 30)}`.trim()
      : undefined;
  return {
    country: safeText(exactAddress?.country, 60) || "Magyarország",
    city: safeText(exactAddress?.city, 100),
    district: safeText(exactAddress?.district, 60) || undefined,
    neighborhood: safeText(exactAddress?.neighborhood, 100) || undefined,
    publicStreet: streetDisplay,
    approxLatitude,
    approxLongitude,
  };
}

function formatPublicLocationString(loc: any): string {
  if (!loc) return "Magyarország";
  const parts: string[] = [];
  if (loc.city) {
    if (String(loc.city).toLowerCase() === "budapest" && loc.district) {
      parts.push(`Budapest ${loc.district}`);
    } else {
      parts.push(loc.city);
      if (loc.district) parts.push(loc.district);
    }
  }
  if (loc.neighborhood) parts.push(loc.neighborhood);
  if (loc.publicStreet) parts.push(loc.publicStreet);
  return parts.filter(Boolean).join(", ") || "Magyarország";
}

function addMinutes(startTime: string, durationMinutes: number): string {
  const [hStr, mStr] = startTime.split(":");
  const total = (Number(hStr) || 0) * 60 + (Number(mStr) || 0) + durationMinutes;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function computeActiveDays(prop: any): number {
  if (!prop) return 0;
  const ref = prop.activatedAt || (prop.status === "ACTIVE" ? prop.createdAt : null);
  if (!ref) return 0;
  const ms = Date.now() - new Date(ref).getTime();
  return Math.max(1, Math.floor(ms / 86_400_000) + 1);
}

/**
 * STRICT SERVER-SIDE PRIVACY FILTER:
 * Never returns exactAddress or billing to non-owners.
 * Removes occupied/blocked slots from public viewings list while showing owner all slots.
 */
function normalizeSafeVisitSettings(raw?: any) {
  return {
    requireVerifiedPhone: true as const,
    requirePhotoIdOnArrival: Boolean(raw?.requirePhotoIdOnArrival),
    enableSafeVisitCode: raw?.enableSafeVisitCode !== false,
    requireCompanionsDisclosure: Boolean(raw?.requireCompanionsDisclosure),
  };
}

function sanitizePropertyForViewer(
  prop: any,
  requestingUserId: string | null,
  occupiedSlotIds: Set<string>,
  favoriteSet?: Set<string>,
) {
  const isOwner = Boolean(requestingUserId && prop.ownerId === requestingUserId);
  const publicLocation = prop.publicLocation || buildPublicLocation(prop.id, prop.exactAddress);
  const stats = {
    views: Number(prop.stats?.views || 0),
    favorites: Number(prop.stats?.favorites || 0),
    viewingRequests: Number(prop.stats?.viewingRequests || 0),
    approvedViewings: Number(prop.stats?.approvedViewings || 0),
    messages: Number(prop.stats?.messages || 0),
    activeDays: computeActiveDays(prop),
  };

  const todayIso = new Date().toISOString().slice(0, 10);
  const rawSlots = Array.isArray(prop.viewingSlots) ? prop.viewingSlots : [];
  const viewingSlots = isOwner
    ? rawSlots
    : rawSlots.filter(
        (slot: any) =>
          !slot.isBlocked &&
          slot.date >= todayIso &&
          !occupiedSlotIds.has(slot.id),
      );

  const sanitized: any = {
    id: prop.id,
    ownerId: prop.ownerId,
    ownerName: prop.ownerName || "ILOLIT hirdető",
    agentInquiryPolicy: prop.agentInquiryPolicy === "allow_agents" ? "allow_agents" : "no_agents",
    verifiedBuyersOnly: Boolean(prop.verifiedBuyersOnly),
    sellerAccountType: prop.sellerAccountType === "agency_partner" ? "agency_partner" : "private",
    safeVisitSettings: normalizeSafeVisitSettings(prop.safeVisitSettings),
    transactionType: prop.transactionType,
    category: prop.category,
    subtype: prop.subtype || "",
    title: prop.title,
    description: prop.description,
    price: Number(prop.price || 0),
    currency: "HUF",
    listingFee: Number(prop.listingFee || 0),
    listingFeeTier: prop.listingFeeTier || "",
    status: prop.status,
    publicLocation,
    specs: prop.specs || {},
    sustainability: prop.sustainability || {},
    rentalTerms: prop.transactionType === "rent" ? prop.rentalTerms || {} : undefined,
    photos: Array.isArray(prop.photos) ? prop.photos : [],
    floorPlans: Array.isArray(prop.floorPlans) ? prop.floorPlans : [],
    videoUrl: prop.videoUrl || "",
    viewingSlots,
    stats,
    isOwner,
    isFavorited: Boolean(favoriteSet?.has(prop.id)),
    activatedAt: prop.activatedAt,
    expiresAt: prop.expiresAt,
    daysRemaining: computeDaysRemaining(prop.expiresAt),
    createdAt: prop.createdAt,
    updatedAt: prop.updatedAt,
  };

  if (isOwner) {
    sanitized.exactAddress = prop.exactAddress;
    sanitized.billing = Array.isArray(prop.billing) ? prop.billing : [];
    sanitized.ownerPhone = prop.ownerPhone || "";
    sanitized.ownerPhoneShareMode = prop.ownerPhoneShareMode || "none";
  }

  return sanitized;
}

async function appendAudit(
  env: Env,
  propertyId: string,
  entry: {
    action: string;
    actorId: string;
    actorName?: string;
    targetUserId?: string;
    viewingId?: string;
    slotSummary?: string;
    details?: string;
  },
) {
  const key = `${AUDIT_PREFIX}${propertyId}.json`;
  const existing = (await readJson<any[]>(env, key)) || [];
  const next = [
    {
      id: crypto.randomUUID(),
      propertyId,
      ...entry,
      timestamp: new Date().toISOString(),
    },
    ...existing,
  ].slice(0, 500);
  await writeJson(env, key, next);
}

async function pushNotification(
  env: Env,
  userId: string,
  notif: {
    type: string;
    title: string;
    body: string;
    propertyId?: string;
    viewingId?: string;
    listingTitle?: string;
    coverImage?: string;
    date?: string;
    startTime?: string;
    shortLocation?: string;
    popupRequired?: boolean;
    pushTitle?: string;
    pushBody?: string;
  },
) {
  const key = `${NOTIFICATION_PREFIX}${userId}.json`;
  const existing = (await readJson<any[]>(env, key)) || [];
  const next = [
    {
      id: crypto.randomUUID(),
      ...notif,
      read: false,
      createdAt: new Date().toISOString(),
    },
    ...existing,
  ].slice(0, 200);
  await writeJson(env, key, next);

  // Also emit into the unified notifications + device/web push system (privacy-safe: never exact address)
  const eventType =
    notif.type === "VIEWING_APPROVED"
      ? "APPOINTMENT_CONFIRMED"
      : notif.type === "VIEWING_PROPOSED"
        ? "APPOINTMENT_PROPOSED_NEW_TIME"
        : notif.type === "VIEWING_REJECTED"
          ? "APPOINTMENT_REJECTED"
          : notif.type === "VIEWING_REVOKED" || notif.type === "VIEWING_CANCELLED"
            ? "APPOINTMENT_CANCELLED"
            : "APPOINTMENT_REQUESTED";

  const links = notif.viewingId
    ? buildAppointmentLinks("PROPERTY_VIEWING", notif.viewingId)
    : { deepLink: "ilolit://appointments/property", webUrl: "/dashboard/bookings/properties" };

  await emitUnifiedNotification(
    env,
    userId,
    {
      category: "INGATLAN",
      eventType,
      title: notif.title,
      body: notif.body,
      appointmentId: notif.viewingId,
      appointmentType: "PROPERTY_VIEWING",
      listingId: notif.propertyId,
      listingTitle: notif.listingTitle,
      coverImage: notif.coverImage,
      date: notif.date,
      startTime: notif.startTime,
      shortLocation: notif.shortLocation,
      deepLink: links.deepLink,
      webUrl: links.webUrl,
      popupRequired: notif.popupRequired ?? ["APPOINTMENT_CONFIRMED", "APPOINTMENT_PROPOSED_NEW_TIME", "APPOINTMENT_CANCELLED", "APPOINTMENT_REJECTED"].includes(eventType),
    },
    {
      sendPush: true,
      pushTitle: notif.pushTitle || notif.title,
      pushBody: notif.pushBody || notif.body,
    },
  );
}

async function listAllViewings(env: Env): Promise<any[]> {
  const listed = await env.MEDIA_BUCKET.list({ prefix: VIEWING_PREFIX, limit: 1000 });
  const records = await Promise.all(listed.objects.map((o) => readJson(env, o.key)));
  return records.filter(Boolean);
}

async function listAllProperties(env: Env): Promise<any[]> {
  const listed = await env.MEDIA_BUCKET.list({ prefix: PROPERTY_PREFIX, limit: 1000 });
  const records = await Promise.all(listed.objects.map((o) => readJson(env, o.key)));
  return records.filter(Boolean);
}

async function syncPropertyStats(env: Env, propertyId: string) {
  const prop = await readJson<any>(env, `${PROPERTY_PREFIX}${propertyId}.json`);
  if (!prop) return;
  const viewings = (await listAllViewings(env)).filter((v) => v.propertyId === propertyId);
  const messages = (await readJson<any[]>(env, `${MESSAGE_PREFIX}${propertyId}.json`)) || [];
  prop.stats = {
    ...(prop.stats || {}),
    viewingRequests: viewings.length,
    approvedViewings: viewings.filter((v) => v.status === "APPROVED").length,
    messages: messages.length,
  };
  await writeJson(env, `${PROPERTY_PREFIX}${propertyId}.json`, prop, {
    ownerId: prop.ownerId,
    status: prop.status,
  });
}

function enrichViewingReminders(viewing: any) {
  if (viewing.status !== "APPROVED" || !viewing.date || !viewing.startTime) {
    return { ...viewing, reminder24hDue: false, reminder2hDue: false };
  }
  const viewingMs = new Date(`${viewing.date}T${viewing.startTime}:00`).getTime();
  const diffHours = (viewingMs - Date.now()) / 3_600_000;
  return {
    ...viewing,
    reminder24hDue: Boolean(viewing.reminder24hEnabled && diffHours > 0 && diffHours <= 24),
    reminder2hDue: Boolean(viewing.reminder2hEnabled && diffHours > 0 && diffHours <= 2),
  };
}

async function sendTwilioSms(env: Env, to: string, body: string): Promise<boolean> {
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_FROM_NUMBER) {
    return false;
  }
  const auth = btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`);
  const form = new URLSearchParams({
    To: to,
    From: env.TWILIO_FROM_NUMBER,
    Body: body,
  });
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(env.TWILIO_ACCOUNT_SID)}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form,
    },
  );
  return res.ok;
}

export const onRequest: PagesFunction<Env> = async (rawContext) => {
  const context = rawContext as Context;
  const method = context.request.method.toUpperCase();
  if (method === "OPTIONS") return json(null, 204);

  const route = routeParts(context);
  const env = context.env;
  const userId = await currentUserId(context.request, env);

  // =========================================================================
  // 1. PROPERTIES
  // =========================================================================
  if (route[0] === "properties") {
    const propertyId = route[1];
    const sub = route[2];
    const subId = route[3];

    // GET /api/real-estate/properties
    if (method === "GET" && !propertyId) {
      const url = new URL(context.request.url);
      const mine = url.searchParams.get("mine") === "true";
      if (mine && !userId) return json({ error: "A saját ingatlanok megtekintéséhez jelentkezz be." }, 401);

      const txFilter = url.searchParams.get("transactionType");
      const catFilter = url.searchParams.get("category");

      const [rawProps, allViewings, userFavs] = await Promise.all([
        listAllProperties(env),
        listAllViewings(env),
        userId ? readJson<string[]>(env, `${FAVORITE_PREFIX}${userId}.json`) : Promise.resolve([]),
      ]);
      const allProps = await Promise.all(rawProps.map((p) => enforceExpirationIfNeeded(env, p)));

      const favSet = new Set<string>(Array.isArray(userFavs) ? userFavs : []);
      const occupiedByProp = new Map<string, Set<string>>();
      for (const v of allViewings) {
        if (v.status === "PENDING" || v.status === "APPROVED") {
          if (!occupiedByProp.has(v.propertyId)) occupiedByProp.set(v.propertyId, new Set());
          occupiedByProp.get(v.propertyId)!.add(v.slotId);
        }
      }

      const filtered = allProps
        .filter((p) => {
          if (p.status === "DELETED") return false;
          if (mine) return p.ownerId === userId;
          if (p.status !== "ACTIVE") return false;
          if (txFilter && txFilter !== "all" && p.transactionType !== txFilter) return false;
          if (catFilter && catFilter !== "all" && p.category !== catFilter) return false;
          return true;
        })
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
        .map((p) =>
          sanitizePropertyForViewer(p, userId, occupiedByProp.get(p.id) || new Set(), favSet),
        );

      return json({ items: filtered, total: filtered.length });
    }

    // GET /api/real-estate/properties/:id
    if (method === "GET" && propertyId && !sub) {
      const rawProp = await readJson<any>(env, `${PROPERTY_PREFIX}${propertyId}.json`);
      const prop = await enforceExpirationIfNeeded(env, rawProp);
      if (!prop || prop.status === "DELETED") {
        return json({ error: "Az ingatlanhirdetés nem található." }, 404);
      }
      const isOwner = Boolean(userId && prop.ownerId === userId);
      if (!isOwner && !["ACTIVE", "SOLD", "RENTED"].includes(prop.status)) {
        return json({ error: "Ez a hirdetés jelenleg nem nyilvános." }, 404);
      }

      // Increment real view counter for non-owner active views
      if (!isOwner && prop.status === "ACTIVE") {
        prop.stats = { ...(prop.stats || {}), views: Number(prop.stats?.views || 0) + 1 };
        await writeJson(env, `${PROPERTY_PREFIX}${propertyId}.json`, prop, {
          ownerId: prop.ownerId,
          status: prop.status,
        });
      }

      const [allViewings, userFavs] = await Promise.all([
        listAllViewings(env),
        userId ? readJson<string[]>(env, `${FAVORITE_PREFIX}${userId}.json`) : Promise.resolve([]),
      ]);
      const occupied = new Set<string>(
        allViewings
          .filter((v) => v.propertyId === propertyId && (v.status === "PENDING" || v.status === "APPROVED"))
          .map((v) => v.slotId),
      );

      return json(
        sanitizePropertyForViewer(
          prop,
          userId,
          occupied,
          new Set<string>(Array.isArray(userFavs) ? userFavs : []),
        ),
      );
    }

    // Protected property routes require authentication
    if (!userId) return json({ error: "A művelethez jelentkezz be." }, 401);

    // POST /api/real-estate/properties (Create new listing)
    if (method === "POST" && !propertyId) {
      let body: any;
      try {
        body = await context.request.json();
      } catch {
        return json({ error: "Érvénytelen kérés." }, 400);
      }

      const transactionType = body.transactionType === "rent" ? "rent" : "sale";
      const category = safeText(body.category, 40) || "apartment";
      const title = safeText(body.title, 160);
      const description = safeText(body.description, 8000);
      const price = Math.max(0, Math.round(Number(body.price) || 0));

      const exactAddress = {
        country: safeText(body.exactAddress?.country, 60) || "Magyarország",
        postalCode: safeText(body.exactAddress?.postalCode, 16),
        city: safeText(body.exactAddress?.city, 100),
        district: safeText(body.exactAddress?.district, 60) || undefined,
        neighborhood: safeText(body.exactAddress?.neighborhood, 100) || undefined,
        streetName: safeText(body.exactAddress?.streetName, 120),
        streetType: safeText(body.exactAddress?.streetType, 40) || "utca",
        houseNumber: safeText(body.exactAddress?.houseNumber, 30),
        floorDoor: safeText(body.exactAddress?.floorDoor, 40) || undefined,
        parcelNumber: safeText(body.exactAddress?.parcelNumber, 60) || undefined,
        latitude: safeNum(body.exactAddress?.latitude),
        longitude: safeNum(body.exactAddress?.longitude),
        showPublicStreet: body.exactAddress?.showPublicStreet === true,
        viewingInstructions: safeText(body.exactAddress?.viewingInstructions, 1000) || undefined,
      };

      if (!title || title.length < 5) {
        return json({ error: "A hirdetés címe legalább 5 karakter legyen." }, 400);
      }
      if (!price || price < 1000) {
        return json({ error: "Adj meg érvényes árat (legalább 1 000 Ft)." }, 400);
      }
      if (!exactAddress.city || !exactAddress.postalCode) {
        return json({ error: "Az irányítószám és a település megadása kötelező." }, 400);
      }

      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const { fee, tierLabel } = computeRealEstateFee(transactionType, price, env);
      const publicLocation = buildPublicLocation(id, exactAddress);

      // Listing NEVER activates for free when fee > 0; starts as DRAFT or PAYMENT_PENDING
      const initialStatus = body.submitForPayment ? (fee === 0 ? "ACTIVE" : "PAYMENT_PENDING") : "DRAFT";

      const photos = (Array.isArray(body.photos) ? body.photos : [])
        .filter((p: any) => p && typeof p.url === "string" && p.url.length > 0)
        .slice(0, 25)
        .map((p: any, idx: number) => ({
          id: safeText(p.id, 80) || `${id}-photo-${idx + 1}`,
          url: p.url,
          rotation: Number(p.rotation || 0) % 360,
          caption: safeText(p.caption, 200) || undefined,
          order: idx,
        }));

      const floorPlans = (Array.isArray(body.floorPlans) ? body.floorPlans : [])
        .filter((p: any) => p && typeof p.url === "string" && p.url.length > 0)
        .slice(0, 5)
        .map((p: any, idx: number) => ({
          id: safeText(p.id, 80) || `${id}-fp-${idx + 1}`,
          url: p.url,
          rotation: Number(p.rotation || 0) % 360,
          caption: safeText(p.caption, 200) || undefined,
          order: idx,
        }));

      const ownerPhoneShareMode =
        body.ownerPhoneShareMode === "approved_only" ? "approved_only" : "none";
      const ownerPhone =
        ownerPhoneShareMode === "approved_only" ? safeText(body.ownerPhone, 30) : "";
      const agentInquiryPolicy =
        body.agentInquiryPolicy === "allow_agents" ? "allow_agents" : "no_agents";
      const verifiedBuyersOnly = body.verifiedBuyersOnly === true;
      const sellerAccountType =
        body.sellerAccountType === "agency_partner" ? "agency_partner" : "private";
      const safeVisitSettings = normalizeSafeVisitSettings(body.safeVisitSettings);

      const property = {
        id,
        ownerId: userId,
        ownerName: safeText(body.ownerName, 120) || "ILOLIT hirdető",
        ownerPhone,
        ownerPhoneShareMode,
        agentInquiryPolicy,
        verifiedBuyersOnly,
        sellerAccountType,
        safeVisitSettings,
        transactionType,
        category,
        subtype: safeText(body.subtype, 60),
        title,
        description,
        price,
        currency: "HUF",
        listingFee: fee,
        listingFeeTier: tierLabel,
        status: initialStatus,
        publicLocation,
        exactAddress,
        specs: body.specs && typeof body.specs === "object" ? body.specs : {},
        sustainability: body.sustainability && typeof body.sustainability === "object" ? body.sustainability : {},
        rentalTerms: transactionType === "rent" && body.rentalTerms ? body.rentalTerms : undefined,
        photos,
        floorPlans,
        videoUrl: safeText(body.videoUrl, 600) || "",
        viewingSlots: [],
        stats: {
          views: 0,
          favorites: 0,
          viewingRequests: 0,
          approvedViewings: 0,
          messages: 0,
          activeDays: initialStatus === "ACTIVE" ? 1 : 0,
        },
        billing: [],
        activatedAt: initialStatus === "ACTIVE" ? now : undefined,
        expiresAt: initialStatus === "ACTIVE" ? computeNextExpiresAt(null) : undefined,
        createdAt: now,
        updatedAt: now,
      };

      await writeJson(env, `${PROPERTY_PREFIX}${id}.json`, property, {
        ownerId: userId,
        status: property.status,
      });

      return json(sanitizePropertyForViewer(property, userId, new Set()), 201);
    }

    // PATCH /api/real-estate/properties/:id (Owner edits property)
    if (method === "PATCH" && propertyId && !sub) {
      const existing = await readJson<any>(env, `${PROPERTY_PREFIX}${propertyId}.json`);
      if (!existing || existing.status === "DELETED") return json({ error: "A hirdetés nem található." }, 404);
      if (existing.ownerId !== userId) return json({ error: "Nincs jogosultságod a módosításhoz." }, 403);

      let body: any;
      try {
        body = await context.request.json();
      } catch {
        return json({ error: "Érvénytelen adat." }, 400);
      }

      const transactionType = body.transactionType === "rent" ? "rent" : body.transactionType === "sale" ? "sale" : existing.transactionType;
      const price = body.price !== undefined ? Math.max(0, Math.round(Number(body.price) || 0)) : existing.price;
      const { fee, tierLabel } = computeRealEstateFee(transactionType, price, env);

      const exactAddress = body.exactAddress
        ? {
            ...existing.exactAddress,
            ...body.exactAddress,
            country: safeText(body.exactAddress.country ?? existing.exactAddress?.country, 60) || "Magyarország",
            postalCode: safeText(body.exactAddress.postalCode ?? existing.exactAddress?.postalCode, 16),
            city: safeText(body.exactAddress.city ?? existing.exactAddress?.city, 100),
            district: safeText(body.exactAddress.district ?? existing.exactAddress?.district, 60) || undefined,
            neighborhood: safeText(body.exactAddress.neighborhood ?? existing.exactAddress?.neighborhood, 100) || undefined,
            streetName: safeText(body.exactAddress.streetName ?? existing.exactAddress?.streetName, 120),
            streetType: safeText(body.exactAddress.streetType ?? existing.exactAddress?.streetType, 40) || "utca",
            houseNumber: safeText(body.exactAddress.houseNumber ?? existing.exactAddress?.houseNumber, 30),
            floorDoor: safeText(body.exactAddress.floorDoor ?? existing.exactAddress?.floorDoor, 40) || undefined,
            parcelNumber: safeText(body.exactAddress.parcelNumber ?? existing.exactAddress?.parcelNumber, 60) || undefined,
            latitude: safeNum(body.exactAddress.latitude ?? existing.exactAddress?.latitude),
            longitude: safeNum(body.exactAddress.longitude ?? existing.exactAddress?.longitude),
            showPublicStreet: body.exactAddress.showPublicStreet === true,
            viewingInstructions: safeText(body.exactAddress.viewingInstructions ?? existing.exactAddress?.viewingInstructions, 1000) || undefined,
          }
        : existing.exactAddress;

      const nextShareMode =
        body.ownerPhoneShareMode !== undefined
          ? body.ownerPhoneShareMode === "approved_only"
            ? "approved_only"
            : "none"
          : existing.ownerPhoneShareMode || "none";
      const nextOwnerPhone =
        nextShareMode === "approved_only"
          ? body.ownerPhone !== undefined
            ? safeText(body.ownerPhone, 30)
            : existing.ownerPhone || ""
          : "";

      const updated = {
        ...existing,
        ownerPhoneShareMode: nextShareMode,
        ownerPhone: nextOwnerPhone,
        agentInquiryPolicy:
          body.agentInquiryPolicy !== undefined
            ? body.agentInquiryPolicy === "allow_agents"
              ? "allow_agents"
              : "no_agents"
            : existing.agentInquiryPolicy || "no_agents",
        verifiedBuyersOnly:
          body.verifiedBuyersOnly !== undefined
            ? body.verifiedBuyersOnly === true
            : Boolean(existing.verifiedBuyersOnly),
        sellerAccountType:
          body.sellerAccountType !== undefined
            ? body.sellerAccountType === "agency_partner"
              ? "agency_partner"
              : "private"
            : existing.sellerAccountType || "private",
        safeVisitSettings:
          body.safeVisitSettings !== undefined
            ? normalizeSafeVisitSettings({ ...(existing.safeVisitSettings || {}), ...body.safeVisitSettings })
            : normalizeSafeVisitSettings(existing.safeVisitSettings),
        transactionType,
        category: body.category ? safeText(body.category, 40) : existing.category,
        subtype: body.subtype !== undefined ? safeText(body.subtype, 60) : existing.subtype,
        title: body.title !== undefined ? safeText(body.title, 160) : existing.title,
        description: body.description !== undefined ? safeText(body.description, 8000) : existing.description,
        price,
        listingFee: fee,
        listingFeeTier: tierLabel,
        exactAddress,
        publicLocation: buildPublicLocation(propertyId, exactAddress),
        specs: body.specs !== undefined ? { ...existing.specs, ...body.specs } : existing.specs,
        sustainability: body.sustainability !== undefined ? { ...existing.sustainability, ...body.sustainability } : existing.sustainability,
        rentalTerms: transactionType === "rent"
          ? body.rentalTerms !== undefined
            ? { ...(existing.rentalTerms || {}), ...body.rentalTerms }
            : existing.rentalTerms
          : undefined,
        photos: Array.isArray(body.photos) ? body.photos.slice(0, 25) : existing.photos,
        floorPlans: Array.isArray(body.floorPlans) ? body.floorPlans.slice(0, 5) : existing.floorPlans,
        videoUrl: body.videoUrl !== undefined ? safeText(body.videoUrl, 600) : existing.videoUrl,
        updatedAt: new Date().toISOString(),
      };

      await writeJson(env, `${PROPERTY_PREFIX}${propertyId}.json`, updated, {
        ownerId: userId,
        status: updated.status,
      });

      return json(sanitizePropertyForViewer(updated, userId, new Set()));
    }

    // PATCH /api/real-estate/properties/:id/status
    if (method === "PATCH" && propertyId && sub === "status") {
      const existing = await readJson<any>(env, `${PROPERTY_PREFIX}${propertyId}.json`);
      if (!existing) return json({ error: "A hirdetés nem található." }, 404);
      if (existing.ownerId !== userId) return json({ error: "Nincs jogosultságod." }, 403);

      let body: any;
      try {
        body = await context.request.json();
      } catch {
        return json({ error: "Érvénytelen adat." }, 400);
      }

      const nextStatus = safeText(body.status, 30);
      const allowed = new Set(["DRAFT", "PAYMENT_PENDING", "ACTIVE", "PAUSED", "SOLD", "RENTED", "EXPIRED", "DELETED"]);
      if (!allowed.has(nextStatus)) return json({ error: "Érvénytelen státusz." }, 400);

      // Cannot manually force ACTIVE unless paid AND within active 30-day validity window
      const hasPaidBilling = Array.isArray(existing.billing) && existing.billing.some((b: any) => b.status === "paid");
      const isStillValid = Boolean(existing.expiresAt && new Date(existing.expiresAt).getTime() > Date.now());
      if (nextStatus === "ACTIVE" && existing.listingFee > 0 && (!hasPaidBilling || !isStillValid)) {
        return json(
          {
            error:
              existing.status === "EXPIRED" || !isStillValid
                ? "A 30 napos hirdetési időszak lejárt. Az újbóli aktiváláshoz a hirdetési díj ismételt befizetése szükséges."
                : "A hirdetés csak sikeres fizetés után aktiválható 30 napra.",
          },
          402,
        );
      }

      existing.status = nextStatus;
      existing.updatedAt = new Date().toISOString();
      if (nextStatus === "ACTIVE" && !existing.activatedAt) {
        existing.activatedAt = existing.updatedAt;
      }

      await writeJson(env, `${PROPERTY_PREFIX}${propertyId}.json`, existing, {
        ownerId: userId,
        status: existing.status,
      });

      return json(sanitizePropertyForViewer(existing, userId, new Set()));
    }

    // POST /api/real-estate/properties/:id/test-activate (Owner test-mode activation without Stripe)
    if (method === "POST" && propertyId && sub === "test-activate") {
      if (env.REAL_ESTATE_TEST_MODE === "false") {
        return json({ error: "A teszt üzemmód ki van kapcsolva." }, 403);
      }
      const existing = await readJson<any>(env, `${PROPERTY_PREFIX}${propertyId}.json`);
      if (!existing || existing.status === "DELETED") return json({ error: "A hirdetés nem található." }, 404);
      if (existing.ownerId !== userId) return json({ error: "Nincs jogosultságod." }, 403);

      const now = new Date().toISOString();
      const nextExpiresAt = computeNextExpiresAt(existing.expiresAt);
      const billing = Array.isArray(existing.billing) ? existing.billing : [];
      const nextBilling = [
        ...billing,
        {
          id: crypto.randomUUID(),
          amount: 0,
          currency: "HUF",
          status: "paid",
          tierLabel: `Teszt üzemmód – 30 napos próbaaktiválás (eredeti díj: ${existing.listingFee} Ft / 30 nap)`,
          periodDays: LISTING_PERIOD_DAYS,
          expiresAt: nextExpiresAt,
          createdAt: now,
          paidAt: now,
        },
      ];

      existing.status = "ACTIVE";
      existing.activatedAt = existing.activatedAt || now;
      existing.expiresAt = nextExpiresAt;
      existing.billing = nextBilling;
      existing.updatedAt = now;

      await writeJson(env, `${PROPERTY_PREFIX}${propertyId}.json`, existing, {
        ownerId: userId,
        status: "ACTIVE",
      });

      await appendAudit(env, propertyId, {
        action: "VIEWING_APPROVED",
        actorId: userId,
        details: "Hirdetés aktiválva teszt üzemmódban (fizetés nélkül).",
      });

      return json(sanitizePropertyForViewer(existing, userId, new Set()));
    }

    // POST /api/real-estate/properties/:id/test-viewing (Owner simulates an incoming verified viewing request)
    if (method === "POST" && propertyId && sub === "test-viewing") {
      if (env.REAL_ESTATE_TEST_MODE === "false") {
        return json({ error: "A teszt üzemmód ki van kapcsolva." }, 403);
      }
      const prop = await readJson<any>(env, `${PROPERTY_PREFIX}${propertyId}.json`);
      if (!prop || prop.status === "DELETED") return json({ error: "A hirdetés nem található." }, 404);
      if (prop.ownerId !== userId) return json({ error: "Nincs jogosultságod." }, 403);

      const allViewings = await listAllViewings(env);
      const occupied = new Set(
        allViewings
          .filter((v) => v.propertyId === propertyId && (v.status === "PENDING" || v.status === "APPROVED"))
          .map((v) => v.slotId),
      );
      const slots: any[] = Array.isArray(prop.viewingSlots) ? prop.viewingSlots : [];
      let chosenSlot = slots.find((s) => !s.isBlocked && !occupied.has(s.id));

      // If no slots exist yet, create one automatically for tomorrow 16:00 so testing is 1-click
      const now = new Date().toISOString();
      if (!chosenSlot) {
        const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
        chosenSlot = {
          id: crypto.randomUUID(),
          date: tomorrow,
          startTime: "16:00",
          endTime: "16:30",
          durationMinutes: 30,
          isBlocked: false,
          createdAt: now,
        };
        prop.viewingSlots = [...slots, chosenSlot];
        await writeJson(env, `${PROPERTY_PREFIX}${propertyId}.json`, prop, {
          ownerId: prop.ownerId,
          status: prop.status,
        });
      }

      const testRequesterId = `test_requester_${crypto.randomUUID().slice(0, 8)}`;
      // Mark test requester phone verified so APPROVE works cleanly
      await writeJson(env, `${PHONE_PREFIX}${testRequesterId}.json`, {
        userId: testRequesterId,
        phone: "+36301234567",
        phoneVerified: true,
        verifiedAt: now,
      });

      const viewing = {
        id: crypto.randomUUID(),
        propertyId,
        propertyTitle: prop.title,
        propertyPublicLocation: formatPublicLocationString(prop.publicLocation),
        propertyCoverImage: prop.photos?.[0]?.url || "",
        propertyPrice: Number(prop.price || 0),
        propertyTransactionType: prop.transactionType,
        ownerId: prop.ownerId,
        ownerName: prop.ownerName || "ILOLIT hirdető",
        requesterId: testRequesterId,
        requesterName: "Teszt Érdeklődő (Kovács Anna)",
        requesterPhoneVerified: true,
        slotId: chosenSlot.id,
        date: chosenSlot.date,
        startTime: chosenSlot.startTime,
        endTime: chosenSlot.endTime,
        durationMinutes: chosenSlot.durationMinutes,
        message: "Teszt megtekintési kérelem: szívesen megnézném az ingatlant ebben az időpontban.",
        status: "PENDING",
        reminder24hEnabled: true,
        reminder2hEnabled: true,
        createdAt: now,
        updatedAt: now,
      };

      await writeJson(env, `${VIEWING_PREFIX}${viewing.id}.json`, viewing, {
        propertyId,
        ownerId: prop.ownerId,
        requesterId: testRequesterId,
      });

      await Promise.all([
        syncPropertyStats(env, propertyId),
        appendAudit(env, propertyId, {
          action: "VIEWING_REQUESTED",
          actorId: testRequesterId,
          actorName: viewing.requesterName,
          viewingId: viewing.id,
          slotSummary: `${chosenSlot.date} ${chosenSlot.startTime}-${chosenSlot.endTime}`,
          details: "Teszt megtekintési kérelem létrehozva a hirdetői nézet kipróbálásához.",
        }),
      ]);

      return json(enrichViewingReminders({ ...viewing, role: "owner" }), 201);
    }

    // POST /api/real-estate/properties/:id/favorite
    if (method === "POST" && propertyId && sub === "favorite") {
      const prop = await readJson<any>(env, `${PROPERTY_PREFIX}${propertyId}.json`);
      if (!prop || prop.status === "DELETED") return json({ error: "A hirdetés nem található." }, 404);
      const favKey = `${FAVORITE_PREFIX}${userId}.json`;
      const current = new Set<string>((await readJson<string[]>(env, favKey)) || []);
      let favorited = false;
      if (current.has(propertyId)) {
        current.delete(propertyId);
        prop.stats = { ...(prop.stats || {}), favorites: Math.max(0, Number(prop.stats?.favorites || 0) - 1) };
      } else {
        current.add(propertyId);
        favorited = true;
        prop.stats = { ...(prop.stats || {}), favorites: Number(prop.stats?.favorites || 0) + 1 };
      }
      await Promise.all([
        writeJson(env, favKey, [...current]),
        writeJson(env, `${PROPERTY_PREFIX}${propertyId}.json`, prop, { ownerId: prop.ownerId, status: prop.status }),
      ]);
      return json({ favorited, favoritesCount: prop.stats.favorites });
    }

    // SLOTS MANAGEMENT: POST/PATCH/DELETE /api/real-estate/properties/:id/slots
    if (propertyId && sub === "slots") {
      const prop = await readJson<any>(env, `${PROPERTY_PREFIX}${propertyId}.json`);
      if (!prop || prop.status === "DELETED") return json({ error: "A hirdetés nem található." }, 404);
      if (prop.ownerId !== userId) return json({ error: "Csak a hirdető kezelheti az időpontokat." }, 403);

      const slots: any[] = Array.isArray(prop.viewingSlots) ? [...prop.viewingSlots] : [];

      if (method === "POST" && !subId) {
        let body: any;
        try {
          body = await context.request.json();
        } catch {
          return json({ error: "Érvénytelen időpontadat." }, 400);
        }

        const toAdd: any[] = [];
        const now = new Date().toISOString();

        // Explicit single or multiple slots
        if (Array.isArray(body.slots)) {
          for (const item of body.slots.slice(0, 60)) {
            const date = safeText(item.date, 10);
            const startTime = safeText(item.startTime, 5);
            const durationMinutes = Math.max(10, Math.min(240, Math.round(Number(item.durationMinutes) || 30)));
            if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(startTime)) continue;
            const endTime = addMinutes(startTime, durationMinutes);
            const duplicate = [...slots, ...toAdd].some((s) => s.date === date && s.startTime === startTime);
            if (!duplicate) {
              toAdd.push({
                id: crypto.randomUUID(),
                date,
                startTime,
                endTime,
                durationMinutes,
                isBlocked: false,
                note: safeText(item.note, 200) || undefined,
                createdAt: now,
              });
            }
          }
        }

        // Recurring window generator
        if (body.recurring && typeof body.recurring === "object") {
          const r = body.recurring;
          const startDate = safeText(r.startDate, 10);
          const endDate = safeText(r.endDate, 10);
          const weekdays: number[] = Array.isArray(r.weekdays) ? r.weekdays.map(Number) : [1, 2, 3, 4, 5];
          const windowStart = safeText(r.windowStart, 5);
          const windowEnd = safeText(r.windowEnd, 5);
          const durationMinutes = Math.max(10, Math.min(240, Math.round(Number(r.durationMinutes) || 30)));

          if (
            /^\d{4}-\d{2}-\d{2}$/.test(startDate) &&
            /^\d{4}-\d{2}-\d{2}$/.test(endDate) &&
            /^\d{2}:\d{2}$/.test(windowStart) &&
            /^\d{2}:\d{2}$/.test(windowEnd)
          ) {
            const cursor = new Date(`${startDate}T12:00:00Z`);
            const endDt = new Date(`${endDate}T12:00:00Z`);
            const [wsH, wsM] = windowStart.split(":").map(Number);
            const [weH, weM] = windowEnd.split(":").map(Number);
            const winStartMin = wsH * 60 + wsM;
            const winEndMin = weH * 60 + weM;
            let guard = 0;

            while (cursor <= endDt && guard < 45 && toAdd.length < 80) {
              guard += 1;
              if (weekdays.includes(cursor.getUTCDay())) {
                const dateStr = cursor.toISOString().slice(0, 10);
                for (let m = winStartMin; m + durationMinutes <= winEndMin && toAdd.length < 80; m += durationMinutes) {
                  const st = `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
                  const et = addMinutes(st, durationMinutes);
                  const dup = [...slots, ...toAdd].some((s) => s.date === dateStr && s.startTime === st);
                  if (!dup) {
                    toAdd.push({
                      id: crypto.randomUUID(),
                      date: dateStr,
                      startTime: st,
                      endTime: et,
                      durationMinutes,
                      isBlocked: false,
                      createdAt: now,
                    });
                  }
                }
              }
              cursor.setUTCDate(cursor.getUTCDate() + 1);
            }
          }
        }

        if (toAdd.length === 0) {
          return json({ error: "Nem sikerült új időpontot létrehozni (hiányzó vagy már létező idősáv)." }, 400);
        }

        const merged = [...slots, ...toAdd].sort((a, b) =>
          `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`),
        );
        prop.viewingSlots = merged;
        prop.updatedAt = now;
        await writeJson(env, `${PROPERTY_PREFIX}${propertyId}.json`, prop, {
          ownerId: prop.ownerId,
          status: prop.status,
        });
        return json({ viewingSlots: merged, addedCount: toAdd.length }, 201);
      }

      if (method === "PATCH" && subId) {
        let body: any;
        try {
          body = await context.request.json();
        } catch {
          return json({ error: "Érvénytelen adat." }, 400);
        }
        const updatedSlots = slots.map((s) =>
          s.id === subId ? { ...s, isBlocked: Boolean(body.isBlocked) } : s,
        );
        prop.viewingSlots = updatedSlots;
        prop.updatedAt = new Date().toISOString();
        await writeJson(env, `${PROPERTY_PREFIX}${propertyId}.json`, prop, {
          ownerId: prop.ownerId,
          status: prop.status,
        });
        return json({ viewingSlots: updatedSlots });
      }

      if (method === "DELETE" && subId) {
        // If there is an active viewing on this slot, notify requester and mark revoked
        const viewings = (await listAllViewings(env)).filter(
          (v) => v.propertyId === propertyId && v.slotId === subId && (v.status === "PENDING" || v.status === "APPROVED"),
        );
        const now = new Date().toISOString();
        for (const v of viewings) {
          v.status = "REVOKED_BY_OWNER";
          v.ownerResponseNote = "A hirdető törölte ezt az idősávot.";
          if (v.safeVisit) {
            v.safeVisit.codeStatus = "INVALIDATED";
            v.safeVisit.invalidatedAt = now;
          }
          v.updatedAt = now;
          await writeJson(env, `${VIEWING_PREFIX}${v.id}.json`, v);
          await pushNotification(env, v.requesterId, {
            type: "VIEWING_REVOKED",
            title: "Megtekintési időpont törölve",
            body: `A(z) „${prop.title}” hirdetésnél a(z) ${v.date} ${v.startTime} időpontot a hirdető törölte.`,
            propertyId,
            viewingId: v.id,
          });
          await appendAudit(env, propertyId, {
            action: "VIEWING_REVOKED_BY_OWNER",
            actorId: userId,
            targetUserId: v.requesterId,
            viewingId: v.id,
            slotSummary: `${v.date} ${v.startTime}-${v.endTime}`,
            details: "Idősáv törlése miatt visszavonva.",
          });
        }

        const remaining = slots.filter((s) => s.id !== subId);
        prop.viewingSlots = remaining;
        prop.updatedAt = now;
        await writeJson(env, `${PROPERTY_PREFIX}${propertyId}.json`, prop, {
          ownerId: prop.ownerId,
          status: prop.status,
        });
        await syncPropertyStats(env, propertyId);
        return json({ viewingSlots: remaining });
      }
    }

    // AUDIT LOG: GET /api/real-estate/properties/:id/audit (owner only)
    if (method === "GET" && propertyId && sub === "audit") {
      const prop = await readJson<any>(env, `${PROPERTY_PREFIX}${propertyId}.json`);
      if (!prop || prop.ownerId !== userId) return json({ error: "Nincs jogosultságod." }, 403);
      const items = (await readJson<any[]>(env, `${AUDIT_PREFIX}${propertyId}.json`)) || [];
      return json({ items });
    }

    // MESSAGES: GET/POST /api/real-estate/properties/:id/messages
    if (propertyId && sub === "messages") {
      const prop = await readJson<any>(env, `${PROPERTY_PREFIX}${propertyId}.json`);
      if (!prop || prop.status === "DELETED") return json({ error: "A hirdetés nem található." }, 404);
      const key = `${MESSAGE_PREFIX}${propertyId}.json`;
      const allMsgs = (await readJson<any[]>(env, key)) || [];

      if (method === "GET") {
        const visible =
          prop.ownerId === userId
            ? allMsgs
            : allMsgs.filter((m) => m.senderId === userId || m.recipientId === userId);
        return json({ items: visible });
      }

      if (method === "POST") {
        let body: any;
        try {
          body = await context.request.json();
        } catch {
          return json({ error: "Érvénytelen üzenet." }, 400);
        }
        const text = safeText(body.body, 2000);
        if (!text) return json({ error: "Az üzenet nem lehet üres." }, 400);

        // Block check + spam & solicitation protection for non-owner senders
        if (prop.ownerId !== userId) {
          const [blocks, modRec] = await Promise.all([
            readJson<string[]>(env, `${BLOCK_PREFIX}${prop.ownerId}.json`),
            getUserModerationRecord(env, userId),
          ]);
          if (Array.isArray(blocks) && blocks.includes(userId)) {
            return json({ error: "Ehhez a hirdetéshez jelenleg nem küldhetsz üzenetet." }, 403);
          }
          if (modRec.restrictionLevel === "suspended" || modRec.restrictionLevel === "extended_restricted") {
            return json({ error: "A fiókod jelenleg korlátozás alatt áll, ezért nem küldhetsz új megkeresést." }, 403);
          }

          // Rate limit + daily cap for new accounts + copy-paste spam detection
          const nowMs = Date.now();
          const actKey = `${MSG_ACTIVITY_PREFIX}${userId}.json`;
          const act = (await readJson<any>(env, actKey)) || { recent: [] };
          const last24h = (Array.isArray(act.recent) ? act.recent : []).filter(
            (e: any) => nowMs - Number(e.ts || 0) < 86_400_000,
          );
          const last10m = last24h.filter((e: any) => nowMs - Number(e.ts || 0) < 600_000);
          if (last10m.length >= 5) {
            await recordSpamSignal(env, {
              userId,
              propertyId,
              signalType: "MESSAGE_RATE_LIMIT",
              details: "Több mint 5 ingatlanos üzenet 10 percen belül.",
              score: 2,
            });
            return json({ error: "Rövid időn belül túl sok üzenetet küldtél. Kérjük, várj pár percet." }, 429);
          }
          if (last24h.length >= 15) {
            await recordSpamSignal(env, {
              userId,
              propertyId,
              signalType: "DAILY_MESSAGE_LIMIT",
              details: "Napi üzenetlimit (15) elérve.",
              score: 3,
            });
            return json({ error: "Elérted a napi ingatlanos üzenetlimitet." }, 429);
          }

          // Copy-paste identical text detection across different listings
          const normText = text.toLocaleLowerCase("hu").replace(/\s+/g, " ").trim();
          const textHash = await sha256Hex(normText);
          const duplicateProperties = new Set(
            last24h
              .filter((e: any) => e.textHash === textHash && e.propertyId !== propertyId)
              .map((e: any) => e.propertyId),
          );
          if (duplicateProperties.size >= 2) {
            await recordSpamSignal(env, {
              userId,
              propertyId,
              signalType: "COPY_PASTE_BULK",
              details: `Azonos üzenetszöveg elküldése ${duplicateProperties.size + 1} különböző ingatlanra 24 órán belül.`,
              score: 4,
            });
            return json(
              { error: "Tömeges, azonos szövegű megkeresések küldése nem engedélyezett. Írj az ingatlanra vonatkozó, egyedi üzenetet." },
              429,
            );
          }

          // Typical solicitation phrases: NEVER auto-ban! Only spam score + moderation queue signal.
          const matchedPhrases = SOLICITATION_SIGNAL_PHRASES.filter((p) => normText.includes(p));
          if (matchedPhrases.length > 0 && (prop.agentInquiryPolicy || "no_agents") === "no_agents") {
            await recordSpamSignal(env, {
              userId,
              propertyId,
              signalType: "SOLICITATION_KEYWORD_SIGNAL",
              details: `Közvetítői megkeresést nem kérő hirdetésnél moderációs jelzés (kulcsszavak: ${matchedPhrases.slice(0, 3).join(", ")}). Automatikus tiltás nem történt.`,
              score: Math.min(5, matchedPhrases.length + 1),
            });
          }

          await writeJson(env, actKey, {
            recent: [...last24h, { ts: nowMs, propertyId, textHash }].slice(-50),
          });
        }

        const recipientId = prop.ownerId === userId ? safeText(body.recipientId, 120) : prop.ownerId;
        if (!recipientId) return json({ error: "Hiányzik a címzett." }, 400);

        const msg = {
          id: crypto.randomUUID(),
          propertyId,
          senderId: userId,
          senderName: safeText(body.senderName, 120) || (prop.ownerId === userId ? prop.ownerName : "Érdeklődő"),
          recipientId,
          body: text,
          createdAt: new Date().toISOString(),
        };
        await writeJson(env, key, [...allMsgs, msg].slice(-500));
        await syncPropertyStats(env, propertyId);
        await pushNotification(env, recipientId, {
          type: "MESSAGE",
          title: "Új ingatlanos üzenet",
          body: `${msg.senderName}: ${text.slice(0, 120)}`,
          propertyId,
        });
        return json(msg, 201);
      }
    }
  }

  // =========================================================================
  // 2. PHONE VERIFICATION (SMS OTP + RATE LIMITS + ANTI-ABUSE)
  // =========================================================================
  if (route[0] === "phone") {
    if (!userId) return json({ error: "A telefonszám-ellenőrzéshez jelentkezz be." }, 401);
    const phoneKey = `${PHONE_PREFIX}${userId}.json`;

    if (method === "GET" && route[1] === "status") {
      const rec = await readJson<any>(env, phoneKey);
      if (!rec) return json({ phoneVerified: false });
      const now = Date.now();
      const lastSent = Array.isArray(rec.smsSentTimestamps) ? rec.smsSentTimestamps[rec.smsSentTimestamps.length - 1] : 0;
      const remainingCooldownSec = lastSent ? Math.max(0, Math.ceil((lastSent + 60_000 - now) / 1000)) : 0;
      return json({
        phoneVerified: rec.phoneVerified === true,
        phoneMasked: rec.phone ? maskPhone(rec.phone) : undefined,
        verifiedAt: rec.verifiedAt,
        lockedUntil: rec.lockedUntil && new Date(rec.lockedUntil).getTime() > now ? rec.lockedUntil : undefined,
        remainingCooldownSec,
      });
    }

    if (method === "POST" && route[1] === "send-otp") {
      let body: any;
      try {
        body = await context.request.json();
      } catch {
        return json({ error: "Érvénytelen kérés." }, 400);
      }
      const normalized = normalizePhone(safeText(body.phone, 30));
      if (!/^\+[1-9]\d{8,14}$/.test(normalized)) {
        return json({ error: "Adj meg érvényes mobiltelefonszámot (pl. +36 30 123 4567)." }, 400);
      }

      const now = Date.now();
      const rec = (await readJson<any>(env, phoneKey)) || {};
      if (rec.lockedUntil && new Date(rec.lockedUntil).getTime() > now) {
        return json({ error: "Túl sok hibás próbálkozás miatt átmenetileg zárolva. Próbáld meg később." }, 429);
      }

      const sentHistory: number[] = (Array.isArray(rec.smsSentTimestamps) ? rec.smsSentTimestamps : []).filter(
        (ts: number) => now - ts < 86_400_000,
      );
      const lastSent = sentHistory[sentHistory.length - 1] || 0;
      if (now - lastSent < 60_000) {
        const wait = Math.ceil((60_000 - (now - lastSent)) / 1000);
        return json({ error: `Kérjük, várj még ${wait} másodpercet az új kód kéréséhez.` }, 429);
      }
      const lastHourCount = sentHistory.filter((ts) => now - ts < 3_600_000).length;
      if (lastHourCount >= 5 || sentHistory.length >= 10) {
        return json({ error: "Elérted az SMS küldési korlátot. Próbáld meg később." }, 429);
      }

      // Anti-abuse: prevent unlimited fake accounts from one phone number (max 2 accounts per phone)
      const phoneHash = await sha256Hex(normalized);
      const indexKey = `${PHONE_INDEX_PREFIX}${phoneHash}.json`;
      const linkedUsers = (await readJson<string[]>(env, indexKey)) || [];
      if (!linkedUsers.includes(userId) && linkedUsers.length >= 2) {
        return json(
          { error: "Ehhez a telefonszámhoz már elérte a rendszer a maximálisan társítható fiókok számát." },
          409,
        );
      }

      const otpArray = new Uint32Array(1);
      crypto.getRandomValues(otpArray);
      const otpCode = String(100000 + (otpArray[0] % 900000));
      const otpHash = await sha256Hex(`${userId}:${normalized}:${otpCode}`);

      const smsSent = await sendTwilioSms(
        env,
        normalized,
        `ILOLIT Ingatlan megerősítő kód: ${otpCode}. A kód 10 percig érvényes.`,
      );

      const nextRecord = {
        userId,
        phone: normalized,
        phoneHash,
        phoneVerified: false,
        otpHash,
        otpExpiresAt: new Date(now + 10 * 60_000).toISOString(),
        otpAttempts: 0,
        smsSentTimestamps: [...sentHistory, now],
        lockedUntil: null,
        updatedAt: new Date(now).toISOString(),
      };
      await writeJson(env, phoneKey, nextRecord);

      return json({
        sent: true,
        phoneMasked: maskPhone(normalized),
        expiresInSeconds: 600,
        deliveryMode: smsSent ? "sms" : "platform_verification",
        verificationPreviewCode: smsSent ? undefined : otpCode,
        message: smsSent
          ? "A 6 jegyű SMS-kódot elküldtük a megadott mobiltelefonszámra."
          : "Az ellenőrző kód elkészült (külső SMS-átjáró még nincs bekötve, ezért a kód ideiglenesen itt látható).",
      });
    }

    if (method === "POST" && route[1] === "verify-otp") {
      let body: any;
      try {
        body = await context.request.json();
      } catch {
        return json({ error: "Érvénytelen kérés." }, 400);
      }
      const code = safeText(body.code, 10).replace(/\s+/g, "");
      if (!/^\d{6}$/.test(code)) {
        return json({ error: "Adj meg érvényes 6 jegyű megerősítő kódot." }, 400);
      }

      const rec = await readJson<any>(env, phoneKey);
      if (!rec || !rec.otpHash) {
        return json({ error: "Nincs aktív ellenőrző kód. Kérj új kódot." }, 400);
      }

      const now = Date.now();
      if (rec.lockedUntil && new Date(rec.lockedUntil).getTime() > now) {
        return json({ error: "Túl sok hibás próbálkozás. Próbáld meg 15 perc múlva." }, 429);
      }
      if (!rec.otpExpiresAt || new Date(rec.otpExpiresAt).getTime() < now) {
        return json({ error: "A kód lejárt. Kérj új megerősítő kódot." }, 400);
      }

      const expectedHash = await sha256Hex(`${userId}:${rec.phone}:${code}`);
      if (expectedHash !== rec.otpHash) {
        const attempts = Number(rec.otpAttempts || 0) + 1;
        rec.otpAttempts = attempts;
        if (attempts >= 5) {
          rec.lockedUntil = new Date(now + 15 * 60_000).toISOString();
          rec.otpHash = null;
        }
        await writeJson(env, phoneKey, rec);
        return json(
          {
            error:
              attempts >= 5
                ? "5 hibás próbálkozás után a megerősítés 15 percre zárolásra került."
                : `Hibás kód. Hátralévő próbálkozások: ${5 - attempts}.`,
          },
          400,
        );
      }

      // Mark phone verified + update phone index
      const verifiedAt = new Date(now).toISOString();
      rec.phoneVerified = true;
      rec.verifiedAt = verifiedAt;
      rec.otpHash = null;
      rec.otpExpiresAt = null;
      rec.otpAttempts = 0;
      rec.lockedUntil = null;
      await writeJson(env, phoneKey, rec);

      const indexKey = `${PHONE_INDEX_PREFIX}${rec.phoneHash}.json`;
      const linkedUsers = (await readJson<string[]>(env, indexKey)) || [];
      if (!linkedUsers.includes(userId)) {
        await writeJson(env, indexKey, [...linkedUsers, userId]);
      }

      return json({
        phoneVerified: true,
        phoneMasked: maskPhone(rec.phone),
        verifiedAt,
      });
    }
  }

  // =========================================================================
  // 3. VIEWING REQUESTS & SERVER-SIDE EXACT ADDRESS REVEAL
  // =========================================================================
  if (route[0] === "viewings") {
    if (!userId) return json({ error: "A megtekintési műveletekhez jelentkezz be." }, 401);

    // GET /api/real-estate/viewings/me
    if (method === "GET" && route[1] === "me") {
      const url = new URL(context.request.url);
      const propertyFilter = url.searchParams.get("propertyId");
      const allViewings = await listAllViewings(env);
      const filtered = allViewings
        .filter((v) => {
          const isOwnerVisible = v.ownerId === userId && !v.hiddenByOwner;
          const isRequesterVisible = v.requesterId === userId && !v.hiddenByRequester;
          if (!isOwnerVisible && !isRequesterVisible) return false;
          if (propertyFilter && v.propertyId !== propertyFilter) return false;
          return true;
        })
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

      const items = await Promise.all(
        filtered.map(async (v) => {
          // Privacy: never expose buyer's phone number, phone hash, or raw SafeVisit secrets
          const { requesterPhoneMasked: _omit, requesterPhoneHash: _omitHash, safeVisit: rawSv, ...safeViewing } = v;
          const isOwner = v.ownerId === userId;
          const trustProfile = isOwner
            ? await buildRequesterTrustProfile(env, v.requesterId, v, allViewings)
            : undefined;
          let testVerificationPreviewCode: string | undefined;
          if (
            isOwner &&
            String(v.requesterId || "").startsWith("test_requester_") &&
            rawSv?.codeStatus === "ACTIVE" &&
            rawSv?.encryptedCode
          ) {
            testVerificationPreviewCode = (await decryptSafeVisitSecret(env, rawSv.encryptedCode)) || undefined;
          }
          return enrichViewingReminders({
            ...safeViewing,
            safeVisit: sanitizeSafeVisitForList(rawSv),
            testVerificationPreviewCode,
            role: isOwner ? "owner" : "requester",
            requesterTrustProfile: trustProfile,
          });
        }),
      );
      return json({ items, total: items.length });
    }

    // POST /api/real-estate/viewings (Requester submits PENDING viewing request)
    if (method === "POST" && route.length === 1) {
      let body: any;
      try {
        body = await context.request.json();
      } catch {
        return json({ error: "Érvénytelen foglalási adat." }, 400);
      }

      const propertyId = safeText(body.propertyId, 120);
      const slotId = safeText(body.slotId, 120);
      const requesterName = safeText(body.requesterName, 120);
      const message = safeText(body.message, 1000);
      const viewingPurpose = safeText(body.viewingPurpose, 40);
      const declarationAccepted = body.declarationAccepted === true;
      const declarationPurposeAccepted = body.declarationPurposeAccepted === true;
      const declarationOwnerRuleAccepted = body.declarationOwnerRuleAccepted === true;
      const declarationLegalConsequencesAccepted = body.declarationLegalConsequencesAccepted === true;
      const legalNoticeViewed = body.legalNoticeViewed === true;
      const photoIdDeclarationAccepted = body.photoIdDeclarationAccepted === true;
      const companionsCountRaw =
        body.companionsCount !== undefined && body.companionsCount !== null && body.companionsCount !== ""
          ? Number(body.companionsCount)
          : undefined;
      const companionsCount =
        companionsCountRaw !== undefined && Number.isInteger(companionsCountRaw) && companionsCountRaw >= 0 && companionsCountRaw <= 10
          ? companionsCountRaw
          : undefined;
      const declarationVersion = safeText(body.declarationVersion, 30) || "2026-11-v3-safevisit";
      const requesterEmailVerified = body.requesterEmailVerified !== false;
      const requesterProfileComplete =
        body.requesterProfileComplete !== undefined
          ? body.requesterProfileComplete === true
          : requesterName.trim().length >= 3;
      const requesterAccountCreatedAt = safeText(body.requesterAccountCreatedAt, 40) || undefined;

      if (!propertyId || !slotId || !requesterName) {
        return json({ error: "Az ingatlan, az időpont és a neved megadása kötelező." }, 400);
      }
      if (!ALLOWED_VIEWING_PURPOSES.has(viewingPurpose)) {
        return json({ error: "Kérjük, jelöld meg, milyen célból szeretnéd megtekinteni az ingatlant." }, 400);
      }
      if (!declarationAccepted) {
        return json(
          { error: "A megtekintési kérelem elküldéséhez el kell fogadnod a valódi érdeklődésről szóló nyilatkozatot." },
          400,
        );
      }

      // Check gradual moderation status (NEVER triggered automatically by a single report)
      const modRec = await getUserModerationRecord(env, userId);
      if (
        modRec.restrictionLevel === "temp_restricted" ||
        modRec.restrictionLevel === "extended_restricted" ||
        modRec.restrictionLevel === "suspended"
      ) {
        return json(
          {
            error:
              modRec.restrictionLevel === "suspended"
                ? "A fiókod felfüggesztés alatt áll, ezért nem küldhetsz új megtekintési kérelmet."
                : "A fiókod ideiglenes foglalási korlátozás alatt áll.",
          },
          403,
        );
      }

      // Mandatory server-side check: SMS-verified phone required
      const phoneRec = await readJson<any>(env, `${PHONE_PREFIX}${userId}.json`);
      if (!phoneRec?.phoneVerified) {
        return json(
          { error: "A megtekintési kérelemhez előbb igazold mobiltelefonszámodat SMS-kóddal." },
          403,
        );
      }

      const rawProp = await readJson<any>(env, `${PROPERTY_PREFIX}${propertyId}.json`);
      const prop = await enforceExpirationIfNeeded(env, rawProp);
      if (!prop || prop.status === "DELETED") {
        return json({ error: "Az ingatlanhirdetés nem található." }, 404);
      }
      if (prop.ownerId === userId) {
        return json({ error: "A saját hirdetésedre nem küldhetsz megtekintési kérelmet." }, 409);
      }
      if (prop.status !== "ACTIVE") {
        return json(
          { error: "Erre az ingatlanra jelenleg nem kérhető megtekintés (inaktív, eladva vagy kiadva)." },
          409,
        );
      }

      // Enforce transaction-type specific viewing purpose consistency
      if (prop.transactionType === "sale" && viewingPurpose === "own_rent") {
        return json({ error: "Eladó ingatlannál nem választható bérleti cél." }, 400);
      }
      if (prop.transactionType === "rent" && viewingPurpose === "own_purchase") {
        return json({ error: "Kiadó ingatlannál nem választható vásárlási cél." }, 400);
      }

      // Enforce seller's agent inquiry policy & mandatory 3-part legal declaration when no_agents
      const agentPolicy = prop.agentInquiryPolicy === "allow_agents" ? "allow_agents" : "no_agents";
      if (agentPolicy === "no_agents" && viewingPurpose === "real_estate_agent") {
        return json(
          { error: "A hirdető ehhez az ingatlanhoz nem fogad ingatlanközvetítői megkeresést." },
          403,
        );
      }
      if (
        agentPolicy === "no_agents" &&
        (!declarationPurposeAccepted || !declarationOwnerRuleAccepted || !declarationLegalConsequencesAccepted)
      ) {
        return json(
          {
            error:
              "A megtekintési kérelem elküldéséhez mindhárom kötelező jogi nyilatkozat elfogadása szükséges.",
          },
          400,
        );
      }

      // Enforce SafeVisit conditions configured by the owner
      const svSettings = normalizeSafeVisitSettings(prop.safeVisitSettings);
      if (svSettings.requirePhotoIdOnArrival && !photoIdDeclarationAccepted) {
        return json(
          {
            error:
              "A megtekintési kérelem elküldéséhez el kell fogadnod a fényképes igazolvány érkezéskori bemutatására vonatkozó feltételt.",
          },
          400,
        );
      }
      if (svSettings.requireCompanionsDisclosure && companionsCount === undefined) {
        return json(
          {
            error:
              "A hirdető kérte a kísérők előzetes bejelentését. Kérjük, add meg, hány kísérővel érkezel (0, ha egyedül).",
          },
          400,
        );
      }

      // Optional "Csak ellenőrzött érdeklődők" gate
      if (prop.verifiedBuyersOnly === true) {
        if (!requesterEmailVerified || !requesterProfileComplete) {
          return json(
            {
              error:
                "A hirdető ennél az ingatlannál csak ellenőrzött érdeklődők (ellenőrzött telefon, ellenőrzött e-mail és teljes profil) számára engedélyezi a megtekintést.",
            },
            403,
          );
        }
      }

      // Block check
      const ownerBlocks = (await readJson<string[]>(env, `${BLOCK_PREFIX}${prop.ownerId}.json`)) || [];
      if (ownerBlocks.includes(userId)) {
        await appendAudit(env, propertyId, {
          action: "SUSPICIOUS_ACTIVITY",
          actorId: userId,
          details: "Tiltott felhasználó megtekintési kérelmet próbált küldeni.",
        });
        return json({ error: "Ehhez a hirdetéshez jelenleg nem küldhetsz megtekintési kérelmet." }, 403);
      }

      const slot = (Array.isArray(prop.viewingSlots) ? prop.viewingSlots : []).find(
        (s: any) => s.id === slotId && !s.isBlocked,
      );
      if (!slot) {
        return json({ error: "A kiválasztott időpont már nem elérhető." }, 409);
      }
      const todayIso = new Date().toISOString().slice(0, 10);
      if (slot.date < todayIso) {
        return json({ error: "Múltbeli időpontra nem küldhető kérelem." }, 400);
      }

      const allViewings = await listAllViewings(env);

      // Rate limit: max 5 viewing requests per hour per user
      const oneHourAgo = Date.now() - 3_600_000;
      const recentByUser = allViewings.filter(
        (v) => v.requesterId === userId && new Date(v.createdAt).getTime() > oneHourAgo,
      );
      if (recentByUser.length >= 5) {
        await appendAudit(env, propertyId, {
          action: "SUSPICIOUS_ACTIVITY",
          actorId: userId,
          details: "Időpontfoglalási rate limit túllépés (5 kérelem / óra).",
        });
        return json({ error: "Óránként legfeljebb 5 megtekintési kérelmet küldhetsz." }, 429);
      }

      // Strict rule: a buyer can only request a viewing ONCE per property (checked by userId and verified phone hash)
      const existingRequest = allViewings.find(
        (v) =>
          v.propertyId === propertyId &&
          (v.requesterId === userId ||
            (phoneRec.phoneHash && v.requesterPhoneHash && v.requesterPhoneHash === phoneRec.phoneHash)),
      );
      if (existingRequest) {
        return json(
          {
            error:
              "Erre az ingatlanra már küldtél megtekintési kérelmet. Egy adott ingatlanra egy vevő csak egyszer kérhet időpontot.",
          },
          409,
        );
      }

      // Prevent slot double-booking
      const slotTaken = allViewings.some(
        (v) => v.propertyId === propertyId && v.slotId === slotId && (v.status === "PENDING" || v.status === "APPROVED"),
      );
      if (slotTaken) {
        return json({ error: "Ezt az időpontot időközben lefoglalták. Kérjük, válassz másikat." }, 409);
      }

      // Mild new-account abuse protection (does not hinder normal buyers)
      const isFreshAccount =
        requesterAccountCreatedAt &&
        Date.now() - new Date(requesterAccountCreatedAt).getTime() < 7 * 86_400_000;
      const activePendingByUser = allViewings.filter(
        (v) => v.requesterId === userId && v.status === "PENDING",
      );
      if (isFreshAccount && activePendingByUser.length >= 4) {
        await recordSpamSignal(env, {
          userId,
          propertyId,
          signalType: "FRESH_ACCOUNT_CONCURRENT_VIEWINGS",
          details: `Új fiók egyszerre ${activePendingByUser.length} függőben lévő megtekintési kérelemmel rendelkezik.`,
          score: 2,
        });
        return json(
          { error: "Új fiókkal egyszerre legfeljebb 4 függőben lévő megtekintési kérelmed lehet." },
          429,
        );
      }

      // Phone-hash risk flagging (NEVER auto-ban on a single technical signal)
      if (phoneRec.phoneHash) {
        const linkedUsers = (await readJson<string[]>(env, `${PHONE_INDEX_PREFIX}${phoneRec.phoneHash}.json`)) || [];
        if (linkedUsers.length > 1) {
          const linkedModRecords = await Promise.all(linkedUsers.map((uid) => getUserModerationRecord(env, uid)));
          const hasRestrictedSibling = linkedModRecords.some(
            (r) => r.userId !== userId && r.restrictionLevel !== "none",
          );
          if (hasRestrictedSibling) {
            modRec.phoneRiskFlag = true;
            modRec.updatedAt = new Date().toISOString();
            await writeJson(env, `${MODERATION_USER_PREFIX}${userId}.json`, modRec);
            await recordSpamSignal(env, {
              userId,
              propertyId,
              signalType: "PHONE_LINKED_TO_RESTRICTED_ACCOUNT",
              details: "A telefonszám korábban korlátozott fiókhoz is kapcsolódott (csak moderációs jelzés, nincs automatikus tiltás).",
              score: 3,
            });
          }
        }
      }

      const now = new Date().toISOString();
      const rawIp = context.request.headers.get("CF-Connecting-IP") || "";
      const ipHash = rawIp ? await sha256Hex(`ilolit-decl:${rawIp}`) : undefined;
      const uaShort = safeText(context.request.headers.get("User-Agent"), 120) || undefined;

      const viewing = {
        id: crypto.randomUUID(),
        propertyId,
        propertyTitle: prop.title,
        propertyPublicLocation: formatPublicLocationString(prop.publicLocation),
        propertyCoverImage: prop.photos?.[0]?.url || "",
        propertyPrice: Number(prop.price || 0),
        propertyTransactionType: prop.transactionType,
        ownerId: prop.ownerId,
        ownerName: prop.ownerName || "ILOLIT hirdető",
        requesterId: userId,
        requesterName,
        requesterPhoneVerified: true,
        requesterEmailVerified,
        requesterProfileComplete,
        requesterAccountCreatedAt,
        requesterPhoneHash: phoneRec.phoneHash || undefined,
        viewingPurpose,
        companionsCount,
        declarationLog: {
          version: declarationVersion,
          acceptedAt: now,
          purpose: viewingPurpose,
          purposeAccepted: declarationPurposeAccepted || declarationAccepted,
          ownerRuleAccepted: declarationOwnerRuleAccepted,
          legalConsequencesAccepted: declarationLegalConsequencesAccepted,
          legalNoticeViewed,
          photoIdDeclarationAccepted: svSettings.requirePhotoIdOnArrival ? photoIdDeclarationAccepted : undefined,
        },
        slotId: slot.id,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        durationMinutes: slot.durationMinutes,
        message: message || undefined,
        status: "PENDING",
        reminder24hEnabled: body.reminder24hEnabled !== false,
        reminder2hEnabled: body.reminder2hEnabled !== false,
        createdAt: now,
        updatedAt: now,
      };

      await writeJson(env, `${VIEWING_PREFIX}${viewing.id}.json`, viewing, {
        propertyId,
        ownerId: prop.ownerId,
        requesterId: userId,
      });

      // Persist immutable declaration log record for dispute/abuse verification
      await writeJson(env, `${DECLARATION_PREFIX}${viewing.id}.json`, {
        id: viewing.id,
        userId,
        listingId: propertyId,
        viewingId: viewing.id,
        acceptedAt: now,
        viewingPurpose,
        companionsCount,
        declarationVersion,
        purposeAccepted: declarationPurposeAccepted || declarationAccepted,
        ownerRuleAccepted: declarationOwnerRuleAccepted,
        legalConsequencesAccepted: declarationLegalConsequencesAccepted,
        legalNoticeViewed,
        photoIdDeclarationAccepted: svSettings.requirePhotoIdOnArrival ? photoIdDeclarationAccepted : undefined,
        ipHash,
        sessionMeta: uaShort,
      });

      await Promise.all([
        syncPropertyStats(env, propertyId),
        appendAudit(env, propertyId, {
          action: "VIEWING_REQUESTED",
          actorId: userId,
          actorName: requesterName,
          viewingId: viewing.id,
          slotSummary: `${slot.date} ${slot.startTime}-${slot.endTime}`,
          details: "Megtekintési kérelem beküldve (ellenőrzött telefonszámmal).",
        }),
        pushNotification(env, prop.ownerId, {
          type: "VIEWING_REQUEST",
          title: "Új megtekintési kérelem érkezett",
          body: `${requesterName} időpontot kért a(z) „${prop.title}” ingatlanra (${slot.date} ${slot.startTime}).`,
          propertyId,
          viewingId: viewing.id,
        }),
      ]);

      const { requesterPhoneHash: _stripHash, ...publicViewingResponse } = viewing;
      return json(publicViewingResponse, 201);
    }

    const viewingId = route[1];
    const action = route[2];

    // GET /api/real-estate/viewings/:id/details — STRICT SERVER-SIDE EXACT ADDRESS GATE
    if (method === "GET" && viewingId && action === "details") {
      const viewing = await readJson<any>(env, `${VIEWING_PREFIX}${viewingId}.json`);
      if (!viewing) return json({ error: "A megtekintés nem található." }, 404);

      const isOwner = viewing.ownerId === userId;
      const isRequester = viewing.requesterId === userId;
      if (!isOwner && !isRequester) {
        return json({ error: "Ehhez a megtekintéshez nincs hozzáférésed." }, 403);
      }

      if (viewing.status !== "APPROVED") {
        return json(
          { error: "A pontos cím kizárólag a hirdető által jóváhagyott megtekintés esetén érhető el." },
          403,
        );
      }

      if (isRequester) {
        const phoneRec = await readJson<any>(env, `${PHONE_PREFIX}${userId}.json`);
        if (!phoneRec?.phoneVerified) {
          return json({ error: "Ellenőrzött mobiltelefonszám szükséges a pontos cím megtekintéséhez." }, 403);
        }
      }

      const prop = await readJson<any>(env, `${PROPERTY_PREFIX}${viewing.propertyId}.json`);
      if (!prop || prop.status === "DELETED") {
        return json({ error: "Az ingatlan már nem érhető el." }, 404);
      }

      let safeVisitPass: any = null;
      const svSettings = normalizeSafeVisitSettings(prop.safeVisitSettings);
      if (isRequester && svSettings.enableSafeVisitCode) {
        // Lazily provision SafeVisit code for pre-existing approved bookings that predate SafeVisit
        if (!viewing.safeVisit) {
          const creds = await createSafeVisitCredentials(env, {
            viewingId: viewing.id,
            date: viewing.date,
            startTime: viewing.startTime,
            endTime: viewing.endTime,
            idCheckRequired: svSettings.requirePhotoIdOnArrival,
          });
          viewing.safeVisit = creds.record;
          await writeJson(env, `${VIEWING_PREFIX}${viewingId}.json`, viewing);
        }
        const sv = viewing.safeVisit;
        const [plainCode, plainQrToken] = await Promise.all([
          sv.codeStatus === "ACTIVE" ? decryptSafeVisitSecret(env, sv.encryptedCode) : Promise.resolve(null),
          sv.codeStatus === "ACTIVE" ? decryptSafeVisitSecret(env, sv.encryptedQrToken) : Promise.resolve(null),
        ]);
        safeVisitPass = {
          code: plainCode,
          qrToken: plainQrToken,
          codeStatus: sv.codeStatus,
          validFrom: sv.validFrom,
          validUntil: sv.validUntil,
          visitStage: sv.visitStage,
          requesterName: viewing.requesterName,
          phoneVerified: Boolean(viewing.requesterPhoneVerified),
          declarationsAccepted: Boolean(viewing.declarationLog?.purposeAccepted || viewing.declarationLog?.acceptedAt),
          agentExclusionAccepted: Boolean(viewing.declarationLog?.ownerRuleAccepted),
          photoIdRequired: Boolean(sv.idCheckRequired || svSettings.requirePhotoIdOnArrival),
          companionsRequired: svSettings.requireCompanionsDisclosure,
          companionsCount: viewing.companionsCount,
        };
      }

      if (isRequester) {
        await appendAudit(env, viewing.propertyId, {
          action: "ADDRESS_ACCESSED",
          actorId: userId,
          actorName: viewing.requesterName,
          viewingId: viewing.id,
          slotSummary: `${viewing.date} ${viewing.startTime}-${viewing.endTime}`,
          details: "A jóváhagyott érdeklődő megnyitotta a pontos címet és a megtekintési igazolványt.",
        });
      }

      return json({
        viewingId: viewing.id,
        propertyId: prop.id,
        propertyTitle: prop.title,
        date: viewing.date,
        startTime: viewing.startTime,
        endTime: viewing.endTime,
        durationMinutes: viewing.durationMinutes,
        exactAddress: prop.exactAddress,
        ownerName: prop.ownerName || "ILOLIT hirdető",
        ownerPhone:
          prop.ownerPhoneShareMode === "approved_only" && prop.ownerPhone
            ? prop.ownerPhone
            : null,
        approvedAt: viewing.approvedAt,
        addressUnlockedAt: viewing.addressUnlockedAt,
        safeVisitPass,
      });
    }

    // PATCH /api/real-estate/viewings/:id/respond (Owner: APPROVE, PROPOSE_NEW_TIME, REJECT, REVOKE)
    if (method === "PATCH" && viewingId && action === "respond") {
      const viewing = await readJson<any>(env, `${VIEWING_PREFIX}${viewingId}.json`);
      if (!viewing || viewing.ownerId !== userId) {
        return json({ error: "A megtekintési kérelem nem található." }, 404);
      }
      let body: any;
      try {
        body = await context.request.json();
      } catch {
        return json({ error: "Érvénytelen válasz." }, 400);
      }

      const ownerAction = safeText(body.action, 30);
      const note = safeText(body.note, 800);
      const now = new Date().toISOString();

      if (ownerAction === "APPROVE") {
        if (viewing.status !== "PENDING") {
          return json({ error: "Csak függőben lévő kérelem hagyható jóvá." }, 409);
        }
        // Re-verify requester's phone on server before unlocking address
        const [phoneRec, prop] = await Promise.all([
          readJson<any>(env, `${PHONE_PREFIX}${viewing.requesterId}.json`),
          readJson<any>(env, `${PROPERTY_PREFIX}${viewing.propertyId}.json`),
        ]);
        if (!phoneRec?.phoneVerified) {
          return json({ error: "Az érdeklődő telefonszáma nincs ellenőrizve." }, 409);
        }
        const svSettings = normalizeSafeVisitSettings(prop?.safeVisitSettings);
        let testPreviewCode: string | undefined;
        if (svSettings.enableSafeVisitCode) {
          const creds = await createSafeVisitCredentials(env, {
            viewingId: viewing.id,
            date: viewing.date,
            startTime: viewing.startTime,
            endTime: viewing.endTime,
            idCheckRequired: svSettings.requirePhotoIdOnArrival,
          });
          viewing.safeVisit = creds.record;
          if (String(viewing.requesterId || "").startsWith("test_requester_")) {
            testPreviewCode = creds.plainCode;
          }
        }
        viewing.status = "APPROVED";
        viewing.approvedAt = now;
        viewing.addressUnlockedAt = now;
        viewing.ownerResponseNote = note || undefined;
        viewing.updatedAt = now;
        await writeJson(env, `${VIEWING_PREFIX}${viewingId}.json`, viewing);

        await Promise.all([
          syncPropertyStats(env, viewing.propertyId),
          appendAudit(env, viewing.propertyId, {
            action: "VIEWING_APPROVED",
            actorId: userId,
            targetUserId: viewing.requesterId,
            viewingId: viewing.id,
            slotSummary: `${viewing.date} ${viewing.startTime}-${viewing.endTime}`,
            details: "Hirdető jóváhagyta a megtekintést; egyedi SafeVisit megtekintési kód legenerálva.",
          }),
          appendAudit(env, viewing.propertyId, {
            action: "ADDRESS_UNLOCKED",
            actorId: userId,
            targetUserId: viewing.requesterId,
            viewingId: viewing.id,
            slotSummary: `${viewing.date} ${viewing.startTime}-${viewing.endTime}`,
            details: "A pontos cím jogosultsága megnyílt az ellenőrzött érdeklődő számára.",
          }),
          // Privacy-by-design: lock-screen push NEVER includes exact street address or 6-digit code
          pushNotification(env, viewing.requesterId, {
            type: "VIEWING_APPROVED",
            title: "Ingatlanmegtekintésed visszaigazolva!",
            body: "A hirdető jóváhagyta megtekintési kérelmedet. A pontos helyszín, az időpont és az egyedi megtekintési kód a Fiókom menüpontban érhető el.",
            propertyId: viewing.propertyId,
            viewingId: viewing.id,
            listingTitle: viewing.propertyTitle,
            coverImage: viewing.propertyCoverImage,
            date: viewing.date,
            startTime: viewing.startTime,
            shortLocation: viewing.propertyPublicLocation,
            popupRequired: true,
            pushTitle: "Ingatlanmegtekintésed visszaigazolva!",
            pushBody:
              "A hirdető jóváhagyta megtekintési kérelmedet. A pontos helyszín, az időpont és az egyedi megtekintési kód a Fiókom menüpontban érhető el.",
          }),
        ]);
        const { safeVisit: rawSv, requesterPhoneHash: _h, ...safeResp } = viewing;
        return json(
          enrichViewingReminders({
            ...safeResp,
            safeVisit: sanitizeSafeVisitForList(rawSv),
            testVerificationPreviewCode: testPreviewCode,
            role: "owner",
          }),
        );
      }

      if (ownerAction === "PROPOSE_NEW_TIME") {
        if (viewing.status !== "PENDING" && viewing.status !== "APPROVED") {
          return json({ error: "Erre a kérelemre nem javasolható új időpont." }, 409);
        }
        const proposedDate = safeText(body.proposedDate, 10);
        const proposedStartTime = safeText(body.proposedStartTime, 5);
        const proposedDur = Math.max(10, Math.min(240, Math.round(Number(body.proposedDurationMinutes) || viewing.durationMinutes || 30)));
        if (!/^\d{4}-\d{2}-\d{2}$/.test(proposedDate) || !/^\d{2}:\d{2}$/.test(proposedStartTime)) {
          return json({ error: "Adj meg érvényes javasolt dátumot és kezdési időpontot." }, 400);
        }
        viewing.status = "PROPOSED_NEW_TIME";
        viewing.proposedDate = proposedDate;
        viewing.proposedStartTime = proposedStartTime;
        viewing.proposedEndTime = addMinutes(proposedStartTime, proposedDur);
        viewing.proposedNote = note || undefined;
        viewing.approvedAt = undefined;
        viewing.addressUnlockedAt = undefined;
        if (viewing.safeVisit) {
          viewing.safeVisit.codeStatus = "INVALIDATED";
          viewing.safeVisit.invalidatedAt = now;
        }
        viewing.updatedAt = now;
        await writeJson(env, `${VIEWING_PREFIX}${viewingId}.json`, viewing);

        await Promise.all([
          syncPropertyStats(env, viewing.propertyId),
          appendAudit(env, viewing.propertyId, {
            action: "VIEWING_PROPOSED_NEW_TIME",
            actorId: userId,
            targetUserId: viewing.requesterId,
            viewingId: viewing.id,
            slotSummary: `${proposedDate} ${proposedStartTime}-${viewing.proposedEndTime}`,
            details: note || "A hirdető másik időpontot ajánlott.",
          }),
          pushNotification(env, viewing.requesterId, {
            type: "VIEWING_PROPOSED",
            title: "Új időpont elfogadásra vár",
            body: `A hirdető másik időpontot javasolt a(z) „${viewing.propertyTitle}” megtekintésére: ${proposedDate} ${proposedStartTime}.`,
            propertyId: viewing.propertyId,
            viewingId: viewing.id,
            listingTitle: viewing.propertyTitle,
            coverImage: viewing.propertyCoverImage,
            date: proposedDate,
            startTime: proposedStartTime,
            shortLocation: viewing.propertyPublicLocation,
            popupRequired: true,
            pushTitle: "Új időpont elfogadásra vár",
            pushBody: `A hirdető másik megtekintési időpontot javasolt (${proposedDate} ${proposedStartTime}). Koppints az elfogadáshoz.`,
          }),
        ]);
        const { safeVisit: rawSv, requesterPhoneHash: _h, ...safeResp } = viewing;
        return json(enrichViewingReminders({ ...safeResp, safeVisit: sanitizeSafeVisitForList(rawSv), role: "owner" }));
      }

      if (ownerAction === "REJECT") {
        if (viewing.status !== "PENDING") {
          return json({ error: "Csak függőben lévő kérelem utasítható el." }, 409);
        }
        viewing.status = "REJECTED";
        viewing.ownerResponseNote = note || undefined;
        if (viewing.safeVisit) {
          viewing.safeVisit.codeStatus = "INVALIDATED";
          viewing.safeVisit.invalidatedAt = now;
        }
        viewing.updatedAt = now;
        await writeJson(env, `${VIEWING_PREFIX}${viewingId}.json`, viewing);

        await Promise.all([
          syncPropertyStats(env, viewing.propertyId),
          appendAudit(env, viewing.propertyId, {
            action: "VIEWING_REJECTED",
            actorId: userId,
            targetUserId: viewing.requesterId,
            viewingId: viewing.id,
            slotSummary: `${viewing.date} ${viewing.startTime}-${viewing.endTime}`,
            details: note || "Hirdető elutasította a kérelmet.",
          }),
          pushNotification(env, viewing.requesterId, {
            type: "VIEWING_REJECTED",
            title: "Megtekintési kérelem elutasítva",
            body: `A hirdető nem tudta elfogadni a(z) ${viewing.date} ${viewing.startTime} időpontot (${viewing.propertyTitle}).`,
            propertyId: viewing.propertyId,
            viewingId: viewing.id,
            listingTitle: viewing.propertyTitle,
            coverImage: viewing.propertyCoverImage,
            date: viewing.date,
            startTime: viewing.startTime,
            shortLocation: viewing.propertyPublicLocation,
            popupRequired: true,
          }),
        ]);
        const { safeVisit: rawSv, requesterPhoneHash: _h, ...safeResp } = viewing;
        return json(enrichViewingReminders({ ...safeResp, safeVisit: sanitizeSafeVisitForList(rawSv), role: "owner" }));
      }

      if (ownerAction === "REVOKE") {
        if (viewing.status !== "APPROVED") {
          return json({ error: "Csak jóváhagyott megtekintés vonható vissza." }, 409);
        }
        viewing.status = "REVOKED_BY_OWNER";
        viewing.ownerResponseNote = note || "A hirdető visszavonta a megtekintés jóváhagyását.";
        if (viewing.safeVisit) {
          viewing.safeVisit.codeStatus = "INVALIDATED";
          viewing.safeVisit.invalidatedAt = now;
        }
        viewing.updatedAt = now;
        await writeJson(env, `${VIEWING_PREFIX}${viewingId}.json`, viewing);

        await Promise.all([
          syncPropertyStats(env, viewing.propertyId),
          appendAudit(env, viewing.propertyId, {
            action: "VIEWING_REVOKED_BY_OWNER",
            actorId: userId,
            targetUserId: viewing.requesterId,
            viewingId: viewing.id,
            slotSummary: `${viewing.date} ${viewing.startTime}-${viewing.endTime}`,
            details: note || "Hirdető visszavonta a jóváhagyást; a pontos cím és a megtekintési kód érvénytelenítve lett.",
          }),
          pushNotification(env, viewing.requesterId, {
            type: "VIEWING_REVOKED",
            title: "Megtekintés lemondva",
            body: `A hirdető lemondta a(z) ${viewing.date} ${viewing.startTime} megtekintést (${viewing.propertyTitle}).`,
            propertyId: viewing.propertyId,
            viewingId: viewing.id,
            listingTitle: viewing.propertyTitle,
            coverImage: viewing.propertyCoverImage,
            date: viewing.date,
            startTime: viewing.startTime,
            shortLocation: viewing.propertyPublicLocation,
            popupRequired: true,
          }),
        ]);
        const { safeVisit: rawSv, requesterPhoneHash: _h, ...safeResp } = viewing;
        return json(enrichViewingReminders({ ...safeResp, safeVisit: sanitizeSafeVisitForList(rawSv), role: "owner" }));
      }

      return json({ error: "Érvénytelen művelet." }, 400);
    }

    // PATCH /api/real-estate/viewings/:id/accept-proposal (Requester accepts proposed new time)
    if (method === "PATCH" && viewingId && action === "accept-proposal") {
      const viewing = await readJson<any>(env, `${VIEWING_PREFIX}${viewingId}.json`);
      if (!viewing || viewing.requesterId !== userId) {
        return json({ error: "A megtekintés nem található." }, 404);
      }
      if (viewing.status !== "PROPOSED_NEW_TIME" || !viewing.proposedDate || !viewing.proposedStartTime) {
        return json({ error: "Nincs elfogadható új időpont-javaslat." }, 409);
      }
      const [phoneRec, prop] = await Promise.all([
        readJson<any>(env, `${PHONE_PREFIX}${userId}.json`),
        readJson<any>(env, `${PROPERTY_PREFIX}${viewing.propertyId}.json`),
      ]);
      if (!phoneRec?.phoneVerified) {
        return json({ error: "Ellenőrzött telefonszám szükséges." }, 403);
      }

      const now = new Date().toISOString();
      viewing.date = viewing.proposedDate;
      viewing.startTime = viewing.proposedStartTime;
      viewing.endTime = viewing.proposedEndTime || addMinutes(viewing.proposedStartTime, viewing.durationMinutes || 30);
      viewing.status = "APPROVED";
      viewing.approvedAt = now;
      viewing.addressUnlockedAt = now;
      const svSettings = normalizeSafeVisitSettings(prop?.safeVisitSettings);
      if (svSettings.enableSafeVisitCode) {
        const creds = await createSafeVisitCredentials(env, {
          viewingId: viewing.id,
          date: viewing.date,
          startTime: viewing.startTime,
          endTime: viewing.endTime,
          idCheckRequired: svSettings.requirePhotoIdOnArrival,
        });
        viewing.safeVisit = creds.record;
      }
      viewing.updatedAt = now;
      await writeJson(env, `${VIEWING_PREFIX}${viewingId}.json`, viewing);

      await Promise.all([
        syncPropertyStats(env, viewing.propertyId),
        appendAudit(env, viewing.propertyId, {
          action: "VIEWING_APPROVED",
          actorId: userId,
          actorName: viewing.requesterName,
          viewingId: viewing.id,
          slotSummary: `${viewing.date} ${viewing.startTime}-${viewing.endTime}`,
          details: "Az érdeklődő elfogadta a hirdető által javasolt új időpontot; új SafeVisit kód generálva.",
        }),
        pushNotification(env, viewing.ownerId, {
          type: "VIEWING_APPROVED",
          title: "Új időpont elfogadva",
          body: `${viewing.requesterName} elfogadta a javasolt időpontot (${viewing.date} ${viewing.startTime}).`,
          propertyId: viewing.propertyId,
          viewingId: viewing.id,
        }),
      ]);

      const { safeVisit: rawSv, requesterPhoneHash: _h, ...safeResp } = viewing;
      return json(enrichViewingReminders({ ...safeResp, safeVisit: sanitizeSafeVisitForList(rawSv), role: "requester" }));
    }

    // PATCH /api/real-estate/viewings/:id/cancel (Requester cancels; frees slot automatically & invalidates code)
    if (method === "PATCH" && viewingId && action === "cancel") {
      const viewing = await readJson<any>(env, `${VIEWING_PREFIX}${viewingId}.json`);
      if (!viewing || viewing.requesterId !== userId) {
        return json({ error: "A megtekintés nem található." }, 404);
      }
      if (!["PENDING", "APPROVED", "PROPOSED_NEW_TIME"].includes(viewing.status)) {
        return json({ error: "Ez a megtekintés már lezárult." }, 409);
      }

      const now = new Date().toISOString();
      viewing.status = "CANCELLED_BY_REQUESTER";
      if (viewing.safeVisit) {
        viewing.safeVisit.codeStatus = "INVALIDATED";
        viewing.safeVisit.invalidatedAt = now;
      }
      viewing.updatedAt = now;
      await writeJson(env, `${VIEWING_PREFIX}${viewingId}.json`, viewing);

      await Promise.all([
        syncPropertyStats(env, viewing.propertyId),
        appendAudit(env, viewing.propertyId, {
          action: "VIEWING_CANCELLED_BY_REQUESTER",
          actorId: userId,
          actorName: viewing.requesterName,
          viewingId: viewing.id,
          slotSummary: `${viewing.date} ${viewing.startTime}-${viewing.endTime}`,
          details: "Az érdeklődő lemondta a megtekintést; az idősáv felszabadult és a megtekintési kód érvénytelenítve lett.",
        }),
        pushNotification(env, viewing.ownerId, {
          type: "VIEWING_CANCELLED",
          title: "Megtekintés lemondva",
          body: `${viewing.requesterName} lemondta a(z) ${viewing.date} ${viewing.startTime} időpontot (${viewing.propertyTitle}). Az időpont felszabadult.`,
          propertyId: viewing.propertyId,
          viewingId: viewing.id,
        }),
      ]);

      const { safeVisit: rawSv, requesterPhoneHash: _h, ...safeResp } = viewing;
      return json(enrichViewingReminders({ ...safeResp, safeVisit: sanitizeSafeVisitForList(rawSv), role: "requester" }));
    }

    // =========================================================================
    // ILOLIT SAFEVISIT — OWNER ON-SITE VERIFICATION, ID CHECK, ARRIVAL & OUTCOME
    // =========================================================================

    // POST /api/real-estate/viewings/:id/verify-code (Atomic single-use verification by owner)
    if (method === "POST" && viewingId && action === "verify-code") {
      const viewingKey = `${VIEWING_PREFIX}${viewingId}.json`;
      const obj = await env.MEDIA_BUCKET.get(viewingKey);
      if (!obj) return json({ error: "A megtekintés nem található." }, 404);
      let viewing: any;
      try {
        viewing = await obj.json();
      } catch {
        return json({ error: "A megtekintés adatai nem olvashatók." }, 500);
      }
      if (!viewing || viewing.ownerId !== userId) {
        return json({ error: "Csak a hirdető ellenőrizheti a megtekintési kódot." }, 403);
      }

      const body = await context.request.json<any>().catch(() => ({}));
      const rawCode = safeText(body.code, 20).replace(/\s+/g, "");
      const rawQrToken = safeText(body.qrToken, 120);
      if (!rawCode && !rawQrToken) {
        return json({ error: "Add meg a 6 jegyű megtekintési kódot vagy olvasd be a QR-kódot." }, 400);
      }

      const isTestRequester = String(viewing.requesterId || "").startsWith("test_requester_");
      const nowMs = Date.now();
      const nowIso = new Date(nowMs).toISOString();

      const eligibility = checkSafeVisitVerificationEligibility(
        viewing.status,
        viewing.safeVisit,
        nowMs,
        isTestRequester,
      );

      if (!eligibility.ok) {
        const guidanceMap: Record<string, string> = {
          not_approved: "A foglalás nem jóváhagyott állapotban van, vagy időközben lemondásra került.",
          missing: "Ehhez a foglaláshoz nincs aktív megtekintési kód.",
          invalidated: "Ez a megtekintési kód lemondás vagy módosítás miatt érvénytelenítésre került.",
          used: "Ezt a megtekintési kódot már korábban felhasználták.",
          locked: "Túl sok hibás próbálkozás miatt a kódellenőrzés ideiglenesen (15 percre) zárolva van.",
          too_early: "A kód érvényességi időablaka még nem kezdődött el. Kérjük, próbáld meg a megtekintéshez közelebb.",
          expired: "A kód érvényességi időablaka lejárt.",
        };
        await appendAudit(env, viewing.propertyId, {
          action: "SAFEVISIT_VERIFY_FAILED",
          actorId: userId,
          targetUserId: viewing.requesterId,
          viewingId: viewing.id,
          slotSummary: `${viewing.date} ${viewing.startTime}-${viewing.endTime}`,
          details: `Kódellenőrzés sikertelen (${eligibility.reason}).`,
        });
        return json(
          {
            valid: false,
            reason: eligibility.reason,
            title: "A megtekintési kód nem érvényes.",
            guidance: `${guidanceMap[eligibility.reason] || ""} Kérjük, ellenőrizd a foglalás adatait, szükség esetén ne engedj be ismeretlen személyt, és egyeztess a fiókodban.`,
          },
          eligibility.reason === "locked" ? 429 : 400,
        );
      }

      const sv = viewing.safeVisit;
      let matched = false;
      let methodUsed: "manual_code" | "qr_token" = "manual_code";
      if (rawQrToken) {
        methodUsed = "qr_token";
        const qrHash = await sha256Hex(`sv-qr:${viewing.id}:${rawQrToken}`);
        matched = timingSafeEqualHex(qrHash, String(sv.qrTokenHash || ""));
      } else {
        if (!/^\d{6}$/.test(rawCode)) {
          return json(
            {
              valid: false,
              reason: "invalid_format",
              title: "A megtekintési kód nem érvényes.",
              guidance: "A megtekintési kód pontosan 6 számjegyből áll. Kérjük, ellenőrizd a megadott számokat.",
            },
            400,
          );
        }
        const codeHash = await sha256Hex(`sv-code:${viewing.id}:${rawCode}`);
        matched = timingSafeEqualHex(codeHash, String(sv.codeHash || ""));
      }

      if (!matched) {
        sv.failedAttempts = Number(sv.failedAttempts || 0) + 1;
        if (sv.failedAttempts >= MAX_FAILED_VERIFY_ATTEMPTS) {
          sv.lockedUntil = new Date(nowMs + VERIFY_LOCKOUT_MS).toISOString();
        }
        viewing.updatedAt = nowIso;
        await writeJson(env, viewingKey, viewing);
        await appendAudit(env, viewing.propertyId, {
          action: "SAFEVISIT_VERIFY_FAILED",
          actorId: userId,
          targetUserId: viewing.requesterId,
          viewingId: viewing.id,
          slotSummary: `${viewing.date} ${viewing.startTime}-${viewing.endTime}`,
          details: `Hibás megtekintési kód (${sv.failedAttempts}/${MAX_FAILED_VERIFY_ATTEMPTS}).`,
        });
        const remaining = Math.max(0, MAX_FAILED_VERIFY_ATTEMPTS - sv.failedAttempts);
        return json(
          {
            valid: false,
            reason: sv.lockedUntil ? "locked" : "mismatch",
            title: "A megtekintési kód nem érvényes.",
            guidance: sv.lockedUntil
              ? "5 hibás próbálkozás után az ellenőrzés 15 percre zárolásra került. Szükség esetén ellenőrizd a foglalás adatait a fiókodban."
              : `A megadott kód nem egyezik ehhez a foglaláshoz tartozó kóddal (hátralévő próbálkozások: ${remaining}). Kérjük, ellenőrizd a foglalás adatait, és ne engedj be ellenőrizetlen személyt.`,
          },
          sv.lockedUntil ? 429 : 400,
        );
      }

      // Single-use atomic consumption with R2 conditional put (etagMatches)
      sv.codeStatus = "USED";
      sv.verifiedAt = nowIso;
      sv.usedAt = nowIso;
      sv.verifiedMethod = methodUsed;
      sv.visitStage = "CODE_VERIFIED";
      sv.failedAttempts = 0;
      sv.lockedUntil = null;
      viewing.updatedAt = nowIso;

      const putResult = await env.MEDIA_BUCKET.put(viewingKey, JSON.stringify(viewing), {
        httpMetadata: { contentType: "application/json" },
        onlyIf: { etagMatches: obj.etag },
      });

      if (!putResult) {
        return json(
          {
            valid: false,
            reason: "used",
            title: "A megtekintési kód nem érvényes.",
            guidance: "A kódot időközben már felhasználták egy másik kérésben.",
          },
          409,
        );
      }

      await appendAudit(env, viewing.propertyId, {
        action: "SAFEVISIT_CODE_VERIFIED",
        actorId: userId,
        targetUserId: viewing.requesterId,
        viewingId: viewing.id,
        slotSummary: `${viewing.date} ${viewing.startTime}-${viewing.endTime}`,
        details: `Egyedi megtekintési kód sikeresen ellenőrizve és felhasználva (${methodUsed === "qr_token" ? "QR-kód" : "6 jegyű kód"}).`,
      });

      return json({
        valid: true,
        title: "Érvényes megtekintési kód",
        disclaimer:
          "A kód az adott foglaláshoz való hozzáférést igazolja. A megjelent személy személyazonosságának ellenőrzésére önmagában nem alkalmas.",
        requesterName: viewing.requesterName,
        phoneVerified: Boolean(viewing.requesterPhoneVerified),
        date: viewing.date,
        startTime: viewing.startTime,
        endTime: viewing.endTime,
        declarationsAccepted: Boolean(viewing.declarationLog?.purposeAccepted || viewing.declarationLog?.acceptedAt),
        agentExclusionAccepted: Boolean(viewing.declarationLog?.ownerRuleAccepted),
        bookingApproved: true,
        idCheckRequired: Boolean(sv.idCheckRequired),
        companionsCount: viewing.companionsCount,
        safeVisit: sanitizeSafeVisitForList(sv),
      });
    }

    // POST /api/real-estate/viewings/:id/id-check (Owner records visual ID check outcome ONLY — NO ID data stored!)
    if (method === "POST" && viewingId && action === "id-check") {
      const viewingKey = `${VIEWING_PREFIX}${viewingId}.json`;
      const viewing = await readJson<any>(env, viewingKey);
      if (!viewing || viewing.ownerId !== userId) {
        return json({ error: "A megtekintés nem található." }, 404);
      }

      const body = await context.request.json<any>().catch(() => ({}));
      // Strict privacy-by-design server enforcement: reject any forbidden personal ID fields
      const forbiddenKeys = [
        "idNumber",
        "documentNumber",
        "idPhoto",
        "documentCopy",
        "photoData",
        "imageBase64",
        "birthDate",
        "mothersName",
        "idAddress",
        "biometric",
      ];
      for (const k of forbiddenKeys) {
        if (body[k] !== undefined && body[k] !== null && body[k] !== "") {
          return json(
            {
              error:
                "Adatvédelmi okokból igazolványkép, okmányszám vagy egyéb személyes okmányadat feltöltése és tárolása szigorúan tilos.",
            },
            400,
          );
        }
      }

      const result = safeText(body.result, 30) as SafeVisitIdCheckResult;
      const allowedResults = new Set<SafeVisitIdCheckResult>([
        "MATCHED",
        "NOT_SHOWN",
        "MISMATCH",
        "DENIED_SAFETY",
      ]);
      if (!allowedResults.has(result)) {
        return json({ error: "Érvénytelen személyazonosság-ellenőrzési státusz." }, 400);
      }
      if (!viewing.safeVisit) {
        return json({ error: "Ehhez a megtekintéshez nincs aktív SafeVisit nyilvántartás." }, 409);
      }

      const nowIso = new Date().toISOString();
      viewing.safeVisit.idCheckResult = result;
      viewing.safeVisit.idCheckAt = nowIso;
      if (result !== "MATCHED") {
        viewing.safeVisit.visitStage = "DENIED_ENTRY";
        viewing.safeVisit.outcome = "DENIED_ENTRY";
        viewing.safeVisit.outcomeAt = nowIso;
      }
      viewing.updatedAt = nowIso;
      await writeJson(env, viewingKey, viewing);

      await appendAudit(env, viewing.propertyId, {
        action: "SAFEVISIT_ID_CHECK_RECORDED",
        actorId: userId,
        targetUserId: viewing.requesterId,
        viewingId: viewing.id,
        slotSummary: `${viewing.date} ${viewing.startTime}-${viewing.endTime}`,
        details: `Helyszíni szemrevételezéses igazolvány-ellenőrzés rögzítve (eredmény: ${result}; okmányadat nem került tárolásra).`,
      });

      return json({
        ok: true,
        safeVisit: sanitizeSafeVisitForList(viewing.safeVisit),
      });
    }

    // POST /api/real-estate/viewings/:id/arrival (Owner marks "Megérkezés rögzítése")
    if (method === "POST" && viewingId && action === "arrival") {
      const viewingKey = `${VIEWING_PREFIX}${viewingId}.json`;
      const viewing = await readJson<any>(env, viewingKey);
      if (!viewing || viewing.ownerId !== userId) {
        return json({ error: "A megtekintés nem található." }, 404);
      }
      if (viewing.status !== "APPROVED" || !viewing.safeVisit) {
        return json({ error: "Csak jóváhagyott megtekintésnél rögzíthető megérkezés." }, 409);
      }
      if (!viewing.safeVisit.verifiedAt) {
        return json({ error: "A megérkezés rögzítése előtt ellenőrizd a megtekintési kódot." }, 409);
      }
      if (viewing.safeVisit.idCheckRequired && viewing.safeVisit.idCheckResult !== "MATCHED") {
        return json(
          { error: "Az igazolvány szemrevételezéses egyezésének visszaigazolása szükséges a beléptetéshez." },
          409,
        );
      }

      const nowIso = new Date().toISOString();
      viewing.safeVisit.visitStage = "ARRIVED_IN_PROGRESS";
      viewing.safeVisit.arrivedAt = nowIso;
      viewing.updatedAt = nowIso;
      await writeJson(env, viewingKey, viewing);

      await appendAudit(env, viewing.propertyId, {
        action: "SAFEVISIT_ARRIVAL_RECORDED",
        actorId: userId,
        targetUserId: viewing.requesterId,
        viewingId: viewing.id,
        slotSummary: `${viewing.date} ${viewing.startTime}-${viewing.endTime}`,
        details: "Hirdető rögzítette az érdeklődő megérkezését (Megérkezett – megtekintés folyamatban).",
      });

      return json({
        ok: true,
        safeVisit: sanitizeSafeVisitForList(viewing.safeVisit),
      });
    }

    // POST /api/real-estate/viewings/:id/outcome (Owner records final outcome with timestamp)
    if (method === "POST" && viewingId && action === "outcome") {
      const viewingKey = `${VIEWING_PREFIX}${viewingId}.json`;
      const viewing = await readJson<any>(env, viewingKey);
      if (!viewing || viewing.ownerId !== userId) {
        return json({ error: "A megtekintés nem található." }, 404);
      }
      const body = await context.request.json<any>().catch(() => ({}));
      const outcome = safeText(body.outcome, 30) as "COMPLETED" | "NO_SHOW" | "DENIED_ENTRY" | "INTERRUPTED";
      const note = safeText(body.note, 500);
      const allowedOutcomes = new Set(["COMPLETED", "NO_SHOW", "DENIED_ENTRY", "INTERRUPTED"]);
      if (!allowedOutcomes.has(outcome)) {
        return json({ error: "Érvénytelen megtekintési záró státusz." }, 400);
      }

      const nowIso = new Date().toISOString();
      if (!viewing.safeVisit) {
        viewing.safeVisit = {
          codeStatus: "INVALIDATED",
          codeHash: "",
          qrTokenHash: "",
          encryptedCode: "",
          encryptedQrToken: "",
          validFrom: nowIso,
          validUntil: nowIso,
          windowBeforeMinutes: 30,
          windowAfterMinutes: 60,
          failedAttempts: 0,
          lockedUntil: null,
          verifiedAt: null,
          usedAt: null,
          idCheckRequired: false,
          idCheckResult: null,
          idCheckAt: null,
          visitStage: outcome,
          arrivedAt: null,
          outcome,
          outcomeAt: nowIso,
          outcomeNote: note || null,
          createdAt: nowIso,
        };
      } else {
        viewing.safeVisit.visitStage = outcome;
        viewing.safeVisit.outcome = outcome;
        viewing.safeVisit.outcomeAt = nowIso;
        viewing.safeVisit.outcomeNote = note || null;
        if (outcome !== "COMPLETED" && viewing.safeVisit.codeStatus === "ACTIVE") {
          viewing.safeVisit.codeStatus = "INVALIDATED";
          viewing.safeVisit.invalidatedAt = nowIso;
        }
      }
      viewing.updatedAt = nowIso;
      await writeJson(env, viewingKey, viewing);

      await appendAudit(env, viewing.propertyId, {
        action: "SAFEVISIT_OUTCOME_RECORDED",
        actorId: userId,
        targetUserId: viewing.requesterId,
        viewingId: viewing.id,
        slotSummary: `${viewing.date} ${viewing.startTime}-${viewing.endTime}`,
        details: `Megtekintés lezárva: ${outcome}${note ? ` – ${note}` : ""}`,
      });

      return json({
        ok: true,
        safeVisit: sanitizeSafeVisitForList(viewing.safeVisit),
      });
    }

    // DELETE /api/real-estate/viewings/:id (Manually delete old or cancelled/rejected/revoked viewings)
    if (method === "DELETE" && viewingId && !action) {
      const viewing = await readJson<any>(env, `${VIEWING_PREFIX}${viewingId}.json`);
      if (!viewing || (viewing.ownerId !== userId && viewing.requesterId !== userId)) {
        return json({ error: "A megtekintési kérelem nem található." }, 404);
      }

      const todayIso = new Date().toISOString().slice(0, 10);
      const isClosed = ["REJECTED", "REVOKED_BY_OWNER", "CANCELLED_BY_REQUESTER"].includes(viewing.status);
      const isPast = Boolean(viewing.date && viewing.date < todayIso);

      if (!isClosed && !isPast) {
        return json(
          {
            error:
              "Aktív, jövőbeli megtekintés nem törölhető közvetlenül – előbb utasítsd el, vond vissza vagy mondd le.",
          },
          409,
        );
      }

      // Simulated test requests can be permanently removed by the owner
      if (viewing.ownerId === userId && String(viewing.requesterId || "").startsWith("test_requester_")) {
        await env.MEDIA_BUCKET.delete(`${VIEWING_PREFIX}${viewingId}.json`);
        await syncPropertyStats(env, viewing.propertyId);
        return json({ deleted: true, id: viewingId });
      }

      if (viewing.ownerId === userId) viewing.hiddenByOwner = true;
      if (viewing.requesterId === userId) viewing.hiddenByRequester = true;
      viewing.updatedAt = new Date().toISOString();
      await writeJson(env, `${VIEWING_PREFIX}${viewingId}.json`, viewing);

      return json({ deleted: true, id: viewingId });
    }

    // PATCH /api/real-estate/viewings/:id/reminders
    if (method === "PATCH" && viewingId && action === "reminders") {
      const viewing = await readJson<any>(env, `${VIEWING_PREFIX}${viewingId}.json`);
      if (!viewing || (viewing.requesterId !== userId && viewing.ownerId !== userId)) {
        return json({ error: "A megtekintés nem található." }, 404);
      }
      let body: any;
      try {
        body = await context.request.json();
      } catch {
        return json({ error: "Érvénytelen adat." }, 400);
      }
      viewing.reminder24hEnabled = Boolean(body.reminder24hEnabled);
      viewing.reminder2hEnabled = Boolean(body.reminder2hEnabled);
      viewing.updatedAt = new Date().toISOString();
      await writeJson(env, `${VIEWING_PREFIX}${viewingId}.json`, viewing);
      return json(enrichViewingReminders(viewing));
    }
  }

  // =========================================================================
  // 4. BLOCKS, REPORTS & NOTIFICATIONS
  // =========================================================================
  if (route[0] === "blocks") {
    if (!userId) return json({ error: "Bejelentkezés szükséges." }, 401);
    const key = `${BLOCK_PREFIX}${userId}.json`;
    const blocked = new Set<string>((await readJson<string[]>(env, key)) || []);

    if (method === "GET") return json({ blockedUserIds: [...blocked] });

    if (method === "POST") {
      const body = await context.request.json<any>().catch(() => ({}));
      const targetUserId = safeText(body.targetUserId, 120);
      const propertyId = safeText(body.propertyId, 120);
      if (!targetUserId || targetUserId === userId) return json({ error: "Érvénytelen felhasználó." }, 400);
      blocked.add(targetUserId);
      await writeJson(env, key, [...blocked]);
      if (propertyId) {
        await appendAudit(env, propertyId, {
          action: "USER_BLOCKED",
          actorId: userId,
          targetUserId,
          details: "Hirdető letiltotta a felhasználót.",
        });
      }
      return json({ blockedUserIds: [...blocked] });
    }
  }

  if (route[0] === "reports" && method === "POST") {
    if (!userId) return json({ error: "A bejelentéshez jelentkezz be." }, 401);
    const body = await context.request.json<any>().catch(() => ({}));
    const reason = safeText(body.reason, 200);
    const reasonCode = safeText(body.reasonCode, 60) || "other";
    if (!reason) return json({ error: "Add meg a bejelentés okát." }, 400);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const targetUserId = safeText(body.targetUserId, 120) || undefined;
    const conditionUnmetCodes = new Set([
      "refused_photo_id",
      "invalid_or_missing_code",
      "unannounced_companions",
    ]);
    const reportCategory = conditionUnmetCodes.has(reasonCode) ? "condition_unmet" : "intentional_abuse";
    const report = {
      id,
      reporterId: userId,
      propertyId: safeText(body.propertyId, 120) || undefined,
      viewingId: safeText(body.viewingId, 120) || undefined,
      targetUserId,
      reasonCode,
      reportCategory,
      reason,
      details: safeText(body.details, 2000) || undefined,
      // Single owner report NEVER causes automatic permanent ban — goes to moderation review
      moderationStatus: "PENDING_MODERATION",
      createdAt: now,
    };
    await writeJson(env, `${REPORT_PREFIX}${id}.json`, report);

    if (targetUserId) {
      const modRec = await getUserModerationRecord(env, targetUserId);
      modRec.reportsCount = Number(modRec.reportsCount || 0) + 1;
      modRec.updatedAt = now;
      await writeJson(env, `${MODERATION_USER_PREFIX}${targetUserId}.json`, modRec);
    }

    if (report.propertyId) {
      await appendAudit(env, report.propertyId, {
        action: "ABUSE_REPORTED",
        actorId: userId,
        targetUserId: report.targetUserId,
        viewingId: report.viewingId,
        details: `Bejelentés rögzítve moderációra (${reasonCode}): ${reason}`,
      });
    }
    return json({ reported: true, id, moderationStatus: "PENDING_MODERATION" }, 201);
  }

  // =========================================================================
  // 5. MODERATION LOG & GRADUAL ENFORCEMENT (NO AUTO-BAN ON SINGLE REPORT)
  // =========================================================================
  if (route[0] === "moderation") {
    if (!userId) return json({ error: "Bejelentkezés szükséges." }, 401);

    if (method === "GET" && route[1] === "log") {
      const url = new URL(context.request.url);
      const propertyFilter = url.searchParams.get("propertyId");
      const [reportsListed, spamListed, usersListed, myProps] = await Promise.all([
        env.MEDIA_BUCKET.list({ prefix: REPORT_PREFIX, limit: 500 }),
        env.MEDIA_BUCKET.list({ prefix: SPAM_SIGNAL_PREFIX, limit: 500 }),
        env.MEDIA_BUCKET.list({ prefix: MODERATION_USER_PREFIX, limit: 500 }),
        listAllProperties(env),
      ]);
      const ownedIds = new Set(myProps.filter((p) => p.ownerId === userId).map((p) => p.id));

      const allReports = (await Promise.all(reportsListed.objects.map((o) => readJson<any>(env, o.key)))).filter(Boolean);
      const visibleReports = allReports
        .filter((r) => {
          if (propertyFilter && r.propertyId !== propertyFilter) return false;
          return r.reporterId === userId || (r.propertyId && ownedIds.has(r.propertyId));
        })
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

      const allSpam = (await Promise.all(spamListed.objects.map((o) => readJson<any>(env, o.key)))).filter(Boolean);
      const visibleSpam = allSpam
        .filter((s) => {
          if (propertyFilter && s.propertyId !== propertyFilter) return false;
          return s.propertyId && ownedIds.has(s.propertyId);
        })
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
        .slice(0, 100);

      const relevantUserIds = new Set<string>([
        ...visibleReports.map((r) => r.targetUserId).filter(Boolean),
        ...visibleSpam.map((s) => s.userId).filter(Boolean),
      ]);
      const allUsers = (await Promise.all(usersListed.objects.map((o) => readJson<any>(env, o.key)))).filter(Boolean);
      const visibleUsers = allUsers.filter((u) => relevantUserIds.has(u.userId));

      return json({
        reports: visibleReports,
        spamSignals: visibleSpam,
        userRecords: visibleUsers,
      });
    }

    if (method === "PATCH" && route[1] === "decisions") {
      const body = await context.request.json<any>().catch(() => ({}));
      const reportId = safeText(body.reportId, 120);
      const decision = safeText(body.decision, 40);
      const note = safeText(body.note, 600);
      const allowedDecisions = new Set([
        "DISMISSED",
        "WARNING_ISSUED",
        "TEMP_RESTRICTED",
        "EXTENDED_RESTRICTED",
        "SUSPENDED",
      ]);
      if (!reportId || !allowedDecisions.has(decision)) {
        return json({ error: "Érvénytelen moderátori döntés." }, 400);
      }

      const report = await readJson<any>(env, `${REPORT_PREFIX}${reportId}.json`);
      if (!report) return json({ error: "A jelentés nem található." }, 404);

      const now = new Date().toISOString();
      report.moderationStatus = decision;
      report.moderatorDecision = decision;
      report.moderatorNote = note || undefined;
      report.decidedBy = userId;
      report.decidedAt = now;
      await writeJson(env, `${REPORT_PREFIX}${reportId}.json`, report);

      let nextLevel = "none";
      if (report.targetUserId && decision !== "DISMISSED") {
        const modRec = await getUserModerationRecord(env, report.targetUserId);
        if (decision === "WARNING_ISSUED") {
          modRec.warningsCount = Number(modRec.warningsCount || 0) + 1;
          modRec.restrictionLevel = modRec.restrictionLevel === "none" ? "warning" : modRec.restrictionLevel;
        } else if (decision === "TEMP_RESTRICTED") {
          modRec.restrictionLevel = "temp_restricted";
          modRec.restrictedUntil = new Date(Date.now() + 7 * 86_400_000).toISOString();
        } else if (decision === "EXTENDED_RESTRICTED") {
          modRec.restrictionLevel = "extended_restricted";
          modRec.restrictedUntil = new Date(Date.now() + 30 * 86_400_000).toISOString();
        } else if (decision === "SUSPENDED") {
          modRec.restrictionLevel = "suspended";
          modRec.restrictedUntil = null;
        }
        modRec.updatedAt = now;
        nextLevel = modRec.restrictionLevel;
        await writeJson(env, `${MODERATION_USER_PREFIX}${report.targetUserId}.json`, modRec);
      }

      return json({ ok: true, restrictionLevel: nextLevel });
    }
  }

  if (route[0] === "notifications") {
    if (!userId) return json({ error: "Bejelentkezés szükséges." }, 401);
    const key = `${NOTIFICATION_PREFIX}${userId}.json`;
    const items = (await readJson<any[]>(env, key)) || [];

    if (method === "GET") {
      return json({
        items,
        unreadCount: items.filter((n) => !n.read).length,
      });
    }

    if (method === "POST" && route[1] === "read") {
      const updated = items.map((n) => ({ ...n, read: true }));
      await writeJson(env, key, updated);
      return json({ ok: true });
    }
  }

  return json({ error: "Ismeretlen ingatlan végpont." }, 404);
};

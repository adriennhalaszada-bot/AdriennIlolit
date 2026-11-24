import { verifyToken } from "@clerk/backend";

interface Env {
  MEDIA_BUCKET: R2Bucket;
  CLERK_SECRET_KEY: string;
  RENTAL_LISTING_FEE?: string;
  REAL_ESTATE_TEST_MODE?: string;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_FROM_NUMBER?: string;
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

      const property = {
        id,
        ownerId: userId,
        ownerName: safeText(body.ownerName, 120) || "ILOLIT hirdető",
        ownerPhone,
        ownerPhoneShareMode,
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

        // Block check for non-owner senders
        if (prop.ownerId !== userId) {
          const blocks = (await readJson<string[]>(env, `${BLOCK_PREFIX}${prop.ownerId}.json`)) || [];
          if (blocks.includes(userId)) {
            return json({ error: "Ehhez a hirdetéshez jelenleg nem küldhetsz üzenetet." }, 403);
          }
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
      const items = (await listAllViewings(env))
        .filter((v) => {
          const isOwnerVisible = v.ownerId === userId && !v.hiddenByOwner;
          const isRequesterVisible = v.requesterId === userId && !v.hiddenByRequester;
          if (!isOwnerVisible && !isRequesterVisible) return false;
          if (propertyFilter && v.propertyId !== propertyFilter) return false;
          return true;
        })
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
        .map((v) => {
          // Privacy: never expose buyer's phone number or phone hash to anyone
          const { requesterPhoneMasked: _omit, requesterPhoneHash: _omitHash, ...safeViewing } = v;
          return enrichViewingReminders({
            ...safeViewing,
            role: v.ownerId === userId ? "owner" : "requester",
          });
        });
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

      if (!propertyId || !slotId || !requesterName) {
        return json({ error: "Az ingatlan, az időpont és a neved megadása kötelező." }, 400);
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

      const now = new Date().toISOString();
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
        requesterPhoneHash: phoneRec.phoneHash || undefined,
        slotId: slot.id,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        durationMinutes: slot.durationMinutes,
        message: message || undefined,
        status: "PENDING",
        reminder24hEnabled: body.reminder24hEnabled !== false,
        reminder2hEnabled: Boolean(body.reminder2hEnabled),
        createdAt: now,
        updatedAt: now,
      };

      await writeJson(env, `${VIEWING_PREFIX}${viewing.id}.json`, viewing, {
        propertyId,
        ownerId: prop.ownerId,
        requesterId: userId,
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

      if (isRequester) {
        await appendAudit(env, viewing.propertyId, {
          action: "ADDRESS_ACCESSED",
          actorId: userId,
          actorName: viewing.requesterName,
          viewingId: viewing.id,
          slotSummary: `${viewing.date} ${viewing.startTime}-${viewing.endTime}`,
          details: "A jóváhagyott érdeklődő megnyitotta a pontos címet.",
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
        const phoneRec = await readJson<any>(env, `${PHONE_PREFIX}${viewing.requesterId}.json`);
        if (!phoneRec?.phoneVerified) {
          return json({ error: "Az érdeklődő telefonszáma nincs ellenőrizve." }, 409);
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
            details: "Hirdető jóváhagyta a megtekintést.",
          }),
          appendAudit(env, viewing.propertyId, {
            action: "ADDRESS_UNLOCKED",
            actorId: userId,
            targetUserId: viewing.requesterId,
            viewingId: viewing.id,
            slotSummary: `${viewing.date} ${viewing.startTime}-${viewing.endTime}`,
            details: "A pontos cím jogosultsága megnyílt az ellenőrzött érdeklődő számára.",
          }),
          pushNotification(env, viewing.requesterId, {
            type: "VIEWING_APPROVED",
            title: "Megtekintés jóváhagyva – a pontos cím elérhető",
            body: `A hirdető elfogadta a megtekintést: ${viewing.propertyTitle} (${viewing.date} ${viewing.startTime}). Nyisd meg a Megtekintés részleteit!`,
            propertyId: viewing.propertyId,
            viewingId: viewing.id,
          }),
        ]);
        return json(enrichViewingReminders({ ...viewing, role: "owner" }));
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
            title: "A hirdető másik időpontot ajánlott",
            body: `Új javaslat a(z) „${viewing.propertyTitle}” megtekintésére: ${proposedDate} ${proposedStartTime}.`,
            propertyId: viewing.propertyId,
            viewingId: viewing.id,
          }),
        ]);
        return json(enrichViewingReminders({ ...viewing, role: "owner" }));
      }

      if (ownerAction === "REJECT") {
        if (viewing.status !== "PENDING") {
          return json({ error: "Csak függőben lévő kérelem utasítható el." }, 409);
        }
        viewing.status = "REJECTED";
        viewing.ownerResponseNote = note || undefined;
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
          }),
        ]);
        return json(enrichViewingReminders({ ...viewing, role: "owner" }));
      }

      if (ownerAction === "REVOKE") {
        if (viewing.status !== "APPROVED") {
          return json({ error: "Csak jóváhagyott megtekintés vonható vissza." }, 409);
        }
        viewing.status = "REVOKED_BY_OWNER";
        viewing.ownerResponseNote = note || "A hirdető visszavonta a megtekintés jóváhagyását.";
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
            details: note || "Hirdető visszavonta a jóváhagyást; a pontos cím hozzáférése megszűnt.",
          }),
          pushNotification(env, viewing.requesterId, {
            type: "VIEWING_REVOKED",
            title: "Megtekintés visszavonva",
            body: `A hirdető visszavonta a(z) ${viewing.date} ${viewing.startTime} megtekintést (${viewing.propertyTitle}).`,
            propertyId: viewing.propertyId,
            viewingId: viewing.id,
          }),
        ]);
        return json(enrichViewingReminders({ ...viewing, role: "owner" }));
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
      const phoneRec = await readJson<any>(env, `${PHONE_PREFIX}${userId}.json`);
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
          details: "Az érdeklődő elfogadta a hirdető által javasolt új időpontot; a pontos cím megnyílt.",
        }),
        pushNotification(env, viewing.ownerId, {
          type: "VIEWING_APPROVED",
          title: "Új időpont elfogadva",
          body: `${viewing.requesterName} elfogadta a javasolt időpontot (${viewing.date} ${viewing.startTime}).`,
          propertyId: viewing.propertyId,
          viewingId: viewing.id,
        }),
      ]);

      return json(enrichViewingReminders({ ...viewing, role: "requester" }));
    }

    // PATCH /api/real-estate/viewings/:id/cancel (Requester cancels; frees slot automatically)
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
          details: "Az érdeklődő lemondta a megtekintést; az idősáv automatikusan felszabadult.",
        }),
        pushNotification(env, viewing.ownerId, {
          type: "VIEWING_CANCELLED",
          title: "Megtekintés lemondva",
          body: `${viewing.requesterName} lemondta a(z) ${viewing.date} ${viewing.startTime} időpontot (${viewing.propertyTitle}). Az időpont felszabadult.`,
          propertyId: viewing.propertyId,
          viewingId: viewing.id,
        }),
      ]);

      return json(enrichViewingReminders({ ...viewing, role: "requester" }));
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
    if (!reason) return json({ error: "Add meg a bejelentés okát." }, 400);
    const id = crypto.randomUUID();
    const report = {
      id,
      reporterId: userId,
      propertyId: safeText(body.propertyId, 120) || undefined,
      viewingId: safeText(body.viewingId, 120) || undefined,
      targetUserId: safeText(body.targetUserId, 120) || undefined,
      reason,
      details: safeText(body.details, 2000) || undefined,
      createdAt: new Date().toISOString(),
    };
    await writeJson(env, `${REPORT_PREFIX}${id}.json`, report);
    if (report.propertyId) {
      await appendAudit(env, report.propertyId, {
        action: "ABUSE_REPORTED",
        actorId: userId,
        targetUserId: report.targetUserId,
        viewingId: report.viewingId,
        details: `Bejelentés rögzítve: ${reason}`,
      });
    }
    return json({ reported: true, id }, 201);
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

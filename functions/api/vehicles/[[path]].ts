import { verifyToken } from "@clerk/backend";
import { buildAppointmentLinks, emitUnifiedNotification } from "../../_shared/unifiedNotifications";
import { publishDomainEvent, type RealtimeDomain } from "../../_shared/realtimeAutomation";

interface Env {
  MEDIA_BUCKET: R2Bucket;
  CLERK_SECRET_KEY: string;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_FROM_NUMBER?: string;
}

type Context = EventContext<Env, string, Record<string, unknown>>;

const VEHICLE_PREFIX = "data/vehicles/listings/";
const BOOKING_PREFIX = "data/vehicles/viewings/";
const PHONE_PREFIX = "data/real-estate/phone-verifications/";
const FAVORITE_PREFIX = "data/vehicles/favorites/";
const SAVED_SEARCH_PREFIX = "data/vehicles/saved-searches/";
const MESSAGE_PREFIX = "data/vehicles/messages/";
const REPORT_PREFIX = "data/vehicles/reports/";
const DECLARATION_PREFIX = "data/vehicles/declarations/";
const DEALER_PREFIX = "data/vehicles/dealers/";
const CATALOG_KEY = "data/vehicles/custom-catalog.json";
const MISSING_BRAND_PREFIX = "data/vehicles/missing-brands/";
const PRICING_CONFIG_KEY = "data/vehicles/pricing-config.json";

const EV_ONLY_BRANDS = new Set(["tesla", "nio", "xpeng", "zeekr", "lucid", "skywell", "eveasy", "vinfast", "seres"]);

function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
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
  const auth = request.headers.get("Authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
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

async function writeJson(env: Env, key: string, value: unknown, customMetadata?: Record<string, string>) {
  await env.MEDIA_BUCKET.put(key, JSON.stringify(value), {
    httpMetadata: { contentType: "application/json" },
    customMetadata,
  });
  let domain: RealtimeDomain | null = null;
  let privateOnly = false;
  if (key.startsWith(VEHICLE_PREFIX)) domain = "vehicles";
  else if (key.startsWith(BOOKING_PREFIX)) {
    domain = "appointments";
    privateOnly = true;
  } else if (key.startsWith(MESSAGE_PREFIX)) {
    domain = "messages";
    privateOnly = true;
  } else if (key.startsWith(FAVORITE_PREFIX) || key.startsWith(SAVED_SEARCH_PREFIX)) {
    domain = "favorites";
    privateOnly = true;
  }
  if (domain) {
    const rec = value as any;
    const targets = [rec?.ownerId, rec?.requesterId, customMetadata?.ownerId].filter(Boolean);
    await publishDomainEvent(env, {
      domain,
      action: "updated",
      entityId: rec?.id,
      targetUserIds: targets.length ? targets : undefined,
      privateOnly,
    });
  }
}

async function listJsonPrefix<T = any>(env: Env, prefix: string): Promise<T[]> {
  const listed = await env.MEDIA_BUCKET.list({ prefix, limit: 1000 });
  const items = await Promise.all(listed.objects.map((o) => readJson<T>(env, o.key)));
  return items.filter(Boolean) as T[];
}

function safeText(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function safeNum(v: unknown): number | null {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function addMinutes(startTime: string, durationMinutes: number): string {
  const [hStr, mStr] = startTime.split(":");
  const total = (Number(hStr) || 0) * 60 + (Number(mStr) || 0) + durationMinutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function formatHuDateDot(dateIso?: string): string {
  if (!dateIso) return "";
  const m = dateIso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return dateIso;
  const months = [
    "január", "február", "március", "április", "május", "június",
    "július", "augusztus", "szeptember", "október", "november", "december",
  ];
  return `${m[1]}. ${months[Number(m[2]) - 1] || m[2]} ${Number(m[3])}.`;
}

function normalizeStr(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function approximateCoords(id: string, lat: number | null, lng: number | null) {
  if (lat === null || lng === null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { approxLatitude: null, approxLongitude: null };
  }
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  const angle = ((Math.abs(hash) % 360) * Math.PI) / 180;
  return {
    approxLatitude: Math.round((lat + Math.sin(angle) * 0.0045) * 1000) / 1000,
    approxLongitude: Math.round((lng + Math.cos(angle) * 0.0062) * 1000) / 1000,
  };
}

async function sendTwilioSmsIfConfigured(env: Env, to: string, body: string): Promise<boolean> {
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_FROM_NUMBER || !to) return false;
  try {
    const auth = btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`);
    const form = new URLSearchParams({ To: to, From: env.TWILIO_FROM_NUMBER, Body: body });
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: "POST",
        headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: form.toString(),
      },
    );
    return res.ok;
  } catch {
    return false;
  }
}

function defaultPricingConfig() {
  const baseCats = [
    "passenger_car", "motorcycle_quad", "light_commercial", "heavy_commercial",
    "machinery", "agricultural", "camper_caravan", "trailer", "watercraft", "other_vehicle",
  ];
  const categoryBaseFees: Record<string, { privateFeeHuf: number; dealerFeeHuf: number }> = {};
  for (const c of baseCats) categoryBaseFees[c] = { privateFeeHuf: 0, dealerFeeHuf: 0 };
  return {
    enabled: false, // Üzleti döntés után aktiválható – nem találunk ki önkényes díjat!
    defaultDurationDays: 30,
    featuredFeeHuf: 0,
    categoryBaseFees,
    priceTiers: [
      { maxPriceHuf: 2_000_000, label: "2 000 000 Ft-ig", privateFeeHuf: 0, dealerFeeHuf: 0 },
      { maxPriceHuf: 5_000_000, label: "2 000 001 – 5 000 000 Ft", privateFeeHuf: 0, dealerFeeHuf: 0 },
      { maxPriceHuf: 10_000_000, label: "5 000 001 – 10 000 000 Ft", privateFeeHuf: 0, dealerFeeHuf: 0 },
      { maxPriceHuf: null, label: "10 000 001 Ft felett", privateFeeHuf: 0, dealerFeeHuf: 0 },
    ],
    updatedAt: new Date().toISOString(),
  };
}

function validateServerCombination(body: any): string | null {
  const brand = normalizeStr(String(body.brand || ""));
  const model = normalizeStr(String(body.model || ""));
  const typeVariant = normalizeStr(String(body.typeVariant || ""));
  const year = Number(body.manufactureYear || 0);
  const fuel = String(body.fuelType || "");
  if (EV_ONLY_BRANDS.has(brand) && fuel && fuel !== "elektromos" && body.category === "passenger_car") {
    return `A(z) ${body.brand} ${body.model || ""} kizárólag tisztán elektromos hajtással létezik.`;
  }
  if (brand === "volkswagen" && model === "golf" && typeVariant.includes("golf viii") && year > 0 && year < 2019) {
    return "A Volkswagen Golf VIII gyártása 2019-ben kezdődött, korábbi évjárattal nem hirdethető meg.";
  }
  if (brand === "opel" && model === "astra" && typeVariant.includes("astra h") && year > 0 && (year < 2004 || year > 2015)) {
    return "Az Opel Astra H gyártási időszaka 2004–2014.";
  }
  if (brand === "bmw" && model.includes("3-as") && (typeVariant.includes("g20") || String(body.generation || "").toUpperCase() === "G20") && year > 0 && year < 2019) {
    return "A BMW 3-as sorozat G20 generációja 2019-től készült.";
  }
  return null;
}

/**
 * STRICT PRIVACY FILTER:
 * Never returns private seller's exact address, hidden VIN, or private phone number publicly.
 */
function sanitizeVehicleForViewer(
  v: any,
  requestingUserId: string | null,
  occupiedSlotIds: Set<string>,
  favoriteSet?: Set<string>,
) {
  const isOwner = Boolean(requestingUserId && v.ownerId === requestingUserId);
  const todayIso = new Date().toISOString().slice(0, 10);
  const rawSlots = Array.isArray(v.viewingSlots) ? v.viewingSlots : [];
  const viewingSlots = isOwner
    ? rawSlots
    : rawSlots.filter((s: any) => !s.isBlocked && s.date >= todayIso && !occupiedSlotIds.has(s.id));

  const history = { ...(v.history || {}) };
  if (!isOwner && !history.vinPublicVisible) {
    delete history.vin;
  }

  const out: any = {
    ...v,
    history,
    viewingSlots,
    isOwner,
    isFavorited: Boolean(favoriteSet?.has(v.id)),
  };

  if (!isOwner) {
    delete out.protectedLocation;
    if (v.ownerPhoneShareMode !== "public_dealer" || v.sellerType === "private") {
      delete out.ownerPhone;
    }
  }
  return out;
}

async function computeReminderFlags(b: any) {
  if (b.status !== "APPROVED" || !b.date || !b.startTime) {
    return { ...b, reminder24hDue: false, reminder2hDue: false };
  }
  const ms = new Date(`${b.date}T${b.startTime}:00`).getTime();
  if (!Number.isFinite(ms)) return { ...b, reminder24hDue: false, reminder2hDue: false };
  const diffH = (ms - Date.now()) / 3_600_000;
  return {
    ...b,
    reminder24hDue: Boolean(b.reminder24hEnabled !== false && diffH > 0 && diffH <= 24),
    reminder2hDue: Boolean(b.reminder2hEnabled !== false && diffH > 0 && diffH <= 2),
  };
}

export const onRequest: PagesFunction<Env> = async (rawContext) => {
  const context = rawContext as Context;
  const method = context.request.method.toUpperCase();
  if (method === "OPTIONS") return json(null, 204);

  const env = context.env;
  const route = routeParts(context);
  const userId = await currentUserId(context.request, env);

  // =========================================================================
  // 1. CENTRAL CATALOG & PRICING CONFIGURATION
  // =========================================================================
  if (route[0] === "catalog") {
    if (method === "GET" && route.length === 1) {
      const items = (await readJson<any[]>(env, CATALOG_KEY)) || [];
      return json({ items });
    }
    if (method === "POST" && route[1] === "entries") {
      if (!userId) return json({ error: "Bejelentkezés szükséges." }, 401);
      const body = await context.request.json<any>().catch(() => ({}));
      const brand = safeText(body.brand, 80);
      const model = safeText(body.model, 80);
      const category = safeText(body.category, 40) || "passenger_car";
      if (!brand || !model) return json({ error: "A márka és a modell megadása kötelező." }, 400);
      const entry = {
        id: crypto.randomUUID(),
        category,
        brand,
        manufacturer: safeText(body.manufacturer, 80) || brand,
        model,
        typeVariant: safeText(body.typeVariant, 80) || undefined,
        generation: safeText(body.generation, 40) || undefined,
        yearFrom: safeNum(body.yearFrom) || undefined,
        yearTo: safeNum(body.yearTo),
        bodyTypes: Array.isArray(body.bodyTypes) ? body.bodyTypes.slice(0, 10) : undefined,
        engineVariant: safeText(body.engineVariant, 80) || undefined,
        engineCode: safeText(body.engineCode, 40) || undefined,
        displacementCc: safeNum(body.displacementCc),
        powerKw: safeNum(body.powerKw),
        powerHp: safeNum(body.powerHp),
        fuelType: safeText(body.fuelType, 40) || undefined,
        driveType: safeText(body.driveType, 40) || undefined,
        transmission: safeText(body.transmission, 40) || undefined,
        trimLevel: safeText(body.trimLevel, 60) || undefined,
        dataSource: safeText(body.dataSource, 200) || "ILOLIT adminisztrátori törzsadat",
        verifiedAt: new Date().toISOString().slice(0, 10),
        usageRights: safeText(body.usageRights, 200) || "Saját szerkesztésű törzsadat",
        addedBy: userId,
      };
      const existing = (await readJson<any[]>(env, CATALOG_KEY)) || [];
      await writeJson(env, CATALOG_KEY, [entry, ...existing]);
      return json(entry, 201);
    }
    if (method === "POST" && route[1] === "missing-brand") {
      const body = await context.request.json<any>().catch(() => ({}));
      const brandName = safeText(body.brandName, 100);
      if (!brandName) return json({ error: "Add meg a hiányzó márka nevét." }, 400);
      const id = crypto.randomUUID();
      await writeJson(env, `${MISSING_BRAND_PREFIX}${id}.json`, {
        id,
        reporterId: userId || "guest",
        category: safeText(body.category, 40) || "passenger_car",
        brandName,
        modelName: safeText(body.modelName, 100) || undefined,
        note: safeText(body.note, 500) || undefined,
        createdAt: new Date().toISOString(),
      });
      return json({ reported: true, id }, 201);
    }
  }

  if (route[0] === "pricing") {
    if (method === "GET") {
      const cfg = (await readJson<any>(env, PRICING_CONFIG_KEY)) || defaultPricingConfig();
      return json(cfg);
    }
    if (method === "PUT") {
      if (!userId) return json({ error: "Bejelentkezés szükséges." }, 401);
      const body = await context.request.json<any>().catch(() => ({}));
      const current = (await readJson<any>(env, PRICING_CONFIG_KEY)) || defaultPricingConfig();
      const updated = {
        ...current,
        ...body,
        updatedAt: new Date().toISOString(),
        updatedBy: userId,
      };
      await writeJson(env, PRICING_CONFIG_KEY, updated);
      return json(updated);
    }
  }

  // =========================================================================
  // 2. SAVED SEARCHES, PRICE ALERTS & DEALER PROFILE
  // =========================================================================
  if (route[0] === "saved-searches") {
    if (!userId) return json({ error: "Bejelentkezés szükséges." }, 401);
    const key = `${SAVED_SEARCH_PREFIX}${userId}.json`;
    const list = (await readJson<any[]>(env, key)) || [];
    if (method === "GET") return json({ items: list });
    if (method === "POST") {
      const body = await context.request.json<any>().catch(() => ({}));
      const item = {
        id: crypto.randomUUID(),
        name: safeText(body.name, 120) || "Mentett járműkeresés",
        filters: body.filters && typeof body.filters === "object" ? body.filters : {},
        notifyNewListings: body.notifyNewListings !== false,
        createdAt: new Date().toISOString(),
      };
      await writeJson(env, key, [item, ...list].slice(0, 30));
      return json(item, 201);
    }
    if (method === "DELETE" && route[1]) {
      const next = list.filter((s) => s.id !== route[1]);
      await writeJson(env, key, next);
      return json({ deleted: true });
    }
  }

  if (route[0] === "price-alerts" && method === "GET") {
    if (!userId) return json({ error: "Bejelentkezés szükséges." }, 401);
    const favIds = new Set((await readJson<string[]>(env, `${FAVORITE_PREFIX}${userId}.json`)) || []);
    const allVehicles = await listJsonPrefix<any>(env, VEHICLE_PREFIX);
    const alerts: any[] = [];
    for (const v of allVehicles) {
      if (!favIds.has(v.id) || !Array.isArray(v.priceHistory) || v.priceHistory.length < 2) continue;
      const last = v.priceHistory[v.priceHistory.length - 1];
      const prev = v.priceHistory[v.priceHistory.length - 2];
      if (last.price < prev.price) {
        alerts.push({
          vehicleId: v.id,
          title: v.title,
          coverImage: v.photos?.[0]?.url || "",
          previousPriceHuf: prev.price,
          newPriceHuf: last.price,
          changedAt: last.changedAt,
        });
      }
    }
    return json({ items: alerts });
  }

  if (route[0] === "dealer-profile") {
    if (!userId) return json({ error: "Bejelentkezés szükséges." }, 401);
    const key = `${DEALER_PREFIX}${userId}.json`;
    if (method === "GET") {
      const profile = await readJson<any>(env, key);
      return json({ profile });
    }
    if (method === "PUT") {
      const body = await context.request.json<any>().catch(() => ({}));
      const profile = {
        ownerId: userId,
        companyName: safeText(body.companyName, 140),
        taxNumber: safeText(body.taxNumber, 40),
        locations: Array.isArray(body.locations) ? body.locations.slice(0, 20) : [],
        contacts: Array.isArray(body.contacts) ? body.contacts.slice(0, 20) : [],
        description: safeText(body.description, 3000),
        verifiedBusiness: Boolean(body.taxNumber && body.companyName),
        staffEmails: Array.isArray(body.staffEmails) ? body.staffEmails.slice(0, 30) : [],
        updatedAt: new Date().toISOString(),
      };
      await writeJson(env, key, profile);
      return json({ profile });
    }
  }

  if (route[0] === "dealer" && route[1] === "csv-import" && method === "POST") {
    if (!userId) return json({ error: "Bejelentkezés szükséges." }, 401);
    const body = await context.request.json<any>().catch(() => ({}));
    const rows = Array.isArray(body.rows) ? body.rows.slice(0, 50) : [];
    const dealer = await readJson<any>(env, `${DEALER_PREFIX}${userId}.json`);
    const ids: string[] = [];
    const errors: string[] = [];
    const now = new Date().toISOString();

    for (let i = 0; i < rows.length; i += 1) {
      const r = rows[i] || {};
      const brand = safeText(r.brand || r.marka, 60);
      const model = safeText(r.model || r.modell, 80);
      const priceHuf = Math.max(0, Math.round(Number(r.priceHuf || r.ar || 0)));
      const year = Math.round(Number(r.manufactureYear || r.evjarat || 2020));
      if (!brand || !model || priceHuf < 10000) {
        errors.push(`${i + 1}. sor: hiányzó márka, modell vagy érvénytelen vételár.`);
        continue;
      }
      const id = crypto.randomUUID();
      const city = safeText(r.city || r.telepules, 80) || dealer?.locations?.[0]?.city || "Budapest";
      const listing = {
        id,
        listingCode: `ILV-${new Date().getFullYear()}-${String(Math.floor(10000 + Math.random() * 89999))}`,
        ownerId: userId,
        ownerName: dealer?.companyName || "Kereskedő",
        sellerType: dealer?.verifiedBusiness ? "verified_business" : "dealer",
        dealerCompanyName: dealer?.companyName || undefined,
        category: safeText(r.category || r.kategoria, 40) || "passenger_car",
        collections: ["used"],
        brand,
        model,
        typeVariant: safeText(r.typeVariant || r.tipus, 80) || model,
        bodyType: safeText(r.bodyType || r.kivitel, 40) || "Ferdehátú",
        manufactureYear: year,
        mileageKm: safeNum(r.mileageKm || r.km),
        condition: safeText(r.condition || r.allapot, 30) || "megkimelt",
        fuelType: safeText(r.fuelType || r.uzemanyag, 30) || "benzin",
        powertrainSystem: "belsoegesu",
        powerHp: safeNum(r.powerHp || r.le),
        powerKw: safeNum(r.powerKw || r.kw),
        transmission: safeText(r.transmission || r.valto, 30) || "manualis",
        conditionDeclarations: {},
        history: { documentStatus: "ervenyes_magyar" },
        equipment: [],
        pricing: { priceHuf, vatStatus: "afas_brutto" },
        priceHistory: [{ price: priceHuf, changedAt: now }],
        title: safeText(r.title, 160) || `${brand} ${model} ${safeText(r.typeVariant || r.tipus, 40)}`.trim(),
        description: safeText(r.description || r.leiras, 4000) || "CSV-importálással létrehozott kereskedői járműhirdetés.",
        photos: [],
        documents: [],
        publicLocation: {
          country: "Magyarország",
          postalCode: safeText(r.postalCode || r.iranyitoszam, 10) || "",
          city,
          approxLatitude: null,
          approxLongitude: null,
          publicDealershipAddress: dealer?.locations?.[0]?.address || undefined,
        },
        inquiryPreferences: {
          acceptDealerPurchaseOffers: true,
          acceptConsignmentOffers: false,
          acceptBrokerServiceOffers: false,
          noUnsolicitedCommercial: true,
        },
        testDriveSettings: {
          enabled: true,
          durationMinutes: 30,
          requiredLicenseCategory: "B",
          sellerPresentRequired: true,
          licenseInspectionOnSite: true,
        },
        viewingSlots: [],
        status: "DRAFT",
        stats: { views: 0, favorites: 0, viewingRequests: 0, testDriveRequests: 0, approvedBookings: 0, messages: 0 },
        createdAt: now,
        updatedAt: now,
      };
      await writeJson(env, `${VEHICLE_PREFIX}${id}.json`, listing);
      ids.push(id);
    }

    return json({ importedCount: ids.length, errors, ids }, 201);
  }

  // =========================================================================
  // 3. ABUSE REPORTS (11 reasons — no single-report auto permanent ban)
  // =========================================================================
  if (route[0] === "reports" && method === "POST") {
    if (!userId) return json({ error: "A bejelentéshez jelentkezz be." }, 401);
    const body = await context.request.json<any>().catch(() => ({}));
    const reason = safeText(body.reason, 200);
    if (!reason) return json({ error: "Add meg a bejelentés okát." }, 400);
    const id = crypto.randomUUID();
    await writeJson(env, `${REPORT_PREFIX}${id}.json`, {
      id,
      reporterId: userId,
      vehicleId: safeText(body.vehicleId, 120) || undefined,
      bookingId: safeText(body.bookingId, 120) || undefined,
      targetUserId: safeText(body.targetUserId, 120) || undefined,
      reasonCode: safeText(body.reasonCode, 60) || "other",
      reason,
      details: safeText(body.details, 2000) || undefined,
      moderationStatus: "PENDING_MODERATION",
      createdAt: new Date().toISOString(),
    });
    return json({ reported: true, id }, 201);
  }

  // =========================================================================
  // 4. VEHICLE VIEWING & TEST DRIVE BOOKINGS (/api/vehicles/viewings/*)
  // =========================================================================
  if (route[0] === "viewings") {
    if (!userId) return json({ error: "A megtekintési és tesztvezetési műveletekhez jelentkezz be." }, 401);

    if (method === "GET" && route[1] === "me") {
      const url = new URL(context.request.url);
      const vehicleFilter = url.searchParams.get("vehicleId");
      const all = await listJsonPrefix<any>(env, BOOKING_PREFIX);
      const visible = all
        .filter((b) => {
          const isOwnerVis = b.ownerId === userId && !b.hiddenByOwner;
          const isReqVis = b.requesterId === userId && !b.hiddenByRequester;
          if (!isOwnerVis && !isReqVis) return false;
          if (vehicleFilter && b.vehicleId !== vehicleFilter) return false;
          return true;
        })
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

      const items = await Promise.all(
        visible.map(async (b) => {
          const { requesterPhone: _p, requesterPhoneHash: _h, exactAddress: _e, ...safe } = b;
          return computeReminderFlags({ ...safe, role: b.ownerId === userId ? "owner" : "requester" });
        }),
      );
      return json({ items, total: items.length });
    }

    // POST /api/vehicles/viewings — Strict SMS phone + 2 mandatory legal declarations + test drive license check
    if (method === "POST" && route.length === 1) {
      const body = await context.request.json<any>().catch(() => ({}));
      const vehicleId = safeText(body.vehicleId, 120);
      const bookingKind = body.bookingKind === "TEST_DRIVE" ? "TEST_DRIVE" : "VIEWING";
      const requesterName = safeText(body.requesterName, 120);
      const declaration1Accepted = body.declaration1Accepted === true;
      const declaration2Accepted = body.declaration2Accepted === true;
      const legalNoticeViewed = body.legalNoticeViewed === true;

      if (!vehicleId || !requesterName) {
        return json({ error: "A jármű és a neved megadása kötelező." }, 400);
      }
      if (!declaration1Accepted || !declaration2Accepted) {
        return json(
          { error: "A továbblépéshez mindkét kötelező biztonsági és jogi nyilatkozat elfogadása szükséges." },
          400,
        );
      }

      // Mandatory server-side SMS phone verification check
      const phoneRec = await readJson<any>(env, `${PHONE_PREFIX}${userId}.json`);
      if (!phoneRec?.phoneVerified) {
        return json(
          { error: "A megtekintési vagy tesztvezetési kérelemhez előbb hitelesítsd telefonszámodat SMS-kóddal." },
          403,
        );
      }

      const vehicle = await readJson<any>(env, `${VEHICLE_PREFIX}${vehicleId}.json`);
      if (!vehicle || vehicle.status === "DELETED") {
        return json({ error: "A járműhirdetés nem található." }, 404);
      }
      if (vehicle.ownerId === userId) {
        return json({ error: "Saját járműhirdetésedre nem küldhetsz foglalást." }, 409);
      }
      if (vehicle.status !== "ACTIVE") {
        return json({ error: "Erre a járműre jelenleg nem küldhető foglalás." }, 409);
      }

      // Separate test-drive authorization gate (#47)
      if (bookingKind === "TEST_DRIVE") {
        if (!vehicle.testDriveSettings?.enabled) {
          return json({ error: "A hirdető ennél a járműnél nem engedélyezte a tesztvezetést." }, 403);
        }
        if (body.hasRequiredLicenseDeclared !== true) {
          return json(
            {
              error: `A tesztvezetéshez nyilatkoznod kell, hogy rendelkezel érvényes ${vehicle.testDriveSettings.requiredLicenseCategory || "B"} kategóriás vezetői engedéllyel.`,
            },
            400,
          );
        }
      }

      let date = safeText(body.date, 10);
      let startTime = safeText(body.startTime, 5);
      let durationMinutes = Math.max(15, Math.min(180, Number(body.durationMinutes || (bookingKind === "TEST_DRIVE" ? vehicle.testDriveSettings?.durationMinutes || 30 : 30))));
      const slotId = safeText(body.slotId, 120) || undefined;

      if (slotId) {
        const slot = (vehicle.viewingSlots || []).find((s: any) => s.id === slotId && !s.isBlocked);
        if (!slot) return json({ error: "A kiválasztott időpont már nem elérhető." }, 409);
        if (slot.slotKind && slot.slotKind !== bookingKind) {
          return json({ error: "Ez az idősáv más típusú foglalásra van kijelölve." }, 409);
        }
        date = slot.date;
        startTime = slot.startTime;
        durationMinutes = slot.durationMinutes || durationMinutes;
      }

      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(startTime)) {
        return json({ error: "Érvényes dátum és időpont megadása kötelező." }, 400);
      }

      // Prevent double booking of the same slot / time
      const allBookings = await listJsonPrefix<any>(env, BOOKING_PREFIX);
      const conflict = allBookings.some(
        (b) =>
          b.vehicleId === vehicleId &&
          ["PENDING", "APPROVED"].includes(b.status) &&
          ((slotId && b.slotId === slotId) || (b.date === date && b.startTime === startTime)),
      );
      if (conflict) {
        return json({ error: "Ezt az időpontot már lefoglalták. Kérjük, válassz másik időpontot." }, 409);
      }

      const now = new Date().toISOString();
      const endTime = addMinutes(startTime, durationMinutes);
      const booking = {
        id: crypto.randomUUID(),
        vehicleId,
        vehicleTitle: vehicle.title,
        vehicleBrand: vehicle.brand,
        vehicleModel: vehicle.model,
        vehicleYear: vehicle.manufactureYear,
        vehiclePriceHuf: Number(vehicle.pricing?.priceHuf || 0),
        vehicleCoverImage: vehicle.photos?.[0]?.url || "",
        vehiclePublicCity: vehicle.publicLocation?.city || "Magyarország",
        bookingKind,
        ownerId: vehicle.ownerId,
        ownerName: vehicle.dealerCompanyName || vehicle.ownerName || "Hirdető",
        requesterId: userId,
        requesterName,
        requesterPhoneVerified: true,
        requesterPhoneHash: phoneRec.phoneHash || undefined,
        slotId,
        date,
        startTime,
        endTime,
        durationMinutes,
        message: safeText(body.message, 1000) || undefined,
        licenseCategoryConfirmed:
          bookingKind === "TEST_DRIVE"
            ? safeText(body.licenseCategoryConfirmed, 20) || vehicle.testDriveSettings?.requiredLicenseCategory || "B"
            : undefined,
        hasRequiredLicenseDeclared: bookingKind === "TEST_DRIVE" ? true : undefined,
        declarationLog: {
          version: safeText(body.declarationVersion, 40) || "2026-11-v1-vehicles",
          acceptedAt: now,
          declaration1Accepted: true,
          declaration2Accepted: true,
          legalNoticeViewed,
        },
        status: "PENDING",
        reminder24hEnabled: body.reminder24hEnabled !== false,
        reminder2hEnabled: body.reminder2hEnabled !== false,
        createdAt: now,
        updatedAt: now,
      };

      await writeJson(env, `${BOOKING_PREFIX}${booking.id}.json`, booking);
      await writeJson(env, `${DECLARATION_PREFIX}${booking.id}.json`, {
        id: booking.id,
        userId,
        vehicleId,
        bookingKind,
        ...booking.declarationLog,
      });

      // Update vehicle stats
      vehicle.stats = {
        ...(vehicle.stats || {}),
        viewingRequests: Number(vehicle.stats?.viewingRequests || 0) + (bookingKind === "VIEWING" ? 1 : 0),
        testDriveRequests: Number(vehicle.stats?.testDriveRequests || 0) + (bookingKind === "TEST_DRIVE" ? 1 : 0),
      };
      await writeJson(env, `${VEHICLE_PREFIX}${vehicleId}.json`, vehicle);

      const links = buildAppointmentLinks("VEHICLE_VIEWING", booking.id);
      await emitUnifiedNotification(env, vehicle.ownerId, {
        category: "JARMU",
        eventType: "APPOINTMENT_REQUESTED",
        title: bookingKind === "TEST_DRIVE" ? "Új tesztvezetési kérelem érkezett" : "Új járműmegtekintési kérelem érkezett",
        body: `${requesterName} időpontot kért: ${vehicle.title} (${formatHuDateDot(date)} ${startTime}).`,
        appointmentId: booking.id,
        appointmentType: "VEHICLE_VIEWING",
        listingId: vehicle.id,
        listingTitle: vehicle.title,
        coverImage: booking.vehicleCoverImage,
        date,
        startTime,
        shortLocation: booking.vehiclePublicCity,
        deepLink: links.deepLink,
        webUrl: `/vehicles/admin/${vehicle.id}`,
        popupRequired: true,
      });

      const { requesterPhoneHash: _strip, ...resp } = booking;
      return json(resp, 201);
    }

    const bookingId = route[1];
    const action = route[2];

    // GET /api/vehicles/viewings/:id/details — STRICT 4-GATE EXACT LOCATION UNLOCK (#46)
    if (method === "GET" && bookingId && action === "details") {
      const booking = await readJson<any>(env, `${BOOKING_PREFIX}${bookingId}.json`);
      if (!booking) return json({ error: "A foglalás nem található." }, 404);
      const isOwner = booking.ownerId === userId;
      const isRequester = booking.requesterId === userId;
      if (!isOwner && !isRequester) return json({ error: "Nincs jogosultságod." }, 403);
      if (booking.status !== "APPROVED" && booking.status !== "COMPLETED") {
        return json({ error: "A pontos találkozási hely csak a hirdető visszaigazolása után érhető el." }, 403);
      }
      if (isRequester) {
        const phoneRec = await readJson<any>(env, `${PHONE_PREFIX}${userId}.json`);
        if (!phoneRec?.phoneVerified) {
          return json({ error: "SMS-ben hitelesített telefonszám szükséges." }, 403);
        }
        if (!booking.declarationLog?.declaration1Accepted || !booking.declarationLog?.declaration2Accepted) {
          return json({ error: "A kötelező biztonsági nyilatkozatok hiányoznak." }, 403);
        }
      }

      const vehicle = await readJson<any>(env, `${VEHICLE_PREFIX}${booking.vehicleId}.json`);
      const exactAddress =
        booking.approvedExactAddress ||
        vehicle?.protectedLocation?.exactAddress ||
        vehicle?.publicLocation?.publicDealershipAddress ||
        vehicle?.publicLocation?.city ||
        "Magyarország";
      const meetingPlace = booking.approvedMeetingPlace || vehicle?.protectedLocation?.meetingPlace || undefined;
      const instructions = booking.ownerResponseNote || vehicle?.protectedLocation?.instructions || undefined;
      const navTarget = meetingPlace ? `${meetingPlace}, ${exactAddress}` : exactAddress;

      return json({
        bookingId: booking.id,
        vehicleId: booking.vehicleId,
        vehicleTitle: booking.vehicleTitle,
        bookingKind: booking.bookingKind,
        date: booking.date,
        startTime: booking.startTime,
        endTime: booking.endTime,
        durationMinutes: booking.durationMinutes,
        exactAddress,
        meetingPlace,
        instructions,
        navigationUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(navTarget)}`,
        ownerName: booking.ownerName,
        ownerPhone:
          booking.approvedOwnerPhone ||
          (vehicle?.ownerPhoneShareMode !== "none" ? vehicle?.ownerPhone : null) ||
          null,
        testDriveConditions: booking.bookingKind === "TEST_DRIVE" ? vehicle?.testDriveSettings : undefined,
        approvedAt: booking.approvedAt || booking.updatedAt,
      });
    }

    // PATCH /api/vehicles/viewings/:id/respond (Owner: APPROVE, PROPOSE_NEW_TIME, REJECT, REVOKE, COMPLETE, NO_SHOW)
    if (method === "PATCH" && bookingId && action === "respond") {
      const booking = await readJson<any>(env, `${BOOKING_PREFIX}${bookingId}.json`);
      if (!booking || booking.ownerId !== userId) return json({ error: "A foglalás nem található." }, 404);
      const body = await context.request.json<any>().catch(() => ({}));
      const ownerAction = safeText(body.action, 30);
      const note = safeText(body.note, 800);
      const now = new Date().toISOString();
      const links = buildAppointmentLinks("VEHICLE_VIEWING", booking.id);
      const isTd = booking.bookingKind === "TEST_DRIVE";

      if (ownerAction === "APPROVE") {
        // Prevent accidental double approval on the exact same slot/time (#42)
        const allBookings = await listJsonPrefix<any>(env, BOOKING_PREFIX);
        const alreadyApproved = allBookings.some(
          (b) =>
            b.id !== booking.id &&
            b.vehicleId === booking.vehicleId &&
            b.status === "APPROVED" &&
            ((booking.slotId && b.slotId === booking.slotId) ||
              (b.date === booking.date && b.startTime === booking.startTime)),
        );
        if (alreadyApproved) {
          return json({ error: "Erre az időpontra már visszaigazoltál egy másik érdeklődőt." }, 409);
        }

        booking.status = "APPROVED";
        booking.approvedAt = now;
        booking.locationUnlockedAt = now;
        booking.approvedExactAddress = safeText(body.exactAddress, 240) || booking.approvedExactAddress || undefined;
        booking.approvedMeetingPlace = safeText(body.meetingPlace, 240) || undefined;
        booking.approvedOwnerPhone = safeText(body.ownerPhone, 30) || undefined;
        booking.ownerResponseNote = safeText(body.instructions, 800) || note || undefined;
        booking.updatedAt = now;
        await writeJson(env, `${BOOKING_PREFIX}${bookingId}.json`, booking);

        // Update vehicle approved stats
        const vehicle = await readJson<any>(env, `${VEHICLE_PREFIX}${booking.vehicleId}.json`);
        if (vehicle) {
          vehicle.stats = { ...(vehicle.stats || {}), approvedBookings: Number(vehicle.stats?.approvedBookings || 0) + 1 };
          await writeJson(env, `${VEHICLE_PREFIX}${booking.vehicleId}.json`, vehicle);
        }

        // Exact required notification text (#49) — NEVER exact private street address on lock screen!
        const huDate = formatHuDateDot(booking.date);
        const notifTitle = isTd ? "Tesztvezetésed visszaigazolva!" : "Járműmegtekintésed visszaigazolva!";
        const notifBody = `A hirdető elfogadta a ${isTd ? "tesztvezetési" : "megtekintési"} kérelmedet. Jármű: ${booking.vehicleTitle} · Időpont: ${huDate} ${booking.startTime}. A pontos találkozási hely és a további információk elérhetők a foglalásod részleteinél.`;

        await emitUnifiedNotification(
          env,
          booking.requesterId,
          {
            category: "JARMU",
            eventType: "APPOINTMENT_CONFIRMED",
            title: notifTitle,
            body: notifBody,
            appointmentId: booking.id,
            appointmentType: "VEHICLE_VIEWING",
            listingId: booking.vehicleId,
            listingTitle: booking.vehicleTitle,
            coverImage: booking.vehicleCoverImage,
            date: booking.date,
            startTime: booking.startTime,
            shortLocation: booking.vehiclePublicCity,
            deepLink: links.deepLink,
            webUrl: isTd ? "/dashboard/bookings/test-drives" : links.webUrl,
            popupRequired: true,
          },
          { sendPush: true, pushTitle: notifTitle, pushBody: notifBody },
        );

        // Optional SMS to verified phone number (#49)
        const reqPhone = await readJson<any>(env, `${PHONE_PREFIX}${booking.requesterId}.json`);
        if (reqPhone?.phoneVerified && reqPhone?.phone) {
          await sendTwilioSmsIfConfigured(env, reqPhone.phone, `ILOLIT: ${notifTitle} ${notifBody}`);
        }

        return json({ ...booking, role: "owner" });
      }

      if (ownerAction === "PROPOSE_NEW_TIME") {
        const pDate = safeText(body.proposedDate, 10);
        const pStart = safeText(body.proposedStartTime, 5);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(pDate) || !/^\d{2}:\d{2}$/.test(pStart)) {
          return json({ error: "Adj meg érvényes javasolt dátumot és időpontot." }, 400);
        }
        booking.status = "PROPOSED_NEW_TIME";
        booking.proposedDate = pDate;
        booking.proposedStartTime = pStart;
        booking.proposedEndTime = addMinutes(pStart, booking.durationMinutes || 30);
        booking.proposedNote = note || undefined;
        booking.updatedAt = now;
        await writeJson(env, `${BOOKING_PREFIX}${bookingId}.json`, booking);

        await emitUnifiedNotification(env, booking.requesterId, {
          category: "JARMU",
          eventType: "APPOINTMENT_PROPOSED_NEW_TIME",
          title: "Másik időpont javasolva",
          body: `A hirdető másik időpontot javasolt (${formatHuDateDot(pDate)} ${pStart}) – ${booking.vehicleTitle}.`,
          appointmentId: booking.id,
          appointmentType: "VEHICLE_VIEWING",
          listingId: booking.vehicleId,
          listingTitle: booking.vehicleTitle,
          coverImage: booking.vehicleCoverImage,
          date: pDate,
          startTime: pStart,
          shortLocation: booking.vehiclePublicCity,
          deepLink: links.deepLink,
          webUrl: isTd ? "/dashboard/bookings/test-drives" : links.webUrl,
          popupRequired: true,
        });
        return json({ ...booking, role: "owner" });
      }

      if (ownerAction === "REJECT" || ownerAction === "REVOKE") {
        booking.status = ownerAction === "REVOKE" ? "REVOKED_BY_OWNER" : "REJECTED";
        booking.ownerResponseNote = note || undefined;
        booking.updatedAt = now;
        await writeJson(env, `${BOOKING_PREFIX}${bookingId}.json`, booking);

        await emitUnifiedNotification(env, booking.requesterId, {
          category: "JARMU",
          eventType: ownerAction === "REVOKE" ? "APPOINTMENT_CANCELLED" : "APPOINTMENT_REJECTED",
          title: ownerAction === "REVOKE" ? "Időpont lemondva" : "Kérelem elutasítva",
          body: `A hirdető ${ownerAction === "REVOKE" ? "lemondta" : "elutasította"} a(z) ${formatHuDateDot(booking.date)} ${booking.startTime} időpontot (${booking.vehicleTitle}).`,
          appointmentId: booking.id,
          appointmentType: "VEHICLE_VIEWING",
          listingId: booking.vehicleId,
          listingTitle: booking.vehicleTitle,
          coverImage: booking.vehicleCoverImage,
          date: booking.date,
          startTime: booking.startTime,
          shortLocation: booking.vehiclePublicCity,
          deepLink: links.deepLink,
          webUrl: isTd ? "/dashboard/bookings/test-drives" : links.webUrl,
          popupRequired: true,
        });
        return json({ ...booking, role: "owner" });
      }

      if (ownerAction === "COMPLETE" || ownerAction === "NO_SHOW") {
        booking.status = ownerAction === "NO_SHOW" ? "NO_SHOW" : "COMPLETED";
        booking.ownerResponseNote = note || booking.ownerResponseNote;
        booking.updatedAt = now;
        await writeJson(env, `${BOOKING_PREFIX}${bookingId}.json`, booking);
        return json({ ...booking, role: "owner" });
      }

      return json({ error: "Érvénytelen művelet." }, 400);
    }

    if (method === "PATCH" && bookingId && action === "accept-proposal") {
      const booking = await readJson<any>(env, `${BOOKING_PREFIX}${bookingId}.json`);
      if (!booking || booking.requesterId !== userId) return json({ error: "A foglalás nem található." }, 404);
      if (booking.status !== "PROPOSED_NEW_TIME" || !booking.proposedDate || !booking.proposedStartTime) {
        return json({ error: "Nincs elfogadható új időpont-javaslat." }, 409);
      }
      const now = new Date().toISOString();
      booking.date = booking.proposedDate;
      booking.startTime = booking.proposedStartTime;
      booking.endTime = booking.proposedEndTime || addMinutes(booking.proposedStartTime, booking.durationMinutes || 30);
      booking.status = "APPROVED";
      booking.approvedAt = now;
      booking.locationUnlockedAt = now;
      booking.updatedAt = now;
      await writeJson(env, `${BOOKING_PREFIX}${bookingId}.json`, booking);

      await emitUnifiedNotification(env, booking.ownerId, {
        category: "JARMU",
        eventType: "APPOINTMENT_CONFIRMED",
        title: "Javasolt időpont elfogadva",
        body: `${booking.requesterName} elfogadta az új időpontot (${formatHuDateDot(booking.date)} ${booking.startTime}) – ${booking.vehicleTitle}.`,
        appointmentId: booking.id,
        appointmentType: "VEHICLE_VIEWING",
        listingId: booking.vehicleId,
        listingTitle: booking.vehicleTitle,
        date: booking.date,
        startTime: booking.startTime,
        webUrl: `/vehicles/admin/${booking.vehicleId}`,
        popupRequired: true,
      });
      return json({ ...booking, role: "requester" });
    }

    if (method === "PATCH" && bookingId && action === "cancel") {
      const booking = await readJson<any>(env, `${BOOKING_PREFIX}${bookingId}.json`);
      if (!booking || (booking.requesterId !== userId && booking.ownerId !== userId)) {
        return json({ error: "A foglalás nem található." }, 404);
      }
      const isOwner = booking.ownerId === userId;
      booking.status = isOwner ? "REVOKED_BY_OWNER" : "CANCELLED_BY_REQUESTER";
      booking.updatedAt = new Date().toISOString();
      await writeJson(env, `${BOOKING_PREFIX}${bookingId}.json`, booking);

      await emitUnifiedNotification(env, isOwner ? booking.requesterId : booking.ownerId, {
        category: "JARMU",
        eventType: "APPOINTMENT_CANCELLED",
        title: "Járműfoglalás lemondva",
        body: `${isOwner ? "A hirdető" : booking.requesterName} lemondta a(z) ${formatHuDateDot(booking.date)} ${booking.startTime} időpontot (${booking.vehicleTitle}).`,
        appointmentId: booking.id,
        appointmentType: "VEHICLE_VIEWING",
        listingId: booking.vehicleId,
        listingTitle: booking.vehicleTitle,
        date: booking.date,
        startTime: booking.startTime,
        webUrl: isOwner ? "/dashboard/bookings/vehicles" : `/vehicles/admin/${booking.vehicleId}`,
        popupRequired: true,
      });
      return json({ ...booking, role: isOwner ? "owner" : "requester" });
    }

    if (method === "DELETE" && bookingId && !action) {
      const booking = await readJson<any>(env, `${BOOKING_PREFIX}${bookingId}.json`);
      if (!booking || (booking.ownerId !== userId && booking.requesterId !== userId)) {
        return json({ error: "A foglalás nem található." }, 404);
      }
      if (booking.ownerId === userId) booking.hiddenByOwner = true;
      if (booking.requesterId === userId) booking.hiddenByRequester = true;
      booking.updatedAt = new Date().toISOString();
      await writeJson(env, `${BOOKING_PREFIX}${bookingId}.json`, booking);
      return json({ deleted: true, id: bookingId });
    }
  }

  // =========================================================================
  // 5. VEHICLE LISTINGS CRUD, SEARCH, FAVORITES, SLOTS & MESSAGES
  // =========================================================================

  // GET /api/vehicles (Full Hungarian marketplace search & filter)
  if (method === "GET" && route.length === 0) {
    const url = new URL(context.request.url);
    const mine = url.searchParams.get("mine") === "true";
    const favoritesOnly = url.searchParams.get("favoritesOnly") === "true";
    const category = url.searchParams.get("category") || "";
    const collection = url.searchParams.get("collection") || "";
    const q = normalizeStr(url.searchParams.get("q") || "");
    const brands = (url.searchParams.get("brands") || "").split(",").map(normalizeStr).filter(Boolean);
    const models = (url.searchParams.get("models") || "").split(",").map(normalizeStr).filter(Boolean);
    const typeVariant = normalizeStr(url.searchParams.get("typeVariant") || "");
    const bodyType = normalizeStr(url.searchParams.get("bodyType") || "");
    const factoryDesig = normalizeStr(url.searchParams.get("factoryBodyDesignation") || "");
    const fuelTypes = (url.searchParams.get("fuelTypes") || "").split(",").filter(Boolean);
    const transmissions = (url.searchParams.get("transmissions") || "").split(",").filter(Boolean);
    const driveType = url.searchParams.get("driveType") || "";
    const climateType = url.searchParams.get("climateType") || "";
    const euroClass = url.searchParams.get("euroClass") || "";
    const condition = url.searchParams.get("condition") || "";
    const documentStatus = url.searchParams.get("documentStatus") || "";
    const sellerType = url.searchParams.get("sellerType") || "";
    const yearMin = safeNum(url.searchParams.get("yearMin"));
    const yearMax = safeNum(url.searchParams.get("yearMax"));
    const priceMin = safeNum(url.searchParams.get("priceMin"));
    const priceMax = safeNum(url.searchParams.get("priceMax"));
    const mileageMin = safeNum(url.searchParams.get("mileageMin"));
    const mileageMax = safeNum(url.searchParams.get("mileageMax"));
    const powerMinHp = safeNum(url.searchParams.get("powerMinHp"));
    const powerMaxHp = safeNum(url.searchParams.get("powerMaxHp"));
    const ccMin = safeNum(url.searchParams.get("ccMin"));
    const ccMax = safeNum(url.searchParams.get("ccMax"));
    const evRangeMinKm = safeNum(url.searchParams.get("evRangeMinKm"));
    const evBatterySohMin = safeNum(url.searchParams.get("evBatterySohMin"));
    const equipment = (url.searchParams.get("equipment") || "").split(",").filter(Boolean);
    const hasServiceBook = url.searchParams.get("hasServiceBook") === "true";
    const hasWarranty = url.searchParams.get("hasWarranty") === "true";
    const hasDocuments = url.searchParams.get("hasDocuments") === "true";
    const viewableWhen = url.searchParams.get("viewableWhen") || "";
    const sort = url.searchParams.get("sort") || "newest";

    const [allVehicles, allBookings, favArr] = await Promise.all([
      listJsonPrefix<any>(env, VEHICLE_PREFIX),
      listJsonPrefix<any>(env, BOOKING_PREFIX),
      userId ? readJson<string[]>(env, `${FAVORITE_PREFIX}${userId}.json`) : Promise.resolve([]),
    ]);
    const favSet = new Set(favArr || []);
    const occupiedMap = new Map<string, Set<string>>();
    for (const b of allBookings) {
      if (b.slotId && ["PENDING", "APPROVED"].includes(b.status)) {
        if (!occupiedMap.has(b.vehicleId)) occupiedMap.set(b.vehicleId, new Set());
        occupiedMap.get(b.vehicleId)!.add(b.slotId);
      }
    }

    const todayIso = new Date().toISOString().slice(0, 10);
    const tomorrowIso = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    const weekEndIso = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);

    const filtered = allVehicles.filter((v) => {
      if (v.status === "DELETED") return false;
      if (mine) return Boolean(userId && v.ownerId === userId);
      if (v.status !== "ACTIVE") return false;
      if (favoritesOnly && !favSet.has(v.id)) return false;
      if (category && v.category !== category) return false;
      if (collection) {
        const cols: string[] = Array.isArray(v.collections) ? v.collections : [];
        const autoMatch =
          cols.includes(collection) ||
          (collection === "electric" && v.fuelType === "elektromos") ||
          (collection === "hybrid" &&
            ["hibrid_benzin", "hibrid_dizel", "enyhe_hibrid", "teljes_hibrid", "plug_in_hibrid"].includes(v.fuelType)) ||
          (collection === "new" && v.condition === "uj") ||
          (collection === "used" && v.condition !== "uj") ||
          (collection === "damaged" && ["serult", "motorhibas", "valtohibas", "uzemkeptelen"].includes(v.condition)) ||
          (collection === "warranty" && Boolean(v.pricing?.warrantyMonths || v.history?.warranty)) ||
          (collection === "rentable" && Boolean(v.pricing?.rentable)) ||
          (collection === "veteran" && Number(v.manufactureYear || 9999) <= new Date().getFullYear() - 30);
        if (!autoMatch) return false;
      }
      if (brands.length > 0 && !brands.some((b) => normalizeStr(v.brand || "").includes(b) || b.includes(normalizeStr(v.brand || "")))) return false;
      if (models.length > 0 && !models.some((m) => normalizeStr(`${v.model || ""} ${v.typeVariant || ""}`).includes(m))) return false;
      if (typeVariant && !normalizeStr(`${v.typeVariant || ""} ${v.generation || ""}`).includes(typeVariant)) return false;
      if (bodyType && normalizeStr(v.bodyType || "") !== bodyType) return false;
      if (factoryDesig && !normalizeStr(`${v.factoryBodyDesignation || ""} ${v.title || ""} ${v.typeVariant || ""}`).includes(factoryDesig)) return false;
      if (fuelTypes.length > 0 && !fuelTypes.includes(v.fuelType)) return false;
      if (transmissions.length > 0 && !transmissions.includes(v.transmission)) return false;
      if (driveType && v.driveType !== driveType) return false;
      if (climateType && v.climateType !== climateType) return false;
      if (euroClass && v.euroClass !== euroClass) return false;
      if (condition && v.condition !== condition) return false;
      if (documentStatus && v.history?.documentStatus !== documentStatus) return false;
      if (sellerType && v.sellerType !== sellerType) return false;
      if (yearMin !== null && Number(v.manufactureYear || 0) < yearMin) return false;
      if (yearMax !== null && Number(v.manufactureYear || 9999) > yearMax) return false;
      const price = Number(v.pricing?.priceHuf || 0);
      if (priceMin !== null && price < priceMin) return false;
      if (priceMax !== null && price > priceMax) return false;
      const km = v.mileageKm !== null && v.mileageKm !== undefined ? Number(v.mileageKm) : null;
      if (mileageMin !== null && (km === null || km < mileageMin)) return false;
      if (mileageMax !== null && km !== null && km > mileageMax) return false;
      const hp = Number(v.systemPowerHp || v.powerHp || 0);
      if (powerMinHp !== null && hp < powerMinHp) return false;
      if (powerMaxHp !== null && hp > powerMaxHp) return false;
      const cc = Number(v.displacementCc || 0);
      if (ccMin !== null && cc < ccMin) return false;
      if (ccMax !== null && cc > ccMax) return false;
      if (evRangeMinKm !== null && Number(v.evSpecs?.wltpRangeKm || 0) < evRangeMinKm) return false;
      if (evBatterySohMin !== null && Number(v.evSpecs?.batterySohPercent || 0) < evBatterySohMin) return false;
      if (hasServiceBook && !v.history?.hasServiceBook && !v.history?.hasDigitalServiceBook) return false;
      if (hasWarranty && !v.pricing?.warrantyMonths && !v.history?.warranty) return false;
      if (hasDocuments && (!Array.isArray(v.documents) || v.documents.length === 0) && !v.history?.hasJszpReport) return false;
      if (equipment.length > 0) {
        const eqSet = new Set(Array.isArray(v.equipment) ? v.equipment : []);
        if (!equipment.every((id) => eqSet.has(id))) return false;
      }
      if (viewableWhen) {
        const occ = occupiedMap.get(v.id) || new Set<string>();
        const openSlots = (v.viewingSlots || []).filter((s: any) => !s.isBlocked && s.date >= todayIso && !occ.has(s.id));
        if (viewableWhen === "today" && !openSlots.some((s: any) => s.date === todayIso)) return false;
        if (viewableWhen === "tomorrow" && !openSlots.some((s: any) => s.date === tomorrowIso)) return false;
        if (viewableWhen === "week" && !openSlots.some((s: any) => s.date >= todayIso && s.date <= weekEndIso)) return false;
        if (viewableWhen === "online_booking" && openSlots.length === 0) return false;
        if (viewableWhen === "test_drive" && !v.testDriveSettings?.enabled) return false;
      }
      if (q) {
        const hay = normalizeStr(
          [v.title, v.brand, v.model, v.typeVariant, v.generation, v.factoryBodyDesignation, v.trimLevel, v.engineVariant, v.description, v.publicLocation?.city, v.listingCode]
            .filter(Boolean)
            .join(" "),
        );
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    // Sort (featured listings prioritized when sorting by newest)
    filtered.sort((a, b) => {
      if (sort === "price_asc") return Number(a.pricing?.priceHuf || 0) - Number(b.pricing?.priceHuf || 0);
      if (sort === "price_desc") return Number(b.pricing?.priceHuf || 0) - Number(a.pricing?.priceHuf || 0);
      if (sort === "year_desc") return Number(b.manufactureYear || 0) - Number(a.manufactureYear || 0);
      if (sort === "year_asc") return Number(a.manufactureYear || 0) - Number(b.manufactureYear || 0);
      if (sort === "mileage_asc") return Number(a.mileageKm ?? 9_999_999) - Number(b.mileageKm ?? 9_999_999);
      if (sort === "brand_asc") return String(a.brand || "").localeCompare(String(b.brand || ""), "hu");
      const featDiff = (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
      if (featDiff !== 0) return featDiff;
      return String(b.createdAt).localeCompare(String(a.createdAt));
    });

    const items = filtered.map((v) =>
      sanitizeVehicleForViewer(v, userId, occupiedMap.get(v.id) || new Set(), favSet),
    );
    return json({ items, total: items.length });
  }

  // POST /api/vehicles (Create new listing or draft)
  if (method === "POST" && route.length === 0) {
    if (!userId) return json({ error: "A hirdetésfeladáshoz jelentkezz be." }, 401);
    const body = await context.request.json<any>().catch(() => ({}));
    const brand = safeText(body.brand, 80);
    const model = safeText(body.model, 80);
    const title = safeText(body.title, 180) || `${brand} ${model} ${safeText(body.typeVariant, 60)}`.trim();
    if (!brand || !model) return json({ error: "A márka és a modell megadása kötelező." }, 400);

    const comboErr = validateServerCombination(body);
    if (comboErr) return json({ error: comboErr }, 400);

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const pricingCfg = (await readJson<any>(env, PRICING_CONFIG_KEY)) || defaultPricingConfig();
    const durationDays = Number(pricingCfg.defaultDurationDays || 30);
    const priceHuf = Math.max(0, Math.round(Number(body.pricing?.priceHuf || 0)));
    const publish = body.publish === true;
    const initialStatus = publish ? (pricingCfg.enabled ? "PAYMENT_PENDING" : "ACTIVE") : "DRAFT";

    const lat = safeNum(body.protectedLocation?.latitude ?? body.publicLocation?.approxLatitude);
    const lng = safeNum(body.protectedLocation?.longitude ?? body.publicLocation?.approxLongitude);
    const approx = approximateCoords(id, lat, lng);

    const listing = {
      id,
      listingCode: `ILV-${new Date().getFullYear()}-${String(Math.floor(10000 + Math.random() * 89999))}`,
      ownerId: userId,
      ownerName: safeText(body.ownerName, 120) || "ILOLIT hirdető",
      sellerType:
        body.sellerType === "dealer" || body.sellerType === "verified_business" ? body.sellerType : "private",
      dealerCompanyName: safeText(body.dealerCompanyName, 140) || undefined,
      category: safeText(body.category, 40) || "passenger_car",
      collections: Array.isArray(body.collections) ? body.collections.slice(0, 10) : [],
      brand,
      model,
      typeVariant: safeText(body.typeVariant, 100),
      generation: safeText(body.generation, 40) || undefined,
      factoryBodyDesignation: safeText(body.factoryBodyDesignation, 60) || undefined,
      bodyType: safeText(body.bodyType, 60) || "Egyéb",
      trimLevel: safeText(body.trimLevel, 60) || undefined,
      manufactureYear: Math.round(Number(body.manufactureYear || new Date().getFullYear())),
      modelYear: safeNum(body.modelYear),
      firstRegistration: safeText(body.firstRegistration, 20) || undefined,
      mileageKm: safeNum(body.mileageKm),
      condition: safeText(body.condition, 40) || "megkimelt",
      doors: safeNum(body.doors),
      seats: safeNum(body.seats),
      exteriorColor: safeText(body.exteriorColor, 40) || undefined,
      interiorColor: safeText(body.interiorColor, 40) || undefined,
      upholstery: safeText(body.upholstery, 40) || undefined,
      metallicPaint: Boolean(body.metallicPaint),
      curbWeightKg: safeNum(body.curbWeightKg),
      grossWeightKg: safeNum(body.grossWeightKg),
      trunkVolumeL: safeNum(body.trunkVolumeL),
      fuelTankL: safeNum(body.fuelTankL),
      fuelType: safeText(body.fuelType, 40) || "benzin",
      powertrainSystem: safeText(body.powertrainSystem, 40) || "belsoegesu",
      engineVariant: safeText(body.engineVariant, 80) || undefined,
      engineCode: safeText(body.engineCode, 40) || undefined,
      displacementCc: safeNum(body.displacementCc),
      powerKw: safeNum(body.powerKw),
      powerHp: safeNum(body.powerHp),
      systemPowerKw: safeNum(body.systemPowerKw),
      systemPowerHp: safeNum(body.systemPowerHp),
      cylinders: safeNum(body.cylinders),
      transmission: safeText(body.transmission, 40) || "manualis",
      gearsCount: safeNum(body.gearsCount),
      driveType: safeText(body.driveType, 40) || "",
      climateType: safeText(body.climateType, 40) || "",
      euroClass: safeText(body.euroClass, 40) || undefined,
      factoryConsumptionL: safeNum(body.factoryConsumptionL),
      co2EmissionsGkm: safeNum(body.co2EmissionsGkm),
      evSpecs: body.evSpecs && typeof body.evSpecs === "object" ? body.evSpecs : undefined,
      categorySpecs: body.categorySpecs && typeof body.categorySpecs === "object" ? body.categorySpecs : undefined,
      conditionDeclarations:
        body.conditionDeclarations && typeof body.conditionDeclarations === "object" ? body.conditionDeclarations : {},
      history: body.history && typeof body.history === "object" ? body.history : { documentStatus: "ervenyes_magyar" },
      equipment: Array.isArray(body.equipment) ? body.equipment.slice(0, 150) : [],
      pricing: {
        priceHuf,
        netPriceHuf: safeNum(body.pricing?.netPriceHuf),
        grossPriceHuf: safeNum(body.pricing?.grossPriceHuf),
        vatStatus: safeText(body.pricing?.vatStatus, 40) || "maganszemely",
        negotiable: Boolean(body.pricing?.negotiable),
        tradeInPossible: Boolean(body.pricing?.tradeInPossible),
        exchangePossible: Boolean(body.pricing?.exchangePossible),
        financingAvailable: Boolean(body.pricing?.financingAvailable),
        warrantyMonths: safeNum(body.pricing?.warrantyMonths),
        promotionalPriceHuf: safeNum(body.pricing?.promotionalPriceHuf),
        originalPriceHuf: safeNum(body.pricing?.originalPriceHuf),
        rentable: Boolean(body.pricing?.rentable),
        dailyRentHuf: safeNum(body.pricing?.dailyRentHuf),
      },
      priceHistory: priceHuf > 0 ? [{ price: priceHuf, changedAt: now }] : [],
      title,
      description: safeText(body.description, 8000),
      photos: Array.isArray(body.photos) ? body.photos.slice(0, 30) : [],
      videoUrl: safeText(body.videoUrl, 600) || undefined,
      documents: Array.isArray(body.documents) ? body.documents.slice(0, 15) : [],
      publicLocation: {
        country: "Magyarország",
        postalCode: safeText(body.publicLocation?.postalCode, 12),
        city: safeText(body.publicLocation?.city, 80) || "Budapest",
        district: safeText(body.publicLocation?.district, 60) || undefined,
        neighborhood: safeText(body.publicLocation?.neighborhood, 80) || undefined,
        approxLatitude: approx.approxLatitude,
        approxLongitude: approx.approxLongitude,
        publicDealershipAddress:
          body.sellerType !== "private" ? safeText(body.publicLocation?.publicDealershipAddress, 200) || undefined : undefined,
      },
      protectedLocation: {
        exactAddress: safeText(body.protectedLocation?.exactAddress, 240),
        meetingPlace: safeText(body.protectedLocation?.meetingPlace, 240) || undefined,
        instructions: safeText(body.protectedLocation?.instructions, 800) || undefined,
        latitude: lat,
        longitude: lng,
      },
      ownerPhoneShareMode:
        body.ownerPhoneShareMode === "approved_only" || body.ownerPhoneShareMode === "public_dealer"
          ? body.ownerPhoneShareMode
          : "none",
      ownerPhone: body.ownerPhoneShareMode !== "none" ? safeText(body.ownerPhone, 30) : "",
      inquiryPreferences: {
        acceptDealerPurchaseOffers: Boolean(body.inquiryPreferences?.acceptDealerPurchaseOffers),
        acceptConsignmentOffers: Boolean(body.inquiryPreferences?.acceptConsignmentOffers),
        acceptBrokerServiceOffers: Boolean(body.inquiryPreferences?.acceptBrokerServiceOffers),
        noUnsolicitedCommercial: body.inquiryPreferences?.noUnsolicitedCommercial !== false,
      },
      testDriveSettings: {
        enabled: Boolean(body.testDriveSettings?.enabled),
        durationMinutes: Math.max(15, Math.min(120, Number(body.testDriveSettings?.durationMinutes || 30))),
        requiredLicenseCategory: safeText(body.testDriveSettings?.requiredLicenseCategory, 20) || "B",
        sellerPresentRequired: body.testDriveSettings?.sellerPresentRequired !== false,
        licenseInspectionOnSite: body.testDriveSettings?.licenseInspectionOnSite !== false,
        additionalConditions: safeText(body.testDriveSettings?.additionalConditions, 500) || undefined,
      },
      viewingSlots: Array.isArray(body.viewingSlots) ? body.viewingSlots.slice(0, 80) : [],
      isFeatured: Boolean(body.isFeatured),
      status: initialStatus,
      stats: { views: 0, favorites: 0, viewingRequests: 0, testDriveRequests: 0, approvedBookings: 0, messages: 0 },
      createdAt: now,
      updatedAt: now,
      expiresAt: initialStatus === "ACTIVE" ? new Date(Date.now() + durationDays * 86_400_000).toISOString() : undefined,
    };

    await writeJson(env, `${VEHICLE_PREFIX}${id}.json`, listing);
    return json(sanitizeVehicleForViewer(listing, userId, new Set()), 201);
  }

  const vehicleId = route[0];
  const sub = route[1];
  const subId = route[2];

  // GET /api/vehicles/:id
  if (method === "GET" && vehicleId && !sub) {
    const vehicle = await readJson<any>(env, `${VEHICLE_PREFIX}${vehicleId}.json`);
    if (!vehicle || vehicle.status === "DELETED") return json({ error: "A járműhirdetés nem található." }, 404);
    if (vehicle.status !== "ACTIVE" && vehicle.ownerId !== userId) {
      return json({ error: "A hirdetés jelenleg nem nyilvános." }, 404);
    }

    if (vehicle.ownerId !== userId) {
      vehicle.stats = { ...(vehicle.stats || {}), views: Number(vehicle.stats?.views || 0) + 1 };
      await writeJson(env, `${VEHICLE_PREFIX}${vehicleId}.json`, vehicle);
    }

    const [allBookings, favArr] = await Promise.all([
      listJsonPrefix<any>(env, BOOKING_PREFIX),
      userId ? readJson<string[]>(env, `${FAVORITE_PREFIX}${userId}.json`) : Promise.resolve([]),
    ]);
    const occupied = new Set(
      allBookings
        .filter((b) => b.vehicleId === vehicleId && b.slotId && ["PENDING", "APPROVED"].includes(b.status))
        .map((b) => b.slotId),
    );
    return json(sanitizeVehicleForViewer(vehicle, userId, occupied, new Set(favArr || [])));
  }

  // PATCH /api/vehicles/:id (Owner edits + real price drop logging & alerts!)
  if (method === "PATCH" && vehicleId && !sub) {
    if (!userId) return json({ error: "Bejelentkezés szükséges." }, 401);
    const existing = await readJson<any>(env, `${VEHICLE_PREFIX}${vehicleId}.json`);
    if (!existing || existing.status === "DELETED") return json({ error: "A hirdetés nem található." }, 404);
    if (existing.ownerId !== userId) return json({ error: "Nincs jogosultságod." }, 403);

    const body = await context.request.json<any>().catch(() => ({}));
    const mergedForCheck = { ...existing, ...body };
    const comboErr = validateServerCombination(mergedForCheck);
    if (comboErr) return json({ error: comboErr }, 400);

    const now = new Date().toISOString();
    const prevPrice = Number(existing.pricing?.priceHuf || 0);
    const nextPrice =
      body.pricing?.priceHuf !== undefined ? Math.max(0, Math.round(Number(body.pricing.priceHuf) || 0)) : prevPrice;
    const priceHistory = Array.isArray(existing.priceHistory) ? [...existing.priceHistory] : [];
    if (nextPrice > 0 && nextPrice !== prevPrice) {
      priceHistory.push({ price: nextPrice, changedAt: now });
    }

    const updated = {
      ...existing,
      ...body,
      id: existing.id,
      ownerId: existing.ownerId,
      listingCode: existing.listingCode,
      pricing: { ...(existing.pricing || {}), ...(body.pricing || {}), priceHuf: nextPrice },
      priceHistory,
      updatedAt: now,
    };

    if (body.publish === true && updated.status === "DRAFT") {
      const pricingCfg = (await readJson<any>(env, PRICING_CONFIG_KEY)) || defaultPricingConfig();
      updated.status = pricingCfg.enabled ? "PAYMENT_PENDING" : "ACTIVE";
      if (updated.status === "ACTIVE") {
        updated.expiresAt = new Date(Date.now() + Number(pricingCfg.defaultDurationDays || 30) * 86_400_000).toISOString();
      }
    }

    await writeJson(env, `${VEHICLE_PREFIX}${vehicleId}.json`, updated);

    // Emit real price-drop notification to every user who favorited this vehicle (#52)
    if (prevPrice > 0 && nextPrice > 0 && nextPrice < prevPrice) {
      const favListed = await env.MEDIA_BUCKET.list({ prefix: FAVORITE_PREFIX, limit: 500 });
      await Promise.allSettled(
        favListed.objects.map(async (obj) => {
          const watcherId = obj.key.replace(FAVORITE_PREFIX, "").replace(/\.json$/, "");
          if (!watcherId || watcherId === userId) return;
          const favs = (await readJson<string[]>(env, obj.key)) || [];
          if (!favs.includes(vehicleId)) return;
          await emitUnifiedNotification(env, watcherId, {
            category: "JARMU",
            eventType: "APPOINTMENT_CONFIRMED",
            title: "A figyelt jármű ára csökkent.",
            body: `${updated.title} – Korábbi ár: ${prevPrice.toLocaleString("hu-HU")} Ft · Új ár: ${nextPrice.toLocaleString("hu-HU")} Ft`,
            listingId: updated.id,
            listingTitle: updated.title,
            coverImage: updated.photos?.[0]?.url || "",
            webUrl: `/vehicles/${updated.id}`,
            popupRequired: false,
            dedupeKey: `vprice:${updated.id}:${nextPrice}`,
          });
        }),
      );
    }

    return json(sanitizeVehicleForViewer(updated, userId, new Set()));
  }

  // PATCH /api/vehicles/:id/status
  if (method === "PATCH" && vehicleId && sub === "status") {
    if (!userId) return json({ error: "Bejelentkezés szükséges." }, 401);
    const existing = await readJson<any>(env, `${VEHICLE_PREFIX}${vehicleId}.json`);
    if (!existing || existing.ownerId !== userId) return json({ error: "Nincs jogosultságod." }, 403);
    const body = await context.request.json<any>().catch(() => ({}));
    const nextStatus = safeText(body.status, 30);
    if (!["DRAFT", "PAYMENT_PENDING", "ACTIVE", "PAUSED", "SOLD", "EXPIRED", "DELETED"].includes(nextStatus)) {
      return json({ error: "Érvénytelen státusz." }, 400);
    }
    existing.status = nextStatus;
    existing.updatedAt = new Date().toISOString();
    await writeJson(env, `${VEHICLE_PREFIX}${vehicleId}.json`, existing);
    return json(sanitizeVehicleForViewer(existing, userId, new Set()));
  }

  // POST /api/vehicles/:id/activate
  if (method === "POST" && vehicleId && sub === "activate") {
    if (!userId) return json({ error: "Bejelentkezés szükséges." }, 401);
    const existing = await readJson<any>(env, `${VEHICLE_PREFIX}${vehicleId}.json`);
    if (!existing || existing.ownerId !== userId) return json({ error: "Nincs jogosultságod." }, 403);
    const pricingCfg = (await readJson<any>(env, PRICING_CONFIG_KEY)) || defaultPricingConfig();
    existing.status = "ACTIVE";
    existing.expiresAt = new Date(Date.now() + Number(pricingCfg.defaultDurationDays || 30) * 86_400_000).toISOString();
    existing.updatedAt = new Date().toISOString();
    await writeJson(env, `${VEHICLE_PREFIX}${vehicleId}.json`, existing);
    return json(sanitizeVehicleForViewer(existing, userId, new Set()));
  }

  // POST /api/vehicles/:id/favorite
  if (method === "POST" && vehicleId && sub === "favorite") {
    if (!userId) return json({ error: "Bejelentkezés szükséges." }, 401);
    const vehicle = await readJson<any>(env, `${VEHICLE_PREFIX}${vehicleId}.json`);
    if (!vehicle) return json({ error: "A jármű nem található." }, 404);
    const favKey = `${FAVORITE_PREFIX}${userId}.json`;
    const favSet = new Set((await readJson<string[]>(env, favKey)) || []);
    let favorited = false;
    if (favSet.has(vehicleId)) {
      favSet.delete(vehicleId);
      vehicle.stats = { ...(vehicle.stats || {}), favorites: Math.max(0, Number(vehicle.stats?.favorites || 0) - 1) };
    } else {
      favSet.add(vehicleId);
      favorited = true;
      vehicle.stats = { ...(vehicle.stats || {}), favorites: Number(vehicle.stats?.favorites || 0) + 1 };
    }
    await Promise.all([
      writeJson(env, favKey, [...favSet]),
      writeJson(env, `${VEHICLE_PREFIX}${vehicleId}.json`, vehicle),
    ]);
    return json({ favorited, favoritesCount: vehicle.stats.favorites });
  }

  // SLOTS: POST/PATCH/DELETE /api/vehicles/:id/slots (Viewing & Test Drive separately)
  if (vehicleId && sub === "slots") {
    if (!userId) return json({ error: "Bejelentkezés szükséges." }, 401);
    const vehicle = await readJson<any>(env, `${VEHICLE_PREFIX}${vehicleId}.json`);
    if (!vehicle || vehicle.ownerId !== userId) return json({ error: "Nincs jogosultságod." }, 403);
    const slots: any[] = Array.isArray(vehicle.viewingSlots) ? [...vehicle.viewingSlots] : [];

    if (method === "POST" && !subId) {
      const body = await context.request.json<any>().catch(() => ({}));
      const toAdd: any[] = [];
      const now = new Date().toISOString();

      if (Array.isArray(body.slots)) {
        for (const item of body.slots.slice(0, 60)) {
          const date = safeText(item.date, 10);
          const startTime = safeText(item.startTime, 5);
          const dur = Math.max(15, Math.min(240, Number(item.durationMinutes || 30)));
          const slotKind = item.slotKind === "TEST_DRIVE" ? "TEST_DRIVE" : "VIEWING";
          if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(startTime)) continue;
          const dup = [...slots, ...toAdd].some((s) => s.date === date && s.startTime === startTime && s.slotKind === slotKind);
          if (!dup) {
            toAdd.push({
              id: crypto.randomUUID(),
              date,
              startTime,
              endTime: addMinutes(startTime, dur),
              durationMinutes: dur,
              slotKind,
              isBlocked: false,
              note: safeText(item.note, 200) || undefined,
              createdAt: now,
            });
          }
        }
      }

      if (body.recurring && typeof body.recurring === "object") {
        const r = body.recurring;
        const startDate = safeText(r.startDate, 10);
        const endDate = safeText(r.endDate, 10);
        const weekdays: number[] = Array.isArray(r.weekdays) ? r.weekdays.map(Number) : [1, 2, 3, 4, 5];
        const ws = safeText(r.windowStart, 5);
        const we = safeText(r.windowEnd, 5);
        const dur = Math.max(15, Math.min(240, Number(r.durationMinutes || 30)));
        const slotKind = r.slotKind === "TEST_DRIVE" ? "TEST_DRIVE" : "VIEWING";
        if (/^\d{4}-\d{2}-\d{2}$/.test(startDate) && /^\d{4}-\d{2}-\d{2}$/.test(endDate) && /^\d{2}:\d{2}$/.test(ws) && /^\d{2}:\d{2}$/.test(we)) {
          const cur = new Date(`${startDate}T12:00:00Z`);
          const endDt = new Date(`${endDate}T12:00:00Z`);
          const [wsH, wsM] = ws.split(":").map(Number);
          const [weH, weM] = we.split(":").map(Number);
          let guard = 0;
          while (cur <= endDt && guard < 45 && toAdd.length < 80) {
            guard += 1;
            if (weekdays.includes(cur.getUTCDay())) {
              const dateStr = cur.toISOString().slice(0, 10);
              for (let m = wsH * 60 + wsM; m + dur <= weH * 60 + weM && toAdd.length < 80; m += dur) {
                const st = `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
                const dup = [...slots, ...toAdd].some((s) => s.date === dateStr && s.startTime === st && s.slotKind === slotKind);
                if (!dup) {
                  toAdd.push({
                    id: crypto.randomUUID(),
                    date: dateStr,
                    startTime: st,
                    endTime: addMinutes(st, dur),
                    durationMinutes: dur,
                    slotKind,
                    isBlocked: false,
                    createdAt: now,
                  });
                }
              }
            }
            cur.setUTCDate(cur.getUTCDate() + 1);
          }
        }
      }

      if (toAdd.length === 0) return json({ error: "Nem sikerült új idősávot hozzáadni." }, 400);
      const merged = [...slots, ...toAdd].sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`));
      vehicle.viewingSlots = merged;
      vehicle.updatedAt = now;
      await writeJson(env, `${VEHICLE_PREFIX}${vehicleId}.json`, vehicle);
      return json({ viewingSlots: merged, addedCount: toAdd.length }, 201);
    }

    if (method === "PATCH" && subId) {
      const body = await context.request.json<any>().catch(() => ({}));
      vehicle.viewingSlots = slots.map((s) => (s.id === subId ? { ...s, isBlocked: Boolean(body.isBlocked) } : s));
      vehicle.updatedAt = new Date().toISOString();
      await writeJson(env, `${VEHICLE_PREFIX}${vehicleId}.json`, vehicle);
      return json({ viewingSlots: vehicle.viewingSlots });
    }

    if (method === "DELETE" && subId) {
      vehicle.viewingSlots = slots.filter((s) => s.id !== subId);
      vehicle.updatedAt = new Date().toISOString();
      await writeJson(env, `${VEHICLE_PREFIX}${vehicleId}.json`, vehicle);
      return json({ viewingSlots: vehicle.viewingSlots });
    }
  }

  // MESSAGES: GET/POST /api/vehicles/:id/messages
  if (vehicleId && sub === "messages") {
    if (!userId) return json({ error: "Bejelentkezés szükséges." }, 401);
    const vehicle = await readJson<any>(env, `${VEHICLE_PREFIX}${vehicleId}.json`);
    if (!vehicle) return json({ error: "A jármű nem található." }, 404);
    const key = `${MESSAGE_PREFIX}${vehicleId}.json`;
    const allMsgs = (await readJson<any[]>(env, key)) || [];

    if (method === "GET") {
      const visible =
        vehicle.ownerId === userId ? allMsgs : allMsgs.filter((m) => m.senderId === userId || m.recipientId === userId);
      return json({ items: visible });
    }

    if (method === "POST") {
      const body = await context.request.json<any>().catch(() => ({}));
      const text = safeText(body.body, 2000);
      if (!text) return json({ error: "Az üzenet nem lehet üres." }, 400);
      const recipientId = vehicle.ownerId === userId ? safeText(body.recipientId, 120) : vehicle.ownerId;
      if (!recipientId) return json({ error: "Hiányzó címzett." }, 400);
      const msg = {
        id: crypto.randomUUID(),
        vehicleId,
        senderId: userId,
        senderName: safeText(body.senderName, 120) || "Felhasználó",
        recipientId,
        body: text,
        createdAt: new Date().toISOString(),
      };
      await writeJson(env, key, [...allMsgs, msg].slice(-500));
      vehicle.stats = { ...(vehicle.stats || {}), messages: Number(vehicle.stats?.messages || 0) + 1 };
      await writeJson(env, `${VEHICLE_PREFIX}${vehicleId}.json`, vehicle);
      return json(msg, 201);
    }
  }

  return json({ error: "Ismeretlen jármű végpont." }, 404);
};

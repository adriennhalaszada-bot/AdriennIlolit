import { verifyToken } from "@clerk/backend";

interface Env {
  MEDIA_BUCKET: R2Bucket;
  CLERK_SECRET_KEY: string;
}

type Context = EventContext<Env, string, Record<string, unknown>>;
const PREFIX = "data/providers/";

function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
      "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
    },
  });
}

function parts(context: Context): string[] {
  const value = context.params.path;
  return (Array.isArray(value) ? value : typeof value === "string" ? value.split("/") : [])
    .map(String)
    .filter(Boolean);
}

async function userId(request: Request, env: Env): Promise<string | null> {
  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ") || !env.CLERK_SECRET_KEY) return null;
  try {
    const payload = await verifyToken(authorization.slice(7), { secretKey: env.CLERK_SECRET_KEY });
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

async function readProvider(env: Env, id: string): Promise<any | null> {
  const object = await env.MEDIA_BUCKET.get(`${PREFIX}${id}.json`);
  if (!object) return null;
  try {
    return await object.json();
  } catch {
    return null;
  }
}

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function imageUrl(value: unknown): string {
  const url = text(value, 1000);
  return url.startsWith("/api/media/file/") || /^https:\/\//i.test(url) ? url : "";
}

function mediaUrl(value: unknown): string {
  const url = text(value, 1000);
  return url.startsWith("/api/media/file/") || /^https:\/\//i.test(url) ? url : "";
}

function normalize(input: any, id: string, ownerId: string, existing?: any) {
  const now = new Date().toISOString();
  const requestedImages = Array.isArray(input.profileImages)
    ? input.profileImages.map(imageUrl).filter(Boolean).slice(0, 6)
    : [];
  const legacyImage = imageUrl(input.profileImage) || imageUrl(existing?.profileImage);
  const profileImages = requestedImages.length
    ? requestedImages
    : Array.isArray(existing?.profileImages) && existing.profileImages.length
      ? existing.profileImages.map(imageUrl).filter(Boolean).slice(0, 6)
      : legacyImage ? [legacyImage] : [];
  const services = Array.isArray(input.services) ? input.services.slice(0, 100).map((service: any) => ({
    id: text(service.id, 80) || crypto.randomUUID(),
    name: text(service.name, 160),
    description: text(service.description, 1000),
    price: Math.max(0, Math.round(Number(service.price) || 0)),
    durationMinutes: Math.min(1440, Math.max(5, Math.round(Number(service.durationMinutes) || 60))),
    requiresDeposit: Boolean(service.requiresDeposit ?? Number(service.deposit) > 0),
    depositPercentage: Math.min(100, Math.max(0, Math.round(Number(service.depositPercentage) || 0))),
    isAvailable: service.isAvailable !== false,
  })).filter((service: any) => service.name) : existing?.services ?? [];

  const slots = Array.isArray(input.slots) ? input.slots.slice(0, 500).map((slot: any) => ({
    id: text(slot.id, 80) || crypto.randomUUID(),
    day: text(slot.day, 20),
    startTime: text(slot.startTime, 5),
    endTime: text(slot.endTime, 5),
    isAvailable: slot.isAvailable !== false,
  })).filter((slot: any) => slot.day && /^\d{2}:\d{2}$/.test(slot.startTime) && /^\d{2}:\d{2}$/.test(slot.endTime)) : existing?.slots ?? [];

  return {
    id,
    ownerId,
    displayName: text(input.displayName, 160),
    category: text(input.category, 120),
    subCategory: text(input.subCategory, 160),
    city: text(input.city, 100),
    address: text(input.address, 240),
    phone: text(input.phone, 50),
    email: text(input.email, 180),
    bio: text(input.bio, 3000),
    videoUrl: mediaUrl(input.videoUrl),
    profileImage: profileImages[0] || "",
    profileImages,
    publishPortfolio: input.publishPortfolio === true,
    themeId: text(input.themeId, 40) || "emerald",
    services,
    slots,
    subscription: existing?.subscription,
    isPublished: input.isPublished !== false,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

export const onRequest: PagesFunction<Env> = async (rawContext) => {
  const context = rawContext as Context;
  const method = context.request.method.toUpperCase();
  if (method === "OPTIONS") return json(null, 204);
  const route = parts(context);

  if (route[0] === "me") {
    const ownerId = await userId(context.request, context.env);
    if (!ownerId) return json({ error: "A szolgáltatói adatok kezeléséhez jelentkezz be." }, 401);
    const id = `provider_${ownerId}`;
    const existing = await readProvider(context.env, id);

    if (method === "GET") return existing ? json(existing) : json({ id, exists: false }, 404);
    if (method === "PUT") {
      let input: any;
      try { input = await context.request.json(); } catch { return json({ error: "Érvénytelen JSON-adat." }, 400); }
      const provider = normalize(input, id, ownerId, existing);
      if (!provider.displayName || !provider.category || !provider.subCategory || !provider.city || !provider.phone || !provider.email) {
        return json({ error: "A vállalkozás neve, kategóriája, szakterülete, települése, telefonszáma és e-mail-címe kötelező." }, 400);
      }
      if (provider.isPublished && (!provider.services.length || !provider.slots.some((slot: any) => slot.isAvailable))) {
        return json({ error: "Publikáláshoz legalább egy szolgáltatás és egy aktív idősáv szükséges." }, 400);
      }
      const beautySubscriptionRequired = provider.category === "Szépség- és egészségipar";
      const subscriptionActive = provider.subscription?.status === "active" || provider.subscription?.status === "trialing";
      if (provider.isPublished && beautySubscriptionRequired && !subscriptionActive) {
        return json({ error: "A szépségipari profil közzétételéhez aktív előfizetés szükséges." }, 402);
      }
      await context.env.MEDIA_BUCKET.put(`${PREFIX}${id}.json`, JSON.stringify(provider), {
        httpMetadata: { contentType: "application/json" },
        customMetadata: { owner: ownerId, updatedAt: provider.updatedAt },
      });
      return json(provider);
    }
    return json({ error: "Nem támogatott művelet." }, 405);
  }

  if (method === "GET" && route[0]) {
    const provider = await readProvider(context.env, route[0]);
    if (!provider || !provider.isPublished) return json({ error: "A szolgáltató nem található." }, 404);
    // Contact details and the exact address remain private by default. A later
    // explicit provider opt-in may expose selected business contact channels.
    const { ownerId: _ownerId, email: _email, phone: _phone, address: _address, profileImages: _profileImages, ...publicProvider } = provider;
    return json(provider.publishPortfolio ? { ...publicProvider, profileImages: provider.profileImages } : publicProvider);
  }

  if (method === "GET") {
    const listed = await context.env.MEDIA_BUCKET.list({ prefix: PREFIX, limit: 500 });
    const providers = (await Promise.all(listed.objects.map((object) =>
      readProvider(context.env, object.key.slice(PREFIX.length, -5)),
    ))).filter((provider) => provider?.isPublished).map(({ ownerId: _ownerId, email: _email, phone: _phone, address: _address, profileImages: _profileImages, ...provider }) => provider);
    return json({ items: providers, total: providers.length });
  }

  return json({ error: "Ismeretlen szolgáltatói végpont." }, 404);
};

interface Env {
  MEDIA_BUCKET: R2Bucket;
  CLERK_SECRET_KEY: string;
}

interface PagesContext {
  request: Request;
  env: Env;
  params: { path?: string | string[] };
}

const LISTING_PREFIX = "data/listings/";

function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    },
  });
}

function routeParts(context: PagesContext): string[] {
  const value = context.params.path;
  if (!value) return [];
  return (Array.isArray(value) ? value : value.split("/"))
    .map((part) => decodeURIComponent(part))
    .filter(Boolean);
}

async function currentUserId(context: PagesContext): Promise<string | null> {
  const authorization = context.request.headers.get("Authorization");
  const bearerToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  const sessionCookie = context.request.headers.get("Cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("__session="))
    ?.slice("__session=".length);
  const token = bearerToken || sessionCookie;
  if (!token) return null;

  try {
    const [encodedHeader, encodedPayload, encodedSignature] = token.split(".");
    if (!encodedHeader || !encodedPayload || !encodedSignature) return null;

    const decodePart = (value: string) => {
      const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
      const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
      return JSON.parse(new TextDecoder().decode(
        Uint8Array.from(atob(padded), (character) => character.charCodeAt(0)),
      ));
    };
    const toBytes = (value: string) => {
      const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
      const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
      return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
    };

    const header = decodePart(encodedHeader);
    const claims = decodePart(encodedPayload);
    if (header.alg !== "RS256" || typeof header.kid !== "string") return null;
    if (typeof claims.iss !== "string" || typeof claims.sub !== "string") return null;

    const issuer = new URL(claims.iss);
    const trustedIssuer = issuer.protocol === "https:" && (
      issuer.hostname.endsWith(".clerk.accounts.dev") ||
      issuer.hostname === "clerk.ilolit.com"
    );
    if (!trustedIssuer) return null;

    const now = Math.floor(Date.now() / 1000);
    if (typeof claims.exp !== "number" || claims.exp <= now - 30) return null;
    if (typeof claims.nbf === "number" && claims.nbf > now + 30) return null;
    if (claims.azp && !["https://ilolit.com", "https://www.ilolit.com"].includes(claims.azp)) {
      return null;
    }

    const jwksResponse = await fetch(`${issuer.origin}/.well-known/jwks.json`);
    if (!jwksResponse.ok) return null;
    const jwks = await jwksResponse.json<any>();
    const jwk = jwks.keys?.find((key: any) => key.kid === header.kid);
    if (!jwk) return null;

    const publicKey = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const valid = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      publicKey,
      toBytes(encodedSignature),
      new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`),
    );
    return valid ? claims.sub : null;
  } catch {
    return null;
  }
}

async function readListing(env: Env, id: string): Promise<any | null> {
  const object = await env.MEDIA_BUCKET.get(`${LISTING_PREFIX}${id}.json`);
  if (!object) return null;
  try {
    return await object.json();
  } catch {
    return null;
  }
}

async function writeListing(env: Env, listing: any): Promise<void> {
  await env.MEDIA_BUCKET.put(
    `${LISTING_PREFIX}${listing.id}.json`,
    JSON.stringify(listing),
    { httpMetadata: { contentType: "application/json" } },
  );
}

function normalizeListing(input: any, id: string, userId: string, existing?: any) {
  const now = new Date().toISOString();
  const imageValues = Array.isArray(input.images) ? input.images : existing?.images ?? [];
  const images = imageValues.map((image: any, index: number) => ({
    id: typeof image === "object" && image?.id ? image.id : `${id}-image-${index + 1}`,
    url: typeof image === "string" ? image : image?.url,
    thumbnail: typeof image === "object" ? image?.thumbnail ?? null : null,
    alt: typeof image === "object" ? image?.alt ?? null : null,
    order: index,
  })).filter((image: any) => typeof image.url === "string" && image.url.length > 0);

  return {
    ...existing,
    ...input,
    id,
    userId,
    currency: existing?.currency ?? "HUF",
    status: input.status ?? existing?.status ?? "ACTIVE",
    isSold: input.isSold ?? existing?.isSold ?? false,
    viewCount: existing?.viewCount ?? 0,
    favoriteCount: existing?.favoriteCount ?? 0,
    isFavorited: false,
    isOwner: true,
    images,
    user: existing?.user ?? {
      id: userId,
      username: null,
      fullName: null,
      avatarUrl: null,
      rating: 0,
      reviewCount: 0,
      isVerified: false,
    },
    category: existing?.category ?? (input.categoryId
      ? { id: input.categoryId, name: null, slug: null }
      : null),
    subcategory: existing?.subcategory ?? (input.subcategoryId
      ? { id: input.subcategoryId, name: null, slug: null }
      : null),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

export async function onRequest(context: PagesContext): Promise<Response> {
  const method = context.request.method.toUpperCase();
  if (method === "OPTIONS") return json(null, 204);

  const parts = routeParts(context);
  const id = parts[0];

  if (method === "GET" && id) {
    const listing = await readListing(context.env, id);
    if (!listing) return json({ error: "A hirdetés nem található." }, 404);
    const userId = await currentUserId(context);
    return json({ ...listing, isOwner: Boolean(userId && listing.userId === userId) });
  }

  if (method === "GET") {
    const url = new URL(context.request.url);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 24));
    const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
    const listed = await context.env.MEDIA_BUCKET.list({ prefix: LISTING_PREFIX, limit: 1000 });
    const records = (await Promise.all(
      listed.objects.map((object) => readListing(
        context.env,
        object.key.slice(LISTING_PREFIX.length, -".json".length),
      )),
    )).filter(Boolean).sort((a: any, b: any) =>
      String(b.createdAt).localeCompare(String(a.createdAt)),
    );
    const start = (page - 1) * limit;
    return json({
      items: records.slice(start, start + limit),
      total: records.length,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(records.length / limit)),
    });
  }

  const userId = await currentUserId(context);
  if (!userId) return json({ error: "A mentéshez jelentkezz be újra." }, 401);

  if (method === "POST" && !id) {
    const input = await context.request.json<any>();
    if (!input.title || !input.description || !input.condition || !input.categoryId) {
      return json({ error: "A kötelező hirdetési adatok hiányoznak." }, 400);
    }
    const listingId = crypto.randomUUID();
    const listing = normalizeListing(input, listingId, userId);
    await writeListing(context.env, listing);
    return json(listing, 201);
  }

  if (method === "PATCH" && id) {
    const existing = await readListing(context.env, id);
    if (!existing) return json({ error: "A hirdetés nem található." }, 404);
    if (existing.userId !== userId) return json({ error: "Nincs jogosultságod a módosításhoz." }, 403);
    const input = await context.request.json<any>();
    const listing = normalizeListing(input, id, userId, existing);
    await writeListing(context.env, listing);
    return json(listing);
  }

  if (method === "DELETE" && id) {
    const existing = await readListing(context.env, id);
    if (!existing) return json({ error: "A hirdetés nem található." }, 404);
    if (existing.userId !== userId) return json({ error: "Nincs jogosultságod a törléshez." }, 403);
    await context.env.MEDIA_BUCKET.delete(`${LISTING_PREFIX}${id}.json`);
    return json({ success: true });
  }

  return json({ error: "Nem támogatott művelet." }, 405);
}

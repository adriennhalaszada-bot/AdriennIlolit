import { verifyToken } from "@clerk/backend";

interface Env {
  MEDIA_BUCKET: R2Bucket;
  CLERK_SECRET_KEY: string;
}

type Context = EventContext<Env, string, Record<string, unknown>>;
const ALLOWED_SECTIONS = new Set(["favorites", "saved-searches", "notifications"]);

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

function section(context: Context): string {
  const value = context.params.path;
  const path = Array.isArray(value) ? value[0] : typeof value === "string" ? value.split("/")[0] : "";
  return String(path || "");
}

function safeArray(value: unknown, max = 500): unknown[] {
  return Array.isArray(value) ? value.slice(0, max) : [];
}

export const onRequest: PagesFunction<Env> = async (rawContext) => {
  const context = rawContext as Context;
  const method = context.request.method.toUpperCase();
  if (method === "OPTIONS") return json(null, 204);

  const ownerId = await userId(context.request, context.env);
  if (!ownerId) return json({ error: "A személyes adatokhoz jelentkezz be újra." }, 401);
  const requestedSection = section(context);
  if (!ALLOWED_SECTIONS.has(requestedSection)) return json({ error: "Ismeretlen beállítási terület." }, 404);
  const key = `data/preferences/${ownerId}/${requestedSection}.json`;

  if (method === "GET") {
    const object = await context.env.MEDIA_BUCKET.get(key);
    if (!object) {
      return json(requestedSection === "notifications"
        ? { items: [], settings: null }
        : { items: [] });
    }
    try {
      return json(await object.json());
    } catch {
      return json({ error: "A mentett adatok sérültek." }, 500);
    }
  }

  if (method === "PUT") {
    let input: any;
    try { input = await context.request.json(); } catch { return json({ error: "Érvénytelen JSON-adat." }, 400); }
    const body = requestedSection === "notifications"
      ? { items: safeArray(input?.items), settings: input?.settings && typeof input.settings === "object" ? input.settings : null }
      : { items: safeArray(input?.items) };
    await context.env.MEDIA_BUCKET.put(key, JSON.stringify(body), {
      httpMetadata: { contentType: "application/json" },
      customMetadata: { owner: ownerId, section: requestedSection, updatedAt: new Date().toISOString() },
    });
    return json({ success: true });
  }

  return json({ error: "Nem támogatott művelet." }, 405);
};

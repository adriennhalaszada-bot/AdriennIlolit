import { verifyToken } from "@clerk/backend";

interface Env {
  MEDIA_BUCKET: R2Bucket;
  CLERK_SECRET_KEY: string;
}

type Context = EventContext<Env, string, Record<string, unknown>>;

const IMAGE_LIMIT = 20 * 1024 * 1024;
const VIDEO_LIMIT = 100 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);
const ALLOWED_VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);

function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function pathParts(context: Context): string[] {
  const value = context.params.path;
  if (Array.isArray(value)) return value.map(String);
  return typeof value === "string" && value ? value.split("/") : [];
}

async function authenticatedUser(request: Request, env: Env): Promise<string | null> {
  const auth = request.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ") || !env.CLERK_SECRET_KEY) return null;

  try {
    const payload = await verifyToken(auth.slice(7), { secretKey: env.CLERK_SECRET_KEY });
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

function safeExtension(fileName: string, mimeType: string): string {
  const candidate = fileName.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (candidate && candidate.length <= 5) return candidate;
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "video/quicktime") return "mov";
  return mimeType.split("/")[1]?.replace(/[^a-z0-9]/g, "") || "bin";
}

async function handleUpload(context: Context): Promise<Response> {
  const userId = await authenticatedUser(context.request, context.env);
  if (!userId) return json({ error: "A feltöltéshez be kell jelentkezni." }, 401);

  const mimeType = (context.request.headers.get("Content-Type") || "").split(";", 1)[0].toLowerCase();
  const isImage = ALLOWED_IMAGE_TYPES.has(mimeType);
  const isVideo = ALLOWED_VIDEO_TYPES.has(mimeType);
  if (!isImage && !isVideo) return json({ error: "Nem támogatott fájltípus." }, 415);

  const limit = isVideo ? VIDEO_LIMIT : IMAGE_LIMIT;
  const declaredSize = Number(context.request.headers.get("Content-Length") || 0);
  if (declaredSize > limit) return json({ error: "A fájl mérete meghaladja a megengedett korlátot." }, 413);

  const bytes = await context.request.arrayBuffer();
  if (!bytes.byteLength || bytes.byteLength > limit) {
    return json({ error: "A fájl üres vagy túl nagy." }, 413);
  }

  const rawName = context.request.headers.get("X-File-Name") || "media";
  const fileName = decodeURIComponent(rawName);
  const extension = safeExtension(fileName, mimeType);
  const isPrivate = context.request.headers.get("X-Media-Private") === "true";
  const key = `users/${userId}/${isVideo ? "videos" : "images"}/${crypto.randomUUID()}.${extension}`;
  const uploadedAt = new Date().toISOString();

  await context.env.MEDIA_BUCKET.put(key, bytes, {
    httpMetadata: { contentType: mimeType },
    customMetadata: {
      owner: userId,
      private: String(isPrivate),
      originalName: fileName.slice(0, 180),
      uploadedAt,
    },
  });

  return json({
    success: true,
    key,
    url: `/api/media/file/${key.split("/").map(encodeURIComponent).join("/")}`,
    uploadedAt,
  }, 201);
}

async function handleFile(context: Context, key: string): Promise<Response> {
  const object = await context.env.MEDIA_BUCKET.get(key);
  if (!object) return new Response("Not found", { status: 404 });

  if (object.customMetadata?.private === "true") {
    const userId = await authenticatedUser(context.request, context.env);
    if (!userId || userId !== object.customMetadata.owner) {
      return new Response("Not found", { status: 404 });
    }
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("ETag", object.httpEtag);
  headers.set("Cache-Control", object.customMetadata?.private === "true" ? "private, no-store" : "public, max-age=31536000, immutable");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(object.body, { headers });
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const parts = pathParts(context as Context);

  if (context.request.method === "POST" && parts[0] === "upload") {
    return handleUpload(context as Context);
  }

  if (context.request.method === "GET" && parts[0] === "file" && parts.length > 1) {
    return handleFile(context as Context, parts.slice(1).map(decodeURIComponent).join("/"));
  }

  if (context.request.method === "DELETE" && parts.length === 0) {
    const userId = await authenticatedUser(context.request, context.env);
    if (!userId) return json({ error: "Bejelentkezés szükséges." }, 401);
    const key = new URL(context.request.url).searchParams.get("key");
    if (!key) return json({ error: "Hiányzó fájlazonosító." }, 400);
    const object = await context.env.MEDIA_BUCKET.head(key);
    if (!object || object.customMetadata?.owner !== userId) return json({ error: "A fájl nem található." }, 404);
    await context.env.MEDIA_BUCKET.delete(key);
    return json({ success: true });
  }

  return json({ error: "Ismeretlen média-végpont." }, 404);
};

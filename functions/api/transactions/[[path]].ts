import { verifyToken } from "@clerk/backend";

interface Env { MEDIA_BUCKET: R2Bucket; CLERK_SECRET_KEY: string }
type Context = EventContext<Env, string, Record<string, unknown>>;
const TX_PREFIX = "data/transactions/";

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: {
    "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
  }});
}
async function userId(request: Request, env: Env) {
  const value = request.headers.get("Authorization");
  if (!value?.startsWith("Bearer ") || !env.CLERK_SECRET_KEY) return null;
  try {
    const payload = await verifyToken(value.slice(7), { secretKey: env.CLERK_SECRET_KEY });
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch { return null; }
}
function parts(context: Context) {
  const value = context.params.path;
  return (Array.isArray(value) ? value : typeof value === "string" ? value.split("/") : []).filter(Boolean);
}
async function read(env: Env, id: string) {
  const object = await env.MEDIA_BUCKET.get(`${TX_PREFIX}${id}.json`);
  if (!object) return null;
  try { return await object.json<any>(); } catch { return null; }
}
async function write(env: Env, tx: any) {
  await env.MEDIA_BUCKET.put(`${TX_PREFIX}${tx.id}.json`, JSON.stringify(tx), {
    httpMetadata: { contentType: "application/json" },
    customMetadata: { buyerId: tx.buyerId, sellerId: tx.sellerId, status: tx.status },
  });
}
async function all(env: Env) {
  const listed = await env.MEDIA_BUCKET.list({ prefix: TX_PREFIX, limit: 1000 });
  return (await Promise.all(listed.objects.map((o) => read(env, o.key.slice(TX_PREFIX.length, -5))))).filter(Boolean);
}

export const onRequest: PagesFunction<Env> = async (rawContext) => {
  const context = rawContext as Context;
  const method = context.request.method.toUpperCase();
  if (method === "OPTIONS") return json(null, 204);
  const ownerId = await userId(context.request, context.env);
  if (!ownerId) return json({ error: "A tranzakciókhoz jelentkezz be." }, 401);
  const route = parts(context);

  if (method === "GET" && route[0] === "seller-payout-summary") {
    const mine = (await all(context.env)).filter((tx) => tx.sellerId === ownerId);
    const pendingEscrow = mine.filter((tx) => ["PAID_PENDING_CONFIRMATION", "DISPUTED"].includes(tx.status)).reduce((sum, tx) => sum + Number(tx.listingPrice || 0), 0);
    const confirmedPayout = mine.filter((tx) => tx.status === "CONFIRMED").reduce((sum, tx) => sum + Number(tx.sellerPayout || 0), 0);
    const totalEarnings = mine.filter((tx) => ["CONFIRMED", "COMPLETED"].includes(tx.status)).reduce((sum, tx) => sum + Number(tx.sellerPayout || 0), 0);
    return json({ pendingEscrow, confirmedPayout, totalEarnings, currency: "HUF" });
  }

  if (method === "GET" && !route[0]) {
    const url = new URL(context.request.url);
    const role = url.searchParams.get("role") === "seller" ? "seller" : "buyer";
    const listingId = url.searchParams.get("listingId");
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 50));
    const items = (await all(context.env))
      .filter((tx) => role === "seller" ? tx.sellerId === ownerId : tx.buyerId === ownerId)
      .filter((tx) => !listingId || tx.listingId === listingId)
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
      .slice(0, limit);
    return json({ items, total: items.length, page: 1, limit, totalPages: 1 });
  }

  const id = route[0];
  const tx = id ? await read(context.env, id) : null;
  if (!tx) return json({ error: "A tranzakció nem található." }, 404);
  if (tx.buyerId !== ownerId && tx.sellerId !== ownerId) return json({ error: "Nincs hozzáférésed ehhez a tranzakcióhoz." }, 403);
  if (method === "GET" && route.length === 1) return json(tx);

  if (method === "POST" && route[1] === "confirm") {
    if (tx.buyerId !== ownerId) return json({ error: "Csak a vevő igazolhatja a kézbesítést." }, 403);
    if (tx.status !== "PAID_PENDING_CONFIRMATION") return json({ error: "A tranzakció ebben az állapotban nem igazolható." }, 409);
    tx.status = "COMPLETED";
    tx.confirmedAt = new Date().toISOString();
    tx.updatedAt = tx.confirmedAt;
    await write(context.env, tx);
    return json(tx);
  }

  if (method === "POST" && route[1] === "dispute") {
    if (tx.status !== "PAID_PENDING_CONFIRMATION") return json({ error: "Csak kifizetett, nyitott tranzakció vitatható." }, 409);
    let input: any = {};
    try { input = await context.request.json(); } catch {}
    const reason = typeof input.reason === "string" ? input.reason.trim().slice(0, 2000) : "";
    if (!reason) return json({ error: "A probléma leírása kötelező." }, 400);
    tx.status = "DISPUTED";
    tx.dispute = { reason, openedBy: ownerId, openedAt: new Date().toISOString(), status: "OPEN" };
    tx.updatedAt = new Date().toISOString();
    await write(context.env, tx);
    return json(tx);
  }

  return json({ error: "Nem támogatott tranzakciós művelet." }, 405);
};

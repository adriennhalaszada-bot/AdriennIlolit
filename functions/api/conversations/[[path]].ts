import { verifyToken } from "@clerk/backend";

interface Env { MEDIA_BUCKET: R2Bucket; CLERK_SECRET_KEY: string }
type Context = EventContext<Env, string, Record<string, unknown>>;
const PREFIX = "data/conversations/";
const LISTING_PREFIX = "data/listings/";

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: {
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  }});
}

function parts(context: Context): string[] {
  const value = context.params.path;
  return (Array.isArray(value) ? value : typeof value === "string" ? value.split("/") : []).map(String).filter(Boolean);
}

async function userId(request: Request, env: Env): Promise<string | null> {
  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ") || !env.CLERK_SECRET_KEY) return null;
  try {
    const payload = await verifyToken(authorization.slice(7), { secretKey: env.CLERK_SECRET_KEY });
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch { return null; }
}

async function readJson(env: Env, key: string): Promise<any | null> {
  const object = await env.MEDIA_BUCKET.get(key);
  if (!object) return null;
  try { return await object.json(); } catch { return null; }
}

async function save(env: Env, conversation: any) {
  await env.MEDIA_BUCKET.put(`${PREFIX}${conversation.id}.json`, JSON.stringify(conversation), {
    httpMetadata: { contentType: "application/json" },
  });
}

function publicConversation(conversation: any, currentUserId: string) {
  const messages = Array.isArray(conversation.messages) ? conversation.messages : [];
  const lastMessage = messages[messages.length - 1] ?? null;
  return {
    ...conversation,
    lastMessage,
    lastMessageAt: lastMessage?.createdAt ?? conversation.createdAt,
    unreadCount: messages.filter((message: any) => message.senderId !== currentUserId && !message.readBy?.includes(currentUserId)).length,
  };
}

export const onRequest: PagesFunction<Env> = async (rawContext) => {
  const context = rawContext as Context;
  const method = context.request.method.toUpperCase();
  if (method === "OPTIONS") return json(null, 204);
  const currentUserId = await userId(context.request, context.env);
  if (!currentUserId) return json({ error: "Az üzenetekhez jelentkezz be újra." }, 401);
  const route = parts(context);

  if (method === "GET" && route.length === 0) {
    const listed = await context.env.MEDIA_BUCKET.list({ prefix: PREFIX, limit: 500 });
    const conversations = (await Promise.all(listed.objects.map((object) => readJson(context.env, object.key))))
      .filter((item) => item && (item.buyerId === currentUserId || item.sellerId === currentUserId))
      .map((item) => publicConversation(item, currentUserId))
      .sort((a, b) => String(b.lastMessageAt).localeCompare(String(a.lastMessageAt)));
    return json(conversations);
  }

  if (method === "POST" && route.length === 0) {
    let input: any;
    try { input = await context.request.json(); } catch { return json({ error: "Érvénytelen üzenetadat." }, 400); }
    const listingId = typeof input.listingId === "string" ? input.listingId.trim() : "";
    const content = typeof input.message === "string" ? input.message.trim().slice(0, 2000) : "";
    const listing = listingId ? await readJson(context.env, `${LISTING_PREFIX}${listingId}.json`) : null;
    if (!listing) return json({ error: "A hirdetés nem található." }, 404);
    if (!content) return json({ error: "Írj üzenetet a beszélgetés indításához." }, 400);
    if (listing.userId === currentUserId) return json({ error: "A saját hirdetésedhez nem indíthatsz beszélgetést." }, 400);

    const listed = await context.env.MEDIA_BUCKET.list({ prefix: PREFIX, limit: 500 });
    const existing = (await Promise.all(listed.objects.map((object) => readJson(context.env, object.key))))
      .find((item) => item?.listingId === listingId && item?.buyerId === currentUserId && item?.sellerId === listing.userId);
    if (existing) return json(publicConversation(existing, currentUserId));

    const now = new Date().toISOString();
    const conversation = {
      id: crypto.randomUUID(), listingId, listing, buyerId: currentUserId, sellerId: listing.userId,
      buyer: { id: currentUserId, username: null, fullName: null, avatarUrl: null },
      seller: listing.user ?? { id: listing.userId, username: null, fullName: null, avatarUrl: null },
      messages: [{ id: crypto.randomUUID(), content, contentType: "text", senderId: currentUserId, readBy: [currentUserId], createdAt: now }],
      createdAt: now,
    };
    await save(context.env, conversation);
    return json(publicConversation(conversation, currentUserId), 201);
  }

  const conversation = route[0] ? await readJson(context.env, `${PREFIX}${route[0]}.json`) : null;
  if (!conversation) return json({ error: "A beszélgetés nem található." }, 404);
  if (conversation.buyerId !== currentUserId && conversation.sellerId !== currentUserId) return json({ error: "Nincs hozzáférésed ehhez a beszélgetéshez." }, 403);

  if (method === "GET" && route.length === 1) return json(publicConversation(conversation, currentUserId));

  if (method === "POST" && route[1] === "messages") {
    let input: any;
    try { input = await context.request.json(); } catch { return json({ error: "Érvénytelen üzenetadat." }, 400); }
    const content = typeof input.content === "string" ? input.content.trim().slice(0, 2000) : "";
    if (!content) return json({ error: "Az üzenet nem lehet üres." }, 400);
    const message = { id: crypto.randomUUID(), content, contentType: "text", senderId: currentUserId, readBy: [currentUserId], createdAt: new Date().toISOString() };
    conversation.messages = [...(conversation.messages ?? []), message].slice(-1000);
    await save(context.env, conversation);
    return json(message, 201);
  }

  if (method === "POST" && route[1] === "read") {
    conversation.messages = (conversation.messages ?? []).map((message: any) => ({
      ...message,
      readBy: message.readBy?.includes(currentUserId) ? message.readBy : [...(message.readBy ?? []), currentUserId],
    }));
    await save(context.env, conversation);
    return json({ success: true });
  }

  return json({ error: "Nem támogatott művelet." }, 405);
};

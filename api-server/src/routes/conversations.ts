import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import {
  conversationsTable,
  messagesTable,
  usersTable,
  listingsTable,
} from "@workspace/db";
import { eq, and, or, desc, sql } from "drizzle-orm";
import { newId } from "../lib/ids";

const router: IRouter = Router();

async function formatConversation(
  conv: typeof conversationsTable.$inferSelect,
  currentUserId: string,
) {
  const [buyer, seller, listing, lastMsg, unread] = await Promise.all([
    db.query.usersTable.findFirst({ where: eq(usersTable.id, conv.buyerId) }),
    db.query.usersTable.findFirst({ where: eq(usersTable.id, conv.sellerId) }),
    conv.listingId
      ? db.query.listingsTable.findFirst({
          where: eq(listingsTable.id, conv.listingId),
        })
      : Promise.resolve(null),
    db.query.messagesTable.findFirst({
      where: eq(messagesTable.conversationId, conv.id),
      orderBy: desc(messagesTable.createdAt),
    }),
    db
      .select({ count: sql<number>`count(*)` })
      .from(messagesTable)
      .where(
        and(
          eq(messagesTable.conversationId, conv.id),
          eq(messagesTable.isRead, false),
        ),
      ),
  ]);

  const unreadCount = currentUserId
    ? Number(
        (
          await db
            .select({ count: sql<number>`count(*)` })
            .from(messagesTable)
            .where(
              and(
                eq(messagesTable.conversationId, conv.id),
                eq(messagesTable.isRead, false),
                sql`${messagesTable.senderId} != ${currentUserId}`,
              ),
            )
        )[0]?.count ?? 0,
      )
    : 0;

  return {
    id: conv.id,
    lastMessageAt: conv.lastMessageAt,
    createdAt: conv.createdAt,
    unreadCount,
    listing: listing
      ? {
          id: listing.id,
          title: listing.title,
          price: listing.price,
          currency: listing.currency,
          status: listing.status,
        }
      : null,
    buyer: buyer
      ? {
          id: buyer.id,
          username: buyer.username,
          fullName: buyer.fullName,
          avatarUrl: buyer.avatarUrl,
        }
      : null,
    seller: seller
      ? {
          id: seller.id,
          username: seller.username,
          fullName: seller.fullName,
          avatarUrl: seller.avatarUrl,
        }
      : null,
    lastMessage: lastMsg
      ? {
          id: lastMsg.id,
          content: lastMsg.content,
          contentType: lastMsg.contentType,
          createdAt: lastMsg.createdAt,
          senderId: lastMsg.senderId,
        }
      : null,
  };
}

router.get("/conversations", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.clerkId, clerkId),
  });
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  const convs = await db.query.conversationsTable.findMany({
    where: or(
      eq(conversationsTable.buyerId, user.id),
      eq(conversationsTable.sellerId, user.id),
    ),
    orderBy: desc(conversationsTable.lastMessageAt),
  });

  const result = await Promise.all(convs.map((c) => formatConversation(c, user.id)));
  res.json(result);
});

router.post("/conversations", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.clerkId, clerkId),
  });
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  const { listingId, sellerId, initialMessage } = req.body;
  if (!sellerId) {
    res.status(400).json({ error: "sellerId required" });
    return;
  }

  const existing = listingId
    ? await db.query.conversationsTable.findFirst({
        where: and(
          eq(conversationsTable.listingId, listingId),
          eq(conversationsTable.buyerId, user.id),
          eq(conversationsTable.sellerId, sellerId),
        ),
      })
    : null;

  if (existing) {
    res.json(await formatConversation(existing, user.id));
    return;
  }

  const id = newId();
  const now = new Date();
  await db.insert(conversationsTable).values({
    id,
    listingId: listingId ?? null,
    buyerId: user.id,
    sellerId,
    lastMessageAt: initialMessage ? now : null,
  });

  if (initialMessage) {
    await db.insert(messagesTable).values({
      id: newId(),
      content: initialMessage,
      contentType: "text",
      conversationId: id,
      senderId: user.id,
    });
  }

  const conv = await db.query.conversationsTable.findFirst({
    where: eq(conversationsTable.id, id),
  });
  res.status(201).json(await formatConversation(conv!, user.id));
});

router.get("/conversations/:id", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.clerkId, clerkId),
  });
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  const conv = await db.query.conversationsTable.findFirst({
    where: eq(conversationsTable.id, req.params.id),
  });
  if (!conv) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (conv.buyerId !== user.id && conv.sellerId !== user.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const messages = await db.query.messagesTable.findMany({
    where: eq(messagesTable.conversationId, conv.id),
    orderBy: (m, { asc }) => asc(m.createdAt),
  });

  const base = await formatConversation(conv, user.id);
  res.json({ ...base, messages });
});

router.post("/conversations/:id/messages", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.clerkId, clerkId),
  });
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  const conv = await db.query.conversationsTable.findFirst({
    where: eq(conversationsTable.id, req.params.id),
  });
  if (!conv) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (conv.buyerId !== user.id && conv.sellerId !== user.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const { content, contentType = "text", offerAmount } = req.body;
  if (!content) {
    res.status(400).json({ error: "content required" });
    return;
  }

  const now = new Date();
  const [msg] = await db
    .insert(messagesTable)
    .values({
      id: newId(),
      content,
      contentType,
      offerAmount: offerAmount ?? null,
      conversationId: conv.id,
      senderId: user.id,
    })
    .returning();

  await db
    .update(conversationsTable)
    .set({ lastMessageAt: now, updatedAt: now })
    .where(eq(conversationsTable.id, conv.id));

  res.status(201).json(msg);
});

router.post("/conversations/:id/read", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.clerkId, clerkId),
  });
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  await db
    .update(messagesTable)
    .set({ isRead: true })
    .where(
      and(
        eq(messagesTable.conversationId, req.params.id),
        sql`${messagesTable.senderId} != ${user.id}`,
      ),
    );

  res.json({ success: true });
});

export default router;

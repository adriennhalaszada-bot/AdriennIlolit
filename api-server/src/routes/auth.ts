import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { newId } from "../lib/ids";

const router: IRouter = Router();

const ADJECTIVES = ["lila", "kék", "zöld", "arany", "gyors", "okos", "vidám", "titkos", "merész", "szabad", "friss", "bátor", "csendes", "varázsló", "boldog"];
const NOUNS = ["cica", "kutya", "roka", "medve", "bagoly", "alma", "virág", "csillag", "hold", "szél", "hal", "nyul", "tigris", "panda", "kaland"];

function generateSuggestion(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(Math.random() * 900) + 10;
  return `${adj}_${noun}_${num}`;
}

const BLOCKED_USERNAME_WORDS = [
  "admin", "administrator", "loloit", "lolit", "ilolit", "api", "support",
  "moderator", "mod", "staff", "team", "official", "help", "helpdesk",
  "system", "root", "superuser", "bot", "service", "services", "info",
  "contact", "noreply", "no_reply", "postmaster", "webmaster", "security",
  "abuse", "billing", "payments", "account", "accounts",
  "fasz", "faszt", "faszom", "faszod", "faszik", "faszfej", "faszarcú",
  "pina", "pinát", "pináját", "pussy", "punci",
  "kurva", "kurvát", "kurvaanya", "kurvaanyád",
  "segg", "segget", "seggfej",
  "geci", "gecit",
  "baszd", "baszom", "bassza", "megbasz",
  "szar", "szaros", "szarházi",
  "köcsög", "buzi",
  "nigger", "nigga", "retard", "retarded",
  "fuck", "fucking", "fuckyou", "fucker",
  "shit", "asshole", "bitch", "cunt", "cock", "dick",
  "whore", "slut",
];

const USERNAME_COOLDOWN_DAYS = 30;

function formatUser(u: typeof usersTable.$inferSelect) {
  return {
    id: u.id,
    clerkId: u.clerkId,
    email: u.email,
    username: u.username,
    usernameSet: u.usernameSet,
    usernameChangedAt: u.usernameChangedAt?.toISOString() ?? null,
    fullName: u.fullName,
    avatarUrl: u.avatarUrl,
    bio: u.bio,
    location: u.location,
    rating: u.rating,
    reviewCount: u.reviewCount,
    followerCount: u.followerCount,
    listingCount: u.listingCount,
    soldCount: u.soldCount,
    isVerified: u.isVerified,
    createdAt: u.createdAt,
  };
}

function formatPublicUser(u: typeof usersTable.$inferSelect) {
  return {
    id: u.id,
    username: u.username,
    fullName: u.fullName,
    avatarUrl: u.avatarUrl,
    bio: u.bio,
    location: u.location,
    rating: u.rating,
    reviewCount: u.reviewCount,
    followerCount: u.followerCount,
    listingCount: u.listingCount,
    soldCount: u.soldCount,
    isVerified: u.isVerified,
    createdAt: u.createdAt,
  };
}

router.get("/auth/me", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.clerkId, clerkId),
  });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(formatUser(user));
});

router.patch("/auth/me", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.clerkId, clerkId),
  });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const { fullName, bio, location, avatarUrl, username } = req.body;
  const updates: Partial<typeof usersTable.$inferInsert> = {};
  if (fullName !== undefined) updates.fullName = fullName;
  if (bio !== undefined) updates.bio = bio;
  if (location !== undefined) updates.location = location;
  if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;

  if (username !== undefined) {
    if (typeof username !== "string" || !/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
      res.status(400).json({ error: "3-30 karakter, csak betű, szám és _ engedélyezett" });
      return;
    }

    const lowerUsername = username.toLowerCase();
    const isBlocked = BLOCKED_USERNAME_WORDS.some((word) =>
      lowerUsername.includes(word.toLowerCase())
    );
    if (isBlocked) {
      res.status(400).json({ error: "Ez a felhasználónév nem engedélyezett" });
      return;
    }

    if (username !== user.username) {
      if (user.usernameChangedAt) {
        const daysSince = (Date.now() - user.usernameChangedAt.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince < USERNAME_COOLDOWN_DAYS) {
          const daysLeft = Math.ceil(USERNAME_COOLDOWN_DAYS - daysSince);
          res.status(429).json({
            error: `A felhasználónevet legkorábban ${daysLeft} nap múlva módosíthatod`,
            daysLeft,
          });
          return;
        }
      }

      const conflict = await db.query.usersTable.findFirst({
        where: eq(usersTable.username, username),
      });
      if (conflict && conflict.id !== user.id) {
        res.status(409).json({ error: "Ez a felhasználónév már foglalt" });
        return;
      }

      updates.username = username;
      updates.usernameSet = true;
      updates.usernameChangedAt = new Date();
    }
  }

  const [updated] = await db
    .update(usersTable)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(usersTable.id, user.id))
    .returning();

  res.json(formatUser(updated));
});

router.post("/auth/sync", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const { email, username, fullName, avatarUrl } = req.body;
  if (!email) {
    res.status(400).json({ error: "email required" });
    return;
  }

  const existing = await db.query.usersTable.findFirst({
    where: eq(usersTable.clerkId, clerkId),
  });

  if (existing) {
    // Auto-heal: if user has a username but usernameSet is false (e.g. after a
    // schema migration reset the column), correct it transparently on next sync.
    const shouldHealUsernameSet = !existing.usernameSet && !!existing.username;
    const [updated] = await db
      .update(usersTable)
      .set({
        email,
        fullName: fullName ?? existing.fullName,
        avatarUrl: avatarUrl ?? existing.avatarUrl,
        ...(shouldHealUsernameSet ? { usernameSet: true } : {}),
        updatedAt: new Date(),
      })
      .where(eq(usersTable.clerkId, clerkId))
      .returning();
    res.json(formatUser(updated));
    return;
  }

  // New user: if no explicit username from OAuth/Clerk, auto-generate temp + usernameSet=false
  const hasExplicitUsername = !!username && username.trim().length > 0;
  const safeUsername = hasExplicitUsername
    ? username.trim().replace(/[^a-zA-Z0-9_]/g, "_")
    : email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "_");

  let finalUsername = safeUsername;
  const conflict = await db.query.usersTable.findFirst({
    where: eq(usersTable.username, safeUsername),
  });
  if (conflict) finalUsername = `${safeUsername}_${Date.now()}`;

  const [created] = await db
    .insert(usersTable)
    .values({
      id: newId(),
      clerkId,
      email,
      username: finalUsername,
      usernameSet: hasExplicitUsername,
      fullName: fullName ?? null,
      avatarUrl: avatarUrl ?? null,
    })
    .returning();

  res.json(formatUser(created));
});

// Static routes BEFORE /users/:username to avoid Express param matching
router.get("/users/username-suggestions", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const suggestions: string[] = [];
  const tried = new Set<string>();
  let attempts = 0;

  while (suggestions.length < 5 && attempts < 50) {
    attempts++;
    const candidate = generateSuggestion();
    if (tried.has(candidate)) continue;
    tried.add(candidate);
    const existing = await db.query.usersTable.findFirst({
      where: eq(usersTable.username, candidate),
    });
    if (!existing) suggestions.push(candidate);
  }

  res.json({ suggestions });
});

router.post("/users/username", async (req, res) => {
  const { userId: clerkId } = getAuth(req);
  if (!clerkId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.clerkId, clerkId),
  });
  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  // One-time setup only: if already chosen, reject
  if (user.usernameSet) {
    res.status(409).json({ error: "Felhasználónevet már választottál. Módosításhoz használd a beállításokat." });
    return;
  }

  const { username } = req.body;
  if (!username || typeof username !== "string") {
    res.status(400).json({ error: "A felhasználónév megadása kötelező" }); return;
  }
  if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
    res.status(400).json({ error: "3-30 karakter, csak betű, szám és _ engedélyezett" }); return;
  }

  const lowerUsername = username.toLowerCase();
  const isBlocked = BLOCKED_USERNAME_WORDS.some((word) =>
    lowerUsername.includes(word.toLowerCase())
  );
  if (isBlocked) {
    res.status(400).json({ error: "Ez a felhasználónév nem engedélyezett" }); return;
  }

  const conflict = await db.query.usersTable.findFirst({
    where: eq(usersTable.username, username),
  });
  if (conflict && conflict.id !== user.id) {
    res.status(400).json({ error: "Ez a felhasználónév már foglalt" }); return;
  }

  const [updated] = await db
    .update(usersTable)
    .set({ username, usernameSet: true, usernameChangedAt: new Date(), updatedAt: new Date() })
    .where(eq(usersTable.id, user.id))
    .returning();

  res.json(formatUser(updated));
});

router.get("/users/:username", async (req, res) => {
  const { username } = req.params;
  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.username, username),
  });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(formatPublicUser(user));
});

export default router;

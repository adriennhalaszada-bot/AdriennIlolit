import { type RequestHandler } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

// NOTE: This middleware is mounted at app.use("/api", usernameGuard, router).
// Express strips the /api prefix before passing req.path here, so paths are
// e.g. "/auth/me", NOT "/api/auth/me".

// Method+path tuples allowed for authenticated users who have not yet chosen
// a username. Entries are [METHOD | "*", path] pairs.
// "*" means any HTTP method; otherwise method must match exactly.
const USERNAME_SETUP_ALLOWLIST: Array<[string, string]> = [
  ["GET",  "/healthz"],
  ["GET",  "/auth/me"],
  ["POST", "/auth/sync"],
  ["GET",  "/users/username-suggestions"],
  ["POST", "/users/username"],
];

function isAllowlisted(path: string, method: string): boolean {
  const bare = path.split("?")[0];
  for (const [m, p] of USERNAME_SETUP_ALLOWLIST) {
    if ((m === "*" || m === method) && p === bare) return true;
  }
  // Clerk proxy lives under /clerk/*
  if (bare.startsWith("/clerk")) return true;
  // GET /users/:username — used for custom username availability checks during
  // setup. Method-scoped to avoid allowing write operations under /users/*.
  if (method === "GET" && /^\/users\/[^/]+$/.test(bare)) return true;
  // Public browsing routes — always accessible regardless of username state.
  // These are read-only endpoints accessible to anonymous users too.
  if (method === "GET" && (
    bare.startsWith("/listings") ||
    bare.startsWith("/categories") ||
    bare.startsWith("/beauty") ||
    bare.startsWith("/reviews")
  )) return true;
  return false;
}

export const usernameGuard: RequestHandler = async (req, res, next) => {
  let clerkId: string | null = null;
  try {
    clerkId = getAuth(req)?.userId ?? null;
  } catch (e) {
    clerkId = null;
  }
  // Not signed in → nothing to check; let auth middleware handle it
  if (!clerkId) { next(); return; }
  // Always allowed for any user state
  if (isAllowlisted(req.path, req.method)) { next(); return; }

  try {
    const user = await db.query.usersTable.findFirst({
      columns: { usernameSet: true },
      where: eq(usersTable.clerkId, clerkId),
    });
    if (user && user.usernameSet === false) {
      res.status(403).json({
        error: "USERNAME_REQUIRED",
        message: "Kérjük, válassz felhasználónevet a folytatáshoz",
        redirect: "/username-setup",
      });
      return;
    }
  } catch (err) {
    req.log?.warn({ err }, "usernameGuard DB lookup failed – denying request");
    res.status(503).json({ error: "Service temporarily unavailable" });
    return;
  }

  next();
};

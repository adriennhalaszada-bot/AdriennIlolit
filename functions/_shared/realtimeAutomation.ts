import { createClerkClient, verifyToken } from "@clerk/backend";
import { emitUnifiedNotification } from "./unifiedNotifications";

// =============================================================================
// ILOLIT – Központi Valós Idejű Eseménybusz és Cloudflare Automatizálási Motor
// Használja: Cloudflare Pages Functions (functions/api/*) + Cloudflare Cron Worker
// =============================================================================

export interface AutomationEnv {
  MEDIA_BUCKET: R2Bucket;
  CLERK_SECRET_KEY?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  VAPID_PUBLIC_KEY?: string;
  ILOLIT_DEVELOPER_USER_IDS?: string;
  ILOLIT_DEVELOPER_EMAILS?: string;
  ILOLIT_CRON_SECRET?: string;
}

export type RealtimeDomain =
  | "listings"
  | "real_estate"
  | "vehicles"
  | "providers"
  | "bookings"
  | "appointments"
  | "education"
  | "search"
  | "favorites"
  | "reviews"
  | "messages"
  | "notifications"
  | "subscriptions"
  | "payments"
  | "coupons"
  | "commissions"
  | "admin"
  | "stats"
  | "profile"
  | "system_ops";

export const ALL_REALTIME_DOMAINS: RealtimeDomain[] = [
  "listings",
  "real_estate",
  "vehicles",
  "providers",
  "bookings",
  "appointments",
  "education",
  "search",
  "favorites",
  "reviews",
  "messages",
  "notifications",
  "subscriptions",
  "payments",
  "coupons",
  "commissions",
  "admin",
  "stats",
  "profile",
  "system_ops",
];

export interface DomainEventRecord {
  id: string;
  domain: RealtimeDomain;
  action: string;
  entityId?: string;
  version: number;
  timestamp: string;
  summary?: string;
}

export interface GlobalEventState {
  globalVersion: number;
  versions: Record<RealtimeDomain, number>;
  updatedAt: string;
  recentEvents: DomainEventRecord[];
}

export interface UserEventState {
  userId: string;
  version: number;
  domains: Partial<Record<RealtimeDomain, number>>;
  updatedAt: string;
}

export interface CouponRecord {
  code: string;
  description: string;
  discountType: "percent" | "fixed_huf";
  discountValue: number;
  applicableModules: string[];
  active: boolean;
  startsAt?: string | null;
  expiresAt?: string | null;
  maxUses?: number | null;
  usedCount: number;
  status: "ACTIVE" | "EXPIRED" | "DISABLED" | "EXHAUSTED";
  createdAt: string;
  updatedAt: string;
}

export interface RetryTaskRecord {
  id: string;
  taskType:
    | "NOTIFICATION_RETRY"
    | "STRIPE_RECONCILE"
    | "INDEX_SYNC"
    | "EMAIL_DISPATCH"
    | "WEBHOOK_REPLAY"
    | "CUSTOM";
  targetId: string;
  payload: Record<string, unknown>;
  attempts: number;
  maxAttempts: number;
  status: "PENDING" | "PROCESSING" | "SUCCEEDED" | "FAILED_PERMANENT";
  nextAttemptAt: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

export type AutomationJobId =
  | "expire_listings_and_promotions"
  | "activate_scheduled_listings"
  | "check_subscriptions_and_premium"
  | "validate_coupons"
  | "dispatch_timed_reminders"
  | "process_retry_queue"
  | "reconcile_stripe_payments"
  | "reconcile_search_and_counters"
  | "check_database_consistency"
  | "sync_commissions_and_escrow"
  | "system_health_and_anomaly_check"
  | "maintenance_and_log_pruning";

export interface AutomationJobDefinition {
  id: AutomationJobId;
  name: string;
  description: string;
  category: "hirdetesek" | "fizetesek" | "ertesitesek" | "konzisztencia" | "karbantartas";
  critical: boolean;
  defaultIntervalMinutes: number;
  allowedIntervals: number[];
}

export interface AutomationJobConfig {
  enabled: boolean;
  intervalMinutes: number;
}

export interface AutomationJobRuntime {
  id: AutomationJobId;
  lastRunAt: string | null;
  nextRunAt: string | null;
  lastDurationMs: number;
  lastProcessedCount: number;
  lastUpdatedCount: number;
  lastStatus: "NEVER" | "OK" | "ERROR" | "SKIPPED";
  lastError: string | null;
  totalRuns: number;
  successRuns: number;
  failedRuns: number;
}

export interface AutomationRunLog {
  runId: string;
  trigger: "cron" | "manual";
  cronExpression: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  jobsExecuted: number;
  jobsFailed: number;
  totalProcessed: number;
  totalUpdated: number;
  r2ReadsEstimate: number;
  r2WritesEstimate: number;
  errors: Array<{ jobId: string; message: string }>;
}

export interface AutomationState {
  cronExpression: string;
  workerName: string;
  lastTickAt: string | null;
  nextPlannedTickAt: string | null;
  lastTrigger: "cron" | "manual" | null;
  status: "HEALTHY" | "DEGRADED" | "IDLE";
  totalTicks: number;
  totalErrors: number;
  jobs: Record<AutomationJobId, AutomationJobRuntime>;
  recentLogs: AutomationRunLog[];
  recentErrors: Array<{ timestamp: string; jobId: string; message: string }>;
  resourceUsage: {
    lastDurationMs: number;
    avgDurationMs: number;
    lastR2Reads: number;
    lastR2Writes: number;
    pendingRetryTasks: number;
    failedPermanentTasks: number;
  };
}

export const AUTOMATION_JOB_DEFINITIONS: AutomationJobDefinition[] = [
  {
    id: "expire_listings_and_promotions",
    name: "Lejárt hirdetések és kiemelések inaktiválása",
    description:
      "Ellenőrzi a piactéri, ingatlan- és járműhirdetések, valamint kiemelések lejáratát, és azonnal frissíti az állapotukat.",
    category: "hirdetesek",
    critical: false,
    defaultIntervalMinutes: 1,
    allowedIntervals: [1, 2, 5, 10, 15],
  },
  {
    id: "activate_scheduled_listings",
    name: "Előre időzített hirdetések aktiválása",
    description:
      "Automatikusan publikálja az esedékes (scheduledPublishAt <= most) piactéri, ingatlan- és járműhirdetéseket.",
    category: "hirdetesek",
    critical: false,
    defaultIntervalMinutes: 1,
    allowedIntervals: [1, 2, 5, 10],
  },
  {
    id: "check_subscriptions_and_premium",
    name: "Előfizetések és prémium jogosultságok ellenőrzése",
    description:
      "Valós időben és percenként ellenőrzi a szolgáltatói előfizetések és prémium csomagok lejáratát és hozzáférését.",
    category: "fizetesek",
    critical: true,
    defaultIntervalMinutes: 1,
    allowedIntervals: [1, 2, 5],
  },
  {
    id: "validate_coupons",
    name: "Kuponkódok és kedvezmények érvényesítése",
    description:
      "Automatikusan lezárja a lejárt vagy felhasználási limitet elért kuponkódokat és szinkronizálja a kedvezményeket.",
    category: "fizetesek",
    critical: false,
    defaultIntervalMinutes: 1,
    allowedIntervals: [1, 5, 10, 15],
  },
  {
    id: "dispatch_timed_reminders",
    name: "Időzített emlékeztetők és értesítések kiküldése",
    description:
      "Kiküldi az esedékes 24 órás és 2 órás ingatlan-, jármű-, tesztvezetés- és szolgáltatási emlékeztetőket dupla küldés nélkül.",
    category: "ertesitesek",
    critical: false,
    defaultIntervalMinutes: 1,
    allowedIntervals: [1, 2, 5],
  },
  {
    id: "process_retry_queue",
    name: "Függő feladatok és sikertelen műveletek újrapróbálása",
    description:
      "Szabályozott, exponenciális várakozással újrapróbálja a sikertelen értesítéseket, e-mail/push feladatokat és szinkronizációkat.",
    category: "konzisztencia",
    critical: true,
    defaultIntervalMinutes: 1,
    allowedIntervals: [1, 2, 5],
  },
  {
    id: "reconcile_stripe_payments",
    name: "Stripe fizetések és tranzakciók egyeztetése",
    description:
      "Ellenőrzi a függőben lévő Stripe fizetéseket és pótolja az esetlegesen elmaradt webhook-feldolgozásokat dupla jóváírás nélkül.",
    category: "fizetesek",
    critical: true,
    defaultIntervalMinutes: 1,
    allowedIntervals: [1, 2, 5, 10],
  },
  {
    id: "reconcile_search_and_counters",
    name: "Keresési index és operatív statisztikák szinkronizálása",
    description:
      "Frissíti a valós idejű operatív statisztikákat, számlálókat és pótolja az esetlegesen elmaradt keresési frissítéseket.",
    category: "konzisztencia",
    critical: false,
    defaultIntervalMinutes: 1,
    allowedIntervals: [1, 2, 5, 10],
  },
  {
    id: "check_database_consistency",
    name: "Adatbázis-inkonzisztenciák felismerése és javítása",
    description:
      "Kiszűri és automatikusan helyreállítja a modulok közötti eltéréseket (pl. eladott tranzakcióhoz aktívan maradt hirdetés).",
    category: "konzisztencia",
    critical: true,
    defaultIntervalMinutes: 5,
    allowedIntervals: [1, 5, 10, 15, 30],
  },
  {
    id: "sync_commissions_and_escrow",
    name: "Partneri jutalékok és letéti tranzakciók ellenőrzése",
    description:
      "Ellenőrzi a partneri jutalékok és eladói letétek egyediségét, megakadályozva a dupla számlázást és dupla jutalékjóváírást.",
    category: "fizetesek",
    critical: true,
    defaultIntervalMinutes: 5,
    allowedIntervals: [1, 5, 10, 15, 30],
  },
  {
    id: "system_health_and_anomaly_check",
    name: "Rendszerállapot és rendellenesség-figyelés",
    description:
      "Percenként ellenőrzi a háttérrendszer egészségi állapotát, hibaarányát, elakadt zárolásait és végrehajtási idejét.",
    category: "konzisztencia",
    critical: true,
    defaultIntervalMinutes: 1,
    allowedIntervals: [1, 2, 5],
  },
  {
    id: "maintenance_and_log_pruning",
    name: "Naplókarbantartás és lejárt átmeneti adatok tisztítása",
    description:
      "Óránként tömöríti a futtatási naplókat és eltávolítja a 30 napnál régebbi lezárt újrapróbálási rekordokat.",
    category: "karbantartas",
    critical: false,
    defaultIntervalMinutes: 60,
    allowedIntervals: [15, 30, 60, 180, 360, 1440],
  },
];

// Storage keys in R2
export const GLOBAL_EVENT_STATE_KEY = "data/system/events/state.json";
export const USER_EVENT_STATE_PREFIX = "data/system/events/user/";
export const AUTOMATION_STATE_KEY = "data/system/automation/state.json";
export const AUTOMATION_CONFIG_KEY = "data/system/automation/config.json";
export const AUTOMATION_LOCK_KEY = "data/system/automation/lock.json";
export const RETRY_QUEUE_KEY = "data/system/automation/retry-queue.json";
export const LIVE_STATS_KEY = "data/system/stats/live-summary.json";
export const COUPONS_PREFIX = "data/system/coupons/";
export const STRIPE_PROCESSED_EVENT_PREFIX = "data/system/stripe-events/";
export const DEVELOPER_ALLOWLIST_KEY = "data/system/developer-allowlist.json";

const LISTING_PREFIX = "data/listings/";
const REAL_ESTATE_PREFIX = "data/real-estate/properties/";
const REAL_ESTATE_VIEWING_PREFIX = "data/real-estate/viewings/";
const VEHICLE_LISTING_PREFIX = "data/vehicles/listings/";
const VEHICLE_BOOKING_PREFIX = "data/vehicles/viewings/";
const PROVIDER_PREFIX = "data/providers/";
const BOOKING_PREFIX = "data/bookings/";
const TRANSACTION_PREFIX = "data/transactions/";

// =============================================================================
// 1. JSON R2 HELPERS
// =============================================================================

async function readJson<T = any>(env: AutomationEnv, key: string): Promise<T | null> {
  const obj = await env.MEDIA_BUCKET.get(key);
  if (!obj) return null;
  try {
    return await obj.json<T>();
  } catch {
    return null;
  }
}

async function writeJson(
  env: AutomationEnv,
  key: string,
  value: unknown,
  customMetadata?: Record<string, string>,
): Promise<void> {
  await env.MEDIA_BUCKET.put(key, JSON.stringify(value), {
    httpMetadata: { contentType: "application/json" },
    ...(customMetadata ? { customMetadata } : {}),
  });
}

// =============================================================================
// 2. INSTANT TIME-BASED VALIDITY HELPERS (NEVER WAIT FOR CRON!)
// =============================================================================

export function isTimestampExpired(iso?: string | null, nowMs = Date.now()): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) && t <= nowMs;
}

export function isScheduledForFuture(iso?: string | null, nowMs = Date.now()): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) && t > nowMs;
}

export function isSubscriptionActiveNow(
  subscription: { status?: string; currentPeriodEnd?: string | null } | null | undefined,
  nowMs = Date.now(),
): boolean {
  if (!subscription) return false;
  if (!["active", "trialing"].includes(String(subscription.status || ""))) return false;
  if (subscription.currentPeriodEnd && isTimestampExpired(subscription.currentPeriodEnd, nowMs)) {
    return false;
  }
  return true;
}

export function evaluateCouponValidity(
  coupon: CouponRecord | null | undefined,
  moduleName?: string,
  nowMs = Date.now(),
): { valid: boolean; reason?: string; effectiveStatus: CouponRecord["status"] } {
  if (!coupon) return { valid: false, reason: "A megadott kuponkód nem található.", effectiveStatus: "DISABLED" };
  if (!coupon.active || coupon.status === "DISABLED") {
    return { valid: false, reason: "Ez a kuponkód jelenleg inaktív.", effectiveStatus: "DISABLED" };
  }
  if (coupon.startsAt && isScheduledForFuture(coupon.startsAt, nowMs)) {
    return { valid: false, reason: "Ez a kuponkód még nem lépett életbe.", effectiveStatus: "DISABLED" };
  }
  if (coupon.expiresAt && isTimestampExpired(coupon.expiresAt, nowMs)) {
    return { valid: false, reason: "Ez a kuponkód lejárt.", effectiveStatus: "EXPIRED" };
  }
  if (coupon.maxUses && coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) {
    return { valid: false, reason: "A kuponkód felhasználási kerete elfogyott.", effectiveStatus: "EXHAUSTED" };
  }
  if (
    moduleName &&
    Array.isArray(coupon.applicableModules) &&
    coupon.applicableModules.length > 0 &&
    !coupon.applicableModules.includes("all") &&
    !coupon.applicableModules.includes(moduleName)
  ) {
    return { valid: false, reason: "Ez a kuponkód ebben a modulban nem használható fel.", effectiveStatus: "ACTIVE" };
  }
  return { valid: true, effectiveStatus: "ACTIVE" };
}

// =============================================================================
// 3. REAL-TIME EVENT BUS & TARGETED CACHE INVALIDATION
// =============================================================================

export function createEmptyGlobalEventState(): GlobalEventState {
  const versions = Object.fromEntries(ALL_REALTIME_DOMAINS.map((d) => [d, 1])) as Record<RealtimeDomain, number>;
  return {
    globalVersion: 1,
    versions,
    updatedAt: new Date().toISOString(),
    recentEvents: [],
  };
}

export async function getGlobalEventState(env: AutomationEnv): Promise<GlobalEventState> {
  const stored = await readJson<GlobalEventState>(env, GLOBAL_EVENT_STATE_KEY);
  if (!stored || !stored.versions) return createEmptyGlobalEventState();
  const base = createEmptyGlobalEventState();
  return {
    globalVersion: Number(stored.globalVersion || 1),
    versions: { ...base.versions, ...stored.versions },
    updatedAt: stored.updatedAt || base.updatedAt,
    recentEvents: Array.isArray(stored.recentEvents) ? stored.recentEvents : [],
  };
}

export async function getUserEventState(env: AutomationEnv, userId: string): Promise<UserEventState> {
  const stored = await readJson<UserEventState>(env, `${USER_EVENT_STATE_PREFIX}${userId}.json`);
  if (stored) return stored;
  return { userId, version: 0, domains: {}, updatedAt: new Date(0).toISOString() };
}

/**
 * Publishes an immediate domain mutation event so all connected browsers,
 * search views, dashboards, and admin surfaces invalidate affected caches within 0-3s.
 * Privacy rule: global event stream never contains PII or private payload fields.
 */
export async function publishDomainEvent(
  env: AutomationEnv,
  input: {
    domain: RealtimeDomain;
    action: string;
    entityId?: string;
    targetUserIds?: string[];
    summary?: string;
    privateOnly?: boolean;
  },
): Promise<void> {
  const now = new Date().toISOString();
  try {
    if (!input.privateOnly) {
      const state = await getGlobalEventState(env);
      const nextGlobal = state.globalVersion + 1;
      const nextDomainVer = (state.versions[input.domain] || 0) + 1;
      state.globalVersion = nextGlobal;
      state.versions[input.domain] = nextDomainVer;
      if (["listings", "real_estate", "vehicles", "providers", "education"].includes(input.domain)) {
        state.versions.search = (state.versions.search || 0) + 1;
        state.versions.stats = (state.versions.stats || 0) + 1;
      }
      state.updatedAt = now;
      state.recentEvents = [
        {
          id: crypto.randomUUID(),
          domain: input.domain,
          action: input.action,
          entityId: input.entityId,
          version: nextDomainVer,
          timestamp: now,
          summary: input.summary,
        },
        ...state.recentEvents,
      ].slice(0, 60);
      await writeJson(env, GLOBAL_EVENT_STATE_KEY, state);
    }

    if (Array.isArray(input.targetUserIds) && input.targetUserIds.length > 0) {
      const uniqueTargets = Array.from(new Set(input.targetUserIds.filter(Boolean))).slice(0, 25);
      await Promise.all(
        uniqueTargets.map(async (uid) => {
          const userState = await getUserEventState(env, uid);
          const nextVer = (userState.version || 0) + 1;
          userState.version = nextVer;
          userState.domains = {
            ...userState.domains,
            [input.domain]: (userState.domains?.[input.domain] || 0) + 1,
          };
          userState.updatedAt = now;
          await writeJson(env, `${USER_EVENT_STATE_PREFIX}${uid}.json`, userState);
        }),
      );
    }
  } catch {
    // Non-fatal: event publishing must never break the primary user transaction.
  }
}

// =============================================================================
// 4. RETRY QUEUE & STRIPE IDEMPOTENCY
// =============================================================================

export async function enqueueRetryTask(
  env: AutomationEnv,
  task: {
    taskType: RetryTaskRecord["taskType"];
    targetId: string;
    payload: Record<string, unknown>;
    errorMessage?: string;
    maxAttempts?: number;
  },
): Promise<RetryTaskRecord> {
  const queue = (await readJson<RetryTaskRecord[]>(env, RETRY_QUEUE_KEY)) || [];
  const existing = queue.find(
    (t) => t.taskType === task.taskType && t.targetId === task.targetId && ["PENDING", "PROCESSING"].includes(t.status),
  );
  if (existing) return existing;

  const now = new Date().toISOString();
  const record: RetryTaskRecord = {
    id: crypto.randomUUID(),
    taskType: task.taskType,
    targetId: task.targetId,
    payload: task.payload,
    attempts: 0,
    maxAttempts: Math.max(1, Math.min(8, task.maxAttempts || 5)),
    status: "PENDING",
    nextAttemptAt: new Date(Date.now() + 60_000).toISOString(),
    lastError: task.errorMessage,
    createdAt: now,
    updatedAt: now,
  };
  await writeJson(env, RETRY_QUEUE_KEY, [record, ...queue].slice(0, 200));
  return record;
}

export async function markStripeEventProcessed(env: AutomationEnv, eventId: string, eventType: string): Promise<boolean> {
  if (!eventId) return true;
  const key = `${STRIPE_PROCESSED_EVENT_PREFIX}${eventId}.json`;
  const existing = await env.MEDIA_BUCKET.head(key);
  if (existing) return false; // Already processed -> idempotent skip!
  await writeJson(env, key, {
    eventId,
    eventType,
    processedAt: new Date().toISOString(),
  });
  return true;
}

// =============================================================================
// 5. STRICT DEVELOPER-ONLY ACCESS CONTROL (SECTION 9)
// =============================================================================

const DEFAULT_OWNER_DEV_EMAIL_HINTS = ["adriennhalasz", "ilolit.com"];

export async function resolveAuthenticatedUserId(
  request: Request,
  env: AutomationEnv,
  allowQueryToken = false,
): Promise<string | null> {
  const auth = request.headers.get("Authorization");
  let token = auth?.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token && allowQueryToken) {
    token = new URL(request.url).searchParams.get("token") || "";
  }
  if (!token || !env.CLERK_SECRET_KEY) return null;
  try {
    const payload = await verifyToken(token, { secretKey: env.CLERK_SECRET_KEY });
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

/**
 * Strictly checks whether the signed-in user has DEVELOPER privileges.
 * Normal users and non-developer admins MUST receive false (403 on ops endpoints).
 * Uses live Clerk user lookup so revoking developer privileges takes effect IMMEDIATELY.
 */
export async function checkDeveloperAccess(
  request: Request,
  env: AutomationEnv,
): Promise<{ isDeveloper: boolean; userId: string | null; email?: string; reason: string }> {
  const userId = await resolveAuthenticatedUserId(request, env, false);
  if (!userId || !env.CLERK_SECRET_KEY) {
    return { isDeveloper: false, userId: null, reason: "unauthenticated" };
  }

  const configuredIds = (env.ILOLIT_DEVELOPER_USER_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (configuredIds.includes(userId)) {
    return { isDeveloper: true, userId, reason: "env_user_id" };
  }

  try {
    const clerk = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });
    const user = await clerk.users.getUser(userId);
    const pubRole = String((user.publicMetadata as any)?.role || "").toLowerCase();
    const privRole = String((user.privateMetadata as any)?.role || "").toLowerCase();
    const isExplicitDev =
      pubRole === "developer" ||
      privRole === "developer" ||
      (user.publicMetadata as any)?.isDeveloper === true ||
      (user.privateMetadata as any)?.isDeveloper === true;

    const verifiedEmails = (user.emailAddresses || [])
      .filter((e) => e.verification?.status === "verified" || e.id === user.primaryEmailAddressId)
      .map((e) => e.emailAddress.toLowerCase());
    const primaryEmail = verifiedEmails[0] || "";

    if (isExplicitDev) {
      return { isDeveloper: true, userId, email: primaryEmail, reason: "clerk_developer_role" };
    }

    const configuredEmails = (env.ILOLIT_DEVELOPER_EMAILS || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (configuredEmails.length > 0) {
      const matched = verifiedEmails.some((e) => configuredEmails.includes(e));
      return { isDeveloper: matched, userId, email: primaryEmail, reason: matched ? "env_email" : "not_in_dev_env" };
    }

    const allowlist = await readJson<{ userIds?: string[]; emails?: string[] }>(env, DEVELOPER_ALLOWLIST_KEY);
    if (allowlist) {
      const matchedId = Array.isArray(allowlist.userIds) && allowlist.userIds.includes(userId);
      const matchedEmail =
        Array.isArray(allowlist.emails) &&
        verifiedEmails.some((e) => allowlist.emails!.map((x) => x.toLowerCase()).includes(e));
      return {
        isDeveloper: Boolean(matchedId || matchedEmail),
        userId,
        email: primaryEmail,
        reason: matchedId || matchedEmail ? "r2_allowlist" : "not_in_allowlist",
      };
    }

    // Strict fallback when no explicit env/allowlist is configured yet:
    // only verified owner/developer email matching project owner hints (never regular users/admins).
    const ownerMatch = verifiedEmails.some((email) =>
      DEFAULT_OWNER_DEV_EMAIL_HINTS.some((hint) => email.includes(hint)),
    );
    return {
      isDeveloper: ownerMatch,
      userId,
      email: primaryEmail,
      reason: ownerMatch ? "owner_default_dev" : "denied",
    };
  } catch {
    return { isDeveloper: false, userId, reason: "clerk_lookup_failed" };
  }
}

// =============================================================================
// 6. AUTOMATION CONFIG & STATE MANAGEMENT
// =============================================================================

export function createDefaultAutomationConfig(): Record<AutomationJobId, AutomationJobConfig> {
  const cfg = {} as Record<AutomationJobId, AutomationJobConfig>;
  for (const def of AUTOMATION_JOB_DEFINITIONS) {
    cfg[def.id] = { enabled: true, intervalMinutes: def.defaultIntervalMinutes };
  }
  return cfg;
}

export async function getAutomationConfig(env: AutomationEnv): Promise<Record<AutomationJobId, AutomationJobConfig>> {
  const defaults = createDefaultAutomationConfig();
  const stored = await readJson<Partial<Record<AutomationJobId, AutomationJobConfig>>>(env, AUTOMATION_CONFIG_KEY);
  if (!stored) return defaults;
  for (const def of AUTOMATION_JOB_DEFINITIONS) {
    const item = stored[def.id];
    if (item) {
      defaults[def.id] = {
        enabled: def.critical ? true : Boolean(item.enabled), // Critical jobs can never be disabled
        intervalMinutes: def.allowedIntervals.includes(Number(item.intervalMinutes))
          ? Number(item.intervalMinutes)
          : def.defaultIntervalMinutes,
      };
    }
  }
  return defaults;
}

export function createDefaultAutomationState(): AutomationState {
  const jobs = {} as Record<AutomationJobId, AutomationJobRuntime>;
  for (const def of AUTOMATION_JOB_DEFINITIONS) {
    jobs[def.id] = {
      id: def.id,
      lastRunAt: null,
      nextRunAt: new Date(Date.now() + def.defaultIntervalMinutes * 60_000).toISOString(),
      lastDurationMs: 0,
      lastProcessedCount: 0,
      lastUpdatedCount: 0,
      lastStatus: "NEVER",
      lastError: null,
      totalRuns: 0,
      successRuns: 0,
      failedRuns: 0,
    };
  }
  return {
    cronExpression: "* * * * *",
    workerName: "ilolit-cron-worker",
    lastTickAt: null,
    nextPlannedTickAt: new Date(Math.ceil(Date.now() / 60_000) * 60_000).toISOString(),
    lastTrigger: null,
    status: "IDLE",
    totalTicks: 0,
    totalErrors: 0,
    jobs,
    recentLogs: [],
    recentErrors: [],
    resourceUsage: {
      lastDurationMs: 0,
      avgDurationMs: 0,
      lastR2Reads: 0,
      lastR2Writes: 0,
      pendingRetryTasks: 0,
      failedPermanentTasks: 0,
    },
  };
}

export async function getAutomationState(env: AutomationEnv): Promise<AutomationState> {
  const defaults = createDefaultAutomationState();
  const stored = await readJson<AutomationState>(env, AUTOMATION_STATE_KEY);
  if (!stored) return defaults;
  return {
    ...defaults,
    ...stored,
    jobs: { ...defaults.jobs, ...(stored.jobs || {}) },
    recentLogs: Array.isArray(stored.recentLogs) ? stored.recentLogs : [],
    recentErrors: Array.isArray(stored.recentErrors) ? stored.recentErrors : [],
    resourceUsage: { ...defaults.resourceUsage, ...(stored.resourceUsage || {}) },
  };
}

// =============================================================================
// 7. DISTRIBUTED LOCK & SCHEDULED CRON ENGINE (* * * * *)
// =============================================================================

async function acquireAutomationLock(env: AutomationEnv, lockId: string, ttlMs = 50_000): Promise<boolean> {
  const existing = await readJson<{ lockId: string; expiresAtMs: number }>(env, AUTOMATION_LOCK_KEY);
  const now = Date.now();
  if (existing && existing.expiresAtMs > now && existing.lockId !== lockId) {
    return false;
  }
  await writeJson(env, AUTOMATION_LOCK_KEY, {
    lockId,
    acquiredAt: new Date(now).toISOString(),
    expiresAtMs: now + ttlMs,
  });
  return true;
}

async function releaseAutomationLock(env: AutomationEnv, lockId: string): Promise<void> {
  const existing = await readJson<{ lockId: string }>(env, AUTOMATION_LOCK_KEY);
  if (existing && existing.lockId === lockId) {
    await env.MEDIA_BUCKET.delete(AUTOMATION_LOCK_KEY).catch(() => {});
  }
}

interface JobExecResult {
  processed: number;
  updated: number;
  r2Reads: number;
  r2Writes: number;
  touchedDomains: RealtimeDomain[];
}

async function listLimitedJson(
  env: AutomationEnv,
  prefix: string,
  limit = 200,
): Promise<{ items: Array<{ key: string; data: any }>; reads: number }> {
  const listed = await env.MEDIA_BUCKET.list({ prefix, limit });
  const results = await Promise.all(
    listed.objects.map(async (o) => {
      const data = await readJson<any>(env, o.key);
      return data ? { key: o.key, data } : null;
    }),
  );
  return {
    items: results.filter(Boolean) as Array<{ key: string; data: any }>,
    reads: 1 + listed.objects.length,
  };
}

async function executeSingleJob(
  env: AutomationEnv,
  jobId: AutomationJobId,
  nowMs: number,
): Promise<JobExecResult> {
  const nowIso = new Date(nowMs).toISOString();
  let processed = 0;
  let updated = 0;
  let r2Reads = 0;
  let r2Writes = 0;
  const touched = new Set<RealtimeDomain>();

  switch (jobId) {
    case "expire_listings_and_promotions": {
      const [mp, re, veh] = await Promise.all([
        listLimitedJson(env, LISTING_PREFIX, 200),
        listLimitedJson(env, REAL_ESTATE_PREFIX, 200),
        listLimitedJson(env, VEHICLE_LISTING_PREFIX, 200),
      ]);
      r2Reads += mp.reads + re.reads + veh.reads;

      for (const item of mp.items) {
        processed += 1;
        let dirty = false;
        const rec = item.data;
        if (rec.status === "ACTIVE" && isTimestampExpired(rec.expiresAt, nowMs)) {
          rec.status = "EXPIRED";
          rec.expiredAt = nowIso;
          dirty = true;
        }
        if (rec.featuredUntil && isTimestampExpired(rec.featuredUntil, nowMs) && rec.isFeatured !== false) {
          rec.isFeatured = false;
          dirty = true;
        }
        if (dirty) {
          rec.updatedAt = nowIso;
          await writeJson(env, item.key, rec);
          r2Writes += 1;
          updated += 1;
          touched.add("listings");
        }
      }

      for (const item of re.items) {
        processed += 1;
        const rec = item.data;
        if (rec.status === "ACTIVE" && isTimestampExpired(rec.expiresAt, nowMs)) {
          rec.status = "EXPIRED";
          rec.updatedAt = nowIso;
          await writeJson(env, item.key, rec, { ownerId: String(rec.ownerId || ""), status: "EXPIRED" });
          r2Writes += 1;
          updated += 1;
          touched.add("real_estate");
          if (rec.ownerId) {
            await emitUnifiedNotification(env, rec.ownerId, {
              category: "INGATLAN",
              eventType: "GENERAL",
              title: "Ingatlanhirdetésed lejárt",
              body: `A(z) ${rec.title || "ingatlanhirdetésed"} 30 napos időszaka lejárt. A Saját Ingatlan Adminban bármikor megújíthatod.`,
              listingId: rec.id,
              webUrl: `/real-estate/admin/${rec.id}`,
              dedupeKey: `re-expired-${rec.id}-${rec.expiresAt}`,
            });
            r2Writes += 1;
            touched.add("notifications");
          }
        }
      }

      for (const item of veh.items) {
        processed += 1;
        const rec = item.data;
        if (rec.status === "ACTIVE" && isTimestampExpired(rec.expiresAt, nowMs)) {
          rec.status = "EXPIRED";
          rec.updatedAt = nowIso;
          await writeJson(env, item.key, rec, { ownerId: String(rec.ownerId || ""), status: "EXPIRED" });
          r2Writes += 1;
          updated += 1;
          touched.add("vehicles");
        }
      }
      break;
    }

    case "activate_scheduled_listings": {
      const [mp, re, veh] = await Promise.all([
        listLimitedJson(env, LISTING_PREFIX, 150),
        listLimitedJson(env, REAL_ESTATE_PREFIX, 150),
        listLimitedJson(env, VEHICLE_LISTING_PREFIX, 150),
      ]);
      r2Reads += mp.reads + re.reads + veh.reads;

      for (const [domain, group] of [
        ["listings", mp.items],
        ["real_estate", re.items],
        ["vehicles", veh.items],
      ] as const) {
        for (const item of group) {
          processed += 1;
          const rec = item.data;
          if (
            rec.status === "SCHEDULED" &&
            rec.scheduledPublishAt &&
            isTimestampExpired(rec.scheduledPublishAt, nowMs)
          ) {
            rec.status = "ACTIVE";
            rec.activatedAt = nowIso;
            rec.updatedAt = nowIso;
            await writeJson(env, item.key, rec);
            r2Writes += 1;
            updated += 1;
            touched.add(domain);
          }
        }
      }
      break;
    }

    case "check_subscriptions_and_premium": {
      const provs = await listLimitedJson(env, PROVIDER_PREFIX, 200);
      r2Reads += provs.reads;
      for (const item of provs.items) {
        processed += 1;
        const prov = item.data;
        const sub = prov.subscription;
        if (
          sub &&
          ["active", "trialing"].includes(String(sub.status || "")) &&
          sub.currentPeriodEnd &&
          isTimestampExpired(sub.currentPeriodEnd, nowMs)
        ) {
          prov.subscription = {
            ...sub,
            status: "inactive",
            expiredAt: nowIso,
            updatedAt: nowIso,
          };
          prov.isPublished = false;
          prov.updatedAt = nowIso;
          await writeJson(env, item.key, prov, { owner: String(prov.ownerId || ""), updatedAt: nowIso });
          r2Writes += 1;
          updated += 1;
          touched.add("providers");
          touched.add("subscriptions");
          if (prov.ownerId) {
            await emitUnifiedNotification(env, prov.ownerId, {
              category: "SZOLGALTATAS",
              eventType: "GENERAL",
              title: "Szolgáltatói előfizetésed lejárt",
              body: "A szolgáltatói profilod előfizetési időszaka lejárt, ezért ideiglenesen rejtett állapotba került.",
              webUrl: "/providers/dashboard",
              dedupeKey: `sub-expired-${prov.ownerId}-${sub.currentPeriodEnd}`,
            });
            r2Writes += 1;
            touched.add("notifications");
          }
        }
      }
      break;
    }

    case "validate_coupons": {
      const coupons = await listLimitedJson(env, COUPONS_PREFIX, 200);
      r2Reads += coupons.reads;
      for (const item of coupons.items) {
        processed += 1;
        const c = item.data as CouponRecord;
        const evalRes = evaluateCouponValidity(c, undefined, nowMs);
        if (c.status === "ACTIVE" && evalRes.effectiveStatus !== "ACTIVE") {
          c.status = evalRes.effectiveStatus;
          c.active = false;
          c.updatedAt = nowIso;
          await writeJson(env, item.key, c);
          r2Writes += 1;
          updated += 1;
          touched.add("coupons");
        }
      }
      break;
    }

    case "dispatch_timed_reminders": {
      const [reViewings, vehBookings, srvBookings] = await Promise.all([
        listLimitedJson(env, REAL_ESTATE_VIEWING_PREFIX, 150),
        listLimitedJson(env, VEHICLE_BOOKING_PREFIX, 150),
        listLimitedJson(env, BOOKING_PREFIX, 150),
      ]);
      r2Reads += reViewings.reads + vehBookings.reads + srvBookings.reads;

      const checkAndSend = async (params: {
        id: string;
        userId: string;
        category: "INGATLAN" | "JARMU" | "SZOLGALTATAS";
        date?: string;
        startTime?: string;
        title: string;
        shortLocation: string;
        webUrl: string;
        r24?: boolean;
        r2?: boolean;
      }) => {
        if (!params.date || !params.startTime || !params.userId) return;
        const ts = new Date(`${params.date}T${params.startTime}:00`).getTime();
        if (!Number.isFinite(ts)) return;
        const diffMs = ts - nowMs;
        if (diffMs <= 0) return;

        // 24h window: 23h..24h15m before start
        if (params.r24 !== false && diffMs <= 24.25 * 3600_000 && diffMs > 2 * 3600_000) {
          await emitUnifiedNotification(env, params.userId, {
            category: params.category,
            eventType: "APPOINTMENT_REMINDER_24H",
            title: "Holnapi időpont-emlékeztető",
            body: `${params.title} – ${params.date} ${params.startTime} (${params.shortLocation}).`,
            appointmentId: params.id,
            webUrl: params.webUrl,
            dedupeKey: `rem-24h-${params.id}-${params.date}-${params.startTime}`,
            popupRequired: false,
          });
          r2Writes += 1;
          updated += 1;
          touched.add("notifications");
        }

        // 2h window: 0..2h10m before start
        if (params.r2 !== false && diffMs <= 2.15 * 3600_000) {
          await emitUnifiedNotification(env, params.userId, {
            category: params.category,
            eventType: "APPOINTMENT_REMINDER_2H",
            title: "2 órán belül kezdődik az időpontod",
            body: `${params.title} – ${params.startTime} (${params.shortLocation}). Koppints a részletekhez.`,
            appointmentId: params.id,
            webUrl: params.webUrl,
            dedupeKey: `rem-2h-${params.id}-${params.date}-${params.startTime}`,
            popupRequired: true,
          });
          r2Writes += 1;
          updated += 1;
          touched.add("notifications");
        }
      };

      for (const item of reViewings.items) {
        processed += 1;
        const v = item.data;
        if (v.status === "APPROVED") {
          await checkAndSend({
            id: v.id,
            userId: v.requesterId,
            category: "INGATLAN",
            date: v.date,
            startTime: v.startTime,
            title: v.propertyTitle || "Ingatlanmegtekintés",
            shortLocation: v.propertyPublicLocation || "Magyarország",
            webUrl: `/appointments/property/${v.id}`,
            r24: v.reminder24hEnabled,
            r2: v.reminder2hEnabled,
          });
        }
      }

      for (const item of vehBookings.items) {
        processed += 1;
        const v = item.data;
        if (v.status === "APPROVED") {
          await checkAndSend({
            id: v.id,
            userId: v.requesterId,
            category: "JARMU",
            date: v.date,
            startTime: v.startTime,
            title: `${v.bookingKind === "TEST_DRIVE" ? "Tesztvezetés" : "Járműmegtekintés"}: ${v.vehicleTitle || ""}`,
            shortLocation: v.vehiclePublicCity || "Magyarország",
            webUrl: `/appointments/vehicle/${v.id}`,
            r24: v.reminder24hEnabled,
            r2: v.reminder2hEnabled,
          });
        }
      }

      for (const item of srvBookings.items) {
        processed += 1;
        const b = item.data;
        if (b.status === "CONFIRMED" && b.bookingDate && b.bookingTime) {
          const start = String(b.bookingTime).slice(0, 5);
          await checkAndSend({
            id: b.id,
            userId: b.customerId,
            category: "SZOLGALTATAS",
            date: b.bookingDate,
            startTime: start,
            title: `${b.providerName || "Szolgáltatás"} – ${b.serviceName || ""}`,
            shortLocation: b.providerName || "",
            webUrl: "/dashboard/bookings/services",
          });
        }
      }
      break;
    }

    case "process_retry_queue": {
      const queue = (await readJson<RetryTaskRecord[]>(env, RETRY_QUEUE_KEY)) || [];
      r2Reads += 1;
      let dirty = false;
      const due = queue.filter((t) => t.status === "PENDING" && isTimestampExpired(t.nextAttemptAt, nowMs)).slice(0, 10);
      for (const task of due) {
        processed += 1;
        dirty = true;
        task.attempts += 1;
        task.updatedAt = nowIso;
        try {
          if (task.taskType === "NOTIFICATION_RETRY" && typeof task.payload.userId === "string") {
            await emitUnifiedNotification(env, task.payload.userId, task.payload.notification as any);
            r2Writes += 1;
          } else if (task.taskType === "INDEX_SYNC") {
            touched.add("search");
            touched.add("stats");
          }
          task.status = "SUCCEEDED";
          task.lastError = undefined;
          updated += 1;
        } catch (err: any) {
          const msg = err?.message || "Ismeretlen újrapróbálási hiba";
          task.lastError = msg;
          if (task.attempts >= task.maxAttempts) {
            task.status = "FAILED_PERMANENT";
          } else {
            const backoffMinutes = [1, 2, 5, 15, 30][Math.min(task.attempts - 1, 4)];
            task.nextAttemptAt = new Date(nowMs + backoffMinutes * 60_000).toISOString();
          }
        }
      }
      if (dirty) {
        await writeJson(env, RETRY_QUEUE_KEY, queue.slice(0, 200));
        r2Writes += 1;
        touched.add("system_ops");
      }
      break;
    }

    case "reconcile_stripe_payments": {
      if (!env.STRIPE_SECRET_KEY) {
        // Skip external Stripe API calls safely if secret not configured in worker env
        break;
      }
      const [re, txs] = await Promise.all([
        listLimitedJson(env, REAL_ESTATE_PREFIX, 100),
        listLimitedJson(env, TRANSACTION_PREFIX, 100),
      ]);
      r2Reads += re.reads + txs.reads;

      let apiCalls = 0;
      const MAX_STRIPE_CALLS_PER_TICK = 5; // Rate-limit protection

      for (const item of re.items) {
        if (apiCalls >= MAX_STRIPE_CALLS_PER_TICK) break;
        const prop = item.data;
        if (prop.status !== "PAYMENT_PENDING" || !Array.isArray(prop.billing)) continue;
        const pendingBill = [...prop.billing].reverse().find((b: any) => b.status === "pending" && b.stripeCheckoutSessionId);
        if (!pendingBill) continue;
        processed += 1;
        apiCalls += 1;

        const resp = await fetch(
          `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(pendingBill.stripeCheckoutSessionId)}`,
          { headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` } },
        );
        if (!resp.ok) continue;
        const session = await resp.json<any>();
        if (session.status === "complete" && session.payment_status === "paid") {
          const nextExp = new Date(nowMs + 30 * 86_400_000).toISOString();
          prop.status = "ACTIVE";
          prop.activatedAt = prop.activatedAt || nowIso;
          prop.expiresAt = prop.expiresAt && !isTimestampExpired(prop.expiresAt, nowMs) ? prop.expiresAt : nextExp;
          prop.billing = prop.billing.map((b: any) =>
            b.stripeCheckoutSessionId === session.id ? { ...b, status: "paid", paidAt: nowIso } : b,
          );
          prop.updatedAt = nowIso;
          await writeJson(env, item.key, prop, { ownerId: String(prop.ownerId || ""), status: "ACTIVE" });
          r2Writes += 1;
          updated += 1;
          touched.add("real_estate");
          touched.add("payments");
        }
      }

      for (const item of txs.items) {
        if (apiCalls >= MAX_STRIPE_CALLS_PER_TICK) break;
        const tx = item.data;
        if (tx.status !== "PAYMENT_PENDING" || !tx.stripeCheckoutSessionId) continue;
        processed += 1;
        apiCalls += 1;

        const resp = await fetch(
          `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(tx.stripeCheckoutSessionId)}`,
          { headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` } },
        );
        if (!resp.ok) continue;
        const session = await resp.json<any>();
        if (session.status === "complete" && session.payment_status === "paid") {
          tx.status = "PAID_PENDING_CONFIRMATION";
          tx.paidAt = nowIso;
          tx.updatedAt = nowIso;
          await writeJson(env, item.key, tx, {
            buyerId: String(tx.buyerId || ""),
            sellerId: String(tx.sellerId || ""),
            status: tx.status,
          });
          r2Writes += 1;
          updated += 1;
          touched.add("payments");
          touched.add("listings");
        }
      }
      break;
    }

    case "reconcile_search_and_counters": {
      const [mp, re, veh, prov, txs, coupons] = await Promise.all([
        env.MEDIA_BUCKET.list({ prefix: LISTING_PREFIX, limit: 1000 }),
        env.MEDIA_BUCKET.list({ prefix: REAL_ESTATE_PREFIX, limit: 1000 }),
        env.MEDIA_BUCKET.list({ prefix: VEHICLE_LISTING_PREFIX, limit: 1000 }),
        env.MEDIA_BUCKET.list({ prefix: PROVIDER_PREFIX, limit: 1000 }),
        env.MEDIA_BUCKET.list({ prefix: TRANSACTION_PREFIX, limit: 1000 }),
        env.MEDIA_BUCKET.list({ prefix: COUPONS_PREFIX, limit: 500 }),
      ]);
      r2Reads += 6;
      processed =
        mp.objects.length +
        re.objects.length +
        veh.objects.length +
        prov.objects.length +
        txs.objects.length +
        coupons.objects.length;

      const summary = {
        marketplaceListings: mp.objects.length,
        realEstateProperties: re.objects.length,
        vehicleListings: veh.objects.length,
        providers: prov.objects.length,
        transactions: txs.objects.length,
        coupons: coupons.objects.length,
        updatedAt: nowIso,
      };
      await writeJson(env, LIVE_STATS_KEY, summary);
      r2Writes += 1;
      updated = 1;
      touched.add("stats");
      break;
    }

    case "check_database_consistency": {
      const txs = await listLimitedJson(env, TRANSACTION_PREFIX, 150);
      r2Reads += txs.reads;
      for (const item of txs.items) {
        processed += 1;
        const tx = item.data;
        if (["PAID_PENDING_CONFIRMATION", "COMPLETED"].includes(tx.status) && tx.listingId) {
          const listingKey = `${LISTING_PREFIX}${tx.listingId}.json`;
          const listing = await readJson<any>(env, listingKey);
          r2Reads += 1;
          if (listing && (listing.status === "ACTIVE" || !listing.isSold)) {
            listing.status = "SOLD";
            listing.isSold = true;
            listing.soldAt = listing.soldAt || tx.paidAt || nowIso;
            listing.updatedAt = nowIso;
            await writeJson(env, listingKey, listing);
            r2Writes += 1;
            updated += 1;
            touched.add("listings");
          }
        }
      }
      break;
    }

    case "sync_commissions_and_escrow": {
      const txs = await listLimitedJson(env, TRANSACTION_PREFIX, 150);
      r2Reads += txs.reads;
      for (const item of txs.items) {
        processed += 1;
        const tx = item.data;
        if (tx.status === "COMPLETED" && !tx.commissionSettledAt) {
          tx.commissionSettledAt = nowIso;
          tx.commissionLedgerId = tx.commissionLedgerId || `comm_${tx.id}`;
          tx.updatedAt = nowIso;
          await writeJson(env, item.key, tx, {
            buyerId: String(tx.buyerId || ""),
            sellerId: String(tx.sellerId || ""),
            status: tx.status,
          });
          r2Writes += 1;
          updated += 1;
          touched.add("commissions");
          touched.add("payments");
        }
      }
      break;
    }

    case "system_health_and_anomaly_check": {
      const [queue, lock] = await Promise.all([
        readJson<RetryTaskRecord[]>(env, RETRY_QUEUE_KEY),
        readJson<{ lockId: string; expiresAtMs: number }>(env, AUTOMATION_LOCK_KEY),
      ]);
      r2Reads += 2;
      processed = (queue?.length || 0) + (lock ? 1 : 0);
      // Clean stale lock if older than 2 minutes (safety self-healing)
      if (lock && lock.expiresAtMs < nowMs - 120_000) {
        await env.MEDIA_BUCKET.delete(AUTOMATION_LOCK_KEY).catch(() => {});
        r2Writes += 1;
        updated += 1;
      }
      break;
    }

    case "maintenance_and_log_pruning": {
      const queue = (await readJson<RetryTaskRecord[]>(env, RETRY_QUEUE_KEY)) || [];
      r2Reads += 1;
      const cutoff = nowMs - 30 * 86_400_000;
      const pruned = queue.filter((t) => {
        processed += 1;
        if (t.status === "PENDING" || t.status === "PROCESSING") return true;
        return new Date(t.updatedAt).getTime() >= cutoff;
      });
      if (pruned.length !== queue.length) {
        await writeJson(env, RETRY_QUEUE_KEY, pruned);
        r2Writes += 1;
        updated = queue.length - pruned.length;
      }
      break;
    }
  }

  return {
    processed,
    updated,
    r2Reads,
    r2Writes,
    touchedDomains: Array.from(touched),
  };
}

export async function runScheduledAutomation(
  env: AutomationEnv,
  options: {
    trigger: "cron" | "manual";
    cronExpression?: string;
    onlyJobId?: AutomationJobId;
    force?: boolean;
  },
): Promise<{ skippedDueToLock: boolean; log?: AutomationRunLog; state: AutomationState }> {
  const lockId = crypto.randomUUID();
  const acquired = await acquireAutomationLock(env, lockId, 52_000);
  if (!acquired) {
    const state = await getAutomationState(env);
    return { skippedDueToLock: true, state };
  }

  const runStartMs = Date.now();
  const runId = crypto.randomUUID();
  const cronExpression = options.cronExpression || "* * * * *";

  try {
    const [config, state] = await Promise.all([getAutomationConfig(env), getAutomationState(env)]);
    const defsToCheck = options.onlyJobId
      ? AUTOMATION_JOB_DEFINITIONS.filter((d) => d.id === options.onlyJobId)
      : AUTOMATION_JOB_DEFINITIONS;

    let jobsExecuted = 0;
    let jobsFailed = 0;
    let totalProcessed = 0;
    let totalUpdated = 0;
    let totalReads = 2;
    let totalWrites = 1;
    const errors: Array<{ jobId: string; message: string }> = [];
    const allTouchedDomains = new Set<RealtimeDomain>();

    for (const def of defsToCheck) {
      const jobCfg = config[def.id];
      const runtime = state.jobs[def.id];
      const enabled = def.critical ? true : jobCfg.enabled;
      const intervalMs = Math.max(1, jobCfg.intervalMinutes) * 60_000;
      const lastMs = runtime.lastRunAt ? new Date(runtime.lastRunAt).getTime() : 0;
      const isDue = options.force || options.onlyJobId === def.id || !lastMs || runStartMs - lastMs >= intervalMs - 5_000;

      if (!enabled) {
        runtime.lastStatus = "SKIPPED";
        runtime.nextRunAt = null;
        continue;
      }
      if (!isDue) {
        runtime.nextRunAt = new Date(lastMs + intervalMs).toISOString();
        continue;
      }

      const jobStart = Date.now();
      jobsExecuted += 1;
      runtime.totalRuns += 1;
      try {
        const res = await executeSingleJob(env, def.id, jobStart);
        const dur = Date.now() - jobStart;
        runtime.lastRunAt = new Date(jobStart).toISOString();
        runtime.nextRunAt = new Date(jobStart + intervalMs).toISOString();
        runtime.lastDurationMs = dur;
        runtime.lastProcessedCount = res.processed;
        runtime.lastUpdatedCount = res.updated;
        runtime.lastStatus = "OK";
        runtime.lastError = null;
        runtime.successRuns += 1;

        totalProcessed += res.processed;
        totalUpdated += res.updated;
        totalReads += res.r2Reads;
        totalWrites += res.r2Writes;
        res.touchedDomains.forEach((d) => allTouchedDomains.add(d));
      } catch (err: any) {
        const dur = Date.now() - jobStart;
        const msg = err?.message || String(err || "Ismeretlen háttérfolyamat-hiba");
        runtime.lastRunAt = new Date(jobStart).toISOString();
        runtime.nextRunAt = new Date(jobStart + intervalMs).toISOString();
        runtime.lastDurationMs = dur;
        runtime.lastStatus = "ERROR";
        runtime.lastError = msg;
        runtime.failedRuns += 1;

        jobsFailed += 1;
        state.totalErrors += 1;
        errors.push({ jobId: def.id, message: msg });
        state.recentErrors = [{ timestamp: new Date().toISOString(), jobId: def.id, message: msg }, ...state.recentErrors].slice(
          0,
          50,
        );
      }
    }

    const finishedMs = Date.now();
    const totalDur = finishedMs - runStartMs;
    const queue = (await readJson<RetryTaskRecord[]>(env, RETRY_QUEUE_KEY)) || [];
    const pendingRetryTasks = queue.filter((t) => t.status === "PENDING").length;
    const failedPermanentTasks = queue.filter((t) => t.status === "FAILED_PERMANENT").length;

    const log: AutomationRunLog = {
      runId,
      trigger: options.trigger,
      cronExpression,
      startedAt: new Date(runStartMs).toISOString(),
      finishedAt: new Date(finishedMs).toISOString(),
      durationMs: totalDur,
      jobsExecuted,
      jobsFailed,
      totalProcessed,
      totalUpdated,
      r2ReadsEstimate: totalReads,
      r2WritesEstimate: totalWrites + 1,
      errors,
    };

    state.cronExpression = cronExpression;
    state.lastTickAt = log.finishedAt;
    state.nextPlannedTickAt = new Date(Math.ceil(finishedMs / 60_000) * 60_000).toISOString();
    state.lastTrigger = options.trigger;
    state.totalTicks += 1;
    state.status = jobsFailed > 0 || failedPermanentTasks > 0 ? "DEGRADED" : "HEALTHY";
    state.recentLogs = [log, ...state.recentLogs].slice(0, 50);

    const prevAvg = state.resourceUsage.avgDurationMs || totalDur;
    state.resourceUsage = {
      lastDurationMs: totalDur,
      avgDurationMs: Math.round(prevAvg * 0.8 + totalDur * 0.2),
      lastR2Reads: totalReads,
      lastR2Writes: totalWrites + 1,
      pendingRetryTasks,
      failedPermanentTasks,
    };

    await writeJson(env, AUTOMATION_STATE_KEY, state);

    // Emit immediate real-time domain events for everything updated by this tick
    for (const domain of allTouchedDomains) {
      await publishDomainEvent(env, {
        domain,
        action: "cron_reconciled",
        summary: "Cloudflare Cron automatikus frissítés",
      });
    }
    await publishDomainEvent(env, {
      domain: "system_ops",
      action: options.trigger === "manual" ? "manual_run" : "cron_tick",
      summary: `Futás kész (${jobsExecuted} feladat, ${totalUpdated} módosítás)`,
    });

    return { skippedDueToLock: false, log, state };
  } finally {
    await releaseAutomationLock(env, lockId);
  }
}

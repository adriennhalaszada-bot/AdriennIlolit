import {
  AUTOMATION_CONFIG_KEY,
  AUTOMATION_JOB_DEFINITIONS,
  COUPONS_PREFIX,
  LIVE_STATS_KEY,
  RETRY_QUEUE_KEY,
  checkDeveloperAccess,
  evaluateCouponValidity,
  getAutomationConfig,
  getAutomationState,
  getGlobalEventState,
  getUserEventState,
  publishDomainEvent,
  resolveAuthenticatedUserId,
  runScheduledAutomation,
  type AutomationEnv,
  type AutomationJobId,
  type CouponRecord,
  type RetryTaskRecord,
} from "../../_shared/realtimeAutomation";

type Context = EventContext<AutomationEnv, string, Record<string, unknown>>;

function json(data: unknown, status = 200, extraHeaders?: Record<string, string>) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      "CDN-Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
      ...(extraHeaders || {}),
    },
  });
}

function routeParts(context: Context): string[] {
  const val = context.params.path;
  return (Array.isArray(val) ? val : typeof val === "string" ? val.split("/") : [])
    .map((p) => decodeURIComponent(p))
    .filter(Boolean);
}

async function readJson<T = any>(env: AutomationEnv, key: string): Promise<T | null> {
  const obj = await env.MEDIA_BUCKET.get(key);
  if (!obj) return null;
  try {
    return await obj.json<T>();
  } catch {
    return null;
  }
}

async function writeJson(env: AutomationEnv, key: string, value: unknown): Promise<void> {
  await env.MEDIA_BUCKET.put(key, JSON.stringify(value), {
    httpMetadata: { contentType: "application/json" },
  });
}

export const onRequest: PagesFunction<AutomationEnv> = async (rawContext) => {
  const context = rawContext as Context;
  const method = context.request.method.toUpperCase();
  if (method === "OPTIONS") return json(null, 204);

  const route = routeParts(context);
  const env = context.env;

  // =========================================================================
  // 1. REAL-TIME GLOBAL + USER EVENT STREAM (SSE: GET /api/system/events)
  // Privacy rule: public stream contains ONLY domain version counters (zero PII).
  // Authenticated user gets their own private domain version bumps too.
  // =========================================================================
  if (method === "GET" && route[0] === "events") {
    const userId = await resolveAuthenticatedUserId(context.request, env, true);
    const encoder = new TextEncoder();
    let closed = false;

    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: string, data: unknown) => {
          if (closed) return;
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        };

        let lastGlobalVer = -1;
        let lastUserVer = -1;
        try {
          for (let tick = 0; tick < 10; tick += 1) {
            if (closed || context.request.signal.aborted) break;
            const [gState, uState] = await Promise.all([
              getGlobalEventState(env),
              userId ? getUserEventState(env, userId) : Promise.resolve(null),
            ]);

            const uVer = uState ? uState.version : 0;
            if (tick === 0 || gState.globalVersion !== lastGlobalVer || uVer !== lastUserVer) {
              lastGlobalVer = gState.globalVersion;
              lastUserVer = uVer;
              send("version", {
                globalVersion: gState.globalVersion,
                versions: gState.versions,
                userVersion: uVer,
                userDomains: uState?.domains || {},
                updatedAt: gState.updatedAt,
              });
            } else {
              send("ping", { ts: Date.now() });
            }

            if (tick < 9) {
              await new Promise((r) => setTimeout(r, 2500));
            }
          }
        } catch {
          // Graceful close -> EventSource reconnects automatically
        } finally {
          if (!closed) {
            closed = true;
            try {
              controller.close();
            } catch {
              // ignore
            }
          }
        }
      },
      cancel() {
        closed = true;
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "CDN-Cache-Control": "no-store",
        Connection: "keep-alive",
      },
    });
  }

  // Lightweight polling fallback for version vector (GET /api/system/state)
  if (method === "GET" && route[0] === "state") {
    const userId = await resolveAuthenticatedUserId(context.request, env, false);
    const [gState, uState] = await Promise.all([
      getGlobalEventState(env),
      userId ? getUserEventState(env, userId) : Promise.resolve(null),
    ]);
    return json({
      globalVersion: gState.globalVersion,
      versions: gState.versions,
      userVersion: uState?.version || 0,
      userDomains: uState?.domains || {},
      updatedAt: gState.updatedAt,
    });
  }

  // Real-time operational public summary stats (GET /api/system/stats)
  if (method === "GET" && route[0] === "stats") {
    const stats = (await readJson<any>(env, LIVE_STATS_KEY)) || {
      marketplaceListings: 0,
      realEstateProperties: 0,
      vehicleListings: 0,
      providers: 0,
      transactions: 0,
      coupons: 0,
      updatedAt: new Date().toISOString(),
    };
    return json(stats);
  }

  // Instant coupon validation based on current timestamp (GET /api/system/coupons/validate)
  if (method === "GET" && route[0] === "coupons" && route[1] === "validate") {
    const url = new URL(context.request.url);
    const code = (url.searchParams.get("code") || "").trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
    const moduleName = (url.searchParams.get("module") || "").trim();
    if (!code) return json({ valid: false, reason: "Add meg a kuponkódot." }, 400);
    const coupon = await readJson<CouponRecord>(env, `${COUPONS_PREFIX}${code}.json`);
    const evaluation = evaluateCouponValidity(coupon, moduleName || undefined, Date.now());
    return json({
      code,
      valid: evaluation.valid,
      reason: evaluation.reason || null,
      status: evaluation.effectiveStatus,
      discountType: evaluation.valid ? coupon?.discountType : null,
      discountValue: evaluation.valid ? coupon?.discountValue : null,
      description: evaluation.valid ? coupon?.description : null,
    });
  }

  // =========================================================================
  // 2. DEVELOPER-ONLY SYSTEM OPERATIONS & CLOUDFLARE AUTOMATION (/api/system/ops/*)
  // Strictly inaccessible to regular users and non-developer administrators!
  // =========================================================================
  if (route[0] === "ops") {
    const access = await checkDeveloperAccess(context.request, env);

    // Non-leaking access check for UI visibility
    if (method === "GET" && route[1] === "access") {
      return json({ isDeveloper: access.isDeveloper });
    }

    if (!access.isDeveloper) {
      return json(
        { error: "Hozzáférés megtagadva. Ez a felület kizárólag fejlesztői jogosultsággal érhető el." },
        403,
      );
    }

    // GET /api/system/ops/dashboard
    if (method === "GET" && route[1] === "dashboard") {
      const [state, config, queue, events, stats] = await Promise.all([
        getAutomationState(env),
        getAutomationConfig(env),
        readJson<RetryTaskRecord[]>(env, RETRY_QUEUE_KEY),
        getGlobalEventState(env),
        readJson<any>(env, LIVE_STATS_KEY),
      ]);

      const jobs = AUTOMATION_JOB_DEFINITIONS.map((def) => ({
        ...def,
        config: config[def.id],
        runtime: state.jobs[def.id],
      }));

      return json({
        cron: {
          workerName: state.workerName,
          cronExpression: state.cronExpression,
          status: state.status,
          lastTickAt: state.lastTickAt,
          nextPlannedTickAt: state.nextPlannedTickAt,
          lastTrigger: state.lastTrigger,
          totalTicks: state.totalTicks,
          totalErrors: state.totalErrors,
        },
        jobs,
        retryQueue: (queue || []).slice(0, 100),
        recentLogs: state.recentLogs,
        recentErrors: state.recentErrors,
        resourceUsage: state.resourceUsage,
        realtimeBus: {
          globalVersion: events.globalVersion,
          updatedAt: events.updatedAt,
          recentEvents: events.recentEvents.slice(0, 30),
        },
        liveStats: stats || null,
        developer: { userId: access.userId, email: access.email },
      });
    }

    // POST /api/system/ops/run (Manual execution of full cycle or single job)
    if (method === "POST" && route[1] === "run") {
      const body = await context.request.json<{ jobId?: AutomationJobId }>().catch(() => ({}));
      const validIds = new Set<string>(AUTOMATION_JOB_DEFINITIONS.map((d) => d.id));
      const onlyJobId = body.jobId && validIds.has(body.jobId) ? body.jobId : undefined;
      const result = await runScheduledAutomation(env, {
        trigger: "manual",
        cronExpression: "* * * * *",
        onlyJobId,
        force: true,
      });
      return json(result);
    }

    // PATCH /api/system/ops/jobs/:jobId (Enable/disable or change schedule interval)
    if (method === "PATCH" && route[1] === "jobs" && route[2]) {
      const jobId = route[2] as AutomationJobId;
      const def = AUTOMATION_JOB_DEFINITIONS.find((d) => d.id === jobId);
      if (!def) return json({ error: "Ismeretlen háttérfeladat-azonosító." }, 404);

      const body = await context.request
        .json<{ enabled?: boolean; intervalMinutes?: number }>()
        .catch(() => ({}));

      if (def.critical && body.enabled === false) {
        return json(
          {
            error:
              "Kritikus fizetési, adatbiztonsági vagy jogosultságkezelési háttérfolyamat biztonsági okokból nem tiltható le.",
          },
          403,
        );
      }

      const config = await getAutomationConfig(env);
      const nextEnabled = def.critical ? true : body.enabled !== undefined ? Boolean(body.enabled) : config[jobId].enabled;
      let nextInterval = config[jobId].intervalMinutes;
      if (body.intervalMinutes !== undefined) {
        const parsed = Number(body.intervalMinutes);
        if (!def.allowedIntervals.includes(parsed)) {
          return json(
            {
              error: `Nem támogatott futtatási gyakoriság. Engedélyezett értékek (perc): ${def.allowedIntervals.join(", ")}.`,
            },
            400,
          );
        }
        nextInterval = parsed;
      }

      config[jobId] = { enabled: nextEnabled, intervalMinutes: nextInterval };
      await writeJson(env, AUTOMATION_CONFIG_KEY, config);
      await publishDomainEvent(env, {
        domain: "system_ops",
        action: "job_config_updated",
        entityId: jobId,
        summary: `${def.name}: ${nextEnabled ? "aktív" : "letiltva"} (${nextInterval} perc)`,
      });

      return json({ jobId, config: config[jobId] });
    }

    // POST /api/system/ops/coupons (Create/update coupon with immediate cache sync)
    if (method === "POST" && route[1] === "coupons") {
      const body = await context.request.json<any>().catch(() => ({}));
      const code = String(body.code || "").trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
      if (!code) return json({ error: "A kuponkód megadása kötelező." }, 400);
      const now = new Date().toISOString();
      const coupon: CouponRecord = {
        code,
        description: String(body.description || "").trim().slice(0, 200),
        discountType: body.discountType === "fixed_huf" ? "fixed_huf" : "percent",
        discountValue: Math.max(1, Math.round(Number(body.discountValue) || 10)),
        applicableModules: Array.isArray(body.applicableModules) ? body.applicableModules : ["all"],
        active: body.active !== false,
        startsAt: body.startsAt || null,
        expiresAt: body.expiresAt || null,
        maxUses: body.maxUses ? Math.max(1, Math.round(Number(body.maxUses))) : null,
        usedCount: Math.max(0, Math.round(Number(body.usedCount) || 0)),
        status: body.active === false ? "DISABLED" : "ACTIVE",
        createdAt: now,
        updatedAt: now,
      };
      await writeJson(env, `${COUPONS_PREFIX}${code}.json`, coupon);
      await publishDomainEvent(env, {
        domain: "coupons",
        action: "coupon_saved",
        entityId: code,
      });
      return json(coupon, 201);
    }

    // POST /api/system/ops/retry/:taskId (Force immediate retry of queued task)
    if (method === "POST" && route[1] === "retry" && route[2]) {
      const taskId = route[2];
      const queue = (await readJson<RetryTaskRecord[]>(env, RETRY_QUEUE_KEY)) || [];
      const target = queue.find((t) => t.id === taskId);
      if (!target) return json({ error: "A háttérfeladat nem található." }, 404);
      target.status = "PENDING";
      target.nextAttemptAt = new Date().toISOString();
      target.updatedAt = new Date().toISOString();
      await writeJson(env, RETRY_QUEUE_KEY, queue);
      const res = await runScheduledAutomation(env, {
        trigger: "manual",
        onlyJobId: "process_retry_queue",
        force: true,
      });
      return json({ retried: true, result: res });
    }
  }

  return json({ error: "Ismeretlen rendszervégpont." }, 404);
};

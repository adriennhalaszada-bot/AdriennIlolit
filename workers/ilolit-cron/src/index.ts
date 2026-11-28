import {
  getAutomationState,
  runScheduledAutomation,
  type AutomationEnv,
} from "../../../functions/_shared/realtimeAutomation";

export default {
  /**
   * Native Cloudflare Cron Trigger handler (* * * * * — runs every minute, 24/7,
   * completely independent of website traffic, user activity, or admin login).
   */
  async scheduled(
    controller: ScheduledController,
    env: AutomationEnv,
    ctx: ExecutionContext,
  ): Promise<void> {
    ctx.waitUntil(
      runScheduledAutomation(env, {
        trigger: "cron",
        cronExpression: controller.cron || "* * * * *",
      }).then((result) => {
        if (result.skippedDueToLock) {
          console.log("[ILOLIT Cron] Előző futás még zárolás alatt — biztonságos átugrás.");
        } else {
          console.log(
            `[ILOLIT Cron] Kész: ${result.log?.jobsExecuted || 0} feladat, ` +
              `${result.log?.totalProcessed || 0} ellenőrzött, ` +
              `${result.log?.totalUpdated || 0} frissített rekord (${result.log?.durationMs || 0} ms).`,
          );
        }
      }),
    );
  },

  /**
   * Minimal authenticated health & status endpoint for Cloudflare observability.
   */
  async fetch(request: Request, env: AutomationEnv): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      const state = await getAutomationState(env);
      return Response.json(
        {
          ok: true,
          worker: "ilolit-cron-worker",
          cronExpression: state.cronExpression,
          status: state.status,
          lastTickAt: state.lastTickAt,
          nextPlannedTickAt: state.nextPlannedTickAt,
          totalTicks: state.totalTicks,
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    return Response.json(
      { error: "ILOLIT Cloudflare Cron Worker – külső közvetlen hozzáférés nem engedélyezett." },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  },
};

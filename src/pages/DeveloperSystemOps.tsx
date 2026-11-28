import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/react";
import { customFetch } from "@workspace/api-client-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useRealtimeSync } from "@/context/RealtimeSyncContext";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  Lock,
  Play,
  RefreshCw,
  Server,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  Zap,
} from "lucide-react";

interface OpsJobItem {
  id: string;
  name: string;
  description: string;
  category: string;
  critical: boolean;
  defaultIntervalMinutes: number;
  allowedIntervals: number[];
  config: {
    enabled: boolean;
    intervalMinutes: number;
  };
  runtime: {
    id: string;
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
  };
}

interface OpsDashboardResponse {
  cron: {
    workerName: string;
    cronExpression: string;
    status: "HEALTHY" | "DEGRADED" | "IDLE";
    lastTickAt: string | null;
    nextPlannedTickAt: string | null;
    lastTrigger: "cron" | "manual" | null;
    totalTicks: number;
    totalErrors: number;
  };
  jobs: OpsJobItem[];
  retryQueue: Array<{
    id: string;
    taskType: string;
    targetId: string;
    attempts: number;
    maxAttempts: number;
    status: string;
    nextAttemptAt: string;
    lastError?: string;
    updatedAt: string;
  }>;
  recentLogs: Array<{
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
  }>;
  recentErrors: Array<{ timestamp: string; jobId: string; message: string }>;
  resourceUsage: {
    lastDurationMs: number;
    avgDurationMs: number;
    lastR2Reads: number;
    lastR2Writes: number;
    pendingRetryTasks: number;
    failedPermanentTasks: number;
  };
  realtimeBus: {
    globalVersion: number;
    updatedAt: string;
    recentEvents: Array<{
      id: string;
      domain: string;
      action: string;
      entityId?: string;
      version: number;
      timestamp: string;
      summary?: string;
    }>;
  };
  liveStats: Record<string, any> | null;
  developer: { userId: string; email?: string };
}

function fmtTime(iso?: string | null): string {
  if (!iso) return "Még nem futott";
  try {
    return new Date(iso).toLocaleString("hu-HU", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function DeveloperSystemOps() {
  const { isSignedIn } = useUser();
  const { isDeveloper, developerChecked, connected: sseConnected, globalVersion } = useRealtimeSync();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"jobs" | "queue" | "logs" | "errors" | "events">("jobs");

  const { data, isLoading, error, refetch } = useQuery<OpsDashboardResponse>({
    queryKey: ["system-ops-dashboard"],
    queryFn: () => customFetch<OpsDashboardResponse>("/api/system/ops/dashboard"),
    enabled: Boolean(isSignedIn && isDeveloper),
    refetchInterval: 5000,
  });

  const handleManualRun = async (jobId?: string) => {
    setBusyKey(jobId || "all");
    try {
      const res = await customFetch<any>("/api/system/ops/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(jobId ? { jobId } : {}),
      });
      await queryClient.invalidateQueries({ queryKey: ["system-ops-dashboard"] });
      if (res?.skippedDueToLock) {
        toast({
          title: "Futtatás már folyamatban",
          description: "Az elosztott futási zárolás megakadályozta a párhuzamos átfedést.",
        });
      } else {
        toast({
          title: jobId ? "Háttérfeladat sikeresen lefutott" : "Teljes automatizálási ciklus lefutott",
          description: `${res?.log?.jobsExecuted || 0} feladat, ${res?.log?.totalProcessed || 0} ellenőrzött, ${res?.log?.totalUpdated || 0} módosított rekord (${res?.log?.durationMs || 0} ms).`,
        });
      }
    } catch (err: any) {
      toast({ title: err?.message || "A manuális futtatás sikertelen.", variant: "destructive" });
    } finally {
      setBusyKey(null);
    }
  };

  const handleUpdateJob = async (
    job: OpsJobItem,
    patch: { enabled?: boolean; intervalMinutes?: number },
  ) => {
    if (job.critical && patch.enabled === false) {
      toast({
        title: "Kritikus feladat védelme",
        description: "Kritikus fizetési, adatbiztonsági vagy jogosultságkezelési folyamat nem tiltható le.",
        variant: "destructive",
      });
      return;
    }
    setBusyKey(`cfg-${job.id}`);
    try {
      await customFetch(`/api/system/ops/jobs/${encodeURIComponent(job.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      await queryClient.invalidateQueries({ queryKey: ["system-ops-dashboard"] });
      toast({ title: "Feladat-beállítás azonnal mentve" });
    } catch (err: any) {
      toast({ title: err?.message || "Nem sikerült módosítani a beállítást.", variant: "destructive" });
    } finally {
      setBusyKey(null);
    }
  };

  const handleRetryTask = async (taskId: string) => {
    setBusyKey(`retry-${taskId}`);
    try {
      await customFetch(`/api/system/ops/retry/${encodeURIComponent(taskId)}`, { method: "POST" });
      await queryClient.invalidateQueries({ queryKey: ["system-ops-dashboard"] });
      toast({ title: "Feladat újrapróbálása elindítva" });
    } catch (err: any) {
      toast({ title: err?.message || "Az újrapróbálás sikertelen.", variant: "destructive" });
    } finally {
      setBusyKey(null);
    }
  };

  if (!developerChecked) {
    return (
      <Layout>
        <div className="mx-auto flex max-w-2xl items-center justify-center gap-2 py-24 text-sm text-slate-500">
          <RefreshCw className="h-4 w-4 animate-spin text-emerald-600" />
          Fejlesztői jogosultság ellenőrzése...
        </div>
      </Layout>
    );
  }

  if (!isSignedIn || !isDeveloper) {
    return (
      <Layout>
        <div className="mx-auto max-w-xl px-4 py-20 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-700">
            <Lock className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-2xl font-black text-slate-950">Hozzáférés megtagadva</h1>
          <p className="mt-2 text-sm text-slate-600">
            A <strong>Rendszerüzemeltetés → Háttérfolyamatok és Cloudflare automatizálás</strong> felület
            kizárólag fejlesztői jogosultsággal érhető el.
          </p>
          <Button asChild className="mt-6 rounded-xl bg-emerald-600 font-bold text-white hover:bg-emerald-700">
            <Link href="/dashboard">Vissza a Fiókomba</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const cron = data?.cron;
  const jobs = data?.jobs || [];
  const res = data?.resourceUsage;

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50/70 pb-20">
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
          {/* Header */}
          <div className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs lg:flex-row lg:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-emerald-700">
                <Server className="h-4 w-4" />
                <span>Rendszerüzemeltetés</span>
                <span className="text-slate-400">/</span>
                <span>Háttérfolyamatok és Cloudflare automatizálás</span>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-black text-emerald-800">
                  Kizárólag fejlesztői hozzáférés
                </span>
              </div>
              <h1 className="mt-2 text-2xl font-black text-slate-950">
                Cloudflare Cron Trigger és Valós Idejű Adatfrissítés
              </h1>
              <p className="mt-1 text-xs text-slate-600">
                Élő felügyelet, eseményvezérelt cache-szinkronizálás, percenkénti (`* * * * *`) ütemezett
                háttérfeladatok, hibanaplók és kézi végrehajtás.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void refetch()}
                className="rounded-xl border-slate-200 text-xs font-bold"
              >
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                Azonnali frissítés
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={busyKey === "all"}
                onClick={() => void handleManualRun()}
                className="rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700"
              >
                <Play className="mr-1.5 h-3.5 w-3.5" />
                {busyKey === "all" ? "Futtatás folyamatban..." : "Teljes ciklus manuális futtatása"}
              </Button>
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800">
              Nem sikerült lekérdezni a rendszerüzemeltetési adatokat. Ellenőrizd a hálózati kapcsolatot.
            </div>
          )}

          {/* Top Status Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Cloudflare Cron Trigger</span>
                {cron?.status === "HEALTHY" ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : cron?.status === "DEGRADED" ? (
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                ) : (
                  <Clock className="h-4 w-4 text-slate-400" />
                )}
              </div>
              <p className="mt-2 text-lg font-black text-slate-950">
                {cron?.status === "HEALTHY"
                  ? "Aktív és egészséges"
                  : cron?.status === "DEGRADED"
                    ? "Figyelmeztetés / hiba"
                    : "Várakozik első futásra"}
              </p>
              <p className="mt-1 font-mono text-xs font-bold text-emerald-700">
                Cron: {cron?.cronExpression || "* * * * *"} · {cron?.workerName || "ilolit-cron-worker"}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                Összes futás: <strong>{cron?.totalTicks || 0}</strong> · Hibák: <strong>{cron?.totalErrors || 0}</strong>
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Utolsó és következő futás</span>
                <Clock className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="mt-2 text-xs font-bold text-slate-900">Utolsó: {fmtTime(cron?.lastTickAt)}</p>
              <p className="mt-1 text-xs font-semibold text-emerald-700">
                Következő: {fmtTime(cron?.nextPlannedTickAt)}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                Indítás módja:{" "}
                <strong>
                  {cron?.lastTrigger === "cron"
                    ? "Automatikus Cron Trigger"
                    : cron?.lastTrigger === "manual"
                      ? "Manuális fejlesztői futtatás"
                      : "—"}
                </strong>
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Valós idejű eseménybusz (SSE)</span>
                <Zap className={`h-4 w-4 ${sseConnected ? "text-emerald-600" : "text-amber-500"}`} />
              </div>
              <p className="mt-2 text-lg font-black text-slate-950">
                {sseConnected ? "Élő kapcsolat aktív" : "Újracsatlakozás..."}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Globális eseményverzió: <strong>#{data?.realtimeBus?.globalVersion || globalVersion}</strong>
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                Utolsó esemény: {fmtTime(data?.realtimeBus?.updatedAt)}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Erőforrás-felhasználás</span>
                <Cpu className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="mt-2 text-lg font-black text-slate-950">
                {res?.lastDurationMs || 0} ms{" "}
                <span className="text-xs font-semibold text-slate-500">(átlag: {res?.avgDurationMs || 0} ms)</span>
              </p>
              <p className="mt-1 text-xs text-slate-600">
                R2 olvasás: <strong>{res?.lastR2Reads || 0}</strong> · R2 írás: <strong>{res?.lastR2Writes || 0}</strong>
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                Függő újrapróbálás: <strong>{res?.pendingRetryTasks || 0}</strong> · Végleges hiba:{" "}
                <strong className={(res?.failedPermanentTasks || 0) > 0 ? "text-rose-700" : ""}>
                  {res?.failedPermanentTasks || 0}
                </strong>
              </p>
            </div>
          </div>

          {/* Sub-navigation tabs */}
          <div className="flex flex-wrap gap-2">
            {(
              [
                { id: "jobs", label: `Háttérfeladatok (${jobs.length})`, icon: Activity },
                {
                  id: "queue",
                  label: `Függő és újrapróbált feladatok (${data?.retryQueue?.length || 0})`,
                  icon: Database,
                },
                { id: "logs", label: `Futtatási naplók (${data?.recentLogs?.length || 0})`, icon: Terminal },
                { id: "errors", label: `Hibanapló (${data?.recentErrors?.length || 0})`, icon: ShieldAlert },
                {
                  id: "events",
                  label: `Élő eseménynapló (${data?.realtimeBus?.recentEvents?.length || 0})`,
                  icon: Zap,
                },
              ] as const
            ).map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id)}
                  className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold transition ${
                    activeTab === t.id
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* TAB 1: JOBS */}
          {activeTab === "jobs" && (
            <div className="space-y-3">
              {isLoading && jobs.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-500">
                  Háttérfeladatok betöltése...
                </div>
              ) : (
                jobs.map((job) => {
                  const statusBadge =
                    job.runtime.lastStatus === "OK"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : job.runtime.lastStatus === "ERROR"
                        ? "border-rose-200 bg-rose-50 text-rose-800"
                        : job.runtime.lastStatus === "SKIPPED"
                          ? "border-slate-200 bg-slate-100 text-slate-600"
                          : "border-slate-200 bg-slate-50 text-slate-600";
                  const statusText =
                    job.runtime.lastStatus === "OK"
                      ? "Sikeres"
                      : job.runtime.lastStatus === "ERROR"
                        ? "Hibás"
                        : job.runtime.lastStatus === "SKIPPED"
                          ? "Letiltva"
                          : "Még nem futott";

                  return (
                    <div
                      key={job.id}
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5"
                    >
                      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${statusBadge}`}>
                              {statusText}
                            </span>
                            {job.critical && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-900">
                                <ShieldCheck className="h-3 w-3" />
                                Kritikus – nem tiltható le
                              </span>
                            )}
                            <span className="font-mono text-[11px] text-slate-400">{job.id}</span>
                          </div>
                          <h3 className="text-sm font-black text-slate-950">{job.name}</h3>
                          <p className="text-xs text-slate-600">{job.description}</p>

                          <div className="grid grid-cols-2 gap-2 pt-2 text-[11px] text-slate-600 sm:grid-cols-5">
                            <div className="rounded-xl border border-slate-100 bg-slate-50 px-2.5 py-1.5">
                              <span className="block text-slate-400">Utolsó futás</span>
                              <strong className="text-slate-900">{fmtTime(job.runtime.lastRunAt)}</strong>
                            </div>
                            <div className="rounded-xl border border-slate-100 bg-slate-50 px-2.5 py-1.5">
                              <span className="block text-slate-400">Következő futás</span>
                              <strong className="text-slate-900">{fmtTime(job.runtime.nextRunAt)}</strong>
                            </div>
                            <div className="rounded-xl border border-slate-100 bg-slate-50 px-2.5 py-1.5">
                              <span className="block text-slate-400">Futási idő</span>
                              <strong className="text-slate-900">{job.runtime.lastDurationMs} ms</strong>
                            </div>
                            <div className="rounded-xl border border-slate-100 bg-slate-50 px-2.5 py-1.5">
                              <span className="block text-slate-400">Feldolgozott / módosított</span>
                              <strong className="text-slate-900">
                                {job.runtime.lastProcessedCount} / {job.runtime.lastUpdatedCount}
                              </strong>
                            </div>
                            <div className="rounded-xl border border-slate-100 bg-slate-50 px-2.5 py-1.5">
                              <span className="block text-slate-400">Sikeres / sikertelen</span>
                              <strong className="text-slate-900">
                                <span className="text-emerald-700">{job.runtime.successRuns}</span> /{" "}
                                <span className={job.runtime.failedRuns > 0 ? "text-rose-700" : ""}>
                                  {job.runtime.failedRuns}
                                </span>
                              </strong>
                            </div>
                          </div>

                          {job.runtime.lastError && (
                            <div className="mt-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                              <strong>Utolsó hiba:</strong> {job.runtime.lastError}
                            </div>
                          )}
                        </div>

                        {/* Controls */}
                        <div className="flex shrink-0 flex-wrap items-center gap-2 lg:flex-col lg:items-end">
                          <div className="flex items-center gap-2">
                            <label className="text-[11px] font-bold text-slate-600">Gyakoriság:</label>
                            <select
                              value={job.config.intervalMinutes}
                              disabled={busyKey === `cfg-${job.id}`}
                              onChange={(e) =>
                                void handleUpdateJob(job, { intervalMinutes: Number(e.target.value) })
                              }
                              className="h-8 rounded-lg border border-slate-300 bg-white px-2 text-xs font-bold text-slate-900"
                            >
                              {job.allowedIntervals.map((mins) => (
                                <option key={mins} value={mins}>
                                  {mins === 1
                                    ? "1 percenként"
                                    : mins < 60
                                      ? `${mins} percenként`
                                      : `${mins / 60} óránként`}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={job.critical || busyKey === `cfg-${job.id}`}
                              onClick={() => void handleUpdateJob(job, { enabled: !job.config.enabled })}
                              className={`h-8 rounded-lg text-xs font-bold ${
                                job.critical
                                  ? "cursor-not-allowed border-slate-200 text-slate-400"
                                  : job.config.enabled
                                    ? "border-amber-200 text-amber-800 hover:bg-amber-50"
                                    : "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                              }`}
                            >
                              {job.critical ? "Védett (aktív)" : job.config.enabled ? "Letiltás" : "Engedélyezés"}
                            </Button>

                            <Button
                              type="button"
                              size="sm"
                              disabled={busyKey === job.id}
                              onClick={() => void handleManualRun(job.id)}
                              className="h-8 rounded-lg bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700"
                            >
                              <Play className="mr-1 h-3 w-3" />
                              {busyKey === job.id ? "Fut..." : "Futtatás"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: RETRY QUEUE */}
          {activeTab === "queue" && (
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs">
              <h2 className="text-base font-black text-slate-950">Függő feladatok és újrapróbálási sor</h2>
              <p className="mt-1 text-xs text-slate-500">
                Sikertelen értesítések, szinkronizálások és háttérműveletek szabályozott újrapróbálása (exponenciális backoff).
              </p>
              {(data?.retryQueue || []).length === 0 ? (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6 text-center text-xs font-semibold text-emerald-900">
                  Jelenleg nincs függőben lévő vagy sikertelen újrapróbálási feladat.
                </div>
              ) : (
                <div className="mt-4 space-y-2.5">
                  {data!.retryQueue.map((task) => (
                    <div
                      key={task.id}
                      className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 text-xs sm:flex-row sm:items-center"
                    >
                      <div>
                        <p className="font-bold text-slate-950">
                          {task.taskType} · Cél: <span className="font-mono">{task.targetId}</span>
                        </p>
                        <p className="mt-0.5 text-slate-600">
                          Állapot: <strong>{task.status}</strong> · Kísérletek: {task.attempts}/{task.maxAttempts} ·
                          Következő kísérlet: {fmtTime(task.nextAttemptAt)}
                        </p>
                        {task.lastError && <p className="mt-1 text-rose-700">Hiba: {task.lastError}</p>}
                      </div>
                      {task.status !== "SUCCEEDED" && (
                        <Button
                          type="button"
                          size="sm"
                          disabled={busyKey === `retry-${task.id}`}
                          onClick={() => void handleRetryTask(task.id)}
                          className="rounded-xl bg-emerald-600 text-xs font-bold text-white"
                        >
                          Azonnali újrapróbálás
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: RECENT RUN LOGS */}
          {activeTab === "logs" && (
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-600">
                    <tr>
                      <th className="px-4 py-3">Indítás</th>
                      <th className="px-3 py-3">Mód</th>
                      <th className="px-3 py-3">Feladatok</th>
                      <th className="px-3 py-3">Rekordok (ell./mód.)</th>
                      <th className="px-3 py-3">Időtartam</th>
                      <th className="px-3 py-3">R2 (olv./írás)</th>
                      <th className="px-3 py-3">Hibák</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(data?.recentLogs || []).map((log) => (
                      <tr key={log.runId} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-semibold text-slate-900">{fmtTime(log.startedAt)}</td>
                        <td className="px-3 py-2.5">
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-bold">
                            {log.trigger === "cron" ? "Cron" : "Manuális"}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-semibold">{log.jobsExecuted}</td>
                        <td className="px-3 py-2.5">
                          {log.totalProcessed} / <strong>{log.totalUpdated}</strong>
                        </td>
                        <td className="px-3 py-2.5 font-mono">{log.durationMs} ms</td>
                        <td className="px-3 py-2.5 font-mono">
                          {log.r2ReadsEstimate} / {log.r2WritesEstimate}
                        </td>
                        <td className="px-3 py-2.5">
                          {log.jobsFailed > 0 ? (
                            <span className="font-bold text-rose-700">{log.jobsFailed} hiba</span>
                          ) : (
                            <span className="font-bold text-emerald-700">0</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {(data?.recentLogs || []).length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                          Még nincs naplózott futtatás. Indíts egy manuális tesztfuttatást vagy várd meg a következő percet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: ERRORS */}
          {activeTab === "errors" && (
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs">
              <h2 className="text-base font-black text-slate-950">Hibanapló</h2>
              {(data?.recentErrors || []).length === 0 ? (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6 text-center text-xs font-semibold text-emerald-900">
                  Nincs rögzített háttérfolyamat-hiba.
                </div>
              ) : (
                <div className="mt-4 space-y-2">
                  {data!.recentErrors.map((err, idx) => (
                    <div key={idx} className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
                      <div className="flex items-center justify-between">
                        <strong className="font-mono">{err.jobId}</strong>
                        <span className="text-[11px] text-rose-700">{fmtTime(err.timestamp)}</span>
                      </div>
                      <p className="mt-1">{err.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: REALTIME EVENTS */}
          {activeTab === "events" && (
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs">
              <h2 className="text-base font-black text-slate-950">Legutóbbi valós idejű adatfrissítési események</h2>
              <p className="mt-1 text-xs text-slate-500">
                Minden esemény azonnal (0–3 mp) érvényteleníti a kapcsolódó gyorsítótárakat az összes nyitott felületen.
              </p>
              <div className="mt-4 space-y-2">
                {(data?.realtimeBus?.recentEvents || []).map((ev) => (
                  <div
                    key={ev.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-xs"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-lg bg-emerald-100 px-2 py-0.5 font-mono text-[11px] font-bold text-emerald-900">
                        {ev.domain}
                      </span>
                      <span className="font-bold text-slate-900">{ev.action}</span>
                      {ev.summary && <span className="text-slate-600">– {ev.summary}</span>}
                    </div>
                    <span className="font-mono text-[11px] text-slate-500">
                      v{ev.version} · {fmtTime(ev.timestamp)}
                    </span>
                  </div>
                ))}
                {(data?.realtimeBus?.recentEvents || []).length === 0 && (
                  <p className="py-6 text-center text-xs text-slate-500">Még nincs rögzített esemény.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

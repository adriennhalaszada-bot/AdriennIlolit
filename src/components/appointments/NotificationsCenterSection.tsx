import { useState } from "react";
import { Link } from "wouter";
import { useUnifiedAppointments } from "@/context/UnifiedAppointmentsContext";
import { useNotifications } from "@/context/NotificationsContext";
import {
  NOTIFICATION_CATEGORY_LABELS,
  type UnifiedNotificationCategory,
} from "@/lib/appointments/types";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Bell,
  BellRing,
  BookmarkPlus,
  Building2,
  Car,
  Check,
  CheckCheck,
  GraduationCap,
  ShieldCheck,
  Smartphone,
  Store,
  Trash2,
  Wrench,
} from "lucide-react";

const CATEGORY_TABS: Array<{ id: "ALL" | UnifiedNotificationCategory; label: string; icon: any }> = [
  { id: "ALL", label: "Összes", icon: Bell },
  { id: "INGATLAN", label: "Ingatlan", icon: Building2 },
  { id: "JARMU", label: "Jármű", icon: Car },
  { id: "SZOLGALTATAS", label: "Szolgáltatás", icon: Wrench },
  { id: "PIACTER", label: "Piactér", icon: Store },
  { id: "OKTATAS", label: "Oktatás", icon: GraduationCap },
];

function mapLegacyCategory(cat: string): UnifiedNotificationCategory {
  if (cat === "course") return "OKTATAS";
  if (cat === "appointment") return "SZOLGALTATAS";
  return "PIACTER";
}

export function NotificationsCenterSection() {
  const {
    notifications: unifiedNotifs,
    unreadCount: unifiedUnread,
    countsByCategory,
    pushStatus,
    enablePush,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
  } = useUnifiedAppointments();

  const {
    notifications: legacyNotifs,
    markAsRead: markLegacyRead,
    markAllAsRead: markAllLegacyRead,
    deleteNotification: deleteLegacyNotif,
  } = useNotifications();

  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<"ALL" | UnifiedNotificationCategory>("ALL");
  const [enablingPush, setEnablingPush] = useState(false);

  // Merge unified appointment notifications + marketplace/course preference notifications cleanly
  const merged = [
    ...unifiedNotifs.map((n) => ({
      id: n.id,
      source: "unified" as const,
      category: n.category,
      title: n.title,
      body: n.body,
      read: n.read,
      url: n.webUrl || "/dashboard/bookings/properties",
      createdAt: n.createdAt,
    })),
    ...legacyNotifs.map((n) => ({
      id: `pref_${n.id}`,
      rawId: n.id,
      source: "legacy" as const,
      category: mapLegacyCategory(n.category),
      title: n.title,
      body: n.message,
      read: n.read,
      url: n.actionUrl || "/dashboard",
      createdAt: n.timestamp,
    })),
  ].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

  const totalUnread = merged.filter((m) => !m.read).length;

  const filtered =
    selectedCategory === "ALL"
      ? merged
      : merged.filter((item) => item.category === selectedCategory);

  const countForCat = (cat: UnifiedNotificationCategory) => {
    const legacyCount = merged.filter((m) => m.source === "legacy" && m.category === cat && !m.read).length;
    return (countsByCategory[cat] || 0) + legacyCount;
  };

  const handleEnablePush = async () => {
    setEnablingPush(true);
    try {
      const res = await enablePush();
      toast({
        title: res.ok ? "Push értesítések bekapcsolva" : "Push értesítések",
        description: res.message,
        variant: res.ok ? "default" : "destructive",
      });
    } finally {
      setEnablingPush(false);
    }
  };

  const handleMarkAll = async () => {
    await markAllNotificationsRead();
    markAllLegacyRead();
    toast({ title: "Minden értesítés olvasottnak jelölve" });
  };

  const browserPermission =
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported";

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-black text-slate-950">
            <Bell className="h-5 w-5 text-emerald-600" />
            Értesítések &amp; Riasztások
            {totalUnread > 0 && (
              <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-bold text-white">
                {totalUnread}
              </span>
            )}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Ingatlan- és járműmegtekintési visszaigazolások, időpontmódosítások, emlékeztetők és figyelők.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {totalUnread > 0 && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleMarkAll}
              className="rounded-xl border-slate-200 text-xs font-bold"
            >
              <CheckCheck className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
              Mindet olvasottá
            </Button>
          )}
          <Button asChild size="sm" variant="outline" className="rounded-xl border-slate-200 text-xs font-bold">
            <Link href="/hirdetesfigyelo">
              <BookmarkPlus className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
              Hirdetésfigyelők
            </Link>
          </Button>
        </div>
      </div>

      {/* Push Notifications Opt-In Banner (Device/Web Push — NOT SMS) */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-200 bg-white text-emerald-700">
            <Smartphone className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">
              Azonnali push értesítések ezen az eszközön
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
              A push értesítés eszköz-alapú (nem SMS). A lezárt képernyőn adatvédelmi okból soha nem jelenik meg pontos
              lakcím — csak a visszaigazolás ténye és az időpont.
            </p>
            {pushStatus?.subscribed && (
              <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                <ShieldCheck className="h-3.5 w-3.5" />
                Aktív regisztrált eszközök: {pushStatus.webSubscriptionsCount + pushStatus.mobileDevicesCount}
              </p>
            )}
          </div>
        </div>

        <Button
          type="button"
          size="sm"
          disabled={enablingPush || (browserPermission === "granted" && pushStatus?.subscribed)}
          onClick={handleEnablePush}
          className="shrink-0 rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700 disabled:bg-emerald-100 disabled:text-emerald-800"
        >
          <BellRing className="mr-1.5 h-3.5 w-3.5" />
          {browserPermission === "granted" && pushStatus?.subscribed
            ? "Push aktív"
            : enablingPush
              ? "Aktiválás..."
              : "Push engedélyezése"}
        </Button>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {CATEGORY_TABS.map((tab) => {
          const Icon = tab.icon;
          const catUnread = tab.id === "ALL" ? totalUnread : countForCat(tab.id);
          const active = selectedCategory === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedCategory(tab.id)}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                active
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
              {catUnread > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    active ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {catUnread}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Notification Feed */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-10 text-center">
          <Bell className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-bold text-slate-800">Nincs értesítés ebben a kategóriában</p>
          <p className="mt-1 text-xs text-slate-500">
            Amint egy hirdető visszaigazolja vagy módosítja a megtekintésedet, itt azonnal megjelenik.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((item) => {
            const catMeta = CATEGORY_TABS.find((t) => t.id === item.category);
            const Icon = catMeta?.icon || Bell;
            return (
              <div
                key={item.id}
                className={`flex items-start gap-3.5 rounded-2xl border p-4 transition ${
                  !item.read
                    ? "border-emerald-200 bg-emerald-50/40"
                    : "border-slate-200 bg-white hover:bg-slate-50/70"
                }`}
              >
                <div
                  className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                    !item.read
                      ? "border-emerald-200 bg-emerald-100 text-emerald-800"
                      : "border-slate-200 bg-slate-50 text-slate-500"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                      {NOTIFICATION_CATEGORY_LABELS[item.category]}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(item.createdAt).toLocaleString("hu-HU", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <Link
                    href={item.url}
                    onClick={() => {
                      if (!item.read) {
                        if (item.source === "unified") void markNotificationRead(item.id);
                        else markLegacyRead(item.rawId);
                      }
                    }}
                    className="mt-1 block text-sm font-bold text-slate-950 hover:text-emerald-700"
                  >
                    {item.title}
                  </Link>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{item.body}</p>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  {!item.read && (
                    <button
                      type="button"
                      title="Olvasottnak jelölés"
                      onClick={() => {
                        if (item.source === "unified") void markNotificationRead(item.id);
                        else markLegacyRead(item.rawId);
                      }}
                      className="rounded-lg p-1.5 text-emerald-700 hover:bg-emerald-100"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    title="Törlés"
                    onClick={() => {
                      if (item.source === "unified") void deleteNotification(item.id);
                      else deleteLegacyNotif(item.rawId);
                    }}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

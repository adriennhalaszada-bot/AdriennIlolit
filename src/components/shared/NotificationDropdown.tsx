import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import {
  Bell,
  Building2,
  Car,
  Check,
  GraduationCap,
  Settings,
  Store,
  Trash2,
  Wrench,
} from "lucide-react";
import { useNotifications } from "@/context/NotificationsContext";
import { useUnifiedAppointments } from "@/context/UnifiedAppointmentsContext";
import {
  NOTIFICATION_CATEGORY_LABELS,
  type UnifiedNotificationCategory,
} from "@/lib/appointments/types";

const CATEGORY_ICONS: Record<UnifiedNotificationCategory, any> = {
  INGATLAN: Building2,
  JARMU: Car,
  SZOLGALTATAS: Wrench,
  PIACTER: Store,
  OKTATAS: GraduationCap,
};

function mapLegacyCat(cat: string): UnifiedNotificationCategory {
  if (cat === "course") return "OKTATAS";
  if (cat === "appointment") return "SZOLGALTATAS";
  return "PIACTER";
}

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const {
    notifications: unifiedNotifs,
    unreadCount: unifiedUnread,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification: deleteUnified,
  } = useUnifiedAppointments();
  const {
    notifications: legacyNotifs,
    unreadCount: legacyUnread,
    markAsRead: markLegacyRead,
    markAllAsRead: markAllLegacyRead,
    deleteNotification: deleteLegacy,
  } = useNotifications();

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const combined = [
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
      category: mapLegacyCat(n.category),
      title: n.title,
      body: n.message,
      read: n.read,
      url: n.actionUrl || "/notifications",
      createdAt: n.timestamp,
    })),
  ]
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0, 20);

  const totalUnread = unifiedUnread + legacyUnread;

  const handleMarkAll = () => {
    void markAllNotificationsRead();
    markAllLegacyRead();
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative cursor-pointer rounded-xl border border-slate-200 bg-white p-2.5 text-slate-700 transition hover:bg-slate-50"
        aria-label={totalUnread > 0 ? `Értesítések (${totalUnread})` : "Értesítések"}
      >
        <Bell className="h-4 w-4 text-slate-700" />
        {totalUnread > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-black text-white shadow-xs">
            {totalUnread > 99 ? "99+" : totalUnread}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="animate-in fade-in zoom-in-95 absolute right-0 z-[999] mt-2 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl duration-150 md:w-96">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 p-3.5">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-emerald-600" />
              <span className="text-xs font-extrabold text-slate-900">
                Értesítések {totalUnread > 0 ? `(${totalUnread})` : ""}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {totalUnread > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAll}
                  className="text-[11px] font-bold text-emerald-700 hover:underline"
                >
                  Mindet olvasottá
                </button>
              )}
              <Link
                href="/notifications"
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
                title="Értesítések és beállítások"
              >
                <Settings className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          <div className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
            {combined.length === 0 ? (
              <div className="p-8 text-center text-xs font-semibold text-slate-400">
                Nincsenek értesítések.
              </div>
            ) : (
              combined.map((n) => {
                const Icon = CATEGORY_ICONS[n.category] || Bell;
                return (
                  <div
                    key={n.id}
                    className={`flex gap-3 p-3 text-xs transition ${
                      !n.read ? "bg-emerald-50/50 font-medium" : "opacity-85 hover:bg-slate-50"
                    }`}
                  >
                    <div className="mt-0.5 h-fit shrink-0 rounded-xl border border-emerald-200 bg-emerald-50 p-2 text-emerald-700">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-start justify-between gap-1">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                            {NOTIFICATION_CATEGORY_LABELS[n.category]}
                          </span>
                          <Link
                            href={n.url}
                            onClick={() => {
                              if (!n.read) {
                                if (n.source === "unified") void markNotificationRead(n.id);
                                else markLegacyRead(n.rawId);
                              }
                              setIsOpen(false);
                            }}
                            className="block font-bold text-slate-900 transition hover:text-emerald-700"
                          >
                            {n.title}
                          </Link>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (n.source === "unified") void deleteUnified(n.id);
                            else deleteLegacy(n.rawId);
                          }}
                          className="p-0.5 text-slate-400 transition hover:text-rose-600"
                          aria-label="Törlés"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                      <p className="text-[11px] leading-relaxed text-slate-600">{n.body}</p>
                      <div className="flex items-center justify-between pt-0.5 text-[10px] text-slate-400">
                        <span>
                          {new Date(n.createdAt).toLocaleTimeString("hu-HU", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {!n.read && (
                          <button
                            type="button"
                            onClick={() => {
                              if (n.source === "unified") void markNotificationRead(n.id);
                              else markLegacyRead(n.rawId);
                            }}
                            className="flex items-center gap-1 font-bold text-emerald-700 hover:underline"
                          >
                            <Check className="h-2.5 w-2.5" /> Olvasott
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="border-t border-slate-100 bg-slate-50 p-2.5 text-center">
            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className="text-xs font-extrabold text-emerald-700 hover:underline"
            >
              Összes értesítés &amp; Riasztások megnyitása
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

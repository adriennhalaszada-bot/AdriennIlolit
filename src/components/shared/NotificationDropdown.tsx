import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { Bell, Check, Trash2, Settings, Sparkles, AlertCircle, Calendar, BookOpen, Tag } from "lucide-react";
import { useNotifications, NotificationCategory } from "@/context/NotificationsContext";

const CATEGORY_ICONS: Record<NotificationCategory, any> = {
  price_drop: Tag,
  saved_search: Sparkles,
  appointment: Calendar,
  course: BookOpen,
  back_in_stock: Tag,
  system: AlertCircle,
};

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
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

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
        aria-label="Értesítések"
      >
        <Bell className="w-4 h-4 text-slate-700 dark:text-slate-200" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-rose-600 text-white text-[10px] font-black flex items-center justify-center animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-[999] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-emerald-600" />
              <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                Értesítések ({unreadCount} új)
              </span>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="text-[10px] font-extrabold text-emerald-600 hover:underline"
                >
                  Mindet olvasottá
                </button>
              )}
              <Link
                href="/notifications"
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <Settings className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-xs font-semibold text-slate-400">
                Nincsenek értesítések.
              </div>
            ) : (
              notifications.map((n) => {
                const Icon = CATEGORY_ICONS[n.category] || Bell;
                return (
                  <div
                    key={n.id}
                    className={`p-3 text-xs transition flex gap-3 ${
                      !n.read
                        ? "bg-emerald-50/40 dark:bg-emerald-950/20 font-medium"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/50 opacity-80"
                    }`}
                  >
                    <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 shrink-0 h-fit mt-0.5">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-start justify-between gap-1">
                        <Link
                          href={n.actionUrl || "#"}
                          onClick={() => {
                            markAsRead(n.id);
                            setIsOpen(false);
                          }}
                          className="font-extrabold text-slate-900 dark:text-white hover:text-emerald-600 transition"
                        >
                          {n.title}
                        </Link>
                        <button
                          type="button"
                          onClick={() => deleteNotification(n.id)}
                          className="text-slate-400 hover:text-rose-600 p-0.5 transition"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                        {n.message}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                        <span>{new Date(n.timestamp).toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" })}</span>
                        {!n.read && (
                          <button
                            type="button"
                            onClick={() => markAsRead(n.id)}
                            className="text-emerald-600 font-bold hover:underline flex items-center gap-1"
                          >
                            <Check className="w-2.5 h-2.5" /> Olvasott
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-slate-50 dark:bg-slate-950 text-center border-t border-slate-100 dark:border-slate-800">
            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className="text-xs font-extrabold text-emerald-600 hover:underline"
            >
              Összes értesítés & Beállítások ➔
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

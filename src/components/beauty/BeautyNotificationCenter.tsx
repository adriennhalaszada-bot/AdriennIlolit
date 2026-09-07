import { useState } from "react";
import { Bell, CheckCheck, MessageSquare, Calendar, ShieldCheck, X, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUserAccountStore, type BeautyNotification } from "@/lib/userAccountStore";

export function BeautyNotificationCenter({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { notifications, unreadNotificationsCount, markNotificationAsRead, markAllNotificationsAsRead } = useUserAccountStore();
  const [filter, setFilter] = useState<"all" | "unread">("all");

  if (!isOpen) return null;

  const displayNotifs = notifications.filter((n) => filter === "all" || !n.isRead);

  const getNotifIcon = (type: BeautyNotification["type"]) => {
    switch (type) {
      case "booking": return <Calendar className="w-4 h-4 text-violet-500" />;
      case "reminder": return <Bell className="w-4 h-4 text-amber-500" />;
      case "message": return <MessageSquare className="w-4 h-4 text-emerald-500" />;
      default: return <ShieldCheck className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start justify-end p-4 sm:p-6 animate-in fade-in">
      <div className="bg-slate-900 border border-violet-500/40 text-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[85vh] mt-12 sm:mt-14">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-950 border-b border-violet-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/30">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base flex items-center gap-2">
                <span> Értesítési Központ</span>
                {unreadNotificationsCount > 0 && (
                  <Badge className="bg-violet-600 text-white font-black text-xs px-2 py-0.5">
                    {unreadNotificationsCount} új
                  </Badge>
                )}
              </h3>
              <p className="text-xs text-slate-400">6.2. Rendszer, foglalás és chat értesítések</p>
            </div>
          </div>

          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar & Filter */}
        <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-white/5">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1 rounded-lg font-bold transition ${filter === "all" ? "bg-violet-600 text-white" : "text-slate-400 hover:text-white"}`}
            >
              Összes ({notifications.length})
            </button>
            <button
              onClick={() => setFilter("unread")}
              className={`px-3 py-1 rounded-lg font-bold transition ${filter === "unread" ? "bg-violet-600 text-white" : "text-slate-400 hover:text-white"}`}
            >
              Olvasatlan ({unreadNotificationsCount})
            </button>
          </div>

          {unreadNotificationsCount > 0 && (
            <button
              onClick={markAllNotificationsAsRead}
              className="text-violet-400 hover:text-violet-300 font-bold flex items-center gap-1 hover:underline cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" /> Mind olvasott
            </button>
          )}
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {displayNotifs.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <Bell className="w-10 h-10 mx-auto text-slate-600 opacity-50" />
              <p className="text-sm font-semibold">Nincs megjeleníthető értesítés</p>
            </div>
          ) : (
            displayNotifs.map((n) => (
              <div
                key={n.id}
                onClick={() => markNotificationAsRead(n.id)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                  !n.isRead
                    ? "bg-violet-950/40 border-violet-500/50 shadow-md ring-1 ring-violet-500/30"
                    : "bg-slate-900/60 border-slate-800 hover:border-slate-700 opacity-80"
                }`}
              >
                <div className="p-2.5 rounded-xl bg-slate-950 border border-white/10 flex-shrink-0">
                  {getNotifIcon(n.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h4 className={`text-xs font-black truncate ${!n.isRead ? "text-violet-200" : "text-slate-300"}`}>
                      {n.title}
                    </h4>
                    <span className="text-[10px] text-slate-400 font-mono flex-shrink-0">
                      {new Date(n.createdAt || Date.now()).toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-snug line-clamp-2">{n.message}</p>

                  <div className="mt-2 flex items-center justify-between">
                    {!n.isRead ? (
                      <Badge className="bg-violet-600 text-white font-extrabold text-[9px]">ÚJ</Badge>
                    ) : (
                      <span className="text-[10px] text-slate-400">Olvasva</span>
                    )}

                    {n.link && (
                      <a href={n.link} onClick={onClose} className="text-[11px] font-bold text-violet-400 hover:text-white flex items-center gap-0.5">
                        Megnyitás <ChevronRight className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 text-center">
          <Button variant="outline" size="sm" onClick={onClose} className="w-full text-xs font-bold bg-slate-900 text-slate-300 border-slate-700">
            Bezárás
          </Button>
        </div>
      </div>
    </div>
  );
}

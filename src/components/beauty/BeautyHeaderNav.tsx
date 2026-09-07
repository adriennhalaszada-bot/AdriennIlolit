import { Link, useLocation } from "wouter";
import { Sparkles, LayoutDashboard, Calendar, CalendarCheck, UserPlus, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeautyHeaderNavProps {
  activeTab?: "home" | "dashboard" | "calendar" | "bookings" | "register" | "profile";
}

export function BeautyHeaderNav({ activeTab }: BeautyHeaderNavProps) {
  const [location] = useLocation();

  const current = activeTab || (
    location === "/beauty" ? "home" :
    location.startsWith("/beauty/dashboard") ? "dashboard" :
    location.startsWith("/interactive-calendar") ? "calendar" :
    location.startsWith("/beauty/bookings") ? "bookings" :
    location.startsWith("/beauty/register") ? "register" : "home"
  );

  const tabs = [
    { id: "home", label: "🌸 Szolgáltatók & Keresés", href: "/beauty", icon: Sparkles },
    { id: "roadmap", label: "🚀 7 Modul Roadmap & Kipróbálás", href: "/beauty/roadmap", icon: Eye },
    { id: "dashboard", label: "💼 Szolgáltatói Admin", href: "/beauty/dashboard", icon: LayoutDashboard },
    { id: "calendar", label: "📅 Interaktív Naptár", href: "/interactive-calendar", icon: Calendar },
    { id: "bookings", label: "📋 Saját Foglalásaim", href: "/beauty/bookings", icon: CalendarCheck },
    { id: "register", label: "📝 Legyél Szolgáltató", href: "/beauty/register", icon: UserPlus },
  ];

  return (
    <div className="bg-slate-900 text-white border-b border-slate-800 shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-2 overflow-x-auto gap-2 no-scrollbar">
          <div className="flex items-center gap-1 sm:gap-2">
            {tabs.map((tab) => {
              const isActive = current === tab.id;
              const Icon = tab.icon;
              return (
                <Button
                  key={tab.id}
                  asChild
                  variant="ghost"
                  size="sm"
                  className={`rounded-xl font-extrabold text-xs transition-all ${
                    isActive
                      ? "bg-rose-500 text-white shadow-lg shadow-rose-500/30 scale-105"
                      : "text-slate-300 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <Link href={tab.href} className="flex items-center gap-1.5 whitespace-nowrap">
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </Link>
                </Button>
              );
            })}
          </div>

          <div className="hidden lg:flex items-center gap-2 text-xs font-bold text-rose-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Beauty Központ 2.0</span>
          </div>
        </div>
      </div>
    </div>
  );
}

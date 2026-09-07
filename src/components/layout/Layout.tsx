import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useUser } from "@clerk/react";
import { Home, PlusCircle, MessageCircle, User, Store, Sparkles, Cloud, Car, GraduationCap, Wrench, Search, Heart, BookmarkPlus, FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { NotificationDropdown } from "@/components/shared/NotificationDropdown";
import { ComparisonBar } from "@/components/shared/ComparisonBar";
import { ComparisonModal } from "@/components/shared/ComparisonModal";
import { TestControlModal } from "@/components/shared/TestControlModal";

export function Layout({ children }: { children: React.ReactNode }) {
  const [sms, setSms] = useState<{ phone: string; message: string; timestamp: string } | null>(null);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);

  useEffect(() => {
    const handleSms = (e: Event) => {
      const customEvent = e as CustomEvent;
      setSms(customEvent.detail);
      
      const timer = setTimeout(() => {
        setSms(null);
      }, 8000);
      return () => clearTimeout(timer);
    };

    window.addEventListener("ilolit_sms_received", handleSms);
    return () => window.removeEventListener("ilolit_sms_received", handleSms);
  }, []);

  return (
    <div className="min-h-[100dvh] flex flex-col bg-white text-slate-900 font-sans">
      <DesktopNav onOpenTestModal={() => setIsTestModalOpen(true)} />
      <main className="flex-1">
        {children}
      </main>

      {/* Floating Comparison Bar & Modal */}
      <ComparisonBar />
      <ComparisonModal />

      {/* Test Control Modal */}
      <TestControlModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
      />

      {/* Floating Simulated Phone SMS Banner */}
      {sms && (
        <div className="fixed top-24 right-6 z-[9999] max-w-sm w-full bg-white text-slate-900 p-4 rounded-2xl shadow-xl border border-emerald-300 animate-in slide-in-from-right duration-300">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-emerald-700 tracking-wider flex items-center gap-1">
                  Szimulált SMS Értesítés
                </span>
                <span className="text-[9px] text-slate-400">{sms.timestamp}</span>
              </div>
              <div className="text-xs font-semibold text-slate-600">Címzett: {sms.phone}</div>
              <p className="text-xs font-medium text-slate-800 pt-1 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                {sms.message}
              </p>
            </div>
            <button 
              onClick={() => setSms(null)}
              className="text-slate-400 hover:text-slate-700 text-xs font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <MobileNav />
    </div>
  );
}

function DesktopNav({ onOpenTestModal }: { onOpenTestModal?: () => void }) {
  const [, navigate] = useLocation();
  const [location] = useLocation();

  const navItems = [
    { href: "/marketplace", label: "Piactér", icon: Store },
    { href: "/beauty", label: "Szépségipar", icon: Sparkles },
    { href: "/providers", label: "Szolgáltatások", icon: Wrench },
    { href: "/real-estate", label: "Ingatlanok", icon: Home },
    { href: "/vehicles", label: "Járművek", icon: Car },
    { href: "/education", label: "Oktatás", icon: GraduationCap },
  ];

  return (
    <header className="sticky top-0 z-50 w-full h-[72px] min-h-[72px] border-b border-slate-200/80 bg-white/90 backdrop-blur-md shadow-xs flex items-center">
      <div className="container mx-auto px-4 md:px-6 max-w-[1280px] flex items-center justify-between gap-3 lg:gap-4 w-full">
        {/* Brand Logo */}
        <Link href="/" className="font-black text-xl md:text-2xl text-slate-900 tracking-tight flex items-center gap-2.5 shrink-0">
          <span className="bg-emerald-600 text-white text-xs md:text-sm px-3 py-1.5 rounded-xl font-black uppercase tracking-wider shadow-sm">
            ILOLIT
          </span>
          <span className="font-black text-slate-900 hidden sm:inline-block text-base lg:text-lg">
            Komplex Platform
          </span>
        </Link>

        {/* Desktop Navigation Links — All 6 Verticals */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-1.5 lg:gap-2 px-3 lg:px-4 py-2 rounded-xl text-xs lg:text-sm font-extrabold transition-all shrink-0",
                  isActive
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-300/80"
                    : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <item.icon className={cn("w-4 h-4", isActive ? "text-emerald-600" : "text-slate-400")} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          {/* Test Control Panel Button */}
          <button
            type="button"
            onClick={onOpenTestModal}
            className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            title="Platform Tesztelő & Demó Vezérlőpult"
          >
            <FlaskConical className="w-4 h-4 text-emerald-600" />
            <span className="hidden lg:inline">Tesztelő Pult</span>
          </button>

          {/* Hirdetésfigyelő Button */}
          <Link
            href="/hirdetesfigyelo"
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-emerald-50 hover:text-emerald-600 transition cursor-pointer"
            title="Mentett Hirdetésfigyelők & Beállítások"
          >
            <BookmarkPlus className="w-4 h-4 text-emerald-600" />
          </Link>

          <Link
            href="/universal-search"
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Univerzális Kereső"
          >
            <Search className="w-4 h-4 text-emerald-600" />
          </Link>

          <Link
            href="/kedvenc-eladok"
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer relative"
            title="Követett Eladóim"
          >
            <Heart className="w-4 h-4 text-rose-600" />
          </Link>

          <NotificationDropdown />

          <Button asChild size="default" className="h-10 px-4 rounded-xl font-extrabold text-xs md:text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm cursor-pointer">
            <Link href="/dashboard" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Fiókom</span>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

function MobileNav() {
  const [location] = useLocation();
  let isSignedIn = false;
  try {
    const userRes = useUser();
    isSignedIn = !!userRes?.isSignedIn || localStorage.getItem("ilolit_auth") === "logged_in";
  } catch (e) {
    isSignedIn = localStorage.getItem("ilolit_auth") === "logged_in";
  }

  const links = [
    { href: "/marketplace", icon: Store, label: "Piactér" },
    { href: "/beauty", icon: Sparkles, label: "Szépség" },
    { href: "/providers", icon: Wrench, label: "Szolgáltató" },
    { href: "/real-estate", icon: Home, label: "Ingatlan" },
    { href: "/vehicles", icon: Car, label: "Jármű" },
    { href: "/education", icon: GraduationCap, label: "Oktatás" },
    { href: isSignedIn ? "/dashboard" : "/auth/login", icon: User, label: "Fiók" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white md:hidden z-50 px-1 pb-safe shadow-lg">
      <nav className="flex items-center justify-between h-16">
        {links.map((link) => {
          const isActive = location === link.href || (link.href !== "/" && location.startsWith(link.href));
          return (
            <Link key={link.label} href={link.href} className={cn(
              "flex flex-col items-center justify-center flex-1 h-full space-y-1 text-slate-500 transition-colors shrink-0",
              isActive && "text-emerald-600 font-bold"
            )}>
              <link.icon className={cn("w-4 h-4", isActive && "text-emerald-600")} />
              <span className="text-[9px] font-extrabold truncate">{link.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

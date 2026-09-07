import { useState } from "react";
import {
  Bell,
  X,
  Send,
  Car,
  Home,
  Store,
  GraduationCap,
  Wrench,
  CheckCircle,
  TrendingDown,
  MessageSquare,
  FlaskConical,
  ExternalLink,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNotifications } from "@/context/NotificationsContext";
import { sendSimulatedSMS } from "@/lib/smsSim";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

interface TestControlModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TestControlModal({ isOpen, onClose }: TestControlModalProps) {
  const { addNotification } = useNotifications();
  const { toast } = useToast();

  if (!isOpen) return null;

  const triggerNewListingAlert = () => {
    addNotification({
      title: "Új hirdetés követett eladótól",
      message: "@fashionlover_92 új terméket töltött fel: Zara Bőrdzseki M-es (34 900 Ft)",
      category: "saved_search",
      actionUrl: "/marketplace",
    });
    toast({
      title: "Új hirdetés riasztás elküldve!",
      description: "Nézd meg a felső értesítések ikonra kattintva!",
    });
  };

  const triggerPriceDropAlert = () => {
    addNotification({
      title: "Árcsökkenés a mentett hirdetésednél",
      message: "BMW 320d Touring M Sport ára lecsökkent: 8 300 000 Ft ➔ 7 890 000 Ft (-5%)",
      category: "price_drop",
      actionUrl: "/vehicles",
    });
    toast({
      title: "Árcsökkenés riasztás elküldve!",
      description: "A rendszer rögzítette a 5%-os áresést a mentett járműnél.",
    });
  };

  const triggerSmsAlert = () => {
    sendSimulatedSMS(
      "+36 30 123 4567",
      "ILOLIT Riasztás: Az Ön által követett Miskolci lakás ára 34.9M Ft-ra csökkent! Részletek: www.ilolit.com/real-estate"
    );
    toast({
      title: "SMS Értesítés elküldve!",
      description: "Egy lebegő SMS értesítés megjelent a képernyő sarkában.",
    });
  };

  const triggerAppointmentAlert = () => {
    addNotification({
      title: "Időpont foglalás megerősítve",
      message: "Kozmetikai nagykezelés beütemezve: Miskolc Beauty Studio, ma 16:00-ra.",
      category: "appointment",
      actionUrl: "/beauty/bookings",
    });
    toast({
      title: "Foglalási értesítés elküldve!",
      description: "Nézd meg a Szépségipar / Foglalásaim menüpontot!",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 md:p-8 shadow-xl space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center font-bold">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-900">
                  Platform Tesztelő Vezérlőpult
                </h3>
                <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-[10px]">
                  TESZT MODE
                </Badge>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Teszteld az értesítéseket, Hirdetésfigyelőt, SMS küldést és modulbeállításokat.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section 1: Interactive Notification Simulators */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Bell className="w-4 h-4 text-emerald-600" />
            <span>Értesítések & Riasztások Szimulációja</span>
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={triggerNewListingAlert}
              className="p-4 rounded-xl border border-slate-200 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/50 text-left transition space-y-1.5 group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 flex items-center gap-1.5">
                  Új Hirdetés Értesítés
                </span>
                <Send className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Szimulálja a követett eladó új termék feltöltését.
              </p>
            </button>

            <button
              type="button"
              onClick={triggerPriceDropAlert}
              className="p-4 rounded-xl border border-slate-200 hover:border-amber-500 bg-slate-50 hover:bg-amber-50/50 text-left transition space-y-1.5 group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 group-hover:text-amber-700 flex items-center gap-1.5">
                  Árcsökkenés Riasztás
                </span>
                <TrendingDown className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Szimulálja a mentett jármű vagy ingatlan árcsökkenését.
              </p>
            </button>

            <button
              type="button"
              onClick={triggerSmsAlert}
              className="p-4 rounded-xl border border-slate-200 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/50 text-left transition space-y-1.5 group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 group-hover:text-blue-700 flex items-center gap-1.5">
                  Mobil SMS Riasztás
                </span>
                <MessageSquare className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                SMS értesítő sáv szimulálása a képernyő sarkában.
              </p>
            </button>

            <button
              type="button"
              onClick={triggerAppointmentAlert}
              className="p-4 rounded-xl border border-slate-200 hover:border-purple-500 bg-slate-50 hover:bg-purple-50/50 text-left transition space-y-1.5 group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 group-hover:text-purple-700 flex items-center gap-1.5">
                  Foglalási Visszaigazolás
                </span>
                <CheckCircle className="w-3.5 h-3.5 text-purple-600 shrink-0" />
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Szépségipari és szolgáltatói időpont megerősítés.
              </p>
            </button>
          </div>
        </div>

        {/* Section 2: Direct Links */}
        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>Közvetlen Hivatkozások Tesztoldalakra</span>
          </h4>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
            <Link
              href="/hirdetesfigyelo"
              onClick={onClose}
              className="p-3 rounded-xl border border-slate-200 hover:border-emerald-500 bg-white text-xs font-semibold text-slate-800 flex items-center justify-between hover:bg-slate-50 transition"
            >
              <span>Hirdetésfigyelő</span>
              <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
            </Link>

            <Link
              href="/kedvenc-eladok"
              onClick={onClose}
              className="p-3 rounded-xl border border-slate-200 hover:border-emerald-500 bg-white text-xs font-semibold text-slate-800 flex items-center justify-between hover:bg-slate-50 transition"
            >
              <span>Követett Eladók</span>
              <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
            </Link>

            <Link
              href="/vehicles/dashboard"
              onClick={onClose}
              className="p-3 rounded-xl border border-slate-200 hover:border-emerald-500 bg-white text-xs font-semibold text-slate-800 flex items-center justify-between hover:bg-slate-50 transition"
            >
              <span>Jármű Időpontok</span>
              <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
            </Link>

            <Link
              href="/real-estate"
              onClick={onClose}
              className="p-3 rounded-xl border border-slate-200 hover:border-emerald-500 bg-white text-xs font-semibold text-slate-800 flex items-center justify-between hover:bg-slate-50 transition"
            >
              <span>Ingatlan modul</span>
              <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
            </Link>

            <Link
              href="/beauty"
              onClick={onClose}
              className="p-3 rounded-xl border border-slate-200 hover:border-emerald-500 bg-white text-xs font-semibold text-slate-800 flex items-center justify-between hover:bg-slate-50 transition"
            >
              <span>Szépségipar</span>
              <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
            </Link>

            <Link
              href="/education"
              onClick={onClose}
              className="p-3 rounded-xl border border-slate-200 hover:border-emerald-500 bg-white text-xs font-semibold text-slate-800 flex items-center justify-between hover:bg-slate-50 transition"
            >
              <span>Oktatás</span>
              <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <Button
            type="button"
            onClick={onClose}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs px-6 py-2"
          >
            Bezárás
          </Button>
        </div>
      </div>
    </div>
  );
}

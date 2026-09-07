import { useState } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { BeautyHeaderNav } from "@/components/beauty/BeautyHeaderNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BeautyPaymentModal } from "@/components/beauty/BeautyPaymentModal";
import {
  Search, Map, MapPin, Star, Calendar, Clock, CreditCard, Receipt,
  Coins, MessageSquare, Bell, Heart, History, Sparkles, CheckCircle2,
  ExternalLink, ArrowRight, ShieldCheck, RefreshCw, Trophy
} from "lucide-react";

export function BeautyDevRoadmap() {
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  const modules = [
    {
      id: "search",
      title: "1. Keresés és Felfedezés",
      icon: Search,
      color: "from-blue-500 to-indigo-600",
      badge: "KÉSZ & AKTÍV",
      items: [
        "1.1 Okos kereső: kulcsszó (hajvágás, smink), árintervallum, időtartam, értékelés, távolság, szolgáltatás típusa, nem",
        "1.2 Helyalapú keresés: GPS helymeghatározás ('3 km-re Öntől') & Interaktív Térképnézet (Google Maps / OSM style)",
        "1.3 Részletes szolgáltatói oldal: Cloudflare fotógaléria, akciók, heti nyitvatartási idő, Google Calendar szinkron",
      ],
      testUrl: "/beauty",
      testLabel: "🔍 Kereső & Térkép Kipróbálása",
    },
    {
      id: "reviews",
      title: "2. Vélemények és Értékelések",
      icon: Star,
      color: "from-amber-500 to-orange-600",
      badge: "KÉSZ & AKTÍV",
      items: [
        "2.1 Hiteles értékelési rendszer: 1-5 csillag + szöveges vélemény kizárólag elvégzett foglalás után",
        "2.2 Szolgáltatói válaszlehetőség bizalomépítéshez",
        "2.3 Vélemények átlagértékelése, csillag-eloszlás és szűrés (Legújabb, Legjobb, Leggyengébb)",
      ],
      testUrl: "/beauty/prov-demo-1",
      testLabel: "⭐ Értékelések & Válaszok Kipróbálása",
    },
    {
      id: "booking",
      title: "3. Foglalási Rendszer Fejlesztése",
      icon: Calendar,
      color: "from-rose-500 to-pink-600",
      badge: "KÉSZ & AKTÍV",
      items: [
        "3.1 Visszaigazolás & Emlékeztető rendszer (24h és 2h automatikus e-mail/SMS értesítők)",
        "3.2 Átfoglalás / Lemondás & No-Show védelem (szolgáltatói jelzés és lemondási díj számítás)",
        "3.3 Google Calendar + iCal integráció (.ics letöltés & élő iCal feed hivatkozás)",
      ],
      testUrl: "/beauty/bookings",
      testLabel: "📅 Átfoglalás & iCal Export Kipróbálása",
    },
    {
      id: "payments",
      title: "4. Fizetés és Pénzügyek",
      icon: CreditCard,
      color: "from-emerald-500 to-teal-600",
      badge: "KÉSZ & AKTÍV",
      items: [
        "4.1 Online fizetés (Stripe / SimplePay) - 20% előleg vagy teljes összeg kifizetése kártyával",
        "4.2 Digitális számlázás & Letölthető nyugta (.pdf formátumban)",
        "4.3 Visszatérítés automatikus kezelése lemondás esetén",
      ],
      action: () => setPaymentModalOpen(true),
      testLabel: "💳 Fizetési Modál & Számlázó Megnyitása",
    },
    {
      id: "loyalty",
      title: "5. Hűségprogram és Ösztönzők",
      icon: Coins,
      color: "from-purple-500 to-violet-600",
      badge: "KÉSZ & AKTÍV",
      items: [
        "5.1 Hűségpontok (+10% jóváírás minden foglalásból, levásárlás 1 pt = 1 Ft)",
        "5.2 Első látogatói kedvezmény (-10% új vendégek első foglalásakor)",
        "5.3 Szolgáltatói rangsor & 🏆 Kiemelt Szolgáltató kiemelési jelvény",
      ],
      testUrl: "/beauty/prov-demo-1",
      testLabel: "🎁 Hűségpontok & -10% Kedvezmény Kipróbálása",
    },
    {
      id: "communication",
      title: "6. Kommunikáció és Értesítések",
      icon: MessageSquare,
      color: "from-indigo-500 to-blue-600",
      badge: "KÉSZ & AKTÍV",
      items: [
        "6.1 Beépített adatvédett chat (mobil és email elrejtve: 📱 [Telefonszám elrejtve])",
        "6.2 Értesítési központ (in-app, push, e-mail értesítések)",
        "6.3 Hírlevél feliratkozás akciókról és újdonságokról",
      ],
      testUrl: "/messages",
      testLabel: "💬 Adatvédett Chat & Postaláda Kipróbálása",
    },
    {
      id: "profile",
      title: "7. Profil és Fiók Funkciók",
      icon: History,
      color: "from-slate-700 to-slate-900",
      badge: "KÉSZ & AKTÍV",
      items: [
        "7.1 Vendég előzmények (korábbi elvégzett foglalások + 🔄 újrafoglalás 1 kattintással)",
        "7.2 Kedvencek / Mentett szolgáltatók (könyvjelző és akció értesítő)",
        "7.3 Profil testreszabása (saját logo, Instagram, Facebook és weboldal linkek)",
      ],
      testUrl: "/beauty/bookings",
      testLabel: "📜 Előzmények & Kedvencek Kipróbálása",
    },
  ];

  return (
    <Layout>
      <BeautyHeaderNav />
      <div className="container mx-auto px-4 py-8 max-w-5xl space-y-8">
        {/* Header Hero */}
        <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-rose-500 text-white font-extrabold text-xs">
                7 / 7 MODUL MEGVALÓSÍTVA
              </Badge>
              <Badge variant="outline" className="text-emerald-400 border-emerald-500/40 text-xs">
                ✓ 100% Funkcionális & GitHub-on Mentve
              </Badge>
            </div>
            <h1 className="text-3xl font-black tracking-tight">Beauty Lolit – Teljes Platform Roadmap</h1>
            <p className="text-slate-300 text-sm max-w-2xl">
              Itt található a rendszer mind a 7 moduljának áttekintése. Kattints az egyes modulok alatti teszt gombokra a funkcionalitás valós idejű kipróbálásához!
            </p>
          </div>

          <Button
            size="lg"
            className="bg-gradient-to-r from-rose-500 to-indigo-600 hover:from-rose-600 hover:to-indigo-700 text-white font-extrabold shadow-lg rounded-2xl flex-shrink-0"
            onClick={() => setPaymentModalOpen(true)}
          >
            <CreditCard className="w-5 h-5 mr-2" /> Fizetés & Számla Teszt
          </Button>
        </div>

        {/* 7 Modules List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {modules.map((mod) => {
            const Icon = mod.icon;
            return (
              <Card key={mod.id} className="p-6 rounded-3xl border shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${mod.color} text-white flex items-center justify-center shadow-md`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">{mod.title}</h2>
                    </div>
                    <Badge className="bg-emerald-600 text-white font-bold text-[10px]">{mod.badge}</Badge>
                  </div>

                  <ul className="space-y-2 pt-2 text-xs text-slate-600 dark:text-slate-300">
                    {mod.items.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-3 border-t">
                  {mod.testUrl ? (
                    <Button asChild className="w-full rounded-xl font-bold bg-slate-900 hover:bg-slate-800 text-white text-xs">
                      <Link href={mod.testUrl}>
                        {mod.testLabel} <ArrowRight className="w-4 h-4 ml-1.5" />
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      onClick={mod.action}
                      className="w-full rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                    >
                      {mod.testLabel} <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Interactive Payment & Invoice Test Modal */}
      <BeautyPaymentModal
        open={paymentModalOpen}
        onOpenChange={setPaymentModalOpen}
        bookingDetails={{
          providerName: "Kata Balayage Hajstúdió",
          services: [
            { name: "Női Hajvágás & Szárítás", price: 12500, duration: 45 },
            { name: "Balayage Festés & Ápolás", price: 32000, duration: 120 },
          ],
          totalPrice: 44500,
          bookingDate: new Date().toLocaleDateString("hu-HU"),
          bookingTime: "10:00",
        }}
        onPaymentComplete={(receipt) => {
          console.log("Fizetés teljesítve:", receipt);
        }}
      />
    </Layout>
  );
}

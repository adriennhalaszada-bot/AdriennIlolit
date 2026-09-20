import { Layout } from "@/components/layout/Layout";
import { useGetFeaturedListings } from "@workspace/api-client-react";
import { Link } from "wouter";
import { UnifiedListingCard } from "@/components/shared/UnifiedListingCard";
import { Button } from "@/components/ui/button";
import {
  Store, Sparkles, Home as HomeIcon, Car,
  GraduationCap, Wrench, Play, X, Check, ArrowRight, Search, MapPin,
  ShieldCheck, CalendarCheck, BadgeCheck, PlusCircle
} from "lucide-react";
import { useState } from "react";

// Mock Verticals & Data
const VERTICALS = [
  { id: "marketplace", title: "Piactér", desc: "Új és használt termékek biztonságos adásvétele", icon: Store, href: "/marketplace" },
  { id: "beauty", title: "Szépségipar", desc: "Szalonok, szakemberek, kezelések és időpontfoglalás", icon: Sparkles, href: "/beauty" },
  { id: "services", title: "Szolgáltatások", desc: "Építőipar, felújítás, IT és egyéni szakemberek", icon: Wrench, href: "/providers" },
  { id: "real-estate", title: "Ingatlanok", desc: "Eladó és kiadó lakások, házak, telek keresővel", icon: HomeIcon, href: "/real-estate" },
  { id: "vehicles", title: "Járművek", desc: "Személyautók, motorkerékpárok és alkatrészek", icon: Car, href: "/vehicles" },
  { id: "education", title: "Oktatás", desc: "Szakmai továbbképzések, tanfolyamok és kvízek", icon: GraduationCap, href: "/education" },
];

const USER_JOURNEYS = [
  {
    title: "Vásárolnék",
    description: "Termékek, ingatlanok és járművek egy helyen.",
    href: "/marketplace",
    icon: Search,
  },
  {
    title: "Eladnék",
    description: "Adj fel hirdetést átlátható, vezetett folyamatban.",
    href: "/sell",
    icon: PlusCircle,
  },
  {
    title: "Időpontot foglalnék",
    description: "Szépségápolási szolgáltatók és szabad időpontok.",
    href: "/beauty",
    icon: CalendarCheck,
  },
  {
    title: "Szakembert keresek",
    description: "Ellenőrzött szolgáltatók, értékelések és ajánlatok.",
    href: "/providers",
    icon: BadgeCheck,
  },
];

interface ShowcaseItem {
  id: string;
  title: string;
  price: string | number;
  location: string;
  imageUrl: string;
  subtitle: string;
  badgeText?: string;
  rating?: number;
  reviewCount?: number;
  isVerified?: boolean;
  specs?: string[];
}

const MOCK_SHOWCASE_DATA: Record<ShowcaseTab, ShowcaseItem[]> = {
  marketplace: [
    { id: "m1", title: "Zara Elegáns Bőrdzseki M-es", price: 14500, location: "Budapest", imageUrl: "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=600&q=80", subtitle: "Alig használt női bőrdzseki", badgeText: "Eladó" },
    { id: "m2", title: "Canon AE-1 Analog Kamera", price: 45000, location: "Győr", imageUrl: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=600&q=80", subtitle: "Kiváló állapotú vintage kamera", badgeText: "Aukció" },
    { id: "m3", title: "Sony WH-1000XM5 Fejhallgató", price: 95000, location: "Debrecen", imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80", subtitle: "Zajszűrős vezeték nélküli fejhallgató", badgeText: "Alkuképes" },
    { id: "m4", title: "Nike Air Force 1 Sneaker (38)", price: 22000, location: "Szeged", imageUrl: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=600&q=80", subtitle: "Új címkés eredeti sneaker", badgeText: "Új" },
  ],
  beauty: [
    { id: "b1", title: "Glamour Nail & Lash Stúdió", price: "9 500 Ft-tól", location: "Budapest V. kerület", imageUrl: "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=600&q=80", subtitle: "Manikűr, műköröm és szempilla építés", rating: 4.9, reviewCount: 128 },
    { id: "b2", title: "Chic Hair & Balayage Bar", price: "18 000 Ft-tól", location: "Budapest VI. kerület", imageUrl: "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=600&q=80", subtitle: "Fodrászat & prémium hajfestés", rating: 5.0, reviewCount: 89 },
    { id: "b3", title: "Aura Premium Skin & Facials", price: "15 000 Ft-tól", location: "Budapest II. kerület", imageUrl: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=600&q=80", subtitle: "Arckezelés & orvoskozmetika", rating: 4.8, reviewCount: 52 },
    { id: "b4", title: "Dyson Airwrap Complete Long", price: "145 000 Ft", location: "Eladó Termék", imageUrl: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80", subtitle: "Szépségápolási készülék garanciával", rating: 4.9, reviewCount: 34 },
  ],
  services: [
    { id: "s1", title: "ProFix Felújítás & Klíma", price: "Egyedi ajánlat", location: "Pest megye & Budapest", imageUrl: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=600&q=80", subtitle: "Építőipar, lakásfelújítás és klímaszerelés", rating: 4.8, reviewCount: 64, isVerified: true },
    { id: "s2", title: "Kovács Villanyszerelés", price: "8 000 Ft/óra", location: "Budapest & Környéke", imageUrl: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80", subtitle: "Teljes körű villanyszerelési munkák", rating: 4.9, reviewCount: 112, isVerified: true },
    { id: "s3", title: "Express Költöztetés & Fuvar", price: "12 000 Ft/óra", location: "Országos lefedettség", imageUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80", subtitle: "Költöztetés, fuvarszervezés és raktározás", rating: 5.0, reviewCount: 45, isVerified: true },
    { id: "s4", title: "PixelCraft Web & Design", price: "Egyedi ajánlat", location: "Online / Remote", imageUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80", subtitle: "Weboldal készítés & digitális marketing", rating: 4.9, reviewCount: 38, isVerified: true },
  ],
  realestate: [
    { id: "prop-miskolc-1", title: "Felújított Tégla Lakás a Váci Utcában", price: "68.9 M Ft", location: "Budapest V. kerület", imageUrl: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=600&q=80", subtitle: "54 m² · 2 Szoba · 3. emelet", specs: ["54 m²", "2 szoba", "Tégla"] },
    { id: "prop-kazinc-1", title: "Kertvárosi Családi Ház Garázzsal", price: "92.0 M Ft", location: "Budapest XVI. kerület", imageUrl: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=600&q=80", subtitle: "140 m² · 4 Szoba · 650 m² telek", specs: ["140 m²", "4 szoba", "Garázs"] },
    { id: "prop-debrecen-1", title: "Modern Kiadó Studio Panorámával", price: "240 000 Ft/hó", location: "Budapest XI. kerület", imageUrl: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=600&q=80", subtitle: "38 m² · 1 Szoba · Erkéllyel", specs: ["38 m²", "Kiadó", "Erkély"] },
    { id: "prop-1", title: "Balatoni Vízparti Nyaraló Terasszal", price: "115.0 M Ft", location: "Siófok", imageUrl: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=600&q=80", subtitle: "85 m² · 3 Szoba · Közvetlen vízpart", specs: ["85 m²", "Vízparti", "Terasz"] },
  ],
  vehicles: [
    { id: "car-miskolc-bmw", title: "BMW 320i M Sport Line (2022)", price: "11.8 M Ft", location: "Budapest", imageUrl: "https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=600&q=80", subtitle: "42 000 km · Benzin · Automata", specs: ["2022", "42 000 km", "Benzin"] },
    { id: "car-miskolc-audi", title: "Audi A6 Avant 50 TDI Quattro", price: "14.5 M Ft", location: "Győr", imageUrl: "https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?auto=format&fit=crop&w=600&q=80", subtitle: "78 000 km · Dízeles · Automata", specs: ["2021", "78 000 km", "Dízel"] },
    { id: "car-debrecen-mercedes", title: "Volkswagen Golf VII 1.4 TSI", price: "4.9 M Ft", location: "Kecskemét", imageUrl: "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=600&q=80", subtitle: "115 000 km · Benzin · Manuális", specs: ["2017", "115 000 km", "Benzin"] },
    { id: "car-1", title: "Yamaha MT-07 ABS Motorkerékpár", price: "2.8 M Ft", location: "Székesfehérvár", imageUrl: "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=600&q=80", subtitle: "12 500 km · 689 cc · 2021", specs: ["2021", "12 500 km", "Motor"] },
  ],
  education: [
    { id: "e1", title: "Mesteri Balayage & Színkeverési Technikák", price: "Ingyenes", location: "Online kurzus", imageUrl: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80", subtitle: "6 órás gyakorlati videóképzés szalonfodrászoknak", specs: ["6 óra", "Kvíz", "Oklevél"] },
    { id: "e2", title: "Digitális Piactéri Értékesítés Stratégiák", price: "Ingyenes", location: "Online kurzus", imageUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80", subtitle: "E-Commerce Akadémia eladóknak és kereskedőknek", specs: ["4 modul", "Interaktív"] },
    { id: "e3", title: "Ingatlan Befektetési És Értékbecslési Alapok", price: "Ingyenes", location: "Online kurzus", imageUrl: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=600&q=80", subtitle: "Gyakorlati ingatlanpiaci elemző és értékbecslő tanfolyam", specs: ["Ingatlan", "Elemzés"] },
    { id: "e4", title: "Gépjármű Műszaki Állapotfelmérés Útmutató", price: "Ingyenes", location: "Online kurzus", imageUrl: "https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=600&q=80", subtitle: "AutoExpert műszaki és rétegvastagság-mérési útmutató", specs: ["Jármű", "Útmutató"] },
  ],
};

type ShowcaseTab = "marketplace" | "beauty" | "services" | "realestate" | "vehicles" | "education";

export function Home() {
  const [activeTab, setActiveTab] = useState<ShowcaseTab>("marketplace");
  const [searchValue, setSearchValue] = useState("");
  const [locationValue, setLocationValue] = useState("");
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  const showcaseItems = MOCK_SHOWCASE_DATA[activeTab] || MOCK_SHOWCASE_DATA.marketplace;

  return (
    <Layout>
      {/* ── 1. CLEAR VALUE PROPOSITION AND PRIMARY ACTIONS ── */}
      <section className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,_#ecfdf5_0,_#ffffff_48%)] px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-4xl space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-bold text-emerald-800 shadow-sm">
              <ShieldCheck className="h-4 w-4" />
              Egy fiók. Hat terület. Átlátható ügyintézés.
            </div>
            <div className="space-y-4">
              <h1 className="max-w-4xl text-4xl font-black tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                Amit keresel, intézd el egy helyen.
              </h1>
              <p className="max-w-3xl text-base leading-relaxed text-slate-600 sm:text-lg">
                Vásárolj és adj el, foglalj időpontot, találj szakembert, ingatlant,
                járművet vagy képzést – külön oldalak és felesleges regisztrációk nélkül.
              </p>
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                const params = new URLSearchParams();
                if (searchValue.trim()) params.set("q", searchValue.trim());
                if (locationValue.trim()) params.set("city", locationValue.trim());
                window.location.href = `/universal-search?${params.toString()}`;
              }}
              className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg shadow-slate-200/60 md:grid-cols-[minmax(0,1fr)_240px_auto]"
            >
              <label className="flex min-w-0 items-center gap-3 rounded-xl px-3 py-3 focus-within:bg-slate-50">
                <Search className="h-5 w-5 shrink-0 text-emerald-600" />
                <span className="sr-only">Keresett termék vagy szolgáltatás</span>
                <input
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  className="w-full bg-transparent text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400"
                  placeholder="Mit keresel? Például fodrász, kanapé vagy lakás"
                />
              </label>
              <label className="flex items-center gap-3 rounded-xl border-t border-slate-100 px-3 py-3 focus-within:bg-slate-50 md:border-l md:border-t-0">
                <MapPin className="h-5 w-5 shrink-0 text-emerald-600" />
                <span className="sr-only">Település</span>
                <input
                  value={locationValue}
                  onChange={(event) => setLocationValue(event.target.value)}
                  className="w-full bg-transparent text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400"
                  placeholder="Település"
                />
              </label>
              <Button type="submit" className="h-12 rounded-xl bg-emerald-600 px-7 font-bold text-white hover:bg-emerald-700">
                Keresés
              </Button>
            </form>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild className="h-12 rounded-xl bg-emerald-600 px-6 font-bold text-white hover:bg-emerald-700">
                <Link href="/sell">Hirdetést adok fel <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button asChild variant="outline" className="h-12 rounded-xl border-slate-300 px-6 font-bold text-slate-800 hover:bg-white">
                <Link href="/providers">Szolgáltatást keresek</Link>
              </Button>
            </div>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {USER_JOURNEYS.map((journey) => {
              const Icon = journey.icon;
              return (
                <Link key={journey.title} href={journey.href} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="font-extrabold text-slate-900 group-hover:text-emerald-700">{journey.title}</h2>
                      <p className="mt-1 text-xs leading-relaxed text-slate-500">{journey.description}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 2. 6 MAIN VERTICALS GRID ── */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Fő területek
          </h2>
          <span className="text-xs text-slate-500 font-medium">Minden szolgáltatás egy fiókkal</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {VERTICALS.map((vert) => {
            const Icon = vert.icon;
            return (
              <Link key={vert.id} href={vert.href}>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 text-center hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs transition duration-200 group flex flex-col items-center space-y-3 h-full cursor-pointer">
                  <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 group-hover:text-emerald-600 group-hover:border-emerald-300 transition">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 transition">
                      {vert.title}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                      {vert.desc}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── 3. DYNAMIC SHOWCASE SECTION WITH TABBED LISTINGS ── */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Kiemelt Ajánlatok
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Böngéssz az egyes modulok legfrissebb találatai között.
            </p>
          </div>

          {/* Module Switcher Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {[
              { id: "marketplace", label: "Piactér" },
              { id: "beauty", label: "Szépségipar" },
              { id: "services", label: "Szolgáltatások" },
              { id: "realestate", label: "Ingatlanok" },
              { id: "vehicles", label: "Járművek" },
              { id: "education", label: "Oktatás" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id as ShowcaseTab)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition border ${
                  activeTab === t.id
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Listings Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {showcaseItems.map((item) => (
            <UnifiedListingCard
              key={item.id}
              id={item.id}
              title={item.title}
              price={item.price}
              location={item.location}
              subtitle={item.subtitle}
              imageUrl={item.imageUrl}
              moduleKey={activeTab}
              badgeText={item.badgeText}
              rating={item.rating}
              reviewCount={item.reviewCount}
              isVerified={item.isVerified}
              specs={item.specs}
              href={
                activeTab === "realestate"
                  ? `/real-estate?id=${item.id}`
                  : activeTab === "vehicles"
                  ? `/vehicles?id=${item.id}`
                  : `/${activeTab}`
              }
            />
          ))}
        </div>
      </section>

      {/* ── 4. CONCISE VIDEO & PLATFORM OVERVIEW ── */}
      <section className="py-16 bg-slate-50 border-y border-slate-200 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Video Player Container */}
          <div
            className="lg:col-span-7 relative rounded-2xl overflow-hidden border border-slate-200 bg-white group cursor-pointer shadow-xs"
            onClick={() => setIsVideoModalOpen(true)}
          >
            <video
              src="/ilolit_video.mp4"
              muted
              autoPlay
              loop
              playsInline
              className="w-full aspect-video object-cover group-hover:scale-102 transition duration-300"
            />
            <div className="absolute inset-0 bg-slate-900/10 flex items-center justify-center group-hover:bg-slate-900/20 transition">
              <div className="w-16 h-16 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition">
                <Play className="w-6 h-6 fill-white ml-0.5" />
              </div>
            </div>
          </div>

          {/* Right Text Overview */}
          <div className="lg:col-span-5 space-y-5">
            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                Egyetlen fiók minden szolgáltatáshoz
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Az ILOLIT összeköti a mindennapi adásvételt, az időpontfoglalást és a szakemberkeresést. Nincs szükség külön fiókokra vagy külön alkalmazásokra.
              </p>
            </div>

            <div className="space-y-2.5">
              {[
                "Vásárolj és adj el közvetlenül eladóktól",
                "Foglalj szépségápolási és kozmetikai időpontot",
                "Keress ellenőrzött szakembereket a közeledben",
                "Böngéssz eladó ingatlanok és járművek között",
                "Érj el szakmai továbbképzéseket és tananyagokat",
              ].map((text, i) => (
                <div key={i} className="flex items-center gap-3 text-sm font-medium text-slate-700">
                  <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span>{text}</span>
                </div>
              ))}
            </div>

            <div className="pt-2 flex items-center gap-3">
              <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm px-6 py-3 rounded-xl transition">
                <Link href="/marketplace">Böngészés indítása</Link>
              </Button>
              <Button asChild variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-sm px-5 py-3 rounded-xl transition">
                <Link href="/auth/register">Regisztráció</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Video Modal */}
      {isVideoModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl overflow-hidden max-w-4xl w-full border border-slate-200 relative shadow-xl">
            <button
              onClick={() => setIsVideoModalOpen(false)}
              className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center hover:bg-slate-200 text-sm font-bold"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="p-4 bg-white text-slate-900 text-xs font-bold border-b border-slate-200">
              ILOLIT Platform Bemutató
            </div>
            <div className="aspect-video w-full bg-black">
              <video className="w-full h-full" src="/ilolit_video.mp4" controls autoPlay playsInline />
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

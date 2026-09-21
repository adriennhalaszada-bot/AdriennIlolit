import { Layout } from "@/components/layout/Layout";
import { useGetListings } from "@workspace/api-client-react";
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


export function Home() {
  const [searchValue, setSearchValue] = useState("");
  const [locationValue, setLocationValue] = useState("");
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const {
    data: liveListingPage,
    isLoading: isLoadingMarketplace,
    isError: hasMarketplaceError,
  } = useGetListings({ limit: 4 });
  const liveMarketplaceItems: ShowcaseItem[] = (
    Array.isArray((liveListingPage as any)?.items) ? (liveListingPage as any).items : []
  ).map((listing: any) => ({
    id: listing.id,
    title: listing.title || "Névtelen hirdetés",
    price: Number(listing.price) || 0,
    location: listing.location || listing.user?.location || "Magyarország",
    imageUrl: listing.images?.[0]?.url || "",
    subtitle: listing.description || listing.category?.name || "Piactéri hirdetés",
    badgeText: listing.listingType === "AUCTION" ? "Licit" : listing.listingType === "NEGOTIABLE" ? "Alkuképes" : "Fix áras",
  }));
  const showcaseItems = liveMarketplaceItems;

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

      {/* ── 3. LIVE MARKETPLACE LISTINGS ── */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Legfrissebb hirdetések
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Valódi, jelenleg aktív piactéri hirdetések.
            </p>
          </div>
          <Button asChild variant="outline" className="rounded-xl font-bold">
            <Link href="/marketplace">Összes hirdetés</Link>
          </Button>
        </div>

        {/* Listings Grid */}
        {isLoadingMarketplace ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm font-semibold text-slate-600">
            A legfrissebb hirdetések betöltése…
          </div>
        ) : hasMarketplaceError ? (
          <div className="rounded-2xl border border-rose-200 bg-white p-10 text-center text-sm font-semibold text-rose-700">
            A hirdetéseket most nem sikerült betölteni.
          </div>
        ) : showcaseItems.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm font-semibold text-slate-600">
            Jelenleg nincs megjeleníthető aktív ajánlat.
          </div>
        ) : (
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
              moduleKey="marketplace"
              badgeText={item.badgeText}
              rating={item.rating}
              reviewCount={item.reviewCount}
              isVerified={item.isVerified}
              specs={item.specs}
              href={`/product/${item.id}`}
            />
          ))}
          </div>
        )}
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

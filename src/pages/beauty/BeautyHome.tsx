import { useState } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { useGetBeautyProviders } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Star, MapPin, Clock, Calendar, MessageSquarePlus, Flag, SlidersHorizontal, ArrowUpDown } from "lucide-react";
import { LocationSearchWidget } from "@/components/shared/LocationSearchWidget";
import { DEFAULT_LOCATION_STATE, applyLocationFilter, getCalculatedDistance } from "@/lib/locationFilter";
import { useLocationQueryState } from "@/hooks/useLocationQueryState";
import { VerificationBadge } from "@/components/shared/VerificationBadge";
import { ReportProblemModal } from "@/components/shared/ReportProblemModal";
import { WaitingListModal } from "@/components/beauty/WaitingListModal";
import { QuoteRequestModal } from "@/components/providers/QuoteRequestModal";
import { ProviderCoverageSection } from "@/components/providers/ProviderCoverageSection";
import { UnifiedModuleHeader } from "@/components/shared/UnifiedModuleHeader";

const MOCK_BEAUTY_PROVIDERS = [
  {
    id: "prov_miskolc_1",
    displayName: "Miskolci Kozmetika & Balayage Stúdió",
    region: "Miskolc",
    county: "Borsod-Abaúj-Zemplén vármegye",
    address: "Kazinczy utca 12, Miskolc",
    distanceKm: 0,
    rating: 4.9,
    totalReviews: 142,
    verifications: { email: true, phone: true, identity: true, business: true, qualifications: true, location: true, sellerStatus: true },
    isAvailableToday: true,
    isAvailableTomorrow: true,
    isAvailableThisWeek: true,
    availableSlots: ["Ma 16:30", "Ma 17:15", "Holnap 10:00"],
    nextAvailableSlot: "Ma 16:30 után",
    profileImageUrl: "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=600&q=80",
    bio: "Kozmetika és balayage mesterfodrászat Miskolc belvárosában.",
    coverage: {
      mode: "mindkettő" as const,
      baseSettlement: "Miskolc",
      baseAddress: "Kazinczy utca 12",
      customRadiusKm: 25,
      coveredSettlements: ["Miskolc", "Felsőzsolca", "Nyékládháza"],
      calloutFeeDescription: "Miskolc 15km körzetében ingyenes kiszállás",
    },
    services: [
      { id: "srv_m1", name: "Balayage Festés & Vágás", price: 12500 },
      { id: "srv_m2", name: "Hialuronsavas Arckezelés", price: 9500 },
    ]
  },
  {
    id: "prov_debrecen_1",
    displayName: "Debrecen Glamour Nail & Lash Bar",
    region: "Debrecen",
    county: "Hajdú-Bihar vármegye",
    address: "Piac utca 15, Debrecen",
    distanceKm: 0,
    rating: 4.8,
    totalReviews: 98,
    verifications: { email: true, phone: true, identity: true, business: true, qualifications: true, location: false, sellerStatus: true },
    isAvailableToday: true,
    isAvailableTomorrow: true,
    isAvailableThisWeek: true,
    availableSlots: ["Ma 16:00", "Holnap 14:00"],
    nextAvailableSlot: "Ma 16:00 után",
    profileImageUrl: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=600&q=80",
    bio: "Műkörmös és szempilla-építő szalon Debrecen szívében.",
    coverage: {
      mode: "saját_helyszín" as const,
      baseSettlement: "Debrecen",
      baseAddress: "Piac utca 15",
      coveredSettlements: ["Debrecen", "Józsa"],
    },
    services: [
      { id: "srv_d1", name: "Gél Lakk & Manikűr", price: 6500 },
    ]
  },
  {
    id: "prov_1",
    displayName: "Petra Szépség & Balayage Bar",
    region: "Budapest",
    county: "Budapest V. kerület",
    address: "Andrássy út 45, Budapest",
    distanceKm: 2.3,
    rating: 4.9,
    totalReviews: 127,
    verifications: { email: true, phone: true, identity: true, business: true, qualifications: true, location: true, sellerStatus: true },
    isAvailableToday: true,
    isAvailableTomorrow: true,
    isAvailableThisWeek: true,
    availableSlots: ["Ma 17:00", "Holnap 11:00"],
    nextAvailableSlot: "Ma 17:00",
    profileImageUrl: "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=600&q=80",
    bio: "Exkluzív szalon, vágás, hajfestés, balayage és szempilla kezelések.",
    coverage: {
      mode: "saját_helyszín" as const,
      baseSettlement: "Budapest V. kerület",
      baseAddress: "Andrássy út 45",
      coveredSettlements: ["Budapest"],
    },
    services: [
      { id: "srv_1", name: "Teljes hajkezelés (Vágás + Festés)", price: 8500 },
    ]
  },
  {
    id: "prov_2",
    displayName: "Anna Fodrászat & Stúdió",
    region: "Budapest",
    county: "Budapest VI. kerület",
    address: "Nagymező utca 12, Budapest",
    distanceKm: 3.1,
    rating: 4.6,
    totalReviews: 89,
    verifications: { email: true, phone: true, identity: false, business: true, qualifications: true, location: true, sellerStatus: false },
    isAvailableToday: false,
    isAvailableTomorrow: true,
    isAvailableThisWeek: true,
    availableSlots: ["Holnap 09:00", "Holnap 16:30"],
    nextAvailableSlot: "Holnap 09:00",
    profileImageUrl: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80",
    bio: "Professzionális hajfestés és szalonvágás.",
    coverage: {
      mode: "saját_helyszín" as const,
      baseSettlement: "Budapest VI. kerület",
    },
    services: [{ id: "srv_3", name: "Vágás & Szárítás", price: 5500 }]
  }
];

export function BeautyHome() {
  const [search, setSearch] = useState("");
  const [locationState, setLocationState] = useLocationQueryState(DEFAULT_LOCATION_STATE);
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'today' | 'tomorrow' | 'this_week'>('all');
  const [sortBy, setSortBy] = useState<"distance" | "rating">("distance");
  const [showLocationWidget, setShowLocationWidget] = useState(true);

  // Modals state
  const [reportModalData, setReportModalData] = useState<{ isOpen: boolean; title: string }>({ isOpen: false, title: '' });
  const [waitingListModalData, setWaitingListModalData] = useState<{ isOpen: boolean; providerName: string }>({ isOpen: false, providerName: '' });
  const [quoteModalData, setQuoteModalData] = useState<{ isOpen: boolean; providerName: string }>({ isOpen: false, providerName: '' });

  const { data } = useGetBeautyProviders({
    search: search || undefined,
  });

  const rawProviders = data?.items ?? [];
  const allProviders = rawProviders.length > 0 ? rawProviders : MOCK_BEAUTY_PROVIDERS;

  const providersWithDist = allProviders.map((p) => {
    const loc = (p as any).address || (p as any).region || (p as any).county || "";
    const { matches, distanceKm } = applyLocationFilter(loc, locationState);
    const computedDist = locationState.cityInput ? getCalculatedDistance(locationState.cityInput, loc) : null;
    return { provider: p, matches, dist: distanceKm ?? computedDist ?? (p as any).distanceKm ?? null };
  });

  const providers = providersWithDist
    .filter((item) => item.matches)
    .filter((item) => {
      const p = item.provider as any;
      if (availabilityFilter === 'today' && !p.isAvailableToday) return false;
      if (availabilityFilter === 'tomorrow' && !p.isAvailableTomorrow && !p.isAvailableToday) return false;
      if (availabilityFilter === 'this_week' && !p.isAvailableThisWeek && !p.isAvailableToday && !p.isAvailableTomorrow) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "rating") return (b.provider as any).rating - (a.provider as any).rating;
      const dA = a.dist ?? 999;
      const dB = b.dist ?? 999;
      return dA - dB;
    })
    .map((item) => ({ ...item.provider, computedDistance: item.dist }));

  return (
    <Layout>
      <UnifiedModuleHeader
        title="Szépségipar & Időpontfoglalás"
        subtitle="Találj kozmetikust, fodrászt vagy műkörmöst valós szabad időpont és települési távolság alapján."
        moduleKey="beauty"
        searchPlaceholder="Keresés szolgáltatás vagy szalon szerint (pl. balayage, manikűr)"
        searchValue={search}
        onSearchChange={setSearch}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Dual-mode Location & Distance Search Panel */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-rose-500" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Település és Távolsági Sugár Szűrő
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setShowLocationWidget(!showLocationWidget)}
              className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 font-semibold"
            >
              {showLocationWidget ? "Elrejtés" : "Megjelenítés"}
            </button>
          </div>

          {showLocationWidget && (
            <LocationSearchWidget
              value={locationState}
              onChange={setLocationState}
              accentColor="rose"
              compact={false}
              label="Keresett Település & Sugár (+km)"
            />
          )}
        </div>

        {/* Availability Filter & Sort Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-rose-500" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Szabad időpont:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'all', label: 'Bármikor' },
              { id: 'today', label: 'Elérhető ma' },
              { id: 'tomorrow', label: 'Elérhető holnap' },
              { id: 'this_week', label: 'Ezen a héten' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setAvailabilityFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                  availabilityFilter === f.id
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none"
            >
              <option value="distance">Rendezés: Távolság szerint</option>
              <option value="rating">Rendezés: Értékelés szerint</option>
            </select>
          </div>
        </div>

        {/* Active Filter Indicator */}
        <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
          <div>
            Találatok: <strong className="text-slate-900 dark:text-slate-100">{providers.length} szalon</strong>
            {locationState.cityInput && (
              <span className="ml-2 font-bold text-rose-600 bg-rose-50 dark:bg-rose-950 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-800">
                📍 {locationState.cityInput} {locationState.mode === "radius" ? `(+${locationState.customRadiusKm ?? locationState.radiusKm} km sugár)` : ""}
              </span>
            )}
          </div>
        </div>

        {/* Results Grid */}
        {providers.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 space-y-4">
            <Calendar className="w-10 h-10 text-slate-400 mx-auto" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              A megadott település- és sugárszűréssel jelenleg nincs találat.
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Próbáld meg növelni a távolsági sugarat (+km) vagy módosítani a településnevet!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {providers.map((prov: any) => (
              <div
                key={prov.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs hover:shadow-md transition space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {/* Header Row */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <img
                        src={prov.profileImageUrl || "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=600&q=80"}
                        alt={prov.displayName}
                        className="w-14 h-14 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                      />
                      <div className="space-y-1">
                        <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 leading-snug">
                          {prov.displayName}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                            <span>{prov.address || prov.region}</span>
                          </span>

                          {/* Distance Indicator badge */}
                          {prov.computedDistance !== null && prov.computedDistance !== undefined && (
                            <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 text-[11px] font-bold border border-rose-200 dark:border-rose-800">
                              📍 {prov.computedDistance.toFixed(1)} km távolságra
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setReportModalData({ isOpen: true, title: prov.displayName })}
                      className="text-slate-400 hover:text-rose-500 transition p-1"
                      title="Jelentés"
                    >
                      <Flag className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Rating & Verified Badges */}
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-1 text-amber-600 font-semibold">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                      <span>{(prov.rating || 4.9).toFixed(1)}</span>
                      <span className="text-slate-400 font-normal">({prov.totalReviews || 120} értékelés)</span>
                    </div>

                    <span className="px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 text-[11px] font-semibold border border-rose-200 dark:border-rose-800">
                      Ellenőrzött Szalon
                    </span>
                  </div>

                  {/* Provider Coverage Details */}
                  {prov.coverage && (
                    <ProviderCoverageSection coverage={prov.coverage} />
                  )}

                  {/* Available Slot Badge */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      Legközelebbi szabad időpont:
                    </span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {prov.nextAvailableSlot || "Ma foglalható"}
                    </span>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setQuoteModalData({ isOpen: true, providerName: prov.displayName })}
                    className="rounded-lg text-xs border-slate-200 hover:bg-slate-50"
                  >
                    <MessageSquarePlus className="w-3.5 h-3.5 mr-1 text-slate-500" />
                    Ajánlatkérés
                  </Button>

                  <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg px-4">
                    <Link href={`/beauty/${prov.id}`}>Időpont foglalása</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <ReportProblemModal
        isOpen={reportModalData.isOpen}
        onClose={() => setReportModalData({ isOpen: false, title: '' })}
        targetTitle={reportModalData.title}
        targetType="szolgáltató"
      />

      <WaitingListModal
        isOpen={waitingListModalData.isOpen}
        onClose={() => setWaitingListModalData({ isOpen: false, providerName: '' })}
        providerName={waitingListModalData.providerName}
      />

      <QuoteRequestModal
        isOpen={quoteModalData.isOpen}
        onClose={() => setQuoteModalData({ isOpen: false, providerName: '' })}
        providerName={quoteModalData.providerName}
      />
    </Layout>
  );
}

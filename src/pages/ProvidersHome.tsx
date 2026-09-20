import { useEffect, useState, useMemo } from "react";
import { Layout } from "@/components/layout/Layout";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Sparkles, MapPin, Search, Star, Clock, Filter, Navigation, 
  CalendarCheck, ShieldCheck, CheckCircle2, ArrowRight, Briefcase, Zap, Bell, MessageSquarePlus, Flag
} from "lucide-react";
import { ALL_PROVIDER_CATEGORIES, ProviderCategory } from "@/data/allProvidersData";
import { SubcategoryModal } from "@/components/providers/SubcategoryModal";
import { LocationSearchWidget } from "@/components/shared/LocationSearchWidget";
import { DEFAULT_LOCATION_STATE, applyLocationFilter, getCalculatedDistance } from "@/lib/locationFilter";
import { useLocationQueryState } from "@/hooks/useLocationQueryState";
import { VerifiedReviewSummary } from "@/components/shared/VerifiedReviewSummary";
import { ReportProblemModal } from "@/components/shared/ReportProblemModal";
import { WaitingListModal } from "@/components/beauty/WaitingListModal";
import { QuoteRequestModal } from "@/components/providers/QuoteRequestModal";
import { ProviderCoverageSection, CoverageAreaConfig } from "@/components/providers/ProviderCoverageSection";
import { getProviderProfiles, type ProviderProfileRecord } from "@/lib/providerApi";

export function ProvidersHome() {
  const [savedProviders, setSavedProviders] = useState<ProviderProfileRecord[]>([]);
  const [isLoadingProviders, setIsLoadingProviders] = useState(true);
  // Modal state for subcategory browser
  const [activeModalCat, setActiveModalCat] = useState<ProviderCategory | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedSubcategory, setSelectedSubcategory] = useState("ALL");
  const [locationState, setLocationState] = useLocationQueryState(DEFAULT_LOCATION_STATE);
  const [sortBy, setSortBy] = useState<"distance" | "rating" | "reviews">("distance");
  
  // Real-time Availability Filters
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'today' | 'tomorrow' | 'this_week'>('all');

  // Interactive Modals State
  const [reportModalData, setReportModalData] = useState<{ isOpen: boolean; title: string }>({ isOpen: false, title: '' });
  const [waitingListModalData, setWaitingListModalData] = useState<{ isOpen: boolean; providerName: string }>({ isOpen: false, providerName: '' });
  const [quoteModalData, setQuoteModalData] = useState<{ isOpen: boolean; providerName: string }>({ isOpen: false, providerName: '' });

  useEffect(() => {
    let active = true;
    getProviderProfiles()
      .then(({ items }) => active && setSavedProviders(items))
      .catch(() => active && setSavedProviders([]))
      .finally(() => active && setIsLoadingProviders(false));
    return () => { active = false; };
  }, []);

  // Filter Subcategories based on chosen Category
  const availableSubcategories = useMemo(() => {
    if (selectedCategory === "ALL") return [];
    const found = ALL_PROVIDER_CATEGORIES.find(c => c.name === selectedCategory);
    return found ? found.subcategories : [];
  }, [selectedCategory]);

  // Public profiles persisted in Cloudflare R2. No demo providers are mixed into live results.
  const enhancedProviders = useMemo(() => {
    const dayNames = ["Vasárnap", "Hétfő", "Kedd", "Szerda", "Csütörtök", "Péntek", "Szombat"];
    const today = dayNames[new Date().getDay()];
    const tomorrow = dayNames[(new Date().getDay() + 1) % 7];
    return savedProviders.map((provider) => {
      const todaySlots = provider.slots.filter((slot) => slot.isAvailable && slot.day === today);
      return {
        id: provider.id || "",
        name: provider.displayName,
        profession: provider.subCategory,
        category: provider.category,
        city: provider.city,
        region: provider.region || "",
        address: provider.city,
        coverImage: provider.profileImage,
        avatar: provider.profileImage,
        tier: "STANDARD",
        rating: 0,
        reviewCount: 0,
        services: provider.services,
        coverage: undefined as CoverageAreaConfig | undefined,
        availableToday: todaySlots.length > 0,
        isAvailableToday: todaySlots.length > 0,
        isAvailableTomorrow: provider.slots.some((slot) => slot.isAvailable && slot.day === tomorrow),
        isAvailableThisWeek: provider.slots.some((slot) => slot.isAvailable),
        nextSlot: todaySlots.sort((a, b) => a.startTime.localeCompare(b.startTime))[0]?.startTime || "",
        distanceKm: null as number | null,
      };
    });
  }, [savedProviders]);

  // Filtered providers
  const filteredProviders = useMemo(() => {
    return enhancedProviders.map((provider) => {
      const loc = provider.city;
      const { matches, distanceKm } = applyLocationFilter(loc, locationState);
      const computedDist = locationState.cityInput ? getCalculatedDistance(locationState.cityInput, loc) : null;
      return { provider, matches, dist: distanceKm ?? computedDist ?? provider.distanceKm };
    }).filter(({ provider, matches }) => {
      if (!matches) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = provider.name.toLowerCase().includes(q);
        const matchesProf = provider.profession.toLowerCase().includes(q);
        const matchesCity = provider.city.toLowerCase().includes(q);
        const matchesAddr = provider.address.toLowerCase().includes(q);
        const matchesService = provider.services.some(s => s.name.toLowerCase().includes(q));
        if (!matchesName && !matchesProf && !matchesCity && !matchesAddr && !matchesService) {
          return false;
        }
      }

      if (selectedCategory !== "ALL" && provider.category !== selectedCategory) {
        return false;
      }

      if (selectedSubcategory !== "ALL" && provider.profession !== selectedSubcategory) {
        return false;
      }

      if (availabilityFilter === 'today' && !provider.isAvailableToday) return false;
      if (availabilityFilter === 'tomorrow' && !provider.isAvailableTomorrow && !provider.isAvailableToday) return false;
      if (availabilityFilter === 'this_week' && !provider.isAvailableThisWeek) return false;

      return true;
    }).sort((a, b) => {
      if (sortBy === "distance") {
        const dA = a.dist ?? 999;
        const dB = b.dist ?? 999;
        return dA - dB;
      }
      if (sortBy === "rating") return b.provider.rating - a.provider.rating;
      if (sortBy === "reviews") return b.provider.reviewCount - a.provider.reviewCount;
      return 0;
    }).map(({ provider, dist }) => ({ ...provider, computedDistance: dist }));
  }, [searchQuery, selectedCategory, selectedSubcategory, locationState, availabilityFilter, sortBy, enhancedProviders]);

  return (
    <Layout>
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-emerald-50 via-white to-teal-50 text-slate-950 border-b border-slate-200 relative overflow-hidden">
        <div className="container mx-auto px-4 py-12 sm:py-16 max-w-6xl relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-6 h-6 text-emerald-600" />
            <span className="text-sm font-extrabold text-emerald-800 uppercase tracking-wider bg-white px-3 py-1 rounded-full border border-emerald-200">
              ILOLIT szolgáltatók és időpontkereső
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black mb-3 max-w-2xl leading-tight">
            Foglalj időpontot ellenőrzött szakembereknél
          </h1>
          <p className="text-slate-600 font-medium text-base sm:text-lg max-w-3xl mb-8 leading-relaxed">
            Keress település vagy GPS alapján, szűrj szabad időpontra, és kérj ajánlatot ellenőrzött szakemberektől.
          </p>

          {/* Search Box Card */}
          <div className="bg-white text-slate-900 p-6 rounded-3xl shadow-lg border border-slate-200 space-y-5">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Szakma, szolgáltatás vagy név (például: villanyszerelő Miskolcon)"
                className="pl-12 py-6 rounded-2xl text-sm sm:text-base bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 font-medium"
              />
            </div>

            {/* Location Search Widget */}
            <div className="border-t border-slate-200 pt-4">
              <LocationSearchWidget
                value={locationState}
                onChange={setLocationState}
                accentColor="emerald"
                compact={false}
                label="Hol keresel?"
              />
            </div>

            {/* Middle Row: Category, Subcategory & Sort Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-200">
              {/* Category Selector */}
              <div>
                <label className="text-xs font-extrabold text-slate-700 mb-1.5 block">
                  Szolgáltatás Típus
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setSelectedSubcategory("ALL");
                  }}
                  className="w-full px-3 py-3 rounded-xl border border-slate-300 bg-white text-slate-800 text-xs font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="ALL">Minden szolgáltatás (Összes)</option>
                  {ALL_PROVIDER_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subcategory Selector */}
              <div>
                <label className="text-xs font-extrabold text-slate-700 mb-1.5 block">
                  Szakma / Alszolgáltatás
                </label>
                <select
                  value={selectedSubcategory}
                  onChange={(e) => setSelectedSubcategory(e.target.value)}
                  disabled={selectedCategory === "ALL"}
                  className="w-full px-3 py-3 rounded-xl border border-slate-300 bg-white text-slate-800 text-xs font-bold focus:ring-2 focus:ring-emerald-500 outline-none disabled:opacity-50"
                >
                  <option value="ALL">Minden szakma</option>
                  {availableSubcategories.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort By Selector */}
              <div>
                <label className="text-xs font-extrabold text-slate-700 mb-1.5 block">
                  Rendezés
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full px-3 py-3 rounded-xl border border-slate-300 bg-white text-slate-800 text-xs font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="distance">Távolság szerint (km)</option>
                  <option value="rating">Értékelés szerint ⭐</option>
                  <option value="reviews">Vélemények száma szerint</option>
                </select>
              </div>
            </div>

            {/* Availability Filter Chips (III.10) */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1">
                  <Clock size={14} className="text-emerald-400" /> Szabad Időpont:
                </span>
                <button
                  type="button"
                  onClick={() => setAvailabilityFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    availabilityFilter === 'all'
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                      : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-300'
                  }`}
                >
                  Bármikor
                </button>
                <button
                  type="button"
                  onClick={() => setAvailabilityFilter('today')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    availabilityFilter === 'today'
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                      : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-300'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Elérhető ma
                </button>
                <button
                  type="button"
                  onClick={() => setAvailabilityFilter('tomorrow')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    availabilityFilter === 'tomorrow'
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                      : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-300'
                  }`}
                >
                  Elérhető holnap
                </button>
                <button
                  type="button"
                  onClick={() => setAvailabilityFilter('this_week')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    availabilityFilter === 'this_week'
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                      : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-300'
                  }`}
                >
                  Elérhető ezen a héten
                </button>
              </div>

              <div className="text-xs font-bold text-slate-400">
                Találatok: <span className="text-emerald-400 font-extrabold">{filteredProviders.length} szakember</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="container mx-auto px-4 py-10 max-w-6xl space-y-10">
        {/* Provider Registration CTA Banner */}
        <div className="bg-emerald-50 text-slate-900 p-6 sm:p-8 rounded-3xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 border border-emerald-200">
          <div className="space-y-2 text-center md:text-left">
            <Badge className="bg-emerald-600 text-white font-extrabold text-xs">SZOLGÁLTATÓI FIÓK</Badge>
            <h3 className="text-xl sm:text-2xl font-black">
              Szolgáltató vagy? Hozz létre saját előfizetéses bemutatkozó oldalt!
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 max-w-xl font-medium">
              Válassz ágazatot, mutasd be a szolgáltatásaidat, állíts be előleget és fogadj időpontokat vagy egyedi árajánlatkéréseket!
            </p>
          </div>

          <Button asChild size="lg" className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl text-xs sm:text-sm py-6 px-8 shadow-2xl whitespace-nowrap">
            <Link href="/providers/register" className="flex items-center gap-2">
              <span>Regisztrálok Szolgáltatóként ➔</span>
            </Link>
          </Button>
        </div>

        {/* Industry Category Cards Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-emerald-600" />
              <span>Összes Szolgáltatói Főkategória ({ALL_PROVIDER_CATEGORIES.length} Ágazat)</span>
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
            {ALL_PROVIDER_CATEGORIES.map((cat) => (
              <div
                key={cat.id}
                className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between space-y-2 ${
                  selectedCategory === cat.name
                    ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200 shadow-sm"
                    : "border-slate-200 bg-white hover:border-emerald-400 hover:shadow-sm"
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory(selectedCategory === cat.name ? "ALL" : cat.name);
                    setSelectedSubcategory("ALL");
                  }}
                  className="w-full text-left"
                >
                  <div className="text-xs font-extrabold text-slate-900 line-clamp-2 leading-snug">
                    {cat.name}
                  </div>
                  <div className="text-[10px] font-bold text-emerald-400 truncate mt-1">
                    {cat.subcategories.length} szakma
                  </div>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveModalCat(cat);
                    setIsModalOpen(true);
                  }}
                  className="text-[10px] font-extrabold text-slate-600 hover:text-emerald-700 bg-slate-50 hover:bg-emerald-50 py-1.5 px-2 rounded-xl text-center border border-slate-200 transition"
                  title="Alkategóriák részletes megtekintése"
                >
                  Alkategóriák ({cat.subcategories.length})
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Provider Cards List */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100">
              Szolgáltatók és szakemberek ({filteredProviders.length})
            </h2>
          </div>

          {isLoadingProviders ? (
            <div className="text-center py-16 text-sm text-slate-500">Szolgáltatók betöltése…</div>
          ) : filteredProviders.length === 0 ? (
            <div className="text-center py-16 bg-slate-50 rounded-3xl border border-slate-200 space-y-3 p-8">
              <Search className="w-10 h-10 mx-auto text-slate-400" />
              <h3 className="text-lg font-bold text-slate-900">
                Nem található szakember a megadott szűrési feltételekkel
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Próbáld meg növelni a keresési sugarat vagy állítsd vissza a szűrőket!
              </p>
              <Button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("ALL");
                  setSelectedSubcategory("ALL");
                  setLocationState(DEFAULT_LOCATION_STATE);
                  setAvailabilityFilter('all');
                }}
                variant="outline"
                className="rounded-2xl text-xs font-extrabold mt-2 border-slate-300 text-slate-700"
              >
                Szűrők Alaphelyzetbe Állítása
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProviders.map((provider) => (
                <Card
                  key={provider.id}
                  className="rounded-3xl overflow-hidden shadow-sm hover:shadow-lg transition border border-slate-200 flex flex-col bg-white text-slate-900"
                >
                  {/* Cover Header */}
                  <div className="h-32 relative bg-slate-950 overflow-hidden">
                    {provider.coverImage && <img src={provider.coverImage} alt={provider.name} className="w-full h-full object-cover" />}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent" />

                    {/* Tier badge */}
                    <div className="absolute top-3 right-3">
                      {provider.tier === "PREMIUM" && (
                        <Badge className="bg-amber-500 text-slate-950 font-extrabold text-[10px] shadow">
                          ⭐ PREMIUM
                        </Badge>
                      )}
                      {provider.tier === "PRO" && (
                        <Badge className="bg-emerald-500 text-slate-950 font-extrabold text-[10px] shadow">
                          PRO
                        </Badge>
                      )}
                    </div>

                    {/* Report Problem Button (II.9) */}
                    <button
                      type="button"
                      onClick={() => setReportModalData({ isOpen: true, title: provider.name })}
                      className="absolute top-3 left-3 bg-white/90 hover:bg-rose-50 text-slate-600 hover:text-rose-600 p-1.5 rounded-xl text-xs border border-slate-200 transition flex items-center gap-1"
                      title="Probléma jelentése"
                    >
                      <Flag size={13} />
                      <span className="text-[10px]">Jelentés</span>
                    </button>
                  </div>

                  {/* Body Info */}
                  <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-extrabold text-base text-slate-900 leading-snug">
                            {provider.name}
                          </h3>
                          <p className="text-xs font-bold text-emerald-400 mt-0.5">
                            {provider.profession} · {provider.category}
                          </p>

                        </div>

                        {provider.avatar && <img src={provider.avatar} alt={provider.name} className="w-12 h-12 rounded-2xl object-cover border-2 border-white shadow -mt-6 z-10 shrink-0" />}
                      </div>

                      {/* Verified Rating Summary (II.8) */}
                      {provider.reviewCount > 0 && <div>
                        <VerifiedReviewSummary
                          rating={provider.rating}
                          reviewCount={provider.reviewCount}
                          transactionType="szolgáltatás"
                          size="sm"
                        />
                      </div>}

                      {/* Szolgáltatási Terület (III.13) */}
                      {provider.coverage && (
                        <ProviderCoverageSection coverage={provider.coverage} />
                      )}

                      {/* Slot info (III.10) */}
                      {provider.availableToday && (
                        <div className="flex items-center gap-2 text-xs font-bold bg-emerald-50 border border-emerald-200 p-2 rounded-xl text-emerald-800">
                          <Clock size={14} className="text-emerald-400" />
                          <span>Ma szabad: {provider.nextSlot}</span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons (III.11, III.12) */}
                    <div className="space-y-2 pt-2 border-t border-slate-200">
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setWaitingListModalData({ isOpen: true, providerName: provider.name })}
                          className="rounded-xl text-[11px] font-bold border-slate-300 bg-white text-amber-700 hover:bg-amber-50 truncate"
                        >
                          <Bell size={12} className="mr-1 shrink-0" /> Várólista
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setQuoteModalData({ isOpen: true, providerName: provider.name })}
                          className="rounded-xl text-[11px] font-bold border-slate-300 bg-white text-teal-700 hover:bg-teal-50 truncate"
                        >
                          <MessageSquarePlus size={12} className="mr-1 shrink-0" /> Ajánlatot kérek
                        </Button>
                      </div>

                      <Button
                        asChild
                        className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold py-5 rounded-2xl text-xs shadow-md"
                      >
                        <Link href={`/providers/${provider.id}`}>
                          <span>Profil és időpontok</span>
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <SubcategoryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        category={activeModalCat}
        onSelectSubcategory={(catName, subName) => {
          setSelectedCategory(catName);
          setSelectedSubcategory(subName);
        }}
      />

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

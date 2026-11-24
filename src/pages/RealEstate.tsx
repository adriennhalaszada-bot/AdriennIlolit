import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@clerk/react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { LocationSearchWidget } from "@/components/shared/LocationSearchWidget";
import { DEFAULT_LOCATION_STATE, applyLocationFilter } from "@/lib/locationFilter";
import { useLocationQueryState } from "@/hooks/useLocationQueryState";
import { realEstateApi } from "@/lib/realEstate/api";
import {
  BUDAPEST_DISTRICTS,
  ENERGY_RATINGS,
  FLOOR_OPTIONS,
  HEATING_TYPES,
  PARKING_OPTIONS,
  PROPERTY_CATEGORIES,
  PROPERTY_CONDITIONS,
  formatHuf,
  formatPublicLocation,
  getCategoryLabel,
  getConditionLabel,
  getSubtypeLabel,
} from "@/lib/realEstate/config";
import type { PropertyCategory, RealEstateProperty } from "@/lib/realEstate/types";
import {
  BedDouble,
  Bell,
  Building2,
  Calendar,
  Car,
  CheckCircle2,
  ChevronRight,
  Filter,
  Heart,
  Home,
  LayoutDashboard,
  MapPin,
  Maximize2,
  PlusCircle,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Kept empty for backwards compatibility with legacy imports
export const REAL_ESTATE_ITEMS: any[] = [];
export const MOCK_PROPERTIES: any[] = [];

type SortOption = "newest" | "price_asc" | "price_desc" | "area_desc";

export default function RealEstate() {
  const { isSignedIn } = useUser();
  const { toast } = useToast();
  const [locationState, setLocationState] = useLocationQueryState({
    ...DEFAULT_LOCATION_STATE,
    mode: "city",
  });

  // Comprehensive real estate filter states
  const [transactionType, setTransactionType] = useState<"all" | "sale" | "rent">("all");
  const [category, setCategory] = useState<"all" | PropertyCategory>("all");
  const [district, setDistrict] = useState("");
  const [query, setQuery] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minArea, setMinArea] = useState("");
  const [maxArea, setMaxArea] = useState("");
  const [minRooms, setMinRooms] = useState("");
  const [condition, setCondition] = useState("");
  const [floor, setFloor] = useState("");
  const [heating, setHeating] = useState("");
  const [energyRating, setEnergyRating] = useState("");
  const [parking, setParking] = useState("");
  const [hasElevator, setHasElevator] = useState(false);
  const [hasBalcony, setHasBalcony] = useState(false);
  const [hasGarden, setHasGarden] = useState(false);
  const [isAccessible, setIsAccessible] = useState(false);
  const [hasAC, setHasAC] = useState(false);
  const [onlyWithPhotos, setOnlyWithPhotos] = useState(false);
  const [onlyNewListings, setOnlyNewListings] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [localFavs, setLocalFavs] = useState<Record<string, boolean>>({});

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["real-estate-properties"],
    queryFn: () => realEstateApi.listProperties(),
  });

  // Live buyer viewing status notifications (auto-refreshes every 15s)
  const { data: myViewingsData } = useQuery({
    queryKey: ["real-estate-my-viewings-banner"],
    queryFn: () => realEstateApi.getMyViewings(),
    enabled: Boolean(isSignedIn),
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });

  const buyerRespondedViewings = useMemo(
    () =>
      (myViewingsData?.items || []).filter(
        (v) =>
          v.role === "requester" &&
          ["APPROVED", "PROPOSED_NEW_TIME", "REJECTED", "REVOKED_BY_OWNER"].includes(v.status),
      ),
    [myViewingsData],
  );
  const buyerTotalViewingsCount = useMemo(
    () => (myViewingsData?.items || []).filter((v) => v.role === "requester").length,
    [myViewingsData],
  );

  const resetFilters = () => {
    setTransactionType("all");
    setCategory("all");
    setDistrict("");
    setQuery("");
    setMinPrice("");
    setMaxPrice("");
    setMinArea("");
    setMaxArea("");
    setMinRooms("");
    setCondition("");
    setFloor("");
    setHeating("");
    setEnergyRating("");
    setParking("");
    setHasElevator(false);
    setHasBalcony(false);
    setHasGarden(false);
    setIsAccessible(false);
    setHasAC(false);
    setOnlyWithPhotos(false);
    setOnlyNewListings(false);
    setSortBy("newest");
    setLocationState({ ...DEFAULT_LOCATION_STATE, mode: "city" });
  };

  const properties = useMemo(() => {
    const items = Array.isArray(data?.items) ? data.items : [];
    const normQuery = query.trim().toLocaleLowerCase("hu");
    const minP = Number(minPrice) || null;
    const maxP = Number(maxPrice) || null;
    const minA = Number(minArea) || null;
    const maxA = Number(maxArea) || null;
    const minR = Number(minRooms) || null;
    const sevenDaysAgo = Date.now() - 7 * 86_400_000;

    const filtered = items.filter((p) => {
      if (transactionType !== "all" && p.transactionType !== transactionType) return false;
      if (category !== "all" && p.category !== category) return false;
      if (district && p.publicLocation?.district !== district) return false;

      const locMatch = applyLocationFilter(p.publicLocation?.city || "", locationState);
      if (!locMatch.matches) return false;

      if (minP !== null && p.price < minP) return false;
      if (maxP !== null && p.price > maxP) return false;
      if (minA !== null && Number(p.specs?.usableAreaSqm || 0) < minA) return false;
      if (maxA !== null && Number(p.specs?.usableAreaSqm || 0) > maxA) return false;
      if (minR !== null && Number(p.specs?.rooms || 0) < minR) return false;
      if (condition && p.specs?.condition !== condition) return false;
      if (floor && p.specs?.floor !== floor) return false;
      if (heating && p.sustainability?.heatingType !== heating) return false;
      if (energyRating && p.sustainability?.energyRating !== energyRating) return false;
      if (parking && p.specs?.parking !== parking) return false;
      if (hasElevator && !p.specs?.hasElevator) return false;
      if (hasBalcony && !(Number(p.specs?.balconyAreaSqm || 0) > 0)) return false;
      if (hasGarden && !p.specs?.hasGardenAccess) return false;
      if (isAccessible && !p.specs?.isAccessible) return false;
      if (hasAC && !p.specs?.hasAirConditioning) return false;
      if (onlyWithPhotos && (!p.photos || p.photos.length === 0)) return false;
      if (onlyNewListings && new Date(p.createdAt).getTime() < sevenDaysAgo) return false;

      if (normQuery) {
        const hay = [
          p.title,
          p.description,
          formatPublicLocation(p.publicLocation),
          getCategoryLabel(p.category),
          getSubtypeLabel(p.category, p.subtype),
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase("hu");
        if (!hay.includes(normQuery)) return false;
      }

      return true;
    });

    return filtered.sort((a, b) => {
      if (sortBy === "price_asc") return a.price - b.price;
      if (sortBy === "price_desc") return b.price - a.price;
      if (sortBy === "area_desc") {
        return Number(b.specs?.usableAreaSqm || 0) - Number(a.specs?.usableAreaSqm || 0);
      }
      return String(b.createdAt).localeCompare(String(a.createdAt));
    });
  }, [
    data,
    transactionType,
    category,
    district,
    locationState,
    minPrice,
    maxPrice,
    minArea,
    maxArea,
    minRooms,
    condition,
    floor,
    heating,
    energyRating,
    parking,
    hasElevator,
    hasBalcony,
    hasGarden,
    isAccessible,
    hasAC,
    onlyWithPhotos,
    onlyNewListings,
    query,
    sortBy,
  ]);

  const handleToggleFavorite = async (e: React.MouseEvent, propertyId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isSignedIn) {
      toast({ title: "A kedvencek mentéséhez jelentkezz be." });
      return;
    }
    try {
      const res = await realEstateApi.toggleFavorite(propertyId);
      setLocalFavs((prev) => ({ ...prev, [propertyId]: res.favorited }));
      refetch();
    } catch (err: any) {
      toast({ title: err?.message || "Nem sikerült menteni.", variant: "destructive" });
    }
  };

  const inputCls =
    "mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15";

  const FilterPanel = (
    <div className="space-y-5">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <span className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <SlidersHorizontal className="h-4 w-4 text-emerald-600" />
          Részletes szűrők
        </span>
        <button
          type="button"
          onClick={resetFilters}
          className="text-xs font-bold text-emerald-700 hover:underline"
        >
          Alaphelyzet
        </button>
      </div>

      {/* Ügylet típusa */}
      <div>
        <span className="block text-xs font-bold text-slate-700">Ügylet típusa</span>
        <div className="mt-2 grid grid-cols-3 gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-1">
          {[
            { value: "all", label: "Összes" },
            { value: "sale", label: "Eladó" },
            { value: "rent", label: "Kiadó" },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTransactionType(opt.value as "all" | "sale" | "rent")}
              className={`rounded-lg py-1.5 text-xs font-bold transition ${
                transactionType === opt.value
                  ? "bg-emerald-600 text-white"
                  : "text-slate-600 hover:bg-white hover:text-slate-900"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Helykeresés – település elsődleges, egyéni km távolsággal */}
      <div className="border-y border-slate-200 py-4">
        <LocationSearchWidget
          value={locationState}
          onChange={setLocationState}
          accentColor="emerald"
          compact
          label="Település és távolság"
        />
        {locationState.cityInput.trim().toLowerCase() === "budapest" && (
          <label className="mt-3 block text-xs font-bold text-slate-700">
            Budapest kerület
            <select value={district} onChange={(e) => setDistrict(e.target.value)} className={inputCls}>
              <option value="">Összes kerület</option>
              {BUDAPEST_DISTRICTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {/* Kulcsszó */}
      <label className="block text-xs font-bold text-slate-700">
        Kulcsszó
        <div className="relative mt-1.5">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="pl. terasz, új építésű, csendes"
            className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs font-medium text-slate-900 outline-none focus:border-emerald-600"
          />
        </div>
      </label>

      {/* Ingatlantípus */}
      <label className="block text-xs font-bold text-slate-700">
        Ingatlantípus
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as "all" | PropertyCategory)}
          className={inputCls}
        >
          <option value="all">Összes kategória</option>
          {PROPERTY_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </label>

      {/* Ár min / max */}
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-xs font-bold text-slate-700">
          Ár min. (Ft)
          <input
            type="number"
            min={0}
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            placeholder="pl. 20000000"
            className={inputCls}
          />
        </label>
        <label className="block text-xs font-bold text-slate-700">
          Ár max. (Ft)
          <input
            type="number"
            min={0}
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            placeholder="pl. 85000000"
            className={inputCls}
          />
        </label>
      </div>

      {/* Alapterület + szobák */}
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-xs font-bold text-slate-700">
          Alapterület min. (m²)
          <input
            type="number"
            min={0}
            value={minArea}
            onChange={(e) => setMinArea(e.target.value)}
            placeholder="pl. 45"
            className={inputCls}
          />
        </label>
        <label className="block text-xs font-bold text-slate-700">
          Alapterület max. (m²)
          <input
            type="number"
            min={0}
            value={maxArea}
            onChange={(e) => setMaxArea(e.target.value)}
            placeholder="pl. 150"
            className={inputCls}
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="block text-xs font-bold text-slate-700">
          Min. szobaszám
          <input
            type="number"
            min={1}
            value={minRooms}
            onChange={(e) => setMinRooms(e.target.value)}
            placeholder="pl. 2"
            className={inputCls}
          />
        </label>
        <label className="block text-xs font-bold text-slate-700">
          Állapot
          <select value={condition} onChange={(e) => setCondition(e.target.value)} className={inputCls}>
            <option value="">Bármilyen</option>
            {PROPERTY_CONDITIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="block text-xs font-bold text-slate-700">
          Emelet
          <select value={floor} onChange={(e) => setFloor(e.target.value)} className={inputCls}>
            <option value="">Mindegy</option>
            {FLOOR_OPTIONS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-bold text-slate-700">
          Parkolás
          <select value={parking} onChange={(e) => setParking(e.target.value)} className={inputCls}>
            <option value="">Mindegy</option>
            {PARKING_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="block text-xs font-bold text-slate-700">
          Fűtés
          <select value={heating} onChange={(e) => setHeating(e.target.value)} className={inputCls}>
            <option value="">Mindegy</option>
            {HEATING_TYPES.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-bold text-slate-700">
          Energetika
          <select value={energyRating} onChange={(e) => setEnergyRating(e.target.value)} className={inputCls}>
            <option value="">Mindegy</option>
            {ENERGY_RATINGS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Jellemző kapcsolók */}
      <div className="space-y-2 border-t border-slate-200 pt-4">
        <span className="block text-xs font-bold text-slate-700">További jellemzők</span>
        {[
          { checked: hasElevator, set: setHasElevator, label: "Lift" },
          { checked: hasBalcony, set: setHasBalcony, label: "Erkély vagy terasz" },
          { checked: hasGarden, set: setHasGarden, label: "Kertkapcsolat" },
          { checked: isAccessible, set: setIsAccessible, label: "Akadálymentesített" },
          { checked: hasAC, set: setHasAC, label: "Légkondicionáló" },
          { checked: onlyWithPhotos, set: setOnlyWithPhotos, label: "Csak fényképes hirdetések" },
          { checked: onlyNewListings, set: setOnlyNewListings, label: "Új hirdetések (utóbbi 7 nap)" },
        ].map((item) => (
          <label key={item.label} className="flex cursor-pointer items-center gap-2.5 text-xs font-medium text-slate-700">
            <input
              type="checkbox"
              checked={item.checked}
              onChange={(e) => item.set(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
            />
            {item.label}
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <Layout>
      <main className="min-h-screen bg-slate-50 pb-20">
        {/* Hero Header */}
        <section className="border-b border-slate-200 bg-white px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <div className="max-w-3xl space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
                  <ShieldCheck className="h-4 w-4" />
                  Ellenőrzött elérhetőség, hirdetői jóváhagyás és visszaélés elleni védelem
                </div>
                <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                  Eladó és kiadó ingatlanok
                </h1>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-xs sm:text-sm">
                  <p className="font-bold text-slate-950">Te döntöd el, kit fogadsz.</p>
                  <p className="mt-1 leading-relaxed text-slate-600">
                    A magánhirdető szabályozhatja, fogad-e ingatlanközvetítői megkeresést. A személyes megtekintés
                    ellenőrzött telefonszámhoz és hirdetői jóváhagyáshoz kötött.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <Button
                  asChild
                  variant="outline"
                  className="h-11 rounded-xl border-slate-300 bg-white px-4 text-xs font-bold text-slate-800 hover:bg-slate-50"
                >
                  <Link href="/dashboard/bookings/properties">
                    <Calendar className="mr-2 h-4 w-4 text-emerald-600" />
                    Ingatlan megtekintéseim
                    {buyerTotalViewingsCount > 0 && (
                      <span className="ml-2 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-black text-white">
                        {buyerTotalViewingsCount}
                      </span>
                    )}
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="h-11 rounded-xl border-slate-300 bg-white px-4 text-xs font-bold text-slate-800 hover:bg-slate-50"
                >
                  <Link href="/real-estate/admin">
                    <LayoutDashboard className="mr-2 h-4 w-4 text-emerald-600" />
                    Saját Ingatlan Admin
                  </Link>
                </Button>
                <Button
                  asChild
                  className="h-11 rounded-xl bg-emerald-600 px-5 text-xs font-bold text-white hover:bg-emerald-700"
                >
                  <Link href="/real-estate/new">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Ingatlanhirdetés feladása
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Live Buyer Viewing Confirmation Banner */}
        {buyerRespondedViewings.length > 0 && (
          <section className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-start gap-3 text-xs text-emerald-950">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                <div>
                  <p className="font-bold">
                    {buyerRespondedViewings[0].status === "APPROVED"
                      ? `Visszaigazolás: az eladó elfogadta a megtekintésedet (${buyerRespondedViewings[0].propertyTitle} – ${buyerRespondedViewings[0].date} ${buyerRespondedViewings[0].startTime})`
                      : buyerRespondedViewings[0].status === "PROPOSED_NEW_TIME"
                      ? `Az eladó új időpontot javasolt: ${buyerRespondedViewings[0].propertyTitle} (${buyerRespondedViewings[0].proposedDate} ${buyerRespondedViewings[0].proposedStartTime})`
                      : `Az eladó válaszolt a megtekintési kérelmedre (${buyerRespondedViewings[0].propertyTitle})`}
                  </p>
                  <p className="mt-0.5 text-emerald-900/80">
                    {buyerRespondedViewings.length > 1
                      ? `Összesen ${buyerRespondedViewings.length} megválaszolt megtekintési kérelmed van.`
                      : "Nyisd meg a Megtekintéseim oldalt a pontos címhez, térképhez vagy az új időpont elfogadásához."}
                  </p>
                </div>
              </div>
              <Button asChild size="sm" className="rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700">
                <Link href="/real-estate/viewings">
                  <Bell className="mr-1.5 h-3.5 w-3.5" />
                  Visszaigazolás megtekintése
                </Link>
              </Button>
            </div>
          </section>
        )}

        {/* Main Content Grid */}
        <section className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-8 sm:px-6 lg:grid-cols-4 lg:px-8">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:col-span-1 lg:block">
            <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5">
              {FilterPanel}
            </div>
          </aside>

          {/* Listings Area */}
          <div className="space-y-5 lg:col-span-3">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50 lg:hidden"
                >
                  <Filter className="h-4 w-4 text-emerald-600" />
                  Szűrők
                </button>
                <span className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <Building2 className="h-4 w-4 text-emerald-600" />
                  {properties.length} ingatlan
                </span>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-500" htmlFor="re-sort">
                  Rendezés:
                </label>
                <select
                  id="re-sort"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-emerald-600"
                >
                  <option value="newest">Legfrissebb elöl</option>
                  <option value="price_asc">Ár szerint növekvő</option>
                  <option value="price_desc">Ár szerint csökkenő</option>
                  <option value="area_desc">Alapterület szerint csökkenő</option>
                </select>
              </div>
            </div>

            {isLoading ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-14 text-center text-sm font-semibold text-slate-500">
                Ingatlanhirdetések betöltése...
              </div>
            ) : isError ? (
              <div className="rounded-2xl border border-rose-200 bg-white p-14 text-center text-sm font-semibold text-rose-700">
                Az ingatlanhirdetéseket most nem sikerült betölteni.
              </div>
            ) : properties.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-14 text-center">
                <Home className="mx-auto h-10 w-10 text-slate-300" />
                <h2 className="mt-3 text-base font-bold text-slate-900">
                  Nincs a megadott szűrőknek megfelelő aktív ingatlanhirdetés
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Módosítsd a szűrési feltételeket, vagy adj fel új ingatlanhirdetést néhány perc alatt.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2.5">
                  <Button type="button" variant="outline" onClick={resetFilters} className="rounded-xl text-xs font-bold">
                    Szűrők törlése
                  </Button>
                  <Button asChild className="rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700">
                    <Link href="/real-estate/new">
                      <PlusCircle className="mr-1.5 h-4 w-4" />
                      Ingatlanhirdetés feladása
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {properties.map((property) => {
                  const cover = property.photos?.[0];
                  const isFav = localFavs[property.id] ?? property.isFavorited;
                  const freeSlotsCount = property.viewingSlots?.length || 0;
                  return (
                    <Link
                      key={property.id}
                      href={`/real-estate/${property.id}`}
                      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:border-emerald-400 hover:shadow-sm"
                    >
                      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                        {cover?.url ? (
                          <img
                            src={cover.url}
                            alt={property.title}
                            style={{ transform: `rotate(${cover.rotation || 0}deg)` }}
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-slate-400">
                            <Home className="h-12 w-12" />
                          </div>
                        )}
                        <div className="absolute left-3 top-3 flex items-center gap-1.5">
                          <span className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white">
                            {property.transactionType === "rent" ? "Kiadó" : "Eladó"}
                          </span>
                          <span className="rounded-lg bg-white/95 px-2.5 py-1 text-[11px] font-bold text-slate-800">
                            {getCategoryLabel(property.category)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleToggleFavorite(e, property.id)}
                          aria-label="Kedvencekhez adás"
                          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-slate-700 transition hover:text-rose-600"
                        >
                          <Heart className={`h-4 w-4 ${isFav ? "fill-rose-500 text-rose-500" : ""}`} />
                        </button>
                      </div>

                      <div className="flex flex-1 flex-col justify-between p-5">
                        <div>
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="text-xl font-black text-emerald-700">
                              {formatHuf(property.price)}
                              {property.transactionType === "rent" && (
                                <span className="text-xs font-semibold text-slate-500"> / hó</span>
                              )}
                            </p>
                            {property.specs?.condition && (
                              <span className="text-[11px] font-semibold text-slate-500">
                                {getConditionLabel(property.specs.condition)}
                              </span>
                            )}
                          </div>

                          <h3 className="mt-2 line-clamp-2 text-base font-bold text-slate-950 group-hover:text-emerald-700">
                            {property.title}
                          </h3>

                          <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                            <MapPin className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                            <span className="truncate">{formatPublicLocation(property.publicLocation)}</span>
                          </p>
                          {(property.agentInquiryPolicy || "no_agents") === "no_agents" && (
                            <span className="mt-2 inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                              <ShieldCheck className="h-3 w-3 text-emerald-600" />
                              Közvetítői megkeresést nem kér
                            </span>
                          )}
                        </div>

                        <div className="mt-4 space-y-3 border-t border-slate-100 pt-3">
                          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-600">
                            {property.specs?.usableAreaSqm && (
                              <span className="inline-flex items-center gap-1">
                                <Maximize2 className="h-3.5 w-3.5 text-slate-400" />
                                {property.specs.usableAreaSqm} m²
                              </span>
                            )}
                            {property.specs?.rooms && (
                              <span className="inline-flex items-center gap-1">
                                <BedDouble className="h-3.5 w-3.5 text-slate-400" />
                                {property.specs.rooms}
                                {property.specs.halfRooms ? ` + ${property.specs.halfRooms} fél` : ""} szoba
                              </span>
                            )}
                            {property.specs?.parking && property.specs.parking !== "Nincs parkolási lehetőség" && (
                              <span className="inline-flex items-center gap-1">
                                <Car className="h-3.5 w-3.5 text-slate-400" />
                                Parkolás
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between text-xs">
                            <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
                              <Calendar className="h-3.5 w-3.5" />
                              {freeSlotsCount > 0
                                ? `${freeSlotsCount} szabad megtekintési időpont`
                                : "Időpontegyeztetés az adatlapon"}
                            </span>
                            <span className="inline-flex items-center font-bold text-slate-500 group-hover:text-emerald-700">
                              Adatlap
                              <ChevronRight className="h-4 w-4" />
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Mobile Filter Drawer */}
        {mobileFiltersOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div
              className="fixed inset-0 bg-slate-900/50"
              onClick={() => setMobileFiltersOpen(false)}
            />
            <div className="relative ml-auto flex h-full w-full max-w-sm flex-col bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <span className="text-sm font-bold text-slate-950">Ingatlan szűrők</span>
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen(false)}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5">{FilterPanel}</div>
              <div className="border-t border-slate-200 bg-white p-4">
                <Button
                  type="button"
                  onClick={() => setMobileFiltersOpen(false)}
                  className="h-11 w-full rounded-xl bg-emerald-600 font-bold text-white hover:bg-emerald-700"
                >
                  {properties.length} találat megjelenítése
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </Layout>
  );
}

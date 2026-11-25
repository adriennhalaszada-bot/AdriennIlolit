import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { vehiclesApi } from "@/lib/vehicles/api";
import {
  BASE_VEHICLE_CATALOG,
  findBrandEntry,
  getBrandsForCategory,
  getModelsForCategoryAndBrand,
  mergeCustomCatalogEntries,
} from "@/lib/vehicles/catalog";
import {
  CATEGORY_BODY_TYPES,
  CLIMATE_OPTIONS,
  CONDITION_OPTIONS,
  DISTANCE_PRESETS_KM,
  DOCUMENT_STATUS_OPTIONS,
  DRIVE_OPTIONS,
  EQUIPMENT_GROUPS,
  EURO_CLASSES,
  FACTORY_BODY_DESIGNATIONS,
  FUEL_OPTIONS,
  TRANSMISSION_OPTIONS,
  VEHICLE_CATEGORIES,
  VEHICLE_COLLECTIONS,
  formatHuf,
  formatKm,
  formatPower,
  getCategoryLabel,
  getConditionLabel,
  getFuelLabel,
  getTransmissionLabel,
  slugifyHu,
} from "@/lib/vehicles/config";
import type { VehicleCategory, VehicleListing } from "@/lib/vehicles/types";
import { VehicleComparisonModal } from "@/components/vehicles/VehicleComparisonModal";
import {
  calculateLocationDistance,
  findCityCoords,
  getCarYears,
  HUNGARIAN_COUNTY_SEATS,
} from "@/data/carData";
import { getFormattedCitySuggestions, reverseGeocode } from "@/lib/locationFilter";
import {
  Bell,
  Bookmark,
  Calendar,
  Car,
  ChevronDown,
  ChevronUp,
  Clock,
  Crosshair,
  Fuel,
  Gauge,
  Heart,
  LayoutGrid,
  List,
  Loader2,
  MapPin,
  PlusCircle,
  Scale,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";

// Compatibility exports (never leak demo listings)
export const MOCK_VEHICLES: any[] = [];
export const VEHICLE_ITEMS: any[] = [];

type LocationMode = "hungary" | "exact_city" | "city_radius" | "gps_radius";

export interface VehiclesPageProps {
  initialCategory?: VehicleCategory;
  initialCollection?: string;
  params?: Record<string, string | undefined>;
}

export default function Vehicles(props: VehiclesPageProps = {}) {
  const params = useParams<{ categorySlug?: string; brandSlug?: string; modelSlug?: string }>();
  const [, setLocation] = useLocation();
  const { isSignedIn } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: customCatData } = useQuery({
    queryKey: ["vehicles-custom-catalog"],
    queryFn: () => vehiclesApi.getCustomCatalog(),
    staleTime: 300_000,
  });

  const catalog = useMemo(
    () => mergeCustomCatalogEntries(customCatData?.items || []),
    [customCatData?.items],
  );

  // Resolve initial category / collection / brand / model from Hungarian SEO URLs
  const resolvedSeoCat = useMemo<VehicleCategory>(() => {
    if (props.initialCategory) return props.initialCategory;
    if (params.categorySlug) {
      const found = VEHICLE_CATEGORIES.find((c) => c.seoSlug === params.categorySlug);
      if (found) return found.value;
    }
    return "passenger_car";
  }, [props.initialCategory, params.categorySlug]);

  const [category, setCategory] = useState<VehicleCategory>(resolvedSeoCat);
  const [collection, setCollection] = useState<string>(props.initialCollection || "");
  const [queryText, setQueryText] = useState("");
  const [brandSearchInput, setBrandSearchInput] = useState("");

  // Multi-brand & multi-model filter support (#37)
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [activeBrandDropdown, setActiveBrandDropdown] = useState<string>("");
  const [activeModelDropdown, setActiveModelDropdown] = useState<string>("");
  const [typeVariant, setTypeVariant] = useState("");
  const [bodyType, setBodyType] = useState("");
  const [factoryBodyDesig, setFactoryBodyDesig] = useState("");
  const [selectedFuels, setSelectedFuels] = useState<string[]>([]);
  const [selectedTransmissions, setSelectedTransmissions] = useState<string[]>([]);
  const [driveType, setDriveType] = useState("");
  const [climateType, setClimateType] = useState("");
  const [euroClass, setEuroClass] = useState("");
  const [condition, setCondition] = useState("");
  const [documentStatus, setDocumentStatus] = useState("");
  const [sellerType, setSellerType] = useState("");
  const [yearMin, setYearMin] = useState("");
  const [yearMax, setYearMax] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [mileageMin, setMileageMin] = useState("");
  const [mileageMax, setMileageMax] = useState("");
  const [powerMinHp, setPowerMinHp] = useState("");
  const [powerMaxHp, setPowerMaxHp] = useState("");
  const [ccMin, setCcMin] = useState("");
  const [ccMax, setCcMax] = useState("");
  const [evRangeMinKm, setEvRangeMinKm] = useState("");
  const [evBatterySohMin, setEvBatterySohMin] = useState("");
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [hasServiceBook, setHasServiceBook] = useState(false);
  const [hasWarranty, setHasWarranty] = useState(false);
  const [hasDocuments, setHasDocuments] = useState(false);
  const [viewableWhen, setViewableWhen] = useState<
    "" | "today" | "tomorrow" | "week" | "online_booking" | "test_drive"
  >("");

  // Location & custom distance search (#38)
  const [locMode, setLocMode] = useState<LocationMode>("hungary");
  const [cityInput, setCityInput] = useState("");
  const [distanceKm, setDistanceKm] = useState<number>(25);
  const [customDistanceInput, setCustomDistanceInput] = useState("");
  const [gpsBusy, setGpsBusy] = useState(false);
  const [gpsCityLabel, setGpsCityLabel] = useState("");

  // UI view controls
  const [detailedOpen, setDetailedOpen] = useState(false);
  const [openFilterGroups, setOpenFilterGroups] = useState<Set<string>>(
    () => new Set(["general", "technical"]),
  );
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [sortBy, setSortBy] = useState<
    "newest" | "price_asc" | "price_desc" | "year_desc" | "year_asc" | "mileage_asc" | "distance_asc" | "brand_asc"
  >("newest");

  // Comparison (up to 4 vehicles, #51)
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareModalOpen, setCompareModalOpen] = useState(false);

  // Saved searches & recently viewed (#52)
  const [savedSearchName, setSavedSearchName] = useState("");
  const [savingSearch, setSavingSearch] = useState(false);
  const [recentIds, setRecentIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("ilolit_recent_vehicles") || "[]");
    } catch {
      return [];
    }
  });

  // Apply SEO route params on mount/change
  useEffect(() => {
    setCategory(resolvedSeoCat);
  }, [resolvedSeoCat]);

  useEffect(() => {
    if (props.initialCollection !== undefined) setCollection(props.initialCollection);
  }, [props.initialCollection]);

  useEffect(() => {
    if (params.brandSlug) {
      const matched = catalog.find((b) => slugifyHu(b.brand) === params.brandSlug);
      if (matched) {
        setSelectedBrands([matched.brand]);
        setActiveBrandDropdown(matched.brand);
        if (params.modelSlug) {
          const models = getModelsForCategoryAndBrand(resolvedSeoCat, matched.brand, catalog);
          const m = models.find((x) => slugifyHu(x.model) === params.modelSlug);
          if (m) {
            setSelectedModels([m.model]);
            setActiveModelDropdown(m.model);
          }
        }
      }
    }
  }, [params.brandSlug, params.modelSlug, catalog, resolvedSeoCat]);

  // Dynamic Hungarian SEO title & JSON-LD structured data (#58)
  useEffect(() => {
    const catLabel = getCategoryLabel(category);
    const colObj = VEHICLE_COLLECTIONS.find((c) => c.value === collection);
    const brandPart = selectedBrands.length === 1 ? ` – ${selectedBrands[0]}` : "";
    const modelPart = selectedModels.length === 1 ? ` ${selectedModels[0]}` : "";
    const titleStr = colObj
      ? `${colObj.label} | ILOLIT Járművek`
      : `Eladó ${catLabel.toLowerCase()}${brandPart}${modelPart} | ILOLIT Járművek`;
    document.title = titleStr;
  }, [category, collection, selectedBrands, selectedModels]);

  const brandsForCategory = useMemo(() => {
    const all = getBrandsForCategory(category, catalog);
    const q = brandSearchInput.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (b) =>
        b.brand.toLowerCase().includes(q) ||
        (b.aliases || []).some((a) => a.toLowerCase().includes(q)),
    );
  }, [category, catalog, brandSearchInput]);

  const modelsForActiveBrand = useMemo(() => {
    const targetBrand = activeBrandDropdown || selectedBrands[selectedBrands.length - 1] || "";
    if (!targetBrand) return [];
    return getModelsForCategoryAndBrand(category, targetBrand, catalog);
  }, [category, activeBrandDropdown, selectedBrands, catalog]);

  const effectiveBrands = useMemo(() => {
    const set = new Set(selectedBrands);
    if (activeBrandDropdown) set.add(activeBrandDropdown);
    return Array.from(set);
  }, [selectedBrands, activeBrandDropdown]);

  const effectiveModels = useMemo(() => {
    const set = new Set(selectedModels);
    if (activeModelDropdown) set.add(activeModelDropdown);
    return Array.from(set);
  }, [selectedModels, activeModelDropdown]);

  const searchPayload = useMemo(
    () => ({
      category,
      collection: collection || undefined,
      q: queryText.trim() || undefined,
      brands: effectiveBrands,
      models: effectiveModels,
      typeVariant: typeVariant.trim() || undefined,
      bodyType: bodyType || undefined,
      factoryBodyDesignation: factoryBodyDesig || undefined,
      fuelTypes: selectedFuels,
      transmissions: selectedTransmissions,
      driveType: driveType || undefined,
      climateType: climateType || undefined,
      euroClass: euroClass || undefined,
      condition: condition || undefined,
      documentStatus: documentStatus || undefined,
      sellerType: sellerType || undefined,
      yearMin: yearMin ? Number(yearMin) : undefined,
      yearMax: yearMax ? Number(yearMax) : undefined,
      priceMin: priceMin ? Number(priceMin) : undefined,
      priceMax: priceMax ? Number(priceMax) : undefined,
      mileageMin: mileageMin ? Number(mileageMin) : undefined,
      mileageMax: mileageMax ? Number(mileageMax) : undefined,
      powerMinHp: powerMinHp ? Number(powerMinHp) : undefined,
      powerMaxHp: powerMaxHp ? Number(powerMaxHp) : undefined,
      ccMin: ccMin ? Number(ccMin) : undefined,
      ccMax: ccMax ? Number(ccMax) : undefined,
      evRangeMinKm: evRangeMinKm ? Number(evRangeMinKm) : undefined,
      evBatterySohMin: evBatterySohMin ? Number(evBatterySohMin) : undefined,
      equipment: selectedEquipment,
      hasServiceBook: hasServiceBook || undefined,
      hasWarranty: hasWarranty || undefined,
      hasDocuments: hasDocuments || undefined,
      viewableWhen: viewableWhen || undefined,
      sort: sortBy === "distance_asc" ? "newest" : sortBy,
    }),
    [
      category, collection, queryText, effectiveBrands, effectiveModels, typeVariant, bodyType,
      factoryBodyDesig, selectedFuels, selectedTransmissions, driveType, climateType, euroClass,
      condition, documentStatus, sellerType, yearMin, yearMax, priceMin, priceMax, mileageMin,
      mileageMax, powerMinHp, powerMaxHp, ccMin, ccMax, evRangeMinKm, evBatterySohMin,
      selectedEquipment, hasServiceBook, hasWarranty, hasDocuments, viewableWhen, sortBy,
    ],
  );

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["vehicles-list", searchPayload],
    queryFn: () => vehiclesApi.listVehicles(searchPayload),
  });

  const { data: savedSearchesData, refetch: refetchSaved } = useQuery({
    queryKey: ["vehicles-saved-searches"],
    queryFn: () => vehiclesApi.getSavedSearches(),
    enabled: Boolean(isSignedIn),
  });

  const { data: priceAlertsData } = useQuery({
    queryKey: ["vehicles-price-alerts"],
    queryFn: () => vehiclesApi.getPriceAlerts(),
    enabled: Boolean(isSignedIn),
  });

  const effectiveRadiusKm = useMemo(() => {
    const customNum = Number(customDistanceInput);
    if (customDistanceInput.trim() !== "" && Number.isFinite(customNum) && customNum >= 1 && customNum <= 500) {
      return Math.round(customNum);
    }
    return distanceKm;
  }, [customDistanceInput, distanceKm]);

  // Apply exact settlement & Haversine air-line distance filter client-side (never exposes private street address)
  const { visibleVehicles, distanceMap } = useMemo(() => {
    const raw = data?.items || [];
    const dists: Record<string, number | null> = {};
    const targetCity = locMode === "gps_radius" ? gpsCityLabel : cityInput.trim();

    const matched = raw.filter((v) => {
      const vCity = v.publicLocation?.city || "";
      if (locMode === "hungary" || !targetCity) {
        dists[v.id] = targetCity ? calculateLocationDistance(targetCity, vCity) : null;
        return true;
      }
      if (locMode === "exact_city") {
        const d = calculateLocationDistance(targetCity, vCity);
        dists[v.id] = d;
        return d === 0 || vCity.toLowerCase() === targetCity.toLowerCase();
      }
      const d = calculateLocationDistance(targetCity, vCity);
      dists[v.id] = d;
      if (d !== null) return d <= effectiveRadiusKm;
      return vCity.toLowerCase().includes(targetCity.toLowerCase());
    });

    if (sortBy === "distance_asc") {
      matched.sort((a, b) => (dists[a.id] ?? 99999) - (dists[b.id] ?? 99999));
    }

    return { visibleVehicles: matched, distanceMap: dists };
  }, [data?.items, locMode, cityInput, gpsCityLabel, effectiveRadiusKm, sortBy]);

  const compareVehicles = useMemo(
    () => (data?.items || []).filter((v) => compareIds.includes(v.id)),
    [data?.items, compareIds],
  );

  const recentVehicles = useMemo(
    () => (data?.items || []).filter((v) => recentIds.includes(v.id)).slice(0, 4),
    [data?.items, recentIds],
  );

  const handleRequestGps = () => {
    if (!navigator.geolocation) {
      toast({ title: "A böngésző nem támogatja a helymeghatározást. Írd be a települést kézzel.", variant: "destructive" });
      return;
    }
    setGpsBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const city = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
        setGpsBusy(false);
        if (city) {
          setGpsCityLabel(city);
          setCityInput(city);
          setLocMode("gps_radius");
          toast({ title: `Helyzet meghatározva: ${city} (légvonalbeli távolság)` });
        } else {
          toast({ title: "Nem sikerült települést társítani a koordinátához. Add meg kézzel.", variant: "destructive" });
        }
      },
      () => {
        setGpsBusy(false);
        toast({ title: "A helymeghatározás megtagadva – add meg a települést manuálisan.", variant: "destructive" });
      },
      { timeout: 8000 },
    );
  };

  const handleToggleFavorite = async (v: VehicleListing) => {
    if (!isSignedIn) {
      toast({ title: "A kedvencek mentéséhez és árfigyeléshez jelentkezz be." });
      return;
    }
    try {
      await vehiclesApi.toggleFavorite(v.id);
      refetch();
      queryClient.invalidateQueries({ queryKey: ["vehicles-price-alerts"] });
    } catch (err: any) {
      toast({ title: err?.message || "Hiba történt.", variant: "destructive" });
    }
  };

  const handleToggleCompare = (id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 4) {
        toast({ title: "Egyszerre legfeljebb 4 jármű hasonlítható össze." });
        return prev;
      }
      return [...prev, id];
    });
  };

  const handleSaveSearch = async () => {
    if (!isSignedIn) {
      toast({ title: "A keresés mentéséhez jelentkezz be." });
      return;
    }
    setSavingSearch(true);
    try {
      const label =
        savedSearchName.trim() ||
        [getCategoryLabel(category), effectiveBrands.join(" / "), effectiveModels.join(" / "), cityInput]
          .filter(Boolean)
          .join(" · ");
      await vehiclesApi.createSavedSearch(label, { ...searchPayload, locMode, cityInput, effectiveRadiusKm }, true);
      setSavedSearchName("");
      refetchSaved();
      toast({ title: "Keresés elmentve – értesítést kapsz az új találatokról." });
    } catch (err: any) {
      toast({ title: err?.message || "Nem sikerült elmenteni.", variant: "destructive" });
    } finally {
      setSavingSearch(false);
    }
  };

  const toggleGroup = (id: string) => {
    setOpenFilterGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const resetAllFilters = () => {
    setCollection("");
    setQueryText("");
    setSelectedBrands([]);
    setSelectedModels([]);
    setActiveBrandDropdown("");
    setActiveModelDropdown("");
    setTypeVariant("");
    setBodyType("");
    setFactoryBodyDesig("");
    setSelectedFuels([]);
    setSelectedTransmissions([]);
    setDriveType("");
    setClimateType("");
    setEuroClass("");
    setCondition("");
    setDocumentStatus("");
    setSellerType("");
    setYearMin("");
    setYearMax("");
    setPriceMin("");
    setPriceMax("");
    setMileageMin("");
    setMileageMax("");
    setPowerMinHp("");
    setPowerMaxHp("");
    setCcMin("");
    setCcMax("");
    setEvRangeMinKm("");
    setEvBatterySohMin("");
    setSelectedEquipment([]);
    setHasServiceBook(false);
    setHasWarranty(false);
    setHasDocuments(false);
    setViewableWhen("");
    setLocMode("hungary");
    setCityInput("");
    setCustomDistanceInput("");
  };

  const years = useMemo(() => getCarYears(), []);
  const bodyOptions = CATEGORY_BODY_TYPES[category] || [];
  const citySuggestions = useMemo(() => getFormattedCitySuggestions(), []);
  const priceAlerts = priceAlertsData?.items || [];
  const savedSearches = savedSearchesData?.items || [];

  return (
    <Layout>
      <main className="min-h-screen bg-slate-50 pb-20">
        {/* Top Header */}
        <section className="border-b border-slate-200 bg-white px-4 py-7 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl space-y-5">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                  ILOLIT Járművek · Magyar járműhirdetési rendszer
                </p>
                <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                  {collection
                    ? VEHICLE_COLLECTIONS.find((c) => c.value === collection)?.label || "Eladó járművek"
                    : `Eladó ${getCategoryLabel(category).toLowerCase()}`}
                </h1>
                <p className="mt-1 max-w-2xl text-xs sm:text-sm text-slate-600">
                  Ellenőrzött elérhetőség. Hirdetői jóváhagyás. Szervezett megtekintés és tesztvezetés. Visszaélés elleni védelem.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <Button asChild variant="outline" className="h-10 rounded-xl border-slate-200 text-xs font-bold text-slate-800">
                  <Link href="/dashboard/bookings/vehicles">
                    <Calendar className="mr-1.5 h-4 w-4 text-emerald-600" />
                    Járműmegtekintéseim
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-10 rounded-xl border-slate-200 text-xs font-bold text-slate-800">
                  <Link href="/vehicles/admin">
                    <Settings2 className="mr-1.5 h-4 w-4 text-emerald-600" />
                    Saját Járműadmin
                  </Link>
                </Button>
                <Button asChild className="h-10 rounded-xl bg-emerald-600 px-5 text-xs font-bold text-white hover:bg-emerald-700">
                  <Link href="/vehicles/new">
                    <PlusCircle className="mr-1.5 h-4 w-4" />
                    Hirdetés feladása
                  </Link>
                </Button>
              </div>
            </div>

            {/* 10 Main Vehicle Categories (#3) */}
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {VEHICLE_CATEGORIES.map((c) => {
                const active = category === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => {
                      setCategory(c.value);
                      setSelectedBrands([]);
                      setSelectedModels([]);
                      setActiveBrandDropdown("");
                      setActiveModelDropdown("");
                      setBodyType("");
                    }}
                    className={`shrink-0 rounded-xl border px-3.5 py-2 text-xs font-bold transition ${
                      active
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>

            {/* Separate Curated Search Collections (#3) */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="font-bold text-slate-500 mr-1">Kiemelt keresések:</span>
              {VEHICLE_COLLECTIONS.map((col) => {
                const active = collection === col.value;
                return (
                  <button
                    key={col.value}
                    type="button"
                    onClick={() => setCollection(active ? "" : col.value)}
                    className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition ${
                      active
                        ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {col.label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
          {/* Price Drop Alerts Banner (#52) */}
          {priceAlerts.length > 0 && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                <Bell className="h-4 w-4 text-emerald-700" />
                Árfigyelő értesítés ({priceAlerts.length} figyelt jármű ára csökkent)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {priceAlerts.slice(0, 4).map((al) => (
                  <Link
                    key={al.vehicleId}
                    href={`/vehicles/${al.vehicleId}`}
                    className="flex items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs hover:border-emerald-400"
                  >
                    <span className="font-bold text-slate-900 truncate">{al.title}</span>
                    <span className="shrink-0">
                      <span className="line-through text-slate-400 mr-1.5">{formatHuf(al.previousPriceHuf)}</span>
                      <strong className="text-emerald-700">{formatHuf(al.newPriceHuf)}</strong>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* QUICK SEARCH BAR (#36) */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {/* Searchable Brand */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">Márka</label>
                <div className="mt-1 flex gap-1.5">
                  <select
                    value={activeBrandDropdown}
                    onChange={(e) => {
                      const val = e.target.value;
                      setActiveBrandDropdown(val);
                      setActiveModelDropdown("");
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-600"
                  >
                    <option value="">Összes márka ({brandsForCategory.length})</option>
                    {brandsForCategory.map((b) => (
                      <option key={b.brand} value={b.brand}>
                        {b.brand}
                      </option>
                    ))}
                  </select>
                  {activeBrandDropdown && (
                    <button
                      type="button"
                      title="Hozzáadás több márkás kereséshez"
                      onClick={() => {
                        if (!selectedBrands.includes(activeBrandDropdown)) {
                          setSelectedBrands((prev) => [...prev, activeBrandDropdown]);
                        }
                        setActiveBrandDropdown("");
                      }}
                      className="shrink-0 rounded-xl border border-emerald-300 bg-emerald-50 px-2.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
                    >
                      +
                    </button>
                  )}
                </div>
              </div>

              {/* Cascading Model */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">Modell</label>
                <div className="mt-1 flex gap-1.5">
                  <select
                    value={activeModelDropdown}
                    disabled={modelsForActiveBrand.length === 0}
                    onChange={(e) => setActiveModelDropdown(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-600 disabled:bg-slate-50 disabled:text-slate-400"
                  >
                    <option value="">Összes modell</option>
                    {modelsForActiveBrand.map((m) => (
                      <option key={m.model} value={m.model}>
                        {m.model}
                      </option>
                    ))}
                  </select>
                  {activeModelDropdown && (
                    <button
                      type="button"
                      title="Hozzáadás több modelles kereséshez"
                      onClick={() => {
                        if (!selectedModels.includes(activeModelDropdown)) {
                          setSelectedModels((prev) => [...prev, activeModelDropdown]);
                        }
                        setActiveModelDropdown("");
                      }}
                      className="shrink-0 rounded-xl border border-emerald-300 bg-emerald-50 px-2.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
                    >
                      +
                    </button>
                  )}
                </div>
              </div>

              {/* Type / Generation */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Típus / generáció
                </label>
                <input
                  type="text"
                  value={typeVariant}
                  onChange={(e) => setTypeVariant(e.target.value)}
                  placeholder="pl. Golf VII, Astra H, 320d"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 outline-none focus:border-emerald-600"
                />
              </div>

              {/* Body type */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">Kivitel</label>
                <select
                  value={bodyType}
                  onChange={(e) => setBodyType(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-600"
                >
                  <option value="">Bármilyen kivitel</option>
                  {bodyOptions.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              {/* Fuel */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">Üzemanyag</label>
                <select
                  value={selectedFuels[0] || ""}
                  onChange={(e) => setSelectedFuels(e.target.value ? [e.target.value] : [])}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-600"
                >
                  <option value="">Bármilyen üzemanyag</option>
                  {FUEL_OPTIONS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Year min-max */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Évjárat (tól – ig)
                </label>
                <div className="mt-1 grid grid-cols-2 gap-1.5">
                  <select
                    value={yearMin}
                    onChange={(e) => setYearMin(e.target.value)}
                    className="rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-900"
                  >
                    <option value="">Min.</option>
                    {years.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                  <select
                    value={yearMax}
                    onChange={(e) => setYearMax(e.target.value)}
                    className="rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-900"
                  >
                    <option value="">Max.</option>
                    {years.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Price min-max */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Vételár (Ft)
                </label>
                <div className="mt-1 grid grid-cols-2 gap-1.5">
                  <input
                    type="number"
                    min={0}
                    step={100000}
                    value={priceMin}
                    onChange={(e) => setPriceMin(e.target.value)}
                    placeholder="Min. Ft"
                    className="rounded-xl border border-slate-300 px-2.5 py-2 text-xs text-slate-900"
                  />
                  <input
                    type="number"
                    min={0}
                    step={100000}
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value)}
                    placeholder="Max. Ft"
                    className="rounded-xl border border-slate-300 px-2.5 py-2 text-xs text-slate-900"
                  />
                </div>
              </div>

              {/* Mileage min-max */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Kilométeróra-állás (km)
                </label>
                <div className="mt-1 grid grid-cols-2 gap-1.5">
                  <input
                    type="number"
                    min={0}
                    step={5000}
                    value={mileageMin}
                    onChange={(e) => setMileageMin(e.target.value)}
                    placeholder="Min. km"
                    className="rounded-xl border border-slate-300 px-2.5 py-2 text-xs text-slate-900"
                  />
                  <input
                    type="number"
                    min={0}
                    step={5000}
                    value={mileageMax}
                    onChange={(e) => setMileageMax(e.target.value)}
                    placeholder="Max. km"
                    className="rounded-xl border border-slate-300 px-2.5 py-2 text-xs text-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* Active multi-brand / multi-model chips */}
            {(selectedBrands.length > 0 || selectedModels.length > 0) && (
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-[11px] font-bold text-slate-500">Kiválasztva:</span>
                {selectedBrands.map((b) => (
                  <span
                    key={b}
                    className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold text-emerald-900"
                  >
                    {b}
                    <button type="button" onClick={() => setSelectedBrands((p) => p.filter((x) => x !== b))}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                {selectedModels.map((m) => (
                  <span
                    key={m}
                    className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-300 px-2.5 py-0.5 text-xs font-bold text-slate-800"
                  >
                    {m}
                    <button type="button" onClick={() => setSelectedModels((p) => p.filter((x) => x !== m))}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Exact Settlement & Custom Distance Search (#38) */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <MapPin className="h-4 w-4 text-emerald-600" />
                  Település és keresési távolság (légvonalbeli távolság, GPS opcionális)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: "hungary" as LocationMode, label: "Magyarország teljes területén" },
                    { id: "exact_city" as LocationMode, label: "Kizárólag a településen" },
                    { id: "city_radius" as LocationMode, label: "Település környékén" },
                    { id: "gps_radius" as LocationMode, label: "Jelenlegi helyzetem környékén" },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setLocMode(m.id);
                        if (m.id === "gps_radius" && !gpsCityLabel) handleRequestGps();
                      }}
                      className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold transition ${
                        locMode === m.id
                          ? "border-emerald-600 bg-emerald-600 text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {locMode !== "hungary" && (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-12 items-center">
                  <div className="md:col-span-5 flex gap-2">
                    <input
                      type="text"
                      list="ilolit-vehicle-cities"
                      value={cityInput}
                      onChange={(e) => setCityInput(e.target.value)}
                      placeholder="Településnév vagy irányítószám (pl. Győr, Debrecen)"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900"
                    />
                    <datalist id="ilolit-vehicle-cities">
                      {citySuggestions.map((c) => (
                        <option key={c.city} value={c.city}>
                          {c.label}
                        </option>
                      ))}
                    </datalist>
                    <button
                      type="button"
                      onClick={handleRequestGps}
                      disabled={gpsBusy}
                      className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
                    >
                      {gpsBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Crosshair className="h-3.5 w-3.5 text-emerald-600" />}
                      GPS
                    </button>
                  </div>

                  {(locMode === "city_radius" || locMode === "gps_radius") && (
                    <div className="md:col-span-7 flex flex-wrap items-center gap-1.5">
                      {DISTANCE_PRESETS_KM.map((km) => (
                        <button
                          key={km}
                          type="button"
                          onClick={() => {
                            setDistanceKm(km);
                            setCustomDistanceInput("");
                          }}
                          className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold ${
                            customDistanceInput === "" && distanceKm === km
                              ? "border-emerald-600 bg-emerald-600 text-white"
                              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          {km} km
                        </button>
                      ))}
                      <input
                        type="number"
                        min={1}
                        max={500}
                        value={customDistanceInput}
                        onChange={(e) => setCustomDistanceInput(e.target.value)}
                        placeholder="Egyéni km"
                        className="w-24 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action bar: Search + Detailed Search + Save Search */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  onClick={() => refetch()}
                  className="h-10 rounded-xl bg-emerald-600 px-6 text-xs font-bold text-white hover:bg-emerald-700"
                >
                  <Search className="mr-1.5 h-4 w-4" />
                  Keresés ({visibleVehicles.length} találat)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDetailedOpen((v) => !v)}
                  className="h-10 rounded-xl border-slate-300 text-xs font-bold text-slate-800"
                >
                  <SlidersHorizontal className="mr-1.5 h-4 w-4 text-emerald-600" />
                  Részletes keresés
                  {detailedOpen ? <ChevronUp className="ml-1.5 h-4 w-4" /> : <ChevronDown className="ml-1.5 h-4 w-4" />}
                </Button>
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-900 underline underline-offset-2 px-2"
                >
                  Szűrők törlése
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={savedSearchName}
                  onChange={(e) => setSavedSearchName(e.target.value)}
                  placeholder="Keresés neve (opcionális)"
                  className="hidden sm:block rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900"
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={savingSearch}
                  onClick={handleSaveSearch}
                  className="h-10 rounded-xl border-slate-300 text-xs font-bold text-slate-800"
                >
                  <Bookmark className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                  Keresés mentése
                </Button>
              </div>
            </div>

            {/* COLLAPSIBLE DETAILED SEARCH GROUPS (#37) */}
            {detailedOpen && (
              <div className="space-y-3 border-t border-slate-200 pt-4">
                {[
                  {
                    id: "general",
                    title: "Általános jellemzők és szabadszavas keresés",
                    body: (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <label className="font-bold text-slate-700">
                          Kulcsszó / hirdetés azonosító
                          <input
                            type="text"
                            value={queryText}
                            onChange={(e) => setQueryText(e.target.value)}
                            placeholder="pl. DSG, Highline, ILV-..."
                            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-normal"
                          />
                        </label>
                        <label className="font-bold text-slate-700">
                          Gyári típusmegnevezés (Variant, Avant, Sportback…)
                          <select
                            value={factoryBodyDesig}
                            onChange={(e) => setFactoryBodyDesig(e.target.value)}
                            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-normal"
                          >
                            <option value="">Bármely</option>
                            {FACTORY_BODY_DESIGNATIONS.map((d) => (
                              <option key={d} value={d}>{d}</option>
                            ))}
                          </select>
                        </label>
                        <label className="font-bold text-slate-700">
                          Márka gyorskeresés (mobilbarát)
                          <input
                            type="text"
                            value={brandSearchInput}
                            onChange={(e) => setBrandSearchInput(e.target.value)}
                            placeholder="Írd be a márka nevét (pl. Skoda, VW)"
                            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-normal"
                          />
                        </label>
                      </div>
                    ),
                  },
                  {
                    id: "technical",
                    title: "Műszaki adatok",
                    body: (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                        <label className="font-bold text-slate-700">
                          Sebességváltó
                          <select
                            value={selectedTransmissions[0] || ""}
                            onChange={(e) => setSelectedTransmissions(e.target.value ? [e.target.value] : [])}
                            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-normal"
                          >
                            <option value="">Bármilyen váltó</option>
                            {TRANSMISSION_OPTIONS.map((t) => (
                              <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                          </select>
                        </label>
                        <label className="font-bold text-slate-700">
                          Hajtás
                          <select
                            value={driveType}
                            onChange={(e) => setDriveType(e.target.value)}
                            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-normal"
                          >
                            <option value="">Bármilyen hajtás</option>
                            {DRIVE_OPTIONS.map((d) => (
                              <option key={d.value} value={d.value}>{d.label}</option>
                            ))}
                          </select>
                        </label>
                        <label className="font-bold text-slate-700">
                          Klíma fajtája
                          <select
                            value={climateType}
                            onChange={(e) => setClimateType(e.target.value)}
                            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-normal"
                          >
                            <option value="">Bármilyen</option>
                            {CLIMATE_OPTIONS.map((c) => (
                              <option key={c.value} value={c.value}>{c.label}</option>
                            ))}
                          </select>
                        </label>
                        <label className="font-bold text-slate-700">
                          Környezetvédelmi osztály
                          <select
                            value={euroClass}
                            onChange={(e) => setEuroClass(e.target.value)}
                            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-normal"
                          >
                            <option value="">Bármely</option>
                            {EURO_CLASSES.map((ec) => (
                              <option key={ec} value={ec}>{ec}</option>
                            ))}
                          </select>
                        </label>
                        <label className="font-bold text-slate-700">
                          Teljesítmény min. (LE)
                          <input type="number" min={0} value={powerMinHp} onChange={(e) => setPowerMinHp(e.target.value)} placeholder="pl. 110" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-normal" />
                        </label>
                        <label className="font-bold text-slate-700">
                          Teljesítmény max. (LE)
                          <input type="number" min={0} value={powerMaxHp} onChange={(e) => setPowerMaxHp(e.target.value)} placeholder="pl. 300" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-normal" />
                        </label>
                        <label className="font-bold text-slate-700">
                          Hengerűrtartalom min. (cm³)
                          <input type="number" min={0} value={ccMin} onChange={(e) => setCcMin(e.target.value)} placeholder="pl. 1400" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-normal" />
                        </label>
                        <label className="font-bold text-slate-700">
                          Hengerűrtartalom max. (cm³)
                          <input type="number" min={0} value={ccMax} onChange={(e) => setCcMax(e.target.value)} placeholder="pl. 2500" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-normal" />
                        </label>
                      </div>
                    ),
                  },
                  {
                    id: "ev",
                    title: "Elektromos és tölthető hibrid járműadatok",
                    body: (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <label className="font-bold text-slate-700">
                          Minimális WLTP hatótáv (km)
                          <input type="number" min={0} value={evRangeMinKm} onChange={(e) => setEvRangeMinKm(e.target.value)} placeholder="pl. 350" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-normal" />
                        </label>
                        <label className="font-bold text-slate-700">
                          Minimális akkumulátor állapot – SoH (%)
                          <input type="number" min={0} max={100} value={evBatterySohMin} onChange={(e) => setEvBatterySohMin(e.target.value)} placeholder="pl. 85" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-normal" />
                        </label>
                      </div>
                    ),
                  },
                  {
                    id: "history",
                    title: "Állapot és előélet",
                    body: (
                      <div className="space-y-3 text-xs">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <label className="font-bold text-slate-700">
                            Állapot
                            <select value={condition} onChange={(e) => setCondition(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-normal">
                              <option value="">Bármilyen állapot</option>
                              {CONDITION_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                            </select>
                          </label>
                          <label className="font-bold text-slate-700">
                            Okmányok jellege és érvényessége
                            <select value={documentStatus} onChange={(e) => setDocumentStatus(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-normal">
                              <option value="">Bármilyen okmány</option>
                              {DOCUMENT_STATUS_OPTIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                            </select>
                          </label>
                        </div>
                        <div className="flex flex-wrap gap-4">
                          <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                            <input type="checkbox" checked={hasServiceBook} onChange={(e) => setHasServiceBook(e.target.checked)} className="h-4 w-4 accent-emerald-600" />
                            Szervizkönyves / digitális szervizkönyv
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                            <input type="checkbox" checked={hasWarranty} onChange={(e) => setHasWarranty(e.target.checked)} className="h-4 w-4 accent-emerald-600" />
                            Garanciális
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                            <input type="checkbox" checked={hasDocuments} onChange={(e) => setHasDocuments(e.target.checked)} className="h-4 w-4 accent-emerald-600" />
                            Feltöltött előéleti dokumentumok (JSZP / állapotfelmérés)
                          </label>
                        </div>
                      </div>
                    ),
                  },
                  {
                    id: "equipment",
                    title: `Felszereltség (${selectedEquipment.length} kiválasztva)`,
                    body: (
                      <div className="space-y-3 text-xs">
                        {EQUIPMENT_GROUPS.slice(0, 6).map((grp) => (
                          <div key={grp.id} className="space-y-1.5">
                            <p className="font-bold text-slate-800">{grp.label}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {grp.items.map((item) => {
                                const on = selectedEquipment.includes(item.id);
                                return (
                                  <button
                                    key={item.id}
                                    type="button"
                                    onClick={() =>
                                      setSelectedEquipment((prev) =>
                                        on ? prev.filter((x) => x !== item.id) : [...prev, item.id],
                                      )
                                    }
                                    className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${
                                      on
                                        ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                    }`}
                                  >
                                    {item.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    ),
                  },
                  {
                    id: "seller_viewing",
                    title: "Hirdető és megtekintési lehetőségek",
                    body: (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <label className="font-bold text-slate-700">
                          Hirdető típusa
                          <select value={sellerType} onChange={(e) => setSellerType(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-normal">
                            <option value="">Magánszemély és kereskedő is</option>
                            <option value="private">Magánszemély</option>
                            <option value="dealer">Kereskedő</option>
                            <option value="verified_business">Ellenőrzött vállalkozás</option>
                          </select>
                        </label>
                        <label className="font-bold text-slate-700">
                          Megtekintés és tesztvezetés
                          <select value={viewableWhen} onChange={(e) => setViewableWhen(e.target.value as any)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-normal">
                            <option value="">Bármikor</option>
                            <option value="today">Ma megtekinthető</option>
                            <option value="tomorrow">Holnap megtekinthető</option>
                            <option value="week">Ezen a héten megtekinthető</option>
                            <option value="online_booking">Online időpontfoglalással rendelkező</option>
                            <option value="test_drive">Tesztvezetésre alkalmas jármű</option>
                          </select>
                        </label>
                      </div>
                    ),
                  },
                ].map((group) => {
                  const isOpen = openFilterGroups.has(group.id);
                  return (
                    <div key={group.id} className="rounded-xl border border-slate-200 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.id)}
                        className="flex w-full items-center justify-between bg-slate-50 px-4 py-2.5 text-left text-xs font-bold text-slate-900 hover:bg-slate-100"
                      >
                        <span>{group.title}</span>
                        {isOpen ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
                      </button>
                      {isOpen && <div className="bg-white p-4 border-t border-slate-100">{group.body}</div>}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Saved Searches Strip (#52) */}
          {savedSearches.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-bold text-slate-600">Mentett kereséseid:</span>
              {savedSearches.map((s) => (
                <span
                  key={s.id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-700"
                >
                  <button
                    type="button"
                    onClick={() => {
                      const f = s.filters || {};
                      if (f.category) setCategory(f.category);
                      if (Array.isArray(f.brands)) setSelectedBrands(f.brands);
                      if (Array.isArray(f.models)) setSelectedModels(f.models);
                      if (f.priceMax) setPriceMax(String(f.priceMax));
                      if (f.cityInput) setCityInput(f.cityInput);
                      if (f.locMode) setLocMode(f.locMode);
                    }}
                    className="hover:text-emerald-700"
                  >
                    {s.name}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await vehiclesApi.deleteSavedSearch(s.id);
                      refetchSaved();
                    }}
                    className="text-slate-400 hover:text-rose-600"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* RESULTS TOOLBAR (#39) */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Car className="h-5 w-5 text-emerald-600" />
              <h2 className="text-base font-black text-slate-950">
                Találati lista ({visibleVehicles.length} jármű)
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800"
              >
                <option value="newest">Legfrissebb</option>
                <option value="price_asc">Ár szerint növekvő</option>
                <option value="price_desc">Ár szerint csökkenő</option>
                <option value="year_desc">Évjárat szerint csökkenő</option>
                <option value="year_asc">Évjárat szerint növekvő</option>
                <option value="mileage_asc">Kilométeróra-állás szerint</option>
                <option value="distance_asc">Távolság szerint</option>
                <option value="brand_asc">Márka szerint</option>
              </select>

              <div className="inline-flex rounded-xl border border-slate-300 bg-white p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  title="Részletes listanézet"
                  className={`rounded-lg p-1.5 ${viewMode === "list" ? "bg-emerald-600 text-white" : "text-slate-600"}`}
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  title="Rácsos nézet"
                  className={`rounded-lg p-1.5 ${viewMode === "grid" ? "bg-emerald-600 text-white" : "text-slate-600"}`}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* RESULTS LIST / GRID (#39) — ZERO marketplace shipping/cart elements! */}
          {isLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-14 text-center text-sm text-slate-500 flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
              Járműhirdetések betöltése...
            </div>
          ) : isError ? (
            <div className="rounded-2xl border border-rose-200 bg-white p-12 text-center text-sm font-semibold text-rose-700">
              A járműhirdetéseket most nem sikerült betölteni.
            </div>
          ) : visibleVehicles.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center space-y-3">
              <Car className="mx-auto h-10 w-10 text-slate-300" />
              <p className="text-base font-bold text-slate-900">Nincs a szűrőknek megfelelő aktív járműhirdetés</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Próbáld tágítani a szűrési feltételeket, vagy adj fel saját járműhirdetést néhány perc alatt.
              </p>
              <div className="flex justify-center gap-2 pt-1">
                <Button type="button" variant="outline" onClick={resetAllFilters} className="rounded-xl text-xs font-bold">
                  Szűrők alaphelyzetbe
                </Button>
                <Button asChild className="rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700">
                  <Link href="/vehicles/new">Hirdetés feladása</Link>
                </Button>
              </div>
            </div>
          ) : viewMode === "list" ? (
            <div className="space-y-4">
              {visibleVehicles.map((v) => {
                const dist = distanceMap[v.id];
                const isCompared = compareIds.includes(v.id);
                return (
                  <article
                    key={v.id}
                    className={`rounded-2xl border bg-white overflow-hidden transition hover:border-emerald-400 shadow-xs ${
                      v.isFeatured ? "border-emerald-300 ring-1 ring-emerald-200" : "border-slate-200"
                    }`}
                  >
                    <div className="flex flex-col md:flex-row">
                      <Link
                        href={`/vehicles/${v.id}`}
                        className="relative md:w-72 shrink-0 aspect-[16/10] md:aspect-auto bg-slate-100 overflow-hidden block"
                      >
                        {v.photos?.[0]?.url ? (
                          <img src={v.photos[0].url} alt={v.title} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full min-h-[180px] items-center justify-center text-slate-300">
                            <Car className="h-12 w-12" />
                          </div>
                        )}
                        {v.isFeatured && (
                          <span className="absolute left-2.5 top-2.5 rounded-lg bg-emerald-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                            Kiemelt hirdetés
                          </span>
                        )}
                        <span className="absolute bottom-2 right-2 rounded-md bg-slate-900/75 px-2 py-0.5 text-[10px] font-semibold text-white">
                          {v.photos?.length || 0} fotó
                        </span>
                      </Link>

                      <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between gap-3">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                          <div className="space-y-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
                              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-700">
                                {v.sellerType === "private"
                                  ? "Magánszemély"
                                  : v.sellerType === "verified_business"
                                    ? "Ellenőrzött vállalkozás"
                                    : "Kereskedő"}
                              </span>
                              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-600">
                                {getConditionLabel(v.condition)}
                              </span>
                              <span className="text-slate-400">Azonosító: {v.listingCode}</span>
                            </div>
                            <Link
                              href={`/vehicles/${v.id}`}
                              className="block text-base sm:text-lg font-black text-slate-950 hover:text-emerald-700"
                            >
                              {v.brand} {v.model} {v.typeVariant || ""}
                            </Link>
                            <p className="text-xs text-slate-500 line-clamp-1">{v.title}</p>
                          </div>

                          <div className="text-left sm:text-right shrink-0">
                            <p className="text-xl font-black text-emerald-700">{formatHuf(v.pricing?.priceHuf)}</p>
                            {v.pricing?.negotiable && (
                              <span className="text-[11px] font-semibold text-slate-500">Alkuképes</span>
                            )}
                          </div>
                        </div>

                        {/* Structured technical strip */}
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                          <div>
                            <span className="block text-[10px] text-slate-400">Évjárat</span>
                            <strong className="text-slate-900">{v.manufactureYear}</strong>
                          </div>
                          <div>
                            <span className="block text-[10px] text-slate-400">Kilométeróra-állás</span>
                            <strong className="text-slate-900">{formatKm(v.mileageKm)}</strong>
                          </div>
                          <div>
                            <span className="block text-[10px] text-slate-400">Üzemanyag</span>
                            <strong className="text-slate-900">{getFuelLabel(v.fuelType)}</strong>
                          </div>
                          <div>
                            <span className="block text-[10px] text-slate-400">Teljesítmény</span>
                            <strong className="text-slate-900">
                              {formatPower(v.systemPowerKw || v.powerKw, v.systemPowerHp || v.powerHp)}
                            </strong>
                          </div>
                          <div>
                            <span className="block text-[10px] text-slate-400">Sebességváltó</span>
                            <strong className="text-slate-900">{getTransmissionLabel(v.transmission)}</strong>
                          </div>
                        </div>

                        {v.description && (
                          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{v.description}</p>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5 text-xs">
                          <div className="flex flex-wrap items-center gap-3 text-slate-600">
                            <span className="inline-flex items-center gap-1 font-semibold">
                              <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                              {v.publicLocation?.city || "Magyarország"}
                              {dist !== null && dist !== undefined ? ` (${dist} km, légvonalban)` : ""}
                            </span>
                            {v.testDriveSettings?.enabled && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                                <ShieldCheck className="h-3 w-3" />
                                Tesztvezetés kérhető
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggleFavorite(v)}
                              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition ${
                                v.isFavorited
                                  ? "border-rose-200 bg-rose-50 text-rose-700"
                                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                              }`}
                            >
                              <Heart className={`h-3.5 w-3.5 ${v.isFavorited ? "fill-rose-600" : ""}`} />
                              Kedvenc
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleCompare(v.id)}
                              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition ${
                                isCompared
                                  ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                              }`}
                            >
                              <Scale className="h-3.5 w-3.5" />
                              {isCompared ? "Összehasonlításban" : "Összehasonlítás"}
                            </button>
                            <Link
                              href={`/vehicles/${v.id}`}
                              className="inline-flex items-center rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                            >
                              Adatlap
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {visibleVehicles.map((v) => {
                const isCompared = compareIds.includes(v.id);
                return (
                  <article
                    key={v.id}
                    className="rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col justify-between hover:border-emerald-400 transition"
                  >
                    <div>
                      <Link href={`/vehicles/${v.id}`} className="relative block aspect-[16/10] bg-slate-100 overflow-hidden">
                        {v.photos?.[0]?.url ? (
                          <img src={v.photos[0].url} alt={v.title} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-slate-300">
                            <Car className="h-10 w-10" />
                          </div>
                        )}
                        {v.isFeatured && (
                          <span className="absolute left-2 top-2 rounded-md bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
                            Kiemelt
                          </span>
                        )}
                      </Link>
                      <div className="p-4 space-y-2">
                        <p className="text-lg font-black text-emerald-700">{formatHuf(v.pricing?.priceHuf)}</p>
                        <Link href={`/vehicles/${v.id}`} className="block text-sm font-black text-slate-950 hover:text-emerald-700 line-clamp-2">
                          {v.brand} {v.model} {v.typeVariant || ""}
                        </Link>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
                          <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{v.manufactureYear}</span>
                          <span className="inline-flex items-center gap-1"><Gauge className="h-3 w-3" />{formatKm(v.mileageKm)}</span>
                          <span className="inline-flex items-center gap-1"><Fuel className="h-3 w-3" />{getFuelLabel(v.fuelType)}</span>
                        </div>
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                          {v.publicLocation?.city || "Magyarország"}
                        </p>
                      </div>
                    </div>
                    <div className="px-4 pb-4 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleFavorite(v)}
                        className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50"
                        title="Kedvenc"
                      >
                        <Heart className={`h-4 w-4 ${v.isFavorited ? "fill-rose-600 text-rose-600" : ""}`} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleCompare(v.id)}
                        className={`flex-1 rounded-lg border py-1.5 text-xs font-bold ${
                          isCompared ? "border-emerald-600 bg-emerald-50 text-emerald-800" : "border-slate-200 text-slate-700"
                        }`}
                      >
                        {isCompared ? "Összehasonlításban" : "Összehasonlítás"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* Recently Viewed Vehicles (#52) */}
          {recentVehicles.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Nemrég megtekintett járművek</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {recentVehicles.map((rv) => (
                  <Link
                    key={rv.id}
                    href={`/vehicles/${rv.id}`}
                    className="rounded-xl border border-slate-200 p-2.5 hover:border-emerald-400 transition space-y-1.5"
                  >
                    <p className="text-xs font-bold text-slate-900 truncate">{rv.brand} {rv.model}</p>
                    <p className="text-xs font-black text-emerald-700">{formatHuf(rv.pricing?.priceHuf)}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Hungarian SEO internal links for popular categories & brands (#58) */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Népszerű magyar járműkategóriák és márkák
            </h3>
            <div className="flex flex-wrap gap-2 text-xs">
              {[
                { href: "/jarmuvek/szemelyautok", label: "Személyautók" },
                { href: "/jarmuvek/elektromos-autok", label: "Elektromos autók" },
                { href: "/jarmuvek/motorkerekparok", label: "Motorkerékpárok" },
                { href: "/jarmuvek/kishaszonjarmuvek", label: "Kishaszongépjárművek" },
                { href: "/jarmuvek/szemelyautok/suzuki/swift", label: "Suzuki Swift" },
                { href: "/jarmuvek/szemelyautok/opel/astra", label: "Opel Astra" },
                { href: "/jarmuvek/szemelyautok/volkswagen/golf", label: "Volkswagen Golf" },
                { href: "/jarmuvek/szemelyautok/bmw/3-as-sorozat", label: "BMW 3-as sorozat" },
                { href: "/jarmuvek/szemelyautok/skoda/octavia", label: "Škoda Octavia" },
                { href: "/jarmuvek/szemelyautok/toyota/corolla", label: "Toyota Corolla" },
              ].map((lnk) => (
                <Link
                  key={lnk.href}
                  href={lnk.href}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-semibold text-slate-700 hover:border-emerald-300 hover:text-emerald-800"
                >
                  {lnk.label}
                </Link>
              ))}
            </div>
          </section>
        </div>

        {/* Floating Comparison Bar (up to 4 vehicles) */}
        {compareIds.length > 0 && (
          <div className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 flex items-center gap-3 rounded-2xl border border-emerald-300 bg-white px-4 py-2.5 shadow-xl">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900">
              <Scale className="h-4 w-4 text-emerald-600" />
              Összehasonlítás: {compareIds.length} / 4 jármű
            </span>
            <Button
              type="button"
              size="sm"
              onClick={() => setCompareModalOpen(true)}
              className="rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700"
            >
              Összevetés megnyitása
            </Button>
            <button
              type="button"
              onClick={() => setCompareIds([])}
              className="text-xs font-semibold text-slate-500 hover:text-rose-600"
            >
              Törlés
            </button>
          </div>
        )}

        <VehicleComparisonModal
          isOpen={compareModalOpen}
          onClose={() => setCompareModalOpen(false)}
          vehicles={compareVehicles}
          distances={distanceMap}
          onRemoveVehicle={(id) => setCompareIds((p) => p.filter((x) => x !== id))}
          onSelectVehicleDetail={(v) => setLocation(`/vehicles/${v.id}`)}
        />
      </main>
    </Layout>
  );
}

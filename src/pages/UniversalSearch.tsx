import { useState } from "react";
import { useLocation } from "wouter";
import { UniversalSearchBar } from "@/components/shared/UniversalSearchBar";
import { LocationSearchWidget } from "@/components/shared/LocationSearchWidget";
import { LocationSearchState, applyLocationFilter } from "@/lib/locationFilter";
import { useFavorites, FavoriteType } from "@/context/FavoritesContext";
import { useSavedSearches } from "@/context/SavedSearchesContext";
import { useComparison } from "@/context/ComparisonContext";
import {
  Store,
  Sparkles,
  Wrench,
  Home,
  Car,
  GraduationCap,
  Heart,
  BookmarkPlus,
  Layers,
  MapPin,
  Check,
  Tag,
  Star
} from "lucide-react";
import { REAL_ESTATE_ITEMS } from "@/pages/RealEstate";
import { VEHICLE_ITEMS } from "@/pages/Vehicles";
import { DEMO_GENERAL_PROVIDERS as ALL_PROVIDERS } from "@/data/allProvidersData";
import { Link } from "wouter";

// Mock marketplace items
const MARKETPLACE_ITEMS = [
  {
    id: "m-1",
    title: "Apple MacBook Pro 16 M2 Max (32GB / 1TB SSD)",
    category: "Elektronika",
    price: 849000,
    originalPrice: 920000,
    location: "Debrecen",
    image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600",
    url: "/marketplace"
  },
  {
    id: "m-2",
    title: "Sony PlayStation 5 Slim Digital Edition",
    category: "Konzol & Játék",
    price: 159900,
    originalPrice: 179900,
    location: "Miskolc",
    image: "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=600",
    url: "/marketplace"
  },
  {
    id: "m-3",
    title: "Bosch Professional Akkus Ütvefúró Készlet",
    category: "Szerszám & Barkács",
    price: 64900,
    originalPrice: 79900,
    location: "Miskolc",
    image: "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600",
    url: "/marketplace"
  }
];

// Mock education items
const EDUCATION_ITEMS = [
  {
    id: "ed-1",
    title: "Full-Stack Webfejlesztő & AI Integrációs Kurzus",
    category: "Informatika & AI",
    price: 129000,
    location: "Online képzés",
    image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600",
    url: "/education"
  },
  {
    id: "ed-2",
    title: "Professzionális Klímatelepítő és Karbantartó Képzés",
    category: "Szakmai Képzés",
    price: 185000,
    location: "Miskolc",
    image: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600",
    url: "/education"
  }
];

type ModuleTab = "all" | "marketplace" | "beauty" | "providers" | "realestate" | "vehicles" | "education";

import { SavedSearchConfigModal } from "@/components/shared/SavedSearchConfigModal";

export function UniversalSearch() {
  const [locationPath] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const q = searchParams.get("q") || "";
  const initialCity = searchParams.get("city") || "";

  const [activeTab, setActiveTab] = useState<ModuleTab>("all");
  const [locationState, setLocationState] = useState<LocationSearchState>({
    mode: "city",
    cityInput: initialCity,
    radiusKm: 25,
    customRadiusKm: null,
  });

  const { isFavorite, toggleFavorite } = useFavorites();
  const { addSavedSearch, isSearchSaved } = useSavedSearches();
  const { addToCompare, isInCompare } = useComparison();
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  const normQuery = q.toLowerCase().trim();

  // 1. Marketplace Filter
  const filteredMarketplace = MARKETPLACE_ITEMS.filter((item) => {
    const textMatch = !normQuery || item.title.toLowerCase().includes(normQuery) || item.category.toLowerCase().includes(normQuery);
    const locMatch = applyLocationFilter(item.location, locationState).matches;
    return textMatch && locMatch;
  });

  // 2. Real Estate Filter
  const filteredRealEstate = REAL_ESTATE_ITEMS.filter((item) => {
    const textMatch = !normQuery || item.title.toLowerCase().includes(normQuery) || item.location.toLowerCase().includes(normQuery) || item.type.toLowerCase().includes(normQuery);
    const locMatch = applyLocationFilter(item.location, locationState).matches;
    return textMatch && locMatch;
  });

  // 3. Vehicles Filter
  const filteredVehicles = VEHICLE_ITEMS.filter((item) => {
    const textMatch = !normQuery || item.title.toLowerCase().includes(normQuery) || item.brand.toLowerCase().includes(normQuery) || item.model.toLowerCase().includes(normQuery);
    const locMatch = applyLocationFilter(item.location, locationState).matches;
    return textMatch && locMatch;
  });

  // 4. Providers Filter (Services)
  const filteredProviders = ALL_PROVIDERS.filter((item) => {
    const isBeauty = item.category === "Szépségipar" || item.profession.toLowerCase().includes("kozmetikus") || item.profession.toLowerCase().includes("fodrász");
    if (isBeauty) return false;
    const textMatch = !normQuery || item.name.toLowerCase().includes(normQuery) || item.profession.toLowerCase().includes(normQuery) || item.category.toLowerCase().includes(normQuery);
    const locMatch = applyLocationFilter(item.city, locationState).matches;
    return textMatch && locMatch;
  });

  // 5. Beauty Filter
  const filteredBeauty = ALL_PROVIDERS.filter((item) => {
    const isBeauty = item.category === "Szépségipar" || item.profession.toLowerCase().includes("kozmetikus") || item.profession.toLowerCase().includes("fodrász");
    if (!isBeauty) return false;
    const textMatch = !normQuery || item.name.toLowerCase().includes(normQuery) || item.profession.toLowerCase().includes(normQuery);
    const locMatch = applyLocationFilter(item.city, locationState).matches;
    return textMatch && locMatch;
  });

  // 6. Education Filter
  const filteredEducation = EDUCATION_ITEMS.filter((item) => {
    const textMatch = !normQuery || item.title.toLowerCase().includes(normQuery) || item.category.toLowerCase().includes(normQuery);
    const locMatch = item.location === "Online képzés" || applyLocationFilter(item.location, locationState).matches;
    return textMatch && locMatch;
  });

  const totalResults =
    filteredMarketplace.length +
    filteredRealEstate.length +
    filteredVehicles.length +
    filteredProviders.length +
    filteredBeauty.length +
    filteredEducation.length;

  const handleSaveSearch = () => {
    const title = `${q ? `"${q}"` : "Keresés"} ${locationState.cityInput ? `(${locationState.cityInput})` : ""}`.trim();
    addSavedSearch({
      title: title || "Univerzális Keresés",
      module: "universal",
      query: q,
      location: locationState.cityInput,
      radiusKm: locationState.radiusKm,
      filtersSummary: `Univerzális Keresés · ${q ? `"${q}"` : "Összes kategória"} · ${locationState.cityInput || "Országos"}`,
      url: window.location.search ? `/universal-search${window.location.search}` : "/universal-search",
      notifyWeb: true,
      notifyEmail: true,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 md:px-6">
      <div className="max-w-[1280px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
              <Sparkles className="w-7 h-7 text-emerald-600" />
              <span>Univerzális Platform Kereső</span>
            </h1>
            <p className="text-xs md:text-sm font-semibold text-slate-500 mt-1">
              Keresés egyszerre mind a 6 modulban · {totalResults} találat
            </p>
          </div>

          {/* Save Search & Config Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsConfigModalOpen(true)}
              className="px-4 py-2.5 rounded-xl font-extrabold text-xs md:text-sm flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition cursor-pointer"
            >
              <BookmarkPlus className="w-4 h-4" /> 🔔 Hirdetésfigyelő Beállítása
            </button>
          </div>
        </div>

        <SavedSearchConfigModal
          isOpen={isConfigModalOpen}
          onClose={() => setIsConfigModalOpen(false)}
          defaultQuery={q}
          defaultLocation={locationState.cityInput}
          defaultModule="universal"
        />

        {/* Search Bar */}
        <UniversalSearchBar initialQuery={q} initialCity={initialCity} />

        {/* Main Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar location filter */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
              <LocationSearchWidget
                value={locationState}
                onChange={setLocationState}
                accentColor="emerald"
                compact={true}
                label="Helyszín szűrés"
              />
            </div>
          </div>

          {/* Results Area */}
          <div className="lg:col-span-3 space-y-6">
            {/* Category Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
              {[
                { id: "all", label: `Összes (${totalResults})`, icon: Sparkles },
                { id: "marketplace", label: `Piactér (${filteredMarketplace.length})`, icon: Store },
                { id: "beauty", label: `Szépségipar (${filteredBeauty.length})`, icon: Sparkles },
                { id: "providers", label: `Szolgáltatók (${filteredProviders.length})`, icon: Wrench },
                { id: "realestate", label: `Ingatlanok (${filteredRealEstate.length})`, icon: Home },
                { id: "vehicles", label: `Járművek (${filteredVehicles.length})`, icon: Car },
                { id: "education", label: `Oktatás (${filteredEducation.length})`, icon: GraduationCap },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as ModuleTab)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition shrink-0 cursor-pointer ${
                      isActive
                        ? "bg-emerald-600 text-white shadow-md"
                        : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Results Grid / Groups */}
            {totalResults === 0 ? (
              <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
                <Sparkles className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="text-base font-black text-slate-800 dark:text-white">
                  Nincs találat a megadott feltételekkel
                </h3>
                <p className="text-xs font-semibold text-slate-500 max-w-sm mx-auto">
                  Próbáld meg bővíteni a keresési távolságot vagy megváltoztatni a keresett kulcsszót.
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {/* 1. Szolgáltatók & Szépségipar */}
                {(activeTab === "all" || activeTab === "beauty" || activeTab === "providers") && (
                  <>
                    {filteredBeauty.length > 0 && (activeTab === "all" || activeTab === "beauty") && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-emerald-600" />
                            <span>Szépségipari szakemberek & Szalonok</span>
                          </h3>
                          <span className="text-xs font-bold text-slate-400">{filteredBeauty.length} találat</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {filteredBeauty.slice(0, 4).map((item) => (
                            <div key={item.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex gap-3">
                              <img src={item.avatar} alt={item.name} className="w-16 h-16 rounded-xl object-cover shrink-0" />
                              <div className="flex-1 space-y-1 min-w-0">
                                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white truncate">{item.name}</h4>
                                <p className="text-xs font-semibold text-slate-500 truncate">{item.profession}</p>
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-600 pt-1">
                                  <span>📍 {item.city}</span>
                                  <span>⭐ {item.rating}</span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => toggleFavorite({ id: item.id, type: "beauty", title: item.name, subtitle: item.profession, location: item.city, image: item.avatar, rating: item.rating, url: "/beauty" })}
                                className={`p-2 rounded-xl h-fit border transition ${isFavorite(item.id, "beauty") ? "bg-rose-50 border-rose-300 text-rose-600" : "border-slate-200 text-slate-400 hover:text-slate-600"}`}
                              >
                                <Heart className={`w-4 h-4 ${isFavorite(item.id, "beauty") ? "fill-rose-600" : ""}`} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {filteredProviders.length > 0 && (activeTab === "all" || activeTab === "providers") && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <Wrench className="w-4 h-4 text-emerald-600" />
                            <span>Szolgáltatók & Szakemberek</span>
                          </h3>
                          <span className="text-xs font-bold text-slate-400">{filteredProviders.length} találat</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {filteredProviders.slice(0, 4).map((item) => (
                            <div key={item.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex gap-3">
                              <img src={item.avatar} alt={item.name} className="w-16 h-16 rounded-xl object-cover shrink-0" />
                              <div className="flex-1 space-y-1 min-w-0">
                                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white truncate">{item.name}</h4>
                                <p className="text-xs font-semibold text-slate-500 truncate">{item.profession}</p>
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-600 pt-1">
                                  <span>📍 {item.city}</span>
                                  <span>⭐ {item.rating}</span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => toggleFavorite({ id: item.id, type: "providers", title: item.name, subtitle: item.profession, location: item.city, image: item.avatar, rating: item.rating, url: "/providers" })}
                                className={`p-2 rounded-xl h-fit border transition ${isFavorite(item.id, "providers") ? "bg-rose-50 border-rose-300 text-rose-600" : "border-slate-200 text-slate-400 hover:text-slate-600"}`}
                              >
                                <Heart className={`w-4 h-4 ${isFavorite(item.id, "providers") ? "fill-rose-600" : ""}`} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* 2. Ingatlanok */}
                {(activeTab === "all" || activeTab === "realestate") && filteredRealEstate.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <Home className="w-4 h-4 text-emerald-600" />
                        <span>Ingatlanok</span>
                      </h3>
                      <span className="text-xs font-bold text-slate-400">{filteredRealEstate.length} találat</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredRealEstate.slice(0, 4).map((item) => (
                        <div key={item.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs space-y-2 p-3 flex gap-3">
                          <img src={item.image} alt={item.title} className="w-24 h-24 rounded-xl object-cover shrink-0" />
                          <div className="flex-1 space-y-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black text-emerald-600">{item.price}</span>
                            </div>
                            <h4 className="font-extrabold text-xs md:text-sm text-slate-900 dark:text-white line-clamp-1">{item.title}</h4>
                            <p className="text-[11px] font-semibold text-slate-500">📍 {item.location} · {item.area} m²</p>
                            <div className="flex items-center gap-2 pt-1">
                              <Link
                                href={`/real-estate?id=${item.id}`}
                                className="text-[10px] font-extrabold px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition"
                              >
                                Megtekintés ➔
                              </Link>
                              <button
                                type="button"
                                onClick={() => addToCompare({ id: item.id, module: "realestate", title: item.title, subtitle: `${item.area} m² · ${item.rooms} szoba`, image: item.image, url: "/real-estate", specs: { price: item.priceNum, pricePerSqm: Math.round(item.priceNum / item.area), areaSqm: item.area, rooms: String(item.rooms), condition: "Nincs megadva", location: item.location, energyRating: "Nincs megadva", heating: "Nincs megadva", elevator: false, balcony: false } })}
                                className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition ${isInCompare(item.id) ? "bg-emerald-600 text-white border-transparent" : "border-slate-300 text-slate-600 hover:bg-slate-100"}`}
                              >
                                <Layers className="w-3 h-3 inline mr-1" />
                                {isInCompare(item.id) ? "Összehasonlítva" : "+ Összehasonlítás"}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Járművek */}
                {(activeTab === "all" || activeTab === "vehicles") && filteredVehicles.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <Car className="w-4 h-4 text-emerald-600" />
                        <span>Járművek</span>
                      </h3>
                      <span className="text-xs font-bold text-slate-400">{filteredVehicles.length} találat</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredVehicles.slice(0, 4).map((item) => (
                        <div key={item.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs p-3 flex gap-3">
                          <img src={item.image} alt={item.title} className="w-24 h-24 rounded-xl object-cover shrink-0" />
                          <div className="flex-1 space-y-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black text-emerald-600">{item.price.toLocaleString("hu-HU")} Ft</span>
                              {item.originalPrice && item.originalPrice > item.price && (
                                <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">
                                  🔥 Árcsökkenés
                                </span>
                              )}
                            </div>
                            <h4 className="font-extrabold text-xs md:text-sm text-slate-900 dark:text-white line-clamp-1">{item.title}</h4>
                            <p className="text-[11px] font-semibold text-slate-500">{item.year} · {item.mileageKm.toLocaleString("hu-HU")} km · {item.fuel}</p>
                            <div className="flex items-center gap-2 pt-1">
                              <Link
                                href={`/vehicles?id=${item.id}`}
                                className="text-[10px] font-extrabold px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition"
                              >
                                Megtekintés ➔
                              </Link>
                              <button
                                type="button"
                                onClick={() => addToCompare({ id: item.id, module: "vehicles", title: item.title, subtitle: `${item.year} · ${item.mileageKm} km`, image: item.image, url: "/vehicles", specs: { price: item.price, year: item.year, mileageKm: item.mileageKm, engine: item.engine, powerHp: item.powerHp, fuel: item.fuel, transmission: item.transmission, color: item.color, warranty: item.warranty } })}
                                className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition ${isInCompare(item.id) ? "bg-emerald-600 text-white border-transparent" : "border-slate-300 text-slate-600 hover:bg-slate-100"}`}
                              >
                                <Layers className="w-3 h-3 inline mr-1" />
                                {isInCompare(item.id) ? "Összehasonlítva" : "+ Összehasonlítás"}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useSavedSearches } from "@/context/SavedSearchesContext";
import { useNotifications } from "@/context/NotificationsContext";
import {
  BookmarkPlus,
  Bell,
  Trash2,
  ExternalLink,
  Check,
  Mail,
  Smartphone,
  Globe,
  Plus,
  X,
  Search,
  Sparkles,
  Filter,
  SlidersHorizontal,
  MapPin,
  Tag,
  DollarSign,
  Building,
  Car,
  Store,
  Wrench,
  GraduationCap,
  Info
} from "lucide-react";
import { REAL_ESTATE_ITEMS } from "@/pages/RealEstate";
import { VEHICLE_ITEMS } from "@/pages/Vehicles";
import { DEMO_GENERAL_PROVIDERS as ALL_PROVIDERS } from "@/data/allProvidersData";
import { Badge } from "@/components/ui/badge";

// Mock marketplace items for search preview
const MARKETPLACE_ITEMS = [
  {
    id: "m-1",
    title: "Apple MacBook Pro 16 M2 Max (32GB / 1TB SSD)",
    category: "Elektronika",
    price: 849000,
    location: "Debrecen",
    image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600",
    module: "marketplace",
    moduleLabel: "Piactér"
  },
  {
    id: "m-2",
    title: "Sony PlayStation 5 Slim Digital Edition",
    category: "Konzol & Játék",
    price: 159900,
    location: "Miskolc",
    image: "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=600",
    module: "marketplace",
    moduleLabel: "Piactér"
  },
  {
    id: "m-3",
    title: "Bosch Professional Akkus Ütvefúró Készlet",
    category: "Szerszám & Barkács",
    price: 64900,
    location: "Miskolc",
    image: "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600",
    module: "marketplace",
    moduleLabel: "Piactér"
  }
];

// Mock education items for search preview
const EDUCATION_ITEMS = [
  {
    id: "ed-1",
    title: "Full-Stack Webfejlesztő & AI Integrációs Kurzus",
    category: "Informatika & AI",
    price: 129000,
    location: "Online képzés",
    image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600",
    module: "education",
    moduleLabel: "Oktatás"
  },
  {
    id: "ed-2",
    title: "Professzionális Klímatelepítő és Karbantartó Képzés",
    category: "Szakmai Képzés",
    price: 185000,
    location: "Miskolc",
    image: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600",
    module: "education",
    moduleLabel: "Oktatás"
  }
];

type ModuleType = "universal" | "marketplace" | "realestate" | "vehicles" | "beauty" | "providers" | "education";

export function Hirdetesfigyelo() {
  const { savedSearches, removeSavedSearch, toggleNotification, addSavedSearch } = useSavedSearches();
  const { settings, updateSettings } = useNotifications();

  // New Watcher Form States
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [selectedModule, setSelectedModule] = useState<ModuleType>("universal");
  const [newQuery, setNewQuery] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [radiusKm, setRadiusKm] = useState<number>(25);
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [onlyVerified, setOnlyVerified] = useState(false);

  // Live query execution trigger state
  const [isSearching, setIsSearching] = useState(false);

  // Combine all items for live exact matching search preview
  const allPreviewItems = useMemo(() => {
    return [
      ...MARKETPLACE_ITEMS.map((i) => ({
        id: i.id,
        title: i.title,
        price: i.price,
        location: i.location,
        image: i.image,
        module: "marketplace",
        moduleLabel: "Piactér",
        url: `/universal-search?q=${encodeURIComponent(i.title)}`
      })),
      ...REAL_ESTATE_ITEMS.map((i) => ({
        id: i.id,
        title: i.title,
        price: i.priceNum,
        location: i.location,
        image: i.image,
        module: "realestate",
        moduleLabel: "Ingatlan",
        url: `/real-estate?city=${encodeURIComponent(i.location)}`
      })),
      ...VEHICLE_ITEMS.map((i) => ({
        id: i.id,
        title: i.title,
        price: i.priceNum,
        location: i.location,
        image: i.image,
        module: "vehicles",
        moduleLabel: "Jármű",
        url: `/vehicles?city=${encodeURIComponent(i.location)}`
      })),
      ...ALL_PROVIDERS.map((i) => {
        const isBeauty = i.category === "Szépségipar" || i.profession.toLowerCase().includes("kozmetikus") || i.profession.toLowerCase().includes("fodrász");
        return {
          id: i.id,
          title: `${i.name} - ${i.profession}`,
          price: i.startingPrice || 0,
          location: i.city,
          image: i.avatar,
          module: isBeauty ? "beauty" : "providers",
          moduleLabel: isBeauty ? "Szépségipar" : "Szolgáltatás",
          url: isBeauty ? `/beauty/${i.id}` : `/providers`
        };
      }),
      ...EDUCATION_ITEMS.map((i) => ({
        id: i.id,
        title: i.title,
        price: i.price,
        location: i.location,
        image: i.image,
        module: "education",
        moduleLabel: "Oktatás",
        url: `/education`
      }))
    ];
  }, []);

  // Compute live matching items based on selected filters
  const matchingResults = useMemo(() => {
    const normQ = newQuery.toLowerCase().trim();
    const normL = newLocation.toLowerCase().trim();
    const minP = minPrice ? parseInt(minPrice, 10) : null;
    const maxP = maxPrice ? parseInt(maxPrice, 10) : null;

    return allPreviewItems.filter((item) => {
      // Module filter
      if (selectedModule !== "universal" && item.module !== selectedModule) return false;

      // Keyword query filter
      if (normQ) {
        const matchesTitle = item.title.toLowerCase().includes(normQ);
        const matchesModule = item.moduleLabel.toLowerCase().includes(normQ);
        if (!matchesTitle && !matchesModule) return false;
      }

      // Location filter
      if (normL) {
        const matchesLoc = item.location.toLowerCase().includes(normL);
        if (!matchesLoc) return false;
      }

      // Price filters
      if (minP !== null && !isNaN(minP) && item.price > 0 && item.price < minP) return false;
      if (maxP !== null && !isNaN(maxP) && item.price > 0 && item.price > maxP) return false;

      return true;
    });
  }, [allPreviewItems, selectedModule, newQuery, newLocation, minPrice, maxPrice]);

  const handleTestSearch = () => {
    setIsSearching(true);
    setTimeout(() => {
      setIsSearching(false);
    }, 300);
  };

  const handleCreateSearch = () => {
    const titleToSave = newTitle.trim() || newQuery.trim() || `${selectedModule.toUpperCase()} Figyelő`;
    if (!titleToSave) return;

    const priceSummary = minPrice || maxPrice 
      ? ` Ár: ${minPrice ? minPrice + ' Ft-tól' : ''}${maxPrice ? ' ' + maxPrice + ' Ft-ig' : ''}` 
      : '';

    const summaryStr = `Modul: ${selectedModule.toUpperCase()} · Keresés: "${newQuery || titleToSave}" · ${newLocation ? `${newLocation} (+${radiusKm} km)` : "Országos"}${priceSummary}`;

    addSavedSearch({
      title: titleToSave,
      module: selectedModule,
      query: newQuery,
      location: newLocation,
      radiusKm: radiusKm,
      minPrice: minPrice ? parseInt(minPrice, 10) : undefined,
      maxPrice: maxPrice ? parseInt(maxPrice, 10) : undefined,
      filtersSummary: summaryStr,
      url: `/universal-search?q=${encodeURIComponent(newQuery || titleToSave)}&city=${encodeURIComponent(newLocation)}`,
      notifyWeb: true,
      notifyEmail: true,
    });

    // Reset form
    setNewTitle("");
    setNewQuery("");
    setNewLocation("");
    setMinPrice("");
    setMaxPrice("");
    setShowNew(false);
  };

  const moduleOptions = [
    { id: "universal", label: "🌐 Összes modul", icon: Globe },
    { id: "marketplace", label: "🛒 Piactér", icon: Store },
    { id: "realestate", label: "🏠 Ingatlanok", icon: Building },
    { id: "vehicles", label: "🚗 Járművek", icon: Car },
    { id: "beauty", label: "✨ Szépségipar", icon: Sparkles },
    { id: "providers", label: "🔧 Szolgáltatások", icon: Wrench },
    { id: "education", label: "🎓 Oktatás", icon: GraduationCap },
  ];

  return (
    <div className="container mx-auto px-4 md:px-6 py-8 max-w-[1050px] space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <BookmarkPlus className="w-7 h-7 text-emerald-600" />
            <span>Mentett Keresések & Hirdetésfigyelő</span>
          </h1>
          <p className="text-xs md:text-sm font-semibold text-slate-500 mt-1">
            Intelligens értesítések új ingatlanokról, autókról, szolgáltatásokról és árcsökkenésekről
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowNew(!showNew)}
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center justify-center gap-2 shadow-md transition cursor-pointer self-start sm:self-auto"
        >
          {showNew ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          <span>{showNew ? "Bezárás" : "Új figyelő hozzáadása"}</span>
        </button>
      </div>

      {/* New Watcher Full Filter & Search Panel */}
      {showNew && (
        <div className="bg-white dark:bg-slate-900 border-2 border-emerald-500/40 rounded-3xl p-6 shadow-xl space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              <span>Új Hirdetésfigyelő Létrehozása & Rászűrés</span>
            </h3>
            <button type="button" onClick={() => setShowNew(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Module Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-emerald-600" />
              <span>1. Válassz modult a szűréshez:</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {moduleOptions.map((mod) => {
                const isActive = selectedModule === mod.id;
                return (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => setSelectedModule(mod.id as ModuleType)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition border ${
                      isActive
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {mod.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filter Parameters Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Figyelő megnevezése (Megnevezés)
              </label>
              <input
                type="text"
                placeholder="pl. Miskolci téglalakás"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 border rounded-xl text-xs font-bold bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1 flex items-center justify-between">
                <span>Keresőszó / Kifejezés</span>
                <Search className="w-3.5 h-3.5 text-emerald-600" />
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="pl. téglalakás, BMW, kozmetikus"
                  value={newQuery}
                  onChange={(e) => setNewQuery(e.target.value)}
                  className="w-full pl-3.5 pr-10 py-2.5 border rounded-xl text-xs font-bold bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleTestSearch}
                  title="Keresés tesztelése"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition"
                >
                  <Search className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1 flex items-center justify-between">
                <span>Település & Sugár</span>
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="pl. Miskolc, Debrecen"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 border rounded-xl text-xs font-bold bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <select
                  value={radiusKm}
                  onChange={(e) => setRadiusKm(Number(e.target.value))}
                  className="w-24 px-2 py-2.5 border rounded-xl text-xs font-bold bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value={5}>+5 km</option>
                  <option value={10}>+10 km</option>
                  <option value={25}>+25 km</option>
                  <option value={50}>+50 km</option>
                </select>
              </div>
            </div>
          </div>

          {/* Price Filter & Extra Switches */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Minimum Ár (Ft)
              </label>
              <input
                type="number"
                placeholder="pl. 10000000"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="w-full px-3.5 py-2 border rounded-xl text-xs font-semibold bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Maximum Ár (Ft)
              </label>
              <input
                type="number"
                placeholder="pl. 40000000"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="w-full px-3.5 py-2 border rounded-xl text-xs font-semibold bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-end pb-1">
              <button
                type="button"
                onClick={handleTestSearch}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 text-xs font-extrabold flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Search className="w-4 h-4 text-emerald-600" />
                <span>Keresés & Szűrés Futtatása</span>
              </button>
            </div>
          </div>

          {/* Live Exact Matches Preview Panel */}
          <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Search className="w-4 h-4 text-emerald-600" />
                <span>Pontos Találatok Élő Előnézete ({matchingResults.length} db egyező hirdetés)</span>
              </span>
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                {matchingResults.length > 0 ? `${matchingResults.length} találat` : "0 találat jelenleg"}
              </Badge>
            </div>

            {matchingResults.length === 0 ? (
              <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-dashed text-center space-y-1">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Nincs a jelenlegi adatbázisban a szűrőknek pontosan megfelelő elem.
                </p>
                <p className="text-[11px] text-slate-500">
                  A figyelő elmentésével az ILOLIT automatikusan értesít, amint új egyező hirdetés kerül fel!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {matchingResults.slice(0, 6).map((item) => (
                  <div
                    key={item.id}
                    className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-3 shadow-xs"
                  >
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-12 h-12 rounded-lg object-cover border shrink-0"
                    />
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px] font-extrabold">
                        {item.moduleLabel} · {item.location}
                      </Badge>
                      <h4 className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                        {item.title}
                      </h4>
                      <p className="text-xs font-black text-emerald-600">
                        {item.price > 0 ? `${item.price.toLocaleString("hu-HU")} Ft` : "Ár megállapodás szerint"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form Action Buttons */}
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowNew(false)}
              className="px-4 py-2.5 rounded-xl text-xs font-extrabold text-slate-500 hover:bg-slate-100 transition"
            >
              Mégse
            </button>
            <button
              type="button"
              onClick={handleCreateSearch}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-md transition flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Mentés & Figyelés indítása</span>
            </button>
          </div>
        </div>
      )}

      {/* Global Channel Settings */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
          <Bell className="w-4 h-4 text-emerald-600" />
          <span>Értesítési Csatorna Beállítások</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
            <Globe className="w-4 h-4 text-emerald-600 shrink-0" />
            <div className="flex-1">
              <span className="text-xs font-extrabold text-slate-900 dark:text-white block">Webes értesítések</span>
              <span className="text-[10px] text-slate-400">Platformon belüli harang ikon</span>
            </div>
            <input
              type="checkbox"
              checked={settings.webEnabled}
              onChange={(e) => updateSettings({ webEnabled: e.target.checked })}
              className="accent-emerald-600"
            />
          </label>

          <label className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
            <Mail className="w-4 h-4 text-emerald-600 shrink-0" />
            <div className="flex-1">
              <span className="text-xs font-extrabold text-slate-900 dark:text-white block">E-mail értesítések</span>
              <span className="text-[10px] text-slate-400">Napi / azonnali összefoglaló</span>
            </div>
            <input
              type="checkbox"
              checked={settings.emailEnabled}
              onChange={(e) => updateSettings({ emailEnabled: e.target.checked })}
              className="accent-emerald-600"
            />
          </label>

          <label className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
            <Smartphone className="w-4 h-4 text-emerald-600 shrink-0" />
            <div className="flex-1">
              <span className="text-xs font-extrabold text-slate-900 dark:text-white block">Push Notification</span>
              <span className="text-[10px] text-slate-400">Mobil / böngésző pult</span>
            </div>
            <input
              type="checkbox"
              checked={settings.pushEnabled}
              onChange={(e) => updateSettings({ pushEnabled: e.target.checked })}
              className="accent-emerald-600"
            />
          </label>
        </div>
      </div>

      {/* Saved Searches List */}
      <div className="space-y-4">
        <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center justify-between">
          <span>Elmentett Kereséseid ({savedSearches.length})</span>
        </h2>

        {savedSearches.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
            <BookmarkPlus className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-black text-slate-800 dark:text-white">Még nincs mentett keresésed</h3>
            <p className="text-xs font-semibold text-slate-500">
              Kattints az "Új figyelő hozzáadása" gombra a szűrések elmentéséhez!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {savedSearches.map((s) => (
              <div
                key={s.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs md:text-sm font-black text-slate-900 dark:text-white">
                      {s.title}
                    </span>
                    {s.matchCount && (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                        {s.matchCount} új találat
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-slate-500">
                    {s.filtersSummary}
                  </p>
                  <span className="text-[10px] text-slate-400 block pt-0.5">
                    Elmentve: {new Date(s.savedAt).toLocaleDateString("hu-HU")}
                  </span>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-2 border-r border-slate-200 dark:border-slate-800 pr-3">
                    <button
                      type="button"
                      onClick={() => toggleNotification(s.id, "notifyWeb")}
                      className={`text-[10px] font-extrabold px-2.5 py-1 rounded-lg border transition ${
                        s.notifyWeb
                          ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                          : "border-slate-200 text-slate-400"
                      }`}
                    >
                      🌐 Web {s.notifyWeb ? "BE" : "KI"}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleNotification(s.id, "notifyEmail")}
                      className={`text-[10px] font-extrabold px-2.5 py-1 rounded-lg border transition ${
                        s.notifyEmail
                          ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                          : "border-slate-200 text-slate-400"
                      }`}
                    >
                      ✉️ E-mail {s.notifyEmail ? "BE" : "KI"}
                    </button>
                  </div>

                  <Link
                    href={s.url}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-extrabold hover:bg-emerald-700 transition flex items-center gap-1"
                  >
                    <span>Futtatás</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>

                  <button
                    type="button"
                    onClick={() => removeSavedSearch(s.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 transition"
                    title="Törlés"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

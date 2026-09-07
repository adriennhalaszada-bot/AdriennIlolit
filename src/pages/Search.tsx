import { useState, useMemo } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { CategoryBrowser } from "@/components/shared/CategoryBrowser";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search as SearchIcon,
  SlidersHorizontal,
  MapPin,
  Tag,
  RotateCcw,
  Layers,
  ChevronRight,
  PlusCircle,
  X,
  Store,
  User,
  ShieldCheck,
  Truck,
  CheckCircle2,
  PackageCheck
} from "lucide-react";
import { formatPrice } from "@/lib/constants";
import { calculateSafetyFee } from "@/lib/feeCalculator";

export interface MarketplaceItem {
  id: string;
  title: string;
  categorySlug: string;
  categoryName: string;
  price: number;
  originalPrice?: number;
  listingType: "DIRECT" | "AUCTION" | "NEGOTIABLE";
  listingTypeLabel: string;
  condition: "new" | "like_new" | "good" | "used";
  conditionLabel: string;
  brand: string;
  location: string;
  image: string;
  seller: string;
  sellerType: "BUSINESS" | "PRIVATE";
  shopId?: string;
  taxNumber?: string;
  regNumber?: string;
  warranty?: string;
  shippingTime?: string;
  stockCount?: number;
  sellerRating: number;
  sellerReviewsCount: number;
  description: string;
  bidsCount?: number;
  currentBid?: number;
  auctionEndsAt?: string;
  createdAt: string;
}

export const MOCK_MARKETPLACE_ITEMS: MarketplaceItem[] = [
  // 1. Merchant Item: Tefal Botmixer from GastroHome Kft.
  {
    id: "item-tefal-1",
    title: "Tefal InfinyForce Pro 1000W 4in1 Botmixer Szett (Aprító + Habverő)",
    categorySlug: "elektronika",
    categoryName: "Elektronika",
    price: 22990,
    listingType: "DIRECT",
    listingTypeLabel: "Fix áras",
    condition: "new",
    conditionLabel: "Új (Bontatlan)",
    brand: "Tefal",
    location: "Budapest (GastroHome Kft.)",
    image: "https://images.unsplash.com/photo-1578643463396-0997cb5328c1?w=800&auto=format&fit=crop&q=60",
    seller: "GastroHome & Kitchen Kft.",
    sellerType: "BUSINESS",
    shopId: "gastro-home",
    taxNumber: "23456789-2-41",
    regNumber: "Cg.01-09-345678",
    warranty: "24 hónap gyári garancia",
    shippingTime: "1-2 munkanap DPD",
    stockCount: 8,
    sellerRating: 4.8,
    sellerReviewsCount: 89,
    description: "Hivatalos forgalmazótól származó Tefal 1000W botmixer szett aprítóval, habverővel és mérőpohárral. 24 hónap gyári garanciával.",
    createdAt: "2026-08-28"
  },

  // 2. Merchant Item: Sony Headphone from FoxTech Electronics
  {
    id: "item-sony-fox",
    title: "Sony WH-1000XM5 Vezeték Nélküli Zajszűrős Fejhallgató",
    categorySlug: "elektronika",
    categoryName: "Elektronika",
    price: 129900,
    originalPrice: 149900,
    listingType: "DIRECT",
    listingTypeLabel: "Fix áras",
    condition: "new",
    conditionLabel: "Új (Gyári bontatlan)",
    brand: "Sony",
    location: "Budapest (FoxTech Kft.)",
    image: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&auto=format&fit=crop&q=60",
    seller: "FoxTech Premium Electronics Kft.",
    sellerType: "BUSINESS",
    shopId: "biz-fox-tech",
    taxNumber: "12345678-2-42",
    regNumber: "Cg.01-09-987654",
    warranty: "24 hónap Sony garancia",
    shippingTime: "1 munkanap GLS",
    stockCount: 5,
    sellerRating: 4.9,
    sellerReviewsCount: 142,
    description: "Prémium zajszűrős fejhallgató 30 órás akkumulátor üzemidővel, gyorstöltéssel és hi-res hangzással. Eredeti számlával.",
    createdAt: "2026-08-27"
  },

  // 3. Merchant Item: Dyson Airwrap from BeautyCare Store
  {
    id: "item-dyson-1",
    title: "Dyson Airwrap Complete Long Hajformázó (Nickle/Copper)",
    categorySlug: "otthon-kert",
    categoryName: "Otthon & Kert",
    price: 189900,
    listingType: "DIRECT",
    listingTypeLabel: "Fix áras",
    condition: "new",
    conditionLabel: "Új (Dyson Garanciás)",
    brand: "Dyson",
    location: "Debrecen (BeautyCare Kft.)",
    image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=60",
    seller: "BeautyCare & Luxury Store Kft.",
    sellerType: "BUSINESS",
    shopId: "beauty-care",
    taxNumber: "56789012-2-05",
    regNumber: "Cg.03-09-567123",
    warranty: "24 hónap Dyson garancia",
    shippingTime: "1 munkanap GLS",
    stockCount: 2,
    sellerRating: 5.0,
    sellerReviewsCount: 64,
    description: "Hivatalos importőri garanciával rendelkező Dyson Airwrap Complete Long hajformázó szett.",
    createdAt: "2026-08-28"
  },

  // 4. Private Seller Item: iPhone 15 Pro Max
  {
    id: "item-1",
    title: "Apple iPhone 15 Pro Max 256GB - Titánkék",
    categorySlug: "elektronika",
    categoryName: "Elektronika",
    price: 449000,
    originalPrice: 519000,
    listingType: "DIRECT",
    listingTypeLabel: "Fix áras",
    condition: "like_new",
    conditionLabel: "Újszerű",
    brand: "Apple",
    location: "Budapest, V. kerület",
    image: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&auto=format&fit=crop&q=60",
    seller: "Kovács Dániel",
    sellerType: "PRIVATE",
    sellerRating: 4.9,
    sellerReviewsCount: 38,
    description: "Kifogástalan állapotú iPhone 15 Pro Max 99%-os akkumulátorral. Eredeti dobozával, üvegfóliával és gyári MagSafe tokkal eladó.",
    createdAt: "2026-08-25"
  },

  // 5. Private Seller Item: Jordan 1
  {
    id: "item-2",
    title: "Nike Air Jordan 1 Retro High OG 'Chicago' (43-as)",
    categorySlug: "ferfi-divat",
    categoryName: "Férfi divat",
    price: 78000,
    listingType: "AUCTION",
    listingTypeLabel: "Lolit Licit",
    condition: "new",
    conditionLabel: "Új (Címkés)",
    brand: "Nike",
    location: "Debrecen",
    image: "https://images.unsplash.com/photo-1552346154-21d32810aba3?w=800&auto=format&fit=crop&q=60",
    seller: "Szabó Péter",
    sellerType: "PRIVATE",
    sellerRating: 5.0,
    sellerReviewsCount: 112,
    description: "Ritka gyűjtői darab! Eredeti Nike Air Jordan 1 Chicago színállásban, bontatlan gyári dobozában, dupla fűzővel.",
    bidsCount: 14,
    currentBid: 78000,
    auctionEndsAt: "Ma 21:00",
    createdAt: "2026-08-24"
  },

  // 6. Private Seller Item: Bőrdzseki
  {
    id: "item-3",
    title: "Vintage Olasz Bőrdzseki - Barna Marhabőr (M-es)",
    categorySlug: "noi-divat",
    categoryName: "Női divat",
    price: 34900,
    originalPrice: 65000,
    listingType: "NEGOTIABLE",
    listingTypeLabel: "Lolit Deal (Alkudható)",
    condition: "good",
    conditionLabel: "Jó állapotú",
    brand: "Vintage Italy",
    location: "Székesfehérvár",
    image: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&auto=format&fit=crop&q=60",
    seller: "Nagy Zsófia",
    sellerType: "PRIVATE",
    sellerRating: 4.8,
    sellerReviewsCount: 24,
    description: "Eredeti olasz marhabőr dzseki gyönyörű patinával. Puha selyembéléssel, robusztus cipzárral. Mérete M-es.",
    createdAt: "2026-08-26"
  },

  // 7. Merchant Item: ElectroShop Botmixer option
  {
    id: "item-tefal-electro",
    title: "Tefal QuickChef 800W 3in1 Rozsdamentes Acél Botmixer",
    categorySlug: "elektronika",
    categoryName: "Elektronika",
    price: 19990,
    listingType: "DIRECT",
    listingTypeLabel: "Fix áras",
    condition: "new",
    conditionLabel: "Új termék",
    brand: "Tefal",
    location: "Győr (ElectroShop Kft.)",
    image: "https://images.unsplash.com/photo-1578643463396-0997cb5328c1?w=800&auto=format&fit=crop&q=60",
    seller: "ElectroShop Pro Hungary Kft.",
    sellerType: "BUSINESS",
    shopId: "electro-shop",
    taxNumber: "34567890-2-13",
    regNumber: "Cg.06-09-123987",
    warranty: "24 hónap garancia",
    shippingTime: "24 órás szállítás MPL",
    stockCount: 4,
    sellerRating: 4.7,
    sellerReviewsCount: 215,
    description: "Erős 800W motorral szerelt rozsdamentes acél botmixer.",
    createdAt: "2026-08-27"
  },

  // 8. Private Seller Item: Rolex
  {
    id: "item-6",
    title: "Rolex Submariner Date 41mm (126610LN) - 2024 Garancia",
    categorySlug: "ora-ekszer",
    categoryName: "Óra & Ékszer",
    price: 4950000,
    listingType: "NEGOTIABLE",
    listingTypeLabel: "Lolit Deal",
    condition: "like_new",
    conditionLabel: "Újszerű",
    brand: "Rolex",
    location: "Budapest, III. kerület",
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=60",
    seller: "LuxuryWatch Club (Magánszemély)",
    sellerType: "PRIVATE",
    sellerRating: 5.0,
    sellerReviewsCount: 156,
    description: "Eredeti Rolex Submariner Date teljes szettel (Full Set: doboz, kártya, fityegő, pótszemek). Hivatalos magyar márkaszervizben ellenőrizhető.",
    createdAt: "2026-08-20"
  }
];

export function Search() {
  const [searchParams] = useState(() => new URLSearchParams(window.location.search));

  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [categorySlug, setCategorySlug] = useState(searchParams.get("categorySlug") || "all");
  const [conditionFilter, setConditionFilter] = useState(searchParams.get("condition") || "all");
  const [listingTypeFilter, setListingTypeFilter] = useState(searchParams.get("listingType") || "all");
  const [locationFilter, setLocationFilter] = useState("all");

  // SELLER TYPE & MERCHANT FILTER
  const [sellerTypeFilter, setSellerTypeFilter] = useState<"all" | "BUSINESS" | "PRIVATE">("all");
  const [merchantShopFilter, setMerchantShopFilter] = useState<string>("all");

  const [showCategoryTree, setShowCategoryTree] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MarketplaceItem | null>(null);

  // Clean Categories list
  const quickCategories = [
    { slug: "all", label: "Összes kategória", icon: "🛒" },
    { slug: "ingatlanok", label: "Ingatlanok", icon: "🏡" },
    { slug: "jarmuvek", label: "Járművek", icon: "🚗" },
    { slug: "oktatas", label: "ILOLIT Oktatás", icon: "🎓" },
    { slug: "elektronika", label: "Elektronika", icon: "📱" },
    { slug: "noi-divat", label: "Női divat", icon: "👗" },
    { slug: "ferfi-divat", label: "Férfi divat", icon: "👔" },
    { slug: "ora-ekszer", label: "Óra & Ékszer", icon: "⌚" },
    { slug: "otthon-kert", label: "Otthon & Kert", icon: "🏠" },
    { slug: "sport", label: "Sport & Szabadidő", icon: "⚽" },
    { slug: "gyerek", label: "Játék & Gyerek", icon: "🧸" },
  ];

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery("");
    setCategorySlug("all");
    setConditionFilter("all");
    setListingTypeFilter("all");
    setLocationFilter("all");
    setSellerTypeFilter("all");
    setMerchantShopFilter("all");
  };

  // Filter items
  const filteredItems = useMemo(() => {
    return MOCK_MARKETPLACE_ITEMS.filter((item) => {
      const matchesSearch =
        searchQuery === "" ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.seller.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        categorySlug === "all" ||
        item.categorySlug.toLowerCase() === categorySlug.toLowerCase();

      const matchesCondition =
        conditionFilter === "all" || item.condition === conditionFilter;

      const matchesListingType =
        listingTypeFilter === "all" || item.listingType === listingTypeFilter;

      const matchesLocation =
        locationFilter === "all" ||
        item.location.toLowerCase().includes(locationFilter.toLowerCase());

      const matchesSellerType =
        sellerTypeFilter === "all" || item.sellerType === sellerTypeFilter;

      const matchesMerchantShop =
        merchantShopFilter === "all" || item.shopId === merchantShopFilter;

      return (
        matchesSearch &&
        matchesCategory &&
        matchesCondition &&
        matchesListingType &&
        matchesLocation &&
        matchesSellerType &&
        matchesMerchantShop
      );
    });
  }, [
    searchQuery,
    categorySlug,
    conditionFilter,
    listingTypeFilter,
    locationFilter,
    sellerTypeFilter,
    merchantShopFilter
  ]);

  return (
    <Layout>
      {/* 1. Clear Hero Banner */}
      <section className="bg-gradient-to-r from-slate-900 via-purple-950 to-indigo-950 text-white py-10 px-4 border-b border-slate-800">
        <div className="container mx-auto max-w-5xl text-center space-y-4">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">
            ILOLIT Prémium Piactér
          </h1>
          <p className="text-sm md:text-base text-purple-100 font-medium leading-relaxed max-w-3xl mx-auto">
            Fedezd fel a legjobb ajánlatokat használt és új termékekre egyaránt – divatcikkek, elektronika, luxustermékek és sok más kategória várja, hogy megtaláld benne a következő kedvencedet.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-left max-w-3xl mx-auto">
            <div className="bg-purple-900/40 border border-purple-700/50 p-4 rounded-2xl space-y-2 backdrop-blur flex flex-col justify-between">
              <div className="space-y-1">
                <div className="font-extrabold text-xs text-emerald-400">
                  🛍️ Magánszemélyként eladnál?
                </div>
                <p className="text-xs text-purple-200 font-medium leading-normal">
                  Neked is van felesleges tárgyad otthon? Add fel ingyenesen a hirdetésed, és add el egyszerűen – vásárlói védelmünkkel mindig biztonságosan adhatsz-vehetsz az ILOLIT piactéren.
                </p>
              </div>
              <div className="pt-2">
                <Button asChild className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs py-2.5 rounded-xl shadow-md transition">
                  <Link href="/sell">
                    <PlusCircle className="w-4 h-4 text-slate-950 mr-1.5" />
                    INGYENES HIRDETÉSFELADÁS (ELADÁS)
                  </Link>
                </Button>
              </div>
            </div>

            <div className="bg-indigo-900/40 border border-indigo-700/50 p-4 rounded-2xl space-y-2 backdrop-blur flex flex-col justify-between">
              <div className="space-y-1">
                <div className="font-extrabold text-xs text-indigo-300">
                  🏪 Vállalkozó vagy? Add el nálunk a termékedet!
                </div>
                <p className="text-xs text-purple-200 font-medium leading-normal">
                  Terméket árulsz? Regisztrálj kereskedőként nálunk, és kínáld termékeidet vásárlóinknak egy megbízható és egyszerűen kezelhető felületen.
                </p>
              </div>
              <div className="pt-2">
                <Button
                  asChild
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs py-2.5 rounded-xl shadow-md transition"
                >
                  <Link href="/provider/register">
                    <Store className="w-4 h-4 mr-1.5" />
                    Regisztrálj vállalkozóként
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Category Navigation Bar */}
      <section className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 shadow-sm py-3 px-4">
        <div className="container mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
            {quickCategories.map((cat) => {
              const isActive = categorySlug === cat.slug;
              return (
                <button
                  key={cat.slug}
                  onClick={() => setCategorySlug(cat.slug)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 shrink-0 ${
                    isActive
                      ? "bg-emerald-600 text-white font-bold"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCategoryTree(!showCategoryTree)}
            className="text-xs font-semibold rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100 shrink-0"
          >
            <Layers className="w-3.5 h-3.5 mr-1 text-emerald-600" />
            {showCategoryTree ? "Kategóriák elrejtése" : "Böngészés kategóriák szerint"}
          </Button>
        </div>
      </section>

      {/* Collapsible Full Category Tree */}
      {showCategoryTree && (
        <section className="container mx-auto px-4 pt-6 max-w-7xl animate-in fade-in duration-200">
          <CategoryBrowser />
        </section>
      )}

      {/* 3. Main Content Grid (Filters Sidebar + Products Grid) */}
      <section className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          
          {/* Left Sidebar Filter Panel */}
          <div className="lg:col-span-1 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <SlidersHorizontal className="w-4 h-4 text-purple-600" />
                Szűrők
              </h3>
              <button
                onClick={handleResetFilters}
                className="text-[11px] font-bold text-slate-500 hover:text-purple-600 flex items-center gap-1 transition"
              >
                <RotateCcw className="w-3 h-3" />
                Alaphelyzet
              </button>
            </div>

            <div className="space-y-4">
              
              {/* 1. SELLER TYPE FILTER */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Eladó Típusa
                </label>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    type="button"
                    onClick={() => { setSellerTypeFilter("all"); setMerchantShopFilter("all"); }}
                    className={`px-2 py-2 rounded-xl text-[11px] font-bold border transition text-center ${
                      sellerTypeFilter === "all"
                        ? "border-purple-600 bg-purple-50 text-purple-900 font-black"
                        : "border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    Összes
                  </button>
                  <button
                    type="button"
                    onClick={() => setSellerTypeFilter("PRIVATE")}
                    className={`px-2 py-2 rounded-xl text-[11px] font-bold border transition text-center ${
                      sellerTypeFilter === "PRIVATE"
                        ? "border-purple-600 bg-purple-50 text-purple-900 font-black"
                        : "border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    Magán
                  </button>
                  <button
                    type="button"
                    onClick={() => setSellerTypeFilter("BUSINESS")}
                    className={`px-2 py-2 rounded-xl text-[11px] font-bold border transition text-center ${
                      sellerTypeFilter === "BUSINESS"
                        ? "border-emerald-600 bg-emerald-50 text-emerald-900 font-black"
                        : "border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    🏪 Bolt
                  </button>
                </div>
              </div>

              {/* 2. SPECIFIC MERCHANT SHOP FILTER */}
              {sellerTypeFilter === "BUSINESS" && (
                <div className="space-y-1.5 animate-in fade-in duration-200">
                  <label className="text-[11px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                    Regisztrált Bolt kiválasztása
                  </label>
                  <select
                    value={merchantShopFilter}
                    onChange={(e) => setMerchantShopFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-emerald-300 rounded-xl text-xs bg-emerald-50/50 dark:bg-emerald-950/40 font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none text-slate-900 dark:text-white"
                  >
                    <option value="all">🏪 Összes bolt</option>
                    <option value="gastro-home">🥣 GastroHome & Kitchen Kft.</option>
                    <option value="biz-fox-tech">🦊 FoxTech Electronics Kft.</option>
                    <option value="electro-shop">⚡ ElectroShop Pro Hungary</option>
                    <option value="beauty-care">✨ BeautyCare Store Kft.</option>
                  </select>
                </div>
              )}

              {/* 3. SEARCH INPUT */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Keresőszó / Termék
                </label>
                <div className="relative">
                  <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Pl. Tefal botmixer, iPhone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border rounded-xl text-xs bg-slate-50 dark:bg-slate-950 font-bold focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* 4. CONDITION FILTER */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Állapot
                </label>
                <select
                  value={conditionFilter}
                  onChange={(e) => setConditionFilter(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs bg-slate-50 dark:bg-slate-950 font-bold focus:ring-2 focus:ring-purple-500 focus:outline-none text-slate-900 dark:text-white"
                >
                  <option value="all">Minden állapot</option>
                  <option value="new">✨ Új (Címkés / Bontatlan)</option>
                  <option value="like_new">💎 Újszerű (Hibátlan)</option>
                  <option value="good">👍 Jó állapotú</option>
                  <option value="used">📦 Használt</option>
                </select>
              </div>

              {/* 5. LOCATION FILTER */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-rose-500" />
                  Város / Helyszín
                </label>
                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs bg-slate-50 dark:bg-slate-950 font-bold focus:ring-2 focus:ring-purple-500 focus:outline-none text-slate-900 dark:text-white"
                >
                  <option value="all">Minden település (Országos)</option>
                  <option value="Budapest">Budapest</option>
                  <option value="Debrecen">Debrecen</option>
                  <option value="Győr">Győr</option>
                  <option value="Székesfehérvár">Székesfehérvár</option>
                </select>
              </div>

            </div>
          </div>

          {/* Right Product Grid Column */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Top Allegro-style Seller Type Quick Tabs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-none w-full sm:w-auto">
                <button
                  onClick={() => { setSellerTypeFilter("all"); setMerchantShopFilter("all"); }}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition whitespace-nowrap ${
                    sellerTypeFilter === "all"
                      ? "bg-purple-600 text-white shadow-md shadow-purple-500/20"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  🌐 Összes hirdetés ({MOCK_MARKETPLACE_ITEMS.length})
                </button>
                <button
                  onClick={() => { setSellerTypeFilter("PRIVATE"); setMerchantShopFilter("all"); }}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition whitespace-nowrap ${
                    sellerTypeFilter === "PRIVATE"
                      ? "bg-purple-600 text-white shadow-md shadow-purple-500/20"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  🛍️ Magánszemély eladók
                </button>
                <button
                  onClick={() => setSellerTypeFilter("BUSINESS")}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition whitespace-nowrap ${
                    sellerTypeFilter === "BUSINESS"
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/20"
                      : "text-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-100"
                  }`}
                >
                  🏪 Regisztrált Boltok (Shopok)
                </button>
              </div>

              <div className="text-xs font-bold text-slate-500 dark:text-slate-400 px-2 shrink-0">
                {filteredItems.length} találat
              </div>
            </div>

            {/* Active Filter Chips */}
            {(categorySlug !== "all" || conditionFilter !== "all" || listingTypeFilter !== "all" || locationFilter !== "all" || sellerTypeFilter !== "all" || merchantShopFilter !== "all" || searchQuery) && (
              <div className="flex flex-wrap items-center gap-2 p-3 bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-800/40 rounded-2xl text-xs">
                <span className="font-black text-purple-900 dark:text-purple-300 uppercase text-[10px] tracking-wider">Aktív szűrők:</span>
                {sellerTypeFilter !== "all" && (
                  <Badge variant="secondary" className="bg-white dark:bg-slate-900 font-bold border flex items-center gap-1">
                    Eladó: {sellerTypeFilter === "BUSINESS" ? "Regisztrált Kereskedő" : "Magánszemély"}
                    <X className="w-3 h-3 cursor-pointer text-slate-400 hover:text-rose-500" onClick={() => setSellerTypeFilter("all")} />
                  </Badge>
                )}
                {merchantShopFilter !== "all" && (
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-900 font-bold border border-emerald-300 flex items-center gap-1">
                    Bolt: {merchantShopFilter}
                    <X className="w-3 h-3 cursor-pointer text-slate-400 hover:text-rose-500" onClick={() => setMerchantShopFilter("all")} />
                  </Badge>
                )}
                {searchQuery && (
                  <Badge variant="secondary" className="bg-white dark:bg-slate-900 font-bold border flex items-center gap-1">
                    Keresés: "{searchQuery}"
                    <X className="w-3 h-3 cursor-pointer text-slate-400 hover:text-rose-500" onClick={() => setSearchQuery("")} />
                  </Badge>
                )}
                <button onClick={handleResetFilters} className="text-xs text-purple-700 font-bold hover:underline ml-auto">
                  Összes törlése
                </button>
              </div>
            )}

            {/* Products Grid */}
            {filteredItems.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-slate-950 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 space-y-3">
                <p className="text-sm font-extrabold text-slate-600 dark:text-slate-400">
                  Nincs találat a megadott szűrők alapján.
                </p>
                <Button onClick={handleResetFilters} variant="outline" size="sm" className="rounded-xl font-bold text-xs">
                  Szűrők törlése
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {filteredItems.map((item) => {
                  const safetyFee = calculateSafetyFee(item.price);
                  const isBusiness = item.sellerType === "BUSINESS";

                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className="group bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm hover:shadow-md hover:border-purple-500 transition cursor-pointer flex flex-col justify-between"
                    >
                      <div>
                        {/* Cover Image */}
                        <div className="relative aspect-square overflow-hidden bg-slate-100">
                          <img
                            src={item.image}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                          />
                          
                          {/* Seller badge */}
                          <Badge className={`absolute top-3 left-3 text-white font-black text-[10px] px-2.5 py-1 shadow-md ${
                            isBusiness ? "bg-emerald-600" : "bg-purple-600"
                          }`}>
                            {isBusiness ? "🏪 Regisztrált Bolt" : "🛍️ Magánszemély"}
                          </Badge>

                          <Badge className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur text-white font-bold text-[10px]">
                            {item.conditionLabel}
                          </Badge>
                        </div>

                        {/* Card Details */}
                        <div className="p-4 space-y-2">
                          <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold">
                            <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400 truncate max-w-[150px]">
                              <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                              <span className="truncate">{item.location}</span>
                            </span>
                            <span className="text-purple-600 dark:text-purple-400 font-extrabold shrink-0">
                              {item.brand}
                            </span>
                          </div>

                          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white group-hover:text-purple-600 transition line-clamp-2 leading-snug">
                            {item.title}
                          </h3>

                          {/* Business seller extra warranty/shipping info */}
                          {isBusiness && item.warranty && (
                            <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1 pt-1">
                              <CheckCircle2 className="w-3 h-3 shrink-0" />
                              <span>{item.warranty}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Footer Price & Fee */}
                      <div className="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div>
                          <span className="text-base font-black text-purple-600 dark:text-purple-400 block">
                            {formatPrice(item.price)} Ft
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">
                            + Biztonsági díj: {formatPrice(safetyFee)} Ft
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] font-bold text-slate-500 block">
                            ★ {item.sellerRating} ({item.sellerReviewsCount})
                          </span>
                          <span className="text-[11px] font-extrabold text-purple-600 hover:underline flex items-center gap-0.5 justify-end">
                            Részletek <ChevronRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        </div>
      </section>

      {/* Item Details Dialog Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl relative my-8 animate-in fade-in zoom-in-95 duration-200">
            
            <div className="relative aspect-video bg-slate-100 shrink-0">
              <img
                src={selectedItem.image}
                alt={selectedItem.title}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => setSelectedItem(null)}
                className="absolute top-4 right-4 w-9 h-9 bg-black/50 backdrop-blur hover:bg-black/70 text-white rounded-full flex items-center justify-center transition border border-white/20"
              >
                <X className="w-5 h-5" />
              </button>
              <Badge className={`absolute top-4 left-4 text-white font-black text-xs px-3 py-1 shadow-md ${
                selectedItem.sellerType === "BUSINESS" ? "bg-emerald-600" : "bg-purple-600"
              }`}>
                {selectedItem.sellerType === "BUSINESS" ? "🏪 Regisztrált Bolt" : "🛍️ Magánszemély"}
              </Badge>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-black text-purple-600 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-rose-500" />
                    {selectedItem.location} • {selectedItem.categoryName}
                  </span>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white leading-tight">
                    {selectedItem.title}
                  </h2>
                </div>
                <div className="text-left md:text-right">
                  <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
                    {formatPrice(selectedItem.price)} Ft
                  </div>
                  <span className="text-xs font-extrabold text-slate-500 block">
                    + {formatPrice(calculateSafetyFee(selectedItem.price))} Ft Biztonsági díj
                  </span>
                </div>
              </div>

              {/* Seller details card */}
              <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    {selectedItem.sellerType === "BUSINESS" ? <Store className="w-4 h-4 text-emerald-600" /> : <User className="w-4 h-4 text-purple-600" />}
                    <span>{selectedItem.seller}</span>
                  </div>
                  <span className="text-xs text-amber-600 font-bold">★ {selectedItem.sellerRating} ({selectedItem.sellerReviewsCount} értékelés)</span>
                </div>

                {selectedItem.sellerType === "BUSINESS" && (
                  <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1 pt-1 border-t border-slate-200 dark:border-slate-800">
                    <div>Cégjegyzékszám: {selectedItem.regNumber} • Adószám: {selectedItem.taxNumber}</div>
                    <div>🛡️ Garancia: {selectedItem.warranty}</div>
                    <div>🚚 Szállítás: {selectedItem.shippingTime}</div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-wider">
                  Leírás
                </h4>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                  {selectedItem.description}
                </p>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <Button asChild className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-black text-sm py-3 rounded-2xl shadow-lg shadow-purple-500/25">
                  <Link href={`/checkout?id=${selectedItem.id}&price=${selectedItem.price}`}>
                    Vásárlás Vevővédelemmel 🛒
                  </Link>
                </Button>
                {selectedItem.shopId && (
                  <Button asChild variant="outline" className="rounded-2xl font-extrabold text-xs">
                    <Link href={`/shop/${selectedItem.shopId}`}>
                      Bolt Profil 🏪
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

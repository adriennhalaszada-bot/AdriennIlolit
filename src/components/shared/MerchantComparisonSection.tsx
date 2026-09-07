import { useState, useMemo } from "react";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Store,
  Search as SearchIcon,
  Truck,
  ShieldCheck,
  Star,
  CheckCircle2,
  PackageCheck,
  ChevronRight,
  Filter,
  User,
  Building2,
  Tag,
  RotateCcw
} from "lucide-react";
import { formatPrice } from "@/lib/constants";
import { calculateSafetyFee } from "@/lib/feeCalculator";

export interface MerchantOffer {
  id: string;
  shopId: string;
  shopName: string;
  shopLogo: string;
  sellerType: "BUSINESS" | "PRIVATE";
  taxNumber?: string;
  regNumber?: string;
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  productTitle: string;
  productCategory: string;
  price: number;
  conditionLabel: string;
  warranty: string;
  shippingTime: string;
  shippingFee: number;
  courierName: string;
  stockCount: number;
  productId: string;
}

const MOCK_MERCHANT_OFFERS: MerchantOffer[] = [
  // Tefal botmixer offers from multiple registered merchants
  {
    id: "tefal_1",
    shopId: "gastro-home",
    shopName: "GastroHome & Kitchen Kft.",
    shopLogo: "🥣",
    sellerType: "BUSINESS",
    taxNumber: "23456789-2-41",
    regNumber: "Cg.01-09-345678",
    rating: 4.8,
    reviewCount: 89,
    isVerified: true,
    productTitle: "Tefal InfinyForce Pro 1000W 4in1 Botmixer Szett (Aprító + Habverő)",
    productCategory: "Elektronika",
    price: 22990,
    conditionLabel: "Új, bontatlan termék",
    warranty: "24 hónap hivatalos gyári garancia",
    shippingTime: "1-2 munkanap",
    shippingFee: 1290,
    courierName: "DPD Futárszolgálat",
    stockCount: 8,
    productId: "list_elec_1"
  },
  {
    id: "tefal_2",
    shopId: "biz-fox-tech",
    shopName: "FoxTech Premium Electronics Kft.",
    shopLogo: "🦊",
    sellerType: "BUSINESS",
    taxNumber: "12345678-2-42",
    regNumber: "Cg.01-09-987654",
    rating: 4.9,
    reviewCount: 142,
    isVerified: true,
    productTitle: "Tefal InfinyForce Pro 1000W Titánium Késes Botmixer Premium",
    productCategory: "Elektronika",
    price: 24490,
    conditionLabel: "Új, gyári csomagolt",
    warranty: "24 hónap gyári garancia",
    shippingTime: "1 munkanap (Expressz)",
    shippingFee: 0,
    courierName: "GLS Expressz Futár",
    stockCount: 3,
    productId: "list_elec_1"
  },
  {
    id: "tefal_3",
    shopId: "electro-shop",
    shopName: "ElectroShop Pro Hungary Kft.",
    shopLogo: "⚡",
    sellerType: "BUSINESS",
    taxNumber: "34567890-2-13",
    regNumber: "Cg.06-09-123987",
    rating: 4.7,
    reviewCount: 215,
    isVerified: true,
    productTitle: "Tefal QuickChef 800W 3in1 Rozsdamentes Acél Botmixer",
    productCategory: "Elektronika",
    price: 19990,
    conditionLabel: "Új termék",
    warranty: "24 hónap garancia",
    shippingTime: "24 órás szállítás",
    shippingFee: 790,
    courierName: "MPL / Foxpost Csomagpont",
    stockCount: 2,
    productId: "list_elec_1"
  },

  // Sony headphones
  {
    id: "sony_1",
    shopId: "biz-fox-tech",
    shopName: "FoxTech Premium Electronics Kft.",
    shopLogo: "🦊",
    sellerType: "BUSINESS",
    taxNumber: "12345678-2-42",
    regNumber: "Cg.01-09-987654",
    rating: 4.9,
    reviewCount: 142,
    isVerified: true,
    productTitle: "Sony WH-1000XM5 Vezeték Nélküli Zajszűrős Fejhallgató",
    productCategory: "Elektronika",
    price: 129900,
    conditionLabel: "Új, bontatlan",
    warranty: "24 hónap Sony garancia",
    shippingTime: "1 munkanap",
    shippingFee: 0,
    courierName: "GLS Futár",
    stockCount: 5,
    productId: "list_1"
  },
  {
    id: "sony_2",
    shopId: "electro-shop",
    shopName: "ElectroShop Pro Hungary Kft.",
    shopLogo: "⚡",
    sellerType: "BUSINESS",
    taxNumber: "34567890-2-13",
    regNumber: "Cg.06-09-123987",
    rating: 4.7,
    reviewCount: 215,
    isVerified: true,
    productTitle: "Sony WH-1000XM4 Premium ANC Fejhallgató",
    productCategory: "Elektronika",
    price: 109900,
    conditionLabel: "Új termék",
    warranty: "24 hónap garancia",
    shippingTime: "1-2 munkanap",
    shippingFee: 0,
    courierName: "MPL Futár",
    stockCount: 4,
    productId: "list_1"
  },

  // Dyson airwrap
  {
    id: "dyson_1",
    shopId: "beauty-care",
    shopName: "BeautyCare & Luxury Store Kft.",
    shopLogo: "✨",
    sellerType: "BUSINESS",
    taxNumber: "56789012-2-05",
    regNumber: "Cg.03-09-567123",
    rating: 5.0,
    reviewCount: 64,
    isVerified: true,
    productTitle: "Dyson Airwrap Complete Long Hajformázó",
    productCategory: "Szépségápolás",
    price: 189900,
    conditionLabel: "Új, gyári dobozban",
    warranty: "24 hónap Dyson garancia",
    shippingTime: "1 munkanap",
    shippingFee: 0,
    courierName: "GLS Futár",
    stockCount: 2,
    productId: "list_beauty_1"
  }
];

export function MerchantComparisonSection() {
  const [selectedSellerType, setSelectedSellerType] = useState<"ALL" | "BUSINESS" | "PRIVATE">("ALL");
  const [selectedShopId, setSelectedShopId] = useState<string>("ALL");
  const [productQuery, setProductQuery] = useState<string>("");

  // Registered merchant shop list for filter dropdown/pills
  const registeredShops = [
    { id: "ALL", name: "Összes Bolt", logo: "🏪" },
    { id: "gastro-home", name: "GastroHome & Kitchen", logo: "🥣" },
    { id: "biz-fox-tech", name: "FoxTech Electronics", logo: "🦊" },
    { id: "electro-shop", name: "ElectroShop Pro", logo: "⚡" },
    { id: "beauty-care", name: "BeautyCare Store", logo: "✨" },
  ];

  // Popular product filter quick chips (Allegro style)
  const quickProductChips = [
    "Tefal botmixer",
    "Sony fejhallgató",
    "Dyson hajformázó"
  ];

  const filteredOffers = useMemo(() => {
    return MOCK_MERCHANT_OFFERS.filter((offer) => {
      const matchesSellerType =
        selectedSellerType === "ALL" || offer.sellerType === selectedSellerType;
      const matchesShop =
        selectedShopId === "ALL" || offer.shopId === selectedShopId;
      const matchesQuery =
        !productQuery ||
        offer.productTitle.toLowerCase().includes(productQuery.toLowerCase()) ||
        offer.shopName.toLowerCase().includes(productQuery.toLowerCase()) ||
        offer.productCategory.toLowerCase().includes(productQuery.toLowerCase());

      return matchesSellerType && matchesShop && matchesQuery;
    }).sort((a, b) => a.price - b.price);
  }, [selectedSellerType, selectedShopId, productQuery]);

  const handleReset = () => {
    setSelectedSellerType("ALL");
    setSelectedShopId("ALL");
    setProductQuery("");
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 md:p-6 shadow-sm my-4 space-y-5">
      {/* ALLEGRO-STYLE LIGHT FILTER BAR */}
      <div className="space-y-4">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Badge className="bg-emerald-600 text-white font-extrabold text-xs px-2.5 py-1">
              🏪 Allegro-stílusú Kereskedői Szűrő
            </Badge>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
              Szűrés regisztrált boltokra és termékekre
            </span>
          </div>

          {(selectedSellerType !== "ALL" || selectedShopId !== "ALL" || productQuery) && (
            <button
              onClick={handleReset}
              className="text-xs font-bold text-slate-500 hover:text-purple-600 flex items-center gap-1 transition self-end sm:self-auto"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Szűrők törlése</span>
            </button>
          )}
        </div>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* 1. Seller Type Selector (Mind / Magánszemély / Kereskedő) */}
          <div className="md:col-span-4 flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setSelectedSellerType("ALL")}
              className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-extrabold transition ${
                selectedSellerType === "ALL"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Összes eladó
            </button>
            <button
              onClick={() => setSelectedSellerType("BUSINESS")}
              className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-1 ${
                selectedSellerType === "BUSINESS"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-emerald-600"
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              Kereskedők (Shopok)
            </button>
          </div>

          {/* 2. Specific Merchant Shop Selector */}
          <div className="md:col-span-4">
            <select
              value={selectedShopId}
              onChange={(e) => setSelectedShopId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-2xl text-xs font-bold h-10 px-3 focus:ring-2 focus:ring-emerald-500"
            >
              {registeredShops.map((shop) => (
                <option key={shop.id} value={shop.id}>
                  {shop.logo} {shop.name}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Product Search Filter Input */}
          <div className="md:col-span-4 relative">
            <SearchIcon className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <Input
              type="text"
              value={productQuery}
              onChange={(e) => setProductQuery(e.target.value)}
              placeholder="Termék szűrő (pl. Tefal botmixer)..."
              className="pl-9 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 rounded-2xl text-xs h-10 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Quick Product Chips (e.g. Tefal botmixer) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-xs font-bold text-slate-500 shrink-0">Népszerű kereskedelmi szűrők:</span>
          {quickProductChips.map((chip) => (
            <button
              key={chip}
              onClick={() => {
                setProductQuery(chip);
                setSelectedSellerType("BUSINESS");
              }}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition shrink-0 border ${
                productQuery === chip
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200"
              }`}
            >
              🍓 {chip}
            </button>
          ))}
        </div>
      </div>

      {/* FILTERED MERCHANT RESULTS LIST */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400 px-1">
          <span>{filteredOffers.length} ajánlat a kiválasztott szűrők alapján</span>
          {productQuery && <span>Kifejezés: "{productQuery}"</span>}
        </div>

        {filteredOffers.length === 0 ? (
          <div className="text-center py-8 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
            <p className="text-xs font-bold text-slate-600 dark:text-slate-400">Nincs találat a megadott kereskedelmi szűrőkre.</p>
            <Button size="sm" onClick={handleReset} className="bg-emerald-600 text-white text-xs font-bold rounded-xl">
              Szűrők törlése
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOffers.map((offer) => {
              const safetyFee = calculateSafetyFee(offer.price);
              const totalPrice = offer.price + safetyFee;

              return (
                <div
                  key={offer.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 p-4 rounded-2xl shadow-sm transition space-y-3"
                >
                  {/* Header: Shop & Rating */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xl">{offer.shopLogo}</span>
                      <Link href={`/shop/${offer.shopId}`} className="font-extrabold text-sm text-slate-900 dark:text-white hover:text-emerald-600 transition">
                        {offer.shopName}
                      </Link>
                      {offer.isVerified && (
                        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 text-[10px] font-extrabold">
                          ✔️ Hivatalos Kereskedő
                        </Badge>
                      )}
                      <span className="text-xs text-amber-600 dark:text-amber-400 font-bold flex items-center gap-0.5">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        {offer.rating} ({offer.reviewCount})
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      Cégj.sz: {offer.regNumber} • Adószám: {offer.taxNumber}
                    </div>
                  </div>

                  {/* Body: Product details & Shipping info */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h4 className="font-extrabold text-sm md:text-base text-slate-900 dark:text-white">
                        {offer.productTitle}
                      </h4>
                      <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400 flex-wrap">
                        <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
                          <Truck className="w-3.5 h-3.5" />
                          🚚 Szállítás: {offer.shippingTime} ({offer.courierName})
                        </span>
                        <span>•</span>
                        <span className="text-purple-700 dark:text-purple-300 font-bold flex items-center gap-1">
                          <PackageCheck className="w-3.5 h-3.5" />
                          ✅ Raktáron ({offer.stockCount} db)
                        </span>
                        <span>•</span>
                        <span>🛡️ {offer.warranty}</span>
                      </div>
                    </div>

                    {/* Price & Buy Button */}
                    <div className="flex items-center gap-4 shrink-0 justify-between md:justify-end border-t md:border-t-0 border-slate-100 dark:border-slate-800 pt-2 md:pt-0">
                      <div className="text-right">
                        <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                          {formatPrice(offer.price)} Ft
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          + Biztonsági díj: {formatPrice(safetyFee)} Ft (Össz: {formatPrice(totalPrice)} Ft)
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl shadow-sm">
                          <Link href={`/product/${offer.productId}`}>
                            Vásárlás 🛒
                          </Link>
                        </Button>
                        <Button asChild size="sm" variant="outline" className="border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl">
                          <Link href={`/shop/${offer.shopId}`}>
                            Bolt Profil 🏪
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

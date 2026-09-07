import { useState } from "react";
import { Link, useRoute } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Building2, 
  MapPin, 
  FileText, 
  ShieldCheck, 
  Star, 
  Phone, 
  Mail, 
  Package, 
  ShoppingBag, 
  ArrowLeft,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { MOCK_MARKETPLACE_ITEMS } from "./Search";
import { formatPrice } from "@/lib/constants";
import { SAFETY_FEE_SUBTEXT } from "@/lib/feeCalculator";

export function ShopPage() {
  const [, params] = useRoute("/shop/:shopId");
  const shopId = params?.shopId || "biz-fox-tech";

  // Mock Shop Profile data matching Allegro merchant standards
  const shop = {
    id: "biz-fox-tech",
    companyName: "Róka Tech & Premium Gadgets Kft.",
    tradeName: "RókaTech Hivatalos Shop",
    taxNumber: "28491048-2-41",
    registeredAddress: "1054 Budapest, Bajcsy-Zsilinszky út 32. 3. emelet",
    bankAccount: "11705008-20489102-00000000 (OTP Bank)",
    rating: 4.9,
    reviewsCount: 142,
    salesCompleted: 489,
    joinedDate: "2024. Március",
    logoUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=300&q=80",
    coverUrl: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80",
    description: "Hivatalos elektronikai és prémium okoseszköz kiskereskedés. Garantáltan eredeti, bevizsgált termékek 12-24 hónap hivatalos magyar garanciával és 14 napos elállási joggal.",
    termsAndConditions: `
### Általános Szerződési Feltételek (ÁSZF) – Róka Tech Kft.

**1. Eladó adatai:**
Cégnév: Róka Tech & Premium Gadgets Kft.
Cégjegyzékszám: 01-09-982104
Adószám: 28491048-2-41
Székhely: 1054 Budapest, Bajcsy-Zsilinszky út 32.

**2. Megrendelés és teljesítés:**
A megrendelések visszaigazolását követően a termékeket 1-2 munkanapon belül futárszolgálattal kézbesítjük. Minden vásárlásról elektronikus ÁFA-s számlát állítunk ki.

**3. Garancia és jótállás:**
Minden általunk értékesített új termékre minimum 12-24 hónap gyártói vagy forgalmazói jótállást biztosítunk a vonatkozó jogszabályoknak megfelelően.
    `,
    returnPolicy: `
### Elállási Tájékoztató és Visszaküldés

**14 napos indoklás nélküli elállás:**
Ön mint fogyasztó jogosult a termék átvételétől számított 14 napon belül indoklás nélkül elállni a vásárlástól.

**Visszaküldés menete:**
1. Kérjük, jelezze elállási szándékát az eladó felé.
2. A terméket hiánytalanul, sérülésmentes állapotban juttassa vissza székhelyünkre (1054 Budapest, Bajcsy-Zsilinszky út 32.).
3. A vételárat a termék beérkezését követő 5 munkanapon belül visszautaljuk a megadott bankszámlaszámra.
    `,
  };

  // Filter listings belonging to this business seller
  const shopListings = MOCK_MARKETPLACE_ITEMS;

  return (
    <Layout>
      <div className="bg-slate-50 dark:bg-slate-950 min-h-screen pb-16">
        
        {/* Allegro-style Shop Cover & Header */}
        <div className="relative bg-slate-900 text-white">
          <div className="h-48 md:h-64 w-full relative overflow-hidden">
            <img 
              src={shop.coverUrl} 
              alt={shop.companyName} 
              className="w-full h-full object-cover opacity-60"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
          </div>

          <div className="container mx-auto max-w-7xl px-4 relative -mt-16 pb-6">
            <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
              
              <div className="flex items-end gap-4">
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl overflow-hidden border-4 border-white dark:border-slate-900 bg-white shadow-xl shrink-0">
                  <img src={shop.logoUrl} alt={shop.tradeName} className="w-full h-full object-cover" />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
                      {shop.tradeName}
                    </h1>
                    <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold px-3 py-1 rounded-xl text-xs flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Hitelesített Cég
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-300 font-medium flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{shop.companyName}</span>
                    <span>• Adószám: {shop.taxNumber}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl backdrop-blur">
                <div className="text-center px-3 border-r border-slate-800">
                  <div className="flex items-center justify-center gap-1 text-amber-400 font-black text-lg">
                    <Star className="w-4 h-4 fill-amber-400" />
                    <span>{shop.rating}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-bold">{shop.reviewsCount} értékelés</div>
                </div>

                <div className="text-center px-3">
                  <div className="font-black text-lg text-emerald-400">{shop.salesCompleted}+</div>
                  <div className="text-[10px] text-slate-400 font-bold">Teljesített eladás</div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Main Content Tabs */}
        <div className="container mx-auto max-w-7xl px-4 py-8">
          <Tabs defaultValue="products" className="space-y-6">
            
            <TabsList className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1.5 rounded-2xl grid grid-cols-3 max-w-md">
              <TabsTrigger value="products" className="rounded-xl text-xs font-black">
                🛒 Kínálat ({shopListings.length})
              </TabsTrigger>
              <TabsTrigger value="about" className="rounded-xl text-xs font-black">
                🏢 Cégadatok & ÁSZF
              </TabsTrigger>
              <TabsTrigger value="reviews" className="rounded-xl text-xs font-black">
                ⭐ Értékelések
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Shop Listings */}
            <TabsContent value="products" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Package className="w-5 h-5 text-emerald-600" />
                  A(z) {shop.tradeName} Aktív Hirdetései
                </h2>
                <Badge variant="outline" className="font-bold text-xs">
                  {shopListings.length} fizikai termék
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {shopListings.map((item) => (
                  <Card key={item.id} className="rounded-3xl border-slate-200 dark:border-slate-800 overflow-hidden hover:shadow-lg transition group">
                    <div className="relative aspect-square overflow-hidden bg-slate-100 dark:bg-slate-800">
                      <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                      <Badge className="absolute top-3 left-3 bg-emerald-600 text-white font-extrabold text-[10px]">
                        🏪 Hivatalos Shop
                      </Badge>
                    </div>

                    <CardContent className="p-4 space-y-2">
                      <h3 className="font-black text-sm text-slate-900 dark:text-white line-clamp-1">
                        {item.title}
                      </h3>
                      <div className="flex items-baseline justify-between">
                        <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                          {formatPrice(item.price)}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold">{item.location}</span>
                      </div>
                      <p className="text-[10px] text-purple-600 dark:text-purple-400 font-bold border-t border-slate-100 dark:border-slate-800 pt-2">
                        {SAFETY_FEE_SUBTEXT}
                      </p>
                      <Button asChild className="w-full rounded-2xl font-extrabold text-xs bg-slate-900 hover:bg-slate-800 text-white mt-2">
                        <Link href={`/product/${item.id}`}>Megtekintés & Vásárlás</Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Tab 2: Company Info & Terms */}
            <TabsContent value="about" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                <Card className="rounded-3xl p-6 space-y-4 border-slate-200 dark:border-slate-800 lg:col-span-1">
                  <h3 className="font-black text-sm uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-emerald-600" />
                    Hivatalos Céginformációk
                  </h3>
                  
                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="text-slate-400 font-bold block">Hivatalos Cégnév:</span>
                      <span className="font-extrabold text-slate-900 dark:text-white">{shop.companyName}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 font-bold block">Adószám:</span>
                      <span className="font-extrabold text-slate-900 dark:text-white">{shop.taxNumber}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 font-bold block">Székhely Címe:</span>
                      <span className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {shop.registeredAddress}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 font-bold block">Bankszámlaszám:</span>
                      <span className="font-extrabold text-slate-900 dark:text-white">{shop.bankAccount}</span>
                    </div>
                  </div>

                  <div className="bg-emerald-50 dark:bg-emerald-950/40 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-xs space-y-1">
                    <div className="font-black text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Garanciális Kötelezettségvállalás
                    </div>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                      Ez az eladó vállalja a kötelező számlaadást és a 14 napos jogszabályi elállási jogot.
                    </p>
                  </div>
                </Card>

                <Card className="rounded-3xl p-6 space-y-6 border-slate-200 dark:border-slate-800 lg:col-span-2">
                  <div>
                    <h3 className="font-black text-sm uppercase tracking-wider text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-600" />
                      Általános Szerződési Feltételek (ÁSZF)
                    </h3>
                    <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border text-xs text-slate-700 dark:text-slate-300 font-mono whitespace-pre-line leading-relaxed">
                      {shop.termsAndConditions}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-black text-sm uppercase tracking-wider text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      Elállási és Garanciális Tájékoztató
                    </h3>
                    <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border text-xs text-slate-700 dark:text-slate-300 font-mono whitespace-pre-line leading-relaxed">
                      {shop.returnPolicy}
                    </div>
                  </div>
                </Card>

              </div>
            </TabsContent>

            {/* Tab 3: Reviews */}
            <TabsContent value="reviews" className="space-y-4">
              <Card className="rounded-3xl p-6 border-slate-200 dark:border-slate-800 space-y-4">
                <h3 className="font-black text-sm uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  Vásárlói Értékelések ({shop.reviewsCount})
                </h3>

                <div className="space-y-3">
                  {[
                    { user: "Nagy Péter", date: "2026. Augusztus 22.", rating: 5, comment: "Gyors szállítás, a termék hibátlan és a számla is rendben megérkezett." },
                    { user: "Kovács Anna", date: "2026. Augusztus 18.", rating: 5, comment: "Nagyon segítőkész kereskedő, tökéletes csomagolásban kaptam meg a készüléket." },
                    { user: "Tóth Gábor", date: "2026. Augusztus 10.", rating: 4, comment: "Minden a leírásnak megfelelő volt." },
                  ].map((rev, idx) => (
                    <div key={idx} className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-slate-900 dark:text-white">{rev.user}</span>
                        <div className="flex items-center gap-1 text-amber-400">
                          {Array.from({ length: rev.rating }).map((_, i) => (
                            <Star key={i} className="w-3 h-3 fill-amber-400" />
                          ))}
                        </div>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 font-medium">{rev.comment}</p>
                      <span className="text-[10px] text-slate-400 block pt-1">{rev.date}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </TabsContent>

          </Tabs>
        </div>

      </div>
    </Layout>
  );
}

import { useMemo } from "react";
import { Link, useRoute } from "wouter";
import { useGetListings } from "@workspace/api-client-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, MapPin, Package, ShieldCheck, Store } from "lucide-react";
import { formatPrice } from "@/lib/constants";
import { SAFETY_FEE_SUBTEXT } from "@/lib/feeCalculator";

export function ShopPage() {
  const [, params] = useRoute("/shop/:shopId");
  const shopId = params?.shopId || "";
  const { data, isLoading, isError } = useGetListings({ limit: 100 });

  const shopListings = useMemo(() => {
    const items = Array.isArray((data as any)?.items) ? (data as any).items : [];
    return items.filter((listing: any) =>
      listing?.status === "ACTIVE" &&
      !listing?.isSold &&
      listing?.user?.id === shopId,
    );
  }, [data, shopId]);

  const seller = shopListings[0]?.user;
  const sellerName = seller?.username || seller?.fullName || "Eladó üzlete";
  const sellerLocation = seller?.location || shopListings[0]?.location || "Magyarország";

  return (
    <Layout>
      <main className="min-h-screen bg-slate-50 pb-16">
        <section className="border-b border-slate-200 bg-white">
          <div className="container mx-auto max-w-7xl px-4 py-8">
            <Button asChild variant="ghost" className="mb-6 rounded-xl">
              <Link href="/search">
                <ArrowLeft className="mr-2 h-4 w-4" /> Vissza a piactérre
              </Link>
            </Button>

            {seller ? (
              <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
                <div className="flex items-center gap-4">
                  <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                    {seller.avatarUrl ? (
                      <img src={seller.avatarUrl} alt={sellerName} className="h-full w-full object-cover" />
                    ) : (
                      <Store className="h-9 w-9 text-slate-500" />
                    )}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-2xl font-black text-slate-950">{sellerName}</h1>
                      {seller.isVerified && (
                        <Badge className="bg-emerald-600 text-white">
                          <ShieldCheck className="mr-1 h-3.5 w-3.5" /> Ellenőrzött eladó
                        </Badge>
                      )}
                    </div>
                    <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-600">
                      <MapPin className="h-4 w-4" /> {sellerLocation}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="w-fit rounded-xl px-4 py-2 text-sm">
                  {shopListings.length} aktív hirdetés
                </Badge>
              </div>
            ) : null}
          </div>
        </section>

        <section className="container mx-auto max-w-7xl px-4 py-8">
          {isLoading ? (
            <StatusCard text="Az eladó hirdetéseinek betöltése…" />
          ) : isError ? (
            <StatusCard text="Az üzlet adatait most nem sikerült betölteni. Kérjük, frissítsd az oldalt." error />
          ) : shopListings.length === 0 ? (
            <StatusCard text="Ez az eladó nem található, vagy jelenleg nincs aktív hirdetése." />
          ) : (
            <>
              <h2 className="mb-6 flex items-center gap-2 text-lg font-black text-slate-950">
                <Package className="h-5 w-5 text-emerald-600" /> Aktív hirdetések
              </h2>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {shopListings.map((item: any) => {
                  const imageUrl = item.images?.[0]?.url;
                  return (
                    <Card key={item.id} className="overflow-hidden rounded-3xl border-slate-200 transition hover:shadow-lg">
                      <div className="flex aspect-square items-center justify-center overflow-hidden bg-slate-100">
                        {imageUrl ? (
                          <img src={imageUrl} alt={item.title} className="h-full w-full object-cover transition duration-300 hover:scale-105" />
                        ) : (
                          <Package className="h-12 w-12 text-slate-400" />
                        )}
                      </div>
                      <CardContent className="space-y-3 p-4">
                        <h3 className="line-clamp-2 min-h-10 text-sm font-black text-slate-950">{item.title}</h3>
                        <div className="flex items-end justify-between gap-3">
                          <span className="text-base font-black text-emerald-700">{formatPrice(Number(item.price) || 0)}</span>
                          <span className="text-right text-[10px] font-bold text-slate-500">{item.location || sellerLocation}</span>
                        </div>
                        <p className="border-t border-slate-100 pt-2 text-[10px] font-bold text-purple-700">{SAFETY_FEE_SUBTEXT}</p>
                        <Button asChild className="w-full rounded-2xl bg-slate-900 text-xs font-extrabold text-white hover:bg-slate-800">
                          <Link href={`/product/${item.id}`}>Hirdetés megtekintése</Link>
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </main>
    </Layout>
  );
}

function StatusCard({ text, error = false }: { text: string; error?: boolean }) {
  return (
    <div className={`rounded-3xl border bg-white p-10 text-center text-sm font-bold ${
      error ? "border-rose-200 text-rose-700" : "border-slate-200 text-slate-600"
    }`}>
      {text}
    </div>
  );
}

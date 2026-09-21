import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useGetListings } from "@workspace/api-client-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { LocationSearchWidget } from "@/components/shared/LocationSearchWidget";
import { DEFAULT_LOCATION_STATE, applyLocationFilter } from "@/lib/locationFilter";
import { useLocationQueryState } from "@/hooks/useLocationQueryState";
import { Car, Gauge, MapPin, Package, PlusCircle, Search } from "lucide-react";

// Compatibility for old modules that are no longer routed. An empty collection
// ensures demo vehicles can never leak into the public site.
export const MOCK_VEHICLES: any[] = [];
export const VEHICLE_ITEMS: any[] = [];

export default function Vehicles() {
  const [query, setQuery] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [locationState, setLocationState] = useLocationQueryState(DEFAULT_LOCATION_STATE);
  const { data, isLoading, isError } = useGetListings({ categorySlug: "jarmuvek", limit: 100 });

  const vehicles = useMemo(() => {
    const items = Array.isArray((data as any)?.items) ? (data as any).items : [];
    const normalizedQuery = query.trim().toLocaleLowerCase("hu");
    const priceLimit = Number(maxPrice) || null;
    return items.filter((listing: any) => {
      const haystack = [listing.title, listing.description, listing.location, listing.subcategory?.name]
        .filter(Boolean).join(" ").toLocaleLowerCase("hu");
      if (normalizedQuery && !haystack.includes(normalizedQuery)) return false;
      if (priceLimit !== null && Number(listing.price) > priceLimit) return false;
      return applyLocationFilter(listing.location || listing.user?.location || "", locationState).matches;
    });
  }, [data, query, maxPrice, locationState]);

  return (
    <Layout>
      <main className="min-h-screen bg-slate-50 pb-16">
        <section className="border-b border-slate-200 bg-white px-4 py-10">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-emerald-700">ILOLIT Jármű</p>
                <h1 className="mt-2 text-3xl font-black text-slate-950 md:text-4xl">Eladó járművek</h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-600">Kizárólag aktív, ténylegesen elmentett járműhirdetések.</p>
              </div>
              <Button asChild className="h-12 rounded-xl bg-emerald-600 px-6 font-bold text-white hover:bg-emerald-700">
                <Link href="/sell?categorySlug=jarmuvek"><PlusCircle className="mr-2 h-5 w-5" /> Járműhirdetés feladása</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-8 lg:grid-cols-4">
          <aside className="space-y-4 lg:col-span-1">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <LocationSearchWidget value={locationState} onChange={setLocationState} accentColor="emerald" compact label="Település és távolság" />
            </div>
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
              <label className="block text-xs font-black uppercase tracking-wide text-slate-600">
                Márka, modell vagy kulcsszó
                <div className="relative mt-2">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Például Toyota, dízel…" className="w-full rounded-xl border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-emerald-600" />
                </div>
              </label>
              <label className="block text-xs font-black uppercase tracking-wide text-slate-600">
                Legmagasabb ár
                <input type="number" min="0" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} placeholder="Például 8000000" className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-600" />
              </label>
            </div>
          </aside>

          <div className="lg:col-span-3">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-black text-slate-950"><Car className="h-5 w-5 text-emerald-600" /> Járműhirdetések</h2>
              <span className="text-sm font-bold text-slate-500">{vehicles.length} találat</span>
            </div>

            {isLoading ? <Status text="A járművek betöltése…" /> : isError ? <Status text="A járműveket most nem sikerült betölteni." error /> : vehicles.length === 0 ? <Status text="Nincs a feltételeknek megfelelő aktív járműhirdetés." /> : (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {vehicles.map((vehicle: any) => {
                  const imageUrl = vehicle.images?.[0]?.url;
                  return (
                    <Link key={vehicle.id} href={`/product/${vehicle.id}`} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:border-emerald-400 hover:shadow-md">
                      <div className="flex aspect-[16/10] items-center justify-center overflow-hidden bg-slate-100">
                        {imageUrl ? <img src={imageUrl} alt={vehicle.title} className="h-full w-full object-cover transition duration-300 hover:scale-105" /> : <Car className="h-14 w-14 text-slate-400" />}
                      </div>
                      <div className="p-5">
                        <p className="text-xl font-black text-emerald-700">{Number(vehicle.price || 0).toLocaleString("hu-HU")} Ft</p>
                        <h3 className="mt-2 line-clamp-2 text-base font-black text-slate-950">{vehicle.title}</h3>
                        <p className="mt-3 flex items-center gap-1.5 text-sm text-slate-600"><MapPin className="h-4 w-4 text-emerald-600" />{vehicle.location || vehicle.user?.location || "Magyarország"}</p>
                        <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-slate-500">{vehicle.description}</p>
                        <p className="mt-4 flex items-center gap-1.5 text-xs font-bold text-slate-500"><Gauge className="h-4 w-4" /> Részletek a hirdetésben</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>
    </Layout>
  );
}

function Status({ text, error = false }: { text: string; error?: boolean }) {
  return <div className={`rounded-3xl border bg-white p-12 text-center text-sm font-bold ${error ? "border-rose-200 text-rose-700" : "border-slate-200 text-slate-600"}`}><Package className="mx-auto mb-3 h-9 w-9 text-slate-300" />{text}</div>;
}

import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useGetListings } from "@workspace/api-client-react";
import { Layout } from "@/components/layout/Layout";
import { UniversalSearchBar } from "@/components/shared/UniversalSearchBar";
import { LocationSearchWidget } from "@/components/shared/LocationSearchWidget";
import { DEFAULT_LOCATION_STATE, applyLocationFilter } from "@/lib/locationFilter";
import { useLocationQueryState } from "@/hooks/useLocationQueryState";
import { getProviderProfiles, type ProviderProfileRecord } from "@/lib/providerApi";
import { Store, Sparkles, Wrench, Home, Car, GraduationCap, MapPin, Package, Star } from "lucide-react";

type ModuleTab = "all" | "marketplace" | "beauty" | "providers" | "realestate" | "vehicles" | "education";

const MODULES: Array<{ id: ModuleTab; label: string; icon: typeof Store }> = [
  { id: "all", label: "Összes", icon: Sparkles },
  { id: "marketplace", label: "Piactér", icon: Store },
  { id: "beauty", label: "Szépségipar", icon: Sparkles },
  { id: "providers", label: "Szolgáltatók", icon: Wrench },
  { id: "realestate", label: "Ingatlanok", icon: Home },
  { id: "vehicles", label: "Járművek", icon: Car },
  { id: "education", label: "Oktatás", icon: GraduationCap },
];

function listingModule(listing: any): ModuleTab {
  const slug = listing.category?.slug || "";
  if (slug === "ingatlanok") return "realestate";
  if (slug === "jarmuvek") return "vehicles";
  if (slug === "oktatas") return "education";
  return "marketplace";
}

function isBeautyProvider(provider: ProviderProfileRecord) {
  const text = [provider.category, provider.subCategory, provider.displayName]
    .filter(Boolean).join(" ").toLocaleLowerCase("hu");
  return ["szépség", "fodrász", "kozmet", "köröm", "smink", "masszázs"].some((term) => text.includes(term));
}

export function UniversalSearch() {
  const params = new URLSearchParams(window.location.search);
  const query = (params.get("q") || "").trim();
  const normalizedQuery = query.toLocaleLowerCase("hu");
  const [activeTab, setActiveTab] = useState<ModuleTab>("all");
  const [locationState, setLocationState] = useLocationQueryState(DEFAULT_LOCATION_STATE);
  const [providers, setProviders] = useState<ProviderProfileRecord[]>([]);
  const [providersLoading, setProvidersLoading] = useState(true);
  const [providersError, setProvidersError] = useState(false);
  const { data: listingPage, isLoading: listingsLoading, isError: listingsError } = useGetListings({ limit: 100 });

  useEffect(() => {
    let active = true;
    getProviderProfiles()
      .then(({ items }) => {
        if (active) setProviders(items);
      })
      .catch(() => {
        if (active) {
          setProviders([]);
          setProvidersError(true);
        }
      })
      .finally(() => active && setProvidersLoading(false));
    return () => { active = false; };
  }, []);

  const listings = useMemo(() => {
    const items = Array.isArray((listingPage as any)?.items) ? (listingPage as any).items : [];
    return items.filter((listing: any) => {
      const haystack = [
        listing.title,
        listing.description,
        listing.brand,
        listing.category?.name,
        listing.subcategory?.name,
      ].filter(Boolean).join(" ").toLocaleLowerCase("hu");
      if (normalizedQuery && !haystack.includes(normalizedQuery)) return false;
      const location = listing.location || listing.user?.location || "";
      return applyLocationFilter(location, locationState).matches;
    });
  }, [listingPage, normalizedQuery, locationState]);

  const filteredProviders = useMemo(() => providers.filter((provider) => {
    const haystack = [
      provider.displayName,
      provider.category,
      provider.subCategory,
      provider.city,
      ...provider.services.map((service) => service.name),
    ].filter(Boolean).join(" ").toLocaleLowerCase("hu");
    if (normalizedQuery && !haystack.includes(normalizedQuery)) return false;
    return applyLocationFilter(provider.city, locationState).matches;
  }), [providers, normalizedQuery, locationState]);

  const counts = useMemo(() => {
    const result: Record<ModuleTab, number> = {
      all: listings.length + filteredProviders.length,
      marketplace: 0,
      beauty: 0,
      providers: 0,
      realestate: 0,
      vehicles: 0,
      education: 0,
    };
    listings.forEach((listing: any) => { result[listingModule(listing)] += 1; });
    filteredProviders.forEach((provider) => {
      result[isBeautyProvider(provider) ? "beauty" : "providers"] += 1;
    });
    return result;
  }, [listings, filteredProviders]);

  const visibleListings = activeTab === "all"
    ? listings
    : listings.filter((listing: any) => listingModule(listing) === activeTab);
  const visibleProviders = activeTab === "all"
    ? filteredProviders
    : filteredProviders.filter((provider) =>
        activeTab === "beauty" ? isBeautyProvider(provider) : activeTab === "providers" ? !isBeautyProvider(provider) : false,
      );
  const loading = listingsLoading || providersLoading;
  const hasError = listingsError || providersError;
  const visibleCount = visibleListings.length + visibleProviders.length;

  return (
    <Layout>
      <main className="min-h-screen bg-slate-50 px-4 py-8 md:px-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <header>
            <h1 className="flex items-center gap-2 text-2xl font-black text-slate-950 md:text-3xl">
              <Sparkles className="h-7 w-7 text-emerald-600" /> ILOLIT kereső
            </h1>
            <p className="mt-1 text-sm font-medium text-slate-600">
              Valódi hirdetések és regisztrált szolgáltatók egyetlen keresőben.
            </p>
          </header>

          <UniversalSearchBar initialQuery={query} initialCity={locationState.cityInput} />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
            <aside className="lg:col-span-1">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <LocationSearchWidget
                  value={locationState}
                  onChange={setLocationState}
                  accentColor="emerald"
                  compact
                  label="Helyszín és távolság"
                />
              </div>
            </aside>

            <section className="space-y-6 lg:col-span-3">
              <div className="flex gap-2 overflow-x-auto pb-2">
                {MODULES.map((module) => {
                  const Icon = module.icon;
                  return (
                    <button
                      key={module.id}
                      type="button"
                      onClick={() => setActiveTab(module.id)}
                      className={`flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-black transition ${
                        activeTab === module.id
                          ? "border-emerald-600 bg-emerald-600 text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" /> {module.label} ({module.id === "all" ? counts.all : counts[module.id]})
                    </button>
                  );
                })}
              </div>

              {loading ? (
                <Status text="A találatok betöltése…" />
              ) : hasError && visibleCount === 0 ? (
                <Status text="A találatokat most nem sikerült betölteni. Kérjük, frissítsd az oldalt." error />
              ) : visibleCount === 0 ? (
                <Status text="Nincs találat a megadott kulcsszóval és helyszínnel." />
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {visibleListings.map((listing: any) => {
                    const imageUrl = listing.images?.[0]?.url;
                    return (
                      <Link key={listing.id} href={`/product/${listing.id}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-emerald-400 hover:shadow-md">
                        <div className="flex gap-4 p-4">
                          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
                            {imageUrl ? <img src={imageUrl} alt={listing.title} className="h-full w-full object-cover" /> : <Package className="h-9 w-9 text-slate-400" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">{listing.category?.name || "Piactér"}</p>
                            <h2 className="mt-1 line-clamp-2 text-sm font-black text-slate-950">{listing.title}</h2>
                            <p className="mt-2 text-base font-black text-emerald-700">{Number(listing.price || 0).toLocaleString("hu-HU")} Ft</p>
                            <p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3.5 w-3.5" />{listing.location || listing.user?.location || "Magyarország"}</p>
                          </div>
                        </div>
                      </Link>
                    );
                  })}

                  {visibleProviders.map((provider) => (
                    <Link key={provider.id} href={`/providers/${provider.id}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-400 hover:shadow-md">
                      <div className="flex gap-4">
                        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
                          {provider.profileImage ? <img src={provider.profileImage} alt={provider.displayName} className="h-full w-full object-cover" /> : <Wrench className="h-8 w-8 text-slate-400" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">{isBeautyProvider(provider) ? "Szépségipar" : provider.category}</p>
                          <h2 className="mt-1 truncate text-sm font-black text-slate-950">{provider.displayName}</h2>
                          <p className="mt-1 truncate text-xs font-semibold text-slate-600">{provider.subCategory}</p>
                          <p className="mt-2 flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3.5 w-3.5" />{provider.city}</p>
                          {provider.services.length > 0 && (
                            <p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><Star className="h-3.5 w-3.5 text-amber-500" />{provider.services.length} szolgáltatás</p>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </Layout>
  );
}

function Status({ text, error = false }: { text: string; error?: boolean }) {
  return (
    <div className={`rounded-3xl border bg-white p-12 text-center text-sm font-bold ${
      error ? "border-rose-200 text-rose-700" : "border-slate-200 text-slate-600"
    }`}>
      {text}
    </div>
  );
}

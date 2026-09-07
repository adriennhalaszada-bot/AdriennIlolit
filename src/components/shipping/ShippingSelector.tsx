import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, Search, CheckCircle2, Truck, Package } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ParcelMachine {
  id: string;
  name: string;
  provider: "foxpost" | "packeta" | "gls";
  address: string;
  city: string;
  zip: string;
  status: "available" | "busy";
  distanceKm?: string;
}

const MOCK_PARCEL_MACHINES: ParcelMachine[] = [
  { id: "fox_bp_01", provider: "foxpost", name: "FoxPost – Westend Bevásárlóközpont (-1. szint)", city: "Budapest", zip: "1062", address: "Váci út 1-3.", status: "available", distanceKm: "0.4 km" },
  { id: "fox_bp_02", provider: "foxpost", name: "FoxPost – Corvin Plaza (Grando kávézó mellett)", city: "Budapest", zip: "1083", address: "Futó utca 37-45.", status: "available", distanceKm: "1.2 km" },
  { id: "fox_bp_03", provider: "foxpost", name: "FoxPost – Allee Plaza (Parkolóház)", city: "Budapest", zip: "1117", address: "Október 23. utca 8-10.", status: "available", distanceKm: "2.5 km" },
  { id: "pack_bp_01", provider: "packeta", name: "Packeta Z-BOX – Spar Széll Kálmán tér", city: "Budapest", zip: "1024", address: "Széll Kálmán tér 3.", status: "available", distanceKm: "0.8 km" },
  { id: "pack_bp_02", provider: "packeta", name: "Packeta Z-BOX – Tesco Fogarasi út", city: "Budapest", zip: "1148", address: "Fogarasi út 73.", status: "available", distanceKm: "3.1 km" },
  { id: "gls_bp_01", provider: "gls", name: "GLS Automat – OMV Benzinkút Hungária körút", city: "Budapest", zip: "1143", address: "Hungária krt. 120.", status: "available", distanceKm: "1.8 km" },
];

interface ShippingSelectorProps {
  onSelectParcelPoint: (machine: ParcelMachine) => void;
  selectedMachineId?: string;
}

export function ShippingSelector({ onSelectParcelPoint, selectedMachineId }: ShippingSelectorProps) {
  const [providerFilter, setProviderFilter] = useState<"all" | "foxpost" | "packeta" | "gls">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredMachines = MOCK_PARCEL_MACHINES.filter((m) => {
    const matchesProvider = providerFilter === "all" || m.provider === providerFilter;
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.zip.includes(searchQuery);
    return matchesProvider && matchesSearch;
  });

  return (
    <div className="space-y-4 bg-slate-50 dark:bg-slate-900/60 p-4 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-2xl bg-rose-100 dark:bg-rose-950/50 text-rose-600">
          <Truck className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-black text-sm text-slate-900 dark:text-slate-100">Csomagpont / Automataválasztó</h4>
          <p className="text-xs text-slate-500">Válassz a hozzád legközelebbi FoxPost, Packeta vagy GLS automata közül!</p>
        </div>
      </div>

      {/* Szolgáltató Szűrő Gombok */}
      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          onClick={() => setProviderFilter("all")}
          className={cn(
            "px-3 py-1.5 rounded-xl font-bold text-xs transition-all",
            providerFilter === "all" ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
          )}
        >
          Összes szolgáltató
        </button>
        <button
          type="button"
          onClick={() => setProviderFilter("foxpost")}
          className={cn(
            "px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5",
            providerFilter === "foxpost" ? "bg-red-600 text-white shadow-sm" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-red-400"
          )}
        >
          <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span> FoxPost
        </button>
        <button
          type="button"
          onClick={() => setProviderFilter("packeta")}
          className={cn(
            "px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5",
            providerFilter === "packeta" ? "bg-red-700 text-white shadow-sm" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-red-400"
          )}
        >
          <span className="w-2 h-2 rounded-full bg-red-600 inline-block"></span> Packeta / Z-BOX
        </button>
        <button
          type="button"
          onClick={() => setProviderFilter("gls")}
          className={cn(
            "px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5",
            providerFilter === "gls" ? "bg-amber-500 text-slate-950 shadow-sm" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-amber-400"
          )}
        >
          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span> GLS Automata
        </button>
      </div>

      {/* Kereső Mező */}
      <div className="relative">
        <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Keresés város, irányítószám vagy utca szerint (pl. Budapest 1062)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 text-xs rounded-2xl bg-white dark:bg-slate-800 border-slate-200"
        />
      </div>

      {/* Automata Lista */}
      <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
        {filteredMachines.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-500">
            Nincs a keresésnek megfelelő csomagpont. Próbálj meg más várost vagy irányítószámot megadni!
          </div>
        ) : (
          filteredMachines.map((m) => {
            const isSelected = m.id === selectedMachineId;

            return (
              <div
                key={m.id}
                onClick={() => onSelectParcelPoint(m)}
                className={cn(
                  "p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3",
                  isSelected
                    ? "bg-rose-50/80 dark:bg-rose-950/30 border-rose-500 shadow-xs"
                    : "bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80 hover:border-rose-300"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "p-2 rounded-xl text-white mt-0.5 flex-shrink-0 font-bold text-[10px]",
                    m.provider === "foxpost" ? "bg-red-600" : m.provider === "packeta" ? "bg-red-700" : "bg-amber-500 text-slate-950"
                  )}>
                    {m.provider.toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h5 className="font-extrabold text-xs text-slate-900 dark:text-slate-100">{m.name}</h5>
                      {m.distanceKm && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 font-semibold text-slate-600 dark:text-slate-300">
                          {m.distanceKm}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-rose-500" />
                      <span>{m.zip} {m.city}, {m.address}</span>
                    </p>
                  </div>
                </div>

                {isSelected ? (
                  <div className="flex items-center gap-1 text-xs font-bold text-rose-600 flex-shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-rose-600" />
                  </div>
                ) : (
                  <Button size="sm" variant="outline" className="text-xs rounded-xl h-8 font-bold">
                    Kiválaszt
                  </Button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

import { useState } from "react";
import { X, Layers, Check, Sparkles, ExternalLink, SlidersHorizontal } from "lucide-react";
import { useComparison, RealEstateSpecs, VehicleSpecs, ProviderSpecs } from "@/context/ComparisonContext";
import { Link } from "wouter";

export function ComparisonModal() {
  const { comparisonList, activeModule, isModalOpen, setModalOpen, removeFromCompare, clearCompare } = useComparison();
  const [highlightDiffs, setHighlightDiffs] = useState(false);

  if (!isModalOpen || comparisonList.length === 0) return null;

  const isRealEstate = activeModule === "realestate";
  const isVehicles = activeModule === "vehicles";
  const isProviders = activeModule === "providers";

  // Build spec keys for matrix
  let specRows: { key: string; label: string; format?: (val: any) => string }[] = [];

  if (isRealEstate) {
    specRows = [
      { key: "price", label: "Ár", format: (v) => v ? `${Number(v).toLocaleString("hu-HU")} Ft` : "-" },
      { key: "pricePerSqm", label: "Ft / m²", format: (v) => v ? `${Number(v).toLocaleString("hu-HU")} Ft/m²` : "-" },
      { key: "areaSqm", label: "Alapterület", format: (v) => v ? `${v} m²` : "-" },
      { key: "rooms", label: "Szobák száma" },
      { key: "condition", label: "Állapot" },
      { key: "location", label: "Lokáció" },
      { key: "energyRating", label: "Energetika" },
      { key: "heating", label: "Fűtés típusa" },
      { key: "balcony", label: "Erkély / Terasz", format: (v) => v ? "Van" : "Nincs" },
      { key: "elevator", label: "Lift", format: (v) => v ? "Van" : "Nincs" }
    ];
  } else if (isVehicles) {
    specRows = [
      { key: "price", label: "Vételár", format: (v) => v ? `${Number(v).toLocaleString("hu-HU")} Ft` : "-" },
      { key: "year", label: "Évjárat" },
      { key: "mileageKm", label: "Futott km", format: (v) => v ? `${Number(v).toLocaleString("hu-HU")} km` : "-" },
      { key: "engine", label: "Motor / Hengerűrtartalom" },
      { key: "powerHp", label: "Teljesítmény", format: (v) => v ? `${v} LE` : "-" },
      { key: "fuel", label: "Üzemanyag" },
      { key: "transmission", label: "Váltó" },
      { key: "color", label: "Szín" },
      { key: "warranty", label: "Garancia", format: (v) => v ? "Érvényes garancia" : "Nincs" }
    ];
  } else if (isProviders) {
    specRows = [
      { key: "rating", label: "Értékelés", format: (v) => v ? `⭐ ${v}` : "-" },
      { key: "reviewCount", label: "Vélemények száma", format: (v) => v ? `${v} értékelés` : "-" },
      { key: "priceLevel", label: "Árkategória" },
      { key: "distanceKm", label: "Távolság", format: (v) => v !== undefined ? `${v} km` : "-" },
      { key: "nextAvailableSlot", label: "Következő időpont" },
      { key: "city", label: "Település" },
      { key: "tier", label: "Tagság szint" }
    ];
  }

  const valuesAreDifferent = (key: string) => {
    if (comparisonList.length <= 1) return false;
    const firstVal = (comparisonList[0].specs as any)[key];
    return comparisonList.some((item) => (item.specs as any)[key] !== firstVal);
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 md:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-5xl w-full my-auto overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 md:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-600 text-white shadow-md">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg md:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                Összehasonlító Mátrix ({comparisonList.length} elem)
              </h3>
              <p className="text-xs font-semibold text-slate-500">
                Párhuzamos összehasonlítás · {isRealEstate ? "Ingatlanok" : isVehicles ? "Járművek" : "Szolgáltatók"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="hidden sm:flex items-center gap-2 text-xs font-extrabold text-slate-600 dark:text-slate-300 cursor-pointer bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-600" />
              <span>Eltérések kiemelése</span>
              <input
                type="checkbox"
                checked={highlightDiffs}
                onChange={(e) => setHighlightDiffs(e.target.checked)}
                className="accent-emerald-600"
              />
            </label>

            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Comparison Grid Table */}
        <div className="flex-1 overflow-auto p-4 md:p-6">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="p-3 text-left text-xs font-black uppercase tracking-wider text-slate-400 border-b border-slate-200 dark:border-slate-800 w-44">
                  Paraméter
                </th>
                {comparisonList.map((item) => (
                  <th
                    key={item.id}
                    className="p-3 border-b border-slate-200 dark:border-slate-800 min-w-[200px] max-w-[260px] align-top text-left"
                  >
                    <div className="space-y-2 relative group">
                      <button
                        type="button"
                        onClick={() => removeFromCompare(item.id)}
                        className="absolute -top-1 -right-1 p-1 rounded-lg bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400 hover:bg-rose-600 hover:text-white transition"
                        title="Eltávolítás"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>

                      {item.image && (
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-full h-28 object-cover rounded-xl border border-slate-200 dark:border-slate-700"
                        />
                      )}
                      <div>
                        <h4 className="text-xs md:text-sm font-black text-slate-900 dark:text-white line-clamp-2">
                          {item.title}
                        </h4>
                        {item.subtitle && (
                          <p className="text-[11px] font-semibold text-slate-500 truncate mt-0.5">
                            {item.subtitle}
                          </p>
                        )}
                      </div>
                      <Link
                        href={item.url}
                        onClick={() => setModalOpen(false)}
                        className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-600 hover:underline pt-1"
                      >
                        <span>Megtekintés</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {specRows.map((row) => {
                const isDiff = valuesAreDifferent(row.key);
                return (
                  <tr
                    key={row.key}
                    className={`transition ${
                      highlightDiffs && isDiff
                        ? "bg-amber-50/70 dark:bg-amber-950/30"
                        : "hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                    }`}
                  >
                    <td className="p-3 text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-50/30 dark:bg-slate-950/30">
                      {row.label}
                      {highlightDiffs && isDiff && (
                        <span className="ml-1 text-[9px] px-1.5 py-0.5 rounded bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200 font-extrabold">
                          Eltérés
                        </span>
                      )}
                    </td>
                    {comparisonList.map((item) => {
                      const rawVal = (item.specs as any)[row.key];
                      const displayVal = row.format ? row.format(rawVal) : String(rawVal ?? "-");
                      return (
                        <td key={item.id} className="p-3 text-xs font-black text-slate-900 dark:text-white">
                          {displayVal}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={clearCompare}
            className="text-xs font-extrabold text-rose-600 hover:underline"
          >
            Összes elem eltávolítása
          </button>

          <button
            type="button"
            onClick={() => setModalOpen(false)}
            className="px-5 py-2 rounded-xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-bold hover:opacity-90 transition"
          >
            Bezárás
          </button>
        </div>
      </div>
    </div>
  );
}

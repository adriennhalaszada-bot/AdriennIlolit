import { X, Scale, Check, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ComparisonVehicle } from "./VehicleComparisonBar";

interface VehicleComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicles: ComparisonVehicle[];
  onRemoveVehicle: (id: string) => void;
  onSelectVehicleDetail?: (vehicle: ComparisonVehicle) => void;
}

export function VehicleComparisonModal({
  isOpen,
  onClose,
  vehicles,
  onRemoveVehicle,
  onSelectVehicleDetail,
}: VehicleComparisonModalProps) {
  if (!isOpen) return null;

  const compareRows = [
    { label: "Vételár", key: "price", format: (v: ComparisonVehicle) => <strong className="text-emerald-600 dark:text-emerald-400 font-black text-base">{v.price}</strong> },
    { label: "Évjárat", key: "year", format: (v: ComparisonVehicle) => v.year ? `${v.year} év` : "N.A." },
    { label: "Futásteljesítmény", key: "km", format: (v: ComparisonVehicle) => v.km ? `${v.km.toLocaleString()} km` : "N.A." },
    { label: "Üzemanyag", key: "fuel", format: (v: ComparisonVehicle) => v.fuel || "Benzin" },
    { label: "Váltó típus", key: "transmission", format: (v: ComparisonVehicle) => v.transmission || "Manuális" },
    { label: "Teljesítmény", key: "power", format: (v: ComparisonVehicle) => v.power || "110 LE" },
    { label: "Hirdető", key: "seller", format: (v: ComparisonVehicle) => v.seller || "Hivatalos kereskedő" },
    { label: "Település", key: "location", format: (v: ComparisonVehicle) => v.location || "Magyarország" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl relative my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-6 border-b flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 rounded-2xl">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                Járművek Összehasonlítása
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Párhuzamos összehasonlítás max. 4 járműre
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded-full flex items-center justify-center transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Table */}
        <div className="p-6 overflow-x-auto overflow-y-auto flex-1">
          {vehicles.length === 0 ? (
            <div className="text-center py-12 text-slate-400 font-extrabold">
              Nincs kiválasztva összehasonlítandó jármű.
            </div>
          ) : (
            <table className="w-full border-collapse min-w-[600px]">
              <thead>
                <tr>
                  <th className="p-3 text-left text-xs font-black uppercase text-slate-400 w-44">
                    Jellemzők
                  </th>
                  {vehicles.map((vehicle) => (
                    <th key={vehicle.id} className="p-3 text-left align-top min-w-[180px]">
                      <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 relative group">
                        <button
                          type="button"
                          onClick={() => onRemoveVehicle(vehicle.id)}
                          className="absolute top-2 right-2 p-1 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950 transition"
                          title="Eltávolítás"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <div className="aspect-video rounded-xl overflow-hidden bg-slate-100">
                          <img
                            src={vehicle.image}
                            alt={vehicle.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <h4 className="font-extrabold text-sm text-slate-900 dark:text-white line-clamp-2 leading-snug">
                          {vehicle.title}
                        </h4>
                        {onSelectVehicleDetail && (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              onClose();
                              onSelectVehicleDetail(vehicle);
                            }}
                            className="w-full text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-1 h-8"
                          >
                            Részletek
                          </Button>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {compareRows.map((row, idx) => (
                  <tr
                    key={row.key}
                    className={idx % 2 === 0 ? "bg-slate-50/50 dark:bg-slate-900/30" : "bg-transparent"}
                  >
                    <td className="p-3 text-xs font-black text-slate-600 dark:text-slate-400 border-t">
                      {row.label}
                    </td>
                    {vehicles.map((vehicle) => (
                      <td key={vehicle.id} className="p-3 text-xs font-bold text-slate-800 dark:text-slate-200 border-t">
                        {row.format(vehicle)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

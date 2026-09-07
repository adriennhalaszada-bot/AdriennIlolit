import { Scale, X, ArrowRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ComparisonVehicle {
  id: string;
  title: string;
  price: string;
  priceNum: number;
  year?: number;
  km?: number;
  fuel?: string;
  transmission?: string;
  power?: string;
  image: string;
  seller?: string;
  location?: string;
}

interface VehicleComparisonBarProps {
  selectedVehicles: ComparisonVehicle[];
  onRemoveVehicle: (id: string) => void;
  onClearAll: () => void;
  onOpenModal: () => void;
}

export function VehicleComparisonBar({
  selectedVehicles,
  onRemoveVehicle,
  onClearAll,
  onOpenModal,
}: VehicleComparisonBarProps) {
  if (selectedVehicles.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-full max-w-4xl px-4 animate-in slide-in-from-bottom duration-300">
      <div className="bg-slate-900/95 backdrop-blur-md text-white border border-slate-700/80 rounded-3xl p-3.5 shadow-2xl flex items-center justify-between gap-4">
        {/* Selected count badge */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-black uppercase text-emerald-400 tracking-wider">
              Jármű-összehasonlítás
            </div>
            <div className="text-xs font-bold text-slate-300">
              {selectedVehicles.length} / 4 kiválasztva
            </div>
          </div>
        </div>

        {/* Selected vehicles thumbnail avatars */}
        <div className="flex items-center gap-2 overflow-x-auto py-1">
          {selectedVehicles.map((vehicle) => (
            <div
              key={vehicle.id}
              className="relative group shrink-0 w-12 h-12 rounded-xl overflow-hidden border border-slate-700 bg-slate-800"
            >
              <img
                src={vehicle.image}
                alt={vehicle.title}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => onRemoveVehicle(vehicle.id)}
                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white"
                title="Eltávolítás"
              >
                <X className="w-4 h-4 text-rose-400" />
              </button>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="text-xs font-bold text-slate-400 hover:text-white rounded-xl"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" /> Törlés
          </Button>
          <Button
            type="button"
            onClick={onOpenModal}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 px-4"
          >
            Összehasonlítás ({selectedVehicles.length}) <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

import { Layers, X, ArrowRight, Trash2 } from "lucide-react";
import { useComparison } from "@/context/ComparisonContext";

export function ComparisonBar() {
  const { comparisonList, activeModule, removeFromCompare, clearCompare, setModalOpen, totalCount } = useComparison();

  if (totalCount === 0) return null;

  const MODULE_LABELS: Record<string, string> = {
    realestate: "Ingatlanok",
    vehicles: "Járművek",
    providers: "Szolgáltatók & Szépségipar",
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[999] max-w-xl w-[92%] bg-slate-900 text-white p-3 md:p-4 rounded-2xl shadow-2xl border border-emerald-500/40 backdrop-blur flex items-center justify-between gap-3 animate-in slide-in-from-bottom duration-200">
      <div className="flex items-center gap-3 overflow-hidden">
        <div className="p-2 rounded-xl bg-emerald-600 text-white shrink-0">
          <Layers className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase text-emerald-400 tracking-wider">
              Összehasonlítás ({totalCount}/4)
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 font-bold text-slate-300">
              {MODULE_LABELS[activeModule || ""] || activeModule}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-1 overflow-x-auto no-scrollbar">
            {comparisonList.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-[11px] font-bold shrink-0 max-w-[140px] truncate"
              >
                <span className="truncate">{item.title}</span>
                <button
                  type="button"
                  onClick={() => removeFromCompare(item.id)}
                  className="text-slate-400 hover:text-rose-400 ml-1 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={clearCompare}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          title="Törlés mind"
        >
          <Trash2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 shadow transition cursor-pointer"
        >
          <span>Összehasonlítás</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

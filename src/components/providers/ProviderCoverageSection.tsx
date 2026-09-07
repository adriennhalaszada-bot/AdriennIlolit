import React from 'react';
import { MapPin, Navigation, Home, Car, Compass, CheckCircle2 } from 'lucide-react';

export interface CoverageAreaConfig {
  mode: 'saját_helyszín' | 'kiszállás' | 'mindkettő';
  baseSettlement: string; // Base location, e.g. Miskolc
  baseAddress?: string; // Optional exact address
  coveredSettlements?: string[]; // Served settlements list
  customRadiusKm?: number; // e.g. 30 km
  calloutFeeDescription?: string; // Optional callout fee details
}

interface ProviderCoverageSectionProps {
  coverage: CoverageAreaConfig;
  className?: string;
}

export const ProviderCoverageSection: React.FC<ProviderCoverageSectionProps> = ({
  coverage,
  className = '',
}) => {
  const modeLabels = {
    saját_helyszín: 'Csak saját helyszínen / szalonban',
    kiszállás: 'Kiszállással a megrendelőnél',
    mindkettő: 'Saját helyszínen ÉS Kiszállással is',
  };

  const modeIcons = {
    saját_helyszín: Home,
    kiszállás: Car,
    mindkettő: Compass,
  };

  const ModeIcon = modeIcons[coverage.mode] || MapPin;

  return (
    <div className={`bg-slate-900/90 border border-slate-800 rounded-2xl p-4 text-slate-100 shadow-lg ${className}`}>
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Navigation size={18} />
          </div>
          <div>
            <h4 className="font-bold text-sm text-slate-100">Szolgáltatási Terület & Helyszín</h4>
            <p className="text-[11px] text-slate-400">A szolgáltató által megadott munkavégzési körzet</p>
          </div>
        </div>
        <span className="text-[10px] font-bold text-amber-400 bg-amber-950/60 border border-amber-800/80 px-2.5 py-1 rounded-full flex items-center gap-1">
          <ModeIcon size={12} />
          {modeLabels[coverage.mode]}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        {/* Szalon / Telephely */}
        <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
          <div className="text-slate-400 text-[11px] font-semibold mb-1 flex items-center gap-1">
            <Home size={13} className="text-amber-400" /> Bázis telephely / Szalon:
          </div>
          <div className="font-bold text-slate-100 text-sm">{coverage.baseSettlement}</div>
          {coverage.baseAddress && (
            <div className="text-[11px] text-slate-400 mt-0.5">{coverage.baseAddress}</div>
          )}
        </div>

        {/* Kiszállási sugár / km kör */}
        {(coverage.mode === 'kiszállás' || coverage.mode === 'mindkettő') && (
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
            <div className="text-slate-400 text-[11px] font-semibold mb-1 flex items-center gap-1">
              <Car size={13} className="text-amber-400" /> Kiszállási sugár (egyéni km-kör):
            </div>
            <div className="font-bold text-amber-400 text-sm">
              {coverage.customRadiusKm ? `${coverage.customRadiusKm} km-es körzetben` : 'Egész megyében'}
            </div>
            {coverage.calloutFeeDescription && (
              <div className="text-[11px] text-slate-400 mt-0.5">{coverage.calloutFeeDescription}</div>
            )}
          </div>
        )}
      </div>

      {/* Lefedett települések listája */}
      {coverage.coveredSettlements && coverage.coveredSettlements.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-800/80">
          <div className="text-slate-400 text-[11px] font-semibold mb-1.5 flex items-center gap-1">
            <MapPin size={13} className="text-amber-400" /> Kiemelt lefedett települések:
          </div>
          <div className="flex flex-wrap gap-1.5">
            {coverage.coveredSettlements.map((town, idx) => (
              <span
                key={idx}
                className="text-[11px] font-medium bg-slate-800 border border-slate-700/80 text-slate-200 px-2 py-0.5 rounded-lg flex items-center gap-1"
              >
                <CheckCircle2 size={11} className="text-emerald-400" />
                {town}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

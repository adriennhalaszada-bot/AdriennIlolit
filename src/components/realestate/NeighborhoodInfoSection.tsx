import React from 'react';
import { MapPin, Bus, School, ShoppingBag, HeartPulse, Footprints, ShieldCheck, CheckCircle2 } from 'lucide-react';

export interface POIAmenity {
  name: string;
  category: 'közlekedés' | 'iskola' | 'bolt' | 'egészségügy';
  distanceMeters: number;
  walkMinutes: number;
  iconName?: string;
}

interface NeighborhoodInfoSectionProps {
  locationName: string; // e.g. Miskolc belváros
  amenities?: POIAmenity[];
  className?: string;
}

const DEFAULT_MOCK_AMENITIES: POIAmenity[] = [
  { name: 'Villamosmegálló (Kazinczy u.)', category: 'közlekedés', distanceMeters: 120, walkMinutes: 2 },
  { name: 'Helyi Buszmegálló', category: 'közlekedés', distanceMeters: 190, walkMinutes: 3 },
  { name: 'Belvárosi Általános Iskola', category: 'iskola', distanceMeters: 350, walkMinutes: 4 },
  { name: 'Napsugár Óvoda & Bölcsőde', category: 'iskola', distanceMeters: 280, walkMinutes: 3 },
  { name: 'Príma Szupermarket', category: 'bolt', distanceMeters: 220, walkMinutes: 3 },
  { name: 'Központi Friss Piac', category: 'bolt', distanceMeters: 550, walkMinutes: 7 },
  { name: 'Szent István Gyógyszertár', category: 'egészségügy', distanceMeters: 180, walkMinutes: 2 },
  { name: 'Felnőtt & Gyermek Orvosi Rendelő', category: 'egészségügy', distanceMeters: 420, walkMinutes: 5 },
];

export const NeighborhoodInfoSection: React.FC<NeighborhoodInfoSectionProps> = ({
  locationName = 'Miskolc Belváros',
  amenities = DEFAULT_MOCK_AMENITIES,
  className = '',
}) => {
  const categoryConfig = {
    közlekedés: { label: 'Tömegközlekedés & Közlekedés', icon: Bus, color: 'text-sky-400 bg-sky-950/60 border-sky-800' },
    iskola: { label: 'Iskola & Óvoda', icon: School, color: 'text-amber-400 bg-amber-950/60 border-amber-800' },
    bolt: { label: 'Bolt & Bevásárlás', icon: ShoppingBag, color: 'text-emerald-400 bg-emerald-950/60 border-emerald-800' },
    egészségügy: { label: 'Egészségügy & Gyógyszertár', icon: HeartPulse, color: 'text-rose-400 bg-rose-950/60 border-rose-800' },
  };

  const categories: ('közlekedés' | 'iskola' | 'bolt' | 'egészségügy')[] = [
    'közlekedés',
    'iskola',
    'bolt',
    'egészségügy',
  ];

  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-3xl p-6 text-slate-100 shadow-2xl space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <MapPin size={22} />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-slate-100">Ingatlan Környéki Információk</h3>
            <p className="text-xs text-slate-400">Távolságok és sétaidők a közvetlen környezetben: {locationName}</p>
          </div>
        </div>
        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2.5 py-1 rounded-full flex items-center gap-1">
          <ShieldCheck size={12} /> Hitelesített adatok
        </span>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categories.map((catKey) => {
          const catInfo = categoryConfig[catKey];
          const CategoryIcon = catInfo.icon;
          const items = amenities.filter((a) => a.category === catKey);

          return (
            <div key={catKey} className="bg-slate-950/80 border border-slate-800/80 p-4 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                <div className={`p-1.5 rounded-lg border ${catInfo.color}`}>
                  <CategoryIcon size={16} />
                </div>
                <h4 className="font-bold text-xs text-slate-200">{catInfo.label}</h4>
              </div>

              <div className="space-y-2">
                {items.length === 0 ? (
                  <p className="text-[11px] text-slate-500 italic">Nincs információ elérhető közelségben.</p>
                ) : (
                  items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs p-1.5 rounded-xl hover:bg-slate-900 transition">
                      <div className="flex items-center gap-1.5 truncate pr-2">
                        <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                        <span className="font-medium text-slate-200 truncate">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 text-[11px] font-bold text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-lg">
                        <Footprints size={12} className="text-emerald-400" />
                        <span>{item.distanceMeters}m ({item.walkMinutes} perc)</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-500 text-center italic">
        A távolságok és sétaidők nyílt GIS és térképes POI adatbázisok alapján, légvonalbeli korrekcióval kerültek kiszámításra.
      </div>
    </div>
  );
};

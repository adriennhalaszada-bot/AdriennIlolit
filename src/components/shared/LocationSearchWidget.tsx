import { useState, useRef } from "react";
import { MapPin, Navigation, CheckCircle2, AlertTriangle, Loader2, X } from "lucide-react";
import { HUNGARIAN_CITIES, HUNGARIAN_COUNTY_SEATS } from "@/data/carData";
import { LocationSearchState, getEffectiveRadius, getFormattedCitySuggestions } from "@/lib/locationFilter";
import { useLocationSearch, GpsStatus } from "@/hooks/useLocationSearch";

const PRESET_RADII = [5, 10, 25, 50, 100];

type AccentColor = "emerald" | "blue" | "rose" | "teal" | "violet";

interface LocationSearchWidgetProps {
  value: LocationSearchState;
  onChange: (state: LocationSearchState) => void;
  accentColor?: AccentColor;
  /** compact = sidebar style; false = hero search card style */
  compact?: boolean;
  label?: string;
}

const ACCENT: Record<AccentColor, { ring: string; btn: string; badge: string; tab: string }> = {
  emerald: {
    ring:  "focus:ring-emerald-500",
    btn:   "bg-emerald-600 hover:bg-emerald-700 text-white",
    badge: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    tab:   "bg-emerald-600 text-white",
  },
  blue: {
    ring:  "focus:ring-blue-500",
    btn:   "bg-blue-600 hover:bg-blue-700 text-white",
    badge: "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    tab:   "bg-blue-600 text-white",
  },
  rose: {
    ring:  "focus:ring-rose-500",
    btn:   "bg-rose-600 hover:bg-rose-700 text-white",
    badge: "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800",
    tab:   "bg-rose-600 text-white",
  },
  teal: {
    ring:  "focus:ring-teal-500",
    btn:   "bg-teal-600 hover:bg-teal-700 text-white",
    badge: "bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800",
    tab:   "bg-teal-600 text-white",
  },
  violet: {
    ring:  "focus:ring-violet-500",
    btn:   "bg-violet-600 hover:bg-violet-700 text-white",
    badge: "bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800",
    tab:   "bg-violet-600 text-white",
  },
};

function GpsStatusBadge({
  status,
  city,
  accuracyM,
  onConfirm,
  onDismiss,
  onEdit,
  accent,
}: {
  status: GpsStatus;
  city: string | null;
  accuracyM: number | null;
  onConfirm: () => void;
  onDismiss: () => void;
  onEdit: () => void;
  accent: typeof ACCENT[AccentColor];
}) {
  if (status === "idle") return null;

  if (status === "loading") {
    return (
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mt-1.5">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Helyzet meghatározása...
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400 mt-1.5">
        <AlertTriangle className="w-3.5 h-3.5" />
        Helymeghatározás megtagadva – add meg a települést manuálisan.
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex items-center gap-2 text-xs font-semibold text-red-600 dark:text-red-400 mt-1.5">
        <AlertTriangle className="w-3.5 h-3.5" />
        Nem sikerült meghatározni a helyzeted. Írd be a települést manuálisan.
      </div>
    );
  }

  if (status === "uncertain" && city) {
    return (
      <div className="flex flex-wrap items-center gap-2 mt-1.5 p-2 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 text-xs font-semibold text-amber-700 dark:text-amber-300">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
        <span>Becsült helyzet: <strong>{city}</strong></span>
        {accuracyM && <span className="opacity-60">(±{(accuracyM / 1000).toFixed(1)} km)</span>}
        <button onClick={onConfirm} className="ml-auto px-2 py-0.5 rounded-lg bg-amber-600 text-white text-[10px] font-bold hover:bg-amber-700 transition">
          Megerősítés
        </button>
        <button onClick={onDismiss} className="p-0.5 hover:text-amber-900 transition">
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  }

  if (status === "confirmed" && city) {
    return (
      <div className={`flex items-center gap-2 mt-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold ${accent.badge}`}>
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
        <span>Helyzeted: <strong>{city}</strong></span>
        <button onClick={onEdit} className="ml-auto underline text-[10px] opacity-70 hover:opacity-100 transition">
          Módosítás
        </button>
      </div>
    );
  }

  return null;
}

export function LocationSearchWidget({
  value,
  onChange,
  accentColor = "blue",
  compact = true,
  label = "Hol keresel?",
}: LocationSearchWidgetProps) {
  const accent = ACCENT[accentColor];
  const cityInputRef = useRef<HTMLInputElement>(null);

  // Internal GPS state (does not change the parent value until confirmed)
  const locationSearch = useLocationSearch(value);

  // Propagate changes upward
  const update = (patch: Partial<LocationSearchState>) => {
    onChange({ ...value, ...patch });
  };

  const inputBase =
    "w-full px-3 py-2 border rounded-xl text-xs bg-white dark:bg-slate-950 font-semibold outline-none focus:ring-2 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white";

  const isCity = value.mode === "city";
  const isRadius = value.mode === "radius";
  const effectiveRadius = getEffectiveRadius(value);
  const isCustomRadius = value.customRadiusKm !== null;
  const [showCustomInput, setShowCustomInput] = useState(isCustomRadius);

  // GPS handlers that sync back to parent
  const handleGpsRequest = () => {
    locationSearch.requestGps();
  };

  const handleGpsConfirm = () => {
    locationSearch.confirmGpsCity();
    if (locationSearch.gpsDetectedCity) {
      onChange({ ...value, cityInput: locationSearch.gpsDetectedCity });
    }
  };

  const handleGpsEdit = () => {
    locationSearch.dismissGps();
    setTimeout(() => cityInputRef.current?.focus(), 50);
  };

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      {/* Label */}
      <div className="flex items-center gap-1.5">
        <MapPin className="w-3.5 h-3.5 text-slate-400" />
        <span className={`font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 ${compact ? "text-[11px]" : "text-xs"}`}>
          {label}
        </span>
      </div>

      {/* Mode Toggle */}
      <div className="flex rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 text-xs font-extrabold">
        <button
          type="button"
          onClick={() => update({ mode: "city" })}
          className={`flex-1 py-2 px-3 transition-all ${
            isCity
              ? `${accent.tab}`
              : "bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
          }`}
        >
          🏙️ Település szerint
        </button>
        <button
          type="button"
          onClick={() => update({ mode: "radius" })}
          className={`flex-1 py-2 px-3 transition-all border-l border-slate-200 dark:border-slate-700 ${
            isRadius
              ? `${accent.tab}`
              : "bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
          }`}
        >
          📍 Távolság szerint
        </button>
      </div>

      {/* City mode */}
      {isCity && (
        <div className="space-y-2">
          <div className="relative">
            <input
              ref={cityInputRef}
              type="text"
              list="ilolit-hu-cities-datalist"
              placeholder="Írd be a települést... (pl. Miskolc, Debrecen)"
              value={value.cityInput}
              onChange={(e) => {
                update({ cityInput: e.target.value });
                locationSearch.dismissGps();
              }}
              className={`${inputBase} ${accent.ring} pr-8`}
            />
            {value.cityInput && (
              <button
                type="button"
                onClick={() => update({ cityInput: "" })}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <datalist id="ilolit-hu-cities-datalist">
            {getFormattedCitySuggestions().map(({ city, label }) => (
              <option key={city} value={city}>
                {label}
              </option>
            ))}
          </datalist>

          {/* Quick county seats */}
          <select
            value={
              value.cityInput &&
              HUNGARIAN_COUNTY_SEATS.includes(value.cityInput)
                ? value.cityInput
                : ""
            }
            onChange={(e) => {
              if (e.target.value) update({ cityInput: e.target.value });
            }}
            className={`${inputBase} ${accent.ring} cursor-pointer`}
          >
            <option value="">Megyeszékhelyek gyorsválasztó...</option>
            {HUNGARIAN_COUNTY_SEATS.map((seat) => (
              <option key={seat} value={seat}>
                📍 {seat}
              </option>
            ))}
          </select>

          {/* GPS button */}
          <button
            type="button"
            onClick={handleGpsRequest}
            disabled={locationSearch.gpsStatus === "loading"}
            className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition ${
              locationSearch.gpsStatus === "confirmed"
                ? `border-transparent ${accent.btn}`
                : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            } disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            <Navigation className="w-3.5 h-3.5" />
            {locationSearch.gpsStatus === "loading"
              ? "Helyzet meghatározása..."
              : "📍 Saját településem"}
          </button>

          <GpsStatusBadge
            status={locationSearch.gpsStatus}
            city={locationSearch.gpsDetectedCity}
            accuracyM={locationSearch.gpsAccuracyM}
            onConfirm={handleGpsConfirm}
            onDismiss={locationSearch.dismissGps}
            onEdit={handleGpsEdit}
            accent={accent}
          />

          {!value.cityInput && locationSearch.gpsStatus === "idle" && (
            <p className="text-[10px] text-slate-400 font-medium">
              Nincs megadva – összes találat megjelenítve.
            </p>
          )}
        </div>
      )}

      {/* Radius mode */}
      {isRadius && (
        <div className="space-y-2.5">
          {/* Kiindulási hely input */}
          <div>
            <label className="text-[10px] font-extrabold text-slate-400 mb-1 block">
              Kiindulási hely
            </label>
            <div className="relative">
              <input
                type="text"
                list="ilolit-hu-cities-datalist"
                placeholder="Írd be a kiindulási várost..."
                value={value.cityInput}
                onChange={(e) => update({ cityInput: e.target.value })}
                className={`${inputBase} ${accent.ring} pr-8`}
              />
              {value.cityInput && (
                <button
                  type="button"
                  onClick={() => update({ cityInput: "" })}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* GPS for radius mode */}
            <button
              type="button"
              onClick={handleGpsRequest}
              disabled={locationSearch.gpsStatus === "loading"}
              className="mt-1.5 w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition disabled:opacity-60"
            >
              <Navigation className="w-3.5 h-3.5" />
              📍 Jelenlegi helyzetem
            </button>

            <GpsStatusBadge
              status={locationSearch.gpsStatus}
              city={locationSearch.gpsDetectedCity}
              accuracyM={locationSearch.gpsAccuracyM}
              onConfirm={handleGpsConfirm}
              onDismiss={locationSearch.dismissGps}
              onEdit={handleGpsEdit}
              accent={accent}
            />
          </div>

          {/* Preset radius buttons */}
          <div>
            <label className="text-[10px] font-extrabold text-slate-400 mb-1.5 block">
              Távolság
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_RADII.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    update({ radiusKm: r, customRadiusKm: null });
                    setShowCustomInput(false);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold border transition ${
                    !isCustomRadius && value.radiusKm === r
                      ? `${accent.tab} border-transparent`
                      : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  {r} km
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setShowCustomInput(true);
                  if (!isCustomRadius) {
                    update({ customRadiusKm: value.radiusKm });
                  }
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold border transition ${
                  isCustomRadius
                    ? `${accent.tab} border-transparent`
                    : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                Egyéni
              </button>
            </div>
          </div>

          {/* Custom radius input + slider */}
          {(showCustomInput || isCustomRadius) && (
            <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <label className="text-[10px] font-extrabold text-slate-500 whitespace-nowrap">
                  Egyéni távolság:
                </label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={value.customRadiusKm ?? value.radiusKm}
                  onChange={(e) => {
                    const v = Math.max(1, Math.min(500, Number(e.target.value)));
                    update({ customRadiusKm: v });
                  }}
                  className={`w-20 px-2 py-1 border rounded-lg text-xs font-bold text-center bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 outline-none focus:ring-2 ${accent.ring}`}
                />
                <span className="text-xs font-bold text-slate-500">km</span>
              </div>
              <input
                type="range"
                min={1}
                max={500}
                step={1}
                value={value.customRadiusKm ?? value.radiusKm}
                onChange={(e) => update({ customRadiusKm: Number(e.target.value) })}
                className="w-full accent-current"
              />
              <div className="flex justify-between text-[9px] text-slate-400 font-medium">
                <span>1 km</span>
                <span className="font-extrabold text-slate-600 dark:text-slate-300">
                  {value.customRadiusKm ?? value.radiusKm} km
                </span>
                <span>500 km</span>
              </div>
            </div>
          )}

          {/* Active filter summary */}
          {value.cityInput && (
            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-extrabold ${accent.badge}`}>
              <MapPin className="w-3 h-3 shrink-0" />
              <span>
                {value.cityInput} · max{" "}
                <strong>{effectiveRadius} km</strong>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

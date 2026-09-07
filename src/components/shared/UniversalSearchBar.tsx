import { useState } from "react";
import { useLocation } from "wouter";
import { Search, MapPin, Sparkles, X } from "lucide-react";
import { getFormattedCitySuggestions } from "@/lib/locationFilter";

interface UniversalSearchBarProps {
  initialQuery?: string;
  initialCity?: string;
  compact?: boolean;
  className?: string;
}

export function UniversalSearchBar({
  initialQuery = "",
  initialCity = "",
  compact = false,
  className = "",
}: UniversalSearchBarProps) {
  const [query, setQuery] = useState(initialQuery);
  const [city, setCity] = useState(initialCity);
  const [, navigate] = useLocation();

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (city.trim()) params.set("city", city.trim());
    navigate(`/universal-search?${params.toString()}`);
  };

  return (
    <form
      onSubmit={handleSearch}
      className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-lg p-2 flex flex-col md:flex-row items-center gap-2 transition-all ${className}`}
    >
      {/* Query input */}
      <div className="flex-1 flex items-center gap-2.5 px-3 py-2 w-full">
        <Search className="w-4 h-4 text-emerald-600 shrink-0" />
        <input
          type="text"
          placeholder="Keresés az ILOLIT platformon (termék, ingatlan, autó, szaki, kurzus)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full text-xs md:text-sm font-semibold bg-transparent outline-none text-slate-900 dark:text-white placeholder:text-slate-400"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="hidden md:block w-px h-8 bg-slate-200 dark:bg-slate-800 shrink-0" />

      {/* Settlement input */}
      <div className="flex items-center gap-2 px-3 py-2 w-full md:w-56 shrink-0">
        <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
        <input
          type="text"
          list="universal-cities-datalist"
          placeholder="Település (pl. Miskolc)"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="w-full text-xs md:text-sm font-semibold bg-transparent outline-none text-slate-900 dark:text-white placeholder:text-slate-400"
        />
        <datalist id="universal-cities-datalist">
          {getFormattedCitySuggestions().slice(0, 200).map(({ city, label }) => (
            <option key={city} value={city}>
              {label}
            </option>
          ))}
        </datalist>
        {city && (
          <button
            type="button"
            onClick={() => setCity("")}
            className="text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Submit button */}
      <button
        type="submit"
        className="w-full md:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs md:text-sm flex items-center justify-center gap-2 shadow-md transition cursor-pointer shrink-0"
      >
        <Sparkles className="w-4 h-4" />
        <span>Keresés</span>
      </button>
    </form>
  );
}

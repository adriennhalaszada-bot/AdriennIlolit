import React from "react";
import { Search, MapPin, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface UnifiedModuleHeaderProps {
  title: string;
  subtitle: string;
  moduleKey?: "marketplace" | "beauty" | "services" | "realestate" | "vehicles" | "education";
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  onSearchSubmit?: (e: React.FormEvent) => void;
  locationValue?: string;
  onLocationChange?: (val: string) => void;
  sortValue?: string;
  onSortChange?: (val: string) => void;
  categories?: { id: string; label: string }[];
  activeCategory?: string;
  onCategoryChange?: (id: string) => void;
  extraFilters?: React.ReactNode;
}

export const UnifiedModuleHeader: React.FC<UnifiedModuleHeaderProps> = ({
  title,
  subtitle,
  searchPlaceholder = "Keresés...",
  searchValue = "",
  onSearchChange,
  onSearchSubmit,
  locationValue,
  onLocationChange,
  sortValue = "relevance",
  onSortChange,
  categories,
  activeCategory,
  onCategoryChange,
  extraFilters,
}) => {
  return (
    <div className="w-full bg-white border-b border-slate-200 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Title & Subtitle */}
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900">
            {title}
          </h1>
          <p className="text-base sm:text-lg text-slate-600 max-w-3xl leading-relaxed">
            {subtitle}
          </p>
        </div>

        {/* Functional Search & Filter Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSearchSubmit?.(e);
          }}
          className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-stretch gap-3"
        >
          {/* Main Search Input */}
          <div className="relative flex-1 flex items-center bg-white rounded-xl border border-slate-200 px-3.5 py-2.5 focus-within:ring-2 focus-within:ring-emerald-500 transition">
            <Search className="w-5 h-5 text-slate-400 mr-2.5 shrink-0" />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent text-slate-900 placeholder-slate-400 text-sm font-medium focus:outline-none"
            />
          </div>

          {/* Location Input (optional) */}
          {onLocationChange !== undefined && (
            <div className="relative md:w-56 flex items-center bg-white rounded-xl border border-slate-200 px-3.5 py-2.5 focus-within:ring-2 focus-within:ring-emerald-500 transition">
              <MapPin className="w-5 h-5 text-slate-400 mr-2 shrink-0" />
              <input
                type="text"
                value={locationValue || ""}
                onChange={(e) => onLocationChange(e.target.value)}
                placeholder="Város / Irányítószám"
                className="w-full bg-transparent text-slate-900 placeholder-slate-400 text-sm font-medium focus:outline-none"
              />
            </div>
          )}

          {/* Sort selector */}
          {onSortChange && (
            <div className="relative md:w-48 flex items-center bg-white rounded-xl border border-slate-200 px-3 py-2">
              <ArrowUpDown className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
              <select
                value={sortValue}
                onChange={(e) => onSortChange(e.target.value)}
                className="w-full bg-transparent text-slate-900 text-xs font-semibold focus:outline-none cursor-pointer"
              >
                <option value="relevance">Rendezés: Releváns</option>
                <option value="newest">Rendezés: Legújabb</option>
                <option value="price_asc">Ár: Növekvő</option>
                <option value="price_desc">Ár: Csökkenő</option>
              </select>
            </div>
          )}

          {/* Search Button */}
          <Button
            type="submit"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm px-6 py-3 rounded-xl transition shadow-xs"
          >
            Keresés
          </Button>
        </form>

        {/* Category Tabs (if provided) */}
        {categories && categories.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar scroll-smooth">
            {categories.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => onCategoryChange?.(cat.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap border transition ${
                    isActive
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Extra Filters (if passed) */}
        {extraFilters && <div className="pt-2">{extraFilters}</div>}
      </div>
    </div>
  );
};

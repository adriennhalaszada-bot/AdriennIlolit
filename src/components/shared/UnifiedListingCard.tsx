import React from "react";
import { Link } from "wouter";
import { Heart, MapPin, Star, ShieldCheck } from "lucide-react";

export interface UnifiedListingCardProps {
  id: string | number;
  title: string;
  imageUrl: string;
  price?: string | number;
  location?: string;
  subtitle?: string;
  moduleKey?: "marketplace" | "beauty" | "services" | "realestate" | "vehicles" | "education";
  badgeText?: string;
  isVerified?: boolean;
  isFavorite?: boolean;
  onFavoriteToggle?: (e: React.MouseEvent) => void;
  href?: string;
  onClick?: () => void;
  rating?: number;
  reviewCount?: number;
  specs?: string[];
}

const moduleAspectRatios = {
  marketplace: "aspect-square",
  beauty: "aspect-[4/3]",
  services: "aspect-[4/3]",
  realestate: "aspect-[4/3]",
  vehicles: "aspect-[16/9]",
  education: "aspect-[16/9]",
};

const moduleBadgeStyles = {
  marketplace: "bg-emerald-50 text-emerald-800 border-emerald-200",
  beauty: "bg-rose-50 text-rose-800 border-rose-200",
  services: "bg-blue-50 text-blue-800 border-blue-200",
  realestate: "bg-teal-50 text-teal-800 border-teal-200",
  vehicles: "bg-slate-100 text-slate-800 border-slate-300",
  education: "bg-purple-50 text-purple-800 border-purple-200",
};

export const UnifiedListingCard: React.FC<UnifiedListingCardProps> = ({
  id,
  title,
  imageUrl,
  price,
  location,
  subtitle,
  moduleKey = "marketplace",
  badgeText,
  isVerified = false,
  isFavorite = false,
  onFavoriteToggle,
  href,
  onClick,
  rating,
  reviewCount,
  specs = [],
}) => {
  const aspectClass = moduleAspectRatios[moduleKey] || "aspect-[4/3]";
  const badgeStyle = moduleBadgeStyles[moduleKey] || moduleBadgeStyles.marketplace;

  const cardContent = (
    <div
      onClick={onClick}
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition duration-200 group flex flex-col h-full cursor-pointer"
    >
      {/* Image Container */}
      <div className={`relative w-full ${aspectClass} bg-slate-100 dark:bg-slate-800 overflow-hidden`}>
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-103 transition duration-300"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=600&q=80";
          }}
        />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          {badgeText ? (
            <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${badgeStyle} shadow-xs`}>
              {badgeText}
            </span>
          ) : (
            <div />
          )}

          {/* Favorite Toggle */}
          {onFavoriteToggle && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onFavoriteToggle(e);
              }}
              className="pointer-events-auto w-8 h-8 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-rose-600 dark:hover:text-rose-400 transition shadow-xs"
              aria-label="Kedvencekhez adás"
            >
              <Heart
                className={`w-4 h-4 transition ${
                  isFavorite ? "fill-rose-500 text-rose-500" : ""
                }`}
              />
            </button>
          )}
        </div>
      </div>

      {/* Card Details Body */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-1.5">
          {/* Header Row: Location / Category / Rating */}
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
            {location && (
              <span className="flex items-center gap-1 truncate">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{location}</span>
              </span>
            )}

            {rating !== undefined && (
              <span className="flex items-center gap-1 shrink-0 text-amber-600 font-semibold">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>{rating.toFixed(1)}</span>
                {reviewCount !== undefined && <span className="text-slate-400 font-normal">({reviewCount})</span>}
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base leading-snug line-clamp-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
            {title}
          </h3>

          {/* Subtitle / Description */}
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{subtitle}</p>
          )}
        </div>

        {/* Specs Chips (e.g. sqm, rooms, mileage) */}
        {specs && specs.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {specs.slice(0, 3).map((spec, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-medium"
              >
                {spec}
              </span>
            ))}
          </div>
        )}

        {/* Price & Verified Seller Footer */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between mt-auto">
          <div>
            {price !== undefined && (
              <span className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                {typeof price === "number" ? `${price.toLocaleString("hu-HU")} Ft` : price}
              </span>
            )}
          </div>

          {isVerified && (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
              <ShieldCheck className="w-3.5 h-3.5" />
              Ellenőrzött
            </span>
          )}
        </div>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{cardContent}</Link>;
  }

  return cardContent;
};

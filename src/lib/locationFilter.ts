import {
  normalizeCityString,
  extractCityName,
  findCityCoords,
  calculateLocationDistance,
  HUNGARIAN_CITIES,
} from "@/data/carData";
import { ALL_HUNGARIAN_SETTLEMENTS } from "@/data/allHungarianSettlements";
import { HU_CITIES_BY_COUNTY } from "@/lib/beautyConstants";

export type LocationMode = "city" | "radius";

export interface LocationSearchState {
  mode: LocationMode;
  cityInput: string;           // settlement name typed/selected by user
  radiusKm: number;            // preset radius (5/10/25/50/100)
  customRadiusKm: number | null; // null = use preset; number = custom value
}

export const DEFAULT_LOCATION_STATE: LocationSearchState = {
  mode: "city",
  cityInput: "",
  radiusKm: 25,
  customRadiusKm: null,
};

/** Map of city -> county name for autocomplete display */
const CITY_TO_COUNTY_MAP: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  // 1. Fill from ALL_HUNGARIAN_SETTLEMENTS metadata
  for (const [city, meta] of Object.entries(ALL_HUNGARIAN_SETTLEMENTS)) {
    if (meta.county) {
      map[normalizeCityString(city)] = meta.county;
    }
  }
  // 2. Override/supplement with HU_CITIES_BY_COUNTY
  for (const [county, cities] of Object.entries(HU_CITIES_BY_COUNTY)) {
    for (const city of cities) {
      map[normalizeCityString(city)] = county;
    }
  }
  return map;
})();

/** Returns formatted label e.g. "Miskolc, Borsod-Abaúj-Zemplén vármegye" or "Bajót, Komárom-Esztergom vármegye" */
export function getCityCountyLabel(cityName: string): string {
  const norm = normalizeCityString(extractCityName(cityName));
  const county = CITY_TO_COUNTY_MAP[norm];
  if (county) {
    return county === "Budapest" ? "Budapest főváros" : `${cityName}, ${county} vármegye`;
  }
  return cityName;
}

/** Pre-built formatted city suggestions for all ~4,500+ Hungarian settlements */
const FORMATTED_CITY_SUGGESTIONS: { city: string; label: string }[] = (() => {
  const cities = Object.keys(HUNGARIAN_CITIES);
  return cities.map((city) => ({
    city,
    label: getCityCountyLabel(city),
  }));
})();

/** Returns all searchable Hungarian cities formatted with county for autocomplete */
export function getFormattedCitySuggestions(): { city: string; label: string }[] {
  return FORMATTED_CITY_SUGGESTIONS;
}

/** Returns the effective search radius in km */
export function getEffectiveRadius(state: LocationSearchState): number {
  return state.customRadiusKm !== null ? state.customRadiusKm : state.radiusKm;
}

/**
 * Calculates distance in km between search location and item location.
 * Returns 0 if exact same city, number in km if distance calculated, or null if unresolvable.
 */
export function getCalculatedDistance(
  cityInput: string,
  itemLocation: string
): number | null {
  const inputClean = extractCityName(cityInput.trim());
  const itemClean = extractCityName(itemLocation.trim());

  if (!inputClean || !itemClean) return null;
  if (normalizeCityString(inputClean) === normalizeCityString(itemClean)) {
    return 0;
  }

  return calculateLocationDistance(inputClean, itemClean);
}

/**
 * Applies location filter to an item's location string.
 *
 * - city mode: EXACT city match ONLY (accent-insensitive)
 * - radius mode: haversine distance check <= effective radius
 *
 * Returns `{ matches: boolean; distanceKm: number | null }`
 */
export function applyLocationFilter(
  itemLocation: string,
  state: LocationSearchState
): { matches: boolean; distanceKm: number | null } {
  const cityInput = state.cityInput.trim();

  // No filter set → show everything
  if (!cityInput) {
    return { matches: true, distanceKm: null };
  }

  const normInput = normalizeCityString(extractCityName(cityInput));
  const normItem = normalizeCityString(extractCityName(itemLocation));

  if (state.mode === "city") {
    // EXACT city match — accent-insensitive.
    // e.g. "Miskolc" matches ONLY "Miskolc" (or "Miskolc, Belváros"),
    // NOT "Kazincbarcika", "Tiszaújváros", "Miskolctapolca" etc.
    const matches = normItem === normInput;
    return { matches, distanceKm: matches ? 0 : null };
  }

  // RADIUS mode
  const radius = getEffectiveRadius(state);
  const dist = getCalculatedDistance(cityInput, itemLocation);

  if (dist !== null) {
    return { matches: dist <= radius, distanceKm: dist };
  }

  // Fallback: coordinate lookup failed → exact text match
  const textMatch = normItem === normInput || normItem.includes(normInput);
  return { matches: textMatch, distanceKm: textMatch ? 0 : null };
}

/**
 * Given GPS coords, attempts reverse geocoding via Nominatim.
 * Returns settlement name in Hungarian, or null on failure.
 */
export async function reverseGeocode(
  lat: number,
  lon: number
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=hu`,
      { headers: { "Accept-Language": "hu" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return (
      data?.address?.city ||
      data?.address?.town ||
      data?.address?.village ||
      data?.address?.municipality ||
      null
    );
  } catch {
    return null;
  }
}

/** Finds matched city name from HUNGARIAN_CITIES for display/badge */
export function resolveCity(input: string): string | null {
  const coords = findCityCoords(input);
  return coords ? coords.name : null;
}

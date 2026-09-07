import { useState, useEffect, useCallback } from "react";
import {
  LocationSearchState,
  DEFAULT_LOCATION_STATE,
  LocationMode,
} from "@/lib/locationFilter";

/**
 * Custom hook to manage locationState with bi-directional URL query string synchronization.
 *
 * Query params supported:
 * - mode: "city" | "radius"
 * - city: string (e.g. "Miskolc")
 * - radius: number (preset radius)
 * - customRadius: number (custom radius)
 */
export function useLocationQueryState(initialState: LocationSearchState = DEFAULT_LOCATION_STATE) {
  const [locationState, setLocationStateInternal] = useState<LocationSearchState>(() => {
    if (typeof window === "undefined") return initialState;
    const params = new URLSearchParams(window.location.search);

    const qMode = params.get("mode") as LocationMode | null;
    const qCity = params.get("city");
    const qRadius = params.get("radius");
    const qCustom = params.get("customRadius");

    const mode: LocationMode = qMode === "radius" ? "radius" : qMode === "city" ? "city" : initialState.mode;
    const cityInput = qCity ? decodeURIComponent(qCity) : initialState.cityInput;
    const radiusKm = qRadius ? Number(qRadius) || initialState.radiusKm : initialState.radiusKm;
    const customRadiusKm = qCustom ? Number(qCustom) || null : initialState.customRadiusKm;

    return {
      mode,
      cityInput,
      radiusKm,
      customRadiusKm,
    };
  });

  const setLocationState = useCallback((nextStateOrFn: LocationSearchState | ((prev: LocationSearchState) => LocationSearchState)) => {
    setLocationStateInternal((prev) => {
      const next = typeof nextStateOrFn === "function" ? nextStateOrFn(prev) : nextStateOrFn;

      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        if (next.mode !== DEFAULT_LOCATION_STATE.mode) {
          url.searchParams.set("mode", next.mode);
        } else {
          url.searchParams.delete("mode");
        }

        if (next.cityInput) {
          url.searchParams.set("city", next.cityInput);
        } else {
          url.searchParams.delete("city");
        }

        if (next.mode === "radius") {
          if (next.customRadiusKm !== null) {
            url.searchParams.set("customRadius", String(next.customRadiusKm));
            url.searchParams.delete("radius");
          } else if (next.radiusKm !== DEFAULT_LOCATION_STATE.radiusKm) {
            url.searchParams.set("radius", String(next.radiusKm));
            url.searchParams.delete("customRadius");
          }
        } else {
          url.searchParams.delete("radius");
          url.searchParams.delete("customRadius");
        }

        window.history.replaceState(null, "", url.toString());
      }

      return next;
    });
  }, []);

  return [locationState, setLocationState] as const;
}

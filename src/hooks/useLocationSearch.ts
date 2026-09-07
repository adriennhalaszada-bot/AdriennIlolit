import { useState, useCallback } from "react";
import {
  LocationMode,
  LocationSearchState,
  DEFAULT_LOCATION_STATE,
  reverseGeocode,
  resolveCity,
} from "@/lib/locationFilter";

export type GpsStatus =
  | "idle"
  | "loading"
  | "confirmed"    // GPS city identified confidently (accuracy < 1500m)
  | "uncertain"    // GPS city identified but accuracy is poor (>= 1500m)
  | "denied"       // User denied geolocation
  | "error";       // Other GPS error

export interface UseLocationSearchResult {
  state: LocationSearchState;
  setMode: (mode: LocationMode) => void;
  setCityInput: (city: string) => void;
  setRadiusKm: (km: number) => void;
  setCustomRadiusKm: (km: number | null) => void;
  setState: (s: LocationSearchState) => void;
  reset: () => void;
  gpsStatus: GpsStatus;
  gpsDetectedCity: string | null;
  gpsAccuracyM: number | null;
  requestGps: () => void;
  confirmGpsCity: () => void;   // user confirms the uncertain GPS city
  dismissGps: () => void;
}

export function useLocationSearch(
  initial: Partial<LocationSearchState> = {}
): UseLocationSearchResult {
  const [state, setState] = useState<LocationSearchState>({
    ...DEFAULT_LOCATION_STATE,
    ...initial,
  });

  const [gpsStatus, setGpsStatus] = useState<GpsStatus>("idle");
  const [gpsDetectedCity, setGpsDetectedCity] = useState<string | null>(null);
  const [gpsAccuracyM, setGpsAccuracyM] = useState<number | null>(null);

  const setMode = useCallback(
    (mode: LocationMode) => setState((s) => ({ ...s, mode })),
    []
  );
  const setCityInput = useCallback(
    (cityInput: string) => setState((s) => ({ ...s, cityInput })),
    []
  );
  const setRadiusKm = useCallback(
    (radiusKm: number) => setState((s) => ({ ...s, radiusKm, customRadiusKm: null })),
    []
  );
  const setCustomRadiusKm = useCallback(
    (customRadiusKm: number | null) => setState((s) => ({ ...s, customRadiusKm })),
    []
  );
  const reset = useCallback(() => {
    setState({ ...DEFAULT_LOCATION_STATE, ...initial });
    setGpsStatus("idle");
    setGpsDetectedCity(null);
    setGpsAccuracyM(null);
  }, []);

  const requestGps = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsStatus("error");
      return;
    }
    setGpsStatus("loading");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setGpsAccuracyM(Math.round(accuracy));

        const city = await reverseGeocode(latitude, longitude);
        if (!city) {
          setGpsStatus("error");
          return;
        }

        // Resolve against known cities
        const resolvedCity = resolveCity(city) || city;
        setGpsDetectedCity(resolvedCity);

        if (accuracy <= 1500) {
          // Confident → auto-fill city
          setGpsStatus("confirmed");
          setState((s) => ({ ...s, cityInput: resolvedCity }));
        } else {
          // Uncertain → show suggestion but let user confirm
          setGpsStatus("uncertain");
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGpsStatus("denied");
        } else {
          setGpsStatus("error");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  const confirmGpsCity = useCallback(() => {
    if (gpsDetectedCity) {
      setState((s) => ({ ...s, cityInput: gpsDetectedCity }));
      setGpsStatus("confirmed");
    }
  }, [gpsDetectedCity]);

  const dismissGps = useCallback(() => {
    setGpsStatus("idle");
    setGpsDetectedCity(null);
    setGpsAccuracyM(null);
  }, []);

  return {
    state,
    setState,
    setMode,
    setCityInput,
    setRadiusKm,
    setCustomRadiusKm,
    reset,
    gpsStatus,
    gpsDetectedCity,
    gpsAccuracyM,
    requestGps,
    confirmGpsCity,
    dismissGps,
  };
}

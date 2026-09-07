import React, { createContext, useContext, useState, useEffect } from "react";

export interface SavedSearchItem {
  id: string;
  title: string;
  module: "universal" | "marketplace" | "beauty" | "providers" | "realestate" | "vehicles" | "education";
  query?: string;
  location?: string;
  radiusKm?: number;
  minPrice?: number;
  maxPrice?: number;
  filtersSummary: string;
  url: string;
  notifyWeb: boolean;
  notifyEmail: boolean;
  savedAt: string;
  matchCount?: number;
}

interface SavedSearchesContextType {
  savedSearches: SavedSearchItem[];
  addSavedSearch: (search: Omit<SavedSearchItem, "id" | "savedAt">) => void;
  removeSavedSearch: (id: string) => void;
  toggleNotification: (id: string, channel: "notifyWeb" | "notifyEmail") => void;
  clearSavedSearches: () => void;
  isSearchSaved: (title: string) => boolean;
}

const STORAGE_KEY = "ilolit_saved_searches_v1";

const INITIAL_MOCK_SAVED_SEARCHES: SavedSearchItem[] = [
  {
    id: "ss-1",
    title: "Eladó családi ház Miskolcon, 90 millió Ft alatt",
    module: "realestate",
    query: "",
    location: "Miskolc",
    maxPrice: 90000000,
    filtersSummary: "Ingatlanok · Miskolc · Max 90M Ft",
    url: "/real-estate?city=Miskolc&maxPrice=90000000",
    notifyWeb: true,
    notifyEmail: true,
    savedAt: "2026-09-01T12:00:00Z",
    matchCount: 8
  },
  {
    id: "ss-2",
    title: "BMW 3-as sorozat 2018 után, 10 millió Ft alatt",
    module: "vehicles",
    query: "BMW 3",
    maxPrice: 10000000,
    filtersSummary: "Járművek · BMW 3-as · Max 10M Ft · 2018+",
    url: "/vehicles?brand=BMW&model=3-as+sorozat&maxPrice=10000000&minYear=2018",
    notifyWeb: true,
    notifyEmail: false,
    savedAt: "2026-09-02T16:20:00Z",
    matchCount: 4
  },
  {
    id: "ss-3",
    title: "Kozmetikus Miskolcon 10 km-en belül",
    module: "beauty",
    query: "kozmetikus",
    location: "Miskolc",
    radiusKm: 10,
    filtersSummary: "Szépségipar · Kozmetikus · Miskolc (+10 km)",
    url: "/beauty?city=Miskolc&mode=radius&radius=10&query=kozmetikus",
    notifyWeb: true,
    notifyEmail: true,
    savedAt: "2026-09-03T10:10:00Z",
    matchCount: 12
  }
];

const SavedSearchesContext = createContext<SavedSearchesContextType | undefined>(undefined);

export function SavedSearchesProvider({ children }: { children: React.ReactNode }) {
  const [savedSearches, setSavedSearches] = useState<SavedSearchItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Could not load saved searches:", e);
    }
    return INITIAL_MOCK_SAVED_SEARCHES;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedSearches));
    } catch (e) {
      console.warn("Could not save searches:", e);
    }
  }, [savedSearches]);

  const addSavedSearch = (search: Omit<SavedSearchItem, "id" | "savedAt">) => {
    const newItem: SavedSearchItem = {
      ...search,
      id: "ss-" + Date.now(),
      savedAt: new Date().toISOString(),
      matchCount: Math.floor(Math.random() * 8) + 2
    };
    setSavedSearches((prev) => [newItem, ...prev]);
  };

  const removeSavedSearch = (id: string) => {
    setSavedSearches((prev) => prev.filter((s) => s.id !== id));
  };

  const toggleNotification = (id: string, channel: "notifyWeb" | "notifyEmail") => {
    setSavedSearches((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [channel]: !s[channel] } : s))
    );
  };

  const clearSavedSearches = () => {
    setSavedSearches([]);
  };

  const isSearchSaved = (title: string) => {
    return savedSearches.some((s) => s.title.toLowerCase() === title.toLowerCase());
  };

  return (
    <SavedSearchesContext.Provider
      value={{
        savedSearches,
        addSavedSearch,
        removeSavedSearch,
        toggleNotification,
        clearSavedSearches,
        isSearchSaved,
      }}
    >
      {children}
    </SavedSearchesContext.Provider>
  );
}

export function useSavedSearches() {
  const context = useContext(SavedSearchesContext);
  if (!context) {
    throw new Error("useSavedSearches must be used within a SavedSearchesProvider");
  }
  return context;
}

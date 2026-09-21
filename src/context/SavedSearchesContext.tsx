import React, { createContext, useContext, useState, useEffect } from "react";
import { customFetch } from "@workspace/api-client-react";

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

const SavedSearchesContext = createContext<SavedSearchesContextType | undefined>(undefined);

export function SavedSearchesProvider({ children }: { children: React.ReactNode }) {
  const [savedSearches, setSavedSearches] = useState<SavedSearchItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    customFetch<{ items: SavedSearchItem[] }>("/api/preferences/saved-searches")
      .then((data) => setSavedSearches(Array.isArray(data.items) ? data.items : []))
      .catch(() => setSavedSearches([]))
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    customFetch("/api/preferences/saved-searches", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: savedSearches }),
    }).catch((error) => console.warn("A mentett keresések mentése sikertelen:", error));
  }, [savedSearches]);

  const addSavedSearch = (search: Omit<SavedSearchItem, "id" | "savedAt">) => {
    const newItem: SavedSearchItem = {
      ...search,
      id: "ss-" + Date.now(),
      savedAt: new Date().toISOString(),
      matchCount: search.matchCount
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

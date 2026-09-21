import React, { createContext, useContext, useState, useEffect } from "react";
import { customFetch } from "@workspace/api-client-react";

export type FavoriteType = "marketplace" | "beauty" | "providers" | "realestate" | "vehicles" | "education";

export interface FavoriteItem {
  id: string;
  type: FavoriteType;
  title: string;
  subtitle?: string;
  location?: string;
  price?: number;
  originalPrice?: number;
  image?: string;
  rating?: number;
  url: string;
  addedAt: string;
}

interface FavoritesContextType {
  favorites: FavoriteItem[];
  toggleFavorite: (item: Omit<FavoriteItem, "addedAt">) => void;
  isFavorite: (id: string, type: FavoriteType) => boolean;
  getFavoritesByType: (type: FavoriteType) => FavoriteItem[];
  removeFavorite: (id: string, type: FavoriteType) => void;
  clearAllFavorites: () => void;
  totalCount: number;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    customFetch<{ items: FavoriteItem[] }>("/api/preferences/favorites")
      .then((data) => setFavorites(Array.isArray(data.items) ? data.items : []))
      .catch(() => setFavorites([]))
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    customFetch("/api/preferences/favorites", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: favorites }),
    }).catch((error) => console.warn("A kedvencek mentése sikertelen:", error));
  }, [favorites]);

  const toggleFavorite = (item: Omit<FavoriteItem, "addedAt">) => {
    setFavorites((prev) => {
      const exists = prev.some((f) => f.id === item.id && f.type === item.type);
      if (exists) {
        return prev.filter((f) => !(f.id === item.id && f.type === item.type));
      } else {
        return [{ ...item, addedAt: new Date().toISOString() }, ...prev];
      }
    });
  };

  const isFavorite = (id: string, type: FavoriteType) => {
    return favorites.some((f) => f.id === id && f.type === type);
  };

  const getFavoritesByType = (type: FavoriteType) => {
    return favorites.filter((f) => f.type === type);
  };

  const removeFavorite = (id: string, type: FavoriteType) => {
    setFavorites((prev) => prev.filter((f) => !(f.id === id && f.type === type)));
  };

  const clearAllFavorites = () => {
    setFavorites([]);
  };

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        toggleFavorite,
        isFavorite,
        getFavoritesByType,
        removeFavorite,
        clearAllFavorites,
        totalCount: favorites.length,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error("useFavorites must be used within a FavoritesProvider");
  }
  return context;
}

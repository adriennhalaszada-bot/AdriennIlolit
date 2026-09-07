import React, { createContext, useContext, useState, useEffect } from "react";

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

const STORAGE_KEY = "ilolit_unified_favorites_v1";

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

const INITIAL_MOCK_FAVORITES: FavoriteItem[] = [
  {
    id: "re-1",
    type: "realestate",
    title: "Családi ház tágas udvarral Miskolcon",
    subtitle: "120 m² · 4 szoba · Újszerű",
    location: "Miskolc, Belváros",
    price: 68500000,
    originalPrice: 72000000,
    image: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600",
    url: "/real-estate",
    addedAt: "2026-09-01T10:00:00Z"
  },
  {
    id: "veh-1",
    type: "vehicles",
    title: "BMW 320d Touring M-Sport",
    subtitle: "2020 · 112 000 km · Dízel · Automata",
    location: "Miskolc",
    price: 9490000,
    originalPrice: 9990000,
    image: "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=600",
    url: "/vehicles",
    addedAt: "2026-09-02T14:30:00Z"
  },
  {
    id: "beauty-1",
    type: "beauty",
    title: "Glamour Beauty Szalon & Dr. Kovács Éva",
    subtitle: "Kozmetikus & Arcesztétika",
    location: "Miskolc, Széchenyi u. 42.",
    rating: 4.9,
    image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600",
    url: "/beauty",
    addedAt: "2026-09-03T09:15:00Z"
  },
  {
    id: "prov-1",
    type: "providers",
    title: "Vasszerkezet & Lakatos Műhely Kft.",
    subtitle: "Lakatos – biztonsági zárak, kapuk",
    location: "Budapest",
    rating: 5.0,
    image: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600",
    url: "/providers",
    addedAt: "2026-09-03T11:20:00Z"
  },
  {
    id: "prod-1",
    type: "marketplace",
    title: "Apple MacBook Pro 16 M2 Max (32GB / 1TB SSD)",
    subtitle: "Feketés szürke, újszerű állapotban",
    location: "Debrecen",
    price: 849000,
    originalPrice: 920000,
    image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600",
    url: "/marketplace",
    addedAt: "2026-09-03T16:45:00Z"
  },
  {
    id: "edu-1",
    type: "education",
    title: "Full-Stack Webfejlesztő & AI Integrációs Kurzus",
    subtitle: "60 órás intenzív online képzés mentori támogatással",
    location: "Online képzés",
    price: 129000,
    image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600",
    url: "/education",
    addedAt: "2026-09-04T08:00:00Z"
  }
];

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<FavoriteItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Could not load favorites from storage:", e);
    }
    return INITIAL_MOCK_FAVORITES;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
    } catch (e) {
      console.warn("Could not save favorites to storage:", e);
    }
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

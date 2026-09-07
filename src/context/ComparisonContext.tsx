import React, { createContext, useContext, useState, useEffect } from "react";

export type ComparisonModule = "realestate" | "vehicles" | "providers";

export interface RealEstateSpecs {
  price: number;
  pricePerSqm: number;
  areaSqm: number;
  rooms: string;
  condition: string;
  location: string;
  energyRating: string;
  heating: string;
  elevator: boolean;
  balcony: boolean;
}

export interface VehicleSpecs {
  price: number;
  year: number;
  mileageKm: number;
  engine: string;
  powerHp: number;
  fuel: string;
  transmission: string;
  color: string;
  warranty: boolean;
}

export interface ProviderSpecs {
  rating: number;
  reviewCount: number;
  priceLevel: string;
  distanceKm: number;
  nextAvailableSlot: string;
  city: string;
  tier: string;
  servicesCount: number;
}

export interface ComparisonItem {
  id: string;
  module: ComparisonModule;
  title: string;
  subtitle?: string;
  image?: string;
  url: string;
  specs: RealEstateSpecs | VehicleSpecs | ProviderSpecs;
}

interface ComparisonContextType {
  comparisonList: ComparisonItem[];
  activeModule: ComparisonModule | null;
  addToCompare: (item: ComparisonItem) => boolean;
  removeFromCompare: (id: string) => void;
  isInCompare: (id: string) => boolean;
  clearCompare: () => void;
  isModalOpen: boolean;
  setModalOpen: (open: boolean) => void;
  totalCount: number;
}

const STORAGE_KEY = "ilolit_comparison_v1";

const ComparisonContext = createContext<ComparisonContextType | undefined>(undefined);

export function ComparisonProvider({ children }: { children: React.ReactNode }) {
  const [comparisonList, setComparisonList] = useState<ComparisonItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Could not load comparison list:", e);
    }
    return [];
  });

  const [isModalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(comparisonList));
    } catch (e) {
      console.warn("Could not save comparison list:", e);
    }
  }, [comparisonList]);

  const activeModule = comparisonList.length > 0 ? comparisonList[0].module : null;

  const addToCompare = (item: ComparisonItem): boolean => {
    if (comparisonList.some((c) => c.id === item.id)) {
      return true;
    }

    // If module changes, prompt or clear previous module items
    if (activeModule && activeModule !== item.module) {
      setComparisonList([item]);
      return true;
    }

    if (comparisonList.length >= 4) {
      return false; // Limit reached
    }

    setComparisonList((prev) => [...prev, item]);
    return true;
  };

  const removeFromCompare = (id: string) => {
    setComparisonList((prev) => prev.filter((c) => c.id !== id));
  };

  const isInCompare = (id: string) => {
    return comparisonList.some((c) => c.id === id);
  };

  const clearCompare = () => {
    setComparisonList([]);
  };

  return (
    <ComparisonContext.Provider
      value={{
        comparisonList,
        activeModule,
        addToCompare,
        removeFromCompare,
        isInCompare,
        clearCompare,
        isModalOpen,
        setModalOpen,
        totalCount: comparisonList.length,
      }}
    >
      {children}
    </ComparisonContext.Provider>
  );
}

export function useComparison() {
  const context = useContext(ComparisonContext);
  if (!context) {
    throw new Error("useComparison must be used within a ComparisonProvider");
  }
  return context;
}

import { createContext, useContext, useState, useCallback } from "react";
import type { Property } from "@shared/schema";

interface PropertyWithImages extends Omit<Property, 'images'> {
  images?: string[];
  startingRoomPrice?: string | null;
  startingRoomOriginalPrice?: string | null;
  amenities?: string[];
}

interface CompareContextType {
  compareList: PropertyWithImages[];
  addToCompare: (property: PropertyWithImages) => boolean;
  removeFromCompare: (propertyId: string) => void;
  clearCompare: () => void;
  isInCompare: (propertyId: string) => boolean;
  maxCompareItems: number;
}

const CompareContext = createContext<CompareContextType | undefined>(undefined);

const MAX_COMPARE_ITEMS = 4;

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const [compareList, setCompareList] = useState<PropertyWithImages[]>([]);

  const addToCompare = useCallback((property: PropertyWithImages): boolean => {
    let added = false;
    setCompareList(prev => {
      if (prev.length >= MAX_COMPARE_ITEMS) {
        return prev;
      }
      if (prev.some(p => p.id === property.id)) {
        return prev;
      }
      added = true;
      return [...prev, property];
    });
    return added;
  }, []);

  const removeFromCompare = useCallback((propertyId: string) => {
    setCompareList(prev => prev.filter(p => p.id !== propertyId));
  }, []);

  const clearCompare = useCallback(() => {
    setCompareList([]);
  }, []);

  const isInCompare = useCallback((propertyId: string): boolean => {
    return compareList.some(p => p.id === propertyId);
  }, [compareList]);

  return (
    <CompareContext.Provider value={{
      compareList,
      addToCompare,
      removeFromCompare,
      clearCompare,
      isInCompare,
      maxCompareItems: MAX_COMPARE_ITEMS,
    }}>
      {children}
    </CompareContext.Provider>
  );
}

export function useCompare() {
  const context = useContext(CompareContext);
  if (context === undefined) {
    throw new Error("useCompare must be used within a CompareProvider");
  }
  return context;
}

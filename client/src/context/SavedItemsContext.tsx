import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { SavedItem } from "../utils/types";

interface SavedItemsContextType {
  savedItems: SavedItem[];
  saveItem: (item: Omit<SavedItem, "id" | "dateCreated">) => void;
  removeItem: (id: string) => void;
}

const SavedItemsContext = createContext<SavedItemsContextType | undefined>(undefined);

export function SavedItemsProvider({ children }: { children: ReactNode }) {
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);

  // Load saved items from localStorage on initial render
  useEffect(() => {
    const storedItems = localStorage.getItem("savedItems");
    if (storedItems) {
      setSavedItems(JSON.parse(storedItems));
    }
  }, []);

  // Update localStorage when saved items change
  useEffect(() => {
    localStorage.setItem("savedItems", JSON.stringify(savedItems));
  }, [savedItems]);

  // Save a new item
  const saveItem = (item: Omit<SavedItem, "id" | "dateCreated">) => {
    const newItem: SavedItem = {
      ...item,
      id: crypto.randomUUID(),
      dateCreated: new Date().toISOString()
    };
    setSavedItems(prevItems => [newItem, ...prevItems]);
  };

  // Remove an item
  const removeItem = (id: string) => {
    setSavedItems(prevItems => prevItems.filter(item => item.id !== id));
  };

  return (
    <SavedItemsContext.Provider value={{ savedItems, saveItem, removeItem }}>
      {children}
    </SavedItemsContext.Provider>
  );
}

export function useSavedItems() {
  const context = useContext(SavedItemsContext);
  if (context === undefined) {
    throw new Error("useSavedItems must be used within a SavedItemsProvider");
  }
  return context;
}

import React, { createContext, useContext, useState, ReactNode } from "react";
import { Faith, Language } from "../utils/types";

interface FaithContextType {
  currentFaith: Faith;
  language: Language;
  setCurrentFaith: (faith: Faith) => void;
  setLanguage: (language: Language) => void;
}

const FaithContext = createContext<FaithContextType | undefined>(undefined);

export function FaithProvider({ children }: { children: ReactNode }) {
  const [currentFaith, setCurrentFaith] = useState<Faith>("buddhism");
  const [language, setLanguage] = useState<Language>("english");

  return (
    <FaithContext.Provider value={{ currentFaith, language, setCurrentFaith, setLanguage }}>
      {children}
    </FaithContext.Provider>
  );
}

export function useFaith() {
  const context = useContext(FaithContext);
  if (context === undefined) {
    throw new Error("useFaith must be used within a FaithProvider");
  }
  return context;
}

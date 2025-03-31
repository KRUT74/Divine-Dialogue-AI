import React, { useState } from "react";
import FaithSelector from "./FaithSelector";
import SavedItems from "./SavedItems";
import SettingsPanel from "./SettingsPanel";
import { useFaith } from "../context/FaithContext";
import { faithData } from "../utils/faithData";

interface SidebarProps {
  isMobile: boolean;
  isOpen: boolean;
  onToggle: () => void;
}

export default function Sidebar({ isMobile, isOpen, onToggle }: SidebarProps) {
  const { currentFaith } = useFaith();
  
  // Handle sidebar visibility based on mobile/desktop view
  const sidebarClasses = `
    w-full md:w-64 bg-slate-800 md:h-screen flex-shrink-0 overflow-hidden transition-all duration-300 ease-in-out
    ${isMobile && !isOpen ? "hidden" : "flex flex-col"}
  `;

  return (
    <aside className={sidebarClasses}>
      {/* Logo */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center">
          <span 
            className="text-2xl mr-2"
            style={{ color: faithData[currentFaith].accentColor }}
          >
            {faithData[currentFaith].symbol}
          </span>
          <h1 className="text-xl font-semibold font-inter">SacredText</h1>
        </div>
        {isMobile && (
          <button 
            className="md:hidden text-slate-300 hover:text-white"
            onClick={onToggle}
          >
            <span className="material-icons">menu</span>
          </button>
        )}
      </div>

      {/* Faith Selection */}
      <FaithSelector />

      {/* Saved Items */}
      <SavedItems />

      {/* Settings and Language */}
      <SettingsPanel />
    </aside>
  );
}

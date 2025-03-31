import React from "react";
import { useFaith } from "../context/FaithContext";
import { Language } from "../utils/types";
import { faithData } from "../utils/faithData";

export default function SettingsPanel() {
  const { language, setLanguage, currentFaith } = useFaith();

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLanguage(e.target.value as Language);
  };

  return (
    <div className="mt-auto p-4 border-t border-slate-700">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium">Language</span>
        <select 
          className={`bg-slate-700 text-white text-sm rounded-md px-2 py-1 outline-none focus:ring-2`}
          style={{ 
            borderColor: faithData[currentFaith].accentColor,
            outlineColor: faithData[currentFaith].accentColor
          }}
          value={language}
          onChange={handleLanguageChange}
        >
          <option value="english">English</option>
          <option value="spanish">Español</option>
          <option value="arabic">العربية</option>
          <option value="hindi">हिन्दी</option>
        </select>
      </div>
      <div className="flex justify-between">
        <button className="text-sm text-slate-400 hover:text-white flex items-center">
          <span className="material-icons text-sm mr-1">settings</span>
          Settings
        </button>
        <button className="text-sm text-slate-400 hover:text-white flex items-center">
          <span className="material-icons text-sm mr-1">help_outline</span>
          Help
        </button>
      </div>
    </div>
  );
}

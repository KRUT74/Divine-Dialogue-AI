import React from "react";
import { useFaith } from "../context/FaithContext";
import { faithData } from "../utils/faithData";
import DailyBlessing from "./DailyBlessing";
import QASection from "./QASection";
import ScriptureLookup from "./ScriptureLookup";

interface MainContentProps {
  onToggleSidebar: () => void;
}

export default function MainContent({ onToggleSidebar }: MainContentProps) {
  const { currentFaith } = useFaith();

  return (
    <main className="flex-1 overflow-y-auto bg-slate-900">
      {/* Top Navigation */}
      <nav className="bg-slate-800 p-4 flex justify-between items-center sticky top-0 z-10 border-b border-slate-700">
        <div className="flex items-center">
          <button 
            className="md:hidden mr-4 text-slate-300 hover:text-white"
            onClick={onToggleSidebar}
          >
            <span className="material-icons">menu</span>
          </button>
          <div>
            <h2 
              className="text-xl font-garamond"
              style={{ color: faithData[currentFaith].accentColor }}
            >
              {faithData[currentFaith].name}
            </h2>
            <p className="text-sm text-slate-400">{faithData[currentFaith].greeting}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button className="p-2 rounded-full hover:bg-slate-700">
            <span className="material-icons">bookmark_border</span>
          </button>
          <button className="p-2 rounded-full hover:bg-slate-700">
            <span className="material-icons">account_circle</span>
          </button>
        </div>
      </nav>

      {/* Content Area */}
      <div className="p-4 md:p-6 lg:p-8">
        {/* Daily Blessing */}
        <DailyBlessing />

        {/* Q&A Section */}
        <QASection />

        {/* Scripture Lookup */}
        <ScriptureLookup />
      </div>
    </main>
  );
}

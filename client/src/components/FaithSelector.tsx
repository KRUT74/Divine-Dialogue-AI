import React from "react";
import { useFaith } from "../context/FaithContext";
import { faithList, faithData } from "../utils/faithData";
import { Faith } from "../utils/types";

export default function FaithSelector() {
  const { currentFaith, setCurrentFaith } = useFaith();

  return (
    <div className="p-4 border-t border-slate-700">
      <h2 className="text-sm uppercase tracking-wide text-slate-400 mb-3 font-inter">Select Faith</h2>
      <div className="space-y-2">
        {faithList.map((faith) => (
          <button
            key={faith}
            className={`w-full flex items-center p-2 rounded-lg text-left hover:bg-opacity-80 transition-all ${
              currentFaith === faith 
                ? `${faithData[faith].tailwindBg} bg-opacity-60` 
                : "hover:bg-slate-700"
            }`}
            onClick={() => setCurrentFaith(faith)}
          >
            <span 
              className={`text-2xl mr-3`}
              style={{ color: faithData[faith].accentColor }}
            >
              {faithData[faith].symbol}
            </span>
            <span className="font-medium">{faithData[faith].name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

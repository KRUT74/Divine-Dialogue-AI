import React from "react";
import { useSavedItems } from "../context/SavedItemsContext";
import { faithData } from "../utils/faithData";

export default function SavedItems() {
  const { savedItems } = useSavedItems();

  if (savedItems.length === 0) {
    return (
      <div className="p-4 border-t border-slate-700">
        <h2 className="text-sm uppercase tracking-wide text-slate-400 mb-3 font-inter">Saved Items</h2>
        <div className="text-center text-slate-500 py-4 text-sm">
          No items saved yet
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 border-t border-slate-700">
      <h2 className="text-sm uppercase tracking-wide text-slate-400 mb-3 font-inter">Saved Items</h2>
      <div className="space-y-2 scroll-container overflow-y-auto max-h-72">
        {savedItems.map((item) => (
          <a key={item.id} href="#" className="block p-2 rounded-lg hover:bg-slate-700 transition-all">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium truncate">{item.title}</p>
                <p className="text-xs text-slate-400">{faithData[item.faith].name}</p>
              </div>
              <span 
                className="text-sm"
                style={{ color: faithData[item.faith].accentColor }}
              >
                {faithData[item.faith].symbol}
              </span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

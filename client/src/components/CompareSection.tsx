import React, { useState } from "react";
import { faithData } from "../utils/faithData";
import { Faith } from "../utils/types";

interface CompareSectionProps {
  perspectives: Record<Faith, string>;
}

export default function CompareSection({ perspectives }: CompareSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleInterpretation = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="mt-6">
      <button 
        className="w-full flex justify-between items-center py-3 px-4 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm"
        onClick={toggleInterpretation}
      >
        <span className="flex items-center">
          <span className="material-icons text-sm mr-1">compare</span>
          Compare Perspectives
        </span>
        <span className="material-icons">
          {isExpanded ? "expand_less" : "expand_more"}
        </span>
      </button>
      
      {isExpanded && (
        <div className="mt-3 bg-slate-700 rounded-lg p-4 animate-fade-in">
          <h4 className="font-medium mb-2">Other Faith Perspectives</h4>
          
          <div className="space-y-3">
            {Object.entries(perspectives)
              .filter(([faith, content]) => content && content.trim() !== "")
              .map(([faith, content]) => (
                <div key={faith} className="flex items-start">
                  <span 
                    className="text-lg mr-2 mt-1"
                    style={{ color: faithData[faith as Faith].accentColor }}
                  >
                    {faithData[faith as Faith].symbol}
                  </span>
                  <div>
                    <p className="font-medium text-sm">{faithData[faith as Faith].name}</p>
                    <p className="text-sm text-slate-300">{content}</p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { useFaith } from "../context/FaithContext";
import { useSavedItems } from "../context/SavedItemsContext";
import { faithData } from "../utils/faithData";
import { getDailyBlessing } from "../utils/openai";
import { DailyBlessingResponse } from "../utils/types";
import { useToast } from "@/hooks/use-toast";

export default function DailyBlessing() {
  const { currentFaith, language } = useFaith();
  const { saveItem } = useSavedItems();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [blessing, setBlessing] = useState<DailyBlessingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBlessing() {
      try {
        setLoading(true);
        setError(null);
        const data = await getDailyBlessing(currentFaith, language);
        setBlessing(data);
      } catch (err: any) {
        console.error("Error fetching daily blessing:", err);
        // Provide more specific error messages based on error type
        if (err.message && err.message.includes("API key")) {
          setError("OpenAI API key error. Please check your API key configuration.");
        } else {
          setError("Failed to load daily blessing. Please try again later.");
        }
      } finally {
        setLoading(false);
      }
    }

    fetchBlessing();
  }, [currentFaith, language]);

  const handleSave = () => {
    if (blessing) {
      saveItem({
        faith: currentFaith,
        title: blessing.title,
        content: `${blessing.quote} - ${blessing.source}\n\n${blessing.reflection}`,
        type: "blessing"
      });
      toast({
        title: "Saved",
        description: "Blessing has been saved to your collection.",
      });
    }
  };

  return (
    <div className="mb-8 animate-fade-in">
      <h2 
        className="text-xl font-medium mb-4 flex items-center"
        style={{ color: faithData[currentFaith].accentColor }}
      >
        <span className="material-icons mr-2">wb_sunny</span>
        Daily Blessing
      </h2>
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 shadow-lg">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-candle-flicker h-10 w-10 rounded-full" style={{ backgroundColor: faithData[currentFaith].accentColor }}></div>
          </div>
        ) : error ? (
          <div className="text-center py-6 text-red-400">
            <p>{error}</p>
            <button 
              className="mt-3 px-4 py-2 rounded bg-slate-700 hover:bg-slate-600 text-white"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        ) : blessing ? (
          <div className="flex items-start">
            <div className="flex-1">
              <p className="text-slate-400 mb-2 text-sm">{blessing.title}</p>
              <blockquote className="font-garamond text-xl mb-3 leading-relaxed text-white">
                "{blessing.quote}"
              </blockquote>
              <p className="text-slate-300 text-base mb-4 font-garamond italic">
                — {blessing.source}
              </p>
              <p className="text-slate-300 mt-4">
                {blessing.reflection}
              </p>
              <div className="mt-6 flex items-center flex-wrap gap-2">
                <button 
                  className="flex items-center py-2 px-4 rounded-full text-sm"
                  style={{ 
                    backgroundColor: `${faithData[currentFaith].primaryColor}99` // 60% opacity
                  }}
                  onClick={handleSave}
                >
                  <span className="material-icons text-sm mr-1">bookmark_add</span>
                  Save
                </button>
                <button className="flex items-center py-2 px-4 bg-slate-700 hover:bg-slate-600 rounded-full text-sm">
                  <span className="material-icons text-sm mr-1">share</span>
                  Share
                </button>
                <button className="flex items-center py-2 px-4 bg-slate-700 hover:bg-slate-600 rounded-full text-sm">
                  <span className="material-icons text-sm mr-1">compare</span>
                  Compare Perspectives
                </button>
              </div>
            </div>
            <div className="hidden md:block ml-6">
              <div 
                className="h-20 w-20 rounded-full flex items-center justify-center text-4xl"
                style={{ 
                  backgroundColor: `${faithData[currentFaith].primaryColor}4D`, // 30% opacity
                  color: faithData[currentFaith].accentColor 
                }}
              >
                {faithData[currentFaith].symbol}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-slate-400">
            No blessing available
          </div>
        )}
      </div>
    </div>
  );
}

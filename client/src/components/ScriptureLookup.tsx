import React, { useState } from "react";
import { useFaith } from "../context/FaithContext";
import { faithData } from "../utils/faithData";
import { getScripturePassage } from "../utils/openai";
import { useSavedItems } from "../context/SavedItemsContext";
import { useToast } from "@/hooks/use-toast";
import { ScriptureResponse } from "../utils/types";

interface ScriptureSource {
  name: string;
  value: string;
}

export default function ScriptureLookup() {
  const { currentFaith, language } = useFaith();
  const { saveItem } = useSavedItems();
  const { toast } = useToast();
  const [selectedSource, setSelectedSource] = useState("");
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<ScriptureResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get scripture sources based on current faith
  const getScriptureSources = (): ScriptureSource[] => {
    switch (currentFaith) {
      case "buddhism":
        return [
          { name: "Dhammapada", value: "dhammapada" },
          { name: "Sutta Pitaka", value: "sutta_pitaka" },
          { name: "Heart Sutra", value: "heart_sutra" },
          { name: "Diamond Sutra", value: "diamond_sutra" }
        ];
      case "christianity":
        return [
          { name: "Old Testament", value: "old_testament" },
          { name: "New Testament", value: "new_testament" },
          { name: "Gospels", value: "gospels" },
          { name: "Psalms", value: "psalms" }
        ];
      case "hinduism":
        return [
          { name: "Bhagavad Gita", value: "bhagavad_gita" },
          { name: "Upanishads", value: "upanishads" },
          { name: "Vedas", value: "vedas" },
          { name: "Puranas", value: "puranas" }
        ];
      case "islam":
        return [
          { name: "Quran", value: "quran" },
          { name: "Hadith", value: "hadith" },
          { name: "Sahih al-Bukhari", value: "sahih_bukhari" },
          { name: "Sahih Muslim", value: "sahih_muslim" }
        ];
      case "judaism":
        return [
          { name: "Torah", value: "torah" },
          { name: "Talmud", value: "talmud" },
          { name: "Midrash", value: "midrash" },
          { name: "Zohar", value: "zohar" }
        ];
      case "secular":
        return [
          { name: "Stoic Texts", value: "stoic_texts" },
          { name: "Humanist Writings", value: "humanist_writings" },
          { name: "Philosophical Works", value: "philosophical_works" },
          { name: "Scientific Principles", value: "scientific_principles" }
        ];
      default:
        return [];
    }
  };

  const sources = getScriptureSources();

  const handleSubmit = async () => {
    if (!selectedSource || !reference.trim()) {
      toast({
        title: "Missing information",
        description: "Please select a source and enter a reference.",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getScripturePassage(currentFaith, selectedSource, reference, language);
      setResponse(data);
    } catch (err) {
      console.error("Error getting scripture passage:", err);
      setError("Failed to get scripture passage. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (response) {
      saveItem({
        faith: currentFaith,
        title: `${selectedSource} - ${reference}`,
        content: `${response.passage}\n\n${response.interpretation}\n\nSource: ${response.source}`,
        type: "scripture"
      });
      toast({
        title: "Saved",
        description: "Scripture passage has been saved to your collection.",
      });
    }
  };

  return (
    <div className="mb-8">
      <h2 
        className="text-xl font-medium mb-4 flex items-center"
        style={{ color: faithData[currentFaith].accentColor }}
      >
        <span className="material-icons mr-2">menu_book</span>
        Scripture Lookup
      </h2>
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 shadow-lg">
        <div className="flex items-center space-x-3 mb-4">
          <select 
            className="bg-slate-700 border-slate-600 text-white rounded-lg px-3 py-2 outline-none"
            style={{ 
              border: "1px solid transparent",
              boxShadow: `0 0 0 1px ${faithData[currentFaith].accentColor}`
            }}
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            disabled={loading}
          >
            <option value="">Select Source</option>
            {sources.map((source) => (
              <option key={source.value} value={source.value}>
                {source.name}
              </option>
            ))}
          </select>
          <div className="relative flex-1">
            <input 
              type="text" 
              className="w-full bg-slate-700 border-slate-600 text-white rounded-lg pl-4 pr-12 py-2 outline-none"
              style={{ 
                border: "1px solid transparent",
                boxShadow: `0 0 0 1px ${faithData[currentFaith].accentColor}`
              }}
              placeholder="Chapter or verse..."
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              disabled={loading}
            />
            <button 
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 rounded-full hover:bg-slate-600"
              style={{ color: faithData[currentFaith].accentColor }}
              onClick={handleSubmit}
              disabled={loading || !selectedSource || !reference.trim()}
            >
              <span className="material-icons">search</span>
            </button>
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-candle-flicker h-10 w-10 rounded-full" style={{ backgroundColor: faithData[currentFaith].accentColor }}></div>
          </div>
        ) : error ? (
          <div className="text-center py-6 text-red-400">
            <p>{error}</p>
            <button 
              className="mt-3 px-4 py-2 rounded bg-slate-700 hover:bg-slate-600 text-white"
              onClick={() => setError(null)}
            >
              Try Again
            </button>
          </div>
        ) : response ? (
          <div className="animate-fade-in">
            <div className="mb-4">
              <h3 className="text-lg font-medium mb-2 font-garamond">{response.source}</h3>
              <blockquote className="font-garamond text-xl border-l-4 pl-4 py-1 mb-4" style={{ borderColor: faithData[currentFaith].accentColor }}>
                {response.passage}
              </blockquote>
              <h4 className="text-md font-medium mb-2">Interpretation</h4>
              <p className="text-slate-300">{response.interpretation}</p>
            </div>
            
            <div className="mt-6 flex items-center flex-wrap gap-2">
              <button 
                className="flex items-center py-2 px-4 rounded-full text-sm"
                style={{ backgroundColor: `${faithData[currentFaith].primaryColor}99` }}
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
        ) : (
          <div className="text-center text-slate-400 py-8">
            <span className="material-icons text-4xl mb-2">search</span>
            <p>Search for scripture to see passages and interpretations</p>
          </div>
        )}
      </div>
    </div>
  );
}

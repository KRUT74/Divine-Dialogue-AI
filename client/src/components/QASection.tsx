import React, { useState } from "react";
import { useFaith } from "../context/FaithContext";
import { useSavedItems } from "../context/SavedItemsContext";
import { faithData } from "../utils/faithData";
import { getQAResponse } from "../utils/openai";
import { QAResponse } from "../utils/types";
import { useToast } from "@/hooks/use-toast";
import CompareSection from "./CompareSection";

export default function QASection() {
  const { currentFaith, language } = useFaith();
  const { saveItem } = useSavedItems();
  const { toast } = useToast();
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<QAResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    try {
      setLoading(true);
      setError(null);
      const data = await getQAResponse(currentFaith, question, compareMode, language);
      setResponse(data);
    } catch (err) {
      console.error("Error getting Q&A response:", err);
      setError("Failed to get answer. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (response && question) {
      saveItem({
        faith: currentFaith,
        title: question,
        content: response.answer,
        type: "qa"
      });
      toast({
        title: "Saved",
        description: "Question and answer have been saved to your collection.",
      });
    }
  };

  return (
    <div className="mb-8">
      <h2 
        className="text-xl font-medium mb-4 flex items-center"
        style={{ color: faithData[currentFaith].accentColor }}
      >
        <span className="material-icons mr-2">question_answer</span>
        Ask A Question
      </h2>
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 shadow-lg">
        <form className="mb-6" onSubmit={handleSubmit}>
          <label htmlFor="question" className="sr-only">Your question</label>
          <div className="relative">
            <input 
              type="text" 
              id="question" 
              className="w-full bg-slate-700 border-slate-600 text-white rounded-lg pl-4 pr-12 py-3 focus:outline-none"
              style={{ 
                border: "1px solid transparent",
                boxShadow: `0 0 0 1px ${faithData[currentFaith].accentColor}`
              }}
              placeholder="How to handle anger mindfully?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={loading}
            />
            <button 
              type="submit" 
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 rounded-full hover:bg-slate-600"
              style={{ color: faithData[currentFaith].accentColor }}
              disabled={loading || !question.trim()}
            >
              <span className="material-icons">send</span>
            </button>
          </div>
          <div className="mt-2 flex items-center">
            <input
              type="checkbox"
              id="compareMode"
              checked={compareMode}
              onChange={() => setCompareMode(!compareMode)}
              className="mr-2"
            />
            <label htmlFor="compareMode" className="text-sm text-slate-300">
              Enable comparative mode (shows perspectives from other faiths)
            </label>
          </div>
        </form>
        
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
          <div className="space-y-4 animate-fade-in">
            {/* Virtual Guide Avatar */}
            <div className="flex items-center mb-4">
              <div 
                className="h-10 w-10 rounded-full flex items-center justify-center text-xl mr-3"
                style={{ 
                  backgroundColor: `${faithData[currentFaith].primaryColor}4D`, // 30% opacity
                  color: faithData[currentFaith].accentColor 
                }}
              >
                {faithData[currentFaith].symbol}
              </div>
              <div>
                <p className="font-medium">{faithData[currentFaith].name} Guide</p>
                <p className="text-sm text-slate-400">Spiritual Teacher</p>
              </div>
            </div>
            
            {/* Answer Content */}
            <div className="font-garamond text-lg leading-relaxed text-white" dangerouslySetInnerHTML={{ __html: response.answer }} />
            
            {/* Interpretation/Compare Section */}
            {compareMode && response.perspectives && (
              <CompareSection perspectives={response.perspectives} />
            )}
            
            {/* Action Buttons */}
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
                <span className="material-icons text-sm mr-1">format_quote</span>
                Cite Source
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center text-slate-400 py-8">
            <span className="material-icons text-4xl mb-2">question_answer</span>
            <p>Ask a question about {faithData[currentFaith].name} to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}

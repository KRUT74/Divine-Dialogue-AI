export type Faith = "buddhism" | "christianity" | "hinduism" | "islam" | "judaism" | "secular";

export type FaithInfo = {
  name: string;
  symbol: string;
  primaryColor: string;
  accentColor: string;
  greeting: string;
  tailwindBg: string;
};

export type Language = "english" | "spanish" | "arabic" | "hindi";

export interface SavedItem {
  id: string;
  faith: Faith;
  title: string;
  content: string;
  type: "blessing" | "qa" | "scripture";
  dateCreated: string;
}

export interface DailyBlessingResponse {
  title: string;
  quote: string;
  source: string;
  reflection: string;
}

export interface QAResponse {
  answer: string;
  perspectives?: Record<Faith, string>;
}

export interface ScriptureResponse {
  passage: string;
  interpretation: string;
  source: string;
}

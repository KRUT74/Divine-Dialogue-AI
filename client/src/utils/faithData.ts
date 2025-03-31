import { Faith, FaithInfo } from "./types";

export const faithData: Record<Faith, FaithInfo> = {
  buddhism: {
    name: "Buddhism",
    symbol: "☸",
    primaryColor: "#44403c", // stone-800
    accentColor: "#f59e0b", // amber-500 (saffron)
    greeting: "May you be free from suffering",
    tailwindBg: "bg-stone-800"
  },
  christianity: {
    name: "Christianity",
    symbol: "✝",
    primaryColor: "#312e81", // indigo-900
    accentColor: "#fbbf24", // amber-400 (gold)
    greeting: "Grace and peace to you",
    tailwindBg: "bg-indigo-900"
  },
  hinduism: {
    name: "Hinduism",
    symbol: "ॐ",
    primaryColor: "#581c87", // purple-900
    accentColor: "#0d9488", // teal-600 (turquoise)
    greeting: "Namaste. All is Divine",
    tailwindBg: "bg-purple-900"
  },
  islam: {
    name: "Islam",
    symbol: "☪",
    primaryColor: "#064e3b", // green-900
    accentColor: "#fef3c7", // amber-50 (cream)
    greeting: "As-salamu alaykum",
    tailwindBg: "bg-green-900"
  },
  judaism: {
    name: "Judaism",
    symbol: "✡",
    primaryColor: "#1e3a8a", // blue-900
    accentColor: "#94a3b8", // slate-400 (silver)
    greeting: "Shalom. Walk in light",
    tailwindBg: "bg-blue-900"
  },
  secular: {
    name: "Secular",
    symbol: "∞",
    primaryColor: "#334155", // slate-700
    accentColor: "#0d9488", // teal-600
    greeting: "Reflect with intention",
    tailwindBg: "bg-slate-700"
  }
};

export const faithList: Faith[] = [
  "buddhism", 
  "christianity", 
  "hinduism", 
  "islam", 
  "judaism", 
  "secular"
];

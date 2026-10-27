export const FAITHS = ["buddhism", "christianity", "hinduism", "islam", "judaism", "secular"] as const
export type Faith = (typeof FAITHS)[number]

export const LANGUAGES = ["english", "spanish"] as const
export type Language = (typeof LANGUAGES)[number]

export const LANGUAGE_LABELS: Record<Language, string> = {
  english: "English",
  spanish: "Español",
}

/** ISO 639-1 codes, for speech recognition and synthesis. */
export const LANGUAGE_CODES: Record<Language, string> = { english: "en", spanish: "es" }

export type FaithInfo = {
  name: string
  symbol: string
  primaryColor: string
  accentColor: string
  greeting: string
  /** Texts the scripture lookup can draw from. */
  sources: string[]
}

export const FAITH_INFO: Record<Faith, FaithInfo> = {
  buddhism: {
    name: "Buddhism",
    symbol: "☸",
    primaryColor: "#44403c",
    accentColor: "#f59e0b",
    greeting: "May you be free from suffering",
    sources: ["Dhammapada", "Sutta Pitaka", "Heart Sutra", "Diamond Sutra"],
  },
  christianity: {
    name: "Christianity",
    symbol: "✝",
    primaryColor: "#312e81",
    accentColor: "#fbbf24",
    greeting: "Grace and peace to you",
    sources: ["Old Testament", "New Testament", "Gospels", "Psalms"],
  },
  hinduism: {
    name: "Hinduism",
    symbol: "ॐ",
    primaryColor: "#581c87",
    accentColor: "#2dd4bf",
    greeting: "Namaste. All is Divine",
    sources: ["Bhagavad Gita", "Upanishads", "Rigveda", "Ramayana"],
  },
  islam: {
    name: "Islam",
    symbol: "☪",
    primaryColor: "#064e3b",
    accentColor: "#fef3c7",
    greeting: "As-salamu alaykum",
    sources: ["Quran", "Sahih al-Bukhari", "Sahih Muslim", "Forty Hadith of an-Nawawi"],
  },
  judaism: {
    name: "Judaism",
    symbol: "✡",
    primaryColor: "#1e3a8a",
    accentColor: "#cbd5e1",
    greeting: "Shalom. Walk in light",
    sources: ["Torah", "Psalms", "Pirkei Avot", "Talmud"],
  },
  secular: {
    name: "Secular",
    symbol: "∞",
    primaryColor: "#334155",
    accentColor: "#2dd4bf",
    greeting: "Reflect with intention",
    sources: ["Marcus Aurelius, Meditations", "Seneca, Letters", "Epictetus, Enchiridion", "Humanist writings"],
  },
}

export function isFaith(value: unknown): value is Faith {
  return typeof value === "string" && (FAITHS as readonly string[]).includes(value)
}

export function isLanguage(value: unknown): value is Language {
  return typeof value === "string" && (LANGUAGES as readonly string[]).includes(value)
}

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
  /** Ink colour on the ivory page (at least 4.5:1 contrast). */
  color: string
  /** The same colour for the night (dark) theme. */
  nightColor: string
  greeting: string
}

export const FAITH_INFO: Record<Faith, FaithInfo> = {
  buddhism: {
    name: "Buddhism",
    symbol: "☸",
    color: "#9a5b13",
    nightColor: "#e0a458",
    greeting: "May you be free from suffering",
  },
  christianity: {
    name: "Christianity",
    symbol: "✝",
    color: "#8c2f39",
    nightColor: "#e08a92",
    greeting: "Grace and peace to you",
  },
  hinduism: {
    name: "Hinduism",
    symbol: "ॐ",
    color: "#a8431c",
    nightColor: "#ec8f66",
    greeting: "Namaste. All is Divine",
  },
  islam: {
    name: "Islam",
    symbol: "☪",
    color: "#1f6b4f",
    nightColor: "#6fc3a0",
    greeting: "As-salamu alaykum",
  },
  judaism: {
    name: "Judaism",
    symbol: "✡",
    color: "#2c4f8c",
    nightColor: "#8fb1e8",
    greeting: "Shalom. Walk in light",
  },
  secular: {
    name: "Secular",
    symbol: "∞",
    color: "#4a5560",
    nightColor: "#a9b4bf",
    greeting: "Reflect with intention",
  },
}

export function isFaith(value: unknown): value is Faith {
  return typeof value === "string" && (FAITHS as readonly string[]).includes(value)
}

export function isLanguage(value: unknown): value is Language {
  return typeof value === "string" && (LANGUAGES as readonly string[]).includes(value)
}

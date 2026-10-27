import type { Faith } from "./faiths"

/** Every text the guides can quote from. */
export const WORKS = {
  bible: { label: "Bible", example: "Matthew 5:9", help: "Book chapter:verse(s), like 'Matthew 5:9', 'Psalm 23:1-4' or '1 Corinthians 13:4-7'" },
  quran: { label: "Quran", example: "94:5-6", help: "Surah:verse(s), like '94:5' or '2:255-256'" },
  bukhari: { label: "Sahih al-Bukhari", example: "1", help: "The hadith number, like '1'" },
  muslim: { label: "Sahih Muslim", example: "2564", help: "The hadith number, like '2564'" },
  nawawi: { label: "Forty Hadith of an-Nawawi", example: "13", help: "The hadith number, 1 to 42" },
  gita: { label: "Bhagavad Gita", example: "2:47", help: "Chapter:verse(s), like '2:47' or '6:5-6'" },
  dhammapada: { label: "Dhammapada", example: "5", help: "Verse number(s), like '5' or '183-185'" },
  sutta: { label: "Suttas (SuttaCentral)", example: "snp1.8", help: "A short sutta's SuttaCentral id, like 'snp1.8' (the Metta Sutta)" },
  sefaria: { label: "Torah, Mishnah & Talmud (Sefaria)", example: "Pirkei Avot 1:14", help: "A Sefaria reference, like 'Leviticus 19:34', 'Pirkei Avot 1:14' or 'Shabbat 31a'" },
  meditations: { label: "Marcus Aurelius, Meditations", example: "4.3", help: "Book.section, like '2.1' or '4.3'" },
  enchiridion: { label: "Epictetus, Enchiridion", example: "1", help: "Section number, 1 to 51" },
} as const

export type Work = keyof typeof WORKS
export const WORK_IDS = Object.keys(WORKS) as [Work, ...Work[]]

/** The texts offered in the scripture reader for each tradition. */
export const FAITH_WORKS: Record<Faith, Work[]> = {
  buddhism: ["dhammapada", "sutta"],
  christianity: ["bible"],
  hinduism: ["gita"],
  islam: ["quran", "nawawi", "bukhari", "muslim"],
  judaism: ["sefaria"],
  secular: ["meditations", "enchiridion"],
}

export function isWork(value: unknown): value is Work {
  return typeof value === "string" && value in WORKS
}

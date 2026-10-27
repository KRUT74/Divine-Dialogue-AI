import "server-only"
import secular from "@/data/secular.json"
import type { Language } from "@/lib/faiths"
import type { Citation } from "@/lib/schemas"
import type { Work } from "@/lib/works"

export type PassageResult = { ok: true; passage: Omit<Citation, "id"> } | { ok: false; error: string }

const MAX_VERSES = 8
const MAX_CHARS = 2500
const TIMEOUT_MS = 8000

// Successful lookups never change, so keep recent ones in memory.
const cache = new Map<string, Omit<Citation, "id">>()
const CACHE_LIMIT = 500

export async function getPassage(work: Work, reference: string, language: Language): Promise<PassageResult> {
  const key = `${work}|${reference.trim().toLowerCase()}|${language}`
  const cached = cache.get(key)
  if (cached) return { ok: true, passage: cached }
  try {
    const passage = await LOOKUPS[work](reference.trim(), language)
    if (passage.text.length > MAX_CHARS) {
      return { ok: false, error: "That passage is too long to quote. Choose a shorter range." }
    }
    if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value!)
    cache.set(key, passage)
    return { ok: true, passage }
  } catch (error) {
    if (error instanceof NotFound) return { ok: false, error: error.message }
    console.error(`Passage lookup failed: ${work} ${reference}`, error)
    return { ok: false, error: "The source could not be reached. Don't quote this passage." }
  }
}

class NotFound extends Error {}

async function getJson(url: string, attempt = 1): Promise<unknown> {
  const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), next: { revalidate: 86400 } })
  if (response.status === 404) throw new NotFound("No passage exists at that reference.")
  // Busy or briefly failing sources usually answer on a second try.
  if ((response.status === 429 || response.status >= 500) && attempt < 2) {
    await new Promise((resolve) => setTimeout(resolve, 800))
    return getJson(url, attempt + 1)
  }
  if (!response.ok) throw new Error(`${url} returned ${response.status}`)
  return response.json()
}

const stripHtml = (text: string) =>
  text
    .replace(/<sup[^>]*>.*?<\/sup>|<i class="footnote">.*?<\/i>/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()

/** Parses "12", "12-14" or "12–14" into an inclusive range, capped at MAX_VERSES. */
function range(text: string): [number, number] {
  const match = text.trim().match(/^(\d+)(?:\s*[-–]\s*(\d+))?$/)
  if (!match) throw new NotFound(`Couldn't read the verse number in "${text}".`)
  const from = Number(match[1])
  const to = Number(match[2] ?? match[1])
  if (to < from) throw new NotFound(`"${text}" is not a valid range.`)
  if (to - from + 1 > MAX_VERSES) throw new NotFound(`Quote at most ${MAX_VERSES} verses at a time.`)
  return [from, to]
}

function chapterAndVerses(reference: string): { chapter: number; verses: [number, number] } {
  const match = reference.match(/^(\d+)\s*[:.]\s*(.+)$/)
  if (!match) throw new NotFound(`Use chapter:verse, like "2:47".`)
  return { chapter: Number(match[1]), verses: range(match[2]) }
}

const numbers = ([from, to]: [number, number]) => Array.from({ length: to - from + 1 }, (_, i) => from + i)

const LOOKUPS: Record<Work, (reference: string, language: Language) => Promise<Omit<Citation, "id">>> = {
  bible: lookUpBible,
  quran: lookUpQuran,
  bukhari: (ref) => lookUpHadith("bukhari", "Sahih al-Bukhari", ref),
  muslim: (ref) => lookUpHadith("muslim", "Sahih Muslim", ref),
  nawawi: (ref) => lookUpHadith("nawawi", "Forty Hadith of an-Nawawi", ref),
  gita: lookUpGita,
  dhammapada: lookUpDhammapada,
  sutta: lookUpSutta,
  sefaria: lookUpSefaria,
  meditations: async (ref) => lookUpSecular("meditations", ref.replace(/^(\d+)[:.,]\s*/, "$1.")),
  enchiridion: async (ref) => lookUpSecular("enchiridion", ref),
}

// Standard Protestant book order, which getbible.net numbers 1 to 66.
const BIBLE_BOOKS = [
  "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel",
  "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra", "Nehemiah", "Esther", "Job", "Psalms", "Proverbs",
  "Ecclesiastes", "Song of Solomon", "Isaiah", "Jeremiah", "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel",
  "Amos", "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi",
  "Matthew", "Mark", "Luke", "John", "Acts", "Romans", "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians",
  "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians", "1 Timothy", "2 Timothy", "Titus", "Philemon",
  "Hebrews", "James", "1 Peter", "2 Peter", "1 John", "2 John", "3 John", "Jude", "Revelation",
]
const BOOK_ALIASES: Record<string, string> = { psalm: "Psalms", "song of songs": "Song of Solomon", revelations: "Revelation" }

function bibleBook(name: string): number {
  const normalised = name.toLowerCase().replace(/\s+/g, " ").trim()
  const canonical = BOOK_ALIASES[normalised] ?? name
  const index = BIBLE_BOOKS.findIndex((book) => book.toLowerCase() === canonical.toLowerCase())
  if (index < 0) throw new NotFound(`"${name}" isn't a book of the Bible this guide can quote. Use the English book name.`)
  return index + 1
}

async function lookUpBible(reference: string, language: Language) {
  const match = reference.match(/^(.+?)\s+(\d+)\s*:\s*(.+)$/)
  if (!match) throw new NotFound(`Use Book chapter:verse, like "Matthew 5:9".`)
  const bookNumber = bibleBook(match[1])
  const chapter = Number(match[2])
  const verses = range(match[3])
  const version = language === "spanish" ? { id: "valera", name: "Reina-Valera 1909", gateway: "RVR1909" } : { id: "web", name: "World English Bible", gateway: "WEB" }

  const data = (await getJson(`https://api.getbible.net/v2/${version.id}/${bookNumber}/${chapter}.json`)) as {
    name: string
    verses: { verse: number; text: string }[]
  }
  const chosen = data.verses.filter((v) => v.verse >= verses[0] && v.verse <= verses[1])
  if (!chosen.length) throw new NotFound("No passage exists at that reference.")
  const label = `${chapter}:${verses[0]}${verses[1] > verses[0] ? `-${verses[1]}` : ""}`
  // getbible names the chapter in the translation's language, e.g. "Mateo 5".
  const book = data.name.replace(/\s+\d+$/, "")
  return {
    work: "bible",
    reference: `${book} ${label}`,
    text: chosen.map((v) => v.text.trim()).join(" "),
    translation: version.name,
    url: `https://www.biblegateway.com/passage/?search=${encodeURIComponent(`${BIBLE_BOOKS[bookNumber - 1]} ${label}`)}&version=${version.gateway}`,
  }
}

/**
 * The Quran and hadith texts come from fawazahmed0's open datasets. jsDelivr serves
 * their minified files reliably; GitHub's raw files are the fallback.
 */
async function getDataset(repo: "quran-api" | "hadith-api", path: string): Promise<unknown> {
  try {
    return await getJson(`https://cdn.jsdelivr.net/gh/fawazahmed0/${repo}@1/${path}.min.json`)
  } catch (error) {
    if (error instanceof NotFound) throw error
    return getJson(`https://raw.githubusercontent.com/fawazahmed0/${repo}/1/${path}.json`)
  }
}

// This dataset drops each verse's closing punctuation.
function endSentence(text: string): string {
  if (/[.!?"”’)\]]$/.test(text)) return text
  return text + (text.startsWith("¡") ? "!" : text.startsWith("¿") ? "?" : ".")
}

let surahNames: Promise<Map<number, string>> | null = null

function surahName(chapter: number): Promise<string | undefined> {
  surahNames ??= (getDataset("quran-api", "info") as Promise<{ chapters: { chapter: number; name: string }[] }>)
    .then((info) => new Map(info.chapters.map((c) => [c.chapter, c.name])))
    .catch((error) => {
      surahNames = null
      throw error
    })
  return surahNames.then((names) => names.get(chapter))
}

async function lookUpQuran(reference: string, language: Language) {
  const { chapter, verses } = chapterAndVerses(reference)
  // Umm Muhammad is the Saheeh International translation.
  const edition = language === "spanish" ? "spa-juliocortes" : "eng-ummmuhammad"
  const [name, surah] = await Promise.all([
    surahName(chapter).catch(() => undefined),
    getDataset("quran-api", `editions/${edition}/${chapter}`) as Promise<{ chapter: { verse: number; text: string }[] }>,
  ])
  const ayahs = surah.chapter.filter((ayah) => ayah.verse >= verses[0] && ayah.verse <= verses[1])
  if (ayahs.length !== verses[1] - verses[0] + 1) throw new NotFound("No passage exists at that reference.")
  const label = `${chapter}:${verses[0]}${verses[1] > verses[0] ? `-${verses[1]}` : ""}`
  return {
    work: "quran",
    reference: `Quran ${label}${name ? ` (${name})` : ""}`,
    text: ayahs.map((a) => endSentence(a.text.trim())).join(" "),
    translation: language === "spanish" ? "Julio Cortés" : "Saheeh International",
    url: `https://quran.com/${chapter}/${verses[0]}${verses[1] > verses[0] ? `-${verses[1]}` : ""}`,
  }
}

async function lookUpHadith(collection: "bukhari" | "muslim" | "nawawi", title: string, reference: string) {
  const number = reference.replace(/^\D+/, "").match(/^\d+/)?.[0]
  if (!number) throw new NotFound(`Use the hadith number, like "1".`)
  const data = (await getDataset("hadith-api", `editions/eng-${collection}/${number}`)) as { hadiths: { text: string }[] }
  const text = data.hadiths.map((h) => h.text.trim()).join(" ")
  if (!text) throw new NotFound("No hadith exists with that number.")
  const slug = collection === "nawawi" ? "nawawi40" : collection
  return {
    work: collection,
    reference: `${title} ${number}`,
    text,
    translation: "English translation via hadith-api",
    url: `https://sunnah.com/${slug}:${number}`,
  }
}

async function lookUpGita(reference: string) {
  const { chapter, verses } = chapterAndVerses(reference)
  const slokas = await Promise.all(
    numbers(verses).map(
      (verse) =>
        getJson(`https://vedicscriptures.github.io/slok/${chapter}/${verse}/`) as Promise<{
          purohit: { et: string }
        }>,
    ),
  )
  const label = `${chapter}.${verses[0]}${verses[1] > verses[0] ? `-${verses[1]}` : ""}`
  return {
    work: "gita",
    reference: `Bhagavad Gita ${label}`,
    text: slokas.map((s) => s.purohit.et.replace(/^\s*\d+\.\d+\s*/, "").trim()).join(" "),
    translation: "Shri Purohit Swami",
    url: `https://vedabase.io/en/library/bg/${chapter}/${verses[0]}/`,
  }
}

// The Dhammapada's chapters on SuttaCentral, by their first and last verse.
const DHAMMAPADA_CHAPTERS = [
  [1, 20], [21, 32], [33, 43], [44, 59], [60, 75], [76, 89], [90, 99], [100, 115], [116, 128], [129, 145],
  [146, 156], [157, 166], [167, 178], [179, 196], [197, 208], [209, 220], [221, 234], [235, 255], [256, 272],
  [273, 289], [290, 305], [306, 319], [320, 333], [334, 359], [360, 382], [383, 423],
]

type Bilara = { translation_text: Record<string, string>; keys_order: string[] }

async function lookUpDhammapada(reference: string) {
  const verses = range(reference.replace(/^\D+/, ""))
  const chapter = DHAMMAPADA_CHAPTERS.find(([first, last]) => verses[0] >= first && verses[0] <= last)
  if (!chapter || verses[1] > chapter[1]) throw new NotFound("Choose verses from one chapter of the Dhammapada (1-423).")
  const data = (await getJson(
    `https://suttacentral.net/api/bilarasuttas/dhp${chapter[0]}-${chapter[1]}/sujato?lang=en`,
  )) as Bilara
  const wanted = new Set(numbers(verses).map((v) => `dhp${v}`))
  const text = data.keys_order
    .filter((key) => wanted.has(key.split(":")[0]) && !key.includes(":0"))
    .map((key) => stripHtml(data.translation_text[key] ?? ""))
    .filter(Boolean)
    .join(" ")
  if (!text) throw new NotFound("No verse exists at that number.")
  const label = `${verses[0]}${verses[1] > verses[0] ? `-${verses[1]}` : ""}`
  return {
    work: "dhammapada",
    reference: `Dhammapada ${label}`,
    text,
    translation: "Bhikkhu Sujato (CC0)",
    url: `https://suttacentral.net/dhp${chapter[0]}-${chapter[1]}/en/sujato`,
  }
}

async function lookUpSutta(reference: string) {
  const uid = reference.toLowerCase().replace(/\s+/g, "")
  if (!/^[a-z]+[\d.]+(-\d+)?$/.test(uid)) throw new NotFound(`Use a SuttaCentral id, like "snp1.8".`)
  const data = (await getJson(`https://suttacentral.net/api/bilarasuttas/${uid}/sujato?lang=en`)) as Bilara
  if (!data.keys_order?.length) throw new NotFound("No sutta exists with that id.")
  const title = data.translation_text[data.keys_order.find((key) => key.endsWith(":0.2")) ?? ""] ?? uid
  const text = data.keys_order
    .filter((key) => !key.includes(":0."))
    .map((key) => stripHtml(data.translation_text[key] ?? ""))
    .filter(Boolean)
    .join(" ")
  if (text.length > MAX_CHARS) {
    throw new NotFound("That sutta is too long to quote in full. Choose a Dhammapada verse or a shorter sutta.")
  }
  return {
    work: "sutta",
    reference: `${title.trim()} (${uid})`,
    text,
    translation: "Bhikkhu Sujato (CC0)",
    url: `https://suttacentral.net/${uid}/en/sujato`,
  }
}

async function lookUpSefaria(reference: string) {
  const ref = reference.trim().replace(/\s+/g, "_")
  const data = (await getJson(`https://www.sefaria.org/api/v3/texts/${encodeURIComponent(ref)}?version=english`)) as {
    ref?: string
    error?: string
    versions?: { text: unknown; versionTitle: string }[]
  }
  const version = data.versions?.[0]
  if (data.error || !version) throw new NotFound(data.error ?? "No passage exists at that reference.")
  const parts = [version.text].flat(3).filter((part): part is string => typeof part === "string")
  const text = stripHtml(parts.join(" "))
  if (!text) throw new NotFound("No English text exists at that reference.")
  return {
    work: "sefaria",
    reference: data.ref ?? reference,
    text,
    translation: version.versionTitle,
    url: `https://www.sefaria.org/${encodeURIComponent(ref)}`,
  }
}

function lookUpSecular(work: "meditations" | "enchiridion", reference: string) {
  const source = secular[work]
  const key = reference.replace(/\s+/g, "")
  const text = (source.sections as Record<string, string>)[key]
  if (!text) {
    throw new NotFound(
      work === "meditations" ? 'Use book.section, like "2.1" (books 1-12).' : "Use a section number from 1 to 51.",
    )
  }
  return {
    work,
    reference: `${source.author}, ${source.title} ${key}`,
    text,
    translation: source.translation,
    url: source.url,
  }
}

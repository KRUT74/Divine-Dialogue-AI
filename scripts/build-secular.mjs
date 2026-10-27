// Downloads the public-domain secular texts from Project Gutenberg and writes
// data/secular.json, keyed by work and section, for the passage lookup.
// Run with: node scripts/build-secular.mjs
import { writeFile } from "node:fs/promises"

const ROMAN = { I: 1, V: 5, X: 10, L: 50, C: 100 }
function fromRoman(numeral) {
  let total = 0
  for (let i = 0; i < numeral.length; i++) {
    const value = ROMAN[numeral[i]]
    const next = ROMAN[numeral[i + 1]] ?? 0
    total += value < next ? -value : value
  }
  return total
}

async function gutenberg(id) {
  const response = await fetch(`https://www.gutenberg.org/cache/epub/${id}/pg${id}.txt`)
  if (!response.ok) throw new Error(`Gutenberg ${id}: ${response.status}`)
  const text = (await response.text()).replace(/\r\n/g, "\n")
  const start = text.indexOf("*** START OF")
  const end = text.indexOf("*** END OF")
  return text.slice(text.indexOf("\n", start) + 1, end)
}

const clean = (paragraph) => paragraph.replace(/\s+/g, " ").trim()

// Meditations, translated by George Long (Gutenberg #15877), which follows the
// standard book.section numbering. Books are headed "I." … "XII." on their own
// line; sections start with "2. ", "3. " and so on, the first being unnumbered.
async function meditations() {
  const text = (await gutenberg(15877)).replace(/\[[A-Z]\]/g, "")
  const body = text.slice(0, text.indexOf("\nINDEXES."))
  const sections = {}
  const books = body.split(/\n([IVX]+)\.\n/)
  // books[0] is the introduction; then alternating numeral, text.
  for (let i = 1; i < books.length; i += 2) {
    const book = fromRoman(books[i])
    const parts = books[i + 1].split(/\n(\d+)\. /)
    sections[`${book}.1`] = clean(parts[0])
    for (let j = 1; j < parts.length; j += 2) sections[`${book}.${parts[j]}`] = clean(parts[j + 1])
  }
  if (Object.keys(sections).length < 400) throw new Error("Meditations parsed too few sections")
  return sections
}

// The Enchiridion, translated by Thomas W. Higginson (Gutenberg #45109).
// Sections are headed by a centred Roman numeral on its own line.
async function enchiridion() {
  const text = await gutenberg(45109)
  const body = text.slice(text.indexOf("THE ENCHIRIDION\n\n\n"), text.lastIndexOf("Footnotes"))
  const sections = {}
  const parts = body.split(/\n {10,}([IVXLC]+)(?:\[\d+\])?\n/)
  for (let i = 1; i < parts.length; i += 2) {
    sections[String(fromRoman(parts[i]))] = clean(parts[i + 1].replace(/\[\d+\]/g, ""))
  }
  return sections
}

const data = {
  meditations: { title: "Meditations", author: "Marcus Aurelius", translation: "George Long (public domain)", url: "https://www.gutenberg.org/ebooks/15877", sections: await meditations() },
  enchiridion: { title: "Enchiridion", author: "Epictetus", translation: "Thomas W. Higginson (public domain)", url: "https://www.gutenberg.org/ebooks/45109", sections: await enchiridion() },
}
await writeFile(new URL("../data/secular.json", import.meta.url), JSON.stringify(data) + "\n")
for (const [key, work] of Object.entries(data)) console.log(key, Object.keys(work.sections).length, "sections")

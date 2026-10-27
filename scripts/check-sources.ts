// Fetches one passage from every source, in both languages, to check they still work.
// Run with: pnpm check:sources
import { getPassage } from "@/lib/server/scripture"
import type { Work } from "@/lib/works"

const CASES: [Work, string][] = [
  ["bible", "Matthew 5:9"],
  ["bible", "Psalm 23:1-3"],
  ["bible", "1 Corinthians 13:4-5"],
  ["quran", "94:5-6"],
  ["bukhari", "1"],
  ["muslim", "2564"],
  ["nawawi", "13"],
  ["gita", "2:47"],
  ["dhammapada", "5"],
  ["dhammapada", "183-185"],
  ["sutta", "snp1.8"],
  ["sefaria", "Leviticus 19:34"],
  ["sefaria", "Pirkei Avot 1:14"],
  ["sefaria", "Shabbat 31a:6"],
  ["meditations", "2.1"],
  ["enchiridion", "1"],
  // These should fail politely.
  ["bible", "John 999:1"],
  ["gita", "47:3"],
  ["sutta", "mn10"],
  ["meditations", "13.1"],
]

let failures = 0
for (const language of ["english", "spanish"] as const) {
  for (const [work, reference] of CASES) {
    const result = await getPassage(work, reference, language)
    const line = result.ok
      ? `ok   ${result.passage.reference} [${result.passage.translation}] ${result.passage.text.slice(0, 70)}`
      : `FAIL ${result.error}`
    if (!result.ok) failures++
    console.log(`${language.slice(0, 2)} ${work.padEnd(11)} ${reference.padEnd(20)} ${line}`)
  }
}
console.log(`${failures} lookups returned an error (8 expected).`)

// Every daily-blessing passage must resolve in both languages.
const { BLESSING_PASSAGES } = await import("@/lib/server/blessings")
let blessingFailures = 0
for (const [faith, passages] of Object.entries(BLESSING_PASSAGES)) {
  for (const [work, reference] of passages) {
    for (const language of ["english", "spanish"] as const) {
      const result = await getPassage(work, reference, language)
      if (!result.ok) {
        blessingFailures++
        console.log(`Blessing passage failed: ${faith} ${work} ${reference} (${language}): ${result.error}`)
      } else if (result.passage.text.length > 900) {
        console.log(`Blessing passage is long (${result.passage.text.length} chars): ${faith} ${work} ${reference}`)
      }
    }
  }
}
console.log(`${blessingFailures} blessing passages failed (0 expected).`)
if (failures !== 8 || blessingFailures) process.exitCode = 1

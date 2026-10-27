import "server-only"
import type { Faith } from "@/lib/faiths"
import type { Work } from "@/lib/works"

/**
 * Hand-picked passages for the daily blessing. The text is always fetched from
 * the source, so the blessing never misquotes; `pnpm check:sources` verifies
 * that every reference here resolves.
 */
export const BLESSING_PASSAGES: Record<Faith, [Work, string][]> = {
  buddhism: [
    ["dhammapada", "5"], ["dhammapada", "50"], ["dhammapada", "81"], ["dhammapada", "103"], ["dhammapada", "121"],
    ["dhammapada", "183"], ["dhammapada", "197"], ["dhammapada", "204"], ["dhammapada", "223"], ["dhammapada", "252"],
    ["dhammapada", "277"], ["dhammapada", "354"],
  ],
  christianity: [
    ["bible", "Matthew 5:9"], ["bible", "Micah 6:8"], ["bible", "Psalm 46:10"], ["bible", "Philippians 4:6-7"],
    ["bible", "1 Corinthians 13:4-7"], ["bible", "Romans 12:12"], ["bible", "John 14:27"], ["bible", "Matthew 11:28-30"],
    ["bible", "Isaiah 40:31"], ["bible", "Lamentations 3:22-23"], ["bible", "Colossians 3:12"], ["bible", "Psalm 23:1-3"],
  ],
  hinduism: [
    ["gita", "2:47"], ["gita", "2:14"], ["gita", "2:48"], ["gita", "2:70"], ["gita", "3:19"], ["gita", "5:18"],
    ["gita", "6:5"], ["gita", "6:17"], ["gita", "9:22"], ["gita", "12:13"], ["gita", "4:38"], ["gita", "18:66"],
  ],
  islam: [
    ["quran", "94:5-6"], ["quran", "2:286"], ["quran", "13:28"], ["quran", "2:152"], ["quran", "49:13"],
    ["quran", "3:159"], ["quran", "2:153"], ["quran", "39:53"], ["quran", "93:3-5"], ["quran", "65:3"],
    ["nawawi", "13"], ["nawawi", "18"],
  ],
  judaism: [
    ["sefaria", "Pirkei Avot 1:14"], ["sefaria", "Pirkei Avot 2:16"], ["sefaria", "Micah 6:8"], ["sefaria", "Leviticus 19:18"],
    ["sefaria", "Psalms 121:1-2"], ["sefaria", "Pirkei Avot 1:2"], ["sefaria", "Pirkei Avot 4:1"], ["sefaria", "Psalms 118:24"],
    ["sefaria", "Deuteronomy 30:19"], ["sefaria", "Proverbs 3:17"], ["sefaria", "Ecclesiastes 3:1"], ["sefaria", "Pirkei Avot 1:15"],
  ],
  secular: [
    ["meditations", "2.1"], ["meditations", "4.17"], ["meditations", "4.7"], ["meditations", "5.25"], ["meditations", "7.69"],
    ["meditations", "8.47"], ["meditations", "10.16"], ["meditations", "4.43"], ["enchiridion", "11"], ["enchiridion", "5"],
    ["enchiridion", "8"], ["enchiridion", "43"],
  ],
}

/** Picks the day's passage, rotating through each tradition's list. */
export function blessingPassageFor(faith: Faith, isoDate: string): [Work, string] {
  const day = Math.floor(Date.parse(isoDate) / 86_400_000)
  const passages = BLESSING_PASSAGES[faith]
  return passages[day % passages.length]
}

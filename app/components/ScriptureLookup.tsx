"use client"

import { Mic, Search, Square, Volume2 } from "lucide-react"
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react"
import { FAITH_INFO, type Faith, type Language } from "@/lib/faiths"
import type { Reading } from "@/lib/schemas"
import { FAITH_WORKS, WORKS, type Work } from "@/lib/works"
import { readPassage } from "../lib/api"
import { useAppState } from "../lib/state"
import { useDictation } from "../lib/voice/useDictation"
import { useReadAloud } from "../lib/voice/useReadAloud"
import { claimVoice } from "../lib/voice/voiceOwner"
import { ErrorMessage, Loading, Placeholder, Quote, SaveButton, Section } from "./ui"

type Result = { faith: Faith; language: Language; reading: Reading }

const SPOKEN_REFERENCE: Record<Language, { to: string; verse: string; verses: string; chapter: string; surah: string; book: string; section: string; sections: string }> = {
  english: { to: "to", verse: "verse", verses: "verses", chapter: "chapter", surah: "surah", book: "book", section: "section", sections: "sections" },
  spanish: { to: "a", verse: "versículo", verses: "versículos", chapter: "capítulo", surah: "sura", book: "libro", section: "sección", sections: "secciones" },
}

/** "Quran 94:5-6 (Ash-Sharh)" becomes "Quran surah 94, verses 5 to 6", so it isn't read as a string of numbers. */
function spokenReference(reference: string, work: string, language: Language) {
  const words = SPOKEN_REFERENCE[language]
  const [major, one, many] =
    work === "meditations" ? [words.book, words.section, words.sections] : [work === "quran" ? words.surah : words.chapter, words.verse, words.verses]
  return reference
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/\b(\d+)[:.](\d+)(?:\s*[-–]\s*(\d+))?/, (_, chapter, from, to) =>
      to ? `${major} ${chapter}, ${many} ${from} ${words.to} ${to}` : `${major} ${chapter}, ${one} ${from}`,
    )
    .replace(/\b(\d+)\s*[-–]\s*(\d+)\b/, `$1 ${words.to} $2`)
}

/** What is read aloud: the reference, the passage, then the explanation. */
function spokenReading({ passage, explanation }: Reading, language: Language) {
  const text = passage.text.replace(/[[\]]/g, "").trim()
  const sentence = (part: string) => (/[.!?…]["'”’)\]]*$/.test(part) ? part : `${part}.`)
  return [sentence(spokenReference(passage.reference, passage.work, language)), sentence(text), explanation].filter(Boolean).join(" ")
}

export function ScriptureLookup() {
  const { faith, language, saveItem, refreshUsage } = useAppState()
  const works = FAITH_WORKS[faith]
  const [chosenWork, setWork] = useState<Work | null>(null)
  const [reference, setReference] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Result | null>(null)

  // A text chosen for another tradition no longer applies.
  const work = chosenWork && works.includes(chosenWork) ? chosenWork : works[0]

  const reader = useReadAloud()
  const { stop: stopReading, read } = reader
  // Counts searches and tradition changes, so a reply that arrives late isn't read over them.
  const searchRef = useRef(0)

  async function submit(event?: FormEvent, text = reference, { speak = false } = {}) {
    event?.preventDefault()
    if (!text.trim() || loading) return
    const search = ++searchRef.current
    stopReading()
    setLoading(true)
    setError(null)
    try {
      const reading = await readPassage(faith, language, work, text.trim())
      setResult({ faith, language, reading })
      if (speak && search === searchRef.current && !document.hidden) read(spokenReading(reading, language), language)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      refreshUsage()
      setLoading(false)
    }
  }

  const dictation = useDictation({
    language,
    onPhrase: (text) => {
      setReference(text)
      void submit(undefined, text, { speak: true })
    },
  })
  const listening = dictation.status !== "idle"
  const { stop: stopDictation } = dictation

  const releaseVoice = useCallback(() => {
    searchRef.current++
    stopDictation()
    stopReading()
  }, [stopDictation, stopReading])

  useEffect(() => releaseVoice, [faith, language, releaseVoice])

  function startDictation() {
    stopReading()
    claimVoice(releaseVoice)
    // Inside the tap: the reply is read later, and phones only allow that once unlocked.
    reader.unlock()
    void dictation.start()
  }

  function listen(current: Result) {
    claimVoice(releaseVoice)
    reader.unlock()
    read(spokenReading(current.reading, current.language), current.language)
  }

  return (
    <Section title="Read a Passage" eyebrow="From the source">
      <form onSubmit={submit} className="mx-auto flex max-w-xl flex-col gap-3 sm:flex-row">
        <label htmlFor="work" className="sr-only">
          Text
        </label>
        <select
          id="work"
          value={work}
          onChange={(e) => setWork(e.target.value as Work)}
          disabled={loading}
          className="rounded-full border border-line bg-raised px-4 py-2.5 text-ink focus:border-(--accent) focus:outline-none"
        >
          {works.map((id) => (
            <option key={id} value={id}>
              {WORKS[id].label}
            </option>
          ))}
        </select>
        <div className="relative flex-1">
          <label htmlFor="reference" className="sr-only">
            Words, a topic or a reference
          </label>
          <input
            id="reference"
            type="search"
            enterKeyHint="search"
            maxLength={200}
            value={listening ? dictation.partial : reference}
            onChange={(e) => setReference(e.target.value)}
            disabled={loading}
            readOnly={listening}
            placeholder={
              dictation.status === "connecting"
                ? "Opening the microphone…"
                : listening
                  ? "Listening… say the words you remember"
                  : WORKS[work].phrase
            }
            aria-describedby="reference-help"
            className="w-full rounded-full border border-line bg-raised py-2.5 pr-22 pl-4 font-serif text-lg text-ink placeholder:text-muted placeholder:italic focus:border-(--accent) focus:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          <button
            type="button"
            aria-label={listening ? "Stop listening" : "Search by voice"}
            aria-pressed={listening}
            disabled={loading}
            onClick={() => (listening ? dictation.stop() : startDictation())}
            className={`absolute top-1/2 right-11.5 flex size-9 -translate-y-1/2 items-center justify-center rounded-full disabled:opacity-40 ${
              listening ? "bg-(--accent) text-paper" : "text-muted hover:text-ink"
            }`}
          >
            {listening && <span aria-hidden className="breathe absolute inset-0 rounded-full bg-(--accent)" />}
            {listening ? <Square aria-hidden className="relative size-3.5 fill-current" /> : <Mic aria-hidden className="size-4.5" />}
          </button>
          <button
            type="submit"
            aria-label="Find the passage"
            disabled={loading || listening || !reference.trim()}
            className="absolute top-1/2 right-1.5 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-(--accent) text-paper disabled:opacity-40"
          >
            <Search aria-hidden className="size-4" />
          </button>
        </div>
      </form>
      <p id="reference-help" className="mx-auto mt-2 mb-8 max-w-xl px-4 text-sm text-muted" aria-live="polite">
        {dictation.error ? (
          <span className="text-danger">{dictation.error}</span>
        ) : (
          <>
            Type or say words you remember, or a topic like &ldquo;forgiveness&rdquo;. A reference works too, like{" "}
            {/^\d/.test(WORKS[work].example) ? `${WORKS[work].label} ${WORKS[work].example}` : WORKS[work].example}.
          </>
        )}
      </p>

      {loading && <Loading label="Fetching the passage" />}
      {!loading && error && <ErrorMessage message={error} onRetry={() => submit()} />}
      {!loading && !error && !result && (
        <Placeholder>Find any passage in {FAITH_INFO[faith].name}&apos;s texts, by its words or its theme, with a short explanation.</Placeholder>
      )}
      {!loading && !error && result && (
        <div className="text-center">
          <Quote citation={result.reading.passage} />
          {result.reading.explanation && (
            <p className="mx-auto mt-8 max-w-xl text-left font-serif text-xl leading-relaxed text-ink/90">{result.reading.explanation}</p>
          )}
          <div className="flex items-center justify-center gap-5">
            <button
              type="button"
              aria-pressed={reader.status !== "idle"}
              onClick={() => (reader.status === "idle" ? listen(result) : reader.stop())}
              className="relative mt-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-(--accent)"
            >
              {reader.status === "idle" ? (
                <Volume2 aria-hidden className="size-4" />
              ) : (
                <span aria-hidden className="relative flex size-4 items-center justify-center text-(--accent)">
                  <span className="breathe absolute inset-0 rounded-full bg-(--accent)" />
                  <Square className="relative size-2.5 fill-current" />
                </span>
              )}
              {reader.status === "idle" ? "Listen" : "Stop"}
            </button>
            <SaveButton
              key={result.reading.passage.reference}
              onSave={() =>
                saveItem({
                  faith: result.faith,
                  type: "scripture",
                  title: result.reading.passage.reference,
                  content: `“${result.reading.passage.text}”\n— ${result.reading.passage.translation}\n\n${result.reading.explanation}`,
                })
              }
            />
          </div>
          {reader.error && (
            <p role="status" className="mt-3 text-sm text-danger">
              {reader.error} The text is still here to read.
            </p>
          )}
        </div>
      )}
    </Section>
  )
}

"use client"

import { Mic, Search, Square } from "lucide-react"
import { useState, type FormEvent } from "react"
import { FAITH_INFO, type Faith } from "@/lib/faiths"
import type { Reading } from "@/lib/schemas"
import { FAITH_WORKS, WORKS, type Work } from "@/lib/works"
import { readPassage } from "../lib/api"
import { useAppState } from "../lib/state"
import { useDictation } from "../lib/voice/useDictation"
import { ErrorMessage, Loading, Placeholder, Quote, SaveButton, Section } from "./ui"

type Result = { faith: Faith; reading: Reading }

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

  async function submit(event?: FormEvent, text = reference) {
    event?.preventDefault()
    if (!text.trim() || loading) return
    setLoading(true)
    setError(null)
    try {
      setResult({ faith, reading: await readPassage(faith, language, work, text.trim()) })
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
      void submit(undefined, text)
    },
  })
  const listening = dictation.status !== "idle"

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
            onClick={() => (listening ? dictation.stop() : void dictation.start())}
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
      )}
    </Section>
  )
}

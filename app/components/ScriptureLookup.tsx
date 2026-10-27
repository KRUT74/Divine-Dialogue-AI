"use client"

import { Search } from "lucide-react"
import { useState, type FormEvent } from "react"
import { FAITH_INFO, type Faith } from "@/lib/faiths"
import type { Reading } from "@/lib/schemas"
import { FAITH_WORKS, WORKS, type Work } from "@/lib/works"
import { readPassage } from "../lib/api"
import { useAppState } from "../lib/state"
import { ErrorMessage, Loading, Placeholder, Quote, SaveButton, Section } from "./ui"

type Result = { faith: Faith; reading: Reading }

export function ScriptureLookup() {
  const { faith, language, saveItem } = useAppState()
  const works = FAITH_WORKS[faith]
  const [chosenWork, setWork] = useState<Work | null>(null)
  const [reference, setReference] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Result | null>(null)

  // A text chosen for another tradition no longer applies.
  const work = chosenWork && works.includes(chosenWork) ? chosenWork : works[0]

  async function submit(event?: FormEvent) {
    event?.preventDefault()
    if (!reference.trim() || loading) return
    setLoading(true)
    setError(null)
    try {
      setResult({ faith, reading: await readPassage(faith, language, work, reference.trim()) })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
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
            Reference
          </label>
          <input
            id="reference"
            type="text"
            maxLength={100}
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            disabled={loading}
            placeholder={`e.g. ${WORKS[work].example}`}
            aria-describedby="reference-help"
            className="w-full rounded-full border border-line bg-raised py-2.5 pr-12 pl-4 font-serif text-lg text-ink placeholder:text-muted placeholder:italic focus:border-(--accent) focus:outline-none"
          />
          <button
            type="submit"
            aria-label="Read"
            disabled={loading || !reference.trim()}
            className="absolute top-1/2 right-1.5 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-(--accent) text-paper disabled:opacity-40"
          >
            <Search aria-hidden className="size-4" />
          </button>
        </div>
      </form>
      <p id="reference-help" className="mx-auto mt-2 mb-8 max-w-xl px-4 text-sm text-muted">
        {WORKS[work].help}.
      </p>

      {loading && <Loading label="Fetching the passage" />}
      {!loading && error && <ErrorMessage message={error} onRetry={() => submit()} />}
      {!loading && !error && !result && (
        <Placeholder>Read any passage from {FAITH_INFO[faith].name}&apos;s texts, with a short explanation.</Placeholder>
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

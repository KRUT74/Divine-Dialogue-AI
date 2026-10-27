"use client"

import { BookOpen, Search } from "lucide-react"
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
    <Section icon={BookOpen} title="Read a Passage">
      <form onSubmit={submit} className="mb-4 flex flex-col gap-3 sm:flex-row">
        <label htmlFor="work" className="sr-only">
          Text
        </label>
        <select
          id="work"
          value={work}
          onChange={(e) => setWork(e.target.value as Work)}
          disabled={loading}
          className="rounded-lg bg-slate-700 px-3 py-2 text-white ring-1 ring-(--accent) focus:ring-2 focus:outline-none"
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
            className="w-full rounded-lg bg-slate-700 py-2 pr-12 pl-4 text-white ring-1 ring-(--accent) placeholder:text-slate-400 focus:ring-2 focus:outline-none"
          />
          <button
            type="submit"
            aria-label="Read"
            disabled={loading || !reference.trim()}
            className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full p-1 text-(--accent) hover:bg-slate-600 disabled:opacity-50"
          >
            <Search aria-hidden className="size-5" />
          </button>
        </div>
      </form>
      <p id="reference-help" className="-mt-2 mb-4 text-sm text-slate-400">
        {WORKS[work].help}.
      </p>

      {loading && <Loading label="Fetching the passage" />}
      {!loading && error && <ErrorMessage message={error} onRetry={() => submit()} />}
      {!loading && !error && !result && (
        <Placeholder icon={BookOpen}>
          Read any passage from {FAITH_INFO[faith].name}&apos;s texts, with a short explanation
        </Placeholder>
      )}
      {!loading && !error && result && (
        <div>
          <Quote citation={result.reading.passage} large />
          {result.reading.explanation && <p className="mt-4 text-slate-300">{result.reading.explanation}</p>}
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

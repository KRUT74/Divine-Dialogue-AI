"use client"

import { BookOpen, Search } from "lucide-react"
import { useState, type FormEvent } from "react"
import { FAITH_INFO, type Faith } from "@/lib/faiths"
import type { Passage } from "@/lib/schemas"
import { lookUpPassage } from "../lib/api"
import { useAppState } from "../lib/state"
import { ErrorMessage, Loading, Placeholder, SaveButton, Section } from "./ui"

type Result = { faith: Faith; passage: Passage }

export function ScriptureLookup() {
  const { faith, language, saveItem } = useAppState()
  const sources = FAITH_INFO[faith].sources
  const [chosenSource, setSource] = useState("")
  const [reference, setReference] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Result | null>(null)

  // A source chosen for another tradition no longer applies.
  const source = sources.includes(chosenSource) ? chosenSource : ""

  async function submit(event?: FormEvent) {
    event?.preventDefault()
    if (!source || !reference.trim() || loading) return
    setLoading(true)
    setError(null)
    try {
      setResult({ faith, passage: await lookUpPassage(faith, language, source, reference.trim()) })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Section icon={BookOpen} title="Scripture Lookup">
      <form onSubmit={submit} className="mb-4 flex flex-col gap-3 sm:flex-row">
        <label htmlFor="source" className="sr-only">
          Text
        </label>
        <select
          id="source"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          disabled={loading}
          className="rounded-lg bg-slate-700 px-3 py-2 text-white ring-1 ring-(--accent) focus:ring-2 focus:outline-none"
        >
          <option value="">Choose a text</option>
          {sources.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <div className="relative flex-1">
          <label htmlFor="reference" className="sr-only">
            Chapter or verse
          </label>
          <input
            id="reference"
            type="text"
            maxLength={200}
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            disabled={loading}
            placeholder="Chapter or verse, e.g. 5:9"
            className="w-full rounded-lg bg-slate-700 py-2 pr-12 pl-4 text-white ring-1 ring-(--accent) placeholder:text-slate-400 focus:ring-2 focus:outline-none"
          />
          <button
            type="submit"
            aria-label="Look up"
            disabled={loading || !source || !reference.trim()}
            className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full p-1 text-(--accent) hover:bg-slate-600 disabled:opacity-50"
          >
            <Search aria-hidden className="size-5" />
          </button>
        </div>
      </form>

      {loading && <Loading label="Looking up the passage" />}
      {!loading && error && <ErrorMessage message={error} onRetry={() => submit()} />}
      {!loading && !error && !result && (
        <Placeholder icon={Search}>Choose a text and a chapter or verse to read it with an explanation</Placeholder>
      )}
      {!loading && !error && result && (
        <div>
          <h3 className="mb-2 font-serif text-lg font-medium">{result.passage.reference}</h3>
          {result.passage.found && (
            <blockquote className="mb-4 border-l-4 border-(--accent) py-1 pl-4 font-serif text-xl">
              {result.passage.passage}
            </blockquote>
          )}
          <h4 className="mb-2 font-medium">{result.passage.found ? "Explanation" : "Not found"}</h4>
          <p className="text-slate-300">{result.passage.interpretation}</p>
          {result.passage.found && (
            <SaveButton
              key={result.passage.reference}
              onSave={() =>
                saveItem({
                  faith: result.faith,
                  type: "scripture",
                  title: result.passage.reference,
                  content: `${result.passage.passage}\n\n${result.passage.interpretation}`,
                })
              }
            />
          )}
        </div>
      )}
    </Section>
  )
}

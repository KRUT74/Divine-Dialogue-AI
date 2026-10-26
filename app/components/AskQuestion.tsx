"use client"

import { ChevronDown, MessagesSquare, Send } from "lucide-react"
import { useState, type FormEvent } from "react"
import { FAITH_INFO, type Faith } from "@/lib/faiths"
import type { Answer } from "@/lib/schemas"
import { askQuestion } from "../lib/api"
import { useAppState } from "../lib/state"
import { ErrorMessage, Loading, Markdown, Placeholder, SaveButton, Section } from "./ui"

type Result = { faith: Faith; question: string; answer: Answer }

export function AskQuestion() {
  const { faith, language, saveItem } = useAppState()
  const [question, setQuestion] = useState("")
  const [compare, setCompare] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Result | null>(null)

  async function submit(event?: FormEvent) {
    event?.preventDefault()
    const asked = question.trim()
    if (!asked || loading) return
    setLoading(true)
    setError(null)
    try {
      setResult({ faith, question: asked, answer: await askQuestion(faith, language, asked, compare) })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const answeredBy = result ? FAITH_INFO[result.faith] : null

  return (
    <Section icon={MessagesSquare} title="Ask a Question">
      <form onSubmit={submit} className="mb-6">
        <label htmlFor="question" className="sr-only">
          Your question
        </label>
        <div className="relative">
          <input
            id="question"
            type="text"
            maxLength={1000}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={loading}
            placeholder="How can I handle anger mindfully?"
            className="w-full rounded-lg bg-slate-700 py-3 pr-12 pl-4 text-white ring-1 ring-(--accent) placeholder:text-slate-400 focus:ring-2 focus:outline-none"
          />
          <button
            type="submit"
            aria-label="Ask"
            disabled={loading || !question.trim()}
            className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full p-2 text-(--accent) hover:bg-slate-600 disabled:opacity-50"
          >
            <Send aria-hidden className="size-5" />
          </button>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} className="size-4" />
          Also show how the other traditions see it
        </label>
      </form>

      {loading && <Loading label="The guide is answering" />}
      {!loading && error && <ErrorMessage message={error} onRetry={() => submit()} />}
      {!loading && !error && !result && (
        <Placeholder icon={MessagesSquare}>Ask a question about {FAITH_INFO[faith].name} to get started</Placeholder>
      )}
      {!loading && !error && result && answeredBy && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div
              aria-hidden
              className="flex size-10 items-center justify-center rounded-full text-xl"
              style={{ backgroundColor: answeredBy.primaryColor, color: answeredBy.accentColor }}
            >
              {answeredBy.symbol}
            </div>
            <div>
              <p className="font-medium">{answeredBy.name} guide</p>
              <p className="text-sm text-slate-400">{result.question}</p>
            </div>
          </div>
          <Markdown>{result.answer.answer}</Markdown>
          {result.answer.perspectives && result.answer.perspectives.length > 0 && (
            <Perspectives perspectives={result.answer.perspectives} />
          )}
          <SaveButton
            key={result.question + result.faith}
            onSave={() =>
              saveItem({ faith: result.faith, type: "answer", title: result.question, content: result.answer.answer })
            }
          />
        </div>
      )}
    </Section>
  )
}

function Perspectives({ perspectives }: { perspectives: NonNullable<Answer["perspectives"]> }) {
  return (
    <details className="group mt-6 rounded-lg bg-slate-700" open>
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm hover:bg-slate-600">
        Other traditions&apos; perspectives
        <ChevronDown aria-hidden className="size-4 transition group-open:rotate-180" />
      </summary>
      <ul className="space-y-3 px-4 pt-1 pb-4">
        {perspectives.map(({ faith, view }) => (
          <li key={faith} className="flex items-start gap-2">
            <span aria-hidden className="mt-0.5 text-lg" style={{ color: FAITH_INFO[faith].accentColor }}>
              {FAITH_INFO[faith].symbol}
            </span>
            <div>
              <p className="text-sm font-medium">{FAITH_INFO[faith].name}</p>
              <p className="text-sm text-slate-300">{view}</p>
            </div>
          </li>
        ))}
      </ul>
    </details>
  )
}

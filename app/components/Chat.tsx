"use client"

import { Layers, MessageCircle, RotateCcw, Send } from "lucide-react"
import { useRef, useState, type CSSProperties, type FormEvent, type KeyboardEvent } from "react"
import { FAITH_INFO, FAITHS, type Faith } from "@/lib/faiths"
import { MAX_HISTORY_MESSAGES, MAX_MESSAGE_CHARS, type Citation } from "@/lib/schemas"
import { streamChat, streamComparison, type ChatTurn } from "../lib/api"
import { useAppState } from "../lib/state"
import { CitationList, Loading, Markdown, SaveButton } from "./ui"

type Perspective = { text: string; citations: Citation[] } | "error"

type Entry =
  | { kind: "user"; id: string; text: string }
  | { kind: "guide"; id: string; faith: Faith; question: string; text: string; citations: Citation[]; status: "streaming" | "done" | "error"; error?: string }
  | { kind: "compare"; id: string; question: string; results: Partial<Record<Faith, Perspective>>; done: boolean }

const SUGGESTIONS = [
  "How can I find peace when I'm anxious?",
  "What does forgiveness ask of us?",
  "How should I treat a stranger?",
]

/** Turns the conversation so far into the history the guide sees, newest last. */
function historyFrom(entries: Entry[]): ChatTurn[] {
  const turns: ChatTurn[] = []
  for (const entry of entries) {
    if (entry.kind === "user") turns.push({ role: "user", content: entry.text })
    else if (entry.kind === "guide" && entry.status === "done") turns.push({ role: "assistant", content: entry.text })
    else if (entry.kind === "compare" && entry.done) {
      const summary = FAITHS.flatMap((faith) => {
        const result = entry.results[faith]
        return result && result !== "error" ? [`${FAITH_INFO[faith].name}: ${result.text}`] : []
      }).join("\n\n")
      turns.push({ role: "user", content: entry.question }, { role: "assistant", content: `How each tradition sees it:\n\n${summary}` })
    }
  }
  // Keep the most recent turns, starting with one of the visitor's.
  const recent = turns.slice(-MAX_HISTORY_MESSAGES)
  return recent[0]?.role === "user" ? recent : recent.slice(1)
}

export function Chat() {
  const { faith, language, saveItem } = useAppState()
  const [conversations, setConversations] = useState<Partial<Record<Faith, Entry[]>>>({})
  const [draft, setDraft] = useState("")
  const [busy, setBusy] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const entries = conversations[faith] ?? []
  const info = FAITH_INFO[faith]

  function update(target: Faith, id: string, change: (entry: Entry) => Entry) {
    setConversations((all) => ({ ...all, [target]: (all[target] ?? []).map((e) => (e.id === id ? change(e) : e)) }))
  }

  function append(target: Faith, ...added: Entry[]) {
    setConversations((all) => ({ ...all, [target]: [...(all[target] ?? []), ...added] }))
  }

  async function ask(question: string) {
    const target = faith
    const userEntry: Entry = { kind: "user", id: crypto.randomUUID(), text: question }
    const reply: Entry = { kind: "guide", id: crypto.randomUUID(), faith: target, question, text: "", citations: [], status: "streaming" }
    const history = historyFrom([...entries, userEntry])
    append(target, userEntry, reply)
    try {
      await streamChat(target, language, history, (event) => {
        if (event.type === "text") update(target, reply.id, (e) => (e.kind === "guide" ? { ...e, text: e.text + event.text } : e))
        if (event.type === "citation")
          update(target, reply.id, (e) => (e.kind === "guide" ? { ...e, citations: [...e.citations, event.citation] } : e))
        if (event.type === "error") update(target, reply.id, (e) => (e.kind === "guide" ? { ...e, status: "error", error: event.error } : e))
      })
      update(target, reply.id, (e) => (e.kind === "guide" && e.status === "streaming" ? { ...e, status: "done" } : e))
    } catch (error) {
      update(target, reply.id, (e) => (e.kind === "guide" ? { ...e, status: "error", error: (error as Error).message } : e))
    }
  }

  async function compare(question: string) {
    const target = faith
    const entry: Entry = { kind: "compare", id: crypto.randomUUID(), question, results: {}, done: false }
    append(target, entry)
    const settle = (faithKey: Faith, result: Perspective) =>
      update(target, entry.id, (e) => (e.kind === "compare" ? { ...e, results: { ...e.results, [faithKey]: result } } : e))
    try {
      await streamComparison(language, question, (event) => {
        if (event.type === "perspective") settle(event.faith, { text: event.text, citations: event.citations })
        if (event.type === "perspective_error") settle(event.faith, "error")
      })
    } catch {
      for (const f of FAITHS) update(target, entry.id, (e) => (e.kind === "compare" && !e.results[f] ? { ...e, results: { ...e.results, [f]: "error" } } : e))
    }
    update(target, entry.id, (e) => (e.kind === "compare" ? { ...e, done: true } : e))
  }

  async function submit(mode: "guide" | "compare", text = draft) {
    const question = text.trim()
    if (!question || busy) return
    setDraft("")
    setBusy(true)
    try {
      await (mode === "guide" ? ask(question) : compare(question))
    } finally {
      setBusy(false)
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      formRef.current?.requestSubmit()
    }
  }

  return (
    <section aria-labelledby="chat-heading" className="mb-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id="chat-heading" className="flex items-center gap-2 text-xl font-medium text-(--accent)">
          <MessageCircle aria-hidden className="size-5" />
          Talk with the {info.name} guide
        </h2>
        {entries.length > 0 && (
          <button
            type="button"
            disabled={busy}
            onClick={() => setConversations((all) => ({ ...all, [faith]: [] }))}
            className="flex items-center gap-1 text-sm text-slate-400 hover:text-white disabled:opacity-50"
          >
            <RotateCcw aria-hidden className="size-4" />
            New conversation
          </button>
        )}
      </div>

      <div className="rounded-lg border border-slate-700 bg-slate-800 shadow-lg">
        <div role="log" aria-live="polite" aria-label="Conversation" className="space-y-6 p-4 md:p-6">
          {entries.length === 0 && (
            <div className="py-4 text-center text-slate-300">
              <p className="mb-4">
                Ask the {info.name} guide anything. Quotes come from real, published translations, linked to their source.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    disabled={busy}
                    onClick={() => submit("guide", suggestion)}
                    className="rounded-full border border-slate-600 px-3 py-1.5 text-sm hover:border-(--accent) hover:text-white"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
          {entries.map((entry) => {
            if (entry.kind === "user") {
              return (
                <div key={entry.id} className="flex justify-end">
                  <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-slate-700 px-4 py-2 whitespace-pre-wrap">{entry.text}</p>
                </div>
              )
            }
            if (entry.kind === "guide") return <GuideReply key={entry.id} entry={entry} onSave={saveItem} />
            return <Comparison key={entry.id} entry={entry} />
          })}
        </div>

        <form
          ref={formRef}
          onSubmit={(event: FormEvent) => {
            event.preventDefault()
            submit("guide")
          }}
          className="border-t border-slate-700 p-4"
        >
          <label htmlFor="message" className="sr-only">
            Your message
          </label>
          <textarea
            id="message"
            rows={2}
            maxLength={MAX_MESSAGE_CHARS}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={`Ask the ${info.name} guide…`}
            className="w-full resize-none rounded-lg bg-slate-700 px-4 py-3 text-white ring-1 ring-slate-600 placeholder:text-slate-400 focus:ring-2 focus:ring-(--accent) focus:outline-none"
          />
          <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              disabled={busy || !draft.trim()}
              onClick={() => submit("compare")}
              className="flex items-center gap-2 rounded-full border border-slate-600 px-4 py-2 text-sm hover:border-(--accent) disabled:opacity-50"
            >
              <Layers aria-hidden className="size-4" />
              Ask all six traditions
            </button>
            <button
              type="submit"
              disabled={busy || !draft.trim()}
              className="flex items-center gap-2 rounded-full bg-(--primary) px-4 py-2 text-sm font-medium ring-1 ring-(--accent) hover:brightness-125 disabled:opacity-50"
            >
              <Send aria-hidden className="size-4" />
              Ask the guide
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}

function GuideAvatar({ faith }: { faith: Faith }) {
  const info = FAITH_INFO[faith]
  return (
    <div
      aria-hidden
      className="flex size-9 shrink-0 items-center justify-center rounded-full text-lg"
      style={{ backgroundColor: info.primaryColor, color: info.accentColor }}
    >
      {info.symbol}
    </div>
  )
}

function GuideReply({
  entry,
  onSave,
}: {
  entry: Extract<Entry, { kind: "guide" }>
  onSave: ReturnType<typeof useAppState>["saveItem"]
}) {
  const info = FAITH_INFO[entry.faith]
  return (
    <article aria-label={`${info.name} guide`} className="flex gap-3">
      <GuideAvatar faith={entry.faith} />
      <div className="min-w-0 flex-1">
        {entry.text ? (
          <Markdown citations={entry.citations} anchor={entry.id}>
            {entry.text}
          </Markdown>
        ) : (
          entry.status === "streaming" && <Loading label="The guide is looking up passages and writing" />
        )}
        {entry.status === "error" && (
          <p role="alert" className="mt-2 text-red-300">
            {entry.error}
          </p>
        )}
        <CitationList citations={entry.citations} anchor={entry.id} text={entry.text} />
        {entry.status === "done" && (
          <SaveButton
            onSave={() =>
              onSave({
                faith: entry.faith,
                type: "answer",
                title: entry.question,
                content: [
                  entry.text,
                  ...entry.citations.filter((c) => entry.text.includes(`[${c.id}]`)).map((c) => `[${c.id}] ${c.reference} (${c.translation})`),
                ].join("\n\n"),
              })
            }
          />
        )}
      </div>
    </article>
  )
}

function Comparison({ entry }: { entry: Extract<Entry, { kind: "compare" }> }) {
  return (
    <article aria-label="How each tradition sees it">
      <p className="mb-3 text-sm text-slate-400">
        Six traditions on: <span className="text-slate-200">“{entry.question}”</span>
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {FAITHS.map((faith) => {
          const info = FAITH_INFO[faith]
          const result = entry.results[faith]
          const anchor = `${entry.id}-${faith}`
          return (
            <div key={faith} className="rounded-lg border border-slate-700 bg-slate-900/40 p-4" style={{ borderTopColor: info.accentColor, borderTopWidth: 3 }}>
              <h3 className="mb-2 flex items-center gap-2 font-medium">
                <span aria-hidden style={{ color: info.accentColor }}>
                  {info.symbol}
                </span>
                {info.name}
              </h3>
              {!result && <Loading label={`Waiting for the ${info.name} guide`} />}
              {result === "error" && <p className="text-sm text-red-300">This guide couldn&apos;t answer just now.</p>}
              {result && result !== "error" && (
                <div style={{ "--accent": info.accentColor } as CSSProperties}>
                  <Markdown citations={result.citations} anchor={anchor}>
                    {result.text}
                  </Markdown>
                  <CitationList citations={result.citations} anchor={anchor} text={result.text} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </article>
  )
}

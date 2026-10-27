"use client"

import { ArrowUp, Layers, Mic, RotateCcw } from "lucide-react"
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react"
import { FAITH_INFO, FAITHS, type Faith } from "@/lib/faiths"
import { MAX_HISTORY_MESSAGES, MAX_MESSAGE_CHARS, type Citation } from "@/lib/schemas"
import { streamChat, streamComparison, type ChatTurn } from "../lib/api"
import { useAppState } from "../lib/state"
import { useVoiceConversation } from "../lib/voice/useVoiceConversation"
import { CitationList, faithStyle, Loading, Markdown, SaveButton } from "./ui"
import { VoiceBar } from "./VoiceBar"

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

  /** Asks the current guide; resolves to the reply text, or null if it failed. */
  async function ask(question: string, mode: "text" | "voice" = "text", onTextDelta?: (delta: string) => void) {
    const target = faith
    let text = ""
    let failed = false
    const userEntry: Entry = { kind: "user", id: crypto.randomUUID(), text: question }
    const reply: Entry = { kind: "guide", id: crypto.randomUUID(), faith: target, question, text: "", citations: [], status: "streaming" }
    const history = historyFrom([...entries, userEntry])
    append(target, userEntry, reply)
    try {
      await streamChat(target, language, history, mode, (event) => {
        if (event.type === "text") {
          text += event.text
          onTextDelta?.(event.text)
          update(target, reply.id, (e) => (e.kind === "guide" ? { ...e, text: e.text + event.text } : e))
        }
        if (event.type === "citation")
          update(target, reply.id, (e) => (e.kind === "guide" ? { ...e, citations: [...e.citations, event.citation] } : e))
        if (event.type === "error") {
          failed = true
          update(target, reply.id, (e) => (e.kind === "guide" ? { ...e, status: "error", error: event.error } : e))
        }
      })
      update(target, reply.id, (e) => (e.kind === "guide" && e.status === "streaming" ? { ...e, status: "done" } : e))
    } catch (error) {
      failed = true
      update(target, reply.id, (e) => (e.kind === "guide" ? { ...e, status: "error", error: (error as Error).message } : e))
    }
    return failed ? null : text
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

  const voice = useVoiceConversation({
    language,
    send: async (question, onTextDelta) => {
      setBusy(true)
      try {
        return await ask(question, "voice", onTextDelta)
      } finally {
        setBusy(false)
      }
    },
  })
  const voiceActive = voice.status !== "idle"
  const stopVoice = voice.stop

  // A voice conversation belongs to one guide and language; switching either ends it.
  useEffect(() => stopVoice(), [faith, language, stopVoice])

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
    <section aria-labelledby="chat-heading">
      <h2 id="chat-heading" className="sr-only">
        Talk with the {info.name} guide
      </h2>

      <div role="log" aria-live="polite" aria-label="Conversation" className="space-y-10">
        {entries.length === 0 && (
          <div className="text-center">
            <p className="mx-auto max-w-md font-serif text-xl leading-relaxed text-ink/85">
              Ask the {info.name} guide anything, by typing or by voice. Every quotation comes from a published
              translation, linked to its source.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  disabled={busy || voiceActive}
                  onClick={() => submit("guide", suggestion)}
                  className="rounded-full border border-line bg-raised px-4 py-2 font-serif text-base text-ink/85 italic transition-colors hover:border-(--accent) hover:text-ink disabled:opacity-50"
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
              <p key={entry.id} className="ml-auto max-w-[85%] text-right font-serif text-xl text-muted italic whitespace-pre-wrap">
                {entry.text}
              </p>
            )
          }
          if (entry.kind === "guide") return <GuideReply key={entry.id} entry={entry} onSave={saveItem} />
          return <Comparison key={entry.id} entry={entry} />
        })}
      </div>

      <div className="sticky bottom-0 z-10 -mx-5 mt-8 bg-linear-to-t from-paper from-75% to-transparent px-5 pt-6 pb-4 sm:-mx-6 sm:px-6">
        {voice.error && (
          <p role="alert" className="mb-3 flex items-start justify-between gap-3 rounded-lg border border-line bg-raised px-4 py-3 text-sm text-danger">
            {voice.error}
            <button type="button" onClick={voice.clearError} className="shrink-0 text-muted hover:text-ink">
              Dismiss
            </button>
          </p>
        )}
        {voiceActive ? (
          <VoiceBar status={voice.status} partial={voice.partial} hint={voice.hint} level={voice.level} onStop={() => voice.stop()} />
        ) : (
          <form
            ref={formRef}
            onSubmit={(event: FormEvent) => {
              event.preventDefault()
              submit("guide")
            }}
          >
            <div className="flex items-end gap-2 rounded-3xl border border-line bg-raised p-2 pl-5 shadow-sm focus-within:border-(--accent)">
              <label htmlFor="message" className="sr-only">
                Your message
              </label>
              <textarea
                id="message"
                rows={1}
                maxLength={MAX_MESSAGE_CHARS}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={`Ask the ${info.name} guide…`}
                className="field-sizing-content max-h-40 min-h-11 flex-1 resize-none bg-transparent py-2.5 font-serif text-lg text-ink placeholder:text-muted placeholder:italic focus:outline-none"
              />
              {draft.trim() ? (
                <button
                  type="submit"
                  disabled={busy}
                  aria-label="Ask the guide"
                  className="flex size-11 shrink-0 items-center justify-center rounded-full bg-(--accent) text-paper disabled:opacity-50"
                >
                  <ArrowUp aria-hidden className="size-5" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void voice.start()}
                  aria-label="Talk with the guide hands-free"
                  className="flex size-11 shrink-0 items-center justify-center rounded-full bg-(--accent) text-paper disabled:opacity-50"
                >
                  <Mic aria-hidden className="size-5" />
                </button>
              )}
            </div>
            <div className="mt-2 flex items-center justify-between gap-3 px-2 text-sm">
              <button
                type="button"
                disabled={busy || !draft.trim()}
                onClick={() => submit("compare")}
                className="inline-flex items-center gap-1.5 text-muted hover:text-ink disabled:opacity-50 disabled:hover:text-muted"
              >
                <Layers aria-hidden className="size-4" />
                Ask all six traditions
              </button>
              {entries.length > 0 && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setConversations((all) => ({ ...all, [faith]: [] }))}
                  className="inline-flex items-center gap-1.5 text-muted hover:text-ink disabled:opacity-50"
                >
                  <RotateCcw aria-hidden className="size-3.5" />
                  New conversation
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </section>
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
    <article aria-label={`${info.name} guide`}>
      <p aria-hidden className="mb-2 text-(--accent)">
        {info.symbol}
      </p>
      <div>
        {entry.text ? (
          <Markdown citations={entry.citations} anchor={entry.id}>
            {entry.text}
          </Markdown>
        ) : (
          entry.status === "streaming" && <Loading label="Finding the right passages" />
        )}
        {entry.status === "error" && (
          <p role="alert" className="mt-2 font-serif text-lg text-danger">
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
      <p className="small-caps text-center text-sm text-muted">Six traditions on</p>
      <p className="mt-1 mb-6 text-center font-serif text-2xl text-ink italic">“{entry.question}”</p>
      <div className="grid gap-x-8 gap-y-8 sm:grid-cols-2">
        {FAITHS.map((faith) => {
          const info = FAITH_INFO[faith]
          const result = entry.results[faith]
          const anchor = `${entry.id}-${faith}`
          return (
            <section key={faith} aria-label={info.name} className="faith-theme border-t-2 border-(--accent) pt-3" style={faithStyle(faith)}>
              <h3 className="mb-2 flex items-center gap-2 font-serif text-xl">
                <span aria-hidden className="text-(--accent)">
                  {info.symbol}
                </span>
                {info.name}
              </h3>
              {!result && <Loading label="Reading" />}
              {result === "error" && <p className="font-serif text-danger italic">This guide couldn&apos;t answer just now.</p>}
              {result && result !== "error" && (
                <>
                  <Markdown citations={result.citations} anchor={anchor} className="text-lg">
                    {result.text}
                  </Markdown>
                  <CitationList citations={result.citations} anchor={anchor} text={result.text} />
                </>
              )}
            </section>
          )
        })}
      </div>
    </article>
  )
}

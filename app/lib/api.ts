import type { Faith, Language } from "@/lib/faiths"
import type { Blessing, ChatEvent, CompareEvent, Reading } from "@/lib/schemas"
import type { Work } from "@/lib/works"

async function post(path: string, body: unknown, signal?: AbortSignal): Promise<Response> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  })
  if (!response.ok) {
    const data = await response.json().catch(() => null)
    throw new Error(data?.error ?? "Something went wrong. Please try again.")
  }
  return response
}

async function postJson<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  return (await post(path, body, signal)).json() as Promise<T>
}

/** Reads a server-sent event stream, calling onEvent for each JSON event. */
async function readEvents<E>(response: Response, onEvent: (event: E) => void) {
  const reader = response.body!.pipeThrough(new TextDecoderStream()).getReader()
  let buffer = ""
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += value
    const events = buffer.split("\n\n")
    buffer = events.pop() ?? ""
    for (const event of events) {
      if (event.startsWith("data: ")) onEvent(JSON.parse(event.slice(6)) as E)
    }
  }
}

export function fetchBlessing(faith: Faith, language: Language, signal?: AbortSignal) {
  return postJson<Blessing>("/api/blessing", { faith, language }, signal)
}

export type ChatTurn = { role: "user" | "assistant"; content: string }

export async function streamChat(
  faith: Faith,
  language: Language,
  messages: ChatTurn[],
  mode: "text" | "voice",
  onEvent: (event: ChatEvent) => void,
  signal?: AbortSignal,
) {
  await readEvents(await post("/api/chat", { faith, language, mode, messages }, signal), onEvent)
}

export async function streamComparison(
  language: Language,
  question: string,
  onEvent: (event: CompareEvent) => void,
  signal?: AbortSignal,
) {
  await readEvents(await post("/api/compare", { language, question }, signal), onEvent)
}

export function readPassage(faith: Faith, language: Language, work: Work, reference: string) {
  return postJson<Reading>("/api/scripture", { faith, language, work, reference })
}

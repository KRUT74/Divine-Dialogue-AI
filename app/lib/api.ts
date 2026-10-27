import type { Faith, Language } from "@/lib/faiths"
import type { AccountInfo, Blessing, ChatEvent, CompareEvent, Me, Reading, SavedItem } from "@/lib/schemas"
import type { Work } from "@/lib/works"

/** The visitor has used up a free allowance (the message says which, and when to come back). */
export class LimitReachedError extends Error {}

async function post(path: string, body: unknown, signal?: AbortSignal): Promise<Response> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  })
  if (!response.ok) {
    const data = await response.json().catch(() => null)
    const message = data?.error ?? "Something went wrong. Please try again."
    throw response.status === 429 ? new LimitReachedError(message) : new Error(message)
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

/** Who this visitor is and what's left today; null if it couldn't be loaded. */
export async function fetchMe(): Promise<Me | null> {
  const response = await fetch("/api/me", { cache: "no-store" }).catch(() => null)
  return response?.ok ? ((await response.json()) as Me) : null
}

export async function fetchSaved(): Promise<SavedItem[] | null> {
  const response = await fetch("/api/saved", { cache: "no-store" }).catch(() => null)
  return response?.ok ? ((await response.json()) as { savedItems: SavedItem[] }).savedItems : null
}

export async function postSaved(item: SavedItem) {
  await post("/api/saved", item).catch((error) => console.error("Saving to your account failed", error))
}

export async function deleteSaved(id: string) {
  await fetch(`/api/saved?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {})
}

export async function requestSignInCode(email: string) {
  await post("/api/auth/request-code", { email })
}

export function verifySignInCode(email: string, code: string, savedItems: SavedItem[]) {
  return postJson<{ account: NonNullable<AccountInfo>; savedItems: SavedItem[] }>("/api/auth/verify", { email, code, savedItems })
}

/** Returns the Stripe page to go to: Checkout for a new member, the billing portal for an existing one. */
export async function startCheckout(): Promise<string> {
  return (await postJson<{ url: string }>("/api/plus/checkout", {})).url
}

export async function openBillingPortal(): Promise<string> {
  return (await postJson<{ url: string }>("/api/plus/portal", {})).url
}

export async function syncCheckout(sessionId: string) {
  await post("/api/plus/sync", { sessionId }).catch(() => {})
}

export async function signOut() {
  await post("/api/auth/sign-out", {})
}

export function readPassage(faith: Faith, language: Language, work: Work, reference: string) {
  return postJson<Reading>("/api/scripture", { faith, language, work, reference })
}

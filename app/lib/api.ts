import type { Faith, Language } from "@/lib/faiths"
import type { Answer, Blessing, Passage } from "@/lib/schemas"

async function post<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new Error(data?.error ?? "Something went wrong. Please try again.")
  return data as T
}

export function fetchBlessing(faith: Faith, language: Language, signal?: AbortSignal) {
  return post<Blessing>("/api/blessing", { faith, language }, signal)
}

export function askQuestion(faith: Faith, language: Language, question: string, compare: boolean) {
  return post<Answer>("/api/question", { faith, language, question, compare })
}

export function lookUpPassage(faith: Faith, language: Language, source: string, reference: string) {
  return post<Passage>("/api/scripture", { faith, language, source, reference })
}

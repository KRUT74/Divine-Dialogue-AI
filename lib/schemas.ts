import { z } from "zod"
import { FAITHS, LANGUAGES } from "./faiths"
import { WORK_IDS } from "./works"

const faith = z.enum(FAITHS)
const language = z.enum(LANGUAGES)

export const MAX_MESSAGE_CHARS = 2000
export const MAX_HISTORY_MESSAGES = 20

export const BlessingRequest = z.object({ faith, language })

export const ChatRequest = z.object({
  faith,
  language,
  mode: z.enum(["text", "voice"]).default("text"),
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(4 * MAX_MESSAGE_CHARS) }))
    .min(1)
    .max(MAX_HISTORY_MESSAGES)
    .refine((messages) => messages.at(-1)?.role === "user", "The last message must be the visitor's")
    .refine((messages) => messages.at(-1)!.content.length <= MAX_MESSAGE_CHARS, "Message too long"),
})

export const CompareRequest = z.object({
  language,
  question: z.string().trim().min(1).max(MAX_MESSAGE_CHARS),
})

export const ScriptureRequest = z.object({
  faith,
  language,
  work: z.enum(WORK_IDS),
  reference: z.string().trim().min(1).max(100),
})

/** A passage fetched from a real source, shown to the visitor as a citation. */
export type Citation = {
  id: number
  work: string
  reference: string
  text: string
  translation: string
  url: string
}

export const BlessingText = z.object({
  theme: z.string().describe("Two to four words naming the passage's theme, in the visitor's language"),
  reflection: z.string().describe("Two or three sentences applying the passage to daily life"),
})

export type Blessing = z.infer<typeof BlessingText> & { passage: Citation }

export type Reading = { passage: Citation; explanation: string }

/** Server-sent events from /api/chat. */
export type ChatEvent =
  | { type: "text"; text: string }
  | { type: "citation"; citation: Citation }
  | { type: "error"; error: string }
  | { type: "done" }

/** Server-sent events from /api/compare. */
export type CompareEvent =
  | { type: "perspective"; faith: (typeof FAITHS)[number]; text: string; citations: Citation[] }
  | { type: "perspective_error"; faith: (typeof FAITHS)[number] }
  | { type: "done" }

/** Features with a free daily allowance. */
export type Feature = "chat" | "voice" | "compare" | "read"

/** What a visitor has left today. */
export type Usage = {
  plan: "free" | "plus"
  limits: Record<Feature, number>
  remaining: Record<Feature, number>
  /** True when today's spending limit is reached, so every feature is paused. */
  paused: boolean
  /** Plus only: when the subscription renews or, if cancelled, ends (ISO date). */
  renewsAt?: string
  cancelsAtPeriodEnd?: boolean
}

export const SavedItemSchema = z.object({
  id: z.uuid(),
  faith,
  type: z.enum(["blessing", "answer", "scripture"]),
  title: z.string().trim().min(1).max(300),
  content: z.string().min(1).max(20_000),
  savedAt: z.iso.datetime({ offset: true }),
})
export type SavedItem = z.infer<typeof SavedItemSchema>

/** The signed-in account, as the app shows it (email partly hidden), or null for a guest. */
export type AccountInfo = { email: string } | null

export type Me = { account: AccountInfo; usage: Usage }

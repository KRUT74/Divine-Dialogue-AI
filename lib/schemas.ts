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

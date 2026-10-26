import { z } from "zod"
import { FAITHS, LANGUAGES } from "./faiths"

const faith = z.enum(FAITHS)
const language = z.enum(LANGUAGES)

export const BlessingRequest = z.object({ faith, language })

export const QuestionRequest = z.object({
  faith,
  language,
  question: z.string().trim().min(1).max(1000),
  compare: z.boolean().default(false),
})

export const ScriptureRequest = z.object({
  faith,
  language,
  source: z.string().trim().min(1).max(100),
  reference: z.string().trim().min(1).max(200),
})

export const Blessing = z.object({
  theme: z.string().describe("Two to four words naming today's theme, in the visitor's language"),
  quote: z.string().describe("A short, well-known passage, quoted only if you are sure of the wording"),
  source: z.string().describe("Precise reference for the quote, e.g. 'Dhammapada 5'"),
  reflection: z.string().describe("Two or three sentences applying the passage to daily life"),
})

export const Comparison = z.object({
  answer: z.string().describe("The answer from the chosen tradition, in Markdown"),
  perspectives: z
    .array(
      z.object({
        faith,
        view: z.string().describe("Two or three sentences on how this tradition approaches the question"),
      }),
    )
    .describe("One entry for each of the other traditions"),
})

export const Passage = z.object({
  found: z.boolean().describe("False if the reference does not exist or you are unsure of its wording"),
  reference: z.string().describe("The full, precise reference"),
  passage: z.string().describe("The passage text, or an empty string when found is false"),
  interpretation: z.string().describe("A short explanation of the passage, or of why it could not be given"),
})

export type Blessing = z.infer<typeof Blessing>
export type Comparison = z.infer<typeof Comparison>
export type Passage = z.infer<typeof Passage>
export type Answer = { answer: string; perspectives?: Comparison["perspectives"] }

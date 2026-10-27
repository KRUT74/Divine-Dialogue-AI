import "server-only"
import type Anthropic from "@anthropic-ai/sdk"
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod"
import { z } from "zod"
import { FAITH_INFO, LANGUAGE_LABELS, type Faith, type Language } from "@/lib/faiths"
import { BlessingText, type Blessing, type Citation } from "@/lib/schemas"
import { FAITH_WORKS, WORK_IDS, WORKS } from "@/lib/works"
import { anthropic, BLESSING_MODEL, GUIDE_MODEL, logUsage } from "./anthropic"
import { blessingPassageFor } from "./blessings"
import { record } from "./limits"
import { getPassage } from "./scripture"

const PRINCIPLES = `How you work:
- Describe the tradition in its own terms and sources. Where its schools or denominations differ, say so ("many Christians believe…") rather than presenting one view as the only one.
- You are a guide, not a religious authority. Only when someone asks for a personal ruling or faces a pastoral decision, gently point them to their own teacher, priest, imam, rabbi or community; otherwise don't add that suggestion.
- Be warm, respectful and concise. Never mock or rank traditions.
- If someone seems to be in crisis or thinking about harming themselves, respond with care first, and encourage them to contact local emergency services or a crisis line straight away.`

const QUOTING = `Quoting scripture:
- Before quoting any text, look it up with get_passage before you start writing. Request every passage you need at once, in parallel, rather than one after another. Quote only words that get_passage returned, and put the citation number it gives you right after the quote, like [1].
- If a lookup fails, don't quote that text: paraphrase it, name the reference, and say you are paraphrasing. If a passage comes back that isn't what you expected, simply don't use it; don't mention the lookup itself.
- One or two short, well-chosen passages are better than many.`

function guidePrompt(faith: Faith, language: Language, { quoting = true } = {}) {
  const ownTexts = FAITH_WORKS[faith].map((work) => WORKS[work].label).join(", ")
  return `You are a knowledgeable, respectful guide to ${FAITH_INFO[faith].name} in Divine Dialogue, an interfaith companion app.

${PRINCIPLES}
${quoting ? `\n${QUOTING}\n- When quoting ${FAITH_INFO[faith].name}, prefer its own texts and translations: ${ownTexts}.\n` : ""}
Write in ${LANGUAGE_LABELS[language]}.${
    quoting && language !== "english"
      ? ` Passages come back in a published ${LANGUAGE_LABELS[language]} translation when one exists, otherwise in English. Put a citation number only after words exactly as get_passage returned them. When a passage is in English, quote the English with its number, then give your own ${LANGUAGE_LABELS[language]} translation in parentheses, introduced as your translation and without a number.`
      : ""
  }`
}

const workList = Object.entries(WORKS)
  .map(([id, work]) => `- ${id}: ${work.label}. ${work.help}.`)
  .join("\n")

const PassageInput = z.object({ work: z.enum(WORK_IDS), reference: z.string().min(1).max(100) })

const PASSAGE_TOOL: Anthropic.Beta.BetaTool = {
  name: "get_passage",
  description: `Fetches the exact text of a passage from a published translation, so it can be quoted accurately. Available texts:\n${workList}`,
  input_schema: {
    type: "object",
    properties: {
      work: { type: "string", enum: WORK_IDS },
      reference: { type: "string", description: "The reference, in the format described for that text" },
    },
    required: ["work", "reference"],
    additionalProperties: false,
  },
  strict: true,
  eager_input_streaming: true,
}

const MAX_TOOL_ROUNDS = 4

export type GuideEvent = { type: "text"; text: string } | { type: "citation"; citation: Citation }

type GuideRun = {
  model: string
  system: string
  messages: Anthropic.Beta.BetaMessageParam[]
  language: Language
  maxTokens: number
  label: string
  onEvent?: (event: GuideEvent) => void
}

export type GuideResult = { text: string; citations: Citation[]; costUsd: number; refused: boolean }

/**
 * Runs one guide turn: Claude may look up passages (up to MAX_TOOL_ROUNDS times)
 * before and while answering. Text and verified citations are reported as they arrive.
 */
export async function runGuide({ model, system, messages, language, maxTokens, label, onEvent }: GuideRun): Promise<GuideResult> {
  const conversation = [...messages]
  const citations: Citation[] = []
  let text = ""
  let costUsd = 0

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const lastRound = round === MAX_TOOL_ROUNDS - 1
    const stream = anthropic().beta.messages.stream({
      // Sonnet 5.5 can decline borderline requests; the server-side fallback retries on a suitable model.
      ...(model === GUIDE_MODEL ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
      model,
      max_tokens: maxTokens,
      output_config: { effort: "low" },
      // Caches the system prompt, tools and conversation so later rounds and turns cost less.
      cache_control: { type: "ephemeral" },
      system,
      tools: [PASSAGE_TOOL],
      tool_choice: lastRound ? { type: "none" } : { type: "auto" },
      messages: conversation,
    })

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        text += event.delta.text
        onEvent?.({ type: "text", text: event.delta.text })
      }
    }

    const final = await stream.finalMessage()
    costUsd += logUsage(label, final)
    if (final.stop_reason === "refusal") return { text, citations, costUsd, refused: true }
    if (final.stop_reason !== "tool_use") break

    const toolUses = final.content.filter((block) => block.type === "tool_use")
    const results = await Promise.all(
      toolUses.map(async (block): Promise<Anthropic.Beta.BetaToolResultBlockParam> => {
        const input = PassageInput.safeParse(block.input)
        if (!input.success) {
          return { type: "tool_result", tool_use_id: block.id, is_error: true, content: "Invalid input. Give a work and a reference." }
        }
        const result = await getPassage(input.data.work, input.data.reference, language)
        if (!result.ok) return { type: "tool_result", tool_use_id: block.id, is_error: true, content: result.error }
        const citation = { id: citations.length + 1, ...result.passage }
        citations.push(citation)
        onEvent?.({ type: "citation", citation })
        return {
          type: "tool_result",
          tool_use_id: block.id,
          content: `Citation [${citation.id}]: ${citation.reference} (${citation.translation})\n"${citation.text}"`,
        }
      }),
    )
    conversation.push({ role: "assistant", content: final.content }, { role: "user", content: results })
  }

  for (const problem of misquotes(text, citations)) console.warn(`[quote-check] ${label}: ${problem}`)
  return { text: text.trim(), citations, costUsd, refused: false }
}

const normalise = (text: string) =>
  text
    .toLowerCase()
    .replace(/[“”"‘’'`]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()

/**
 * Finds quoted phrases followed by a citation marker, like “…” [2], whose words
 * don't appear in that citation's text. Ellipses may join separate fragments.
 */
export function misquotes(text: string, citations: Citation[]): string[] {
  const problems: string[] = []
  for (const match of text.matchAll(/["“]([^"”]{8,}?)["”]\s*\[(\d+)\]/g)) {
    const citation = citations.find((c) => c.id === Number(match[2]))
    if (!citation) {
      problems.push(`[${match[2]}] has no matching citation`)
      continue
    }
    const source = normalise(citation.text)
    const fragments = match[1].split(/\[\s*(?:…|\.\.\.)\s*\]|…|\.\.\./).map(normalise).filter(Boolean)
    if (!fragments.every((fragment) => source.includes(fragment))) {
      problems.push(`"${match[1].slice(0, 60)}" not found in ${citation.reference}`)
    }
  }
  return problems
}

// Keeps each reply, and so each request's cost, bounded.
const MAX_REPLY_TOKENS = 2048

const VOICE_NOTE =
  "This reply will be spoken aloud in a voice conversation: answer in one to four short, natural sentences, with no Markdown, lists or emoji. You may still quote one short passage, with its citation number."

export function chatWithGuide(
  faith: Faith,
  language: Language,
  history: Anthropic.Beta.BetaMessageParam[],
  mode: "text" | "voice",
  onEvent: (event: GuideEvent) => void,
) {
  const note =
    mode === "voice"
      ? VOICE_NOTE
      : "Keep replies to about 250 words unless the visitor asks for more depth. Use Markdown where it helps readability."
  return runGuide({
    model: GUIDE_MODEL,
    system: guidePrompt(faith, language),
    // Mid-conversation system message: keeps the top-level system prompt stable for caching.
    messages: [...history, { role: "system", content: note }],
    language,
    maxTokens: MAX_REPLY_TOKENS,
    label: "chat",
    onEvent,
  })
}

/** One tradition's short answer for the side-by-side comparison. */
export function perspective(faith: Faith, language: Language, question: string) {
  return runGuide({
    model: GUIDE_MODEL,
    system: guidePrompt(faith, language),
    messages: [
      { role: "user", content: question },
      {
        role: "system",
        content: `This answer appears beside the other traditions' answers to the same question. In at most 90 words, give ${FAITH_INFO[faith].name}'s perspective, grounded in one short passage from its own texts. No headings or lists.`,
      },
    ],
    language,
    maxTokens: 1024,
    label: `compare:${faith}`,
  })
}

// One blessing per tradition, language and day, shared by every visitor.
const blessingCache = new Map<string, Promise<Blessing>>()

export function dailyBlessing(faith: Faith, language: Language): Promise<Blessing> {
  const today = new Date().toISOString().slice(0, 10)
  const key = `${today}|${faith}|${language}`
  let blessing = blessingCache.get(key)
  if (!blessing) {
    if (blessingCache.size > 100) blessingCache.clear()
    blessing = writeBlessing(faith, language, today)
    blessingCache.set(key, blessing)
    // A failure shouldn't be cached for the rest of the day.
    blessing.catch(() => blessingCache.delete(key))
  }
  return blessing
}

async function writeBlessing(faith: Faith, language: Language, today: string): Promise<Blessing> {
  const [work, reference] = blessingPassageFor(faith, today)
  const result = await getPassage(work, reference, language)
  if (!result.ok) throw new Error(`Blessing passage ${work} ${reference} failed: ${result.error}`)
  const { passage } = result
  const response = await anthropic().messages.parse({
    model: BLESSING_MODEL,
    max_tokens: 1024,
    output_config: { effort: "low", format: zodOutputFormat(BlessingText) },
    system: `You are a warm guide to ${FAITH_INFO[faith].name} writing a short daily blessing for an interfaith app.\n\n${PRINCIPLES}\n\nWrite in ${LANGUAGE_LABELS[language]}.`,
    messages: [
      {
        role: "user",
        content: `Today's passage is ${passage.reference} (${passage.translation}):\n"${passage.text}"\n\nName its theme and write a short reflection that applies it to daily life.`,
      },
    ],
  })
  // Shared by every visitor, so it counts toward the overall ceiling but nobody's allowance.
  await record("blessing", null, logUsage("blessing", response))
  if (!response.parsed_output) throw new Error(`Blessing was not parsed (stop reason: ${response.stop_reason})`)
  return { ...response.parsed_output, passage: { id: 1, ...passage } }
}

const MAX_EXPLANATION_TOKENS = 1024

/** Explains a passage that has already been fetched from its source. */
export async function explainPassage(faith: Faith, language: Language, passage: Citation): Promise<{ text: string; costUsd: number }> {
  const response = await anthropic().beta.messages.create({
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    model: GUIDE_MODEL,
    max_tokens: MAX_EXPLANATION_TOKENS,
    output_config: { effort: "low" },
    system: `${guidePrompt(faith, language, { quoting: false })}\n\nThe visitor is reading a passage. In about 120 words, explain its context and how it is commonly understood, noting where interpretations differ. Don't repeat the passage itself. Use plain paragraphs, no headings.`,
    messages: [{ role: "user", content: `${passage.reference} (${passage.translation}):\n"${passage.text}"` }],
  })
  const costUsd = logUsage("explain", response)
  if (response.stop_reason === "refusal") return { text: "", costUsd }
  const text = response.content
    .flatMap((block) => (block.type === "text" ? [block.text] : []))
    .join("")
    .trim()
  return { text, costUsd }
}

import "server-only"
import type Anthropic from "@anthropic-ai/sdk"
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod"
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod"
import { FAITH_INFO, LANGUAGE_LABELS, type Faith, type Language } from "@/lib/faiths"
import { Blessing, Comparison, Passage, type Answer } from "@/lib/schemas"
import { anthropic, BLESSING_MODEL, GUIDE_MODEL, logUsage } from "./anthropic"

// Keeps each answer, and so each request's cost, bounded.
const MAX_ANSWER_TOKENS = 2048

const PRINCIPLES = `How you work:
- Describe the tradition in its own terms and sources. Where its schools or denominations differ, say so ("many Christians believe…") rather than presenting one view as the only one.
- You are a guide, not a religious authority. Only when someone asks for a personal ruling or faces a pastoral decision, gently point them to their own teacher, priest, imam, rabbi or community; otherwise don't add that suggestion.
- Quote scripture only when you are sure of the wording, and always give a precise reference. If you are not sure, paraphrase and say that you are paraphrasing. Never invent a passage or a reference.
- Be warm, respectful and concise. Never mock or rank traditions.
- If someone seems to be in crisis or thinking about harming themselves, respond with care first, and encourage them to contact local emergency services or a crisis line straight away.`

function guidePrompt(faith: Faith, language: Language) {
  return `You are a knowledgeable, respectful guide to ${FAITH_INFO[faith].name} in Divine Dialogue, an interfaith companion app.

${PRINCIPLES}

Write everything in ${LANGUAGE_LABELS[language]}, including quoted scripture: use a standard published translation in that language and name it in the reference.`
}

// Sonnet 5.5 can decline borderline requests; the server-side fallback retries on a suitable model.
const fallback = {
  betas: ["server-side-fallback-2026-07-01"] satisfies Anthropic.AnthropicBeta[],
  fallbacks: "default" as const,
}

export async function dailyBlessing(faith: Faith, language: Language): Promise<Blessing> {
  const today = new Date().toISOString().slice(0, 10)
  const response = await anthropic().messages.parse({
    model: BLESSING_MODEL,
    max_tokens: 1024,
    output_config: { effort: "low", format: zodOutputFormat(Blessing) },
    system: guidePrompt(faith, language),
    messages: [{ role: "user", content: `Write today's blessing (${today}): one short passage and a reflection on it.` }],
  })
  logUsage("blessing", response)
  if (!response.parsed_output) throw new Error(`Blessing was not parsed (stop reason: ${response.stop_reason})`)
  return response.parsed_output
}

export async function answerQuestion(faith: Faith, language: Language, question: string): Promise<Answer> {
  const response = await anthropic().beta.messages.create({
    ...fallback,
    model: GUIDE_MODEL,
    max_tokens: MAX_ANSWER_TOKENS,
    output_config: { effort: "low" },
    system: `${guidePrompt(faith, language)}\n\nKeep answers to about 250 words unless the visitor asks for more depth. Use Markdown where it helps readability.`,
    messages: [{ role: "user", content: question }],
  })
  logUsage("question", response)
  if (response.stop_reason === "refusal") {
    return { answer: "I can't help with that question. Please try asking it a different way." }
  }
  const answer = response.content
    .flatMap((block) => (block.type === "text" ? [block.text] : []))
    .join("")
    .trim()
  if (!answer) throw new Error("Empty answer from model")
  return { answer }
}

export async function compareTraditions(faith: Faith, language: Language, question: string): Promise<Answer> {
  const others = Object.entries(FAITH_INFO)
    .filter(([key]) => key !== faith)
    .map(([, info]) => info.name)
    .join(", ")
  const response = await anthropic().beta.messages.parse({
    ...fallback,
    model: GUIDE_MODEL,
    max_tokens: MAX_ANSWER_TOKENS * 2,
    output_config: { effort: "low", format: betaZodOutputFormat(Comparison) },
    system: `${guidePrompt(faith, language)}\n\nThe visitor also wants to compare. After answering from ${FAITH_INFO[faith].name}, give a short, fair perspective from each of: ${others}.`,
    messages: [{ role: "user", content: question }],
  })
  logUsage("compare", response)
  if (response.stop_reason === "refusal") {
    return { answer: "I can't help with that question. Please try asking it a different way." }
  }
  if (!response.parsed_output) throw new Error(`Comparison was not parsed (stop reason: ${response.stop_reason})`)
  return response.parsed_output
}

export async function lookUpPassage(faith: Faith, language: Language, source: string, reference: string): Promise<Passage> {
  const response = await anthropic().beta.messages.parse({
    ...fallback,
    model: GUIDE_MODEL,
    max_tokens: MAX_ANSWER_TOKENS,
    output_config: { effort: "low", format: betaZodOutputFormat(Passage) },
    system: `${guidePrompt(faith, language)}\n\nThe visitor is looking up a passage. If the reference does not exist, or you are not certain of its wording, set found to false and suggest where to read it instead of guessing.`,
    messages: [{ role: "user", content: `${source}: ${reference}` }],
  })
  logUsage("scripture", response)
  if (response.stop_reason === "refusal" || !response.parsed_output) {
    throw new Error(`Passage was not parsed (stop reason: ${response.stop_reason})`)
  }
  return response.parsed_output
}

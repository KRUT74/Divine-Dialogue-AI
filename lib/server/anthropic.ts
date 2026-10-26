import "server-only"
import Anthropic from "@anthropic-ai/sdk"

let client: Anthropic | null = null

export class MissingApiKeyError extends Error {
  constructor() {
    super("ANTHROPIC_API_KEY is not set. Copy .env.example to .env.local and add a key.")
  }
}

export function anthropic(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new MissingApiKeyError()
  client ??= new Anthropic({ apiKey })
  return client
}

/** Answers questions, compares traditions and explains scripture. */
export const GUIDE_MODEL = "claude-sonnet-5-5"
/** Writes the short daily blessing. */
export const BLESSING_MODEL = "claude-haiku-5-5"

// US dollars per million tokens. An unknown model (for example a fallback) is priced at the highest rate.
const PRICES: Record<string, { input: number; output: number }> = {
  [GUIDE_MODEL]: { input: 2, output: 10 },
  [BLESSING_MODEL]: { input: 0.1, output: 0.5 },
}
const UNKNOWN_MODEL_PRICE = { input: 10, output: 50 }

type Usage = { input_tokens: number; output_tokens: number }

/** Estimates a response's cost in US dollars and logs it. */
export function logUsage(label: string, response: { model: string; usage: Usage }): number {
  const price = PRICES[response.model] ?? UNKNOWN_MODEL_PRICE
  const { input_tokens, output_tokens } = response.usage
  const costUsd = (input_tokens * price.input + output_tokens * price.output) / 1_000_000
  console.info(
    `[usage] ${label} model=${response.model} in=${input_tokens} out=${output_tokens} cost=$${costUsd.toFixed(5)}`,
  )
  return costUsd
}

/** Maps a failure to a status code and a message that is safe to show visitors. */
export function errorResponse(error: unknown, fallback: string): Response {
  if (error instanceof MissingApiKeyError) {
    return Response.json({ error: "The guide isn't configured yet. Please try again later." }, { status: 503 })
  }
  if (error instanceof Anthropic.RateLimitError) {
    return Response.json({ error: "The guide is busy right now. Please try again in a minute." }, { status: 429 })
  }
  console.error(fallback, error)
  return Response.json({ error: fallback }, { status: 500 })
}

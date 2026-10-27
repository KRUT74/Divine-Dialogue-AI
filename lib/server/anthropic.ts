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

type Usage = {
  input_tokens: number
  output_tokens: number
  cache_creation_input_tokens?: number | null
  cache_read_input_tokens?: number | null
}

/** Estimates a response's cost in US dollars and logs it. */
export function logUsage(label: string, response: { model: string; usage: Usage }): number {
  const price = PRICES[response.model] ?? UNKNOWN_MODEL_PRICE
  const { input_tokens, output_tokens } = response.usage
  const cacheWrite = response.usage.cache_creation_input_tokens ?? 0
  const cacheRead = response.usage.cache_read_input_tokens ?? 0
  // Cache writes cost 1.25x the input rate and cache reads 0.1x.
  const costUsd =
    (input_tokens * price.input + cacheWrite * price.input * 1.25 + cacheRead * price.input * 0.1 + output_tokens * price.output) /
    1_000_000
  console.info(
    `[usage] ${label} model=${response.model} in=${input_tokens} cache_write=${cacheWrite} cache_read=${cacheRead} out=${output_tokens} cost=$${costUsd.toFixed(5)}`,
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

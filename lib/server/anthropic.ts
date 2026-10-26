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

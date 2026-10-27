import "server-only"
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js"
import { LANGUAGE_CODES, type Language } from "@/lib/faiths"

let client: ElevenLabsClient | null = null

export class MissingVoiceKeyError extends Error {
  constructor() {
    super("ELEVENLABS_API_KEY is not set. Add it to .env.local to enable voice.")
  }
}

function elevenlabs(): ElevenLabsClient {
  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) throw new MissingVoiceKeyError()
  client ??= new ElevenLabsClient({ apiKey })
  return client
}

/** Lowest-latency ElevenLabs voice model (~75 ms), and it speaks Spanish too. */
export const SPEECH_MODEL = "eleven_flash_v2_5"
export const LISTENING_MODEL = "scribe_v2_realtime"
// "George": a calm, warm library voice that works in every language we support.
const DEFAULT_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb"

// US dollars, for the usage log: Flash v2.5 per 1,000 characters, Scribe realtime per hour.
const SPEECH_USD_PER_1K_CHARS = 0.05
const LISTENING_USD_PER_HOUR = 0.39

/** How long one listening token is paid for; the browser asks for a new one after this. */
export const LISTENING_SESSION_MINUTES = 2

/**
 * A single-use token that lets the browser open one Scribe realtime session
 * without ever seeing our API key. Expires after 15 minutes if unused.
 */
export async function createListeningToken(): Promise<{ token: string; costUsd: number }> {
  const { token } = await elevenlabs().tokens.singleUse.create("realtime_scribe")
  const costUsd = (LISTENING_SESSION_MINUTES / 60) * LISTENING_USD_PER_HOUR
  console.info(`[usage] listen minutes=${LISTENING_SESSION_MINUTES} cost=$${costUsd.toFixed(5)}`)
  return { token, costUsd }
}

/** Estimated cost of speaking `text`. */
export const speechCost = (text: string) => (text.length / 1000) * SPEECH_USD_PER_1K_CHARS

/** Streams MP3 audio of `text` in the guide's voice. */
export async function streamSpeech(text: string, language: Language): Promise<ReadableStream<Uint8Array>> {
  const audio = await elevenlabs().textToSpeech.stream(process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID, {
    text,
    modelId: SPEECH_MODEL,
    languageCode: LANGUAGE_CODES[language],
    outputFormat: "mp3_44100_128",
  })
  console.info(`[usage] speak chars=${text.length} cost=$${speechCost(text).toFixed(5)}`)
  return audio
}

/** Removes Markdown and citation markers so they aren't read aloud ("asterisk", "one in brackets"). */
export function plainSpeech(markdown: string): string {
  return markdown
    .replace(/\s*\[\d+\]/g, "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, "")
    .replace(/[*_~]{1,3}([^*_~]+)[*_~]{1,3}/g, "$1")
    .replace(/\s+/g, " ")
    .trim()
}

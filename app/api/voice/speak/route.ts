import { z } from "zod"
import { LANGUAGES } from "@/lib/faiths"
import { MissingVoiceKeyError, plainSpeech, streamSpeech } from "@/lib/server/elevenlabs"

// The client sends one sentence or a short group of sentences at a time.
const SpeakRequest = z.object({ text: z.string().trim().min(1).max(600), language: z.enum(LANGUAGES) })

/** Speaks a piece of the guide's reply. */
export async function POST(req: Request) {
  const parsed = SpeakRequest.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: "Text must be 1-600 characters." }, { status: 400 })

  const text = plainSpeech(parsed.data.text)
  if (!text) return new Response(null, { status: 204 })

  try {
    const audio = await streamSpeech(text, parsed.data.language)
    return new Response(audio, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" } })
  } catch (error) {
    if (!(error instanceof MissingVoiceKeyError)) console.error("Speech synthesis failed", error)
    return Response.json({ error: "Couldn't speak that reply." }, { status: 502 })
  }
}

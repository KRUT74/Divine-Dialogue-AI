import { createListeningToken, LISTENING_MODEL, LISTENING_SESSION_MINUTES, MissingVoiceKeyError } from "@/lib/server/elevenlabs"

/**
 * Mints a single-use token for one Scribe realtime listening session. The client
 * asks for a new one between turns once LISTENING_SESSION_MINUTES have passed.
 */
export async function GET() {
  try {
    const token = await createListeningToken()
    return Response.json(
      { token, modelId: LISTENING_MODEL, validForSeconds: LISTENING_SESSION_MINUTES * 60 },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch (error) {
    if (error instanceof MissingVoiceKeyError) {
      return Response.json({ error: "Voice isn't configured yet. You can keep typing." }, { status: 503 })
    }
    console.error("Creating a listening token failed", error)
    return Response.json({ error: "Voice is unavailable right now. You can keep typing." }, { status: 502 })
  }
}

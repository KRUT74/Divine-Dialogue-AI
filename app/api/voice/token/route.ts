import { createListeningToken, LISTENING_MODEL, LISTENING_SESSION_MINUTES, MissingVoiceKeyError } from "@/lib/server/elevenlabs"
import { checkSpendAllowed, guard, record } from "@/lib/server/limits"
import { getVisitor } from "@/lib/server/visitor"

/**
 * Mints a single-use token for one Scribe realtime listening session. The client
 * asks for a new one between turns once LISTENING_SESSION_MINUTES have passed.
 * Each token is charged up front as that many minutes of listening.
 */
export async function GET(req: Request) {
  const visitor = await getVisitor(req)
  const refused = await guard(() => checkSpendAllowed(visitor, { needsVoiceReply: true }))
  if (refused) return refused

  try {
    const { token, costUsd } = await createListeningToken()
    await record("listen", visitor, costUsd)
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

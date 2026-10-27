import { ChatRequest, type ChatEvent } from "@/lib/schemas"
import { MissingApiKeyError } from "@/lib/server/anthropic"
import { chatWithGuide } from "@/lib/server/guide"
import { checkAllowed, guard, record } from "@/lib/server/limits"
import { eventStream } from "@/lib/server/sse"
import { getVisitor } from "@/lib/server/visitor"

export const maxDuration = 60

export async function POST(req: Request) {
  const parsed = ChatRequest.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: "Messages can be up to 2,000 characters." }, { status: 400 })
  const { faith, language, mode, messages } = parsed.data

  const visitor = await getVisitor(req)
  const feature = mode === "voice" ? "voice" : "chat"
  const refused = await guard(() => checkAllowed(visitor, feature))
  if (refused) return refused

  return eventStream<ChatEvent>(async (send) => {
    try {
      const result = await chatWithGuide(faith, language, messages, mode, send)
      await record(feature, visitor, result.costUsd)
      if (result.refused) send({ type: "error", error: "I can't help with that one. Could you ask it another way?" })
      else if (!result.text) throw new Error("Empty reply from model")
    } catch (error) {
      if (!(error instanceof MissingApiKeyError)) console.error("Chat request failed", error)
      send({
        type: "error",
        error:
          error instanceof MissingApiKeyError
            ? "The guide isn't configured yet. Please try again later."
            : "Something went wrong reaching the guide. Please try again.",
      })
    }
    send({ type: "done" })
  })
}

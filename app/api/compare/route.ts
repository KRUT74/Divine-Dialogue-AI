import { FAITHS } from "@/lib/faiths"
import { CompareRequest, type CompareEvent } from "@/lib/schemas"
import { perspective } from "@/lib/server/guide"
import { checkAllowed, guard, record } from "@/lib/server/limits"
import { eventStream } from "@/lib/server/sse"
import { getVisitor } from "@/lib/server/visitor"

export const maxDuration = 60

/** Asks all six guides the same question at once and streams each answer as it's ready. */
export async function POST(req: Request) {
  const parsed = CompareRequest.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: "Questions can be up to 2,000 characters." }, { status: 400 })
  const { language, question } = parsed.data

  const visitor = await getVisitor(req)
  const refused = await guard(() => checkAllowed(visitor, "compare"))
  if (refused) return refused

  return eventStream<CompareEvent>(async (send) => {
    let costUsd = 0
    await Promise.all(
      FAITHS.map(async (faith) => {
        try {
          const result = await perspective(faith, language, question)
          costUsd += result.costUsd
          if (result.refused || !result.text) send({ type: "perspective_error", faith })
          else send({ type: "perspective", faith, text: result.text, citations: result.citations })
        } catch (error) {
          console.error(`Comparison failed for ${faith}`, error)
          send({ type: "perspective_error", faith })
        }
      }),
    )
    await record("compare", visitor, costUsd)
    send({ type: "done" })
  })
}

import { ScriptureRequest, type Reading } from "@/lib/schemas"
import { errorResponse } from "@/lib/server/anthropic"
import { explainPassage } from "@/lib/server/guide"
import { checkAllowed, guard, record } from "@/lib/server/limits"
import { getPassage } from "@/lib/server/scripture"
import { getVisitor } from "@/lib/server/visitor"

export const maxDuration = 60

export async function POST(req: Request) {
  const parsed = ScriptureRequest.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: "Choose a text and enter a reference." }, { status: 400 })
  const { faith, language, work, reference } = parsed.data

  const visitor = await getVisitor(req)
  const refused = await guard(() => checkAllowed(visitor, "read"))
  if (refused) return refused

  const result = await getPassage(work, reference, language)
  if (!result.ok) return Response.json({ error: result.error }, { status: 404 })
  const passage = { id: 1, ...result.passage }

  try {
    const { text, costUsd } = await explainPassage(faith, language, passage)
    await record("read", visitor, costUsd)
    const reading: Reading = { passage, explanation: text }
    return Response.json(reading)
  } catch (error) {
    return errorResponse(error, "The passage was found, but the explanation couldn't be written. Please try again.")
  }
}

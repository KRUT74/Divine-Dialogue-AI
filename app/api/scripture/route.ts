import { ScriptureRequest, type Reading } from "@/lib/schemas"
import { errorResponse } from "@/lib/server/anthropic"
import { explainPassage } from "@/lib/server/guide"
import { getPassage } from "@/lib/server/scripture"

export const maxDuration = 60

export async function POST(req: Request) {
  const parsed = ScriptureRequest.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: "Choose a text and enter a reference." }, { status: 400 })
  const { faith, language, work, reference } = parsed.data

  const result = await getPassage(work, reference, language)
  if (!result.ok) return Response.json({ error: result.error }, { status: 404 })
  const passage = { id: 1, ...result.passage }

  try {
    const reading: Reading = { passage, explanation: await explainPassage(faith, language, passage) }
    return Response.json(reading)
  } catch (error) {
    return errorResponse(error, "The passage was found, but the explanation couldn't be written. Please try again.")
  }
}

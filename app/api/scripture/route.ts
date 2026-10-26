import { ScriptureRequest } from "@/lib/schemas"
import { errorResponse } from "@/lib/server/anthropic"
import { lookUpPassage } from "@/lib/server/guide"

export const maxDuration = 60

export async function POST(req: Request) {
  const parsed = ScriptureRequest.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: "Choose a text and enter a chapter or verse." }, { status: 400 })
  const { faith, language, source, reference } = parsed.data

  try {
    return Response.json(await lookUpPassage(faith, language, source, reference))
  } catch (error) {
    return errorResponse(error, "That passage couldn't be looked up. Please try again.")
  }
}

import { QuestionRequest } from "@/lib/schemas"
import { errorResponse } from "@/lib/server/anthropic"
import { answerQuestion, compareTraditions } from "@/lib/server/guide"

export const maxDuration = 60

export async function POST(req: Request) {
  const parsed = QuestionRequest.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: "Please enter a question of up to 1,000 characters." }, { status: 400 })
  const { faith, language, question, compare } = parsed.data

  try {
    const answer = compare
      ? await compareTraditions(faith, language, question)
      : await answerQuestion(faith, language, question)
    return Response.json(answer)
  } catch (error) {
    return errorResponse(error, "The guide couldn't answer just now. Please try again.")
  }
}

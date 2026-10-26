import { BlessingRequest } from "@/lib/schemas"
import { errorResponse } from "@/lib/server/anthropic"
import { dailyBlessing } from "@/lib/server/guide"

export async function POST(req: Request) {
  const parsed = BlessingRequest.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: "Choose a tradition and a language." }, { status: 400 })

  try {
    return Response.json(await dailyBlessing(parsed.data.faith, parsed.data.language))
  } catch (error) {
    return errorResponse(error, "Today's blessing couldn't be loaded. Please try again.")
  }
}

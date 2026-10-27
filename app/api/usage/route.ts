import { usageFor } from "@/lib/server/limits"
import { getVisitor } from "@/lib/server/visitor"

/** What this visitor has left of today's free allowance. */
export async function GET(req: Request) {
  try {
    const usage = await usageFor(await getVisitor(req))
    return Response.json(usage, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    console.error("[limits] Reading usage failed", error)
    return Response.json({ error: "Couldn't load today's allowance." }, { status: 503 })
  }
}

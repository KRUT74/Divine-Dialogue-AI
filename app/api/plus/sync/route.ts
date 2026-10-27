import { z } from "zod"
import { syncCheckoutSession } from "@/lib/server/stripe"
import { accountIdOf, getVisitor } from "@/lib/server/visitor"

const SyncRequest = z.object({ sessionId: z.string().startsWith("cs_").max(200) })

/** Called when a visitor returns from Checkout, so Plus applies at once even if the webhook is late. */
export async function POST(req: Request) {
  const accountId = accountIdOf(await getVisitor(req))
  const parsed = SyncRequest.safeParse(await req.json().catch(() => null))
  if (!accountId || !parsed.success) return Response.json({ synced: false }, { status: 400 })
  try {
    await syncCheckoutSession(parsed.data.sessionId, accountId)
    return Response.json({ synced: true })
  } catch (error) {
    console.error("Syncing after checkout failed", error)
    return Response.json({ synced: false }, { status: 503 })
  }
}

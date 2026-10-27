import { getAccount } from "@/lib/server/accounts"
import { createCheckout, createPortal, planFor, stripeConfigured } from "@/lib/server/stripe"
import { accountIdOf, getVisitor } from "@/lib/server/visitor"

/** Starts Stripe Checkout for Plus. Members who already have Plus go to the billing portal instead. */
export async function POST(req: Request) {
  if (!stripeConfigured()) return Response.json({ error: "Plus isn't available yet." }, { status: 503 })
  const accountId = accountIdOf(await getVisitor(req))
  if (!accountId) return Response.json({ error: "Please sign in first, so Plus is tied to your account." }, { status: 401 })

  try {
    const origin = new URL(req.url).origin
    const { plan } = await planFor(accountId)
    if (plan === "plus") return Response.json({ url: await createPortal(accountId, origin) })
    const account = await getAccount(accountId)
    if (!account) return Response.json({ error: "Please sign in again." }, { status: 401 })
    return Response.json({ url: await createCheckout(account, origin) })
  } catch (error) {
    console.error("Starting checkout failed", error)
    return Response.json({ error: "Checkout is unavailable for a moment. Please try again shortly." }, { status: 503 })
  }
}

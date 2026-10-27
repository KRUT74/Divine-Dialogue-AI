import { createPortal } from "@/lib/server/stripe"
import { accountIdOf, getVisitor } from "@/lib/server/visitor"

/** Opens Stripe's Customer Portal: change card, see invoices, or cancel Plus. */
export async function POST(req: Request) {
  const accountId = accountIdOf(await getVisitor(req))
  if (!accountId) return Response.json({ error: "Please sign in first." }, { status: 401 })
  try {
    const url = await createPortal(accountId, new URL(req.url).origin)
    if (!url) return Response.json({ error: "There's no Plus subscription on this account." }, { status: 404 })
    return Response.json({ url })
  } catch (error) {
    console.error("Opening the billing portal failed", error)
    return Response.json({ error: "Billing is unavailable for a moment. Please try again shortly." }, { status: 503 })
  }
}

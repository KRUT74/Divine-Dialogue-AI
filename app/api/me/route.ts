import type { Me } from "@/lib/schemas"
import { getAccount, maskEmail } from "@/lib/server/accounts"
import { usageFor } from "@/lib/server/limits"
import { accountIdOf, getVisitor, signOut } from "@/lib/server/visitor"

/** Who this visitor is (guest or account) and what's left of today's free allowance. */
export async function GET(req: Request) {
  try {
    const visitor = await getVisitor(req)
    const accountId = accountIdOf(visitor)
    const account = accountId ? await getAccount(accountId) : null
    // A cookie for an account that no longer exists: start over as a guest.
    if (accountId && !account) await signOut()
    const me: Me = { account: account ? { email: maskEmail(account.email) } : null, usage: await usageFor(visitor) }
    return Response.json(me, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    console.error("Reading the visitor failed", error)
    return Response.json({ error: "Couldn't load your details." }, { status: 503 })
  }
}

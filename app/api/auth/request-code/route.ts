import { z } from "zod"
import { EmailSchema, requestCode } from "@/lib/server/accounts"
import { emailConfigured } from "@/lib/server/email"
import { supabaseConfigured } from "@/lib/server/supabase"
import { ipHash } from "@/lib/server/visitor"

const RequestSchema = z.object({ email: EmailSchema })

/**
 * Emails a sign-in code. The success response is the same whether or not the address
 * already has an account, so this can't be used to find out who has signed up.
 */
export async function POST(req: Request) {
  if (!emailConfigured() || !supabaseConfigured()) {
    return Response.json({ error: "Sign-in isn't available yet. You can keep using Divine Dialogue as a guest." }, { status: 503 })
  }
  const parsed = RequestSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: "Please enter a valid email address." }, { status: 400 })

  try {
    const result = await requestCode(parsed.data.email, ipHash(req))
    if (!result.ok && result.reason === "rate_limited") {
      return Response.json(
        { error: "Too many codes requested. Please wait a few minutes and try again." },
        { status: 429, headers: { "Retry-After": "900" } },
      )
    }
    if (!result.ok) return Response.json({ error: "We couldn't send the email just now. Please try again shortly." }, { status: 502 })
    return Response.json({ sent: true })
  } catch (error) {
    console.error("Requesting a sign-in code failed", error)
    return Response.json({ error: "Sign-in is unavailable for a moment. Please try again shortly." }, { status: 503 })
  }
}

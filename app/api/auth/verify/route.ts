import { z } from "zod"
import { SavedItemSchema } from "@/lib/schemas"
import { addSaved, EmailSchema, listSaved, maskEmail, mergeVisitorUsage, verifyCode } from "@/lib/server/accounts"
import { accountIdOf, getVisitor, signInAs } from "@/lib/server/visitor"

const RequestSchema = z.object({
  email: EmailSchema,
  code: z.string().trim().regex(/^\d{6}$/),
  /** Items the guest saved in this browser, to keep on the account. */
  savedItems: z.array(SavedItemSchema).max(200).default([]),
})

const MESSAGES = {
  invalid: "That code isn't right. Check the email and try again.",
  too_many: "Too many wrong tries. Please request a new code.",
  expired: "That code has expired. Please request a new one.",
  none: "There's no active code for that address. Please request a new one.",
} as const

/** Checks the emailed code and signs in, keeping the guest's usage and saved items. */
export async function POST(req: Request) {
  const parsed = RequestSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: "Enter the 6-digit code from the email." }, { status: 400 })
  const { email, code, savedItems } = parsed.data

  try {
    const result = await verifyCode(email, code)
    if (!result.ok) return Response.json({ error: MESSAGES[result.reason], reason: result.reason }, { status: 400 })

    const visitor = await getVisitor(req)
    if (!accountIdOf(visitor)) await mergeVisitorUsage(visitor.id, result.account.id)
    await addSaved(result.account.id, savedItems)
    await signInAs(result.account.id)
    return Response.json({ account: { email: maskEmail(result.account.email) }, savedItems: await listSaved(result.account.id) })
  } catch (error) {
    console.error("Verifying a sign-in code failed", error)
    return Response.json({ error: "Sign-in is unavailable for a moment. Please try again shortly." }, { status: 503 })
  }
}

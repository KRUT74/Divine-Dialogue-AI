import "server-only"
import { Resend } from "resend"

let client: Resend | null = null

export const emailConfigured = () => Boolean(process.env.RESEND_API_KEY)

function resend(): Resend {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error("RESEND_API_KEY is not set. See .env.example.")
  client ??= new Resend(apiKey)
  return client
}

// Resend's test sender delivers only to the Resend account's own address; set EMAIL_FROM
// to an address on a verified domain to send to anyone.
const from = () => process.env.EMAIL_FROM || "Divine Dialogue <onboarding@resend.dev>"

/** Sends a sign-in code. Throws if Resend rejects the message. */
export async function sendCodeEmail(to: string, code: string, minutesValid: number) {
  const spaced = `${code.slice(0, 3)} ${code.slice(3)}`
  const { error } = await resend().emails.send({
    from: from(),
    to,
    subject: `${spaced} is your Divine Dialogue code`,
    text: `Your Divine Dialogue sign-in code is ${spaced}.\n\nIt works for ${minutesValid} minutes. If you didn't ask for it, you can ignore this email.`,
    html: `<!doctype html>
<html><body style="margin:0;background:#f7f2e7;font-family:Georgia,'Times New Roman',serif;color:#1f1a14">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f2e7;padding:40px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background:#fbf8f1;border:1px solid #e3d9c5;border-radius:16px;padding:32px;text-align:center">
        <tr><td style="font-size:22px;color:#1f1a14"><span style="color:#a8802f">&#10022;</span> Divine Dialogue</td></tr>
        <tr><td style="padding-top:20px;font-size:17px;font-style:italic;color:#6b6153">Here is your sign-in code</td></tr>
        <tr><td style="padding:14px 0 10px;font-size:36px;letter-spacing:6px;color:#1f1a14">${spaced}</td></tr>
        <tr><td style="font-size:14px;color:#6b6153">It works for ${minutesValid} minutes. If you didn't ask for it, you can ignore this email.</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
  })
  if (error) throw new Error(`Resend: ${error.message}`)
}

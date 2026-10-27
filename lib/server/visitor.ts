import "server-only"
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto"
import { cookies } from "next/headers"

// Every visitor gets a random ID (v_…) in a signed, httpOnly cookie, so free limits can be
// counted per person without an account. Signing in with email swaps it for the account's
// stable ID (a_…). The server never takes an ID from the request body, so nobody can spend
// someone else's allowance or read their saved items.

const COOKIE_NAME = "dd_visitor"
const MAX_AGE_SECONDS = 60 * 60 * 24 * 365

export type Visitor = {
  /** v_… for a guest, a_… for a signed-in account. */
  id: string
  /** Keyed hash of the IP address, for limits that cookie-clearing can't reset. */
  ipHash: string
  /** True when this request issued the cookie. */
  isNew: boolean
}

function secret(): string {
  const value = process.env.SESSION_SECRET
  if (!value || value.length < 32) throw new Error("SESSION_SECRET must be set to at least 32 characters. See .env.example.")
  return value
}

export const keyedHash = (value: string) => createHmac("sha256", secret()).update(value).digest("base64url")

const sign = (id: string) => createHmac("sha256", secret()).update(id).digest("base64url")

function verify(value: string): string | null {
  const [id, signature] = value.split(".")
  if (!id || !signature) return null
  const expected = Buffer.from(sign(id))
  const actual = Buffer.from(signature)
  return expected.length === actual.length && timingSafeEqual(expected, actual) ? id : null
}

/** The caller's visitor ID, issuing a new cookie if they don't have a valid one. */
export async function getVisitor(req: Request): Promise<Visitor> {
  const jar = await cookies()
  const existing = jar.get(COOKIE_NAME)?.value
  const id = existing ? verify(existing) : null
  if (id) return { id, ipHash: ipHash(req), isNew: false }

  const newId = `v_${randomUUID()}`
  await writeCookie(newId)
  return { id: newId, ipHash: ipHash(req), isNew: true }
}

export const accountIdOf = (visitor: Visitor) => (visitor.id.startsWith("a_") ? visitor.id : null)

/** After a verified sign-in: this browser now acts as the account. */
export async function signInAs(accountId: string) {
  await writeCookie(accountId)
}

/** Back to being an anonymous guest; a new visitor ID is issued on the next request. */
export async function signOut() {
  ;(await cookies()).delete(COOKIE_NAME)
}

async function writeCookie(id: string) {
  ;(await cookies()).set(COOKIE_NAME, `${id}.${sign(id)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  })
}

export function ipHash(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  const ip = forwarded || req.headers.get("x-real-ip") || "unknown"
  return createHmac("sha256", secret()).update(`ip:${ip}`).digest("base64url").slice(0, 32)
}

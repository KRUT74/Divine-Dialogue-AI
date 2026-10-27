import "server-only"
import { randomInt, randomUUID } from "node:crypto"
import { z } from "zod"
import type { SavedItem } from "@/lib/schemas"
import { sendCodeEmail } from "./email"
import { supabase } from "./supabase"
import { keyedHash } from "./visitor"

const CODE_MINUTES = 10
const MAX_ATTEMPTS = 5
const CODES_PER_EMAIL_PER_15_MIN = 3
const CODES_PER_NETWORK_PER_HOUR = 10
const MAX_SAVED_ITEMS = 500

export const EmailSchema = z.string().trim().toLowerCase().pipe(z.email().max(254))

export type Account = { id: string; email: string }

// Codes are stored only as an HMAC, so a database leak doesn't reveal live codes.
const hashCode = (email: string, code: string) => keyedHash(`code:${email}:${code}`)

async function countCodes(column: "email" | "ip_hash", value: string, sinceMinutes: number): Promise<number> {
  const since = new Date(Date.now() - sinceMinutes * 60_000).toISOString()
  const { count, error } = await supabase()
    .from("email_codes")
    .select("id", { count: "exact", head: true })
    .eq(column, value)
    .gte("created_at", since)
  if (error) throw error
  return count ?? 0
}

export type RequestCodeResult = { ok: true } | { ok: false; reason: "rate_limited" | "send_failed" }

/** Emails a fresh 6-digit code, replacing any earlier unused one. */
export async function requestCode(email: string, ipHash: string): Promise<RequestCodeResult> {
  const [forEmail, forNetwork] = await Promise.all([countCodes("email", email, 15), countCodes("ip_hash", ipHash, 60)])
  if (forEmail >= CODES_PER_EMAIL_PER_15_MIN || forNetwork >= CODES_PER_NETWORK_PER_HOUR) {
    return { ok: false, reason: "rate_limited" }
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0")
  const db = supabase()
  const { error: expireError } = await db
    .from("email_codes")
    .update({ consumed_at: new Date().toISOString() })
    .eq("email", email)
    .is("consumed_at", null)
  if (expireError) throw expireError
  const { error } = await db.from("email_codes").insert({
    email,
    code_hash: hashCode(email, code),
    ip_hash: ipHash,
    expires_at: new Date(Date.now() + CODE_MINUTES * 60_000).toISOString(),
  })
  if (error) throw error

  try {
    await sendCodeEmail(email, code, CODE_MINUTES)
    return { ok: true }
  } catch (err) {
    console.error("Sending sign-in code failed", err)
    return { ok: false, reason: "send_failed" }
  }
}

export type VerifyResult = { ok: true; account: Account } | { ok: false; reason: "invalid" | "too_many" | "expired" | "none" }

/** Checks a code; on success returns the account, creating it on first sign-in. */
export async function verifyCode(email: string, code: string): Promise<VerifyResult> {
  const db = supabase()
  const { data: status, error } = await db.rpc("consume_email_code", {
    p_email: email,
    p_code_hash: hashCode(email, code),
    p_max_attempts: MAX_ATTEMPTS,
  })
  if (error) throw error
  if (status !== "ok") return { ok: false, reason: status as "invalid" | "too_many" | "expired" | "none" }

  const now = new Date().toISOString()
  const { data: existing, error: findError } = await db.from("accounts").select("id, email").eq("email", email).maybeSingle()
  if (findError) throw findError
  if (existing) {
    await db.from("accounts").update({ last_sign_in_at: now }).eq("id", existing.id)
    return { ok: true, account: existing }
  }

  const account = { id: `a_${randomUUID()}`, email }
  const { error: insertError } = await db.from("accounts").insert({ ...account, last_sign_in_at: now })
  if (insertError) throw insertError
  return { ok: true, account }
}

export async function getAccount(id: string): Promise<Account | null> {
  const { data, error } = await supabase().from("accounts").select("id, email").eq("id", id).maybeSingle()
  if (error) throw error
  return data
}

/** Moves a guest's usage onto the account they signed in to, so limits carry over. */
export async function mergeVisitorUsage(visitorId: string, accountId: string) {
  const { error } = await supabase().rpc("merge_visitor_usage", { p_from: visitorId, p_to: accountId })
  if (error) throw error
}

/** "be•••@hotmail.com": enough to recognise, without showing the whole address on screen. */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@")
  return `${local.slice(0, 2)}•••@${domain}`
}

type SavedRow = { id: string; faith: string; type: string; title: string; content: string; saved_at: string }

const toItem = (row: SavedRow) =>
  ({ id: row.id, faith: row.faith, type: row.type, title: row.title, content: row.content, savedAt: row.saved_at }) as SavedItem

export async function listSaved(accountId: string): Promise<SavedItem[]> {
  const { data, error } = await supabase()
    .from("saved_items")
    .select("id, faith, type, title, content, saved_at")
    .eq("account_id", accountId)
    .order("saved_at", { ascending: false })
    .limit(MAX_SAVED_ITEMS)
  if (error) throw error
  return (data as SavedRow[]).map(toItem)
}

/** Adds items (ignoring any already saved, by id). Used for new saves and for a guest's items at sign-in. */
export async function addSaved(accountId: string, items: SavedItem[]) {
  if (!items.length) return
  const rows = items.map((item) => ({
    id: item.id,
    account_id: accountId,
    faith: item.faith,
    type: item.type,
    title: item.title,
    content: item.content,
    saved_at: item.savedAt,
  }))
  const { error } = await supabase().from("saved_items").upsert(rows, { onConflict: "id", ignoreDuplicates: true })
  if (error) throw error
}

export async function removeSaved(accountId: string, id: string) {
  const { error } = await supabase().from("saved_items").delete().eq("account_id", accountId).eq("id", id)
  if (error) throw error
}

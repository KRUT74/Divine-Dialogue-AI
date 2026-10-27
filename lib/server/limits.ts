import "server-only"
import type { Feature, Usage } from "@/lib/schemas"
import { supabase, supabaseConfigured } from "./supabase"
import type { Visitor } from "./visitor"

function numberFrom(name: string, fallback: number): number {
  const parsed = Number(process.env[name])
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

/** Free daily limits and the demo's safety ceilings. Each can be overridden by env var. */
const LIMITS = {
  perDay: {
    chat: numberFrom("FREE_CHAT_PER_DAY", 10),
    voice: numberFrom("FREE_VOICE_PER_DAY", 3),
    compare: numberFrom("FREE_COMPARE_PER_DAY", 2),
    read: numberFrom("FREE_READ_PER_DAY", 10),
  } satisfies Record<Feature, number>,
  /** Questions of any kind from one visitor in a minute, against scripted abuse. */
  perMinute: numberFrom("VISITOR_PER_MINUTE", 6),
  /** One visitor's estimated spend in 24 hours, including voice. */
  visitorBudgetUsd: numberFrom("VISITOR_DAILY_BUDGET_USD", 0.4),
  /** Questions from one network in 24 hours: room for a household or classroom, not a script. */
  ipQuestionsPerDay: numberFrom("IP_QUESTIONS_PER_DAY", 60),
  /** New visitor cookies from one network in 24 hours, so clearing cookies doesn't reset limits. */
  ipVisitorsPerDay: numberFrom("IP_VISITORS_PER_DAY", 20),
  /** Estimated spend across everyone in 24 hours. Past it, AI features pause for the day. */
  dailyBudgetUsd: numberFrom("DAILY_BUDGET_USD", 3),
}

const FEATURE_LIMIT_MESSAGES: Record<Feature, (limit: number) => string> = {
  chat: (n) => `You've asked today's ${n} free questions. Please come back tomorrow.`,
  voice: (n) => `You've used today's ${n} free voice replies. You can keep typing, or come back tomorrow.`,
  compare: (n) => `You've used today's ${n} free six-tradition comparisons. Please come back tomorrow.`,
  read: (n) => `You've read today's ${n} free passages with explanations. Please come back tomorrow.`,
}

type Summary = {
  visitor_chat: number
  visitor_voice: number
  visitor_compare: number
  visitor_read: number
  visitor_last_minute: number
  visitor_cost: number
  ip_questions: number
  ip_visitors: number
  total_cost: number
}

const DAY_SECONDS = 24 * 60 * 60

export class LimitError extends Error {
  constructor(
    message: string,
    readonly retryAfterSeconds: number,
  ) {
    super(message)
  }
}

let warned = false

/** In development without Supabase, limits are off; in production that is an error. */
function limitsEnabled(): boolean {
  if (supabaseConfigured()) return true
  if (process.env.NODE_ENV === "production") throw new Error("Usage limits need SUPABASE_URL and SUPABASE_SECRET_KEY.")
  if (!warned) console.warn("[limits] Supabase is not configured: usage limits are off in development.")
  warned = true
  return false
}

async function summary(visitor: Visitor): Promise<Summary> {
  const { data, error } = await supabase().rpc("usage_summary", { p_visitor_id: visitor.id, p_ip_hash: visitor.ipHash })
  if (error) throw error
  const row = (data as Summary[])[0]
  return { ...row, visitor_cost: Number(row.visitor_cost), total_cost: Number(row.total_cost) }
}

/** Records a new visitor, refusing if one network is creating many. Call before anything else. */
async function admit(visitor: Visitor, s: Summary): Promise<void> {
  if (!visitor.isNew) return
  if (s.ip_visitors >= LIMITS.ipVisitorsPerDay) {
    throw new LimitError("Too many new visitors from your network today. Please try again tomorrow.", DAY_SECONDS)
  }
  await record("visitor", visitor)
}

function checkSpend(s: Summary) {
  if (s.total_cost >= LIMITS.dailyBudgetUsd) {
    throw new LimitError("Divine Dialogue has reached its limit for today. Please come back tomorrow.", DAY_SECONDS)
  }
  if (s.visitor_cost >= LIMITS.visitorBudgetUsd) {
    throw new LimitError("You've reached today's free limit. Please come back tomorrow.", DAY_SECONDS)
  }
}

/** Throws a LimitError if the visitor may not use this feature right now. */
export async function checkAllowed(visitor: Visitor, feature: Feature): Promise<void> {
  if (!limitsEnabled()) return
  const s = await summary(visitor)
  await admit(visitor, s)
  checkSpend(s)
  if (s.visitor_last_minute >= LIMITS.perMinute) {
    throw new LimitError("You're asking quickly. Please wait a moment and try again.", 60)
  }
  if (s.ip_questions >= LIMITS.ipQuestionsPerDay) {
    throw new LimitError("Your network has reached today's free limit. Please come back tomorrow.", DAY_SECONDS)
  }
  const limit = LIMITS.perDay[feature]
  if (s[`visitor_${feature}`] >= limit) throw new LimitError(FEATURE_LIMIT_MESSAGES[feature](limit), DAY_SECONDS)
}

/** For voice listening and speech, which are bounded by spend rather than counted. */
export async function checkSpendAllowed(visitor: Visitor, { needsVoiceReply = false } = {}): Promise<void> {
  if (!limitsEnabled()) return
  const s = await summary(visitor)
  await admit(visitor, s)
  checkSpend(s)
  if (needsVoiceReply && s.visitor_voice >= LIMITS.perDay.voice) {
    throw new LimitError(FEATURE_LIMIT_MESSAGES.voice(LIMITS.perDay.voice), DAY_SECONDS)
  }
}

/** Logs a billable action. Never throws: a logging failure shouldn't fail the visitor's request. */
export async function record(kind: Feature | "visitor" | "blessing" | "listen" | "speak", visitor: Visitor | null, costUsd = 0) {
  if (!supabaseConfigured()) return
  const { error } = await supabase()
    .from("usage_events")
    .insert({ kind, visitor_id: visitor?.id ?? null, ip_hash: visitor?.ipHash ?? null, cost_usd: costUsd })
  if (error) console.error("[limits] Recording usage failed", error)
}

/** What the visitor has left today, for the app to show. */
export async function usageFor(visitor: Visitor): Promise<Usage> {
  const limits = LIMITS.perDay
  if (!limitsEnabled()) return { limits, remaining: { ...limits }, paused: false }
  const s = await summary(visitor)
  await admit(visitor, s)
  const paused = s.total_cost >= LIMITS.dailyBudgetUsd || s.visitor_cost >= LIMITS.visitorBudgetUsd
  const remaining = Object.fromEntries(
    Object.entries(limits).map(([feature, limit]) => [
      feature,
      paused ? 0 : Math.max(0, limit - s[`visitor_${feature as Feature}`]),
    ]),
  ) as Record<Feature, number>
  return { limits, remaining, paused }
}

/**
 * Runs a limit check and turns a refusal into the response to send, or null to go ahead.
 * If the usage database can't be reached, AI features are refused rather than left unguarded.
 */
export async function guard(check: () => Promise<void>): Promise<Response | null> {
  try {
    await check()
    return null
  } catch (error) {
    if (error instanceof LimitError) return limitResponse(error)
    console.error("[limits] Limit check failed", error)
    return Response.json({ error: "Divine Dialogue is unavailable for a moment. Please try again shortly." }, { status: 503 })
  }
}

function limitResponse(error: LimitError) {
  return Response.json({ error: error.message, limit: true }, { status: 429, headers: { "Retry-After": String(error.retryAfterSeconds) } })
}

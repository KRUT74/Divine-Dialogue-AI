import "server-only"
import Stripe from "stripe"
import type { Account } from "./accounts"
import { supabase } from "./supabase"

let client: Stripe | null = null

export const stripeConfigured = () => Boolean(process.env.STRIPE_SECRET_KEY)

/**
 * The Stripe client. This is a portfolio demo, so live keys are refused unless
 * ALLOW_LIVE_PAYMENTS=true is set on purpose: nobody can be charged by accident.
 */
export function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set. See .env.example.")
  if (!key.startsWith("sk_test_") && !key.startsWith("rk_test_") && process.env.ALLOW_LIVE_PAYMENTS !== "true") {
    throw new Error("Refusing a live Stripe key: Divine Dialogue runs Stripe in test mode.")
  }
  client ??= new Stripe(key)
  return client
}

/** The Plus price is found by this lookup key, so no price ID needs configuring. */
export const PLUS_LOOKUP_KEY = "divine_dialogue_plus_monthly"

let plusPriceId: Promise<string> | null = null

function plusPrice(): Promise<string> {
  plusPriceId ??= stripe()
    .prices.list({ lookup_keys: [PLUS_LOOKUP_KEY], active: true, limit: 1 })
    .then(({ data }) => {
      if (!data[0]) throw new Error(`No active Stripe price with lookup key ${PLUS_LOOKUP_KEY}. Run pnpm stripe:setup.`)
      return data[0].id
    })
  plusPriceId.catch(() => (plusPriceId = null))
  return plusPriceId
}

type SubscriptionRow = {
  account_id: string
  stripe_customer_id: string
  stripe_subscription_id: string | null
  status: string
  current_period_end: string | null
  cancel_at_period_end: boolean
}

async function subscriptionRow(accountId: string): Promise<SubscriptionRow | null> {
  const { data, error } = await supabase().from("subscriptions").select("*").eq("account_id", accountId).maybeSingle()
  if (error) throw error
  return data
}

// past_due keeps Plus while Stripe retries a failed payment.
const PLUS_STATUSES = new Set(["active", "trialing", "past_due"])

export type Plan = {
  plan: "free" | "plus"
  /** When a cancelled Plus subscription ends, or when it next renews (ISO date). */
  renewsAt?: string
  cancelsAtPeriodEnd?: boolean
}

export async function planFor(accountId: string | null): Promise<Plan> {
  if (!accountId || !stripeConfigured()) return { plan: "free" }
  const row = await subscriptionRow(accountId)
  if (!row || !PLUS_STATUSES.has(row.status)) return { plan: "free" }
  return { plan: "plus", renewsAt: row.current_period_end ?? undefined, cancelsAtPeriodEnd: row.cancel_at_period_end }
}

/** The account's Stripe customer, created on first checkout and remembered. */
async function customerFor(account: Account): Promise<string> {
  const row = await subscriptionRow(account.id)
  if (row) return row.stripe_customer_id
  const customer = await stripe().customers.create({ email: account.email, metadata: { account_id: account.id } })
  const { error } = await supabase()
    .from("subscriptions")
    .insert({ account_id: account.id, stripe_customer_id: customer.id, status: "none" })
  if (error) throw error
  return customer.id
}

/** A Stripe Checkout page for subscribing to Plus. */
export async function createCheckout(account: Account, origin: string): Promise<string> {
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer: await customerFor(account),
    client_reference_id: account.id,
    line_items: [{ price: await plusPrice(), quantity: 1 }],
    subscription_data: { metadata: { account_id: account.id } },
    allow_promotion_codes: true,
    success_url: `${origin}/?plus=welcome&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/?plus=cancelled`,
  })
  if (!session.url) throw new Error("Stripe returned no checkout URL")
  return session.url
}

/** Stripe's Customer Portal, where members change their card, see invoices or cancel. */
export async function createPortal(accountId: string, origin: string): Promise<string | null> {
  const row = await subscriptionRow(accountId)
  if (!row) return null
  const { data: configurations } = await stripe().billingPortal.configurations.list({ active: true, limit: 1 })
  const session = await stripe().billingPortal.sessions.create({
    customer: row.stripe_customer_id,
    return_url: origin,
    ...(configurations[0] ? { configuration: configurations[0].id } : {}),
  })
  return session.url
}

/**
 * Copies the customer's newest subscription from Stripe into the database. Called from
 * the webhook and when a visitor returns from Checkout, so Plus works even if the
 * webhook is a moment late. Stripe stays the source of truth.
 */
export async function syncCustomer(customerId: string) {
  const { data: subscriptions } = await stripe().subscriptions.list({ customer: customerId, status: "all", limit: 1 })
  const subscription = subscriptions[0]
  const update = subscription
    ? {
        stripe_subscription_id: subscription.id,
        status: subscription.status,
        price_id: subscription.items.data[0]?.price.id ?? null,
        current_period_end: subscription.items.data[0]
          ? new Date(subscription.items.data[0].current_period_end * 1000).toISOString()
          : null,
        cancel_at_period_end: subscription.cancel_at_period_end,
        updated_at: new Date().toISOString(),
      }
    : { status: "none", updated_at: new Date().toISOString() }
  const { error } = await supabase().from("subscriptions").update(update).eq("stripe_customer_id", customerId)
  if (error) throw error
}

/** After Checkout: syncs the subscription if this session belongs to the signed-in account. */
export async function syncCheckoutSession(sessionId: string, accountId: string) {
  const session = await stripe().checkout.sessions.retrieve(sessionId)
  if (session.client_reference_id !== accountId || typeof session.customer !== "string") return
  await syncCustomer(session.customer)
}

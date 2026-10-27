// Creates the Plus product, its monthly price and a Customer Portal configuration in
// Stripe test mode. Safe to run more than once: anything that exists is left alone.
// Run with: pnpm stripe:setup
import Stripe from "stripe"

const LOOKUP_KEY = "divine_dialogue_plus_monthly"
const key = process.env.STRIPE_SECRET_KEY
if (!key?.startsWith("sk_test_") && !key?.startsWith("rk_test_")) {
  console.error("STRIPE_SECRET_KEY must be a test key (sk_test_…). This script never touches live mode.")
  process.exit(1)
}
const stripe = new Stripe(key)

const { data: prices } = await stripe.prices.list({ lookup_keys: [LOOKUP_KEY], limit: 1 })
if (prices[0]) {
  console.log(`Plus price already exists: ${prices[0].id}`)
} else {
  const product = await stripe.products.create({
    name: "Divine Dialogue Plus",
    description: "Hands-free voice conversations and more questions every day.",
  })
  const price = await stripe.prices.create({
    product: product.id,
    currency: "eur",
    unit_amount: 499,
    recurring: { interval: "month" },
    lookup_key: LOOKUP_KEY,
  })
  console.log(`Created Plus: ${product.id}, price ${price.id} (€4.99/month)`)
}

const { data: configurations } = await stripe.billingPortal.configurations.list({ active: true, limit: 1 })
if (configurations[0]) {
  console.log(`Customer Portal already configured: ${configurations[0].id}`)
} else {
  const configuration = await stripe.billingPortal.configurations.create({
    business_profile: { headline: "Divine Dialogue Plus" },
    features: {
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      subscription_cancel: { enabled: true, mode: "at_period_end" },
    },
  })
  console.log(`Created Customer Portal configuration: ${configuration.id}`)
}

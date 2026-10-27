import type Stripe from "stripe"
import { stripe, syncCustomer } from "@/lib/server/stripe"

const HANDLED = new Set<Stripe.Event.Type>([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
])

/**
 * Stripe tells us here when a subscription starts, changes or ends. The signature is
 * checked against STRIPE_WEBHOOK_SECRET, so nobody can fake a payment.
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  const signature = req.headers.get("stripe-signature")
  if (!secret || !signature) return Response.json({ error: "Not configured" }, { status: 400 })

  let event: Stripe.Event
  try {
    event = stripe().webhooks.constructEvent(await req.text(), signature, secret)
  } catch {
    return Response.json({ error: "Invalid signature" }, { status: 400 })
  }

  if (HANDLED.has(event.type)) {
    const object = event.data.object as { customer?: string | { id: string } | null }
    const customer = typeof object.customer === "string" ? object.customer : object.customer?.id
    if (customer) {
      try {
        await syncCustomer(customer)
      } catch (error) {
        // A 500 makes Stripe retry later.
        console.error(`Handling ${event.type} failed`, error)
        return Response.json({ error: "Sync failed" }, { status: 500 })
      }
    }
  }
  return Response.json({ received: true })
}

"use client"

import { Check, X } from "lucide-react"
import { useEffect, useId, useRef, useState } from "react"
import type { Feature } from "@/lib/schemas"
import { openBillingPortal, startCheckout } from "../lib/api"
import { useAppState } from "../lib/state"
import { SignIn } from "./AccountDialog"

const ROWS: { feature: Feature; label: string; free: string; plus: string }[] = [
  { feature: "voice", label: "Hands-free voice replies", free: "3 a day", plus: "40 a day, 200 a month" },
  { feature: "chat", label: "Questions to a guide", free: "10 a day", plus: "100 a day" },
  { feature: "compare", label: "Ask all six traditions", free: "2 a day", plus: "20 a day" },
  { feature: "read", label: "Passages explained", free: "10 a day", plus: "50 a day" },
]

const formatDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })

/** Divine Dialogue Plus: what it adds, and the way into Stripe Checkout or the billing portal. */
export function PlusDialog() {
  const { plusOpen, setPlusOpen, account, usage } = useAppState()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const headingId = useId()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [signingIn, setSigningIn] = useState(false)
  const isPlus = usage?.plan === "plus"

  useEffect(() => {
    const dialog = dialogRef.current
    if (plusOpen && !dialog?.open) dialog?.showModal()
    if (!plusOpen && dialog?.open) dialog.close()
  }, [plusOpen])

  async function go(action: () => Promise<string>) {
    setError(null)
    setBusy(true)
    try {
      window.location.href = await action()
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={headingId}
      onClose={() => {
        setPlusOpen(false)
        setSigningIn(false)
      }}
      onClick={(e) => e.target === e.currentTarget && setPlusOpen(false)}
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-line bg-raised p-0 text-ink shadow-2xl backdrop:bg-black/30"
    >
      <div className="relative px-6 pt-6 pb-7">
        <button
          type="button"
          onClick={() => setPlusOpen(false)}
          aria-label="Close"
          className="absolute top-4 right-4 rounded-full p-1.5 text-muted hover:text-ink"
        >
          <X aria-hidden className="size-5" />
        </button>

        {signingIn && !account ? (
          <SignIn
            headingId={headingId}
            onDone={() => setSigningIn(false)}
            intro="Plus belongs to your account, so sign in first. No password: we email you a code."
          />
        ) : (
          <div className="text-center">
            <p aria-hidden className="text-2xl text-gold">
              ✦
            </p>
            <h2 id={headingId} className="mt-1 font-serif text-3xl">
              Divine Dialogue <span className="text-gold-text italic">Plus</span>
            </h2>
            {isPlus ? (
              <p className="mt-2 font-serif text-lg text-ink/85 italic">
                Thank you for being a member.{" "}
                {usage?.renewsAt &&
                  (usage.cancelsAtPeriodEnd
                    ? `Plus ends on ${formatDate(usage.renewsAt)}.`
                    : `It renews on ${formatDate(usage.renewsAt)}.`)}
              </p>
            ) : (
              <p className="mt-2 font-serif text-lg text-ink/85 italic">Talk with the guides as long as you like, by voice.</p>
            )}

            <table className="mt-6 w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-muted">
                  <th scope="col" className="py-2 font-normal">
                    <span className="sr-only">Feature</span>
                  </th>
                  <th scope="col" className="small-caps py-2 font-normal">
                    Free
                  </th>
                  <th scope="col" className="small-caps py-2 font-normal text-gold-text">
                    Plus
                  </th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => (
                  <tr key={row.feature} className="border-b border-line/60">
                    <th scope="row" className="py-2.5 pr-3 font-serif text-base font-normal">
                      {row.label}
                    </th>
                    <td className="py-2.5 pr-3 text-muted">{row.free}</td>
                    <td className="py-2.5 text-ink">
                      <Check aria-hidden className="mr-1 inline size-3.5 text-gold-text" />
                      {row.plus}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {error && (
              <p role="alert" className="mt-4 text-sm text-danger">
                {error}
              </p>
            )}

            {isPlus ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => go(openBillingPortal)}
                className="mt-6 rounded-full border border-line px-5 py-2.5 text-sm hover:border-(--accent) disabled:opacity-50"
              >
                {busy ? "Opening…" : "Manage or cancel your subscription"}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  disabled={busy || account === undefined}
                  onClick={() => (account ? go(startCheckout) : setSigningIn(true))}
                  className="mt-6 w-full rounded-full bg-(--accent) px-5 py-3 font-medium text-paper hover:brightness-110 disabled:opacity-50"
                >
                  {busy ? "Opening secure checkout…" : account ? "Upgrade for €4.99 a month" : "Sign in to upgrade · €4.99 a month"}
                </button>
                <p className="mt-2 text-xs text-muted">Payments by Stripe. Cancel any time.</p>
              </>
            )}

            <p className="mt-5 rounded-lg border border-dashed border-line px-4 py-3 text-left text-xs leading-relaxed text-muted">
              <strong className="font-semibold text-ink">Demo:</strong> Stripe runs in test mode, so no real money moves. Use card{" "}
              <span className="font-mono text-ink">4242 4242 4242 4242</span> with any future date and any CVC.
            </p>
          </div>
        )}
      </div>
    </dialog>
  )
}

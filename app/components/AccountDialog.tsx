"use client"

import { ArrowLeft, CircleUser, X } from "lucide-react"
import { useEffect, useId, useRef, useState, type FormEvent } from "react"
import { requestSignInCode, verifySignInCode } from "../lib/api"
import { useAppState } from "../lib/state"

const RESEND_SECONDS = 30

/** The header's account button: email sign-in with a one-time code, or the signed-in account. */
export function AccountDialog() {
  const { account } = useAppState()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const headingId = useId()
  const close = () => dialogRef.current?.close()

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="flex items-center gap-1.5 rounded-full px-2 py-1.5 text-sm text-muted hover:text-ink"
      >
        <CircleUser aria-hidden className="size-4" />
        <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">{account ? "Account" : "Sign in"}</span>
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby={headingId}
        // Clicking the dimmed backdrop (the dialog element itself) closes it.
        onClick={(e) => e.target === e.currentTarget && close()}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-line bg-raised p-0 text-ink shadow-2xl backdrop:bg-black/30"
      >
        <div className="relative px-6 pt-6 pb-7">
          <button type="button" onClick={close} aria-label="Close" className="absolute top-4 right-4 rounded-full p-1.5 text-muted hover:text-ink">
            <X aria-hidden className="size-5" />
          </button>
          {account ? <SignedIn headingId={headingId} email={account.email} onDone={close} /> : <SignIn headingId={headingId} onDone={close} />}
        </div>
      </dialog>
    </>
  )
}

function SignedIn({ headingId, email, onDone }: { headingId: string; email: string; onDone: () => void }) {
  const { signOut } = useAppState()
  const [busy, setBusy] = useState(false)
  return (
    <div className="text-center">
      <h2 id={headingId} className="font-serif text-2xl">
        Your account
      </h2>
      <p className="mt-3 text-muted">
        Signed in as <span className="text-ink">{email}</span>
      </p>
      <p className="mt-2 font-serif text-lg text-ink/85 italic">Your saved passages and answers follow you to any device.</p>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true)
          await signOut().finally(() => setBusy(false))
          onDone()
        }}
        className="mt-6 rounded-full border border-line px-5 py-2 text-sm hover:border-(--accent) disabled:opacity-50"
      >
        Sign out
      </button>
    </div>
  )
}

export function SignIn({ headingId, onDone, intro }: { headingId: string; onDone: () => void; intro?: string }) {
  const { savedItems, signedIn } = useAppState()
  const [step, setStep] = useState<"email" | "code">("email")
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resendIn, setResendIn] = useState(0)
  const codeRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (resendIn <= 0) return
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendIn])

  useEffect(() => {
    if (step === "code") codeRef.current?.focus()
  }, [step])

  async function sendCode(event?: FormEvent) {
    event?.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await requestSignInCode(email.trim())
      setStep("code")
      setCode("")
      setResendIn(RESEND_SECONDS)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function verify(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const result = await verifySignInCode(email.trim(), code.replace(/\s/g, ""), savedItems)
      signedIn(result.account, result.savedItems)
      onDone()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const field =
    "w-full rounded-full border border-line bg-paper px-4 py-2.5 text-ink placeholder:text-muted focus:border-(--accent) focus:outline-none"
  const primary =
    "w-full rounded-full bg-(--accent) px-5 py-2.5 font-medium text-paper hover:brightness-110 disabled:opacity-50"

  if (step === "code") {
    return (
      <form onSubmit={verify} className="text-center">
        <h2 id={headingId} className="font-serif text-2xl">
          Check your email
        </h2>
        <p className="mt-2 text-muted">
          We sent a 6-digit code to <span className="text-ink">{email.trim()}</span>. It works for 10 minutes.
        </p>
        <label htmlFor="sign-in-code" className="sr-only">
          6-digit code
        </label>
        <input
          ref={codeRef}
          id="sign-in-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={7}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/[^\d ]/g, ""))}
          placeholder="123 456"
          className={`${field} mt-5 text-center font-serif text-2xl tracking-[0.3em]`}
        />
        {error && (
          <p role="alert" className="mt-3 text-sm text-danger">
            {error}
          </p>
        )}
        <button type="submit" disabled={busy || code.replace(/\s/g, "").length !== 6} className={`${primary} mt-4`}>
          {busy ? "Checking…" : "Sign in"}
        </button>
        <div className="mt-4 flex items-center justify-between text-sm">
          <button type="button" onClick={() => setStep("email")} className="inline-flex items-center gap-1 text-muted hover:text-ink">
            <ArrowLeft aria-hidden className="size-3.5" />
            Different email
          </button>
          <button type="button" disabled={busy || resendIn > 0} onClick={() => sendCode()} className="text-muted hover:text-ink disabled:opacity-60">
            {resendIn > 0 ? `Send again in ${resendIn}s` : "Send a new code"}
          </button>
        </div>
      </form>
    )
  }

  return (
    <form onSubmit={sendCode} className="text-center">
      <p aria-hidden className="text-2xl text-gold">
        ✦
      </p>
      <h2 id={headingId} className="mt-1 font-serif text-2xl">
        Sign in to Divine Dialogue
      </h2>
      <p className="mt-2 font-serif text-lg text-ink/85 italic">
        {intro ?? "Keep your saved passages and answers on every device. No password: we email you a code."}
      </p>
      <label htmlFor="sign-in-email" className="sr-only">
        Email address
      </label>
      <input
        id="sign-in-email"
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className={`${field} mt-5`}
      />
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy || !email.trim()} className={`${primary} mt-4`}>
        {busy ? "Sending…" : "Email me a code"}
      </button>
      {savedItems.length > 0 && (
        <p className="mt-3 text-sm text-muted">
          The {savedItems.length} {savedItems.length === 1 ? "item" : "items"} you&apos;ve saved here will move to your account.
        </p>
      )}
    </form>
  )
}

"use client"

import { X } from "lucide-react"
import { useEffect, useState } from "react"
import { FAITH_INFO } from "@/lib/faiths"
import { syncCheckout } from "../lib/api"
import { AppStateProvider, useAppState } from "../lib/state"
import { Chat } from "./Chat"
import { DailyBlessing } from "./DailyBlessing"
import { Header } from "./Header"
import { PlusDialog } from "./PlusDialog"
import { ScriptureLookup } from "./ScriptureLookup"
import { faithStyle } from "./ui"

export function Home() {
  return (
    <AppStateProvider>
      <Shell />
    </AppStateProvider>
  )
}

function Shell() {
  const { faith } = useAppState()
  const info = FAITH_INFO[faith]
  const notice = useCheckoutReturn()

  return (
    <div style={faithStyle(faith)} className="faith-theme min-h-dvh">
      <Header />
      <PlusDialog />
      <main className="mx-auto max-w-2xl px-5 pt-10 pb-16 sm:px-6">
        {notice.text && (
          <p role="status" className="mb-8 flex items-start justify-between gap-3 rounded-xl border border-gold/50 bg-raised px-4 py-3 font-serif text-lg">
            {notice.text}
            <button type="button" onClick={notice.dismiss} aria-label="Dismiss" className="shrink-0 pt-1 text-muted hover:text-ink">
              <X aria-hidden className="size-4" />
            </button>
          </p>
        )}
        <div className="mb-10 text-center">
          <p aria-hidden className="mb-2 font-serif text-4xl text-(--accent)">
            {info.symbol}
          </p>
          <h1 className="font-serif text-4xl text-ink sm:text-5xl">{info.name}</h1>
          <p className="mt-2 font-serif text-xl text-muted italic">{info.greeting}</p>
        </div>
        <Chat />
        <DailyBlessing />
        <ScriptureLookup />
        <p className="mt-20 border-t border-line pt-6 text-center font-serif text-sm text-muted italic">
          Divine Dialogue is an AI guide, not a religious authority. Answers can contain mistakes. If you are in crisis,
          please contact your local emergency services.
        </p>
      </main>
    </div>
  )
}

const NOTICE_KEY = "divine-dialogue-notice"

const NOTICES = {
  welcome: "✦ Welcome to Plus. Thank you! Your larger allowance is ready, voice included.",
  cancelled: "Checkout was cancelled. Nothing was charged.",
}

/**
 * Handles the return from Stripe Checkout (?plus=welcome or ?plus=cancelled). The notice is
 * kept for this tab until dismissed, so a reload right after returning doesn't lose it.
 */
function useCheckoutReturn() {
  const { refreshUsage } = useAppState()
  const [text, setText] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const result = params.get("plus")
    const sessionId = params.get("session_id")
    try {
      if (result === "welcome" || result === "cancelled") sessionStorage.setItem(NOTICE_KEY, result)
      const stored = sessionStorage.getItem(NOTICE_KEY)
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the URL and tab storage once after hydration
      if (stored === "welcome" || stored === "cancelled") setText(NOTICES[stored])
    } catch {
      if (result === "welcome" || result === "cancelled") setText(NOTICES[result])
    }
    if (!result) return
    // Tidy the address bar so the link can't be shared or bookmarked with a session ID.
    window.history.replaceState(null, "", window.location.pathname)
    if (result === "welcome" && sessionId) void syncCheckout(sessionId).then(refreshUsage)
  }, [refreshUsage])

  const dismiss = () => {
    setText(null)
    try {
      sessionStorage.removeItem(NOTICE_KEY)
    } catch {
      // Storage unavailable: nothing to clear.
    }
  }

  return { text, dismiss }
}

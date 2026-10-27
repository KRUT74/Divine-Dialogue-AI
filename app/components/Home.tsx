"use client"

import { FAITH_INFO } from "@/lib/faiths"
import { AppStateProvider, useAppState } from "../lib/state"
import { Chat } from "./Chat"
import { DailyBlessing } from "./DailyBlessing"
import { Header } from "./Header"
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

  return (
    <div style={faithStyle(faith)} className="faith-theme min-h-dvh">
      <Header />
      <main className="mx-auto max-w-2xl px-5 pt-10 pb-16 sm:px-6">
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

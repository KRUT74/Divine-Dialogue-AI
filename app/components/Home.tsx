"use client"

import type { CSSProperties } from "react"
import { FAITH_INFO } from "@/lib/faiths"
import { AppStateProvider, useAppState } from "../lib/state"
import { AskQuestion } from "./AskQuestion"
import { DailyBlessing } from "./DailyBlessing"
import { ScriptureLookup } from "./ScriptureLookup"
import { Brand, FaithPicker, LanguagePicker, SavedItems, Sidebar } from "./Sidebar"

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
  const theme = { "--accent": info.accentColor, "--primary": info.primaryColor } as CSSProperties

  return (
    <div style={theme} className="flex min-h-dvh">
      <Sidebar />
      <div className="min-w-0 flex-1">
        <header className="border-b border-slate-700 bg-slate-800 p-4 md:hidden">
          <div className="mb-3 flex items-center justify-between gap-3">
            <Brand />
            <LanguagePicker />
          </div>
          <FaithPicker layout="row" />
        </header>
        <main className="mx-auto max-w-4xl p-4 md:p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-medium text-(--accent)">{info.name}</h1>
            <p className="text-slate-400">{info.greeting}</p>
          </div>
          <DailyBlessing />
          <AskQuestion />
          <ScriptureLookup />
          <div className="md:hidden">
            <SavedItems />
          </div>
          <p className="mt-12 text-center text-xs text-slate-500">
            Divine Dialogue is an AI guide, not a religious authority. Answers can contain mistakes. If you are in
            crisis, please contact your local emergency services.
          </p>
        </main>
      </div>
    </div>
  )
}

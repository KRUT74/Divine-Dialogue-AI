"use client"

import { Trash2 } from "lucide-react"
import { useId } from "react"
import { FAITH_INFO, FAITHS, LANGUAGE_LABELS, LANGUAGES, type Language } from "@/lib/faiths"
import { cn } from "@/lib/utils"
import { useAppState } from "../lib/state"

export function FaithPicker({ layout }: { layout: "list" | "row" }) {
  const { faith: current, setFaith } = useAppState()
  return (
    <nav aria-label="Choose a tradition">
      <ul className={cn(layout === "list" ? "space-y-1" : "flex gap-2 overflow-x-auto pb-1")}>
        {FAITHS.map((faith) => {
          const info = FAITH_INFO[faith]
          const active = faith === current
          return (
            <li key={faith} className="shrink-0">
              <button
                type="button"
                aria-pressed={active}
                onClick={() => setFaith(faith)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition",
                  active ? "bg-slate-700 text-white" : "text-slate-300 hover:bg-slate-700/60",
                )}
              >
                <span aria-hidden className="text-xl" style={{ color: info.accentColor }}>
                  {info.symbol}
                </span>
                {info.name}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export function LanguagePicker() {
  const { language, setLanguage } = useAppState()
  // The sidebar and the phone header each render one, so ids must be unique.
  const id = useId()
  return (
    <div className="flex items-center justify-between gap-3">
      <label htmlFor={id} className="text-sm font-medium">
        Language
      </label>
      <select
        id={id}
        value={language}
        onChange={(e) => setLanguage(e.target.value as Language)}
        className="rounded-md bg-slate-700 px-2 py-1 text-sm text-white focus:ring-2 focus:ring-(--accent) focus:outline-none"
      >
        {LANGUAGES.map((lang) => (
          <option key={lang} value={lang}>
            {LANGUAGE_LABELS[lang]}
          </option>
        ))}
      </select>
    </div>
  )
}

export function SavedItems() {
  const { savedItems, removeItem } = useAppState()
  const headingId = useId()
  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className="mb-3 text-sm tracking-wide text-slate-400 uppercase">
        Saved
      </h2>
      {savedItems.length === 0 ? (
        <p className="py-2 text-sm text-slate-400">Nothing saved yet</p>
      ) : (
        <ul className="space-y-1">
          {savedItems.map((item) => (
            <li key={item.id}>
              <details className="group rounded-lg hover:bg-slate-700/60 open:bg-slate-700/60">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-2 p-2">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{item.title}</span>
                    <span className="block text-xs text-slate-400">{FAITH_INFO[item.faith].name}</span>
                  </span>
                  <span aria-hidden className="text-sm" style={{ color: FAITH_INFO[item.faith].accentColor }}>
                    {FAITH_INFO[item.faith].symbol}
                  </span>
                </summary>
                <div className="px-2 pb-2">
                  <p className="text-sm whitespace-pre-line text-slate-300">{item.content}</p>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="mt-2 flex items-center gap-1 text-xs text-slate-400 hover:text-red-300"
                  >
                    <Trash2 aria-hidden className="size-3.5" />
                    Remove
                  </button>
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-slate-700 bg-slate-800 md:flex">
      <div className="border-b border-slate-700 p-4">
        <Brand />
      </div>
      <div className="flex-1 space-y-6 overflow-y-auto p-4">
        <div>
          <h2 className="mb-3 text-sm tracking-wide text-slate-400 uppercase">Tradition</h2>
          <FaithPicker layout="list" />
        </div>
        <SavedItems />
      </div>
      <div className="border-t border-slate-700 p-4">
        <LanguagePicker />
      </div>
    </aside>
  )
}

export function Brand() {
  return (
    <p className="flex items-center gap-2 text-lg font-semibold whitespace-nowrap">
      <span aria-hidden className="flex size-8 items-center justify-center rounded-md bg-(--primary) text-(--accent)">
        ✦
      </span>
      Divine Dialogue
    </p>
  )
}

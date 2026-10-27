"use client"

import { Bookmark, Globe, Trash2, X } from "lucide-react"
import { useEffect, useId, useRef } from "react"
import { FAITH_INFO, FAITHS, LANGUAGE_CODES, LANGUAGE_LABELS, LANGUAGES, type Language } from "@/lib/faiths"
import { cn } from "@/lib/utils"
import { useAppState } from "../lib/state"
import { AccountDialog } from "./AccountDialog"
import { faithStyle } from "./ui"

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-4 pt-3 sm:px-6">
        <p className="flex items-center gap-2 font-serif text-xl whitespace-nowrap text-ink">
          <span aria-hidden className="text-gold">
            ✦
          </span>
          Divine Dialogue
        </p>
        <div className="flex shrink-0 items-center sm:gap-1">
          <LanguagePicker />
          <SavedDrawer />
          <AccountDialog />
          <PlusButton />
        </div>
      </div>
      <FaithPicker />
    </header>
  )
}

function PlusButton() {
  const { usage, setPlusOpen } = useAppState()
  const isPlus = usage?.plan === "plus"
  return (
    <button
      type="button"
      onClick={() => setPlusOpen(true)}
      className={cn(
        "ml-1 rounded-full border px-2.5 py-1 text-sm whitespace-nowrap",
        isPlus ? "border-gold/60 text-gold-text" : "border-gold/60 text-gold-text hover:bg-gold/10",
      )}
    >
      <span aria-hidden>✦ </span>
      {isPlus ? "Plus" : (
        <>
          <span className="hidden sm:inline">Go </span>Plus
        </>
      )}
    </button>
  )
}

function FaithPicker() {
  const { faith: current, setFaith } = useAppState()
  const navRef = useRef<HTMLElement>(null)

  // On a phone the row scrolls sideways; keep the chosen tradition in view.
  useEffect(() => {
    navRef.current?.querySelector('[aria-pressed="true"]')?.scrollIntoView({ inline: "center", block: "nearest" })
  }, [current])

  return (
    <nav ref={navRef} aria-label="Choose a tradition" className="mx-auto max-w-3xl">
      <ul className="flex gap-1 overflow-x-auto px-2 [scrollbar-width:none] sm:justify-center sm:px-4">
        {FAITHS.map((faith) => {
          const info = FAITH_INFO[faith]
          const active = faith === current
          return (
            <li key={faith} className="faith-theme shrink-0" style={faithStyle(faith)}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => setFaith(faith)}
                className={cn(
                  "flex items-center gap-1.5 border-b-2 px-3 pt-3 pb-2.5 text-sm transition-colors",
                  active ? "border-(--accent) text-ink" : "border-transparent text-muted hover:text-ink",
                )}
              >
                <span aria-hidden className="text-base text-(--accent)">
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

function LanguagePicker() {
  const { language, setLanguage } = useAppState()
  const id = useId()
  return (
    <>
      <label htmlFor={id} className="sr-only">
        Language
      </label>
      {/* The real select sits invisibly on top, so it stays fully usable; on a phone only "EN" shows. */}
      <span className="relative flex items-center gap-1 rounded-full px-2 py-1.5 text-sm text-muted focus-within:outline-2 focus-within:outline-(--accent) hover:text-ink">
        <Globe aria-hidden className="size-4" />
        <span aria-hidden className="uppercase sm:hidden">
          {LANGUAGE_CODES[language]}
        </span>
        <span aria-hidden className="hidden sm:inline">
          {LANGUAGE_LABELS[language]}
        </span>
        <select
          id={id}
          value={language}
          onChange={(e) => setLanguage(e.target.value as Language)}
          className="absolute inset-0 cursor-pointer opacity-0"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang} value={lang}>
              {LANGUAGE_LABELS[lang]}
            </option>
          ))}
        </select>
      </span>
    </>
  )
}

/** Saved blessings, answers and passages, in a panel that slides in from the side. */
function SavedDrawer() {
  const { savedItems, removeItem } = useAppState()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const headingId = useId()
  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="flex items-center gap-1.5 rounded-full px-2 py-1.5 text-sm text-muted hover:text-ink"
      >
        <Bookmark aria-hidden className="size-4" />
        <span className="sr-only sm:not-sr-only">Saved</span>
        {savedItems.length > 0 && <span className="text-xs text-gold-text">{savedItems.length}</span>}
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby={headingId}
        // Clicking the dimmed backdrop (the dialog element itself) closes it.
        onClick={(e) => e.target === e.currentTarget && dialogRef.current?.close()}
        className="m-0 ml-auto h-dvh max-h-dvh w-full max-w-md bg-raised p-0 text-ink shadow-2xl backdrop:bg-black/30"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 id={headingId} className="font-serif text-2xl">
              Saved
            </h2>
            <button type="button" onClick={() => dialogRef.current?.close()} aria-label="Close" className="rounded-full p-1.5 text-muted hover:text-ink">
              <X aria-hidden className="size-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {savedItems.length === 0 ? (
              <p className="py-8 text-center font-serif text-lg text-muted italic">
                Nothing saved yet. Save a blessing, an answer or a passage to keep it here.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {savedItems.map((item) => {
                  const info = FAITH_INFO[item.faith]
                  return (
                    <li key={item.id} className="faith-theme" style={faithStyle(item.faith)}>
                      <details className="group py-3">
                        <summary className="flex cursor-pointer list-none items-start gap-3">
                          <span aria-hidden className="pt-0.5 text-(--accent)">
                            {info.symbol}
                          </span>
                          <span className="min-w-0">
                            <span className="block font-serif text-lg leading-snug">{item.title}</span>
                            <span className="small-caps block text-sm text-muted">{info.name}</span>
                          </span>
                        </summary>
                        <div className="mt-2 pl-7">
                          <p className="font-serif whitespace-pre-line text-ink/90">{item.content}</p>
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="mt-2 inline-flex items-center gap-1 text-sm text-muted hover:text-danger"
                          >
                            <Trash2 aria-hidden className="size-3.5" />
                            Remove
                          </button>
                        </div>
                      </details>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      </dialog>
    </>
  )
}

"use client"

import { Bookmark, BookmarkCheck, type LucideIcon } from "lucide-react"
import { useState, type ReactNode } from "react"
import ReactMarkdown from "react-markdown"
import { cn } from "@/lib/utils"

export function Section({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  const id = `section-${title.toLowerCase().replace(/\s+/g, "-")}`
  return (
    <section aria-labelledby={id} className="mb-8">
      <h2 id={id} className="mb-4 flex items-center gap-2 text-xl font-medium text-(--accent)">
        <Icon aria-hidden className="size-5" />
        {title}
      </h2>
      <div className="rounded-lg border border-slate-700 bg-slate-800 p-6 shadow-lg">{children}</div>
    </section>
  )
}

export function Loading({ label }: { label: string }) {
  return (
    <div role="status" className="flex justify-center py-8">
      <div aria-hidden className="size-10 animate-pulse rounded-full bg-(--accent)" />
      <span className="sr-only">{label}</span>
    </div>
  )
}

export function ErrorMessage({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="py-6 text-center text-red-300">
      <p>{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 rounded bg-slate-700 px-4 py-2 text-white hover:bg-slate-600"
      >
        Try again
      </button>
    </div>
  )
}

export function Placeholder({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <div className="py-8 text-center text-slate-400">
      <Icon aria-hidden className="mx-auto mb-2 size-9" />
      <p>{children}</p>
    </div>
  )
}

/** Saves once, then shows that it's saved so a second click can't duplicate the item. */
export function SaveButton({ onSave }: { onSave: () => void }) {
  const [saved, setSaved] = useState(false)
  const Icon = saved ? BookmarkCheck : Bookmark
  return (
    <button
      type="button"
      disabled={saved}
      onClick={() => {
        onSave()
        setSaved(true)
      }}
      className={cn(
        "mt-6 flex items-center gap-1 rounded-full bg-(--primary) px-4 py-2 text-sm",
        saved ? "opacity-80" : "hover:brightness-125",
      )}
    >
      <Icon aria-hidden className="size-4" />
      {saved ? "Saved" : "Save"}
    </button>
  )
}

/** Renders model output as Markdown. Raw HTML is not rendered. */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose-guide font-serif text-lg leading-relaxed text-white">
      <ReactMarkdown>{children}</ReactMarkdown>
    </div>
  )
}

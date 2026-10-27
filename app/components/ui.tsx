"use client"

import { Bookmark, BookmarkCheck, ExternalLink, type LucideIcon } from "lucide-react"
import { useState, type ReactNode } from "react"
import ReactMarkdown from "react-markdown"
import type { Citation } from "@/lib/schemas"
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

/**
 * Renders model output as Markdown (raw HTML is not rendered). Citation markers
 * like [1] become links to the matching card in CitationList.
 */
export function Markdown({ children, citations = [], anchor = "" }: { children: string; citations?: Citation[]; anchor?: string }) {
  const ids = new Set(citations.map((c) => c.id))
  const text = children.replace(/\[(\d+)\]/g, (marker, id: string) =>
    ids.has(Number(id)) ? `[${id}](#${anchor}-cite-${id})` : marker,
  )
  return (
    <div className="prose-guide font-serif text-lg leading-relaxed text-white">
      <ReactMarkdown
        components={{
          a: ({ href, children: label }) =>
            href?.startsWith(`#${anchor}-cite-`) ? (
              <a href={href} className="citation-marker" aria-label={`Citation ${String(label)}`}>
                {label}
              </a>
            ) : (
              <a href={href} target="_blank" rel="noreferrer">
                {label}
              </a>
            ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  )
}

/** The verified passages a reply quoted, each linking to its source. */
export function CitationList({ citations, anchor, text }: { citations: Citation[]; anchor: string; text: string }) {
  // Only passages the reply actually quotes; the guide may look up more than it uses.
  const quoted = citations.filter((citation) => text.includes(`[${citation.id}]`))
  if (!quoted.length) return null
  return (
    <ol className="mt-4 space-y-2" aria-label="Sources">
      {quoted.map((citation) => (
        <li key={citation.id} id={`${anchor}-cite-${citation.id}`} className="scroll-mt-24">
          <Quote citation={citation} number={citation.id} />
        </li>
      ))}
    </ol>
  )
}

/** A passage exactly as the source gives it, with its reference and translation. */
export function Quote({ citation, number, large = false }: { citation: Citation; number?: number; large?: boolean }) {
  return (
    <figure className="rounded-lg border-l-4 border-(--accent) bg-slate-900/60 px-4 py-3">
      <blockquote className={cn("font-serif text-slate-100", large ? "text-xl leading-relaxed" : "text-base")}>
        {number !== undefined && <span className="mr-2 text-sm text-(--accent)">[{number}]</span>}“{citation.text}”
      </blockquote>
      <figcaption className="mt-2 flex flex-wrap items-center gap-x-2 text-sm text-slate-400">
        <a href={citation.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-slate-200 underline-offset-2 hover:underline">
          {citation.reference}
          <ExternalLink aria-hidden className="size-3.5" />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
        <span aria-hidden>·</span>
        <span>{citation.translation}</span>
      </figcaption>
    </figure>
  )
}

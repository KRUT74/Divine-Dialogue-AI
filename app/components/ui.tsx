"use client"

import { Bookmark, BookmarkCheck, ArrowUpRight } from "lucide-react"
import { useState, type CSSProperties, type ReactNode } from "react"
import ReactMarkdown from "react-markdown"
import { FAITH_INFO, type Faith } from "@/lib/faiths"
import type { Citation } from "@/lib/schemas"
import { cn } from "@/lib/utils"

/** Sets --accent to a tradition's ink colour, for day and night. Use with the faith-theme class. */
export function faithStyle(faith: Faith): CSSProperties {
  const info = FAITH_INFO[faith]
  return { "--faith-day": info.color, "--faith-night": info.nightColor } as CSSProperties
}

/** A section of the page, introduced by a gold ornament and a serif title. */
export function Section({ title, eyebrow, children }: { title: string; eyebrow?: string; children: ReactNode }) {
  const id = `section-${title.toLowerCase().replace(/\s+/g, "-")}`
  return (
    <section aria-labelledby={id} className="mt-16">
      <div aria-hidden className="ornament-rule mb-6 text-sm">
        ✦
      </div>
      <header className="mb-6 text-center">
        {eyebrow && <p className="small-caps mb-1 text-sm text-muted">{eyebrow}</p>}
        <h2 id={id} className="font-serif text-3xl text-ink">
          {title}
        </h2>
      </header>
      {children}
    </section>
  )
}

export function Loading({ label }: { label: string }) {
  return (
    <div role="status" className="flex items-center gap-1.5 py-4 text-(--accent)">
      {[0, 1, 2].map((i) => (
        <span key={i} aria-hidden className="typing-dot size-1.5 rounded-full bg-current" style={{ animationDelay: `${i * 0.2}s` }} />
      ))}
      <span className="ml-2 font-serif text-base text-muted italic">{label}…</span>
    </div>
  )
}

export function ErrorMessage({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="py-4 text-center">
      <p className="font-serif text-lg text-danger">{message}</p>
      <button type="button" onClick={onRetry} className="mt-3 rounded-full border border-line px-4 py-1.5 text-sm hover:border-(--accent)">
        Try again
      </button>
    </div>
  )
}

export function Placeholder({ children }: { children: ReactNode }) {
  return <p className="py-4 text-center font-serif text-lg text-muted italic">{children}</p>
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
        "mt-4 inline-flex items-center gap-1.5 text-sm text-muted",
        saved ? "text-(--accent)" : "hover:text-(--accent)",
      )}
    >
      <Icon aria-hidden className="size-4" />
      {saved ? "Saved" : "Save"}
    </button>
  )
}

/**
 * Renders model output as Markdown (raw HTML is not rendered). Citation markers
 * like [1] become footnote links to the matching passage in CitationList.
 */
export function Markdown({ children, citations = [], anchor = "", className }: { children: string; citations?: Citation[]; anchor?: string; className?: string }) {
  const ids = new Set(citations.map((c) => c.id))
  const text = children.replace(/\[(\d+)\]/g, (marker, id: string) =>
    ids.has(Number(id)) ? `[${id}](#${anchor}-cite-${id})` : marker,
  )
  return (
    <div className={cn("prose-guide font-serif text-xl leading-relaxed text-ink", className)}>
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

/** The verified passages a reply quoted, set as footnotes, each linking to its source. */
export function CitationList({ citations, anchor, text }: { citations: Citation[]; anchor: string; text: string }) {
  // Only passages the reply actually quotes; the guide may look up more than it uses.
  const quoted = citations.filter((citation) => text.includes(`[${citation.id}]`))
  if (!quoted.length) return null
  return (
    <ol className="mt-5 space-y-3 border-t border-line pt-4" aria-label="Sources">
      {quoted.map((citation) => (
        <li key={citation.id} id={`${anchor}-cite-${citation.id}`} className="flex scroll-mt-24 gap-3">
          <span className="w-4 shrink-0 pt-0.5 text-right text-sm font-semibold text-(--accent)">{citation.id}</span>
          <div className="min-w-0">
            <p className="font-serif text-lg leading-snug text-ink">“{citation.text}”</p>
            <Reference citation={citation} />
          </div>
        </li>
      ))}
    </ol>
  )
}

function Reference({ citation, centered = false }: { citation: Citation; centered?: boolean }) {
  return (
    <p className={cn("mt-1 flex flex-wrap items-baseline gap-x-2 text-sm text-muted", centered && "justify-center")}>
      <a
        href={citation.url}
        target="_blank"
        rel="noreferrer"
        className="small-caps inline-flex items-center gap-0.5 text-base text-(--accent) underline-offset-2 hover:underline"
      >
        {citation.reference}
        <ArrowUpRight aria-hidden className="size-3.5" />
        <span className="sr-only">(opens in a new tab)</span>
      </a>
      <span className="font-serif italic">{citation.translation}</span>
    </p>
  )
}

/** A passage set like a printed page: hanging quotation mark, centred, with its reference beneath. */
export function Quote({ citation }: { citation: Citation }) {
  return (
    <figure className="relative mx-auto max-w-xl px-6 text-center">
      <span aria-hidden className="absolute -top-6 left-0 font-serif text-7xl leading-none text-gold opacity-60">
        “
      </span>
      <blockquote className="font-serif text-2xl leading-snug text-ink sm:text-[1.7rem]">{citation.text}</blockquote>
      <figcaption className="mt-4">
        <span aria-hidden className="mx-auto mb-3 block h-px w-12 bg-gold" />
        <Reference citation={citation} centered />
      </figcaption>
    </figure>
  )
}

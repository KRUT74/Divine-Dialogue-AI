"use client"

import { Mic } from "lucide-react"
import type { VoiceStatus } from "../lib/voice/useVoiceConversation"

const LABELS: Record<Exclude<VoiceStatus, "idle">, string> = {
  connecting: "Opening the microphone",
  listening: "Listening",
  thinking: "Reflecting",
  speaking: "Speaking · talk to interrupt",
}

// Relative heights of the meter bars, so it reads like a small waveform.
const BARS = [0.45, 0.75, 1, 0.75, 0.45]

/** Replaces the message box during a hands-free voice conversation. */
export function VoiceBar({
  status,
  partial,
  hint,
  level,
  onStop,
}: {
  status: VoiceStatus
  partial: string
  /** Shown instead of the transcript, e.g. when no sound is reaching the microphone. */
  hint: string | null
  /** Microphone input level, 0 to 1. */
  level: number
  onStop: () => void
}) {
  if (status === "idle") return null
  const listening = status === "listening"
  return (
    <div
      role="group"
      aria-label="Voice conversation"
      className="flex items-center gap-4 rounded-3xl border border-(--accent)/40 bg-raised p-3 pl-4 shadow-sm"
    >
      <div aria-hidden className="relative flex size-12 shrink-0 items-center justify-center">
        {status !== "connecting" && <span className="breathe absolute inset-0 rounded-full bg-(--accent)" />}
        <span className="relative flex size-10 items-center justify-center rounded-full bg-(--accent) text-paper">
          <Mic className="size-5" />
        </span>
      </div>

      <div className="min-w-0 flex-1" aria-live="polite">
        <p className="small-caps text-sm text-(--accent)">{LABELS[status]}</p>
        {hint && !partial ? (
          <p className="text-sm text-danger">{hint}</p>
        ) : (
          <p className="truncate font-serif text-lg text-ink">
            {partial || (listening ? <span className="text-muted italic">Go ahead, I&apos;m listening.</span> : " ")}
          </p>
        )}
      </div>

      {listening && (
        <div
          role="meter"
          aria-label="Microphone level"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(level * 100)}
          className="hidden h-8 shrink-0 items-center gap-0.5 sm:flex"
        >
          {BARS.map((scale, i) => (
            <span
              key={i}
              className="w-1 rounded-full bg-(--accent) transition-[height] duration-100 motion-reduce:transition-none"
              style={{ height: `${Math.max(12, Math.min(100, level * scale * 140))}%`, opacity: level > 0.02 ? 1 : 0.35 }}
            />
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onStop}
        className="shrink-0 rounded-full border border-line px-4 py-2 text-sm text-ink hover:border-(--accent)"
      >
        End
      </button>
    </div>
  )
}

"use client"

import { Mic } from "lucide-react"
import type { VoiceStatus } from "../lib/voice/useVoiceConversation"

const LABELS: Record<Exclude<VoiceStatus, "idle">, string> = {
  connecting: "Starting the microphone…",
  listening: "Listening…",
  thinking: "The guide is thinking…",
  speaking: "Speaking… talk to interrupt",
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
    <div role="group" aria-label="Voice conversation" className="flex items-center gap-4 border-t border-slate-700 p-4">
      <div
        aria-hidden
        className={`flex size-11 shrink-0 items-center justify-center rounded-full bg-(--primary) ring-1 ring-(--accent) ${
          status === "speaking" || status === "thinking" ? "animate-pulse motion-reduce:animate-none" : ""
        }`}
      >
        <Mic className="size-5 text-(--accent)" />
      </div>

      <div className="min-w-0 flex-1" aria-live="polite">
        <p className="text-xs tracking-wide text-(--accent) uppercase">{LABELS[status]}</p>
        {hint && !partial ? (
          <p className="text-sm text-amber-200">{hint}</p>
        ) : (
          <p className="truncate text-sm text-slate-200">{partial || (listening ? "Go ahead, I'm listening." : " ")}</p>
        )}
      </div>

      {listening && (
        <div
          role="meter"
          aria-label="Microphone level"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(level * 100)}
          className="flex h-8 shrink-0 items-center gap-0.5"
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
        className="shrink-0 rounded-full border border-slate-600 px-4 py-2 text-sm hover:border-(--accent)"
      >
        End <span className="hidden text-xs text-slate-400 sm:inline">esc</span>
      </button>
    </div>
  )
}

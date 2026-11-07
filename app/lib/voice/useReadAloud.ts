"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { Language } from "@/lib/faiths"
import { SpeechQueue } from "./speechQueue"

export type ReadAloudStatus = "idle" | "loading" | "speaking"

/** Reads a finished piece of text aloud in the guide's voice. */
export function useReadAloud() {
  const [status, setStatus] = useState<ReadAloudStatus>("idle")
  const [error, setError] = useState<string | null>(null)
  const queueRef = useRef<SpeechQueue | null>(null)

  const queue = useCallback(() => {
    queueRef.current ??= new SpeechQueue({
      onSpeakingStart: () => setStatus("speaking"),
      onIdle: () => setStatus("idle"),
      onError: (err) => {
        setStatus("idle")
        setError(err.message)
      },
    })
    return queueRef.current
  }, [])

  const stop = useCallback(() => {
    queueRef.current?.stop()
    setStatus("idle")
  }, [])

  /** Call from a tap, so the browser allows playback that starts later. */
  const unlock = useCallback(() => queue().unlock(), [queue])

  const read = useCallback(
    (text: string, language: Language) => {
      const speech = queue()
      speech.stop()
      setError(null)
      setStatus("loading")
      speech.language = language
      speech.push(`${text} `)
      speech.flush()
    },
    [queue],
  )

  useEffect(() => {
    const onVisibility = () => document.hidden && stop()
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      document.removeEventListener("visibilitychange", onVisibility)
      stop()
    }
  }, [stop])

  return { status, error, unlock, read, stop }
}

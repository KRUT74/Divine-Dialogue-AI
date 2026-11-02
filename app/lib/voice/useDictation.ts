"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { CommitStrategy, RealtimeEvents, Scribe, type RealtimeConnection } from "@elevenlabs/client"
import { LANGUAGE_CODES, type Language } from "@/lib/faiths"
import { microphoneErrorMessage } from "./useVoiceConversation"

// A short pause ends the search; it's a phrase, not a conversation turn.
const END_OF_PHRASE_SILENCE_SECS = 0.8
// Stop listening if nothing has been said by then.
const GIVE_UP_MS = 12_000

export type DictationStatus = "idle" | "connecting" | "listening"

/**
 * One spoken phrase, for a search box: Scribe listens until you pause, shows the
 * words as you speak, then hands over the finished phrase and closes the microphone.
 */
export function useDictation({ language, onPhrase }: { language: Language; onPhrase: (text: string) => void }) {
  const [status, setStatus] = useState<DictationStatus>("idle")
  const [partial, setPartial] = useState("")
  const [error, setError] = useState<string | null>(null)
  const connectionRef = useRef<RealtimeConnection | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onPhraseRef = useRef(onPhrase)
  useEffect(() => {
    onPhraseRef.current = onPhrase
  }, [onPhrase])

  const stop = useCallback((message?: string) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
    const connection = connectionRef.current
    connectionRef.current = null
    connection?.close()
    setStatus("idle")
    setPartial("")
    if (message) setError(message)
  }, [])

  const start = useCallback(async () => {
    if (connectionRef.current) return
    setError(null)
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia || typeof AudioWorkletNode === "undefined") {
      setError("This browser can't use the microphone here. You can type instead.")
      return
    }
    setStatus("connecting")

    // Ask for the microphone ourselves first, so a refusal gets a clear message.
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((track) => track.stop())
    } catch (err) {
      stop(microphoneErrorMessage(err))
      return
    }

    const res = await fetch("/api/voice/token?for=search", { cache: "no-store" }).catch(() => null)
    const data = await res?.json().catch(() => ({}))
    if (!res?.ok) {
      stop(data?.error || "Voice search is unavailable right now. You can type instead.")
      return
    }

    const connection = Scribe.connect({
      token: data.token,
      modelId: data.modelId,
      commitStrategy: CommitStrategy.VAD,
      languageCode: LANGUAGE_CODES[language],
      vadSilenceThresholdSecs: END_OF_PHRASE_SILENCE_SECS,
      microphone: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    })
    connectionRef.current = connection
    timerRef.current = setTimeout(() => stop("I didn't hear anything. Tap the microphone and try again."), GIVE_UP_MS)

    connection.on(RealtimeEvents.SESSION_STARTED, () => {
      if (connectionRef.current === connection) setStatus("listening")
    })
    connection.on(RealtimeEvents.PARTIAL_TRANSCRIPT, (message) => {
      if (connectionRef.current === connection) setPartial(message.text ?? "")
    })
    connection.on(RealtimeEvents.COMMITTED_TRANSCRIPT, (message) => {
      const text = (message.text ?? "").trim()
      if (connectionRef.current !== connection || !text) return
      stop()
      onPhraseRef.current(text)
    })
    const fail = () => connectionRef.current === connection && stop("Voice search had a problem. Tap the microphone to try again.")
    connection.on(RealtimeEvents.AUTH_ERROR, fail)
    connection.on(RealtimeEvents.QUOTA_EXCEEDED, fail)
    connection.on(RealtimeEvents.ERROR, (message) => {
      console.error("Dictation error", message)
      fail()
    })
    connection.on(RealtimeEvents.CLOSE, () => {
      if (connectionRef.current === connection) stop()
    })
  }, [language, stop])

  // Release the microphone if the component goes away while listening.
  useEffect(() => () => stop(), [stop])

  return { status, partial, error, clearError: () => setError(null), start, stop }
}

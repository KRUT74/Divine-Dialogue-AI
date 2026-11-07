import type { Language } from "@/lib/faiths"

// Turns a streamed reply into speech: text is cut into sentences as it arrives,
// each sentence is synthesised by /api/voice/speak as soon as it is complete, and
// the audio plays back in order. Speaking can start before the reply has finished.

// A sentence ends at . ! ? or … followed by optional closing quotes/brackets and whitespace.
const SENTENCE_END = /[.!?…]+["')\]]*\s+/g
// Very short sentences ("Oh no.") are merged with the next so we make fewer requests.
const MIN_CHUNK = 40
// The most /api/voice/speak accepts at once.
const MAX_CHUNK = 600
// Chunks synthesised ahead of the one playing. Enough to keep speech smooth; the rest
// wait, so a long text doesn't hit the provider all at once or get paid for if stopped.
const LOOKAHEAD = 2

// A tiny silent WAV, played inside the user's click to unlock audio in Safari.
const SILENCE =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA="

/** Splits text over MAX_CHUNK, preferring a clause break, then a word break. */
function splitLong(text: string): string[] {
  const chunks: string[] = []
  let rest = text.trim()
  while (rest.length > MAX_CHUNK) {
    const head = rest.slice(0, MAX_CHUNK)
    const clause = Math.max(...[", ", "; ", ": ", "— "].map((mark) => head.lastIndexOf(mark)))
    const cut = clause > MAX_CHUNK / 3 ? clause + 1 : head.lastIndexOf(" ") > 0 ? head.lastIndexOf(" ") : MAX_CHUNK
    chunks.push(rest.slice(0, cut).trim())
    rest = rest.slice(cut).trim()
  }
  if (rest) chunks.push(rest)
  return chunks
}

export class SpeechQueue {
  private buffer = ""
  private waiting: string[] = []
  private pending: Promise<Blob | null>[] = []
  private playing = false
  private controller = new AbortController()
  private audio: HTMLAudioElement | null = null
  private finishPlayback: (() => void) | null = null
  // True once the whole reply has arrived; only then can the queue go idle.
  private replyComplete = false

  /** The language the reply is spoken in. */
  language: Language = "english"

  constructor(
    private readonly events: {
      onSpeakingStart: () => void
      onIdle: () => void
      onError: (error: Error) => void
    },
  ) {}

  /** Must be called from a click/tap handler so later playback is allowed. */
  unlock() {
    this.audio ??= new Audio()
    this.audio.src = SILENCE
    void this.audio.play().catch(() => {})
  }

  /** Adds streamed reply text; complete sentences are sent for synthesis right away. */
  push(text: string) {
    this.replyComplete = false
    this.buffer += text
    let lastEnd = 0
    for (const match of this.buffer.matchAll(SENTENCE_END)) {
      const end = match.index + match[0].length
      if (end - lastEnd >= MIN_CHUNK) {
        this.enqueue(this.buffer.slice(lastEnd, end))
        lastEnd = end
      }
    }
    this.buffer = this.buffer.slice(lastEnd)
  }

  /** The reply has finished streaming: speak whatever is left. */
  flush() {
    this.replyComplete = true
    if (this.buffer.trim()) this.enqueue(this.buffer)
    this.buffer = ""
    if (!this.playing && this.pending.length === 0) this.events.onIdle()
  }

  /** Stops speaking immediately and discards everything queued (barge-in, end). */
  stop() {
    this.controller.abort()
    this.controller = new AbortController()
    this.pending = []
    this.waiting = []
    this.buffer = ""
    this.replyComplete = false
    this.audio?.pause()
    this.finishPlayback?.()
    this.playing = false
  }

  private enqueue(text: string) {
    this.waiting.push(...splitLong(text))
    this.fetchAhead()
    void this.pump(this.controller.signal)
  }

  private fetchAhead() {
    const signal = this.controller.signal
    while (this.pending.length < LOOKAHEAD && this.waiting.length > 0) {
      const request = fetch("/api/voice/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: this.waiting.shift(), language: this.language }),
        signal,
      }).then(async (res) => {
        if (res.status === 204) return null
        if (!res.ok) {
          const data = await res.json().catch(() => null)
          throw new Error(data?.error || "Couldn't play the spoken reply.")
        }
        return res.blob()
      })
      // Avoid unhandled rejections for requests aborted by stop().
      request.catch(() => {})
      this.pending.push(request)
    }
  }

  private async pump(signal: AbortSignal) {
    if (this.playing) return
    this.playing = true
    try {
      while (this.pending.length > 0 && !signal.aborted) {
        const next = this.pending.shift()!
        this.fetchAhead()
        const blob = await next
        if (!blob || signal.aborted) continue
        await this.play(blob, signal)
      }
    } catch (error) {
      if (!signal.aborted) {
        this.stop()
        this.events.onError(error instanceof Error ? error : new Error(String(error)))
        return
      }
    }
    if (signal.aborted) return
    this.playing = false
    if (this.replyComplete && this.pending.length === 0) this.events.onIdle()
  }

  private play(blob: Blob, signal: AbortSignal): Promise<void> {
    const audio = (this.audio ??= new Audio())
    const url = URL.createObjectURL(blob)
    return new Promise<void>((resolve) => {
      const done = () => {
        URL.revokeObjectURL(url)
        audio.onended = audio.onerror = null
        this.finishPlayback = null
        resolve()
      }
      this.finishPlayback = done
      audio.onended = done
      audio.onerror = done
      audio.src = url
      if (signal.aborted) return done()
      this.events.onSpeakingStart()
      audio.play().catch(done)
    })
  }
}

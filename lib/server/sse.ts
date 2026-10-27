import "server-only"

/** Streams JSON events to the browser as server-sent events. */
export function eventStream<E>(run: (send: (event: E) => void) => Promise<void>): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: E) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      try {
        await run(send)
      } finally {
        controller.close()
      }
    },
  })
  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform" },
  })
}

"use client"

import { useEffect, useState } from "react"
import type { Blessing } from "@/lib/schemas"
import { fetchBlessing } from "../lib/api"
import { useAppState } from "../lib/state"
import { ErrorMessage, Loading, Quote, SaveButton, Section } from "./ui"

type Status = { state: "loading" } | { state: "error"; message: string } | { state: "ready"; blessing: Blessing }

export function DailyBlessing() {
  const { faith, language, saveItem } = useAppState()
  const [status, setStatus] = useState<Status>({ state: "loading" })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset while the new blessing loads
    setStatus({ state: "loading" })
    fetchBlessing(faith, language, controller.signal)
      .then((blessing) => setStatus({ state: "ready", blessing }))
      .catch((error: Error) => {
        if (!controller.signal.aborted) setStatus({ state: "error", message: error.message })
      })
    return () => controller.abort()
  }, [faith, language, attempt])

  return (
    <Section title="Today's Blessing" eyebrow="A passage for the day">
      {status.state === "loading" && <Loading label="Loading today's blessing" />}
      {status.state === "error" && <ErrorMessage message={status.message} onRetry={() => setAttempt((n) => n + 1)} />}
      {status.state === "ready" && (
        <div className="text-center">
          <p className="small-caps mb-8 text-base text-(--accent)">{status.blessing.theme}</p>
          <Quote citation={status.blessing.passage} />
          <p className="drop-cap mx-auto mt-10 max-w-xl text-left font-serif text-xl leading-relaxed text-ink/90">
            {status.blessing.reflection}
          </p>
          <SaveButton
            key={status.blessing.passage.reference}
            onSave={() =>
              saveItem({
                faith,
                type: "blessing",
                title: status.blessing.theme,
                content: `“${status.blessing.passage.text}”\n— ${status.blessing.passage.reference} (${status.blessing.passage.translation})\n\n${status.blessing.reflection}`,
              })
            }
          />
        </div>
      )}
    </Section>
  )
}

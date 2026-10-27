"use client"

import { Sun } from "lucide-react"
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
    <Section icon={Sun} title="Today's Blessing">
      {status.state === "loading" && <Loading label="Loading today's blessing" />}
      {status.state === "error" && <ErrorMessage message={status.message} onRetry={() => setAttempt((n) => n + 1)} />}
      {status.state === "ready" && (
        <div>
          <p className="mb-3 text-sm tracking-wide text-slate-400 uppercase">{status.blessing.theme}</p>
          <Quote citation={status.blessing.passage} large />
          <p className="mt-4 text-slate-300">{status.blessing.reflection}</p>
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

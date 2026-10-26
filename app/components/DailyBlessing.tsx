"use client"

import { Sun } from "lucide-react"
import { useEffect, useState } from "react"
import { FAITH_INFO } from "@/lib/faiths"
import type { Blessing } from "@/lib/schemas"
import { fetchBlessing } from "../lib/api"
import { useAppState } from "../lib/state"
import { ErrorMessage, Loading, SaveButton, Section } from "./ui"

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

  const info = FAITH_INFO[faith]

  return (
    <Section icon={Sun} title="Daily Blessing">
      {status.state === "loading" && <Loading label="Loading today's blessing" />}
      {status.state === "error" && <ErrorMessage message={status.message} onRetry={() => setAttempt((n) => n + 1)} />}
      {status.state === "ready" && (
        <div className="flex items-start gap-6">
          <div className="flex-1">
            <p className="mb-2 text-sm text-slate-400">{status.blessing.theme}</p>
            <blockquote className="mb-3 font-serif text-xl leading-relaxed text-white">
              “{status.blessing.quote}”
            </blockquote>
            <p className="mb-4 font-serif text-base text-slate-300 italic">— {status.blessing.source}</p>
            <p className="text-slate-300">{status.blessing.reflection}</p>
            <SaveButton
              key={status.blessing.quote}
              onSave={() =>
                saveItem({
                  faith,
                  type: "blessing",
                  title: status.blessing.theme,
                  content: `“${status.blessing.quote}”\n— ${status.blessing.source}\n\n${status.blessing.reflection}`,
                })
              }
            />
          </div>
          <div
            aria-hidden
            className="hidden size-20 items-center justify-center rounded-full bg-(--primary) text-4xl text-(--accent) md:flex"
          >
            {info.symbol}
          </div>
        </div>
      )}
    </Section>
  )
}

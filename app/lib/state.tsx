"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { isFaith, isLanguage, type Faith, type Language } from "@/lib/faiths"
import type { Usage } from "@/lib/schemas"
import { fetchUsage } from "./api"

export type SavedItem = {
  id: string
  faith: Faith
  type: "blessing" | "answer" | "scripture"
  title: string
  content: string
  savedAt: string
}

type AppState = {
  faith: Faith
  language: Language
  setFaith: (faith: Faith) => void
  setLanguage: (language: Language) => void
  savedItems: SavedItem[]
  saveItem: (item: Omit<SavedItem, "id" | "savedAt">) => void
  removeItem: (id: string) => void
  /** Today's free allowance, or null until loaded (or if it couldn't be). */
  usage: Usage | null
  refreshUsage: () => void
}

const AppStateContext = createContext<AppState | null>(null)

const STORAGE_KEY = "divine-dialogue"

type Stored = { faith?: unknown; language?: unknown; savedItems?: unknown }

function readStored(): Stored {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Stored
  } catch {
    return {}
  }
}

/** Keeps the chosen tradition, language and saved items in this browser only. */
export function AppStateProvider({ children }: { children: ReactNode }) {
  const [faith, setFaith] = useState<Faith>("buddhism")
  const [language, setLanguage] = useState<Language>("english")
  const [savedItems, setSavedItems] = useState<SavedItem[]>([])
  const [loaded, setLoaded] = useState(false)
  const [usage, setUsage] = useState<Usage | null>(null)

  const refreshUsage = useCallback(() => {
    void fetchUsage().then(setUsage)
  }, [])

  useEffect(refreshUsage, [refreshUsage])

  useEffect(() => {
    const stored = readStored()
    /* eslint-disable react-hooks/set-state-in-effect -- browser storage is only readable after hydration */
    if (isFaith(stored.faith)) setFaith(stored.faith)
    if (isLanguage(stored.language)) setLanguage(stored.language)
    if (Array.isArray(stored.savedItems)) setSavedItems(stored.savedItems as SavedItem[])
    setLoaded(true)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [])

  useEffect(() => {
    // Writing before the first read would overwrite what was stored.
    if (!loaded) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ faith, language, savedItems }))
    } catch {
      // Storage can be unavailable (private browsing); the app still works without it.
    }
  }, [loaded, faith, language, savedItems])

  const saveItem = useCallback((item: Omit<SavedItem, "id" | "savedAt">) => {
    setSavedItems((items) => [{ ...item, id: crypto.randomUUID(), savedAt: new Date().toISOString() }, ...items])
  }, [])

  const removeItem = useCallback((id: string) => {
    setSavedItems((items) => items.filter((item) => item.id !== id))
  }, [])

  const value = useMemo(
    () => ({ faith, language, setFaith, setLanguage, savedItems, saveItem, removeItem, usage, refreshUsage }),
    [faith, language, savedItems, saveItem, removeItem, usage, refreshUsage],
  )

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

export function useAppState(): AppState {
  const state = useContext(AppStateContext)
  if (!state) throw new Error("useAppState must be used inside AppStateProvider")
  return state
}

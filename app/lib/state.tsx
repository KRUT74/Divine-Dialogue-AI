"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { isFaith, isLanguage, type Faith, type Language } from "@/lib/faiths"
import { SavedItemSchema, type AccountInfo, type SavedItem, type Usage } from "@/lib/schemas"
import { deleteSaved, fetchMe, fetchSaved, postSaved, signOut as postSignOut } from "./api"

export type { SavedItem }

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
  /** The signed-in account, null for a guest, undefined while loading. */
  account: AccountInfo | undefined
  /** Call after a successful sign-in with the account's saved items from the server. */
  signedIn: (account: NonNullable<AccountInfo>, savedItems: SavedItem[]) => void
  signOut: () => Promise<void>
  /** The Plus panel, which can be opened from anywhere (header, allowance line, limit messages). */
  plusOpen: boolean
  setPlusOpen: (open: boolean) => void
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

/** Saved items from older versions or a damaged store are dropped rather than breaking the page. */
function validItems(value: unknown): SavedItem[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    const parsed = SavedItemSchema.safeParse(item)
    return parsed.success ? [parsed.data] : []
  })
}

/**
 * Keeps the chosen tradition and language in this browser. Saved items live in the
 * browser for guests and on the server for signed-in accounts, so they follow you.
 */
export function AppStateProvider({ children }: { children: ReactNode }) {
  const [faith, setFaith] = useState<Faith>("buddhism")
  const [language, setLanguage] = useState<Language>("english")
  const [savedItems, setSavedItems] = useState<SavedItem[]>([])
  const [loaded, setLoaded] = useState(false)
  const [usage, setUsage] = useState<Usage | null>(null)
  const [account, setAccount] = useState<AccountInfo | undefined>(undefined)
  const [plusOpen, setPlusOpen] = useState(false)

  const refreshUsage = useCallback(() => {
    void fetchMe().then((me) => me && setUsage(me.usage))
  }, [])

  useEffect(() => {
    const stored = readStored()
    /* eslint-disable react-hooks/set-state-in-effect -- browser storage is only readable after hydration */
    if (isFaith(stored.faith)) setFaith(stored.faith)
    if (isLanguage(stored.language)) setLanguage(stored.language)
    const localItems = validItems(stored.savedItems)
    setSavedItems(localItems)
    setLoaded(true)
    /* eslint-enable react-hooks/set-state-in-effect */

    void fetchMe().then(async (me) => {
      if (!me) return setAccount(null)
      setUsage(me.usage)
      setAccount(me.account)
      if (me.account) {
        const items = await fetchSaved()
        if (items) setSavedItems(items)
      }
    })
  }, [])

  useEffect(() => {
    // Writing before the first read would overwrite what was stored.
    if (!loaded) return
    try {
      // A signed-in account's items live on the server, not in this browser.
      const local = account ? [] : savedItems
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ faith, language, savedItems: local }))
    } catch {
      // Storage can be unavailable (private browsing); the app still works without it.
    }
  }, [loaded, faith, language, savedItems, account])

  const saveItem = useCallback(
    (item: Omit<SavedItem, "id" | "savedAt">) => {
      const saved = { ...item, id: crypto.randomUUID(), savedAt: new Date().toISOString() }
      setSavedItems((items) => [saved, ...items])
      if (account) void postSaved(saved)
    },
    [account],
  )

  const removeItem = useCallback(
    (id: string) => {
      setSavedItems((items) => items.filter((item) => item.id !== id))
      if (account) void deleteSaved(id)
    },
    [account],
  )

  const signedIn = useCallback(
    (next: NonNullable<AccountInfo>, items: SavedItem[]) => {
      setAccount(next)
      setSavedItems(items)
      refreshUsage()
    },
    [refreshUsage],
  )

  const signOut = useCallback(async () => {
    await postSignOut()
    setAccount(null)
    setSavedItems([])
    refreshUsage()
  }, [refreshUsage])

  const value = useMemo(
    () => ({
      faith,
      language,
      setFaith,
      setLanguage,
      savedItems,
      saveItem,
      removeItem,
      usage,
      refreshUsage,
      account,
      signedIn,
      signOut,
      plusOpen,
      setPlusOpen,
    }),
    [faith, language, savedItems, saveItem, removeItem, usage, refreshUsage, account, signedIn, signOut, plusOpen],
  )

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

export function useAppState(): AppState {
  const state = useContext(AppStateContext)
  if (!state) throw new Error("useAppState must be used inside AppStateProvider")
  return state
}

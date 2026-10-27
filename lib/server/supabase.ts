import "server-only"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

let client: SupabaseClient | null = null

/** True when Supabase is set up. Without it, limits only work in development (switched off). */
export const supabaseConfigured = () => Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY)

// Server-side client using the secret key. The table has row-level security on and
// no policies, so this is the only way in.
export function supabase(): SupabaseClient {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY must be set. See .env.example.")
  client ??= createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  return client
}

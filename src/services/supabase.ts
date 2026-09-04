import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://xusudxzoiqcfqxvuerhy.supabase.co'
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_tO1qN0s9xsuXRqvXajDlCA_8agZ3Y8v'

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('your-project-ref') &&
  !supabaseAnonKey.includes('your-anon-key') &&
  !supabaseUrl.includes('placeholder')
)

if (!isSupabaseConfigured) {
  console.warn(
    '[Supabase] Environment variables VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY are missing or set to defaults. Please update your .env file.'
  )
}

// Initialize Supabase client
export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
)

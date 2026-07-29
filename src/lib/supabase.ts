import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

function formatSupabaseUrl(rawUrl: string | undefined): string {
  if (!rawUrl) return ''
  let url = rawUrl.trim()
  if (!url) return ''
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`
  }
  return url
}

const rawUrl = (import.meta.env.VITE_SUPABASE_URL as string) || ''
const supabaseAnonKey = ((import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '').trim()
const supabaseUrl = formatSupabaseUrl(rawUrl)

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Missing or invalid Supabase environment variables. ' +
    'Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set correctly.'
  )
}

const validUrl = supabaseUrl || 'https://placeholder.supabase.co'
const validKey = supabaseAnonKey || 'placeholder-key'

export const supabase = createClient<Database>(validUrl, validKey)


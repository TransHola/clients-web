import { createBrowserClient } from '@supabase/ssr'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ekzbskuqpirwwojflfbq.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVremJza3VxcGlyd3dvamZsZmJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNDU2NTUsImV4cCI6MjA4NjkyMTY1NX0.1a4y-lZW8Wwr2q9BQAWBTPDFJ6BWbFl-4TK5qbAsRhY'

export function createClient() {
  return createBrowserClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      auth: {
        // @ts-ignore: Next.js / Supabase experimental flag
        experimental: {
          passkey: true
        }
      }
    }
  )
}

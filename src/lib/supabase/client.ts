import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // @ts-ignore: Next.js / Supabase experimental flag
        experimental: {
          passkeys: true
        }
      }
    }
  )
}

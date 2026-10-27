import { createBrowserClient } from '@supabase/ssr'

const DEFAULT_SUPABASE_URL = 'http://127.0.0.1:54321'
const DEFAULT_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

export function createClient() {
  const url = typeof window !== 'undefined'
    ? window.location.origin
    : (process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL)
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_ANON_KEY

  if (typeof document !== 'undefined') {
    try {
      const rawCookies = document.cookie.split(';');
      for (const c of rawCookies) {
        const cookieName = c.trim().split('=')[0];
        if (cookieName.startsWith('sb-localhost') || cookieName === 'sb-127-auth-token') {
          document.cookie = `${cookieName}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT;`;
        }
      }
    } catch {}
  }

  return createBrowserClient(
    url,
    key,
    {
      cookieOptions: {
        name: 'sb-client-session',
        path: '/',
        sameSite: 'lax'
      },
      auth: {
        // @ts-ignore: Next.js / Supabase experimental flag
        experimental: {
          passkey: true
        }
      }
    }
  )
}

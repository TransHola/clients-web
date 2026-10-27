import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

const DEFAULT_SUPABASE_URL = 'http://127.0.0.1:54321'
const DEFAULT_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

export function getInternalSupabaseUrl(): string {
    const isProd = process.env.NODE_ENV === 'production' || !!process.env.KUBERNETES_SERVICE_HOST
    let url = 
        process.env.SUPABASE_INTERNAL_URL || 
        process.env.SUPABASE_URL || 
        process.env.NEXT_PUBLIC_SUPABASE_URL || 
        DEFAULT_SUPABASE_URL

    if (isProd && (url.includes('127.0.0.1') || url.includes('localhost'))) {
        return 'http://supabase-kong:8000'
    }

    return url
}

export async function createClient() {
    const cookieStore = await cookies()
    const supabaseUrl = getInternalSupabaseUrl()
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_ANON_KEY

    return createServerClient(
        supabaseUrl,
        supabaseKey,
        {
            cookieOptions: {
                name: 'sb-client-session',
                path: '/',
                sameSite: 'lax'
            },
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch {
                        // Handled when called from Server Component
                    }
                },
            },
        }
    )
}

const DEFAULT_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx1fZTxczMWUpAeEYczHX0p_hh338b_BM0c'

export function createAdminClient() {
    const supabaseUrl = getInternalSupabaseUrl()
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || DEFAULT_SERVICE_ROLE_KEY
    return createServerClient(supabaseUrl, serviceRoleKey, {
        cookies: {
            getAll() { return [] },
            setAll() {}
        }
    })
}

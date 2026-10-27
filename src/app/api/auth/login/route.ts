import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password } = body || {}

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const normalizedEmail = email.trim().toLowerCase()

    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password: password,
    })

    if (error) {
      return NextResponse.json(
        { error: error.message || "Invalid credentials." },
        { status: 401 }
      )
    }

    if (!data?.user) {
      return NextResponse.json(
        { error: "Authentication failed. No user identity returned." },
        { status: 401 }
      )
    }

    // Role & portal isolation guard:
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, status, phone, phone_number')
      .eq('id', data.user.id)
      .maybeSingle()

    const role = (profile?.role || data.user.user_metadata?.role || '').toLowerCase()

    if (['operator', 'fleet_operator', 'driver', 'dispatcher'].includes(role)) {
      await supabase.auth.signOut()
      return NextResponse.json(
        { error: "Access Denied: This account is registered as a Fleet Operator. Please log in at the Fleet Operators portal (operator.transhola.com)." },
        { status: 403 }
      )
    }

    const allowedRoles = ['client', 'customer', 'corporate', 'government', 'superadmin', 'super_admin', 'admin', '']
    if (role && !allowedRoles.includes(role)) {
      await supabase.auth.signOut()
      return NextResponse.json(
        { error: "Access Denied: Unauthorized role for this portal." },
        { status: 403 }
      )
    }

    const userPhone = profile?.phone || profile?.phone_number || data.user.user_metadata?.phone || ''
    if (profile?.status === 'Pending Verification') {
      return NextResponse.json({
        success: true,
        redirectTo: `/verify?email=${encodeURIComponent(normalizedEmail)}&phone=${encodeURIComponent(userPhone)}`
      })
    }

    return NextResponse.json({
      success: true,
      redirectTo: '/'
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal authentication error." },
      { status: 500 }
    )
  }
}

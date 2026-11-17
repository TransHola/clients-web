import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { resolveVerifiedUserFromCookiesOrHeader } from '@/lib/auth/clientSession'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const resolved = await resolveVerifiedUserFromCookiesOrHeader(
    request.cookies.getAll(),
    request.headers.get('authorization')
  )
  if (!resolved?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const currentPassword = String(body?.currentPassword || '')
    const newPassword = String(body?.newPassword || '')

    if (!currentPassword) {
      return NextResponse.json({ error: 'Please enter your current password.' }, { status: 400 })
    }
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'New password must be at least 8 characters long.' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()
    const { data: verified } = await (adminClient as any).rpc('verify_user_credentials', {
      p_email: resolved.user.email,
      p_password: currentPassword,
    })

    if (!verified || !verified.id) {
      return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 400 })
    }

    const { data: updated, error: updErr } = await (adminClient as any).rpc(
      'update_client_password_by_email',
      {
        p_email: resolved.user.email,
        p_new_password: newPassword,
      }
    )

    if (updErr || updated?.error) {
      return NextResponse.json(
        { error: updated?.error || updErr?.message || 'Failed to update password.' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Your password has been updated securely.',
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Unexpected error updating password.' },
      { status: 500 }
    )
  }
}


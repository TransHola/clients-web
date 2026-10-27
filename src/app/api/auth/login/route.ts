import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import {
    extractClientIp,
    validateAuthInputs,
    checkLoginRateLimit,
    recordLoginFailure,
    recordLoginSuccess,
    enforceConstantTime,
    ALLOWED_CLIENT_ROLES,
    PROHIBITED_OPERATOR_ROLES,
    sanitizeAuthError
} from '@/lib/security/authGuard'

export async function POST(request: Request) {
    const startTime = Date.now()
    const clientIp = extractClientIp(request.headers)

    try {
        let body: any = {}
        try {
            body = await request.json()
        } catch {
            return NextResponse.json(
                { error: "Malformed request payload." },
                { status: 400 }
            )
        }

        const { email, password } = body || {}

        // 1. Rigorous input validation & Hash-Flooding DoS mitigation
        const validation = validateAuthInputs(email, password)
        if (!validation.isValid || !validation.normalizedEmail) {
            await enforceConstantTime(startTime, 300)
            return NextResponse.json(
                { error: validation.error || "Email and password are required." },
                { status: 400 }
            )
        }

        const normalizedEmail = validation.normalizedEmail

        // 2. Sliding-Window Adaptive Rate Limiting
        const rateLimit = checkLoginRateLimit(clientIp, normalizedEmail)
        if (!rateLimit.allowed) {
            await enforceConstantTime(startTime, 300)
            return NextResponse.json(
                { error: rateLimit.error },
                {
                    status: 429,
                    headers: { 'Retry-After': String(rateLimit.retryAfterSeconds || 60) }
                }
            )
        }

        // 3. Supabase Auth
        const supabase = await createClient()

        const { data, error } = await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password: password,
        })

        if (error) {
            recordLoginFailure(clientIp, normalizedEmail)
            await enforceConstantTime(startTime, 350)
            const safeError = sanitizeAuthError(error)
            const is503 = safeError.includes('unreachable')
            return NextResponse.json(
                { error: safeError },
                { status: is503 ? 503 : 401 }
            )
        }

        if (!data?.user) {
            recordLoginFailure(clientIp, normalizedEmail)
            await enforceConstantTime(startTime, 350)
            return NextResponse.json(
                { error: "Authentication failed. No user identity returned." },
                { status: 401 }
            )
        }

        // 4. Role & Portal Isolation Guard
        const { data: profile } = await supabase
            .from('profiles')
            .select('role, status, phone, phone_number')
            .eq('id', data.user.id)
            .maybeSingle()

        const role = (profile?.role || data.user.user_metadata?.role || '').toLowerCase().trim()
        const status = (profile?.status || '').toLowerCase().trim()

        // Block suspended or deactivated accounts
        if (status === 'suspended' || status === 'banned' || status === 'inactive') {
            await supabase.auth.signOut()
            recordLoginFailure(clientIp, normalizedEmail)
            await enforceConstantTime(startTime, 350)
            return NextResponse.json(
                { error: "Access denied. Your account has been suspended or deactivated." },
                { status: 403 }
            )
        }

        // Prohibit Fleet Operators from logging into Client Portal
        if ((PROHIBITED_OPERATOR_ROLES as readonly string[]).includes(role)) {
            await supabase.auth.signOut()
            recordLoginFailure(clientIp, normalizedEmail)
            await enforceConstantTime(startTime, 350)
            return NextResponse.json(
                { error: "Access Denied: This account is registered as a Fleet Operator. Please log in at the Fleet Operators portal (operator.transhola.com)." },
                { status: 403 }
            )
        }

        // Verify role is permitted
        if (role && !(ALLOWED_CLIENT_ROLES as readonly string[]).includes(role)) {
            await supabase.auth.signOut()
            recordLoginFailure(clientIp, normalizedEmail)
            await enforceConstantTime(startTime, 350)
            return NextResponse.json(
                { error: "Access Denied: Unauthorized role for this portal." },
                { status: 403 }
            )
        }

        // Success: Clear failed attempts
        recordLoginSuccess(clientIp, normalizedEmail)

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
        await enforceConstantTime(startTime, 300)
        return NextResponse.json(
            { error: sanitizeAuthError(err) },
            { status: 500 }
        )
    }
}

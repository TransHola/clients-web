import crypto from "crypto"

export function hashSessionFingerprint(rawToken: string): string {
    return crypto.createHash("sha256").update(rawToken).digest("hex").slice(0, 32)
}

export function extractRequestCountry(headersObj: Headers | { get(name: string): string | null }): string {
    const cfCountry = headersObj.get("cf-ipcountry")
    if (cfCountry && cfCountry !== "XX" && cfCountry !== "T1") return cfCountry.trim().toUpperCase()
    const xCountry = headersObj.get("x-vercel-ip-country") || headersObj.get("x-country-code")
    if (xCountry) return xCountry.trim().toUpperCase()
    return "Global"
}

export async function checkPortalSecurityGate(
    adminClient: any,
    params: {
        ip: string
        email: string
        portal: "clients-web" | "fleet-operators"
        userAgent?: string
        country?: string
    }
): Promise<{
    allowed: boolean
    status?: number
    retryAfterSeconds?: number
    error?: string
    policy: any
}> {
    let policy: any = {
        emergencyLockMode: false,
        maxFailedAttempts24h: 5,
        lockoutDurationMins: 30,
        sessionTtlHours: 12
    }
    try {
        const { data } = await adminClient
            .from("global_settings")
            .select("value")
            .eq("category", "security")
            .eq("key", "engine_policy")
            .maybeSingle()
        if (data?.value && typeof data.value === "object") {
            policy = { ...policy, ...data.value }
        }
    } catch {}

    try {
        const { data: blocks } = await adminClient
            .from("security_ip_blocks")
            .select("*")
            .eq("is_active", true)
            .in("portal", ["all", params.portal])

        const activeBlock = (blocks || []).find((b: any) => {
            if (b.expires_at && new Date(b.expires_at).getTime() <= Date.now()) return false
            const ipMatch = b.ip_address && b.ip_address === params.ip
            const emailMatch = b.target_email && b.target_email.toLowerCase() === params.email.toLowerCase()
            return ipMatch || emailMatch
        })

        if (activeBlock) {
            const retrySec = activeBlock.expires_at
                ? Math.max(60, Math.ceil((new Date(activeBlock.expires_at).getTime() - Date.now()) / 1000))
                : 1800
            await recordPortalAuthAttempt(adminClient, {
                email: params.email,
                portal: params.portal,
                ip: params.ip,
                userAgent: params.userAgent,
                country: params.country,
                outcome: "ip_blocked",
                blockedAutomatically: true,
                reason: `Blocked by active Security Blocklist: ${activeBlock.reason}`,
                policy,
                skipAutoBlockCheck: true
            })
            return {
                allowed: false,
                status: 403,
                retryAfterSeconds: retrySec,
                error: "Access blocked by TransHola Security Engine due to active security lockout.",
                policy
            }
        }
    } catch {}

    if (policy.emergencyLockMode) {
        await recordPortalAuthAttempt(adminClient, {
            email: params.email,
            portal: params.portal,
            ip: params.ip,
            userAgent: params.userAgent,
            country: params.country,
            outcome: "emergency_locked",
            blockedAutomatically: true,
            reason: "Sign-in blocked while Platform Emergency Lock Mode is active",
            policy,
            skipAutoBlockCheck: true
        })
        return {
            allowed: false,
            status: 423,
            error: "TransHola Emergency Security Lock Mode is currently active. Sign-ins are temporarily paused.",
            policy
        }
    }

    return { allowed: true, policy }
}

export async function recordPortalAuthAttempt(
    adminClient: any,
    params: {
        email: string
        userId?: string | null
        portal: "clients-web" | "fleet-operators"
        ip: string
        userAgent?: string
        country?: string
        outcome: string
        blockedAutomatically?: boolean
        reason: string
        policy?: any
        skipAutoBlockCheck?: boolean
    }
) {
    try {
        const policy = params.policy || { maxFailedAttempts24h: 5, lockoutDurationMins: 30 }
        let autoBlocked = Boolean(params.blockedAutomatically)

        if (params.outcome !== "success" && !params.skipAutoBlockCheck && params.ip && params.ip !== "127.0.0.1") {
            const windowStartIso = new Date(Date.now() - (policy.lockoutDurationMins || 30) * 60 * 1000).toISOString()
            const { count } = await adminClient
                .from("security_auth_attempts")
                .select("id", { count: "exact", head: true })
                .eq("ip_address", params.ip)
                .neq("outcome", "success")
                .gte("created_at", windowStartIso)

            const totalFailures = (count || 0) + 1
            if (totalFailures >= (policy.maxFailedAttempts24h || 5)) {
                autoBlocked = true
                const expiresAt = new Date(Date.now() + (policy.lockoutDurationMins || 30) * 60 * 1000).toISOString()
                const { data: existing } = await adminClient
                    .from("security_ip_blocks")
                    .select("id")
                    .eq("ip_address", params.ip)
                    .eq("is_active", true)
                    .maybeSingle()

                if (!existing?.id) {
                    await adminClient.from("security_ip_blocks").insert([
                        {
                            ip_address: params.ip,
                            target_email: params.email,
                            portal: "all",
                            reason: `Auto-blocked after ${totalFailures} failed authentication attempts within ${policy.lockoutDurationMins || 30} mins`,
                            source: "auto_guard",
                            blocked_by: "System Security Engine (Auto-Guard)",
                            is_active: true,
                            expires_at: expiresAt
                        }
                    ])
                }
            }
        }

        await adminClient.from("security_auth_attempts").insert([
            {
                email: params.email || "unknown",
                user_id: params.userId || null,
                portal: params.portal,
                ip_address: params.ip || "127.0.0.1",
                user_agent: params.userAgent || "Unknown Client",
                country: params.country || "Global",
                outcome: params.outcome,
                blocked_automatically: autoBlocked,
                reason: params.reason
            }
        ])

        const isSuccess = params.outcome === "success"
        await adminClient.from("audit_logs").insert([
            {
                user_id: params.userId || null,
                action: isSuccess ? "AUTH_SESSION_ESTABLISHED" : `AUTH_ATTEMPT_${params.outcome.toUpperCase()}`,
                actor: params.email || "anonymous",
                actor_name: params.email || "Anonymous Request",
                status: isSuccess ? "success" : "failed",
                country: params.country || "Global",
                platform: params.portal,
                entity_type: "authentication",
                entity_id: params.email || params.ip,
                ip_address: params.ip || "127.0.0.1",
                detail: params.reason,
                is_ai: false,
                details: {
                    portal: params.portal,
                    outcome: params.outcome,
                    blocked_automatically: autoBlocked,
                    ip_address: params.ip
                }
            }
        ])
    } catch {}
}

export async function registerPortalSecuritySession(
    adminClient: any,
    params: {
        sessionFingerprint: string
        userId?: string | null
        email: string
        actorName?: string | null
        role: string
        portal: "clients-web" | "fleet-operators"
        ip: string
        userAgent?: string
        country?: string
        ttlHours?: number
    }
) {
    try {
        const ttl = params.ttlHours || 12
        const now = new Date()
        const expiresAt = new Date(now.getTime() + ttl * 3600 * 1000).toISOString()
        await adminClient.from("security_sessions").upsert(
            [
                {
                    session_fingerprint: params.sessionFingerprint,
                    user_id: params.userId || null,
                    email: params.email,
                    actor_name: params.actorName || params.email,
                    role: params.role,
                    portal: params.portal,
                    ip_address: params.ip || "127.0.0.1",
                    user_agent: params.userAgent || "Browser Session",
                    country: params.country || "Global",
                    mfa_verified: true,
                    device_trusted: true,
                    status: "active",
                    last_seen_at: now.toISOString(),
                    expires_at: expiresAt,
                    revoked_at: null,
                    revoked_by: null,
                    revoke_reason: null
                }
            ],
            { onConflict: "session_fingerprint" }
        )
    } catch {}
}

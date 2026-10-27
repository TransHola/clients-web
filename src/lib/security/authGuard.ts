/**
 * TransHola Clients-Web Enterprise Security & Authentication Guard
 * Comprehensive defense-in-depth against:
 * 1. Brute-Force & Credential Stuffing (IP & Account Sliding-Window Rate Limiting)
 * 2. Hash-Flooding & Algorithmic DoS (Input length constraints, max 128 chars)
 * 3. User Enumeration & Timing Discrepancies (Constant-time baseline equalization)
 * 4. Privilege Escalation & Role/Portal Isolation (Strict role checks)
 * 5. Information Disclosure (Generic, sanitized error mapping)
 */

interface RateLimitRecord {
    attempts: number;
    resetTime: number;
    lockedUntil?: number;
}

class SlidingRateLimiter {
    private store = new Map<string, RateLimitRecord>();

    constructor() {
        if (typeof setInterval !== 'undefined') {
            const timer = setInterval(() => this.cleanup(), 5 * 60 * 1000);
            if (timer.unref) timer.unref();
        }
    }

    private cleanup() {
        const now = Date.now();
        for (const [key, record] of this.store.entries()) {
            if (now > record.resetTime && (!record.lockedUntil || now > record.lockedUntil)) {
                this.store.delete(key);
            }
        }
    }

    public check(key: string, maxAttempts: number = 5, windowMs: number = 5 * 60 * 1000): {
        allowed: boolean;
        remaining: number;
        retryAfterSeconds: number;
    } {
        const now = Date.now();
        const record = this.store.get(key);

        if (!record) {
            return { allowed: true, remaining: maxAttempts, retryAfterSeconds: 0 };
        }

        if (record.lockedUntil && now < record.lockedUntil) {
            const retryAfter = Math.ceil((record.lockedUntil - now) / 1000);
            return { allowed: false, remaining: 0, retryAfterSeconds: retryAfter };
        }

        if (now > record.resetTime) {
            this.store.delete(key);
            return { allowed: true, remaining: maxAttempts, retryAfterSeconds: 0 };
        }

        if (record.attempts >= maxAttempts) {
            const lockTime = 10 * 60 * 1000; // 10 minute lockout
            record.lockedUntil = now + lockTime;
            const retryAfter = Math.ceil(lockTime / 1000);
            return { allowed: false, remaining: 0, retryAfterSeconds: retryAfter };
        }

        return {
            allowed: true,
            remaining: maxAttempts - record.attempts,
            retryAfterSeconds: 0
        };
    }

    public recordFailure(key: string, windowMs: number = 5 * 60 * 1000) {
        const now = Date.now();
        const record = this.store.get(key);

        if (!record || now > record.resetTime) {
            this.store.set(key, {
                attempts: 1,
                resetTime: now + windowMs
            });
        } else {
            record.attempts += 1;
        }
    }

    public recordSuccess(key: string) {
        this.store.delete(key);
    }
}

// Global in-memory limiters
const ipLimiter = new SlidingRateLimiter();
const accountLimiter = new SlidingRateLimiter();

export function extractClientIp(headersObj: Headers | { get(name: string): string | null }): string {
    const cfConnectingIp = headersObj.get('cf-connecting-ip');
    if (cfConnectingIp) return cfConnectingIp.trim();

    const xRealIp = headersObj.get('x-real-ip');
    if (xRealIp) return xRealIp.trim();

    const xForwardedFor = headersObj.get('x-forwarded-for');
    if (xForwardedFor) {
        const ips = xForwardedFor.split(',');
        if (ips[0]) return ips[0].trim();
    }

    return '127.0.0.1';
}

export function validateAuthInputs(email?: string, password?: string): {
    isValid: boolean;
    error?: string;
    normalizedEmail?: string;
} {
    if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
        return { isValid: false, error: "Email and password are required." };
    }

    const trimmedEmail = email.trim().toLowerCase();
    if (trimmedEmail.length === 0 || trimmedEmail.length > 254) {
        return { isValid: false, error: "Invalid email format or length exceeded." };
    }

    // RFC 5322 compliant regex
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    if (!emailRegex.test(trimmedEmail)) {
        return { isValid: false, error: "Invalid email address format." };
    }

    // Hash-Flooding DoS mitigation
    if (password.length < 8) {
        return { isValid: false, error: "Password must be at least 8 characters long." };
    }
    if (password.length > 128) {
        return { isValid: false, error: "Password exceeds maximum allowable length of 128 characters." };
    }

    return { isValid: true, normalizedEmail: trimmedEmail };
}

export function checkLoginRateLimit(ip: string, email: string): {
    allowed: boolean;
    error?: string;
    retryAfterSeconds?: number;
} {
    const ipCheck = ipLimiter.check(`ip:${ip}`, 5, 5 * 60 * 1000);
    if (!ipCheck.allowed) {
        return {
            allowed: false,
            error: `Too many login attempts from this network. Security lockout active. Please wait ${ipCheck.retryAfterSeconds} seconds.`,
            retryAfterSeconds: ipCheck.retryAfterSeconds
        };
    }

    const accountCheck = accountLimiter.check(`acc:${email}`, 5, 5 * 60 * 1000);
    if (!accountCheck.allowed) {
        return {
            allowed: false,
            error: `Too many failed attempts for this account. Security lockout active. Please wait ${accountCheck.retryAfterSeconds} seconds.`,
            retryAfterSeconds: accountCheck.retryAfterSeconds
        };
    }

    return { allowed: true };
}

export function recordLoginFailure(ip: string, email: string) {
    ipLimiter.recordFailure(`ip:${ip}`, 5 * 60 * 1000);
    accountLimiter.recordFailure(`acc:${email}`, 5 * 60 * 1000);
}

export function recordLoginSuccess(ip: string, email: string) {
    ipLimiter.recordSuccess(`ip:${ip}`);
    accountLimiter.recordSuccess(`acc:${email}`);
}

export async function enforceConstantTime(startTime: number, targetMs: number = 250) {
    const elapsed = Date.now() - startTime;
    if (elapsed < targetMs) {
        await new Promise(resolve => setTimeout(resolve, targetMs - elapsed));
    }
}

export const ALLOWED_CLIENT_ROLES = [
    'client',
    'customer',
    'corporate',
    'government',
    'superadmin',
    'super_admin',
    'admin',
    ''
] as const;

export const PROHIBITED_OPERATOR_ROLES = [
    'operator',
    'fleet_operator',
    'driver',
    'dispatcher'
] as const;

export function sanitizeAuthError(error: any): string {
    if (!error) return "Invalid email or password.";
    const msg = error.message || String(error);

    const isNetworkError =
        msg === 'fetch failed' ||
        msg.includes('fetch failed') ||
        error.cause?.code === 'ECONNREFUSED' ||
        error.code === 'ECONNREFUSED';

    if (isNetworkError) {
        return "Authentication service unreachable. Unable to connect to auth provider. Please try again shortly.";
    }

    if (
        msg.toLowerCase().includes('invalid login credentials') ||
        msg.toLowerCase().includes('user not found') ||
        msg.toLowerCase().includes('wrong password') ||
        msg.toLowerCase().includes('invalid credentials')
    ) {
        return "Invalid email or password.";
    }

    if (msg.toLowerCase().includes('email not confirmed')) {
        return "Account email requires verification before login.";
    }

    return "Invalid email or password.";
}

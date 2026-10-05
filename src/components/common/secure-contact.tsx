"use client"

import * as React from "react"
import { Mail, Phone, Lock, Eye, Check, Copy, Loader2 } from "lucide-react"

export function maskEmail(email?: string | null): string {
    if (!email || !email.trim()) return "No email on file"
    const cleaned = email.trim()
    const parts = cleaned.split('@')
    if (parts.length === 2) {
        const user = parts[0]
        const domain = parts[1]
        const prefix = user.slice(0, 2)
        return `${prefix}${"•".repeat(Math.max(4, user.length - 2))}@${domain}`
    }
    return "••••••••@••••.com"
}

export function maskPhone(phone?: string | null): string {
    if (!phone || !phone.trim()) return "No phone on file"
    const cleaned = phone.trim()
    if (cleaned.startsWith('+')) {
        const spaceIdx = cleaned.indexOf(' ')
        if (spaceIdx > 0) {
            const prefix = cleaned.slice(0, spaceIdx)
            return `${prefix} •• ••• ••••`
        }
    }
    return "+••• •• ••• ••••"
}

interface SecureContactProps {
    type: 'email' | 'phone'
    value?: string | null
    label?: string
    variant?: 'inline' | 'icon' | 'badge'
    className?: string
}

export function SecureContact({
    type,
    value,
    label,
    variant = 'inline',
    className = ""
}: SecureContactProps) {
    const [isRevealed, setIsRevealed] = React.useState(false)
    const [isCopied, setIsCopied] = React.useState(false)

    if (!value || !value.trim()) {
        return <span className={`text-xs text-muted-foreground ${className}`}>No {type} on file</span>
    }

    const masked = type === 'email' ? maskEmail(value) : maskPhone(value)

    const handleReveal = (e: React.MouseEvent) => {
        e.stopPropagation()
        e.preventDefault()
        setIsRevealed(true)
    }

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation()
        e.preventDefault()
        navigator.clipboard.writeText(value).then(() => {
            setIsCopied(true)
            setTimeout(() => setIsCopied(false), 2000)
        })
    }

    if (variant === 'icon') {
        return (
            <button
                type="button"
                onClick={isRevealed ? undefined : handleReveal}
                className={`h-8 w-8 rounded-full border border-border/80 flex items-center justify-center hover:bg-primary/10 transition-colors ${
                    isRevealed ? "text-primary bg-primary/5" : "text-muted-foreground"
                } ${className}`}
                title={isRevealed ? value : `Click to access ${type}`}
            >
                {type === 'email' ? <Mail className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
            </button>
        )
    }

    if (isRevealed) {
        return (
            <span className={`inline-flex items-center gap-1.5 text-xs font-mono font-medium ${className}`}>
                {type === 'email' ? (
                    <a href={`mailto:${value}`} className="hover:underline text-primary flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {value}
                    </a>
                ) : (
                    <a href={`tel:${value.replace(/\s/g, '')}`} className="hover:underline text-emerald-600 flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {value}
                    </a>
                )}
                <button type="button" onClick={handleCopy} className="p-0.5 text-muted-foreground hover:text-foreground">
                    {isCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                </button>
            </span>
        )
    }

    return (
        <button
            type="button"
            onClick={handleReveal}
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-border/70 bg-muted/40 hover:bg-primary/5 hover:border-primary/40 text-xs font-mono text-muted-foreground hover:text-foreground transition-all ${className}`}
            title="Protected information: Click to reveal contact"
        >
            <Lock className="w-2.5 h-2.5 text-amber-500" />
            <span>{masked}</span>
            <Eye className="w-2.5 h-2.5 text-muted-foreground ml-0.5" />
        </button>
    )
}

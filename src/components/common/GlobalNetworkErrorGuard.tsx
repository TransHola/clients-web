"use client"

import React, { useEffect, Component, ReactNode } from "react"

// Centralized Telemetry Error Sender
export function logSystemError(errorType: string, message: string, stack?: string) {
    if (typeof window === "undefined") return

    const payload = {
        timestamp: new Date().toISOString(),
        error_type: errorType,
        message: message || "Unknown Runtime Failure",
        stack: stack || null,
        url: window.location.href,
        user_agent: navigator.userAgent
    }

    // 1. Console structured warning
    console.warn(`🛡️ [PROACTIVE WATCHDOG LOGGED]:`, payload)

    // 2. Buffer in LocalStorage for offline diagnostic auditing
    try {
        const historyRaw = localStorage.getItem("sys_watchdog_error_logs")
        const history = historyRaw ? JSON.parse(historyRaw) : []
        history.unshift(payload)
        localStorage.setItem("sys_watchdog_error_logs", JSON.stringify(history.slice(0, 50)))
    } catch (e) {
        /* Ignore storage quota errors */
    }

    // 3. Send beacon to telemetry API route
    try {
        if (navigator.sendBeacon) {
            const blob = new Blob([JSON.stringify(payload)], { type: "application/json" })
            navigator.sendBeacon("/api/telemetry/log-error", blob)
        } else {
            fetch("/api/telemetry/log-error", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
                keepalive: true
            }).catch(() => {})
        }
    } catch (e) {
        /* Prevent telemetry failures from interrupting client */
    }
}

export function GlobalNetworkErrorGuard() {
    useEffect(() => {
        if (typeof window === "undefined") return

        const isFetchError = (target: any): boolean => {
            if (!target) return false
            const msg = String(target?.message || target?.reason || target || "").toLowerCase()
            const name = String(target?.name || "").toLowerCase()
            const stack = String(target?.stack || "").toLowerCase()

            return (
                msg.includes("failed to fetch") ||
                msg.includes("fetch failed") ||
                msg.includes("networkerror") ||
                msg.includes("load failed") ||
                msg.includes("network error") ||
                (name.includes("typeerror") && (msg.includes("fetch") || stack.includes("fetch")))
            )
        }

        const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
            const reason = event.reason
            const msg = String(reason?.message || reason || "Unhandled Promise Rejection")
            const stack = String(reason?.stack || "")

            if (isFetchError(reason)) {
                console.warn("🛡️ [NETWORK GUARD INTERCEPTED]: Client fetch network glitch handled gracefully.")
                logSystemError("NETWORK_FETCH_ERROR", msg, stack)
                event.preventDefault()
            } else {
                logSystemError("UNHANDLED_PROMISE_REJECTION", msg, stack)
            }
        }

        const handleError = (event: ErrorEvent) => {
            const err = event.error || event.message
            const msg = String(event.message || err?.message || "Window Runtime Error")
            const stack = String(err?.stack || "")

            if (isFetchError(err) || isFetchError(event.message)) {
                console.warn("🛡️ [NETWORK GUARD INTERCEPTED]: Window error handled gracefully.")
                logSystemError("NETWORK_WINDOW_ERROR", msg, stack)
                event.preventDefault()
            } else {
                logSystemError("WINDOW_RUNTIME_ERROR", msg, stack)
            }
        }

        window.addEventListener("unhandledrejection", handleUnhandledRejection)
        window.addEventListener("error", handleError)

        return () => {
            window.removeEventListener("unhandledrejection", handleUnhandledRejection)
            window.removeEventListener("error", handleError)
        }
    }, [])

    return null
}

interface ErrorBoundaryProps {
    children: ReactNode
    fallbackTitle?: string
}

interface ErrorBoundaryState {
    hasError: boolean
    errorMessage?: string
}

// 🛡️ Proactive Auto-Recovery React Error Boundary
export class ProactiveErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props)
        this.state = { hasError: false }
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, errorMessage: error.message }
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        logSystemError("REACT_COMPONENT_CRASH", error.message, error.stack + "\nComponent Stack:\n" + errorInfo.componentStack)
    }

    handleRecover = () => {
        this.setState({ hasError: false, errorMessage: undefined })
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-4 rounded-xl bg-slate-900 text-white border border-slate-700 shadow-xl my-2 flex flex-col gap-3 font-sans">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                            🛡️ {this.props.fallbackTitle || "Component Self-Healing Active"}
                        </span>
                        <button
                            type="button"
                            onClick={this.handleRecover}
                            className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-black uppercase rounded-lg shadow cursor-pointer transition-colors"
                        >
                            Auto-Recover
                        </button>
                    </div>
                    <p className="text-xs text-slate-300">
                        {this.state.errorMessage || "An isolated UI component anomaly was intercepted and logged to system watchdog."}
                    </p>
                </div>
            )
        }

        return this.props.children
    }
}

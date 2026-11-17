'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Bell,
  CalendarCheck,
  FileText,
  Navigation,
  CreditCard,
  Users,
  ShieldCheck,
  Sparkles,
  CheckCheck,
  X,
  ArrowRight,
  Sliders,
  Trash2,
  RefreshCw,
} from 'lucide-react'

export interface ClientNotificationItem {
  id: string
  category: string
  severity: string
  title: string
  message: string
  action_url?: string
  action_label?: string
  is_read: boolean
  created_at: string
}

export function formatRelativeNotifTime(iso: string): string {
  if (!iso) return 'Just now'
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function getNotifVisuals(category: string, severity: string) {
  const cat = String(category || 'system').toLowerCase()
  if (cat === 'booking') {
    return {
      icon: CalendarCheck,
      bg: 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800',
      tag: 'Booking',
    }
  }
  if (cat === 'quotation') {
    return {
      icon: FileText,
      bg: 'bg-sky-50 text-sky-600 border-sky-200 dark:bg-sky-950/60 dark:text-sky-400 dark:border-sky-800',
      tag: 'Quotation',
    }
  }
  if (cat === 'dispatch') {
    return {
      icon: Navigation,
      bg: 'bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-400 dark:border-indigo-800',
      tag: 'Dispatch',
    }
  }
  if (cat === 'billing') {
    return {
      icon: CreditCard,
      bg: 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800',
      tag: 'Billing',
    }
  }
  if (cat === 'team') {
    return {
      icon: Users,
      bg: 'bg-violet-50 text-violet-600 border-violet-200 dark:bg-violet-950/60 dark:text-violet-400 dark:border-violet-800',
      tag: 'Team',
    }
  }
  if (cat === 'security' || severity === 'warning') {
    return {
      icon: ShieldCheck,
      bg: 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800',
      tag: 'Security',
    }
  }
  return {
    icon: Sparkles,
    bg: 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-800',
    tag: 'Portal',
  }
}

export function ClientNotificationsBell() {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [mounted, setMounted] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [items, setItems] = React.useState<ClientNotificationItem[]>([])
  const [unreadCount, setUnreadCount] = React.useState(0)
  const [filter, setFilter] = React.useState<'all' | 'unread' | 'trips' | 'quotes'>('all')

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const fetchNotifications = React.useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true)
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 2800)
    try {
      const res = await fetch('/api/notifications', {
        credentials: 'include',
        cache: 'no-store',
        signal: controller.signal,
      })
      if (res.ok) {
        const json = await res.json()
        const arr = Array.isArray(json?.notifications) ? json.notifications : []
        setItems(arr)
        setUnreadCount(
          typeof json?.unreadCount === 'number'
            ? json.unreadCount
            : arr.filter((x: any) => !x.is_read).length
        )
      }
    } catch {
      // Graceful fallback
    } finally {
      clearTimeout(timer)
      if (showSpinner) setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchNotifications(false)
    const interval = setInterval(() => fetchNotifications(false), 30000)
    const onRefresh = () => fetchNotifications(false)
    window.addEventListener('th:notifications-updated', onRefresh)
    window.addEventListener('th:profile-updated', onRefresh)
    return () => {
      clearInterval(interval)
      window.removeEventListener('th:notifications-updated', onRefresh)
      window.removeEventListener('th:profile-updated', onRefresh)
    }
  }, [fetchNotifications])

  React.useEffect(() => {
    if (!open) return
    fetchNotifications(items.length === 0)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const handleMarkRead = async (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
    setUnreadCount((prev) => Math.max(0, prev - 1))
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id, isRead: true }),
    }).catch(() => {})
  }

  const handleMarkAllRead = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })))
    setUnreadCount(0)
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ markAllRead: true }),
    }).catch(() => {})
  }

  const handleDismiss = async (e: React.MouseEvent, id: string, wasUnread: boolean) => {
    e.stopPropagation()
    setItems((prev) => prev.filter((n) => n.id !== id))
    if (wasUnread) setUnreadCount((prev) => Math.max(0, prev - 1))
    await fetch(`/api/notifications?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      credentials: 'include',
    }).catch(() => {})
  }

  const handleActionClick = (n: ClientNotificationItem) => {
    if (!n.is_read) {
      handleMarkRead(n.id)
    }
    setOpen(false)
    if (n.action_url) {
      router.push(n.action_url)
    }
  }

  const filteredItems = React.useMemo(() => {
    if (filter === 'unread') return items.filter((n) => !n.is_read)
    if (filter === 'trips') {
      return items.filter((n) => n.category === 'booking' || n.category === 'dispatch')
    }
    if (filter === 'quotes') return items.filter((n) => n.category === 'quotation')
    return items
  }, [items, filter])

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Booking & Dispatch Notifications"
        title="Booking & Dispatch Notifications"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'relative rounded-xl transition-all cursor-pointer h-10 w-10',
          open
            ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400'
            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
        )}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-500 text-white text-[10px] font-extrabold flex items-center justify-center ring-2 ring-white dark:ring-slate-950 shadow-xs">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {mounted &&
        open &&
        createPortal(
          <div className="fixed inset-0 z-[10050] flex justify-end">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-slate-900/20 backdrop-blur-[1px] animate-in fade-in duration-150"
              onClick={() => setOpen(false)}
            />

            {/* Right-Side Notification Drawer / Panel */}
            <aside className="relative z-10 mt-16 mr-0 sm:mr-4 mb-0 sm:mb-4 w-full sm:w-[420px] max-h-[calc(100dvh-64px)] sm:max-h-[calc(100dvh-84px)] bg-white dark:bg-slate-950 sm:rounded-3xl border-l sm:border border-slate-200/90 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right-6 fade-in duration-200">
              {/* Top Header */}
              <div className="px-5 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 bg-slate-50/60 dark:bg-slate-900/50">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
                        Notifications
                      </h3>
                      {unreadCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-extrabold">
                          {unreadCount} New
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Live bookings, quotations &amp; dispatch updates
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      title="Mark all as read"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors cursor-pointer"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      Mark all read
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false)
                      router.push('/profile?tab=preferences')
                    }}
                    title="Notification Preferences"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <Sliders className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Close notifications"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="px-5 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1.5 bg-white dark:bg-slate-950">
                <div className="flex items-center gap-1">
                  {(
                    [
                      { id: 'all', label: 'All' },
                      { id: 'unread', label: `Unread (${unreadCount})` },
                      { id: 'trips', label: 'Bookings' },
                      { id: 'quotes', label: 'Quotations' },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setFilter(t.id)}
                      className={cn(
                        'px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer',
                        filter === t.id
                          ? 'bg-slate-900 text-white dark:bg-blue-600'
                          : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900'
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => fetchNotifications(true)}
                  title="Refresh feed"
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
                </button>
              </div>

              {/* Notification Stream */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredItems.length === 0 ? (
                  <div className="py-16 px-6 text-center space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center mx-auto text-slate-400">
                      <Bell className="w-5 h-5" />
                    </div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      {filter === 'unread' ? 'You are all caught up!' : 'No notifications yet'}
                    </p>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto">
                      Real-time dispatch updates, quotation price locks, and booking alerts appear here automatically.
                    </p>
                  </div>
                ) : (
                  filteredItems.map((n) => {
                    const vis = getNotifVisuals(n.category, n.severity)
                    const Icon = vis.icon
                    return (
                      <div
                        key={n.id}
                        onClick={() => handleActionClick(n)}
                        className={cn(
                          'p-4 flex items-start gap-3.5 transition-colors cursor-pointer group relative',
                          !n.is_read
                            ? 'bg-blue-50/40 dark:bg-blue-950/20 hover:bg-blue-50/70 dark:hover:bg-blue-950/30'
                            : 'bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900/50'
                        )}
                      >
                        <div
                          className={cn(
                            'w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 mt-0.5',
                            vis.bg
                          )}
                        >
                          <Icon className="w-4 h-4" />
                        </div>

                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <p
                              className={cn(
                                'text-xs sm:text-[13px] leading-snug pr-4',
                                !n.is_read
                                  ? 'font-extrabold text-slate-900 dark:text-white'
                                  : 'font-bold text-slate-700 dark:text-slate-200'
                              )}
                            >
                              {!n.is_read && (
                                <span className="inline-block w-2 h-2 rounded-full bg-blue-600 mr-1.5 align-middle" />
                              )}
                              {n.title}
                            </p>
                            <span className="text-[10.5px] font-semibold text-slate-400 whitespace-nowrap shrink-0">
                              {formatRelativeNotifTime(n.created_at)}
                            </span>
                          </div>

                          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                            {n.message}
                          </p>

                          <div className="flex items-center justify-between pt-1">
                            {n.action_url ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-blue-600 dark:text-blue-400 group-hover:underline">
                                {n.action_label || 'Open'}
                                <ArrowRight className="w-3 h-3" />
                              </span>
                            ) : (
                              <span />
                            )}

                            <button
                              type="button"
                              onClick={(e) => handleDismiss(e, n.id, !n.is_read)}
                              title="Dismiss notification"
                              className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Footer */}
              <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 flex items-center justify-between gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setOpen(false)
                    router.push('/notifications')
                  }}
                  className="w-full h-9 rounded-xl font-bold text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40 justify-center gap-1.5 cursor-pointer"
                >
                  Open Full Notification Center
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </aside>
          </div>,
          document.body
        )}
    </>
  )
}

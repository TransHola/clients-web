'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  formatRelativeNotifTime,
  getNotifVisuals,
  type ClientNotificationItem,
} from '@/components/layout/client-notifications-bell'
import {
  Bell,
  CheckCheck,
  Search,
  Sliders,
  Trash2,
  ArrowRight,
  Loader2,
} from 'lucide-react'

export default function NotificationsPage() {
  const router = useRouter()
  const [loading, setLoading] = React.useState(true)
  const [items, setItems] = React.useState<ClientNotificationItem[]>([])
  const [category, setCategory] = React.useState<string>('all')
  const [search, setSearch] = React.useState('')

  const loadAll = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/notifications', { credentials: 'include', cache: 'no-store' })
      if (res.ok) {
        const json = await res.json()
        setItems(Array.isArray(json?.notifications) ? json.notifications : [])
      }
    } catch {}
    setLoading(false)
  }, [])

  React.useEffect(() => {
    loadAll()
  }, [loadAll])

  const unreadCount = items.filter((x) => !x.is_read).length

  const handleMarkAllRead = async () => {
    setItems((prev) => prev.map((x) => ({ ...x, is_read: true })))
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ markAllRead: true }),
    }).catch(() => {})
    window.dispatchEvent(new Event('th:notifications-updated'))
  }

  const handleClearRead = async () => {
    setItems((prev) => prev.filter((x) => !x.is_read))
    await fetch('/api/notifications?clearRead=true', {
      method: 'DELETE',
      credentials: 'include',
    }).catch(() => {})
    window.dispatchEvent(new Event('th:notifications-updated'))
  }

  const handleOpenItem = async (n: ClientNotificationItem) => {
    if (!n.is_read) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)))
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: n.id, isRead: true }),
      }).catch(() => {})
      window.dispatchEvent(new Event('th:notifications-updated'))
    }
    if (n.action_url) router.push(n.action_url)
  }

  const handleDeleteOne = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    setItems((prev) => prev.filter((x) => x.id !== id))
    await fetch(`/api/notifications?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      credentials: 'include',
    }).catch(() => {})
    window.dispatchEvent(new Event('th:notifications-updated'))
  }

  const filtered = React.useMemo(() => {
    return items.filter((n) => {
      if (category === 'unread' && n.is_read) return false
      if (category !== 'all' && category !== 'unread' && n.category !== category) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        return (
          n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [items, category, search])

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            Notification Center
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-700">
                {unreadCount} Unread
              </span>
            )}
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Real-time alerts for bookings, quotation locks, chauffeur dispatch, and team governance.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              className="h-9 rounded-xl font-bold text-xs gap-1.5 cursor-pointer"
            >
              <CheckCheck className="w-4 h-4 text-blue-600" />
              Mark All Read
            </Button>
          )}
          {items.some((x) => x.is_read) && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearRead}
              className="h-9 rounded-xl font-bold text-xs gap-1.5 text-slate-600 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear Read
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/profile?tab=preferences')}
            className="h-9 rounded-xl font-bold text-xs gap-1.5 cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5" />
            Preferences
          </Button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 overflow-x-auto p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          {[
            { id: 'all', label: 'All' },
            { id: 'unread', label: 'Unread' },
            { id: 'booking', label: 'Bookings' },
            { id: 'quotation', label: 'Quotations' },
            { id: 'dispatch', label: 'Dispatch' },
            { id: 'team', label: 'Team' },
          ].map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer',
                category === c.id
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              )}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="relative sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search alerts..."
            className="pl-9 h-9 rounded-xl text-xs"
          />
        </div>
      </div>

      {/* List */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-20 flex items-center justify-center gap-2 text-sm text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            Loading your notifications...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <Bell className="w-10 h-10 text-slate-200 mx-auto" />
            <p className="text-base font-bold text-slate-900 dark:text-white">
              No matching notifications
            </p>
            <p className="text-xs text-slate-500">
              New dispatch, quotation, and account events will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((n) => {
              const vis = getNotifVisuals(n.category, n.severity)
              const Icon = vis.icon
              return (
                <div
                  key={n.id}
                  onClick={() => handleOpenItem(n)}
                  className={cn(
                    'p-5 flex items-start gap-4 transition-colors cursor-pointer group',
                    !n.is_read
                      ? 'bg-blue-50/35 dark:bg-blue-950/20 hover:bg-blue-50/60'
                      : 'hover:bg-slate-50/80 dark:hover:bg-slate-900/40'
                  )}
                >
                  <div
                    className={cn(
                      'w-10 h-10 rounded-xl border flex items-center justify-center shrink-0',
                      vis.bg
                    )}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {!n.is_read && (
                          <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                        )}
                        <span className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                          {n.title}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-500">
                          {vis.tag}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-slate-400 shrink-0">
                        {formatRelativeNotifTime(n.created_at)}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      {n.message}
                    </p>
                    {n.action_url && (
                      <div className="pt-1">
                        <span className="inline-flex items-center gap-1 text-xs font-extrabold text-blue-600 group-hover:underline">
                          {n.action_label || 'View Details'}
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteOne(e, n.id)}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer shrink-0"
                    title="Delete notification"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

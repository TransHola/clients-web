"use client"

import * as React from "react"

export function CountdownTimer({ expiresAt }: { expiresAt: Date }) {
  const [timeLeft, setTimeLeft] = React.useState<string>("")
  const [isExpired, setIsExpired] = React.useState(false)

  React.useEffect(() => {
    const tick = () => {
      const now = Date.now()
      const diff = expiresAt.getTime() - now
      if (diff <= 0) {
        setIsExpired(true)
        setTimeLeft("Expired")
        return
      }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setTimeLeft(h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [expiresAt])

  return (
    <span className={`text-xs font-bold tabular-nums ${isExpired ? "text-rose-500" : "text-amber-600"}`}>
      {isExpired ? "Expired" : `Expires in ${timeLeft}`}
    </span>
  )
}

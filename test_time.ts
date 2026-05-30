function formatTimeStr(timeStr: string): string {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':')
  if (!h || !m) return timeStr
  const hour = parseInt(h, 10)
  let displayH = hour % 12
  if (displayH === 0) displayH = 12
  const ampm = hour >= 12 ? 'PM' : 'AM'
  return `${displayH}:${m} ${ampm}`
}

console.log(formatTimeStr("22:00"))

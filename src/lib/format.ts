export function formatDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return '0m'
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  const parts: string[] = []
  if (h) parts.push(`${h}h`)
  if (m) parts.push(`${m}m`)
  if (s && !h) parts.push(`${s}s`)
  else if (s && m === 0) parts.push(`${s}s`)
  return parts.join(' ') || '0m'
}

export function formatInr(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function activityTypeLabel(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1)
}

export function minutesAndSecondsToDuration(minutes: number, seconds: number): number {
  return Math.max(0, Math.round(minutes) * 60 + Math.round(seconds))
}

export function durationToParts(totalSeconds: number): { minutes: number; seconds: number } {
  return {
    minutes: Math.floor(totalSeconds / 60),
    seconds: totalSeconds % 60,
  }
}

const IST = 'Asia/Kolkata'

export function todayIst(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: IST,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

export function nowIso(): string {
  return new Date().toISOString()
}

export function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + days))
  return dt.toISOString().slice(0, 10)
}

export function minDate(a: string, b: string): string {
  return a <= b ? a : b
}

export function inRange(date: string, start: string, end: string): boolean {
  return date >= start && date <= end
}

export function formatIstDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d, 6, 30))
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: IST,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(dt)
}

export function formatIstRange(start: string, end: string): string {
  if (start === end) return formatIstDate(start)
  return `${formatIstDate(start)} – ${formatIstDate(end)}`
}

export function enumerateWeeks(start: string, end: string): {
  index: number
  startDate: string
  endDate: string
  label: string
}[] {
  const weeks = []
  let cursor = start
  let index = 0
  while (cursor <= end) {
    const weekEnd = minDate(addDays(cursor, 6), end)
    weeks.push({
      index,
      startDate: cursor,
      endDate: weekEnd,
      label: `Week ${index + 1}`,
    })
    cursor = addDays(weekEnd, 1)
    index += 1
  }
  return weeks
}

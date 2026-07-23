export function localIsoDate(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date)

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return [values.year, values.month, values.day].join('-')
}

export function localTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}

export function displayDate(date: string, timeZone: string, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...options
  }).format(new Date(date + 'T12:00:00'))
}

export function displayTime(instant: string, timeZone: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(instant))
}

export function atLocalTime(date: Date, hours: number, minutes = 0) {
  const result = new Date(date)
  result.setHours(hours, minutes, 0, 0)
  return result.toISOString()
}

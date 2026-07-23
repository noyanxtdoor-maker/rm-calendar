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

function zonePartsAt(instant: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(instant)

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second)
  }
}

function zoneOffsetAt(instant: Date, timeZone: string) {
  const parts = zonePartsAt(instant, timeZone)
  const wallClockAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second)
  return wallClockAsUtc - instant.getTime()
}

export function zonedDateTimeToUtcIso(date: string, time: string, timeZone: string) {
  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)
  const intendedWallClock = Date.UTC(year, month - 1, day, hour, minute, 0)
  let utcMilliseconds = intendedWallClock

  for (let iteration = 0; iteration < 3; iteration += 1) {
    const candidate = intendedWallClock - zoneOffsetAt(new Date(utcMilliseconds), timeZone)
    if (candidate === utcMilliseconds) {
      break
    }
    utcMilliseconds = candidate
  }

  return new Date(utcMilliseconds).toISOString()
}

export function dateAndTimeFromInstant(instant: string, timeZone: string) {
  const parts = zonePartsAt(new Date(instant), timeZone)
  return {
    date: [parts.year, String(parts.month).padStart(2, '0'), String(parts.day).padStart(2, '0')].join('-'),
    time: [String(parts.hour).padStart(2, '0'), String(parts.minute).padStart(2, '0')].join(':')
  }
}

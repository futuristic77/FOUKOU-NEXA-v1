const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isUuid(value) {
  return typeof value === 'string' && UUID_PATTERN.test(value)
}

export function isIsoCalendarDate(value) {
  if (typeof value !== 'string' || !ISO_DATE_PATTERN.test(value) || value.startsWith('0000-')) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

export function isValidEmail(value) {
  return typeof value === 'string' && value.length >= 3 && value.length <= 254 && EMAIL_PATTERN.test(value)
}

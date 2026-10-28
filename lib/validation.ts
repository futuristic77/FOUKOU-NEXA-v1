export function text(form: FormData, key: string, min = 0, max = 500): string {
  const value = String(form.get(key) ?? '').trim()
  if (value.length < min || value.length > max) throw new Error(`Le champ ${key} doit contenir entre ${min} et ${max} caractères.`)
  return value
}

export function optionalText(form: FormData, key: string, max = 500): string {
  return text(form, key, 0, max)
}

export function id(form: FormData, key = 'id', required = true): string | null {
  const value = String(form.get(key) ?? '')
  if (!value && !required) return null
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) throw new Error('Identifiant invalide.')
  return value
}

export function number(form: FormData, key: string, min: number, max: number): number {
  const raw = form.get(key)
  if (raw === null || String(raw).trim() === '') throw new Error(`Valeur numérique requise pour ${key}.`)
  const value = Number(raw)
  if (!Number.isFinite(value) || value < min || value > max) throw new Error(`Valeur numérique invalide pour ${key}.`)
  return value
}

export function integer(form: FormData, key: string, min: number, max: number): number {
  const value = number(form, key, min, max)
  if (!Number.isInteger(value)) throw new Error(`Nombre entier attendu pour ${key}.`)
  return value
}

export function date(form: FormData, key: string, required = true): string | null {
  const value = String(form.get(key) ?? '')
  if (!value && !required) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) throw new Error(`Date invalide pour ${key}.`)
  return value
}

export function time(form: FormData, key: string): string {
  const value = String(form.get(key) ?? '')
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new Error(`Heure invalide pour ${key}.`)
  return value
}

export function choice<T extends string>(form: FormData, key: string, values: readonly T[]): T {
  const value = String(form.get(key)) as T
  if (!values.includes(value)) throw new Error(`Valeur invalide pour ${key}.`)
  return value
}

export function email(form: FormData, key = 'email'): string {
  const value = text(form, key, 3, 254).toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new Error('Adresse e-mail invalide.')
  return value
}

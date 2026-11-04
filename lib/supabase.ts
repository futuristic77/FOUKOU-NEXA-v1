export type SupabaseTable =
  | 'foukou_schools'
  | 'foukou_classrooms'
  | 'foukou_students'
  | 'foukou_teachers'
  | 'foukou_teacher_class_assignments'
  | 'foukou_grade_records'
  | 'foukou_attendance_records'
  | 'foukou_announcements'

export type SupabaseQuery = Record<string, string | number | boolean>

type SupabaseConfig = Readonly<{ url: string; publicKey: string }>

function isLegacyAnonKey(key: string): boolean {
  const parts = key.split('.')
  if (parts.length !== 3) return false

  try {
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4)
    const claims = JSON.parse(atob(padded)) as { role?: string }
    return claims.role === 'anon'
  } catch {
    return false
  }
}

function isPublicSupabaseKey(key: string): boolean {
  return key.startsWith('sb_publishable_') || isLegacyAnonKey(key)
}

export function getSupabaseConfig(): SupabaseConfig | null {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  if (!rawUrl || !publicKey) return null

  let parsedUrl: URL
  try {
    parsedUrl = new URL(rawUrl)
  } catch {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL must be a valid URL.')
  }

  const isLocalDevelopment =
    parsedUrl.protocol === 'http:' &&
    (parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1')

  if (parsedUrl.protocol !== 'https:' && !isLocalDevelopment) {
    throw new Error('Supabase must use HTTPS outside local development.')
  }
  if (parsedUrl.username || parsedUrl.password || parsedUrl.search || parsedUrl.hash || (parsedUrl.pathname !== '/' && parsedUrl.pathname !== '')) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL must contain only the project origin.')
  }
  if (!isPublicSupabaseKey(publicKey)) {
    throw new Error('Use only a Supabase publishable or anon key in the browser. Service-role keys are forbidden.')
  }

  return { url: parsedUrl.origin, publicKey }
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseConfig() !== null
}

/**
 * Read-only PostgREST helper. All access still depends on database grants and RLS.
 * Do not add service-role keys or public policies for student data.
 */
export async function selectSupabaseTable<T>(
  table: SupabaseTable,
  query: SupabaseQuery = {},
): Promise<T> {
  const config = getSupabaseConfig()
  if (!config) {
    throw new Error('Supabase is not configured. Set the two NEXT_PUBLIC_SUPABASE variables in the deployment environment.')
  }
  if (!/^[a-z][a-z0-9_]*$/.test(table)) {
    throw new Error('Invalid Supabase table name.')
  }

  const endpoint = new URL('/rest/v1/' + table, config.url)
  for (const [key, value] of Object.entries(query)) {
    if (!/^[a-z][a-z0-9_]*$/i.test(key)) {
      throw new Error('Invalid Supabase query parameter.')
    }
    endpoint.searchParams.set(key, String(value))
  }

  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      apikey: config.publicKey,
      Authorization: 'Bearer ' + config.publicKey,
      Accept: 'application/json',
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error('Supabase read failed with HTTP ' + response.status + '. Check table grants and RLS policies.')
  }
  return (await response.json()) as T
}

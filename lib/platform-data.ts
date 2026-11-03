import 'server-only'
import { requirePlatformAdmin } from './auth'
import { db } from './db'
import type { PlatformSchoolSummary } from './types'

type PlatformSchoolRow = {
  id: string
  name: string
  city: string
  country: string
  createdAt: Date | string
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function mapSchool(row: PlatformSchoolRow): PlatformSchoolSummary {
  return {
    id: row.id,
    name: row.name,
    city: row.city,
    country: row.country,
    createdAt: new Date(row.createdAt).toISOString(),
  }
}

export async function getPlatformSchools(): Promise<PlatformSchoolSummary[]> {
  await requirePlatformAdmin('platform:read')
  const rows = await db()<PlatformSchoolRow[]>`
    SELECT id, name, city, country, created_at AS "createdAt"
    FROM schools
    ORDER BY created_at DESC, name ASC
  `
  return rows.map(mapSchool)
}

export async function getPlatformSchool(schoolId: string): Promise<PlatformSchoolSummary | null> {
  await requirePlatformAdmin('platform:read')
  if (!uuidPattern.test(schoolId)) return null

  const rows = await db()<PlatformSchoolRow[]>`
    SELECT id, name, city, country, created_at AS "createdAt"
    FROM schools
    WHERE id = ${schoolId}
    LIMIT 1
  `
  return rows[0] ? mapSchool(rows[0]) : null
}

import 'server-only'
import { requirePlatformAdmin } from './auth'
import { db } from './db'
import { isUuid } from './validation-helpers.mjs'
import type { PlatformSchoolSummary } from './types'

type PlatformSchoolRow = {
  id: string
  name: string
  city: string
  country: string
  address: string
  phone: string
  email: string
  createdAt: Date | string
}

function mapSchool(row: PlatformSchoolRow): PlatformSchoolSummary {
  return {
    id: row.id,
    name: row.name,
    city: row.city,
    country: row.country,
    address: row.address,
    phone: row.phone,
    email: row.email,
    createdAt: new Date(row.createdAt).toISOString(),
  }
}

export async function getPlatformSchools(): Promise<PlatformSchoolSummary[]> {
  await requirePlatformAdmin('platform:read')
  const rows = await db()<PlatformSchoolRow[]>`
    SELECT id, name, city, country, address, phone, email, created_at AS "createdAt"
    FROM schools
    ORDER BY created_at DESC, name ASC
  `
  return rows.map(mapSchool)
}

export async function getPlatformSchool(schoolId: string): Promise<PlatformSchoolSummary | null> {
  await requirePlatformAdmin('platform:read')
  if (!isUuid(schoolId)) return null

  const rows = await db()<PlatformSchoolRow[]>`
    SELECT id, name, city, country, address, phone, email, created_at AS "createdAt"
    FROM schools
    WHERE id = ${schoolId}
    LIMIT 1
  `
  return rows[0] ? mapSchool(rows[0]) : null
}

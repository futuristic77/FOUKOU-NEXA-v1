import 'server-only'
import { createHash, randomBytes } from 'node:crypto'
import { cache } from 'react'
import { cookies } from 'next/headers'
import { db } from './db'
import { hasPermission } from './permissions.mjs'
import type { Role, SessionUser } from './types'

export const SESSION_COOKIE = 'foukou_session'
const SESSION_HOURS = 8

function tokenHash(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export function newSessionToken() {
  return randomBytes(32).toString('base64url')
}

export async function createSession(userId: string) {
  const token = newSessionToken()
  const expires = new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000)
  await db()`INSERT INTO sessions (user_id, token_hash, expires_at) VALUES (${userId}, ${tokenHash(token)}, ${expires.toISOString()})`
  const jar = await cookies()
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires,
  })
}

export async function destroySession() {
  const jar = await cookies()
  const token = jar.get(SESSION_COOKIE)?.value
  if (token) await db()`DELETE FROM sessions WHERE token_hash = ${tokenHash(token)}`
  jar.set(SESSION_COOKIE, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 0 })
}

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies()
  const token = jar.get(SESSION_COOKIE)?.value
  if (!token || !process.env.DATABASE_URL) return null
  const rows = await db()`
    SELECT u.id, u.school_id, u.email, u.full_name, u.role
    FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ${tokenHash(token)} AND s.expires_at > now() AND u.active = true
    LIMIT 1
  `
  const row = rows[0]
  if (!row) return null
  await db()`UPDATE sessions SET last_seen_at = now() WHERE token_hash = ${tokenHash(token)} AND last_seen_at < now() - interval '5 minutes'`
  return { id: row.id, schoolId: row.school_id, email: row.email, fullName: row.full_name, role: row.role as Role }
})

export async function requireUser(permission?: string) {
  const user = await getCurrentUser()
  if (!user) throw new Error('Authentification requise.')
  if (permission && !hasPermission(user.role, permission)) throw new Error('Vous n’avez pas la permission d’effectuer cette action.')
  return user
}

export function requireSchool(user: SessionUser): string {
  if (!user.schoolId) throw new Error('Aucun établissement n’est associé à ce compte.')
  return user.schoolId
}

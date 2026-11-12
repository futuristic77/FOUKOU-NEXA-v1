'use server'

import { createHash } from 'node:crypto'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { createSession, destroySession } from '@/lib/auth'
import { hasActiveTeacherProfile } from '@/lib/teacher-scope.mjs'
import { hashPassword, verifyPassword } from '@/lib/password.mjs'
import type { TransactionSql } from 'postgres'
import type { ActionResult } from '@/lib/types'

const MAX_LOGIN_ATTEMPTS = 5

async function withLoginAttemptLock<T>(identity: string, work: (tx: TransactionSql) => Promise<T>) {
  return db().begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(hashtextextended(${`foukou-login:${identity}`}, 0))`
    return work(tx)
  })
}

async function countRecentLoginAttempts(identity: string) {
  return withLoginAttemptLock(identity, async (tx) => {
    const rows = await tx`SELECT COUNT(*)::int AS count FROM login_attempts WHERE identity_hash=${identity} AND attempted_at > now() - interval '15 minutes'`
    return Number(rows[0].count)
  })
}

async function recordFailedLoginAttempt(identity: string) {
  return withLoginAttemptLock(identity, async (tx) => {
    const rows = await tx`SELECT COUNT(*)::int AS count FROM login_attempts WHERE identity_hash=${identity} AND attempted_at > now() - interval '15 minutes'`
    if (Number(rows[0].count) >= MAX_LOGIN_ATTEMPTS) return false
    await tx`INSERT INTO login_attempts (identity_hash) VALUES (${identity})`
    await tx`DELETE FROM login_attempts WHERE attempted_at < now() - interval '1 day'`
    return true
  })
}

async function clearLoginAttempts(identity: string) {
  await withLoginAttemptLock(identity, async (tx) => {
    await tx`DELETE FROM login_attempts WHERE identity_hash=${identity}`
  })
}

export async function loginAction(_previous: ActionResult | null, form: FormData): Promise<ActionResult> {
  const email = String(form.get('email') ?? '').trim().toLowerCase()
  const password = String(form.get('password') ?? '')
  if (!email || !password || email.length > 254 || password.length > 256) return { ok: false, message: 'Identifiants invalides.' }
  try {
    const requestHeaders = await headers()
    const ip = requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
    const identity = createHash('sha256').update(`foukou-login-v1|${ip}|${email}`).digest('hex')
    if (await countRecentLoginAttempts(identity) >= MAX_LOGIN_ATTEMPTS) {
      return { ok: false, message: 'Trop de tentatives. Réessayez dans 15 minutes.' }
    }

    const rows = await db()`SELECT id, password_hash, role, school_id FROM users WHERE email=${email} AND active=true LIMIT 1`
    const account = rows[0]
    // Effectue également un scrypt pour un compte inconnu afin de réduire la différence temporelle observable.
    let valid = false
    if (account) valid = await verifyPassword(password, account.password_hash)
    else await hashPassword('foukou-invalid-login')
    if (!account || !valid) {
      const recorded = await recordFailedLoginAttempt(identity)
      return recorded
        ? { ok: false, message: 'E-mail ou mot de passe incorrect.' }
        : { ok: false, message: 'Trop de tentatives. Réessayez dans 15 minutes.' }
    }

    await clearLoginAttempts(identity)
    if (account.role === 'teacher') {
      const profiles = await db()`SELECT status FROM teachers WHERE user_id=${account.id} AND school_id=${account.school_id}`
      if (!hasActiveTeacherProfile(profiles)) {
        return { ok: false, message: 'Aucune fiche enseignant unique et active n’est liée à ce compte. Contactez la direction.' }
      }
    }
    await createSession(account.id)
  } catch {
    console.error('Connexion impossible; détails internes omis.')
    return { ok: false, message: 'Le service est momentanément indisponible. Vérifiez la configuration de la base.' }
  }
  redirect('/')
}

export async function logoutAction() {
  await destroySession()
  redirect('/connexion')
}

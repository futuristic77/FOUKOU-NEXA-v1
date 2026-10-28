'use server'

import { createHash } from 'node:crypto'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { createSession, destroySession } from '@/lib/auth'
import { hashPassword, verifyPassword } from '@/lib/password.mjs'
import type { ActionResult } from '@/lib/types'

export async function loginAction(_previous: ActionResult | null, form: FormData): Promise<ActionResult> {
  const email = String(form.get('email') ?? '').trim().toLowerCase()
  const password = String(form.get('password') ?? '')
  if (!email || !password || email.length > 254 || password.length > 256) return { ok: false, message: 'Identifiants invalides.' }
  try {
    const requestHeaders = await headers()
    const ip = requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
    const identity = createHash('sha256').update(`foukou-login-v1|${ip}|${email}`).digest('hex')
    const attempts = await db()`SELECT COUNT(*) AS count FROM login_attempts WHERE identity_hash=${identity} AND attempted_at > now() - interval '15 minutes'`
    if (Number(attempts[0].count) >= 5) return { ok: false, message: 'Trop de tentatives. Réessayez dans 15 minutes.' }
    const rows = await db()`SELECT id, password_hash FROM users WHERE email=${email} AND active=true LIMIT 1`
    const account = rows[0]
    // Effectue également un scrypt pour un compte inconnu afin de réduire la différence temporelle observable.
    let valid = false
    if (account) valid = await verifyPassword(password, account.password_hash)
    else await hashPassword('foukou-invalid-login')
    if (!account || !valid) {
      await db()`INSERT INTO login_attempts (identity_hash) VALUES (${identity})`
      await db()`DELETE FROM login_attempts WHERE attempted_at < now() - interval '1 day'`
      return { ok: false, message: 'E-mail ou mot de passe incorrect.' }
    }
    await db()`DELETE FROM login_attempts WHERE identity_hash=${identity}`
    await createSession(account.id)
  } catch (error) {
    console.error('Connexion impossible', error)
    return { ok: false, message: 'Le service est momentanément indisponible. Vérifiez la configuration de la base.' }
  }
  redirect('/')
}

export async function logoutAction() {
  await destroySession()
  redirect('/connexion')
}

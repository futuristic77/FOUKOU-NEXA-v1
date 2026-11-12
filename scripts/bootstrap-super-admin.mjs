import postgres from 'postgres'
import { hashPassword, validatePassword } from '../lib/password.mjs'
import { isValidEmail } from '../lib/validation-helpers.mjs'
import {
  assertApprovedFingerprint,
  postgresIdentityFingerprint,
  postgresUrlFingerprint,
} from './database-target-guard.mjs'

let sql

try {
  if (!process.argv.includes('--confirm-initial-super-admin')) {
    throw new Error('Le bootstrap initial exige --confirm-initial-super-admin.')
  }

  const connectionString = process.env.BOOTSTRAP_DATABASE_URL
  const email = process.env.BOOTSTRAP_SUPER_ADMIN_EMAIL?.trim().toLowerCase()
  const fullName = process.env.BOOTSTRAP_SUPER_ADMIN_NAME?.trim()
  const password = process.env.BOOTSTRAP_SUPER_ADMIN_PASSWORD
  if (!email || !isValidEmail(email)) throw new Error('Adresse de bootstrap invalide.')
  if (!fullName || fullName.length < 2 || fullName.length > 160) throw new Error('Nom de bootstrap invalide.')
  validatePassword(password)

  const urlFingerprint = postgresUrlFingerprint(connectionString)
  assertApprovedFingerprint(
    urlFingerprint,
    process.env.SUPER_ADMIN_BOOTSTRAP_URL_FINGERPRINT,
    'Bootstrap URL',
  )
  const passwordHash = await hashPassword(password)
  delete process.env.BOOTSTRAP_SUPER_ADMIN_PASSWORD

  sql = postgres(connectionString, {
    ssl: 'require',
    max: 1,
    connect_timeout: 10,
    prepare: false,
  })

  const [identity] = await sql`
    SELECT
      current_database() AS database_name,
      current_user AS role_name,
      inet_server_addr()::text AS server_address,
      inet_server_port() AS server_port,
      current_setting('server_version_num') AS server_version_num,
      current_schema() AS current_schema
  `
  assertApprovedFingerprint(
    postgresIdentityFingerprint(identity),
    process.env.SUPER_ADMIN_BOOTSTRAP_DATABASE_FINGERPRINT,
    'Bootstrap PostgreSQL identity',
  )

  const [auditTable] = await sql`SELECT to_regclass('public.platform_activity_logs')::text AS table_name`
  if (!auditTable?.table_name) throw new Error('La migration du journal plateforme doit être appliquée au préalable.')

  const created = await sql.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(hashtextextended('foukou-initial-super-admin-bootstrap', 0))`
    const administrators = await tx`
      SELECT id, email, active
      FROM users
      WHERE role = 'super_admin' AND school_id IS NULL
      FOR UPDATE
    `

    if (administrators.length) {
      if (
        administrators.length === 1 &&
        administrators[0].email.toLowerCase() === email &&
        administrators[0].active === true
      ) return false
      throw new Error('Un autre compte super_admin existe déjà; le bootstrap refuse toute modification.')
    }

    const existingEmail = await tx`SELECT id FROM users WHERE lower(email) = ${email} FOR UPDATE`
    if (existingEmail.length) throw new Error('Cette adresse est déjà associée à un compte; le bootstrap refuse toute modification.')

    const rows = await tx`
      INSERT INTO users (school_id, email, full_name, password_hash, role)
      VALUES (NULL, ${email}, ${fullName}, ${passwordHash}, 'super_admin')
      RETURNING id
    `
    await tx`
      INSERT INTO platform_activity_logs (actor_id, action, detail)
      VALUES (${rows[0].id}, 'super_admin.bootstrapped', 'Initial platform administrator provisioned')
    `
    return true
  })

  console.log(created ? 'Compte super_admin initial créé.' : 'Le compte super_admin demandé existe déjà; aucune modification effectuée.')
} catch (error) {
  const code = typeof error?.code === 'string' ? ` (${error.code.replace(/[^A-Z0-9]/gi, '')})` : ''
  console.error(`Bootstrap refusé ou échoué${code}. URL, mot de passe et détails SQL omis.`)
  process.exitCode = 1
} finally {
  delete process.env.BOOTSTRAP_SUPER_ADMIN_PASSWORD
  if (sql) await sql.end().catch(() => {})
}

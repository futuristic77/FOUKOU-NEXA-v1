import { readdir, readFile } from 'node:fs/promises'
import postgres from 'postgres'
import {
  assertApprovedFingerprint,
  assertMigrationMode,
  postgresIdentityFingerprint,
  postgresUrlFingerprint,
} from './database-target-guard.mjs'

let sql

try {
  const args = process.argv.slice(2)
  const targets = args.filter((arg) => arg.startsWith('--target='))
  if (targets.length !== 1) throw new Error('Une cible explicite est requise.')
  const target = targets[0].slice('--target='.length)
  assertMigrationMode(target, args)

  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL est requise.')
  if (process.env.DATABASE_SSL?.toLowerCase() === 'disable') {
    throw new Error('DATABASE_SSL=disable est interdit; TLS est obligatoire.')
  }
  if (process.env.SEED_ADMIN_EMAIL || process.env.SEED_ADMIN_PASSWORD || process.env.SEED_SCHOOL_NAME) {
    throw new Error('Les variables SEED_* ne sont plus acceptées par le migrateur. Utilisez le bootstrap séparé.')
  }

  const profile = target === 'production' ? 'MIGRATION_PRODUCTION' : 'MIGRATION_NON_PRODUCTION'
  assertApprovedFingerprint(
    postgresUrlFingerprint(process.env.DATABASE_URL),
    process.env[`${profile}_URL_FINGERPRINT`],
    'Migration URL',
  )

  sql = postgres(process.env.DATABASE_URL, {
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
    process.env[`${profile}_DATABASE_FINGERPRINT`],
    'Migration PostgreSQL identity',
  )

  await sql`CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`
  const applied = await sql`SELECT name FROM schema_migrations`
  const appliedNames = new Set(applied.map((row) => row.name))
  const files = (await readdir(new URL('../migrations/', import.meta.url)))
    .filter((file) => /^\d+_[\w-]+\.sql$/.test(file))
    .sort()

  for (const file of files) {
    if (appliedNames.has(file)) continue
    const schema = await readFile(new URL(`../migrations/${file}`, import.meta.url), 'utf8')
    const migrationBody = schema
      .replace(/^\s*BEGIN\s*;\s*/i, '')
      .replace(/\s*COMMIT\s*;\s*$/i, '')
    if (migrationBody === schema) throw new Error(`Migration ${file} must be explicitly transaction-wrapped.`)

    await sql.begin(async (tx) => {
      await tx.unsafe(migrationBody)
      await tx`INSERT INTO schema_migrations (name) VALUES (${file})`
    })
    console.log(`Migration appliquée : ${file}`)
  }
} catch (error) {
  const code = typeof error?.code === 'string' ? ` (${error.code.replace(/[^A-Z0-9]/gi, '')})` : ''
  console.error(`Migration refusée ou échouée${code}. Cible et détails de connexion omis.`)
  process.exitCode = 1
} finally {
  if (sql) await sql.end().catch(() => {})
}

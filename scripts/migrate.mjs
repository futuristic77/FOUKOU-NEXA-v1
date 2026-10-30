import { readdir, readFile } from 'node:fs/promises'
import postgres from 'postgres'
import { hashPassword } from '../lib/password.mjs'

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL est requise.')
const sql = postgres(process.env.DATABASE_URL, {
  ssl: process.env.DATABASE_SSL === 'disable' ? false : 'require',
  max: 1,
})

try {
  await sql`CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`
  const applied = await sql`SELECT name FROM schema_migrations`
  const appliedNames = new Set(applied.map((row) => row.name))
  const files = (await readdir(new URL('../migrations/', import.meta.url)))
    .filter((file) => /^\d+_[\w-]+\.sql$/.test(file))
    .sort()
  for (const file of files) {
    if (appliedNames.has(file)) continue
    const schema = await readFile(new URL(`../migrations/${file}`, import.meta.url), 'utf8')
    await sql.unsafe(schema)
    await sql`INSERT INTO schema_migrations (name) VALUES (${file})`
    console.log(`Migration appliquée : ${file}`)
  }

  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.SEED_ADMIN_PASSWORD
  if (email || password) {
    if (!email || !password) throw new Error('SEED_ADMIN_EMAIL et SEED_ADMIN_PASSWORD doivent être définis ensemble.')
    const schoolName = process.env.SEED_SCHOOL_NAME?.trim() || 'Mon établissement'
    const passwordHash = await hashPassword(password)
    await sql.begin(async (tx) => {
      const [school] = await tx`INSERT INTO schools (name) VALUES (${schoolName}) RETURNING id`
      await tx`INSERT INTO school_settings (school_id, academic_year, current_term) VALUES (${school.id}, ${new Date().getFullYear() + '–' + (new Date().getFullYear() + 1)}, 'Trimestre 1')`
      await tx`INSERT INTO users (school_id, email, full_name, password_hash, role) VALUES (${school.id}, ${email}, 'Direction', ${passwordHash}, 'director')`
    })
    console.log('Établissement et compte de direction créés. Retirez SEED_ADMIN_PASSWORD de l’environnement.')
  }
} finally {
  await sql.end()
}

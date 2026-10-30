import postgres, { type Sql, type TransactionSql } from 'postgres'

let client: Sql | undefined

export function db(): Sql {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL n’est pas configurée.')
  if (!client) {
    client = postgres(url, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
      ssl: process.env.DATABASE_SSL === 'disable' ? false : 'require',
      transform: { undefined: null },
    })
  }
  return client
}

export async function logActivity(sql: Sql | TransactionSql, schoolId: string, actorId: string, kind: string, title: string, detail = '') {
  await sql`INSERT INTO activity_logs (school_id, actor_id, kind, title, detail) VALUES (${schoolId}, ${actorId}, ${kind}, ${title}, ${detail})`
}

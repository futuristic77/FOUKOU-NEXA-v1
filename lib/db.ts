import postgres, { type Sql, type TransactionSql } from 'postgres'

let client: Sql | undefined

export function db(): Sql {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL n’est pas configurée.')
  if (process.env.DATABASE_SSL?.toLowerCase() === 'disable') {
    throw new Error('DATABASE_SSL=disable est interdit; TLS est obligatoire.')
  }
  if (!client) {
    client = postgres(url, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
      ssl: 'require',
      transform: { undefined: null },
    })
  }
  return client
}

export async function logActivity(sql: Sql | TransactionSql, schoolId: string, actorId: string, kind: string, title: string, detail = '') {
  await sql`INSERT INTO activity_logs (school_id, actor_id, kind, title, detail) VALUES (${schoolId}, ${actorId}, ${kind}, ${title}, ${detail})`
}

export async function logPlatformActivity(
  sql: Sql | TransactionSql,
  actorId: string,
  action: 'school.created' | 'school.deleted' | 'super_admin.bootstrapped',
  schoolId: string | null = null,
  schoolName: string | null = null,
  detail = '',
) {
  await sql`
    INSERT INTO platform_activity_logs (actor_id, school_id, school_name, action, detail)
    VALUES (${actorId}, ${schoolId}, ${schoolName}, ${action}, ${detail})
  `
}

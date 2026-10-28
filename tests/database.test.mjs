import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('le schéma couvre les modules métier et les clés d’isolation', async () => {
  const schema = await readFile(new URL('../migrations/001_initial.sql', import.meta.url), 'utf8')
  for (const table of ['schools', 'users', 'sessions', 'students', 'classes', 'teachers', 'teacher_assignments', 'subjects', 'grades', 'attendance', 'schedules', 'communications', 'school_settings', 'activity_logs']) {
    assert.match(schema, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`))
  }
  assert.match(schema, /UNIQUE \(student_id, attendance_date\)/)
  assert.match(schema, /CHECK \(score <= max_score\)/)
  assert.match(schema, /ON DELETE CASCADE/)
})

test('connexion PostgreSQL en lecture seule', { skip: !process.env.DATABASE_URL }, async () => {
  const { default: postgres } = await import('postgres')
  const sql = postgres(process.env.DATABASE_URL, { ssl: process.env.DATABASE_SSL === 'disable' ? false : 'require', max: 1, connect_timeout: 5 })
  try {
    const result = await sql`SELECT 1 AS connected`
    assert.equal(result[0].connected, 1)
  } finally {
    await sql.end()
  }
})

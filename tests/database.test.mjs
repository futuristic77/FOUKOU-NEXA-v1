import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { openTestDatabase, testDatabaseEnabled } from '../scripts/test-database-guard.mjs'

test('le schéma couvre les modules métier et les clés d’isolation', async () => {
  const schema = await readFile(new URL('../migrations/001_initial.sql', import.meta.url), 'utf8')
  for (const table of ['schools', 'users', 'sessions', 'students', 'classes', 'teachers', 'teacher_assignments', 'subjects', 'grades', 'attendance', 'schedules', 'communications', 'school_settings', 'activity_logs']) {
    assert.match(schema, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`))
  }
  assert.match(schema, /UNIQUE \(student_id, attendance_date\)/)
  assert.match(schema, /CHECK \(score <= max_score\)/)
  assert.match(schema, /CHECK \(\(role = 'super_admin'\) = \(school_id IS NULL\)\)/)
  assert.match(schema, /ON DELETE CASCADE/)
})

test('la migration ajoute les coordonnées administratives avec des bornes persistées', async () => {
  const migration = await readFile(new URL('../migrations/003_school_contact_details.sql', import.meta.url), 'utf8')
  assert.match(migration, /ADD COLUMN address text NOT NULL DEFAULT '' CHECK \(char_length\(address\) <= 240\)/)
  assert.match(migration, /ADD COLUMN phone text NOT NULL DEFAULT '' CHECK \(char_length\(phone\) <= 40\)/)
  assert.match(migration, /ADD COLUMN email text NOT NULL DEFAULT '' CHECK \(char_length\(email\) <= 254\)/)
})

test('la migration tenant ajoute et valide des clés étrangères composites', async () => {
  const migration = await readFile(new URL('../migrations/002_tenant_integrity.sql', import.meta.url), 'utf8')
  for (const constraint of [
    'students_school_class_fkey',
    'teacher_assignments_school_teacher_fkey',
    'grades_school_student_fkey',
    'attendance_school_student_fkey',
    'attendance_school_class_fkey',
    'schedules_school_class_fkey',
    'communications_school_author_fkey',
    'activity_logs_school_actor_fkey',
  ]) {
    assert.match(migration, new RegExp(`ADD CONSTRAINT ${constraint}`))
    assert.match(migration, new RegExp(`VALIDATE CONSTRAINT ${constraint}`))
  }
  assert.match(migration, /FOREIGN KEY \(school_id, student_id\)/)
  assert.match(migration, /REFERENCES students \(school_id, id\)/)
})

const databaseTestsEnabled = testDatabaseEnabled()

test('connexion PostgreSQL en lecture seule vers le projet de test épinglé', { skip: !databaseTestsEnabled }, async () => {
  const sql = await openTestDatabase()
  try {
    const result = await sql`SELECT 1 AS connected`
    assert.equal(result[0].connected, 1)
  } finally {
    await sql.end()
  }
})

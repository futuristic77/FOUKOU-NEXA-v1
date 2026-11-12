import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('les migrations initiales définissent les tables scolaires et les invariants de base', async () => {
  const schema = await readFile(new URL('../migrations/001_initial.sql', import.meta.url), 'utf8')
  for (const table of ['schools', 'users', 'sessions', 'students', 'classes', 'teachers', 'teacher_assignments', 'subjects', 'grades', 'attendance', 'schedules', 'communications', 'school_settings', 'activity_logs']) {
    assert.match(schema, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`))
  }
  assert.match(schema, /UNIQUE \(student_id, attendance_date\)/)
  assert.match(schema, /CHECK \(score <= max_score\)/)
  assert.match(schema, /CHECK \(\(role = 'super_admin'\) = \(school_id IS NULL\)\)/)
  assert.match(schema, /recorded_by uuid REFERENCES users\(id\) ON DELETE SET NULL/)
})

test('les migrations tenant et coordonnées existantes sont non altérées et validées', async () => {
  const tenant = await readFile(new URL('../migrations/002_tenant_integrity.sql', import.meta.url), 'utf8')
  const contacts = await readFile(new URL('../migrations/003_school_contact_details.sql', import.meta.url), 'utf8')
  for (const constraint of [
    'teachers_school_user_fkey', 'classes_school_lead_teacher_fkey', 'students_school_class_fkey',
    'teacher_assignments_school_teacher_fkey', 'grades_school_student_fkey',
    'attendance_school_student_fkey', 'attendance_school_class_fkey',
    'communications_school_author_fkey', 'activity_logs_school_actor_fkey',
  ]) {
    assert.match(tenant, new RegExp(`ADD CONSTRAINT ${constraint}`))
    assert.match(tenant, new RegExp(`VALIDATE CONSTRAINT ${constraint}`))
  }
  assert.match(contacts, /ADD COLUMN address text NOT NULL DEFAULT ''/)
  assert.match(contacts, /ADD COLUMN phone text NOT NULL DEFAULT ''/)
  assert.match(contacts, /ADD COLUMN email text NOT NULL DEFAULT ''/)
})

test('la migration recorded_by précontrôle les données puis valide la FK composite', async () => {
  const migration = await readFile(new URL('../migrations/004_attendance_recorder_tenant_fk.sql', import.meta.url), 'utf8')
  assert.match(migration, /WHERE a\.recorded_by IS NOT NULL/)
  assert.match(migration, /u\.school_id = a\.school_id/)
  assert.match(migration, /RAISE EXCEPTION/)
  assert.match(migration, /FOREIGN KEY \(school_id, recorded_by\)/)
  assert.match(migration, /REFERENCES users \(school_id, id\)/)
  assert.match(migration, /ON DELETE SET NULL \(recorded_by\)/)
  assert.match(migration, /NOT VALID/)
  assert.match(migration, /VALIDATE CONSTRAINT attendance_school_recorded_by_fkey/)
})

test('le journal plateforme survit à la suppression en cascade d’une école', async () => {
  const migration = await readFile(new URL('../migrations/005_platform_activity_logs.sql', import.meta.url), 'utf8')
  assert.match(migration, /CREATE TABLE IF NOT EXISTS platform_activity_logs/)
  assert.match(migration, /school_id uuid,/)
  assert.doesNotMatch(migration, /school_id uuid[^\n]*REFERENCES schools/)
  assert.match(migration, /actor_id uuid NOT NULL/)
  assert.match(migration, /school\.deleted/)
  assert.match(migration, /super_admin\.bootstrapped/)
  assert.match(migration, /REVOKE ALL ON TABLE platform_activity_logs FROM PUBLIC/)
  assert.match(migration, /rolname IN \('anon', 'authenticated', 'service_role'\)/)
})

test('le migrateur exige deux empreintes et ne contient plus de bootstrap implicite', async () => {
  const source = await readFile(new URL('../scripts/migrate.mjs', import.meta.url), 'utf8')
  assert.match(source, /MIGRATION_PRODUCTION/)
  assert.match(source, /MIGRATION_NON_PRODUCTION/)
  assert.match(source, /process\.env\[`\$\{profile\}_URL_FINGERPRINT`\]/)
  assert.match(source, /process\.env\[`\$\{profile\}_DATABASE_FINGERPRINT`\]/)
  assert.match(source, /postgresUrlFingerprint/)
  assert.match(source, /postgresIdentityFingerprint/)
  assert.match(source, /ssl: 'require'/)
  assert.match(source, /await sql\.begin\(async \(tx\) =>/)
  assert.match(source, /await tx\.unsafe\(migrationBody\)/)
  assert.match(source, /await tx`INSERT INTO schema_migrations/)
  assert.doesNotMatch(source, /INSERT INTO users/)
  assert.doesNotMatch(source, /hashPassword/)
  assert.match(source, /SEED_\*/)
})

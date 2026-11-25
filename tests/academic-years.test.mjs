import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { assertValidSchoolYearDates, enrollmentStatusLabel, isSchoolYearEditable, schoolYearStatusLabel } from '../lib/academic-year-domain.mjs'

const migration = await readFile(new URL('../migrations/006_academic_year_enrollments.sql', import.meta.url), 'utf8')
const actions = await readFile(new URL('../app/actions.ts', import.meta.url), 'utf8')
const queries = await readFile(new URL('../lib/academic-year-data.mjs', import.meta.url), 'utf8')
const schoolData = await readFile(new URL('../lib/school-data.ts', import.meta.url), 'utf8')
const settingsView = await readFile(new URL('../components/foukou/settings-view.tsx', import.meta.url), 'utf8')


test('les dates d’année scolaire sont valides et strictement ordonnées', () => {
  assert.doesNotThrow(() => assertValidSchoolYearDates('2026-08-01', '2027-06-30'))
  assert.throws(() => assertValidSchoolYearDates('2026-08-01', '2026-08-01'), /postérieure/)
  assert.throws(() => assertValidSchoolYearDates('2027-06-30', '2026-08-01'), /postérieure/)
  assert.throws(() => assertValidSchoolYearDates('2026-02-30', '2027-06-30'), /valides/)
})

test('les statuts d’année et d’inscription ont des libellés explicites', () => {
  assert.equal(isSchoolYearEditable('prepared'), true)
  assert.equal(isSchoolYearEditable('active'), true)
  assert.equal(isSchoolYearEditable('closed'), false)
  assert.equal(schoolYearStatusLabel('active'), 'Active')
  assert.equal(enrollmentStatusLabel('transferred'), 'Transféré')
})

test('la migration ajoute un modèle scolaire tenant-scoped sans modifier les lignes historiques', () => {
  assert.match(migration, /CREATE TABLE school_years/)
  assert.match(migration, /CREATE TABLE student_enrollments/)
  assert.match(migration, /CREATE TABLE student_enrollment_class_changes/)
  assert.match(migration, /CHECK \(start_date < end_date\)/)
  assert.match(migration, /WHERE status = 'active'/)
  assert.match(migration, /UNIQUE \(school_id, school_year_id, student_id\)/)
  assert.match(migration, /FOREIGN KEY \(school_id, school_year_id\)/)
  assert.match(migration, /FOREIGN KEY \(school_id, student_id\)/)
  assert.match(migration, /FOREIGN KEY \(school_id, class_id\)/)
  assert.match(migration, /student_enrollment_class_changes_history/)
  assert.doesNotMatch(migration, /ALTER TABLE (students|grades|attendance)\b/)
  assert.doesNotMatch(migration, /\b(INSERT INTO|UPDATE|DELETE FROM)\s+(students|grades|attendance)\b/i)
})

test('la création, activation et clôture passent par les permissions et l’école de session', () => {
  const createYear = actions.split('export async function createAcademicYear')[1].split('export async function activateSchoolYear')[0]
  const activateYear = actions.split('export async function activateSchoolYear')[1].split('export async function closeSchoolYear')[0]
  const closeYear = actions.split('export async function closeSchoolYear')[1].split('export async function createStudentEnrollment')[0]
  for (const action of [createYear, activateYear, closeYear]) {
    assert.match(action, /perform\('settings:write', async \(user, schoolId\)/)
    assert.match(action, /school_id = \$\{schoolId\}/)
    assert.doesNotMatch(action, /form\.get\(['"]schoolId/)
  }
  assert.match(activateYear, /status = 'closed'[\s\S]*status = 'active'/)
  assert.match(closeYear, /status = 'closed'/)
})

test('les inscriptions et mouvements de classe sont validés, bornés et transactionnels', () => {
  const createEnrollment = actions.split('export async function createStudentEnrollment')[1].split('export async function updateStudentEnrollment')[0]
  const updateEnrollment = actions.split('export async function updateStudentEnrollment')[1].split('export async function saveSchool')[0]
  for (const action of [createEnrollment, updateEnrollment]) {
    assert.match(action, /perform\('students:write', async \(user, schoolId\)/)
    assert.match(action, /school_id = \$\{schoolId\}/)
    assert.match(action, /isSchoolYearEditable/)
    assert.match(action, /logActivity\(tx, schoolId, user\.id/)
    assert.doesNotMatch(action, /form\.get\(['"]schoolId/)
  }
  assert.match(createEnrollment, /student_enrollments/)
  assert.match(createEnrollment, /Cet élève possède déjà une inscription/)
  assert.match(createEnrollment, /student_enrollment_class_changes/)
  assert.match(updateEnrollment, /FOR UPDATE OF e, sy/)
  assert.match(updateEnrollment, /if \(enrollment\.class_id !== classId\)/)
  assert.doesNotMatch(updateEnrollment, /DELETE FROM student_enrollment_class_changes|UPDATE student_enrollment_class_changes/)
})

test('les listes filtrent par établissement et les enseignants par classe affectée', () => {
  assert.match(queries, /WHERE e\.school_id = \$\{schoolId\}/)
  assert.match(queries, /e\.class_id = ANY\(\$\{sql\.array\(classIds, UUID_OID\)\}\)/)
  assert.match(queries, /h\.class_after_id = ANY\(\$\{sql\.array\(classIds, UUID_OID\)\}\)/)
  assert.match(schoolData, /requireSchool\(user\)/)
  assert.match(schoolData, /user\.role === 'teacher'/)
})

test('l’activation d’année ne réattribue pas les notes ni les paramètres historiques', () => {
  const activateYear = actions.split('export async function activateSchoolYear')[1].split('export async function closeSchoolYear')[0]
  assert.doesNotMatch(activateYear, /UPDATE school_settings/)
  assert.match(settingsView, /Le libellé reste utilisé par les notes historiques/)
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'

const databaseUrl = process.env.TEST_DATABASE_URL
const enabled = Boolean(databaseUrl)

function assertIsolatedTestDatabase(value) {
  const url = new URL(value)
  const databaseName = decodeURIComponent(url.pathname.slice(1))
  assert.ok(['localhost', '127.0.0.1', '::1'].includes(url.hostname), 'TEST_DATABASE_URL must point to localhost')
  assert.match(databaseName, /(^|[_-])test($|[_-])/i, 'TEST_DATABASE_URL must use a database name containing “test”')
}

test('PostgreSQL empêche les relations entre établissements', { skip: !enabled }, async () => {
  assertIsolatedTestDatabase(databaseUrl)
  const { default: postgres } = await import('postgres')
  const sql = postgres(databaseUrl, {
    ssl: process.env.DATABASE_SSL === 'disable' ? false : 'require',
    max: 1,
    connect_timeout: 5,
  })
  const suffix = randomUUID()
  let schoolA
  let schoolB

  try {
    const applied = await sql`SELECT name FROM schema_migrations WHERE name = '002_tenant_integrity.sql'`
    assert.equal(applied.length, 1, 'tenant integrity migration must be applied before integration tests')

    const schools = await sql`
      INSERT INTO schools (name) VALUES (${`Test A ${suffix}`}), (${`Test B ${suffix}`})
      RETURNING id, name
    `
    schoolA = schools[0].id
    schoolB = schools[1].id

    const users = await sql`
      INSERT INTO users (school_id, email, full_name, password_hash, role)
      VALUES
        (${schoolA}, ${`a-${suffix}@example.test`}, 'Test A', 'test-hash', 'director'),
        (${schoolB}, ${`b-${suffix}@example.test`}, 'Test B', 'test-hash', 'director')
      RETURNING id, school_id
    `
    const userA = users[0].id
    const userB = users[1].id

    const teachers = await sql`
      INSERT INTO teachers (school_id, user_id, full_name)
      VALUES (${schoolA}, ${userA}, 'Teacher A'), (${schoolB}, ${userB}, 'Teacher B')
      RETURNING id, school_id
    `
    const teacherA = teachers[0].id
    const teacherB = teachers[1].id

    const classes = await sql`
      INSERT INTO classes (school_id, name, level)
      VALUES (${schoolA}, ${`Class A ${suffix}`}, '6e'), (${schoolB}, ${`Class B ${suffix}`}, '6e')
      RETURNING id, school_id
    `
    const classA = classes[0].id
    const classB = classes[1].id

    const subjects = await sql`
      INSERT INTO subjects (school_id, name)
      VALUES (${schoolA}, ${`Subject A ${suffix}`}), (${schoolB}, ${`Subject B ${suffix}`})
      RETURNING id, school_id
    `
    const subjectA = subjects[0].id
    const subjectB = subjects[1].id

    const students = await sql`
      INSERT INTO students (school_id, class_id, student_number, full_name)
      VALUES
        (${schoolA}, ${classA}, ${`A-${suffix}`}, 'Student A'),
        (${schoolB}, ${classB}, ${`B-${suffix}`}, 'Student B')
      RETURNING id, school_id
    `
    const studentA = students[0].id

    const expectForeignKey = async (constraint, work) => {
      await assert.rejects(
        sql.begin(async (transaction) => work(transaction)),
        (error) => error.code === '23503' && error.constraint_name === constraint,
      )
    }

    await expectForeignKey('teachers_school_user_fkey', (tx) =>
      tx`INSERT INTO teachers (school_id, user_id, full_name) VALUES (${schoolA}, ${userB}, 'Cross-tenant teacher')`)
    await expectForeignKey('classes_school_lead_teacher_fkey', (tx) =>
      tx`INSERT INTO classes (school_id, lead_teacher_id, name, level) VALUES (${schoolA}, ${teacherB}, ${`Cross ${suffix}`}, '6e')`)
    await expectForeignKey('students_school_class_fkey', (tx) =>
      tx`INSERT INTO students (school_id, class_id, student_number, full_name) VALUES (${schoolA}, ${classB}, ${`cross-${suffix}`}, 'Cross-tenant student')`)
    await expectForeignKey('teacher_assignments_school_teacher_fkey', (tx) =>
      tx`INSERT INTO teacher_assignments (school_id, teacher_id, class_id, subject_id) VALUES (${schoolA}, ${teacherB}, ${classA}, ${subjectA})`)
    await expectForeignKey('teacher_assignments_school_class_fkey', (tx) =>
      tx`INSERT INTO teacher_assignments (school_id, teacher_id, class_id, subject_id) VALUES (${schoolA}, ${teacherA}, ${classB}, ${subjectA})`)
    await expectForeignKey('teacher_assignments_school_subject_fkey', (tx) =>
      tx`INSERT INTO teacher_assignments (school_id, teacher_id, class_id, subject_id) VALUES (${schoolA}, ${teacherA}, ${classA}, ${subjectB})`)
    await expectForeignKey('grades_school_student_fkey', (tx) =>
      tx`INSERT INTO grades (school_id, student_id, subject_id, teacher_id, term, assessment, score, max_score) VALUES (${schoolB}, ${studentA}, ${subjectB}, null, 'T1', 'Test', 10, 20)`)
    await expectForeignKey('grades_school_subject_fkey', (tx) =>
      tx`INSERT INTO grades (school_id, student_id, subject_id, term, assessment, score, max_score) VALUES (${schoolA}, ${studentA}, ${subjectB}, 'T1', 'Test', 10, 20)`)
    await expectForeignKey('attendance_school_class_fkey', (tx) =>
      tx`INSERT INTO attendance (school_id, student_id, class_id, attendance_date, status) VALUES (${schoolA}, ${studentA}, ${classB}, CURRENT_DATE, 'present')`)
    await expectForeignKey('schedules_school_subject_fkey', (tx) =>
      tx`INSERT INTO schedules (school_id, class_id, subject_id, weekday, starts_at, ends_at) VALUES (${schoolA}, ${classA}, ${subjectB}, 1, '08:00', '09:00')`)
    await expectForeignKey('communications_school_author_fkey', (tx) =>
      tx`INSERT INTO communications (school_id, author_id, title, body, audience) VALUES (${schoolA}, ${userB}, 'Cross', 'Cross tenant', 'community')`)
    await expectForeignKey('activity_logs_school_actor_fkey', (tx) =>
      tx`INSERT INTO activity_logs (school_id, actor_id, kind, title) VALUES (${schoolA}, ${userB}, 'test', 'Cross tenant')`)

    const validAttendance = await sql`
      INSERT INTO attendance (school_id, student_id, class_id, attendance_date, status)
      VALUES (${schoolA}, ${studentA}, ${classA}, CURRENT_DATE, 'present')
      RETURNING id
    `
    assert.equal(validAttendance.length, 1)
  } finally {
    try {
      const schoolIds = [schoolA, schoolB].filter(Boolean)
      if (schoolIds.length) {
        await sql`DELETE FROM schools WHERE id = ANY(${sql.array(schoolIds, 2950)})`
      }
    } finally {
      await sql.end()
    }
  }
})

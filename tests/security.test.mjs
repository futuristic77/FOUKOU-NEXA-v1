import test from 'node:test'
import assert from 'node:assert/strict'
import { hashPassword, verifyPassword, validatePassword } from '../lib/password.mjs'
import { canDeleteSchool, hasPermission, matchesSchoolDeletionConfirmation } from '../lib/permissions.mjs'
import { hasActiveTeacherProfile, hasAttendanceClassAccess, hasTeacherAssignment, scopeSchoolDataForUser } from '../lib/teacher-scope.mjs'

test('scrypt vérifie le bon mot de passe et refuse un autre', async () => {
  const encoded = await hashPassword('un-mot-de-passe-tres-long')
  assert.match(encoded, /^scrypt\$/)
  assert.equal(await verifyPassword('un-mot-de-passe-tres-long', encoded), true)
  assert.equal(await verifyPassword('incorrect', encoded), false)
})

test('deux hachages du même mot de passe ont des sels différents', async () => {
  const first = await hashPassword('phrase-secrete-unique')
  const second = await hashPassword('phrase-secrete-unique')
  assert.notEqual(first, second)
})

test('les empreintes invalides ne provoquent pas d’exception', async () => {
  assert.equal(await verifyPassword('mot-de-passe-long', 'invalide'), false)
  assert.equal(await verifyPassword('mot-de-passe-long', 'scrypt$bad$bad'), false)
})

test('la politique de longueur est appliquée', async () => {
  assert.throws(() => validatePassword('trop-court'), /12/)
  await assert.rejects(hashPassword('court'), /12/)
  assert.doesNotThrow(() => validatePassword('douze-caractères'))
})

test('la direction et l’administration ont des périmètres distincts', () => {
  assert.equal(hasPermission('director', 'settings:write'), true)
  assert.equal(hasPermission('director', 'users:write'), true)
  assert.equal(hasPermission('administration', 'students:write'), true)
  assert.equal(hasPermission('administration', 'settings:write'), false)
  assert.equal(hasPermission('administration', 'users:write'), false)
})

test('seul le super administrateur peut demander la suppression d’un établissement', () => {
  assert.equal(hasPermission('super_admin', 'school:delete'), true)
  assert.equal(canDeleteSchool('super_admin'), true)
  assert.equal(hasPermission('director', 'school:update'), true)
  for (const role of ['director', 'administration', 'teacher', 'secretary', 'viewer', 'unknown']) {
    assert.equal(hasPermission(role, 'school:delete'), false)
    assert.equal(canDeleteSchool(role), false)
  }
})

test('la confirmation de suppression exige exactement le nom de l’établissement', () => {
  assert.equal(matchesSchoolDeletionConfirmation('SUPPRIMER Collège A', 'Collège A'), true)
  assert.equal(matchesSchoolDeletionConfirmation('SUPPRIMER', 'Collège A'), false)
  assert.equal(matchesSchoolDeletionConfirmation('SUPPRIMER Collège B', 'Collège A'), false)
})

test('un compte enseignant doit avoir au moins un profil actif', () => {
  assert.equal(hasActiveTeacherProfile([{ status: 'active' }]), true)
  assert.equal(hasActiveTeacherProfile([{ status: 'inactive' }]), false)
  assert.equal(hasActiveTeacherProfile([{ status: 'inactive' }, { status: 'active' }]), true)
  assert.equal(hasActiveTeacherProfile([]), false)
})

test('les enseignants ne peuvent pas administrer les dossiers', () => {
  assert.equal(hasPermission('teacher', 'grades:write'), true)
  assert.equal(hasPermission('teacher', 'attendance:write'), true)
  assert.equal(hasPermission('teacher', 'students:write'), false)
  assert.equal(hasPermission('teacher', 'schedules:write'), false)
})

test('la vie scolaire ne peut pas saisir de notes', () => {
  assert.equal(hasPermission('secretary', 'attendance:write'), true)
  assert.equal(hasPermission('secretary', 'communications:write'), true)
  assert.equal(hasPermission('secretary', 'grades:write'), false)
})

test('la lecture seule et les rôles inconnus ne peuvent rien modifier', () => {
  for (const role of ['viewer', 'unknown']) {
    assert.equal(hasPermission(role, 'school:read'), role === 'viewer')
    assert.equal(hasPermission(role, 'students:write'), false)
    assert.equal(hasPermission(role, 'grades:write'), false)
    assert.equal(hasPermission(role, 'settings:write'), false)
  }
})

test('les enseignants ne peuvent écrire que dans leurs affectations exactes', () => {
  const assignments = [
    { classId: 'class-a', subjectId: 'math' },
    { classId: 'class-b', subjectId: 'french' },
  ]
  assert.equal(hasTeacherAssignment(assignments, 'class-a', 'math'), true)
  assert.equal(hasTeacherAssignment(assignments, 'class-a', 'french'), false)
  assert.equal(hasTeacherAssignment(assignments, 'class-b', 'math'), false)
  assert.equal(hasTeacherAssignment(assignments, 'class-a'), true)
})

test('une présence déplacée exige l’affectation à l’ancienne et à la nouvelle classe', () => {
  const assignments = [{ classId: 'class-a', subjectId: 'math' }, { classId: 'class-b', subjectId: 'french' }]
  assert.equal(hasAttendanceClassAccess(assignments, 'class-a', 'class-a'), true)
  assert.equal(hasAttendanceClassAccess(assignments, 'class-a', 'class-b'), true)
  assert.equal(hasAttendanceClassAccess(assignments, 'class-a', 'class-c'), false)
  assert.equal(hasAttendanceClassAccess(assignments, 'class-c', 'class-b'), false)
})

test('les données envoyées à un enseignant sont limitées à ses classes et matières', () => {
  const data = {
    students: [
      { id: 'student-a', classId: 'class-a', guardianPhone: 'scope-a' },
      { id: 'student-b', classId: 'class-b', guardianPhone: 'scope-b' },
    ],
    classes: [{ id: 'class-a' }, { id: 'class-b' }],
    teachers: [{ id: 'teacher-a' }, { id: 'teacher-b' }],
    subjects: [{ id: 'math' }, { id: 'french' }],
    assignments: [
      { id: 'assignment-a', teacherId: 'teacher-a', classId: 'class-a', subjectId: 'math' },
      { id: 'assignment-b', teacherId: 'teacher-b', classId: 'class-a', subjectId: 'french' },
      { id: 'assignment-c', teacherId: 'teacher-b', classId: 'class-b', subjectId: 'math' },
    ],
    grades: [
      { id: 'grade-a', studentId: 'student-a', subjectId: 'math' },
      { id: 'grade-b', studentId: 'student-a', subjectId: 'french' },
      { id: 'grade-c', studentId: 'student-b', subjectId: 'math' },
    ],
    attendance: [
      { id: 'attendance-a', studentId: 'student-a', classId: 'class-a' },
      { id: 'attendance-b', studentId: 'student-b', classId: 'class-b' },
    ],
    schedules: [
      { id: 'schedule-a', teacherId: 'teacher-a', classId: 'class-a', subjectId: 'math' },
      { id: 'schedule-b', teacherId: 'teacher-b', classId: 'class-a', subjectId: 'french' },
    ],
    communications: [{ id: 'published', status: 'published' }, { id: 'draft', status: 'draft' }],
    activities: [{ id: 'activity-outside-scope' }],
    reports: [{
      studentId: 'student-a',
      rows: [
        { subjectId: 'math', average: 14, coefficient: 2 },
        { subjectId: 'french', average: 18, coefficient: 1 },
      ],
      average: 15.33,
    }, {
      studentId: 'student-b',
      rows: [{ subjectId: 'math', average: 12, coefficient: 2 }],
      average: 12,
    }],
    users: [{ id: 'other-user' }],
  }

  const scoped = scopeSchoolDataForUser(data, { role: 'teacher' }, ['teacher-a'])
  assert.deepEqual(scoped.students.map((item) => item.id), ['student-a'])
  assert.deepEqual(scoped.students.map((item) => item.guardianPhone), ['scope-a'])
  assert.deepEqual(scoped.classes.map((item) => item.id), ['class-a'])
  assert.deepEqual(scoped.teachers.map((item) => item.id), ['teacher-a'])
  assert.deepEqual(scoped.subjects.map((item) => item.id), ['math'])
  assert.deepEqual(scoped.assignments.map((item) => item.id), ['assignment-a'])
  assert.deepEqual(scoped.grades.map((item) => item.id), ['grade-a'])
  assert.deepEqual(scoped.attendance.map((item) => item.id), ['attendance-a'])
  assert.deepEqual(scoped.schedules.map((item) => item.id), ['schedule-a'])
  assert.deepEqual(scoped.communications.map((item) => item.id), ['published'])
  assert.deepEqual(scoped.activities, [])
  assert.deepEqual(scoped.users, [])
  assert.deepEqual(scoped.reports[0].rows.map((item) => item.subjectId), ['math'])
  assert.equal(scoped.reports[0].average, 14)
})

test('les autres rôles conservent les données non filtrées', () => {
  const data = { students: [{ id: 'student-a' }] }
  assert.equal(scopeSchoolDataForUser(data, { role: 'director' }, []), data)
  assert.equal(scopeSchoolDataForUser(data, { role: 'administration' }, []), data)
  assert.equal(scopeSchoolDataForUser(data, { role: 'secretary' }, []), data)
  assert.equal(scopeSchoolDataForUser(data, { role: 'viewer' }, []), data)
})

test('un compte enseignant sans fiche liée ne reçoit aucune donnée élève', () => {
  const data = {
    students: [{ id: 'student-a', classId: 'class-a' }],
    classes: [{ id: 'class-a' }],
    teachers: [{ id: 'teacher-a' }],
    subjects: [{ id: 'math' }],
    assignments: [{ teacherId: 'teacher-a', classId: 'class-a', subjectId: 'math' }],
    grades: [{ id: 'grade-a', studentId: 'student-a', subjectId: 'math' }],
    attendance: [{ id: 'attendance-a', studentId: 'student-a', classId: 'class-a' }],
    schedules: [{ id: 'schedule-a', teacherId: 'teacher-a', classId: 'class-a', subjectId: 'math' }],
    communications: [],
    activities: [],
    reports: [{ studentId: 'student-a', rows: [], average: null }],
    users: [],
  }
  const scoped = scopeSchoolDataForUser(data, { role: 'teacher' }, [])
  assert.deepEqual(scoped.students, [])
  assert.deepEqual(scoped.grades, [])
  assert.deepEqual(scoped.attendance, [])
  assert.deepEqual(scoped.schedules, [])
  assert.deepEqual(scoped.reports, [])
})

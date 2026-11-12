import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const actionNames = [
  'deleteStudent', 'deleteClass', 'deleteTeacher', 'deleteSubject', 'deleteAssignment',
  'deleteGrade', 'deleteAttendance', 'deleteSchedule', 'deleteCommunication',
  'saveUser', 'deleteUser', 'saveSettings', 'saveSchool',
]

function actionSource(source, name) {
  const start = source.indexOf(`export async function ${name}(`)
  assert.notEqual(start, -1, `action ${name} exists`)
  const next = source.indexOf('\nexport async function ', start + 1)
  return source.slice(start, next === -1 ? undefined : next)
}

test('les mutations métier écrivent le journal dans leur transaction', async () => {
  const source = await readFile(new URL('../app/actions.ts', import.meta.url), 'utf8')
  for (const name of actionNames) {
    const body = actionSource(source, name)
    const transactionIndex = body.search(/(?:db\(\)|sql)\.begin\(/)
    const auditIndex = body.indexOf('logActivity(')
    assert.ok(auditIndex >= 0, `${name} must write an audit event`)
    assert.ok(transactionIndex >= 0 && auditIndex > transactionIndex, `${name} must commit its audit event atomically`)
  }
})

test('les créations et suppressions plateforme ont une trace indépendante et atomique', async () => {
  const source = await readFile(new URL('../app/actions.ts', import.meta.url), 'utf8')
  for (const name of ['createSchool', 'deleteSchool']) {
    const body = actionSource(source, name)
    const transactionIndex = body.search(/db\(\)\.begin\(/)
    const auditIndex = body.indexOf('logPlatformActivity(')
    assert.ok(auditIndex >= 0, `${name} must write a platform audit event`)
    assert.ok(transactionIndex >= 0 && auditIndex > transactionIndex, `${name} must commit its platform audit atomically`)
  }
})

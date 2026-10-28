import test from 'node:test'
import assert from 'node:assert/strict'
import { hashPassword, verifyPassword, validatePassword } from '../lib/password.mjs'
import { hasPermission } from '../lib/permissions.mjs'

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

import test from 'node:test'
import assert from 'node:assert/strict'
import {
  assertApprovedFingerprint,
  assertMigrationMode,
  postgresIdentityFingerprint,
  postgresUrlFingerprint,
} from '../scripts/database-target-guard.mjs'

const url = 'postgresql://operator:unit-test-secret@db.example.test:5432/foukou?sslmode=require'
const identity = {
  database_name: 'foukou',
  role_name: 'migration_role',
  server_address: '2001:db8::1/128',
  server_port: 5432,
  server_version_num: '170011',
  current_schema: 'public',
}

test('l’empreinte URL ignore le mot de passe mais distingue chaque cible', () => {
  assert.equal(
    postgresUrlFingerprint(url),
    postgresUrlFingerprint('postgresql://operator:different-secret@db.example.test:5432/foukou?sslmode=require'),
  )
  assert.notEqual(
    postgresUrlFingerprint(url),
    postgresUrlFingerprint('postgresql://operator:unit-test-secret@other.example.test:5432/foukou?sslmode=require'),
  )
  assert.throws(() => postgresUrlFingerprint('not a URL'), /malformed/)
  assert.throws(() => postgresUrlFingerprint(url.replace('sslmode=require', 'sslmode=disable')), /TLS/)
})

test('l’identité PostgreSQL est normalisée et doit correspondre à une empreinte explicite', () => {
  const actual = postgresIdentityFingerprint(identity)
  assert.match(actual, /^[a-f0-9]{64}$/)
  assert.doesNotThrow(() => assertApprovedFingerprint(actual, actual, 'Database identity'))
  assert.throws(() => assertApprovedFingerprint(actual, undefined, 'Database identity'), /not explicitly allowlisted/)
  assert.throws(() => assertApprovedFingerprint(actual, '0'.repeat(64), 'Database identity'), /not explicitly allowlisted/)
  assert.throws(() => postgresIdentityFingerprint({ ...identity, server_address: null }), /identity is incomplete/)
})

test('la migration production exige une confirmation distincte', () => {
  assert.doesNotThrow(() => assertMigrationMode('non-production'))
  assert.throws(() => assertMigrationMode(undefined), /explicitly set/)
  assert.throws(() => assertMigrationMode('production'), /confirm-production/)
  assert.doesNotThrow(() => assertMigrationMode('production', ['--confirm-production']))
  assert.throws(() => assertMigrationMode('non-production', ['--confirm-production']), /cannot be used/)
})

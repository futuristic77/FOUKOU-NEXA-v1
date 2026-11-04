import test from 'node:test'
import assert from 'node:assert/strict'
import {
  assertTestDatabaseIdentity,
  assertTestDatabasePrivileges,
  assertTestDatabaseUrl,
  approvedTestDatabase,
} from '../scripts/test-database-guard.mjs'

const validTestUrl = `postgresql://${approvedTestDatabase.urlUser}:unit-test-password@${approvedTestDatabase.host}:${approvedTestDatabase.port}/${approvedTestDatabase.database}?sslmode=require`

function urlWith(change) {
  const url = new URL(validTestUrl)
  change(url)
  return url.toString()
}

const validIdentity = {
  database_name: 'postgres',
  role_name: 'postgres',
  server_address: '2001:db8::1/128',
  server_port: 5432,
  server_version_num: '170011',
  current_schema: 'public',
}

const validPrivileges = {
  role_name: 'postgres',
  is_superuser: false,
  can_create_database: true,
  can_create_roles: true,
  can_connect: true,
  can_create_schema_objects: true,
  can_use_public_schema: true,
  can_create_in_public: true,
}

test('le garde accepte uniquement l’URL épinglée au projet Supabase de test', () => {
  assert.equal(assertTestDatabaseUrl(validTestUrl), validTestUrl)
  assert.throws(() => assertTestDatabaseUrl(undefined), /TEST_DATABASE_URL is required/)
  assert.throws(() => assertTestDatabaseUrl('not a URL'), /malformed/)
  assert.throws(() => assertTestDatabaseUrl(urlWith((url) => { url.hostname = 'db.production.supabase.co' })), /pinned FOUKOU test project/)
  assert.throws(() => assertTestDatabaseUrl(urlWith((url) => { url.port = '5432' })), /pinned FOUKOU test project/)
  assert.throws(() => assertTestDatabaseUrl(urlWith((url) => { url.pathname = '/production' })), /pinned FOUKOU test project/)
  assert.throws(() => assertTestDatabaseUrl(urlWith((url) => { url.username = 'postgres.production' })), /pinned FOUKOU test project/)
  assert.throws(() => assertTestDatabaseUrl(urlWith((url) => { url.searchParams.set('sslmode', 'disable') })), /pinned FOUKOU test project/)
  assert.throws(() => assertTestDatabaseUrl(urlWith((url) => { url.searchParams.set('options', '-c search_path=public') })), /pinned FOUKOU test project/)
  assert.throws(() => assertTestDatabaseUrl(urlWith((url) => { url.password = '[YOUR-PASSWORD]' })), /pinned FOUKOU test project/)
})

test('le garde refuse une identité PostgreSQL différente avant les écritures', () => {
  assert.doesNotThrow(() => assertTestDatabaseIdentity(validIdentity))
  assert.throws(() => assertTestDatabaseIdentity({ ...validIdentity, database_name: 'production' }), /identity does not match/)
  assert.throws(() => assertTestDatabaseIdentity({ ...validIdentity, role_name: 'service_role' }), /identity does not match/)
  assert.throws(() => assertTestDatabaseIdentity({ ...validIdentity, server_address: '127.0.0.1/32' }), /identity does not match/)
  assert.throws(() => assertTestDatabaseIdentity({ ...validIdentity, server_version_num: '160000' }), /identity does not match/)
})

test('le garde vérifie le profil de privilèges relu sur le projet de test', () => {
  assert.doesNotThrow(() => assertTestDatabasePrivileges(validPrivileges))
  assert.throws(() => assertTestDatabasePrivileges({ ...validPrivileges, is_superuser: true }), /privileges differ/)
  assert.throws(() => assertTestDatabasePrivileges({ ...validPrivileges, can_connect: false }), /privileges differ/)
  assert.throws(() => assertTestDatabasePrivileges({ ...validPrivileges, can_create_in_public: false }), /privileges differ/)
})

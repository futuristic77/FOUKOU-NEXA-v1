import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('la limite de tentatives sérialise le comptage et l’enregistrement par identité', async () => {
  const source = await readFile(new URL('../app/connexion/actions.ts', import.meta.url), 'utf8')
  assert.match(source, /const MAX_LOGIN_ATTEMPTS = 5/)
  assert.match(source, /pg_advisory_xact_lock\(hashtextextended/)
  assert.match(source, /SELECT COUNT\(\*\)::int AS count FROM login_attempts/)
  assert.match(source, /INSERT INTO login_attempts \(identity_hash\)/)
  assert.match(source, /async function recordFailedLoginAttempt/)
})

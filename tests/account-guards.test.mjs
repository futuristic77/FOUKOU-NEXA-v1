import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { assertActiveDirectorRemains } from '../lib/account-guards.mjs'

test('empêche la désactivation, rétrogradation ou suppression du dernier directeur actif', () => {
  const activeDirector = { role: 'director', active: true }

  assert.throws(
    () => assertActiveDirectorRemains(activeDirector, { role: 'viewer', active: true }, 1),
    /dernier directeur actif/,
  )
  assert.throws(
    () => assertActiveDirectorRemains(activeDirector, { role: 'director', active: false }, 1),
    /dernier directeur actif/,
  )
  assert.throws(
    () => assertActiveDirectorRemains(activeDirector, null, 1),
    /dernier directeur actif/,
  )
  assert.throws(
    () => assertActiveDirectorRemains(activeDirector, null, Number.NaN),
    /vérifier le nombre/,
  )
})

test('autorise le changement si un autre directeur actif demeure', () => {
  const activeDirector = { role: 'director', active: true }

  assert.doesNotThrow(() => assertActiveDirectorRemains(activeDirector, { role: 'viewer', active: true }, 2))
  assert.doesNotThrow(() => assertActiveDirectorRemains(activeDirector, { role: 'director', active: true }, 1))
  assert.doesNotThrow(() => assertActiveDirectorRemains({ role: 'viewer', active: true }, null, 0))
})

test('les mutations de comptes verrouillent la ligne école avant leur invariant', async () => {
  const source = await readFile(new URL('../app/actions.ts', import.meta.url), 'utf8')
  const lockCount = source.match(/SELECT id FROM schools WHERE id=\$\{schoolId\} FOR UPDATE/g)?.length ?? 0
  assert.equal(lockCount, 2)
  assert.equal((source.match(/assertActiveDirectorRemains\(/g) ?? []).length, 2)
})

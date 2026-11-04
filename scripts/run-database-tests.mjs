import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { assertTestDatabaseUrl } from './test-database-guard.mjs'

try {
  assertTestDatabaseUrl(process.env.TEST_DATABASE_URL)
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}

if (process.exitCode === undefined) {
  const testFiles = [
    fileURLToPath(new URL('../tests/database.test.mjs', import.meta.url)),
    fileURLToPath(new URL('../tests/database.integration.test.mjs', import.meta.url)),
  ]
  const result = spawnSync(process.execPath, ['--test', ...testFiles], {
    cwd: process.cwd(),
    env: { ...process.env, REQUIRE_TEST_DATABASE: '1' },
    stdio: 'inherit',
  })

  if (result.error) {
    console.error('Could not start the PostgreSQL test runner. No database URL was printed.')
    process.exitCode = 1
  } else {
    process.exitCode = result.status ?? 1
  }
}

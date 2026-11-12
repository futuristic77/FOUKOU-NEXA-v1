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
  const testEnvironment = { ...process.env, REQUIRE_TEST_DATABASE: '1' }
  for (const name of [
    'DATABASE_URL',
    'DATABASE_SSL',
    'POSTGRES_DATABASE',
    'POSTGRES_HOST',
    'POSTGRES_PASSWORD',
    'POSTGRES_PRISMA_URL',
    'POSTGRES_URL',
    'POSTGRES_URL_NON_POOLING',
    'POSTGRES_USER',
    'SUPABASE_DB_URL',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_SECRET_KEY',
    'SUPABASE_JWT_SECRET',
  ]) delete testEnvironment[name]

  const result = spawnSync(process.execPath, ['--test', ...testFiles], {
    cwd: process.cwd(),
    env: testEnvironment,
    stdio: 'inherit',
  })

  if (result.error) {
    console.error('Could not start the PostgreSQL test runner. No database URL was printed.')
    process.exitCode = 1
  } else {
    process.exitCode = result.status ?? 1
  }
}

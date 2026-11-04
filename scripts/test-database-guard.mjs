export const approvedTestDatabase = Object.freeze({
  host: 'aws-0-eu-west-1.pooler.supabase.com',
  port: '6543',
  database: 'postgres',
  urlUser: 'postgres.imwdxkvnfthtoklgesmk',
  role: 'postgres',
  serverPort: 5432,
  serverMajorVersion: 17,
  schema: 'public',
})

export class TestDatabaseSafetyError extends Error {}

function refuse(message) {
  throw new TestDatabaseSafetyError(message)
}

export function assertTestDatabaseUrl(value) {
  if (typeof value !== 'string' || value.length === 0) {
    refuse('TEST_DATABASE_URL is required. No database connection was attempted.')
  }

  let url
  try {
    url = new URL(value)
  } catch {
    refuse('TEST_DATABASE_URL is malformed. Its value is redacted and no connection was attempted.')
  }

  let username
  let password
  let database
  try {
    username = decodeURIComponent(url.username)
    password = decodeURIComponent(url.password)
    database = decodeURIComponent(url.pathname.slice(1))
  } catch {
    refuse('TEST_DATABASE_URL contains invalid encoding. Its value is redacted.')
  }

  const sslModes = url.searchParams.getAll('sslmode')
  const hasUnexpectedParameters = [...url.searchParams.keys()].some((key) => key !== 'sslmode')
  const hasPlaceholderPassword = /your[-_ ]?password|\[YOUR-PASSWORD\]|<[^>]+>/i.test(password)
  const matchesApprovedTarget =
    ['postgres:', 'postgresql:'].includes(url.protocol) &&
    url.hostname.toLowerCase() === approvedTestDatabase.host &&
    url.port === approvedTestDatabase.port &&
    database === approvedTestDatabase.database &&
    username === approvedTestDatabase.urlUser &&
    Boolean(password) &&
    !hasPlaceholderPassword &&
    !url.hash &&
    !hasUnexpectedParameters &&
    sslModes.length <= 1 &&
    (sslModes.length === 0 || sslModes[0].toLowerCase() === 'require')

  if (!matchesApprovedTarget) {
    refuse('TEST_DATABASE_URL does not match the pinned FOUKOU test project endpoint. No database connection was attempted.')
  }

  return value
}

export function assertTestDatabaseIdentity(identity) {
  const serverAddress = typeof identity?.server_address === 'string'
    ? identity.server_address.split('/')[0].toLowerCase()
    : ''
  const isLoopback =
    serverAddress === '::1' ||
    serverAddress === '127.0.0.1' ||
    serverAddress.startsWith('127.') ||
    serverAddress.startsWith('::ffff:127.')
  const serverMajorVersion = Math.floor(Number(identity?.server_version_num) / 10_000)

  if (
    identity?.database_name !== approvedTestDatabase.database ||
    identity?.role_name !== approvedTestDatabase.role ||
    Number(identity?.server_port) !== approvedTestDatabase.serverPort ||
    identity?.current_schema !== approvedTestDatabase.schema ||
    !serverAddress ||
    isLoopback ||
    serverMajorVersion !== approvedTestDatabase.serverMajorVersion
  ) {
    refuse('Connected PostgreSQL identity does not match the approved test project. No application writes were performed.')
  }
}

export function assertTestDatabasePrivileges(privileges) {
  const expected = {
    role_name: approvedTestDatabase.role,
    is_superuser: false,
    can_create_database: true,
    can_create_roles: true,
    can_connect: true,
    can_create_schema_objects: true,
    can_use_public_schema: true,
    can_create_in_public: true,
  }

  if (Object.entries(expected).some(([key, value]) => privileges?.[key] !== value)) {
    refuse('PostgreSQL role privileges differ from the reviewed test-project profile. No application writes were performed.')
  }
}

export async function assertRequiredMigration(sql, migrationName) {
  const [ledger] = await sql`SELECT to_regclass('public.schema_migrations')::text AS table_name`
  if (!ledger?.table_name) {
    refuse('The FOUKOU migration ledger is absent. No integration-test writes were attempted.')
  }

  const applied = await sql`SELECT name FROM schema_migrations WHERE name = ${migrationName}`
  if (applied.length !== 1) {
    refuse(`Required test migration ${migrationName} is not recorded. No integration-test writes were attempted.`)
  }
}

export function testDatabaseEnabled() {
  const value = process.env.TEST_DATABASE_URL
  if (!value) {
    if (process.env.REQUIRE_TEST_DATABASE === '1') {
      refuse('TEST_DATABASE_URL is required by the dedicated PostgreSQL test command.')
    }
    return false
  }

  assertTestDatabaseUrl(value)
  return true
}

export async function openTestDatabase() {
  const connectionString = assertTestDatabaseUrl(process.env.TEST_DATABASE_URL)
  let sql

  try {
    const { default: postgres } = await import('postgres')
    sql = postgres(connectionString, {
      ssl: 'require',
      prepare: false,
      max: 1,
      connect_timeout: 10,
    })

    const [identity] = await sql`
      SELECT
        current_database() AS database_name,
        current_user AS role_name,
        inet_server_addr()::text AS server_address,
        inet_server_port() AS server_port,
        current_setting('server_version_num') AS server_version_num,
        current_schema() AS current_schema
    `
    assertTestDatabaseIdentity(identity)

    const [privileges] = await sql`
      SELECT
        current_user AS role_name,
        (SELECT rolsuper FROM pg_roles WHERE rolname = current_user) AS is_superuser,
        (SELECT rolcreatedb FROM pg_roles WHERE rolname = current_user) AS can_create_database,
        (SELECT rolcreaterole FROM pg_roles WHERE rolname = current_user) AS can_create_roles,
        has_database_privilege(current_user, current_database(), 'CONNECT') AS can_connect,
        has_database_privilege(current_user, current_database(), 'CREATE') AS can_create_schema_objects,
        has_schema_privilege(current_user, 'public', 'USAGE') AS can_use_public_schema,
        has_schema_privilege(current_user, 'public', 'CREATE') AS can_create_in_public
    `
    assertTestDatabasePrivileges(privileges)

    return sql
  } catch (error) {
    if (sql) await sql.end().catch(() => {})
    if (error instanceof TestDatabaseSafetyError) throw error

    const code = typeof error?.code === 'string' ? ` (${error.code.replace(/[^A-Z0-9]/gi, '')})` : ''
    refuse(`PostgreSQL preflight failed${code}. Connection details are redacted; no application writes were performed.`)
  }
}

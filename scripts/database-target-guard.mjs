import { createHash } from 'node:crypto'

export class DatabaseTargetSafetyError extends Error {}

function refuse(message) {
  throw new DatabaseTargetSafetyError(message)
}

function fingerprint(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex')
}

export function postgresUrlFingerprint(value) {
  if (typeof value !== 'string' || !value) refuse('Database URL is required; no value was displayed.')

  let url
  try {
    url = new URL(value)
  } catch {
    refuse('Database URL is malformed; its value is redacted.')
  }

  let username
  let password
  let database
  try {
    username = decodeURIComponent(url.username)
    password = decodeURIComponent(url.password)
    database = decodeURIComponent(url.pathname.slice(1))
  } catch {
    refuse('Database URL encoding is invalid; its value is redacted.')
  }

  const sslModes = url.searchParams.getAll('sslmode')
  const hasUnexpectedParameters = [...url.searchParams.keys()].some((key) => key !== 'sslmode')
  if (
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    !url.hostname ||
    !username ||
    !password ||
    !database ||
    url.hash ||
    hasUnexpectedParameters ||
    sslModes.length > 1 ||
    (sslModes.length === 1 && sslModes[0].toLowerCase() !== 'require')
  ) {
    refuse('Database URL does not meet the PostgreSQL TLS target format; its value is redacted.')
  }

  return fingerprint({
    protocol: url.protocol,
    host: url.hostname.toLowerCase(),
    port: url.port || '5432',
    username,
    database,
  })
}

export function postgresIdentityFingerprint(identity) {
  const serverAddress = typeof identity?.server_address === 'string'
    ? identity.server_address.split('/')[0].toLowerCase()
    : ''
  const serverMajorVersion = Math.floor(Number(identity?.server_version_num) / 10_000)
  const normalized = {
    database: identity?.database_name,
    role: identity?.role_name,
    serverAddress,
    serverPort: Number(identity?.server_port),
    schema: identity?.current_schema,
    serverMajorVersion,
  }

  if (
    !normalized.database ||
    !normalized.role ||
    !normalized.serverAddress ||
    !Number.isInteger(normalized.serverPort) ||
    !normalized.schema ||
    !Number.isInteger(normalized.serverMajorVersion) ||
    normalized.serverMajorVersion < 1
  ) {
    refuse('PostgreSQL identity is incomplete; no database operation was performed.')
  }

  return fingerprint(normalized)
}

export function assertApprovedFingerprint(actual, expected, label) {
  if (!/^[a-f0-9]{64}$/i.test(expected ?? '') || actual !== expected.toLowerCase()) {
    refuse(`${label} is not explicitly allowlisted; no database operation was performed.`)
  }
}

export function assertMigrationMode(target, args = []) {
  if (!['non-production', 'production'].includes(target)) {
    refuse('Migration target must be explicitly set to non-production or production.')
  }
  if (target === 'production' && !args.includes('--confirm-production')) {
    refuse('Production migrations require the separate --confirm-production confirmation.')
  }
  if (target !== 'production' && args.includes('--confirm-production')) {
    refuse('Production confirmation cannot be used with a non-production migration target.')
  }
}

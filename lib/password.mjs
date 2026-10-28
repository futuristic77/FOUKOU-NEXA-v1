import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCallback)
const KEY_LENGTH = 64

export async function hashPassword(password) {
  validatePassword(password)
  const salt = randomBytes(16)
  const derived = await scrypt(password, salt, KEY_LENGTH)
  return `scrypt$${salt.toString('base64url')}$${Buffer.from(derived).toString('base64url')}`
}

export async function verifyPassword(password, encoded) {
  try {
    const [algorithm, saltValue, hashValue] = encoded.split('$')
    if (algorithm !== 'scrypt' || !saltValue || !hashValue) return false
    const expected = Buffer.from(hashValue, 'base64url')
    const actual = Buffer.from(await scrypt(password, Buffer.from(saltValue, 'base64url'), expected.length))
    return expected.length === actual.length && timingSafeEqual(expected, actual)
  } catch {
    return false
  }
}

export function validatePassword(password) {
  if (typeof password !== 'string' || password.length < 12 || password.length > 256) {
    throw new Error('Le mot de passe doit contenir entre 12 et 256 caractères.')
  }
}

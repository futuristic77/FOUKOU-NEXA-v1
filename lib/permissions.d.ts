import type { Role } from './types'
export function hasPermission(role: Role, permission: string): boolean
export const roleLabels: Record<Role, string>

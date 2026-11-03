import type { Role, SessionUser } from './types'
export function hasPermission(role: Role, permission: string): boolean
export function assertPermission(user: SessionUser | null | undefined, permission?: string): SessionUser
export function isPlatformAdmin(user: Pick<SessionUser, 'role' | 'schoolId'> | null | undefined): boolean
export function canDeleteSchool(role: Role): boolean
export function matchesSchoolDeletionConfirmation(confirmation: string, schoolName: string): boolean
export const roleLabels: Record<Role, string>

const WRITE = ['students', 'classes', 'teachers', 'subjects', 'grades', 'attendance', 'schedules', 'communications']
const matrix = {
  super_admin: ['*'],
  director: ['school:update', 'school:read', 'settings:write', 'users:write', ...WRITE.flatMap((name) => [`${name}:write`])],
  administration: ['school:read', ...WRITE.flatMap((name) => [`${name}:write`])],
  teacher: ['school:read', 'grades:write', 'attendance:write'],
  secretary: ['school:read', 'students:write', 'classes:write', 'attendance:write', 'schedules:write', 'communications:write'],
  viewer: ['school:read'],
}

export function hasPermission(role, permission) {
  const permissions = matrix[role] ?? []
  return permissions.includes('*') || permissions.includes(permission)
}

export const roleLabels = {
  super_admin: 'Administration plateforme',
  director: 'Direction',
  administration: 'Administration',
  teacher: 'Enseignant',
  secretary: 'Vie scolaire',
  viewer: 'Lecture seule',
}

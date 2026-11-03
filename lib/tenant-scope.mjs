export function requireSchoolId(user) {
  if (!user?.schoolId) throw new Error('Aucun établissement n’est associé à ce compte.')
  return user.schoolId
}

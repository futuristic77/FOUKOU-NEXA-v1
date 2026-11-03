export function getHomeDestination(user) {
  if (!user) return '/connexion'
  return user.role === 'super_admin' ? '/plateforme' : '/'
}

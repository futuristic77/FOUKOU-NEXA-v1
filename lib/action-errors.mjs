export function actionErrorMessage(error, fallback = 'Opération impossible.') {
  const message = error instanceof Error ? error.message : ''
  const hasDatabaseCode = typeof error === 'object' && error !== null && 'code' in error

  if (hasDatabaseCode || message.startsWith('DATABASE_URL')) {
    return 'Opération impossible pour le moment. Vérifiez les informations puis réessayez.'
  }

  return message || fallback
}

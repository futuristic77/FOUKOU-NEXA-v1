export function assertActiveDirectorRemains(current, next, activeDirectorCount) {
  if (!current || current.role !== 'director' || current.active !== true) return
  if (next?.role === 'director' && next.active === true) return

  const directorCount = Number(activeDirectorCount)
  if (!Number.isInteger(directorCount) || directorCount < 0) {
    throw new Error('Impossible de vérifier le nombre de directeurs actifs.')
  }
  if (directorCount <= 1) {
    throw new Error('Impossible de retirer le dernier directeur actif de cet établissement.')
  }
}

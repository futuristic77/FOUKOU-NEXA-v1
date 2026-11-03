export function tryStartSubmission(lock) {
  if (lock.current) return false
  lock.current = true
  return true
}

export function finishSubmission(lock) {
  lock.current = false
}

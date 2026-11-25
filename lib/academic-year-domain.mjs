import { isIsoCalendarDate } from './validation-helpers.mjs'

export function assertValidSchoolYearDates(startDate, endDate) {
  if (!isIsoCalendarDate(startDate) || !isIsoCalendarDate(endDate)) {
    throw new Error('Les dates de début et de fin de l’année scolaire sont requises et doivent être valides.')
  }
  if (startDate >= endDate) {
    throw new Error('La date de fin doit être postérieure à la date de début.')
  }
}

export function isSchoolYearEditable(status) {
  return status === 'prepared' || status === 'active'
}

export function schoolYearStatusLabel(status) {
  return {
    prepared: 'Préparée',
    active: 'Active',
    closed: 'Clôturée',
  }[status] ?? 'Inconnue'
}

export function enrollmentStatusLabel(status) {
  return {
    enrolled: 'Inscrit',
    withdrawn: 'Retiré',
    transferred: 'Transféré',
    completed: 'Terminé',
  }[status] ?? 'Inconnu'
}

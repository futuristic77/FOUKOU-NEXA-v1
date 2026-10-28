/** Calcule une moyenne normalisée sur 20 sans inventer de note manquante. */
export function calculateReportCard(grades, subjects) {
  const subjectMap = new Map(subjects.map((subject) => [subject.id, subject]))
  const grouped = new Map()
  for (const grade of grades) {
    const subject = subjectMap.get(grade.subjectId)
    if (!subject) continue
    const current = grouped.get(grade.subjectId) ?? { earned: 0, possible: 0, count: 0 }
    current.earned += Number(grade.score)
    current.possible += Number(grade.maxScore)
    current.count += 1
    grouped.set(grade.subjectId, current)
  }
  const rows = []
  for (const [subjectId, totals] of grouped) {
    if (totals.possible <= 0) continue
    const subject = subjectMap.get(subjectId)
    rows.push({
      subjectId,
      subject: subject.name,
      coefficient: Number(subject.coefficient),
      assessmentCount: totals.count,
      average: round((totals.earned / totals.possible) * 20),
    })
  }
  const coefficientTotal = rows.reduce((sum, row) => sum + row.coefficient, 0)
  const average = coefficientTotal > 0
    ? round(rows.reduce((sum, row) => sum + row.average * row.coefficient, 0) / coefficientTotal)
    : null
  return { rows: rows.sort((a, b) => a.subject.localeCompare(b.subject, 'fr')), average }
}

export function round(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function attendanceRate(records) {
  if (!records.length) return null
  const present = records.filter((record) => record.status === 'present' || record.status === 'late').length
  return round((present / records.length) * 100)
}

export function initials(name) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('')
}

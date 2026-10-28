import test from 'node:test'
import assert from 'node:assert/strict'
import { attendanceRate, calculateReportCard, initials, round } from '../lib/school-calculations.mjs'

const subjects = [{ id: 'math', name: 'Mathématiques', coefficient: 2 }, { id: 'fr', name: 'Français', coefficient: 1 }]

test('moyenne générale pondérée et normalisée sur 20', () => {
  const report = calculateReportCard([
    { subjectId: 'math', score: 10, maxScore: 20 },
    { subjectId: 'math', score: 20, maxScore: 20 },
    { subjectId: 'fr', score: 10, maxScore: 10 },
  ], subjects)
  assert.equal(report.rows.find((row) => row.subjectId === 'math').average, 15)
  assert.equal(report.rows.find((row) => row.subjectId === 'fr').average, 20)
  assert.equal(report.average, 16.67)
})

test('les matières sans note ne deviennent pas des zéros', () => {
  const report = calculateReportCard([{ subjectId: 'math', score: 8, maxScore: 10 }], subjects)
  assert.equal(report.rows.length, 1)
  assert.equal(report.average, 16)
})

test('un bulletin sans note reste non calculable', () => {
  assert.deepEqual(calculateReportCard([], subjects), { rows: [], average: null })
})

test('les coefficients et arrondis restent numériques', () => {
  const report = calculateReportCard([{ subjectId: 'math', score: '13', maxScore: '20' }], subjects)
  assert.equal(report.average, 13)
  assert.equal(round(10.005), 10.01)
})

test('le taux de présence compte les retards mais pas les absences excusées', () => {
  assert.equal(attendanceRate([{ status: 'present' }, { status: 'late' }, { status: 'absent' }, { status: 'excused' }]), 50)
  assert.equal(attendanceRate([]), null)
})

test('les initiales sont limitées à deux', () => {
  assert.equal(initials('Aya N’Dri Koné'), 'AN')
})

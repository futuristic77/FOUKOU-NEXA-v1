'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, FileCheck2, Printer, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { demoStudents } from './data'
import { BrandLockup } from './brand-mark'
import type { Student } from './types'
import { DemoNotice, PageHeading } from './shared'

const subjects = ['Mathématiques', 'Français', 'Sciences physiques']
const periods = ['Trimestre 1', 'Trimestre 2', 'Trimestre 3']
const coefficients = [1, 1, 2] as const

type GradeRow = {
  student: Student
  scores: [number, number, number]
  appreciation: string
}

function makeDemoRows(className: string, subject: string, period: string): GradeRow[] {
  const roster = demoStudents.filter((student) => student.className === className)
  const subjectOffset = Math.max(0, subjects.indexOf(subject))
  const periodOffset = Math.max(0, periods.indexOf(period))
  return roster.map((student, index) => {
    const base = 11 + ((index * 3 + subjectOffset * 2 + periodOffset) % 8)
    return {
      student,
      scores: [base, Math.min(20, base + ((index + 1) % 4) - 1), Math.min(20, base + ((index + subjectOffset) % 3))],
      appreciation: base >= 15 ? 'Un travail sérieux et régulier.' : 'Des efforts réguliers sont attendus.',
    }
  })
}

function average(scores: [number, number, number]) {
  const weightedTotal = scores.reduce((total, score, index) => total + score * coefficients[index], 0)
  return weightedTotal / coefficients.reduce((total, coefficient) => total + coefficient, 0)
}

export function GradesView() {
  const classOptions = Array.from(new Set(demoStudents.map((student) => student.className)))
  const [className, setClassName] = useState('5e B')
  const [subject, setSubject] = useState(subjects[0])
  const [period, setPeriod] = useState(periods[0])
  const [gradeBook, setGradeBook] = useState<Record<string, GradeRow[]>>({})
  const [actionMessage, setActionMessage] = useState('')
  const [previewRow, setPreviewRow] = useState<GradeRow | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const bookKey = `${className}|${subject}|${period}`
  const rows = gradeBook[bookKey] ?? makeDemoRows(className, subject, period)
  const classAverage = useMemo(() => rows.length ? rows.reduce((sum, row) => sum + average(row.scores), 0) / rows.length : 0, [rows])

  useEffect(() => {
    const dialog = dialogRef.current
    if (previewRow && dialog && !dialog.open) dialog.showModal()
    if (!previewRow && dialog?.open) dialog.close()
  }, [previewRow])

  function updateRow(studentId: string, update: Partial<Pick<GradeRow, 'scores' | 'appreciation'>>) {
    setGradeBook((current) => {
      const currentRows = current[bookKey] ?? rows
      return {
        ...current,
        [bookKey]: currentRows.map((row) => row.student.id === studentId ? { ...row, ...update } : row),
      }
    })
  }

  function updateScore(row: GradeRow, index: number, rawValue: string) {
    const nextScores: [number, number, number] = [...row.scores]
    const numericValue = rawValue === '' ? 0 : Number(rawValue)
    nextScores[index] = Number.isFinite(numericValue) ? Math.min(20, Math.max(0, numericValue)) : 0
    updateRow(row.student.id, { scores: nextScores })
  }

  const reportAverage = previewRow ? average(previewRow.scores) : 0

  return (
    <div className="section-view">
      <PageHeading
        eyebrow="ÉVALUATIONS · TRIMESTRE 1"
        title="Notes et bulletins"
        description="Saisissez les évaluations, vérifiez les moyennes pondérées et prévisualisez un bulletin A4."
        actions={<Button variant="outline" onClick={() => setActionMessage('La validation officielle est indisponible : aucun serveur d’établissement ni rôle de validation n’est connecté.')}><ShieldCheck data-icon="inline-start" aria-hidden="true" />État de validation</Button>}
      />
      <DemoNotice>Les notes et moyennes sont des exemples modifiables en session. La validation officielle n’est pas active sans connexion à l’établissement.</DemoNotice>

      <Card className="grades-card">
        <CardHeader className="grades-toolbar">
          <div className="grades-filters">
            <label className="form-field compact-form-field"><span>Classe</span><select value={className} onChange={(event) => { setClassName(event.target.value); setActionMessage('') }}>{classOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
            <label className="form-field compact-form-field"><span>Matière</span><select value={subject} onChange={(event) => { setSubject(event.target.value); setActionMessage('') }}>{subjects.map((option) => <option key={option}>{option}</option>)}</select></label>
            <label className="form-field compact-form-field"><span>Période</span><select value={period} onChange={(event) => { setPeriod(event.target.value); setActionMessage('') }}>{periods.map((option) => <option key={option}>{option}</option>)}</select></label>
          </div>
          <div className="grades-average-summary"><span>Moyenne de la classe · démo</span><strong>{classAverage.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}<small>/20</small></strong></div>
        </CardHeader>

        {actionMessage ? <p className="session-message" role="status">{actionMessage}</p> : null}

        <div className="table-scroll desktop-record-table">
          <table className="data-table grades-table">
            <thead><tr><th scope="col">Élève</th><th scope="col">Évaluation 1 <span className="coefficient">Coeff. 1</span></th><th scope="col">Évaluation 2 <span className="coefficient">Coeff. 1</span></th><th scope="col">Évaluation 3 <span className="coefficient">Coeff. 2</span></th><th scope="col">Moyenne</th><th scope="col">Appréciation</th><th scope="col">Bulletin</th></tr></thead>
            <tbody>{rows.map((row) => (
              <tr key={row.student.id}>
                <td><strong>{row.student.name}</strong><span className="table-subline">{row.student.id}</span></td>
                {row.scores.map((score, index) => <td key={index}><label className="visually-hidden" htmlFor={`${row.student.id}-score-${index}`}>{`Note ${index + 1} de ${row.student.name}, sur 20`}</label><input id={`${row.student.id}-score-${index}`} className="grade-input" type="number" min="0" max="20" step="0.25" value={score} onChange={(event) => updateScore(row, index, event.target.value)} /></td>)}
                <td><strong className="grade-average">{average(row.scores).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}<small>/20</small></strong></td>
                <td><label className="visually-hidden" htmlFor={`${row.student.id}-appreciation`}>Appréciation de {row.student.name}</label><input id={`${row.student.id}-appreciation`} className="appreciation-input" value={row.appreciation} onChange={(event) => updateRow(row.student.id, { appreciation: event.target.value })} /></td>
                <td><Button variant="ghost" size="sm" onClick={() => setPreviewRow(row)}>A4 <ArrowRight data-icon="inline-end" aria-hidden="true" /></Button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>

        <div className="mobile-grade-list">
          {rows.map((row) => (
            <article className="grade-mobile-card" key={row.student.id}>
              <div className="mobile-record-heading"><div><strong>{row.student.name}</strong><span>{row.student.className} · dossier exemple</span></div><strong className="grade-average">{average(row.scores).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}<small>/20</small></strong></div>
              <div className="mobile-score-grid">{row.scores.map((score, index) => <label className="form-field" key={index}><span>Éval. {index + 1} · coeff. {coefficients[index]}</span><input className="grade-input" type="number" min="0" max="20" step="0.25" value={score} aria-label={`Note ${index + 1} de ${row.student.name}, sur 20`} onChange={(event) => updateScore(row, index, event.target.value)} /></label>)}</div>
              <label className="form-field"><span>Appréciation</span><textarea className="appreciation-textarea" value={row.appreciation} onChange={(event) => updateRow(row.student.id, { appreciation: event.target.value })} /></label>
              <Button variant="outline" size="sm" onClick={() => setPreviewRow(row)}><FileCheck2 data-icon="inline-start" aria-hidden="true" />Prévisualiser le bulletin A4</Button>
            </article>
          ))}
        </div>

        <div className="grades-card-footer">
          <p><strong>Calcul appliqué :</strong> moyenne pondérée selon les coefficients affichés, arrondie au dixième.</p>
          <span>Les modifications restent dans la session de démonstration.</span>
        </div>
      </Card>

      <dialog ref={dialogRef} className="record-dialog bulletin-dialog" onClose={() => setPreviewRow(null)} aria-labelledby="bulletin-preview-title">
        {previewRow ? (
          <div className="bulletin-dialog-content">
            <div className="dialog-heading no-print"><div><p className="eyebrow">DOCUMENT · FORMAT A4</p><h2 id="bulletin-preview-title">Prévisualisation du bulletin</h2></div><button type="button" className="icon-quiet-button" aria-label="Fermer la prévisualisation" onClick={() => setPreviewRow(null)}><span aria-hidden="true">×</span></button></div>
            <BulletinDocument row={previewRow} className={className} subject={subject} period={period} mean={reportAverage} />
            <div className="bulletin-actions no-print"><p>Pour créer un PDF, choisissez « Enregistrer au format PDF » dans la boîte d’impression.</p><Button onClick={() => window.print()}><Printer data-icon="inline-start" aria-hidden="true" />Imprimer / exporter en PDF</Button></div>
          </div>
        ) : null}
      </dialog>
      <div className="print-page" aria-hidden="true">
        {previewRow ? <BulletinDocument row={previewRow} className={className} subject={subject} period={period} mean={reportAverage} /> : null}
      </div>
    </div>
  )
}

function BulletinDocument({
  row,
  className,
  subject,
  period,
  mean,
}: {
  row: GradeRow
  className: string
  subject: string
  period: string
  mean: number
}) {
  return (
    <article className="bulletin-document">
      <div className="bulletin-document-header">
        <div className="bulletin-brand-block"><BrandLockup className="bulletin-brand-art" /><p className="bulletin-school-line">Établissement scolaire · document de démonstration</p></div>
        <div className="bulletin-period"><span>ANNÉE SCOLAIRE</span><strong>2026–2027</strong><span>{period}</span></div>
      </div>
      <div className="bulletin-rule" />
      <p className="eyebrow">BULLETIN DE NOTES · APERÇU FICTIF</p>
      <h2>Relevé de {subject}</h2>
      <dl className="bulletin-student-details"><div><dt>Élève</dt><dd>{row.student.name}</dd></div><div><dt>Classe</dt><dd>{className}</dd></div><div><dt>Identifiant</dt><dd>{row.student.id}</dd></div></dl>
      <table className="bulletin-table"><thead><tr><th>Matière</th><th>Évaluation 1</th><th>Évaluation 2</th><th>Évaluation 3</th><th>Moyenne</th></tr></thead><tbody><tr><td>{subject}</td>{row.scores.map((score, index) => <td key={index}>{score.toLocaleString('fr-FR')}/20 <small>· coeff. {coefficients[index]}</small></td>)}<td><strong>{mean.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}/20</strong></td></tr></tbody></table>
      <section className="bulletin-appreciation"><h3>Appréciation</h3><p>{row.appreciation || 'Aucune appréciation saisie.'}</p></section>
      <p className="bulletin-demo-note">Document fictif généré dans une interface de démonstration. Il n’a aucune valeur administrative.</p>
      <div className="bulletin-signatures"><span>Le professeur</span><span>La direction</span></div>
    </article>
  )
}

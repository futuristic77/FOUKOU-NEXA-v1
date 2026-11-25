'use client'

import { useMemo, useState } from 'react'
import { CalendarDays, History, Plus, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { activateSchoolYear, closeSchoolYear, createAcademicYear, createStudentEnrollment, updateStudentEnrollment } from '@/app/actions'
import { hasPermission } from '@/lib/permissions.mjs'
import { enrollmentStatusLabel, schoolYearStatusLabel } from '@/lib/academic-year-domain.mjs'
import type { EnrollmentStatus, SchoolData, SchoolYear, StudentEnrollment } from './types'
import { ActionForm, HiddenId } from './action-form'
import { EmptyState, PageHeading } from './shared'

const enrollmentStatuses: EnrollmentStatus[] = ['enrolled', 'withdrawn', 'transferred', 'completed']

export function AcademicYearsView({ data }: { data: SchoolData }) {
  const [selectedYearId, setSelectedYearId] = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [createFormOpen, setCreateFormOpen] = useState(false)
  const canManageYears = hasPermission(data.user.role, 'settings:write')
  const canEnroll = hasPermission(data.user.role, 'students:write')
  const selectedYear = data.schoolYears.find((year) => year.id === selectedYearId)
    ?? data.schoolYears.find((year) => year.status === 'active')
    ?? data.schoolYears[0]
  const yearEnrollments = useMemo(
    () => data.studentEnrollments.filter((enrollment) => enrollment.schoolYearId === selectedYear?.id),
    [data.studentEnrollments, selectedYear?.id],
  )
  const enrolledStudentIds = new Set(yearEnrollments.map((enrollment) => enrollment.studentId))
  const unregisteredStudents = data.students.filter((student) => !enrolledStudentIds.has(student.id))
  const studentHistory = data.studentEnrollments.filter((enrollment) => enrollment.studentId === selectedStudentId)
  const studentClassHistory = data.enrollmentClassChanges.filter((change) => change.studentId === selectedStudentId)

  return <div className="section-view">
    <PageHeading eyebrow="PARCOURS SCOLAIRE" title="Années scolaires et inscriptions" description="Préparez les années de chaque établissement et consultez les inscriptions sans écraser les dossiers antérieurs." actions={canManageYears ? <Button onClick={() => setCreateFormOpen((open) => !open)}><Plus data-icon="inline-start" aria-hidden="true" />Nouvelle année</Button> : undefined} />

    {createFormOpen && canManageYears ? <SchoolYearForm onDone={() => setCreateFormOpen(false)} /> : null}

    <Card className="management-card academic-years-card">
      <CardHeader className="management-card-header academic-years-header">
        <div>
          <p className="eyebrow">CALENDRIER DE L’ÉTABLISSEMENT</p>
          <CardTitle>Années scolaires</CardTitle>
        </div>
        {selectedYear ? <label className="filter-select-wrap academic-year-picker"><span>Année consultée</span><select aria-label="Année scolaire consultée" value={selectedYear.id} onChange={(event) => setSelectedYearId(event.target.value)}>{data.schoolYears.map((year) => <option value={year.id} key={year.id}>{year.label} · {schoolYearStatusLabel(year.status)}</option>)}</select></label> : null}
      </CardHeader>
      <CardContent className="academic-years-content">
        {!data.schoolYears.length ? <EmptyState title="Aucune année scolaire" description="Créez une année préparée, puis activez-la lorsque l’établissement est prêt." /> : <div className="academic-year-list">
          {data.schoolYears.map((year) => <SchoolYearCard key={year.id} year={year} selected={year.id === selectedYear?.id} canManage={canManageYears} onSelect={() => setSelectedYearId(year.id)} />)}
        </div>}
      </CardContent>
    </Card>

    {selectedYear ? <>
      <Card className="management-card academic-years-card">
        <CardHeader className="management-card-header academic-years-header">
          <div>
            <p className="eyebrow">{selectedYear.label.toLocaleUpperCase('fr-FR')}</p>
            <CardTitle>Inscriptions de l’année</CardTitle>
          </div>
          <span className={`academic-year-status status-${selectedYear.status}`}>{schoolYearStatusLabel(selectedYear.status)}</span>
        </CardHeader>
        <CardContent className="academic-years-content">
          <p className="academic-year-note">Les dossiers antérieurs ne sont pas convertis automatiquement. Une inscription conserve sa classe annuelle sans modifier la fiche élève historique. Les notes, présences, horaires et tableaux de bord restent sur le modèle précédent et ne sont pas filtrés par cette année.</p>
          {canEnroll && selectedYear.status !== 'closed' ? unregisteredStudents.length ? <EnrollmentForm year={selectedYear} students={unregisteredStudents} classes={data.classes} /> : <p className="academic-year-note">Tous les dossiers visibles sont déjà inscrits pour cette année.</p> : null}
          {yearEnrollments.length ? <div className="enrollment-list">
            {yearEnrollments.map((enrollment) => <EnrollmentRow key={enrollment.id} enrollment={enrollment} classes={data.classes} canEdit={canEnroll && selectedYear.status !== 'closed'} />)}
          </div> : <EmptyState title="Aucune inscription pour cette année" description={selectedYear.status === 'closed' ? 'Cette année est clôturée et son historique est en lecture seule.' : 'Ajoutez un élève à cette année sans dupliquer son dossier personnel.'} />}
        </CardContent>
      </Card>

      <Card className="management-card academic-years-card">
        <CardHeader className="management-card-header academic-years-header">
          <div>
            <p className="eyebrow">CONSULTATION TRANSVERSALE</p>
            <CardTitle>Historique d’un élève</CardTitle>
          </div>
          <History aria-hidden="true" />
        </CardHeader>
        <CardContent className="academic-years-content">
          <label className="form-field academic-history-picker"><span>Élève</span><select value={selectedStudentId} onChange={(event) => setSelectedStudentId(event.target.value)}><option value="">Choisir un élève</option>{data.students.map((student) => <option value={student.id} key={student.id}>{student.fullName} · {student.studentNumber}</option>)}</select></label>
          {selectedStudentId ? <>
            {studentHistory.length ? <div className="table-scroll"><table className="data-table"><thead><tr><th>Année</th><th>Classe</th><th>Statut</th><th>Inscrit le</th></tr></thead><tbody>{studentHistory.map((enrollment) => <tr key={enrollment.id}><td>{enrollment.schoolYearLabel}</td><td>{enrollment.className}</td><td>{enrollmentStatusLabel(enrollment.status)}</td><td>{enrollment.enrolledAt}</td></tr>)}</tbody></table></div> : <p className="academic-year-note">Aucune inscription structurée trouvée pour cet élève. Les anciennes données restent inchangées.</p>}
            {studentClassHistory.length ? <div className="academic-class-history"><h3><RotateCcw aria-hidden="true" /> Changements de classe</h3><ul>{studentClassHistory.map((change) => <li key={change.id}><span>{change.effectiveOn}</span><strong>{change.schoolYearLabel}</strong><span>{change.classBeforeName ? `${change.classBeforeName} → ` : 'Première classe · '}{change.classAfterName}</span></li>)}</ul></div> : null}
          </> : <p className="academic-year-note">Sélectionnez un élève pour afficher ses inscriptions et ses changements de classe conservés.</p>}
        </CardContent>
      </Card>
    </> : null}
  </div>
}

function SchoolYearForm({ onDone }: { onDone: () => void }) {
  return <ActionForm action={createAcademicYear} className="inline-form academic-year-form" onSuccess={onDone} resetOnSuccess>
    <div className="inline-form-heading"><div><p className="eyebrow">NOUVELLE PÉRIODE</p><h2>Préparer une année scolaire</h2></div><CalendarDays aria-hidden="true" /></div>
    <div className="form-grid form-grid-3">
      <label className="form-field"><span>Nom ou libellé</span><input name="label" required minLength={2} maxLength={100} placeholder="Ex. Année scolaire 2027-2028" /></label>
      <label className="form-field"><span>Date de début</span><input name="startDate" type="date" required /></label>
      <label className="form-field"><span>Date de fin</span><input name="endDate" type="date" required /></label>
    </div>
    <div className="inline-form-footer"><span>La nouvelle année sera préparée, sans modifier les données existantes.</span><Button type="submit">Créer l’année</Button></div>
  </ActionForm>
}

function SchoolYearCard({ year, selected, canManage, onSelect }: { year: SchoolYear; selected: boolean; canManage: boolean; onSelect: () => void }) {
  return <article className={`academic-year-item${selected ? ' is-selected' : ''}`}>
    <button className="academic-year-choice" type="button" aria-pressed={selected} onClick={onSelect}>
      <span className="academic-year-choice-heading"><strong>{year.label}</strong><span className={`academic-year-status status-${year.status}`}>{schoolYearStatusLabel(year.status)}</span></span>
      <span>{year.startDate} — {year.endDate}</span>
    </button>
    {canManage ? <div className="academic-year-actions">
      {year.status !== 'active' && year.status !== 'closed' ? <ActionForm action={activateSchoolYear} confirm={`Activer « ${year.label} » ? L’année active précédente sera clôturée automatiquement.`}><HiddenId id={year.id} /><Button type="submit" size="sm" variant="outline">Activer</Button></ActionForm> : null}
      {year.status !== 'closed' ? <ActionForm action={closeSchoolYear} confirm={`Clôturer « ${year.label} » ? Ses inscriptions deviendront consultables en lecture seule.`}><HiddenId id={year.id} /><Button type="submit" size="sm" variant="ghost">Clôturer</Button></ActionForm> : null}
    </div> : null}
  </article>
}

function EnrollmentForm({ year, students, classes }: { year: SchoolYear; students: SchoolData['students']; classes: SchoolData['classes'] }) {
  return <ActionForm action={createStudentEnrollment} className="inline-form enrollment-form" resetOnSuccess>
    <input type="hidden" name="schoolYearId" value={year.id} />
    <div className="form-grid form-grid-3">
      <label className="form-field"><span>Élève</span><select name="studentId" required defaultValue=""><option value="" disabled>Choisir un dossier</option>{students.map((student) => <option value={student.id} key={student.id}>{student.fullName} · {student.studentNumber}</option>)}</select></label>
      <label className="form-field"><span>Classe pour l’année</span><select name="classId" required defaultValue=""><option value="" disabled>Choisir une classe</option>{classes.map((classroom) => <option value={classroom.id} key={classroom.id}>{classroom.name} · {classroom.level}</option>)}</select></label>
      <label className="form-field"><span>Date d’inscription</span><input name="enrolledAt" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} /></label>
    </div>
    <div className="inline-form-footer"><span>Année : {year.label}</span><Button type="submit">Inscrire l’élève</Button></div>
  </ActionForm>
}

function EnrollmentRow({ enrollment, classes, canEdit }: { enrollment: StudentEnrollment; classes: SchoolData['classes']; canEdit: boolean }) {
  return <article className="enrollment-row">
    <div className="enrollment-row-main"><div><strong>{enrollment.studentName}</strong><span>{enrollment.enrolledAt} · {enrollmentStatusLabel(enrollment.status)}</span></div><span className="enrollment-class-name">{enrollment.className}</span></div>
    {canEdit ? <details className="record-editor enrollment-editor"><summary>Modifier</summary><ActionForm action={updateStudentEnrollment} className="inline-form">
      <HiddenId id={enrollment.id} />
      <div className="form-grid form-grid-2">
        <label className="form-field"><span>Classe</span><select name="classId" defaultValue={enrollment.classId}>{classes.map((classroom) => <option value={classroom.id} key={classroom.id}>{classroom.name}</option>)}</select></label>
        <label className="form-field"><span>Statut</span><select name="status" defaultValue={enrollment.status}>{enrollmentStatuses.map((status) => <option value={status} key={status}>{enrollmentStatusLabel(status)}</option>)}</select></label>
        <label className="form-field"><span>Date d’effet de la classe</span><input name="effectiveOn" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} /></label>
      </div>
      <div className="inline-form-footer"><span>Chaque changement de classe est conservé dans l’historique.</span><Button type="submit" size="sm">Enregistrer</Button></div>
    </ActionForm></details> : null}
  </article>
}

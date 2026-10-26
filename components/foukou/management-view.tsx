'use client'

import { useEffect, useMemo, useRef, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react'
import { ArrowDownUp, ArrowRight, Plus, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Classroom, Student } from './types'
import { DemoNotice, EmptyState, PageHeading } from './shared'

const PAGE_SIZE = 5

type StudentTab = 'students' | 'classes'

export function ManagementView({
  students,
  setStudents,
  classrooms,
  setClassrooms,
}: {
  students: Student[]
  setStudents: Dispatch<SetStateAction<Student[]>>
  classrooms: Classroom[]
  setClassrooms: Dispatch<SetStateAction<Classroom[]>>
}) {
  const [tab, setTab] = useState<StudentTab>('students')
  const [search, setSearch] = useState('')
  const [classFilter, setClassFilter] = useState('Toutes les classes')
  const [page, setPage] = useState(1)
  const [ascending, setAscending] = useState(true)
  const [studentFormOpen, setStudentFormOpen] = useState(false)
  const [classFormOpen, setClassFormOpen] = useState(false)
  const [studentName, setStudentName] = useState('')
  const [studentClass, setStudentClass] = useState('')
  const [newClassName, setNewClassName] = useState('')
  const [newClassLevel, setNewClassLevel] = useState('Collège · 6e')
  const [newClassRoom, setNewClassRoom] = useState('')
  const [message, setMessage] = useState('')
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const detailDialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = detailDialogRef.current
    if (selectedStudent && dialog && !dialog.open) dialog.showModal()
    if (!selectedStudent && dialog?.open) dialog.close()
  }, [selectedStudent])

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('fr-FR')
    return [...students]
      .filter((student) => classFilter === 'Toutes les classes' || student.className === classFilter)
      .filter((student) => !query || `${student.name} ${student.id} ${student.className}`.toLocaleLowerCase('fr-FR').includes(query))
      .sort((first, second) => first.name.localeCompare(second.name, 'fr-FR') * (ascending ? 1 : -1))
  }, [ascending, classFilter, search, students])

  const pageCount = Math.max(1, Math.ceil(filteredStudents.length / PAGE_SIZE))
  const visibleStudents = filteredStudents.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function addStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = studentName.trim()
    if (!name || !studentClass) return
    const student: Student = {
      id: `DEMO-${Date.now().toString().slice(-5)}`,
      name,
      className: studentClass,
      status: 'Actif',
      enrolledAt: 'Aujourd’hui',
    }
    setStudents((current) => [student, ...current])
    setStudentName('')
    setStudentClass('')
    setStudentFormOpen(false)
    setPage(1)
    setMessage(`${name} apparaît dans cette session de démonstration. Aucune donnée n’a été sauvegardée.`)
  }

  function addClassroom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const label = newClassName.trim()
    if (!label) return
    const classroom: Classroom = {
      id: `DEMO-${Date.now().toString().slice(-5)}`,
      label,
      level: newClassLevel,
      leadTeacher: 'À affecter',
      room: newClassRoom.trim() || 'À définir',
      enrolled: 0,
    }
    setClassrooms((current) => [classroom, ...current])
    setNewClassName('')
    setNewClassRoom('')
    setClassFormOpen(false)
    setMessage(`${label} a été ajoutée à l’aperçu local uniquement. Aucune donnée n’a été sauvegardée.`)
  }

  const currentAction = tab === 'students'
    ? () => { setStudentFormOpen((open) => !open); setClassFormOpen(false) }
    : () => { setClassFormOpen((open) => !open); setStudentFormOpen(false) }

  return (
    <div className="section-view">
      <PageHeading
        eyebrow="VIE SCOLAIRE · DONNÉES EXEMPLES"
        title="Élèves et classes"
        description="Consultez les dossiers, les inscriptions et les classes de l’établissement."
        actions={<Button onClick={currentAction}><Plus data-icon="inline-start" aria-hidden="true" />{tab === 'students' ? 'Nouvelle inscription' : 'Nouvelle classe'}</Button>}
      />
      <DemoNotice>Les dossiers affichés sont fictifs. Les ajouts ci-dessous ne vivent que dans cette session et ne sont pas transmis à un serveur.</DemoNotice>

      <Card className="management-card">
        <CardHeader className="management-card-header">
          <div className="management-tabs" role="tablist" aria-label="Élèves et classes">
            <button type="button" role="tab" aria-selected={tab === 'students'} className={tab === 'students' ? 'is-selected' : ''} onClick={() => { setTab('students'); setStudentFormOpen(false); setClassFormOpen(false); setMessage('') }}>
              Élèves <span>{students.length}</span>
            </button>
            <button type="button" role="tab" aria-selected={tab === 'classes'} className={tab === 'classes' ? 'is-selected' : ''} onClick={() => { setTab('classes'); setStudentFormOpen(false); setClassFormOpen(false); setMessage('') }}>
              Classes <span>{classrooms.length}</span>
            </button>
          </div>
          <div className="management-toolbar">
            <label className="search-field">
              <Search aria-hidden="true" />
              <span className="visually-hidden">Rechercher dans la liste</span>
              <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder={tab === 'students' ? 'Nom, identifiant…' : 'Nom de la classe…'} />
              {search ? <button type="button" aria-label="Effacer la recherche" onClick={() => setSearch('')}><X aria-hidden="true" /></button> : null}
            </label>
            {tab === 'students' ? (
              <label className="filter-select-wrap">
                <span className="visually-hidden">Filtrer par classe</span>
                <select value={classFilter} onChange={(event) => { setClassFilter(event.target.value); setPage(1) }}>
                  <option>Toutes les classes</option>
                  {classrooms.map((classroom) => <option key={classroom.id}>{classroom.label}</option>)}
                </select>
              </label>
            ) : null}
          </div>
        </CardHeader>

        {message ? <p className="session-message" role="status">{message}</p> : null}

        {studentFormOpen && tab === 'students' ? (
          <form className="inline-form" onSubmit={addStudent}>
            <div className="inline-form-heading"><div><p className="eyebrow">INSCRIPTION · APERÇU LOCAL</p><h2>Créer un dossier de démonstration</h2></div><button type="button" className="icon-quiet-button" aria-label="Fermer le formulaire" onClick={() => setStudentFormOpen(false)}><X aria-hidden="true" /></button></div>
            <div className="form-grid form-grid-2">
              <label className="form-field"><span>Nom et prénom</span><input required value={studentName} onChange={(event) => setStudentName(event.target.value)} placeholder="Ex. Koffi Adjoua" autoComplete="off" /></label>
              <label className="form-field"><span>Classe</span><select required value={studentClass} onChange={(event) => setStudentClass(event.target.value)}><option value="">Choisir une classe</option>{classrooms.map((classroom) => <option key={classroom.id}>{classroom.label}</option>)}</select></label>
            </div>
            <div className="inline-form-footer"><span>Visible jusqu’au rechargement de la page · non sauvegardé</span><Button type="submit">Ajouter à la démo <ArrowRight data-icon="inline-end" aria-hidden="true" /></Button></div>
          </form>
        ) : null}

        {classFormOpen && tab === 'classes' ? (
          <form className="inline-form" onSubmit={addClassroom}>
            <div className="inline-form-heading"><div><p className="eyebrow">CLASSE · APERÇU LOCAL</p><h2>Créer une classe de démonstration</h2></div><button type="button" className="icon-quiet-button" aria-label="Fermer le formulaire" onClick={() => setClassFormOpen(false)}><X aria-hidden="true" /></button></div>
            <div className="form-grid form-grid-3">
              <label className="form-field"><span>Nom de la classe</span><input required value={newClassName} onChange={(event) => setNewClassName(event.target.value)} placeholder="Ex. 5e C" /></label>
              <label className="form-field"><span>Niveau</span><select value={newClassLevel} onChange={(event) => setNewClassLevel(event.target.value)}><option>Collège · 6e</option><option>Collège · 5e</option><option>Collège · 4e</option><option>Collège · 3e</option><option>Lycée · 2nde</option><option>Lycée · 1ère</option><option>Lycée · Terminale</option></select></label>
              <label className="form-field"><span>Salle (facultatif)</span><input value={newClassRoom} onChange={(event) => setNewClassRoom(event.target.value)} placeholder="À définir" /></label>
            </div>
            <div className="inline-form-footer"><span>Visible jusqu’au rechargement de la page · non sauvegardé</span><Button type="submit">Ajouter à la démo <ArrowRight data-icon="inline-end" aria-hidden="true" /></Button></div>
          </form>
        ) : null}

        {tab === 'students' ? (
          <>
            <div className="table-scroll desktop-record-table">
              <table className="data-table">
                <thead><tr><th scope="col"><button type="button" className="sort-button" onClick={() => setAscending((value) => !value)} aria-label={`Trier le nom ${ascending ? 'de Z à A' : 'de A à Z'}`}>Élève <ArrowDownUp aria-hidden="true" /></button></th><th scope="col">Classe</th><th scope="col">Identifiant</th><th scope="col">Inscription</th><th scope="col">Statut</th><th scope="col"><span className="visually-hidden">Actions</span></th></tr></thead>
                <tbody>
                  {visibleStudents.map((student) => (
                    <tr key={student.id}>
                      <td><button type="button" className="table-name-button" onClick={() => setSelectedStudent(student)}>{student.name}</button></td>
                      <td>{student.className}</td><td className="table-id">{student.id}</td><td>{student.enrolledAt}</td>
                      <td><span className={`status-pill ${student.status === 'Actif' ? 'status-positive' : 'status-review'}`}><span aria-hidden="true" />{student.status}</span></td>
                      <td><Button variant="ghost" size="sm" onClick={() => setSelectedStudent(student)}>Dossier <ArrowRight data-icon="inline-end" aria-hidden="true" /></Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {visibleStudents.length === 0 ? <EmptyState title="Aucun élève trouvé" description="Modifiez les filtres ou la recherche pour afficher des dossiers." /> : null}
            </div>
            <div className="mobile-record-list">
              {visibleStudents.map((student) => (
                <article className="mobile-record-card" key={student.id}>
                  <div className="mobile-record-heading"><div><strong>{student.name}</strong><span>{student.id}</span></div><span className={`status-pill ${student.status === 'Actif' ? 'status-positive' : 'status-review'}`}><span aria-hidden="true" />{student.status}</span></div>
                  <div className="mobile-record-meta"><span>Classe <strong>{student.className}</strong></span><span>Inscription <strong>{student.enrolledAt}</strong></span></div>
                  <Button variant="outline" size="sm" onClick={() => setSelectedStudent(student)}>Ouvrir le dossier <ArrowRight data-icon="inline-end" aria-hidden="true" /></Button>
                </article>
              ))}
              {visibleStudents.length === 0 ? <EmptyState title="Aucun élève trouvé" description="Modifiez les filtres ou la recherche pour afficher des dossiers." /> : null}
            </div>
          </>
        ) : (
          <ClassroomList classrooms={classrooms} search={search} onOpenClass={(classroom) => { setClassFilter(classroom.label); setTab('students'); setSearch(''); setPage(1) }} />
        )}

        {tab === 'students' ? (
          <div className="table-pagination">
            <span>{filteredStudents.length ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filteredStudents.length)} sur ${filteredStudents.length} dossiers de démonstration` : '0 dossier'}</span>
            <div><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Précédent</Button><span className="page-count">{page} / {pageCount}</span><Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>Suivant</Button></div>
          </div>
        ) : null}
      </Card>

      <dialog ref={detailDialogRef} className="record-dialog" onClose={() => setSelectedStudent(null)} aria-labelledby="student-detail-title">
        {selectedStudent ? (
          <div className="record-dialog-content">
            <div className="dialog-heading"><div><p className="eyebrow">DOSSIER · DÉMONSTRATION</p><h2 id="student-detail-title">{selectedStudent.name}</h2></div><button type="button" className="icon-quiet-button" aria-label="Fermer le dossier" onClick={() => setSelectedStudent(null)}><X aria-hidden="true" /></button></div>
            <dl className="record-detail-list"><div><dt>Identifiant</dt><dd>{selectedStudent.id}</dd></div><div><dt>Classe</dt><dd>{selectedStudent.className}</dd></div><div><dt>Inscription</dt><dd>{selectedStudent.enrolledAt}</dd></div><div><dt>Statut</dt><dd>{selectedStudent.status}</dd></div></dl>
            <p className="dialog-note">Fiche de démonstration. Aucun dossier élève réel n’est consulté.</p>
            <Button variant="outline" onClick={() => setSelectedStudent(null)}>Fermer</Button>
          </div>
        ) : null}
      </dialog>
    </div>
  )
}

function ClassroomList({
  classrooms,
  search,
  onOpenClass,
}: {
  classrooms: Classroom[]
  search: string
  onOpenClass: (classroom: Classroom) => void
}) {
  const filtered = classrooms.filter((classroom) => `${classroom.label} ${classroom.level} ${classroom.leadTeacher}`.toLocaleLowerCase('fr-FR').includes(search.trim().toLocaleLowerCase('fr-FR')))

  if (filtered.length === 0) return <EmptyState title="Aucune classe trouvée" description="Essayez une autre recherche." />

  return (
    <>
      <div className="table-scroll desktop-record-table">
        <table className="data-table">
          <thead><tr><th scope="col">Classe</th><th scope="col">Niveau</th><th scope="col">Professeur principal</th><th scope="col">Salle</th><th scope="col">Effectif démo</th><th scope="col"><span className="visually-hidden">Actions</span></th></tr></thead>
          <tbody>{filtered.map((classroom) => <tr key={classroom.id}><td><strong>{classroom.label}</strong></td><td>{classroom.level}</td><td>{classroom.leadTeacher}</td><td>{classroom.room}</td><td>{classroom.enrolled}</td><td><Button variant="ghost" size="sm" onClick={() => onOpenClass(classroom)}>Voir les élèves <ArrowRight data-icon="inline-end" aria-hidden="true" /></Button></td></tr>)}</tbody>
        </table>
      </div>
      <div className="mobile-record-list">
        {filtered.map((classroom) => (
          <article className="mobile-record-card" key={classroom.id}>
            <div className="mobile-record-heading"><div><strong>{classroom.label}</strong><span>{classroom.level}</span></div><span className="class-count-badge">{classroom.enrolled} élèves · démo</span></div>
            <div className="mobile-record-meta"><span>Référent <strong>{classroom.leadTeacher}</strong></span><span>Salle <strong>{classroom.room}</strong></span></div>
            <Button variant="outline" size="sm" onClick={() => onOpenClass(classroom)}>Voir les élèves <ArrowRight data-icon="inline-end" aria-hidden="true" /></Button>
          </article>
        ))}
      </div>
    </>
  )
}

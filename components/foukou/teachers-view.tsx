'use client'

import { useMemo, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react'
import { ArrowRight, CalendarDays, FileCheck2, Plus, Search, UsersRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Teacher, ViewKey } from './types'
import { DemoNotice, EmptyState, PageHeading } from './shared'

export function TeachersView({
  teachers,
  setTeachers,
  onNavigate,
}: {
  teachers: Teacher[]
  setTeachers: Dispatch<SetStateAction<Teacher[]>>
  onNavigate: (view: ViewKey) => void
}) {
  const [search, setSearch] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('Toutes les matières')
  const [formOpen, setFormOpen] = useState(false)
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [classes, setClasses] = useState('')
  const [message, setMessage] = useState('')
  const subjects = Array.from(new Set(teachers.map((teacher) => teacher.subject))).sort((a, b) => a.localeCompare(b, 'fr'))

  const filteredTeachers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('fr-FR')
    return teachers.filter((teacher) => subjectFilter === 'Toutes les matières' || teacher.subject === subjectFilter)
      .filter((teacher) => !query || `${teacher.name} ${teacher.subject} ${teacher.classes.join(' ')}`.toLocaleLowerCase('fr-FR').includes(query))
  }, [search, subjectFilter, teachers])

  function addTeacher(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim() || !subject.trim()) return
    const teacher: Teacher = {
      id: `DEMO-${Date.now().toString().slice(-5)}`,
      name: name.trim(),
      subject: subject.trim(),
      classes: classes.split(',').map((item) => item.trim()).filter(Boolean),
      nextAssessment: 'À planifier',
      status: 'En poste',
    }
    setTeachers((current) => [teacher, ...current])
    setName('')
    setSubject('')
    setClasses('')
    setFormOpen(false)
    setMessage(`${teacher.name} apparaît dans l’annuaire de cette démo uniquement. Aucune donnée n’a été sauvegardée.`)
  }

  return (
    <div className="section-view">
      <PageHeading
        eyebrow="ÉQUIPE PÉDAGOGIQUE · APERÇU"
        title="Espace enseignants"
        description="Affectations, échéances et accès rapides aux outils pédagogiques."
        actions={<Button onClick={() => setFormOpen((open) => !open)}><Plus data-icon="inline-start" aria-hidden="true" />Ajouter un enseignant</Button>}
      />
      <DemoNotice>Annuaire et workflows fictifs. Les permissions réelles et l’enregistrement des données nécessitent une connexion sécurisée à l’établissement.</DemoNotice>

      <div className="teacher-summary-grid">
        <Card className="teacher-summary-card"><CardContent><span className="summary-icon"><UsersRound aria-hidden="true" /></span><span className="summary-label">Enseignants illustrés</span><strong>{teachers.length}</strong><span className="summary-foot">dans cet aperçu</span></CardContent></Card>
        <Card className="teacher-summary-card"><CardContent><span className="summary-icon"><BookOpenMark /></span><span className="summary-label">Matières suivies</span><strong>{subjects.length}</strong><span className="summary-foot">exemples de disciplines</span></CardContent></Card>
        <Card className="teacher-summary-card"><CardContent><span className="summary-icon"><CalendarDays aria-hidden="true" /></span><span className="summary-label">Prochaine échéance</span><strong className="summary-date">28 oct.</strong><span className="summary-foot">contrôle · mathématiques</span></CardContent></Card>
      </div>

      <div className="teacher-workspace-grid">
        <Card className="management-card teacher-directory-card">
          <CardHeader className="management-card-header">
            <div><p className="eyebrow">ANNUAIRE EXEMPLE</p><CardTitle>Équipe enseignante</CardTitle></div>
            <div className="management-toolbar">
              <label className="search-field"><Search aria-hidden="true" /><span className="visually-hidden">Rechercher un enseignant</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nom ou matière…" /></label>
              <label className="filter-select-wrap"><span className="visually-hidden">Filtrer par matière</span><select value={subjectFilter} onChange={(event) => setSubjectFilter(event.target.value)}><option>Toutes les matières</option>{subjects.map((item) => <option key={item}>{item}</option>)}</select></label>
            </div>
          </CardHeader>
          {message ? <p className="session-message" role="status">{message}</p> : null}
          {formOpen ? (
            <form className="inline-form" onSubmit={addTeacher}>
              <div className="inline-form-heading"><div><p className="eyebrow">ENSEIGNANT · APERÇU LOCAL</p><h2>Ajouter à l’annuaire de démonstration</h2></div></div>
              <div className="form-grid form-grid-3">
                <label className="form-field"><span>Nom et prénom</span><input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex. Sira Koné" /></label>
                <label className="form-field"><span>Matière</span><input required value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Ex. Français" /></label>
                <label className="form-field"><span>Classes (séparées par des virgules)</span><input value={classes} onChange={(event) => setClasses(event.target.value)} placeholder="Ex. 5e B, 4e C" /></label>
              </div>
              <div className="inline-form-footer"><span>Ajout temporaire à cette session · non sauvegardé</span><Button type="submit">Ajouter à la démo <ArrowRight data-icon="inline-end" aria-hidden="true" /></Button></div>
            </form>
          ) : null}

          <div className="table-scroll desktop-record-table">
            <table className="data-table teacher-table">
              <thead><tr><th scope="col">Enseignant</th><th scope="col">Matière</th><th scope="col">Classes affectées</th><th scope="col">Prochaine évaluation</th><th scope="col">Statut démo</th></tr></thead>
              <tbody>{filteredTeachers.map((teacher) => <tr key={teacher.id}><td><strong>{teacher.name}</strong><span className="table-subline">{teacher.id}</span></td><td>{teacher.subject}</td><td>{teacher.classes.length ? teacher.classes.join(' · ') : 'À affecter'}</td><td>{teacher.nextAssessment}</td><td><span className={`status-pill ${teacher.status === 'En poste' ? 'status-positive' : 'status-review'}`}><span aria-hidden="true" />{teacher.status}</span></td></tr>)}</tbody>
            </table>
            {filteredTeachers.length === 0 ? <EmptyState title="Aucun résultat" description="Essayez une autre recherche ou matière." /> : null}
          </div>
          <div className="mobile-record-list">
            {filteredTeachers.map((teacher) => <article className="mobile-record-card" key={teacher.id}><div className="mobile-record-heading"><div><strong>{teacher.name}</strong><span>{teacher.subject}</span></div><span className={`status-pill ${teacher.status === 'En poste' ? 'status-positive' : 'status-review'}`}><span aria-hidden="true" />{teacher.status}</span></div><div className="mobile-record-meta"><span>Classes <strong>{teacher.classes.join(' · ') || 'À affecter'}</strong></span><span>Évaluation <strong>{teacher.nextAssessment}</strong></span></div></article>)}
            {filteredTeachers.length === 0 ? <EmptyState title="Aucun résultat" description="Essayez une autre recherche ou matière." /> : null}
          </div>
        </Card>

        <aside className="teacher-actions-column">
          <Card className="teacher-workflow-card">
            <CardHeader className="panel-heading"><div className="panel-title-wrap"><span className="panel-title-icon"><FileCheck2 aria-hidden="true" /></span><CardTitle>Mon espace pédagogique</CardTitle></div><span className="small-demo-tag">APERÇU</span></CardHeader>
            <CardContent>
              <p className="workflow-copy">Accédez aux actions liées aux cours, évaluations et appels de présence.</p>
              <div className="workflow-item"><span className="workflow-number">01</span><div><strong>Saisie des notes</strong><span>Relevés de la période en cours</span></div><Button variant="outline" size="sm" onClick={() => onNavigate('grades')}>Ouvrir <ArrowRight data-icon="inline-end" aria-hidden="true" /></Button></div>
              <div className="workflow-item"><span className="workflow-number">02</span><div><strong>Appel de présence</strong><span>État modifiable dans cette démo</span></div><Button variant="outline" size="sm" onClick={() => onNavigate('schedule')}>Ouvrir <ArrowRight data-icon="inline-end" aria-hidden="true" /></Button></div>
              <div className="workflow-item"><span className="workflow-number">03</span><div><strong>Emploi du temps</strong><span>Planning pédagogique illustré</span></div><Button variant="outline" size="sm" onClick={() => onNavigate('schedule')}>Ouvrir <ArrowRight data-icon="inline-end" aria-hidden="true" /></Button></div>
            </CardContent>
          </Card>
          <Card className="deadline-card"><CardHeader className="panel-heading"><div className="panel-title-wrap"><span className="panel-title-icon"><CalendarDays aria-hidden="true" /></span><CardTitle>Échéances à venir</CardTitle></div></CardHeader><CardContent><div className="deadline-row"><time>28 OCT</time><div><strong>Contrôle de mathématiques</strong><span>5e B · exemple</span></div></div><div className="deadline-row"><time>30 OCT</time><div><strong>Devoir de français</strong><span>6e A · exemple</span></div></div><div className="deadline-row"><time>04 NOV</time><div><strong>Oral d’anglais</strong><span>2nde C · exemple</span></div></div></CardContent></Card>
        </aside>
      </div>
    </div>
  )
}

function BookOpenMark() {
  return <FileCheck2 aria-hidden="true" />
}

'use client'

import { useMemo, useState } from 'react'
import { CalendarDays, Check, Clock3, UsersRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { demoStudents } from './data'
import type { Student } from './types'
import { DemoNotice, EmptyState, PageHeading } from './shared'

type Lesson = { subject: string; className: string; teacher: string; room: string }

const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi']
const slots = [
  { time: '08:00', label: '08h00–09h00' },
  { time: '09:00', label: '09h00–10h00' },
  { time: '10:30', label: '10h30–11h30' },
  { time: '13:00', label: '13h00–14h00' },
  { time: '14:00', label: '14h00–15h00' },
]

const lessons: { day: string; time: string; lesson: Lesson }[] = [
  { day: 'Lundi', time: '08:00', lesson: { subject: 'Mathématiques', className: '5e B', teacher: 'K. Kouamé', room: 'Salle 12' } },
  { day: 'Lundi', time: '09:00', lesson: { subject: 'Français', className: '6e A', teacher: 'S. Touré', room: 'Salle 04' } },
  { day: 'Lundi', time: '10:30', lesson: { subject: 'Sciences physiques', className: '4e C', teacher: 'Y. Koné', room: 'Laboratoire' } },
  { day: 'Lundi', time: '13:00', lesson: { subject: 'Histoire-géographie', className: '5e B', teacher: 'M. Diallo', room: 'Salle 12' } },
  { day: 'Mardi', time: '08:00', lesson: { subject: 'Anglais', className: '6e A', teacher: 'A. N’Dri', room: 'Salle 04' } },
  { day: 'Mardi', time: '09:00', lesson: { subject: 'Mathématiques', className: '4e C', teacher: 'K. Kouamé', room: 'Salle 08' } },
  { day: 'Mardi', time: '10:30', lesson: { subject: 'Français', className: '3e A', teacher: 'S. Touré', room: 'Salle 02' } },
  { day: 'Mardi', time: '14:00', lesson: { subject: 'Éducation physique', className: '5e B', teacher: 'A. Bamba', room: 'Terrain' } },
  { day: 'Mercredi', time: '08:00', lesson: { subject: 'Sciences physiques', className: '2nde C', teacher: 'Y. Koné', room: 'Laboratoire' } },
  { day: 'Mercredi', time: '10:30', lesson: { subject: 'Anglais', className: '2nde C', teacher: 'A. N’Dri', room: 'Salle 16' } },
  { day: 'Mercredi', time: '13:00', lesson: { subject: 'Mathématiques', className: '5e B', teacher: 'K. Kouamé', room: 'Salle 12' } },
  { day: 'Jeudi', time: '08:00', lesson: { subject: 'Français', className: '6e A', teacher: 'S. Touré', room: 'Salle 04' } },
  { day: 'Jeudi', time: '09:00', lesson: { subject: 'Histoire-géographie', className: '3e A', teacher: 'M. Diallo', room: 'Salle 02' } },
  { day: 'Jeudi', time: '13:00', lesson: { subject: 'Mathématiques', className: '4e C', teacher: 'K. Kouamé', room: 'Salle 08' } },
  { day: 'Vendredi', time: '08:00', lesson: { subject: 'Sciences physiques', className: '4e C', teacher: 'Y. Koné', room: 'Laboratoire' } },
  { day: 'Vendredi', time: '10:30', lesson: { subject: 'Anglais', className: '6e A', teacher: 'A. N’Dri', room: 'Salle 04' } },
  { day: 'Vendredi', time: '13:00', lesson: { subject: 'Éducation physique', className: '5e B', teacher: 'A. Bamba', room: 'Terrain' } },
]

export function ScheduleView({ students = demoStudents }: { students?: Student[] }) {
  const [activeTab, setActiveTab] = useState<'schedule' | 'attendance'>('schedule')
  const [classFilter, setClassFilter] = useState('Toutes les classes')
  const [selectedDay, setSelectedDay] = useState('Lundi')
  const [attendance, setAttendance] = useState<Record<string, boolean>>(() => Object.fromEntries(demoStudents.map((student, index) => [student.id, index !== 2])))
  const classOptions = Array.from(new Set(students.map((student) => student.className)))

  const visibleLessons = useMemo(() => lessons.filter(({ lesson }) => classFilter === 'Toutes les classes' || lesson.className === classFilter), [classFilter])
  const attendanceRows = students.filter((student) => classFilter === 'Toutes les classes' || student.className === classFilter)
  const presentCount = attendanceRows.filter((student) => attendance[student.id] !== false).length
  const presentRate = attendanceRows.length ? Math.round((presentCount / attendanceRows.length) * 100) : 0
  const todayLessons = visibleLessons.filter((item) => item.day === selectedDay).sort((a, b) => a.time.localeCompare(b.time))

  function lessonFor(day: string, time: string) {
    return visibleLessons.find((item) => item.day === day && item.time === time)?.lesson
  }

  return (
    <div className="section-view">
      <PageHeading
        eyebrow="ORGANISATION SCOLAIRE · APERÇU"
        title="Présences et emplois du temps"
        description="Consultez les cours de la semaine et explorez l’appel de présence sur un affichage tactile."
      />
      <DemoNotice>Planning et présences fictifs. Les changements d’appel ne sont visibles que dans cette session et ne sont pas transmis à l’établissement.</DemoNotice>

      <div className="schedule-controls-row">
        <div className="management-tabs schedule-tabs" role="tablist" aria-label="Choisir une vue">
          <button type="button" role="tab" aria-selected={activeTab === 'schedule'} className={activeTab === 'schedule' ? 'is-selected' : ''} onClick={() => setActiveTab('schedule')}><CalendarDays aria-hidden="true" />Emploi du temps</button>
          <button type="button" role="tab" aria-selected={activeTab === 'attendance'} className={activeTab === 'attendance' ? 'is-selected' : ''} onClick={() => setActiveTab('attendance')}><Check aria-hidden="true" />Présences</button>
        </div>
        <label className="form-field compact-form-field schedule-class-filter"><span>Classe</span><select value={classFilter} onChange={(event) => setClassFilter(event.target.value)}><option>Toutes les classes</option>{classOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
      </div>

      {activeTab === 'schedule' ? (
        <Card className="schedule-card">
          <CardHeader className="schedule-card-header"><div><p className="eyebrow">SEMAINE DU 26 OCTOBRE 2026 · DÉMO</p><CardTitle>Planning hebdomadaire</CardTitle></div><div className="schedule-legend"><span><i className="legend-dot lesson-dot-green" />Cours</span><span><i className="legend-dot lesson-dot-bronze" />Évaluation</span></div></CardHeader>
          <CardContent>
            <div className="table-scroll timetable-desktop">
              <table className="timetable-table">
                <thead><tr><th scope="col">Horaire</th>{days.map((day) => <th scope="col" key={day}>{day}</th>)}</tr></thead>
                <tbody>{slots.map((slot) => <tr key={slot.time}><th scope="row"><span>{slot.label}</span></th>{days.map((day) => {
                  const lesson = lessonFor(day, slot.time)
                  return <td key={day}>{lesson ? <div className={`lesson-block ${lesson.subject.includes('Sciences') ? 'lesson-block-alt' : ''}`}><strong>{lesson.subject}</strong><span>{lesson.className} · {lesson.room}</span><small>{lesson.teacher}</small></div> : <span className="empty-slot" aria-label="Aucun cours">—</span>}</td>
                })}</tr>)}</tbody>
              </table>
              {visibleLessons.length === 0 ? <EmptyState title="Aucun cours pour cette classe" description="Choisissez une autre classe dans les filtres." /> : null}
            </div>

            <div className="timetable-mobile">
              <label className="form-field compact-form-field"><span>Jour</span><select value={selectedDay} onChange={(event) => setSelectedDay(event.target.value)}>{days.map((day) => <option key={day}>{day}</option>)}</select></label>
              {todayLessons.length ? <div className="day-lesson-list">{todayLessons.map(({ time, lesson }) => <article className="day-lesson-card" key={`${selectedDay}-${time}`}><time>{slots.find((slot) => slot.time === time)?.label}</time><div><strong>{lesson.subject}</strong><span>{lesson.className} · {lesson.room}</span><small>{lesson.teacher}</small></div></article>)}</div> : <EmptyState title="Aucun cours prévu" description="Aucun cours de démonstration n’est programmé pour ce jour et cette classe." />}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="attendance-layout">
          <Card className="attendance-summary-card"><CardHeader className="panel-heading"><div className="panel-title-wrap"><span className="panel-title-icon"><UsersRound aria-hidden="true" /></span><CardTitle>Appel de présence</CardTitle></div><span className="small-demo-tag">SESSION</span></CardHeader><CardContent><p className="attendance-date"><Clock3 aria-hidden="true" />Lundi 26 octobre 2026 · matin</p><div className="attendance-rate"><strong>{presentRate}<small>%</small></strong><span>présence · exemple modifiable</span></div><div className="attendance-progress" role="progressbar" aria-label="Taux de présence de démonstration" aria-valuenow={presentRate} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${presentRate}%` }} /></div><p className="attendance-count">{presentCount} présents sur {attendanceRows.length} élèves affichés</p><p className="attendance-disclaimer">Cet appel n’est ni sauvegardé ni transmis.</p></CardContent></Card>
          <Card className="attendance-list-card"><CardHeader className="panel-heading"><div className="panel-title-wrap"><span className="panel-title-icon"><Check aria-hidden="true" /></span><CardTitle>Liste de classe · démo</CardTitle></div><span className="small-demo-tag">{attendanceRows.length} DOSSIERS</span></CardHeader><CardContent className="attendance-rows">
            {attendanceRows.map((student) => {
              const isPresent = attendance[student.id] !== false
              return <div className="attendance-row" key={student.id}><span className="attendance-avatar" aria-hidden="true">{student.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span><div className="attendance-student"><strong>{student.name}</strong><span>{student.className} · {student.id}</span></div><span className={`status-pill ${isPresent ? 'status-positive' : 'status-absent'}`}><span aria-hidden="true" />{isPresent ? 'Présent' : 'Absent'}</span><Button variant={isPresent ? 'outline' : 'secondary'} size="sm" aria-pressed={!isPresent} aria-label={`${isPresent ? 'Marquer absent' : 'Marquer présent'} : ${student.name}`} onClick={() => setAttendance((current) => ({ ...current, [student.id]: !isPresent }))}>{isPresent ? 'Marquer absent' : 'Marquer présent'}</Button></div>
            })}
            {attendanceRows.length === 0 ? <EmptyState title="Aucun élève dans ce filtre" description="Choisissez une classe avec des dossiers de démonstration." /> : null}
          </CardContent></Card>
        </div>
      )}
    </div>
  )
}

export type ViewKey =
  | 'dashboard'
  | 'students'
  | 'teachers'
  | 'grades'
  | 'schedule'
  | 'communication'
  | 'settings'

export interface Student {
  id: string
  name: string
  className: string
  status: 'Actif' | 'À vérifier'
  enrolledAt: string
}

export interface Classroom {
  id: string
  label: string
  level: string
  leadTeacher: string
  room: string
  enrolled: number
}

export interface Teacher {
  id: string
  name: string
  subject: string
  classes: string[]
  nextAssessment: string
  status: 'En poste' | 'À confirmer'
}

export interface Announcement {
  id: string
  title: string
  audience: string
  date: string
  status: 'Publié' | 'Brouillon'
  summary: string
}

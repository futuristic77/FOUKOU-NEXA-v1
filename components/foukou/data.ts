import type { Announcement, Classroom, Student, Teacher } from './types'

export const DEMO_LABEL = 'Données de démonstration · non connectées à un établissement'

export const demoStudents: Student[] = [
  { id: 'FN-26001', name: 'Agnès Kouassi', className: '6e A', status: 'Actif', enrolledAt: '08 sept. 2026' },
  { id: 'FN-26002', name: 'Yao Kouadio', className: '4e C', status: 'Actif', enrolledAt: '08 sept. 2026' },
  { id: 'FN-26003', name: 'Aya Diomandé', className: '5e B', status: 'Actif', enrolledAt: '09 sept. 2026' },
  { id: 'FN-26004', name: 'Mariam Traoré', className: '3e A', status: 'À vérifier', enrolledAt: '10 sept. 2026' },
  { id: 'FN-26005', name: 'Koffi N’Guessan', className: '6e A', status: 'Actif', enrolledAt: '10 sept. 2026' },
  { id: 'FN-26006', name: 'Fatou Bamba', className: '5e B', status: 'Actif', enrolledAt: '11 sept. 2026' },
  { id: 'FN-26007', name: 'Jean-Marc Yapi', className: '2nde C', status: 'Actif', enrolledAt: '11 sept. 2026' },
  { id: 'FN-26008', name: 'Aminata Koné', className: '4e C', status: 'Actif', enrolledAt: '12 sept. 2026' },
]

export const demoClassrooms: Classroom[] = [
  { id: 'CL-01', label: '6e A', level: 'Collège · 6e', leadTeacher: 'Mme A. Koffi', room: 'Salle 04', enrolled: 31 },
  { id: 'CL-02', label: '5e B', level: 'Collège · 5e', leadTeacher: 'M. K. Kouassi', room: 'Salle 12', enrolled: 28 },
  { id: 'CL-03', label: '4e C', level: 'Collège · 4e', leadTeacher: 'Mme S. Touré', room: 'Salle 08', enrolled: 30 },
  { id: 'CL-04', label: '3e A', level: 'Collège · 3e', leadTeacher: 'M. Y. Koné', room: 'Salle 02', enrolled: 26 },
  { id: 'CL-05', label: '2nde C', level: 'Lycée · 2nde', leadTeacher: 'Mme M. Diallo', room: 'Salle 16', enrolled: 34 },
]

export const demoTeachers: Teacher[] = [
  { id: 'EN-01', name: 'Kouassi Kouamé', subject: 'Mathématiques', classes: ['5e B', '4e C'], nextAssessment: 'Contrôle · 28 oct.', status: 'En poste' },
  { id: 'EN-02', name: 'Sira Touré', subject: 'Français', classes: ['6e A', '3e A'], nextAssessment: 'Devoir · 30 oct.', status: 'En poste' },
  { id: 'EN-03', name: 'Yao Koné', subject: 'Sciences physiques', classes: ['4e C', '2nde C'], nextAssessment: 'Évaluation · 02 nov.', status: 'En poste' },
  { id: 'EN-04', name: 'Mariam Diallo', subject: 'Histoire-géographie', classes: ['5e B', '3e A'], nextAssessment: 'À planifier', status: 'À confirmer' },
  { id: 'EN-05', name: 'Armand N’Dri', subject: 'Anglais', classes: ['6e A', '2nde C'], nextAssessment: 'Oral · 04 nov.', status: 'En poste' },
  { id: 'EN-06', name: 'Aya Bamba', subject: 'Éducation physique', classes: ['5e B', '4e C'], nextAssessment: 'À planifier', status: 'En poste' },
]

export const demoAnnouncements: Announcement[] = [
  {
    id: 'AN-01',
    title: 'Réunion parents-professeurs',
    audience: 'Toutes les familles',
    date: 'Samedi 7 novembre · 08h00',
    status: 'Publié',
    summary: 'Rencontre à l’établissement autour du premier trimestre.',
  },
  {
    id: 'AN-02',
    title: 'Conseil de classe · 6e A',
    audience: 'Équipe pédagogique',
    date: 'Jeudi 5 novembre · 16h30',
    status: 'Publié',
    summary: 'Les relevés de notes sont à vérifier avant la réunion.',
  },
  {
    id: 'AN-03',
    title: 'Rappel des fournitures',
    audience: 'Familles du collège',
    date: 'Brouillon',
    status: 'Brouillon',
    summary: 'Message de démonstration non envoyé.',
  },
]

export const enrollmentByYear = {
  '2026–2027': [
    { month: 'Jan', students: 942 },
    { month: 'Fév', students: 966 },
    { month: 'Mar', students: 981 },
    { month: 'Avr', students: 992 },
    { month: 'Mai', students: 1004 },
    { month: 'Juin', students: 1052 },
    { month: 'Juil', students: 1154 },
    { month: 'Août', students: 1148 },
    { month: 'Sep', students: 1167 },
    { month: 'Oct', students: 1248 },
  ],
  '2025–2026': [
    { month: 'Jan', students: 884 },
    { month: 'Fév', students: 901 },
    { month: 'Mar', students: 918 },
    { month: 'Avr', students: 927 },
    { month: 'Mai', students: 944 },
    { month: 'Juin', students: 981 },
    { month: 'Juil', students: 1032 },
    { month: 'Août', students: 1064 },
    { month: 'Sep', students: 1092 },
    { month: 'Oct', students: 1121 },
  ],
}

export const levelDistribution = [
  { level: '6e', students: 225, fill: 'var(--color-sixth)' },
  { level: '5e', students: 262, fill: 'var(--color-fifth)' },
  { level: '4e', students: 237, fill: 'var(--color-fourth)' },
  { level: '3e', students: 212, fill: 'var(--color-third)' },
  { level: '2nde', students: 158, fill: 'var(--color-second)' },
  { level: '1ère', students: 97, fill: 'var(--color-first)' },
  { level: 'Tle', students: 57, fill: 'var(--color-final)' },
]

export const demoActivities = [
  { id: 'AC-01', title: 'Nouvelle inscription', detail: 'Agnès Kouassi · 6e A', time: 'Il y a 2 h', kind: 'student' },
  { id: 'AC-02', title: 'Note ajoutée', detail: 'Mathématiques · 5e B', time: 'Il y a 4 h', kind: 'grade' },
  { id: 'AC-03', title: 'Absence signalée', detail: 'Yao Kouadio · 4e C', time: 'Il y a 5 h', kind: 'absence' },
  { id: 'AC-04', title: 'Message reçu', detail: 'De : Sira Touré', time: 'Il y a 6 h', kind: 'message' },
  { id: 'AC-05', title: 'Emploi du temps mis à jour', detail: 'Semaine du 26 octobre', time: 'Il y a 8 h', kind: 'schedule' },
] as const

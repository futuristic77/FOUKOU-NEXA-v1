import 'server-only'
import { db } from './db'
import { requireSchool, requireUser } from './auth'
import { hasPermission } from './permissions.mjs'
import { calculateReportCard, round } from './school-calculations.mjs'
import { loadSchoolRows } from './school-data-queries.mjs'
import { scopeSchoolDataForUser } from './teacher-scope.mjs'
import type { SchoolData } from './types'

export async function getSchoolData(): Promise<SchoolData> {
  const user = await requireUser()
  const schoolId = requireSchool(user)
  const sql = db()
  const {
    schools, settings, students, classes, teachers, subjects, assignments, grades,
    attendance, attendanceStats, schedules, communications, activities, enrollment,
    users, teacherIds,
  } = await loadSchoolRows(sql, user, schoolId, {
    includeUsers: hasPermission(user.role, 'users:write'),
  })
  if (!schools.length || !settings.length) throw new Error('Établissement ou paramètres introuvables. Exécutez les migrations et l’amorçage.')

  const mappedStudents = students.map((row) => ({ id: row.id, studentNumber: row.student_number, fullName: row.full_name, classId: row.class_id, className: row.class_name, birthDate: row.birth_date ?? '', guardianName: row.guardian_name, guardianPhone: row.guardian_phone, status: row.status, enrolledAt: row.enrolled_at }))
  const mappedSubjects = subjects.map((row) => ({ id: row.id, name: row.name, coefficient: Number(row.coefficient) }))
  const mappedGrades = grades.map((row) => ({ id: row.id, studentId: row.student_id, studentName: row.student_name, className: row.class_name, subjectId: row.subject_id, subjectName: row.subject_name, teacherId: row.teacher_id, term: row.term, assessment: row.assessment, score: Number(row.score), maxScore: Number(row.max_score), appreciation: row.appreciation, gradedAt: row.graded_at }))
  const currentTerm = settings[0].current_term
  const reports = mappedStudents.map((student) => {
    const report = calculateReportCard(mappedGrades.filter((grade) => grade.studentId === student.id && grade.term === currentTerm), mappedSubjects)
    return { studentId: student.id, studentName: student.fullName, className: student.className, term: currentTerm, ...report }
  })
  const mappedAttendance = attendance.map((row) => ({ id: row.id, studentId: row.student_id, studentName: row.student_name, classId: row.class_id, className: row.class_name, attendanceDate: row.attendance_date, status: row.status, notes: row.notes }))

  const data: SchoolData = {
    user,
    school: { id: schools[0].id, name: schools[0].name, city: schools[0].city, country: schools[0].country },
    settings: { academicYear: settings[0].academic_year, currentTerm, periodType: settings[0].period_type, yearStart: settings[0].year_start ?? '', yearEnd: settings[0].year_end ?? '', passingAverage: Number(settings[0].passing_average) },
    students: mappedStudents,
    classes: classes.map((row) => ({ id: row.id, name: row.name, level: row.level, room: row.room, leadTeacherId: row.lead_teacher_id, leadTeacher: row.lead_teacher, enrolled: Number(row.enrolled) })),
    teachers: teachers.map((row) => ({ id: row.id, fullName: row.full_name, email: row.email, phone: row.phone, status: row.status, assignments: (row.assignments as { class: string; subject: string }[]).map((item) => `${item.class} · ${item.subject}`) })),
    subjects: mappedSubjects,
    assignments: assignments.map((row) => ({ id: row.id, teacherId: row.teacher_id, teacherName: row.teacher_name, classId: row.class_id, className: row.class_name, subjectId: row.subject_id, subjectName: row.subject_name })),
    grades: mappedGrades,
    attendance: mappedAttendance,
    schedules: schedules.map((row) => ({ id: row.id, classId: row.class_id, className: row.class_name, teacherId: row.teacher_id, teacherName: row.teacher_name, subjectId: row.subject_id, subjectName: row.subject_name, weekday: Number(row.weekday), startsAt: row.starts_at, endsAt: row.ends_at, room: row.room })),
    communications: communications.map((row) => ({ id: row.id, title: row.title, body: row.body, audience: row.audience, status: row.status, publishedAt: row.published_at ? new Date(row.published_at).toISOString() : null, createdAt: new Date(row.created_at).toISOString(), authorName: row.author_name })),
    activities: activities.map((row) => ({ id: row.id, kind: row.kind, title: row.title, detail: row.detail, createdAt: new Date(row.created_at).toISOString() })),
    reports,
    attendanceRate: Number(attendanceStats[0].total) ? round((Number(attendanceStats[0].present) / Number(attendanceStats[0].total)) * 100) : null,
    enrollment: enrollment.map((row) => ({ month: row.month, students: Number(row.students) })),
    users: users.map((row) => ({ id: row.id, fullName: row.full_name, email: row.email, role: row.role, active: row.active })),
  }
  return scopeSchoolDataForUser(data, user, teacherIds)
}

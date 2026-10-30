import 'server-only'
import { db } from './db'
import { requireSchool, requireUser } from './auth'
import { hasPermission } from './permissions.mjs'
import { calculateReportCard, round } from './school-calculations.mjs'
import { scopeSchoolDataForUser } from './teacher-scope.mjs'
import type { SchoolData } from './types'

export async function getSchoolData(): Promise<SchoolData> {
  const user = await requireUser()
  const schoolId = requireSchool(user)
  const sql = db()
  const teacherProfiles = user.role === 'teacher'
    ? await sql`SELECT id, status FROM teachers WHERE user_id=${user.id} AND school_id=${schoolId} AND status='active'`
    : []
  const teacherIds = teacherProfiles.map((profile) => profile.id)
  const [schools, settings, students, classes, teachers, subjects, assignments, grades, attendance, attendanceStats, schedules, communications, activities, enrollment, users] = await Promise.all([
    sql`SELECT id, name, city, country FROM schools WHERE id=${schoolId}`,
    sql`SELECT academic_year, current_term, period_type, to_char(year_start, 'YYYY-MM-DD') AS year_start, to_char(year_end, 'YYYY-MM-DD') AS year_end, passing_average FROM school_settings WHERE school_id=${schoolId}`,
    sql`SELECT s.id, s.student_number, s.full_name, s.class_id, c.name AS class_name, to_char(s.birth_date, 'YYYY-MM-DD') AS birth_date, s.guardian_name, s.guardian_phone, s.status, to_char(s.enrolled_at, 'YYYY-MM-DD') AS enrolled_at FROM students s JOIN classes c ON c.id=s.class_id WHERE s.school_id=${schoolId} ORDER BY s.full_name`,
    sql`SELECT c.id, c.name, c.level, c.room, c.lead_teacher_id, COALESCE(t.full_name, 'À affecter') AS lead_teacher, COUNT(s.id) AS enrolled FROM classes c LEFT JOIN teachers t ON t.id=c.lead_teacher_id LEFT JOIN students s ON s.class_id=c.id WHERE c.school_id=${schoolId} GROUP BY c.id, t.full_name ORDER BY c.name`,
    sql`SELECT t.id, t.full_name, t.email, t.phone, t.status, COALESCE(json_agg(json_build_object('class', c.name, 'subject', sub.name)) FILTER (WHERE ta.id IS NOT NULL), '[]') AS assignments FROM teachers t LEFT JOIN teacher_assignments ta ON ta.teacher_id=t.id LEFT JOIN classes c ON c.id=ta.class_id LEFT JOIN subjects sub ON sub.id=ta.subject_id WHERE t.school_id=${schoolId} GROUP BY t.id ORDER BY t.full_name`,
    sql`SELECT id, name, coefficient FROM subjects WHERE school_id=${schoolId} ORDER BY name`,
    sql`SELECT ta.id, ta.teacher_id, t.full_name AS teacher_name, ta.class_id, c.name AS class_name, ta.subject_id, s.name AS subject_name FROM teacher_assignments ta JOIN teachers t ON t.id=ta.teacher_id JOIN classes c ON c.id=ta.class_id JOIN subjects s ON s.id=ta.subject_id WHERE ta.school_id=${schoolId} ORDER BY t.full_name, c.name, s.name`,
    sql`SELECT g.id, g.student_id, st.full_name AS student_name, c.name AS class_name, g.subject_id, sub.name AS subject_name, g.teacher_id, g.term, g.assessment, g.score, g.max_score, g.appreciation, to_char(g.graded_at, 'YYYY-MM-DD') AS graded_at FROM grades g JOIN students st ON st.id=g.student_id JOIN classes c ON c.id=st.class_id JOIN subjects sub ON sub.id=g.subject_id WHERE g.school_id=${schoolId} ORDER BY g.graded_at DESC, st.full_name`,
    sql`SELECT a.id, a.student_id, s.full_name AS student_name, a.class_id, c.name AS class_name, to_char(a.attendance_date, 'YYYY-MM-DD') AS attendance_date, a.status, a.notes FROM attendance a JOIN students s ON s.id=a.student_id JOIN classes c ON c.id=a.class_id WHERE a.school_id=${schoolId} ORDER BY a.attendance_date DESC, s.full_name LIMIT 2000`,
    user.role === 'teacher'
      ? sql`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE a.status IN ('present', 'late')) AS present FROM attendance a WHERE a.school_id=${schoolId} AND a.attendance_date >= CURRENT_DATE - interval '30 days' AND a.class_id IN (SELECT ta.class_id FROM teacher_assignments ta JOIN teachers t ON t.id=ta.teacher_id WHERE ta.school_id=${schoolId} AND t.school_id=${schoolId} AND t.user_id=${user.id} AND t.status='active')`
      : sql`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status IN ('present', 'late')) AS present FROM attendance WHERE school_id=${schoolId} AND attendance_date >= CURRENT_DATE - interval '30 days'`,
    sql`SELECT sc.id, sc.class_id, c.name AS class_name, sc.teacher_id, COALESCE(t.full_name, 'À affecter') AS teacher_name, sc.subject_id, sub.name AS subject_name, sc.weekday, to_char(sc.starts_at, 'HH24:MI') AS starts_at, to_char(sc.ends_at, 'HH24:MI') AS ends_at, sc.room FROM schedules sc JOIN classes c ON c.id=sc.class_id LEFT JOIN teachers t ON t.id=sc.teacher_id JOIN subjects sub ON sub.id=sc.subject_id WHERE sc.school_id=${schoolId} ORDER BY sc.weekday, sc.starts_at`,
    sql`SELECT co.id, co.title, co.body, co.audience, co.status, co.published_at, co.created_at, COALESCE(u.full_name, 'Compte supprimé') AS author_name FROM communications co LEFT JOIN users u ON u.id=co.author_id WHERE co.school_id=${schoolId} ORDER BY co.created_at DESC LIMIT 500`,
    sql`SELECT id, kind, title, detail, created_at FROM activity_logs WHERE school_id=${schoolId} ORDER BY created_at DESC LIMIT 12`,
    user.role === 'teacher'
      ? sql`WITH months AS (SELECT generate_series(date_trunc('month', CURRENT_DATE) - interval '11 months', date_trunc('month', CURRENT_DATE), interval '1 month') AS month), totals AS (SELECT date_trunc('month', enrolled_at) AS month, COUNT(*) AS count FROM students WHERE school_id=${schoolId} AND class_id IN (SELECT ta.class_id FROM teacher_assignments ta JOIN teachers t ON t.id=ta.teacher_id WHERE ta.school_id=${schoolId} AND t.school_id=${schoolId} AND t.user_id=${user.id} AND t.status='active') GROUP BY 1) SELECT to_char(months.month, 'TMMon') AS month, COALESCE((SELECT SUM(count) FROM totals WHERE totals.month <= months.month), 0) AS students FROM months ORDER BY months.month`
      : sql`WITH months AS (SELECT generate_series(date_trunc('month', CURRENT_DATE) - interval '11 months', date_trunc('month', CURRENT_DATE), interval '1 month') AS month), totals AS (SELECT date_trunc('month', enrolled_at) AS month, COUNT(*) AS count FROM students WHERE school_id=${schoolId} GROUP BY 1) SELECT to_char(months.month, 'TMMon') AS month, COALESCE((SELECT SUM(count) FROM totals WHERE totals.month <= months.month), 0) AS students FROM months ORDER BY months.month`,
    hasPermission(user.role, 'users:write') ? sql`SELECT id, full_name, email, role, active FROM users WHERE school_id=${schoolId} ORDER BY full_name` : Promise.resolve([]),
  ])
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

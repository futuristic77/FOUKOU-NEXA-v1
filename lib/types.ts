export type Role = 'super_admin' | 'director' | 'administration' | 'teacher' | 'secretary' | 'viewer'
export type ActionResult = { ok: boolean; message: string }
export interface SessionUser { id: string; schoolId: string | null; email: string; fullName: string; role: Role }
export interface School { id: string; name: string; city: string; country: string }
export interface Student { id: string; studentNumber: string; fullName: string; classId: string; className: string; birthDate: string; guardianName: string; guardianPhone: string; status: 'active' | 'inactive'; enrolledAt: string }
export interface Classroom { id: string; name: string; level: string; room: string; leadTeacherId: string | null; leadTeacher: string; enrolled: number }
export interface Teacher { id: string; fullName: string; email: string; phone: string; status: 'active' | 'inactive'; assignments: string[] }
export interface Subject { id: string; name: string; coefficient: number }
export interface Assignment { id: string; teacherId: string; teacherName: string; classId: string; className: string; subjectId: string; subjectName: string }
export interface Grade { id: string; studentId: string; studentName: string; className: string; subjectId: string; subjectName: string; teacherId: string | null; term: string; assessment: string; score: number; maxScore: number; appreciation: string; gradedAt: string }
export interface Attendance { id: string; studentId: string; studentName: string; classId: string; className: string; attendanceDate: string; status: 'present' | 'absent' | 'late' | 'excused'; notes: string }
export interface Schedule { id: string; classId: string; className: string; teacherId: string | null; teacherName: string; subjectId: string; subjectName: string; weekday: number; startsAt: string; endsAt: string; room: string }
export interface Communication { id: string; title: string; body: string; audience: string; status: 'draft' | 'published'; publishedAt: string | null; createdAt: string; authorName: string }
export interface SchoolSettings { academicYear: string; currentTerm: string; periodType: 'trimester' | 'semester'; yearStart: string; yearEnd: string; passingAverage: number }
export interface Activity { id: string; kind: string; title: string; detail: string; createdAt: string }
export interface UserAccount { id: string; fullName: string; email: string; role: Role; active: boolean }
export interface ReportCard { studentId: string; studentName: string; className: string; term: string; rows: { subjectId: string; subject: string; coefficient: number; assessmentCount: number; average: number }[]; average: number | null }
export interface SchoolData {
  user: SessionUser; school: School; settings: SchoolSettings;
  students: Student[]; classes: Classroom[]; teachers: Teacher[]; subjects: Subject[]; assignments: Assignment[];
  grades: Grade[]; attendance: Attendance[]; schedules: Schedule[]; communications: Communication[]; activities: Activity[];
  reports: ReportCard[]; attendanceRate: number | null; enrollment: { month: string; students: number }[]; users: UserAccount[];
}

'use server'

import { revalidatePath } from 'next/cache'
import { db, logActivity } from '@/lib/db'
import { requireSchool, requireUser } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions.mjs'
import { hasTeacherAssignment } from '@/lib/teacher-scope.mjs'
import { hashPassword, validatePassword } from '@/lib/password.mjs'
import { choice, date, email, id, integer, number, optionalText, text, time } from '@/lib/validation'
import type { ActionResult, Role, SessionUser } from '@/lib/types'

async function perform(permission: string, work: (user: SessionUser, schoolId: string) => Promise<string>): Promise<ActionResult> {
  try {
    const user = await requireUser(permission)
    const schoolId = requireSchool(user)
    const message = await work(user, schoolId)
    revalidatePath('/')
    return { ok: true, message }
  } catch (error) {
    console.error('Action scolaire refusée ou impossible', error)
    const isDatabaseError = typeof error === 'object' && error !== null && 'code' in error
    return { ok: false, message: isDatabaseError ? 'Opération impossible : vérifiez les doublons et les éléments encore liés.' : error instanceof Error ? error.message : 'Opération impossible.' }
  }
}

async function assertClass(sql: ReturnType<typeof db>, classId: string, schoolId: string) {
  const rows = await sql`SELECT id FROM classes WHERE id = ${classId} AND school_id = ${schoolId}`
  if (!rows.length) throw new Error('Classe introuvable dans cet établissement.')
}

async function assertTeacher(sql: ReturnType<typeof db>, teacherId: string | null, schoolId: string) {
  if (!teacherId) return
  const rows = await sql`SELECT id FROM teachers WHERE id = ${teacherId} AND school_id = ${schoolId}`
  if (!rows.length) throw new Error('Enseignant introuvable dans cet établissement.')
}

async function assertSubject(sql: ReturnType<typeof db>, subjectId: string, schoolId: string) {
  const rows = await sql`SELECT id FROM subjects WHERE id = ${subjectId} AND school_id = ${schoolId}`
  if (!rows.length) throw new Error('Matière introuvable dans cet établissement.')
}

async function assertStudent(sql: ReturnType<typeof db>, studentId: string, schoolId: string) {
  const rows = await sql`SELECT id, class_id FROM students WHERE id = ${studentId} AND school_id = ${schoolId}`
  if (!rows.length) throw new Error('Élève introuvable dans cet établissement.')
  return rows[0]
}

async function assertTeacherScope(user: SessionUser, schoolId: string, classId: string, subjectId?: string) {
  if (user.role !== 'teacher') return
  const sql = db()
  const rows = await sql`
    SELECT ta.class_id AS "classId", ta.subject_id AS "subjectId"
    FROM teacher_assignments ta
    JOIN teachers t ON t.id = ta.teacher_id
    WHERE t.user_id = ${user.id} AND t.school_id = ${schoolId} AND ta.school_id = ${schoolId}
  `
  if (!hasTeacherAssignment(rows, classId, subjectId)) throw new Error('Cette classe ou matière ne fait pas partie de vos affectations.')
}

export async function saveStudent(form: FormData): Promise<ActionResult> {
  return perform('students:write', async (user, schoolId) => {
    const studentId = id(form, 'id', false)
    const classId = id(form, 'classId')!
    const fullName = text(form, 'fullName', 2, 160)
    const studentNumber = text(form, 'studentNumber', 1, 50)
    const status = choice(form, 'status', ['active', 'inactive'] as const)
    const sql = db()
    await assertClass(sql, classId, schoolId)
    const values = { fullName, studentNumber, classId, status }
    if (studentId) {
      const result = await sql`UPDATE students SET full_name=${fullName}, student_number=${studentNumber}, class_id=${classId}, birth_date=${date(form, 'birthDate', false)}, guardian_name=${optionalText(form, 'guardianName', 160)}, guardian_phone=${optionalText(form, 'guardianPhone', 40)}, status=${status}, updated_at=now() WHERE id=${studentId} AND school_id=${schoolId}`
      if (!result.count) throw new Error('Dossier élève introuvable.')
    } else {
      await sql`INSERT INTO students (school_id, class_id, student_number, full_name, birth_date, guardian_name, guardian_phone, status, enrolled_at) VALUES (${schoolId}, ${classId}, ${studentNumber}, ${fullName}, ${date(form, 'birthDate', false)}, ${optionalText(form, 'guardianName', 160)}, ${optionalText(form, 'guardianPhone', 40)}, ${status}, ${date(form, 'enrolledAt')})`
    }
    await logActivity(sql, schoolId, user.id, 'student', studentId ? 'Dossier élève modifié' : 'Nouvelle inscription', `${fullName} · ${values.studentNumber}`)
    return studentId ? 'Dossier élève mis à jour.' : 'Élève inscrit et dossier enregistré.'
  })
}

export async function deleteStudent(form: FormData): Promise<ActionResult> {
  return perform('students:write', async (user, schoolId) => {
    const studentId = id(form)!
    const result = await db()`DELETE FROM students WHERE id=${studentId} AND school_id=${schoolId}`
    if (!result.count) throw new Error('Dossier élève introuvable.')
    await logActivity(db(), schoolId, user.id, 'student', 'Dossier élève supprimé')
    return 'Dossier élève et données liées supprimés.'
  })
}

export async function saveClass(form: FormData): Promise<ActionResult> {
  return perform('classes:write', async (user, schoolId) => {
    const classId = id(form, 'id', false)
    const leadTeacherId = id(form, 'leadTeacherId', false)
    const name = text(form, 'name', 1, 80)
    const level = text(form, 'level', 1, 80)
    const room = optionalText(form, 'room', 80)
    const sql = db()
    await assertTeacher(sql, leadTeacherId, schoolId)
    if (classId) {
      const result = await sql`UPDATE classes SET name=${name}, level=${level}, room=${room}, lead_teacher_id=${leadTeacherId}, updated_at=now() WHERE id=${classId} AND school_id=${schoolId}`
      if (!result.count) throw new Error('Classe introuvable.')
    } else await sql`INSERT INTO classes (school_id, name, level, room, lead_teacher_id) VALUES (${schoolId}, ${name}, ${level}, ${room}, ${leadTeacherId})`
    await logActivity(sql, schoolId, user.id, 'class', classId ? 'Classe modifiée' : 'Classe créée', name)
    return classId ? 'Classe mise à jour.' : 'Classe créée.'
  })
}

export async function deleteClass(form: FormData): Promise<ActionResult> {
  return perform('classes:write', async (_user, schoolId) => {
    const result = await db()`DELETE FROM classes WHERE id=${id(form)!} AND school_id=${schoolId}`
    if (!result.count) throw new Error('Classe introuvable.')
    return 'Classe supprimée.'
  })
}

export async function saveTeacher(form: FormData): Promise<ActionResult> {
  return perform('teachers:write', async (user, schoolId) => {
    const teacherId = id(form, 'id', false)
    const fullName = text(form, 'fullName', 2, 160)
    const status = choice(form, 'status', ['active', 'inactive'] as const)
    const sql = db()
    if (teacherId) {
      const result = await sql`UPDATE teachers SET full_name=${fullName}, email=${email(form)}, phone=${optionalText(form, 'phone', 40)}, status=${status}, updated_at=now() WHERE id=${teacherId} AND school_id=${schoolId}`
      if (!result.count) throw new Error('Enseignant introuvable.')
    } else await sql`INSERT INTO teachers (school_id, full_name, email, phone, status) VALUES (${schoolId}, ${fullName}, ${email(form)}, ${optionalText(form, 'phone', 40)}, ${status})`
    await logActivity(sql, schoolId, user.id, 'teacher', teacherId ? 'Fiche enseignant modifiée' : 'Enseignant ajouté', fullName)
    return teacherId ? 'Fiche enseignant mise à jour.' : 'Enseignant ajouté.'
  })
}

export async function deleteTeacher(form: FormData): Promise<ActionResult> {
  return perform('teachers:write', async (_user, schoolId) => {
    const result = await db()`DELETE FROM teachers WHERE id=${id(form)!} AND school_id=${schoolId}`
    if (!result.count) throw new Error('Enseignant introuvable.')
    return 'Enseignant supprimé.'
  })
}

export async function saveSubject(form: FormData): Promise<ActionResult> {
  return perform('subjects:write', async (user, schoolId) => {
    const subjectId = id(form, 'id', false)
    const name = text(form, 'name', 1, 120)
    const coefficient = number(form, 'coefficient', 0.01, 100)
    const sql = db()
    if (subjectId) {
      const result = await sql`UPDATE subjects SET name=${name}, coefficient=${coefficient}, updated_at=now() WHERE id=${subjectId} AND school_id=${schoolId}`
      if (!result.count) throw new Error('Matière introuvable.')
    } else await sql`INSERT INTO subjects (school_id, name, coefficient) VALUES (${schoolId}, ${name}, ${coefficient})`
    await logActivity(sql, schoolId, user.id, 'grade', subjectId ? 'Coefficient modifié' : 'Matière créée', `${name} · coeff. ${coefficient}`)
    return subjectId ? 'Matière et coefficient mis à jour.' : 'Matière et coefficient créés.'
  })
}

export async function deleteSubject(form: FormData): Promise<ActionResult> {
  return perform('subjects:write', async (_user, schoolId) => {
    const result = await db()`DELETE FROM subjects WHERE id=${id(form)!} AND school_id=${schoolId}`
    if (!result.count) throw new Error('Matière introuvable.')
    return 'Matière supprimée.'
  })
}

export async function saveAssignment(form: FormData): Promise<ActionResult> {
  return perform('teachers:write', async (user, schoolId) => {
    const assignmentId = id(form, 'id', false)
    const teacherId = id(form, 'teacherId')!
    const classId = id(form, 'classId')!
    const subjectId = id(form, 'subjectId')!
    const sql = db()
    await Promise.all([assertTeacher(sql, teacherId, schoolId), assertClass(sql, classId, schoolId), assertSubject(sql, subjectId, schoolId)])
    if (assignmentId) {
      const result = await sql`UPDATE teacher_assignments SET teacher_id=${teacherId}, class_id=${classId}, subject_id=${subjectId} WHERE id=${assignmentId} AND school_id=${schoolId}`
      if (!result.count) throw new Error('Affectation introuvable.')
    } else await sql`INSERT INTO teacher_assignments (school_id, teacher_id, class_id, subject_id) VALUES (${schoolId}, ${teacherId}, ${classId}, ${subjectId})`
    await logActivity(sql, schoolId, user.id, 'teacher', 'Affectation enregistrée')
    return 'Affectation enregistrée.'
  })
}

export async function deleteAssignment(form: FormData): Promise<ActionResult> {
  return perform('teachers:write', async (_user, schoolId) => {
    const result = await db()`DELETE FROM teacher_assignments WHERE id=${id(form)!} AND school_id=${schoolId}`
    if (!result.count) throw new Error('Affectation introuvable.')
    return 'Affectation supprimée.'
  })
}

export async function saveGrade(form: FormData): Promise<ActionResult> {
  return perform('grades:write', async (user, schoolId) => {
    const gradeId = id(form, 'id', false)
    const studentId = id(form, 'studentId')!
    const subjectId = id(form, 'subjectId')!
    let teacherId = id(form, 'teacherId', false)
    const score = number(form, 'score', 0, 1000)
    const maxScore = number(form, 'maxScore', 0.01, 1000)
    if (score > maxScore) throw new Error('La note ne peut pas dépasser le barème.')
    const sql = db()
    const student = await assertStudent(sql, studentId, schoolId)
    await Promise.all([assertSubject(sql, subjectId, schoolId), assertTeacher(sql, teacherId, schoolId)])
    if (gradeId && user.role === 'teacher') {
      const existing = await sql`SELECT s.class_id, g.subject_id FROM grades g JOIN students s ON s.id=g.student_id WHERE g.id=${gradeId} AND g.school_id=${schoolId}`
      if (!existing.length) throw new Error('Note introuvable.')
      await assertTeacherScope(user, schoolId, existing[0].class_id, existing[0].subject_id)
    }
    if (user.role === 'teacher') {
      const own = await sql`SELECT id FROM teachers WHERE user_id=${user.id} AND school_id=${schoolId}`
      if (!own.length) throw new Error('Aucune fiche enseignant n’est liée à ce compte.')
      teacherId = own[0].id
    }
    await assertTeacherScope(user, schoolId, student.class_id, subjectId)
    const term = text(form, 'term', 1, 50)
    const assessment = text(form, 'assessment', 1, 120)
    if (gradeId) {
      const result = await sql`UPDATE grades SET student_id=${studentId}, subject_id=${subjectId}, teacher_id=${teacherId}, term=${term}, assessment=${assessment}, score=${score}, max_score=${maxScore}, appreciation=${optionalText(form, 'appreciation', 1000)}, graded_at=${date(form, 'gradedAt')}, updated_at=now() WHERE id=${gradeId} AND school_id=${schoolId}`
      if (!result.count) throw new Error('Note introuvable.')
    } else await sql`INSERT INTO grades (school_id, student_id, subject_id, teacher_id, term, assessment, score, max_score, appreciation, graded_at) VALUES (${schoolId}, ${studentId}, ${subjectId}, ${teacherId}, ${term}, ${assessment}, ${score}, ${maxScore}, ${optionalText(form, 'appreciation', 1000)}, ${date(form, 'gradedAt')})`
    await logActivity(sql, schoolId, user.id, 'grade', gradeId ? 'Note modifiée' : 'Note ajoutée', `${studentId} · ${assessment}`)
    return gradeId ? 'Note mise à jour ; bulletins recalculés.' : 'Note enregistrée ; bulletins recalculés.'
  })
}

export async function deleteGrade(form: FormData): Promise<ActionResult> {
  return perform('grades:write', async (user, schoolId) => {
    const sql = db()
    if (user.role === 'teacher') {
      const rows = await sql`SELECT g.id, s.class_id, g.subject_id FROM grades g JOIN students s ON s.id=g.student_id WHERE g.id=${id(form)!} AND g.school_id=${schoolId}`
      if (!rows.length) throw new Error('Note introuvable.')
      await assertTeacherScope(user, schoolId, rows[0].class_id, rows[0].subject_id)
    }
    const result = await sql`DELETE FROM grades WHERE id=${id(form)!} AND school_id=${schoolId}`
    if (!result.count) throw new Error('Note introuvable.')
    return 'Note supprimée ; bulletins recalculés.'
  })
}

export async function saveAttendance(form: FormData): Promise<ActionResult> {
  return perform('attendance:write', async (user, schoolId) => {
    const attendanceId = id(form, 'id', false)
    const studentId = id(form, 'studentId')!
    const attendanceDate = date(form, 'attendanceDate')!
    const status = choice(form, 'status', ['present', 'absent', 'late', 'excused'] as const)
    const sql = db()
    const student = await assertStudent(sql, studentId, schoolId)
    if (attendanceId && user.role === 'teacher') {
      const existing = await sql`SELECT class_id FROM attendance WHERE id=${attendanceId} AND school_id=${schoolId}`
      if (!existing.length) throw new Error('Présence introuvable.')
      await assertTeacherScope(user, schoolId, existing[0].class_id)
    }
    await assertTeacherScope(user, schoolId, student.class_id)
    if (attendanceId) {
      const result = await sql`UPDATE attendance SET student_id=${studentId}, class_id=${student.class_id}, attendance_date=${attendanceDate}, status=${status}, notes=${optionalText(form, 'notes', 500)}, recorded_by=${user.id}, updated_at=now() WHERE id=${attendanceId} AND school_id=${schoolId}`
      if (!result.count) throw new Error('Présence introuvable.')
    } else {
      await sql`INSERT INTO attendance (school_id, student_id, class_id, attendance_date, status, notes, recorded_by) VALUES (${schoolId}, ${studentId}, ${student.class_id}, ${attendanceDate}, ${status}, ${optionalText(form, 'notes', 500)}, ${user.id}) ON CONFLICT (student_id, attendance_date) DO UPDATE SET class_id=EXCLUDED.class_id, status=EXCLUDED.status, notes=EXCLUDED.notes, recorded_by=EXCLUDED.recorded_by, updated_at=now()`
    }
    await logActivity(sql, schoolId, user.id, 'absence', 'Appel de présence enregistré', `${studentId} · ${attendanceDate}`)
    return 'Présence enregistrée.'
  })
}

export async function deleteAttendance(form: FormData): Promise<ActionResult> {
  return perform('attendance:write', async (user, schoolId) => {
    const sql = db()
    if (user.role === 'teacher') {
      const rows = await sql`SELECT class_id FROM attendance WHERE id=${id(form)!} AND school_id=${schoolId}`
      if (!rows.length) throw new Error('Présence introuvable.')
      await assertTeacherScope(user, schoolId, rows[0].class_id)
    }
    const result = await sql`DELETE FROM attendance WHERE id=${id(form)!} AND school_id=${schoolId}`
    if (!result.count) throw new Error('Présence introuvable.')
    return 'Enregistrement de présence supprimé.'
  })
}

export async function saveSchedule(form: FormData): Promise<ActionResult> {
  return perform('schedules:write', async (user, schoolId) => {
    const scheduleId = id(form, 'id', false)
    const classId = id(form, 'classId')!
    const teacherId = id(form, 'teacherId', false)
    const subjectId = id(form, 'subjectId')!
    const weekday = integer(form, 'weekday', 1, 7)
    const startsAt = time(form, 'startsAt')
    const endsAt = time(form, 'endsAt')
    if (endsAt <= startsAt) throw new Error('L’heure de fin doit suivre l’heure de début.')
    const sql = db()
    await Promise.all([assertClass(sql, classId, schoolId), assertTeacher(sql, teacherId, schoolId), assertSubject(sql, subjectId, schoolId)])
    if (scheduleId) {
      const result = await sql`UPDATE schedules SET class_id=${classId}, teacher_id=${teacherId}, subject_id=${subjectId}, weekday=${weekday}, starts_at=${startsAt}, ends_at=${endsAt}, room=${optionalText(form, 'room', 80)}, updated_at=now() WHERE id=${scheduleId} AND school_id=${schoolId}`
      if (!result.count) throw new Error('Cours introuvable.')
    } else await sql`INSERT INTO schedules (school_id, class_id, teacher_id, subject_id, weekday, starts_at, ends_at, room) VALUES (${schoolId}, ${classId}, ${teacherId}, ${subjectId}, ${weekday}, ${startsAt}, ${endsAt}, ${optionalText(form, 'room', 80)})`
    await logActivity(sql, schoolId, user.id, 'schedule', scheduleId ? 'Emploi du temps modifié' : 'Cours ajouté')
    return 'Emploi du temps enregistré.'
  })
}

export async function deleteSchedule(form: FormData): Promise<ActionResult> {
  return perform('schedules:write', async (_user, schoolId) => {
    const result = await db()`DELETE FROM schedules WHERE id=${id(form)!} AND school_id=${schoolId}`
    if (!result.count) throw new Error('Cours introuvable.')
    return 'Cours supprimé.'
  })
}

export async function saveCommunication(form: FormData): Promise<ActionResult> {
  return perform('communications:write', async (user, schoolId) => {
    const communicationId = id(form, 'id', false)
    const title = text(form, 'title', 2, 180)
    const body = text(form, 'body', 2, 5000)
    const audience = text(form, 'audience', 1, 120)
    const status = choice(form, 'status', ['draft', 'published'] as const)
    const sql = db()
    if (communicationId) {
      const result = await sql`UPDATE communications SET title=${title}, body=${body}, audience=${audience}, status=${status}, published_at=${status === 'published' ? new Date().toISOString() : null}, updated_at=now() WHERE id=${communicationId} AND school_id=${schoolId}`
      if (!result.count) throw new Error('Communication introuvable.')
    } else await sql`INSERT INTO communications (school_id, author_id, title, body, audience, status, published_at) VALUES (${schoolId}, ${user.id}, ${title}, ${body}, ${audience}, ${status}, ${status === 'published' ? new Date().toISOString() : null})`
    await logActivity(sql, schoolId, user.id, 'message', status === 'published' ? 'Annonce publiée' : 'Brouillon enregistré', title)
    return status === 'published' ? 'Annonce enregistrée et publiée dans l’espace scolaire.' : 'Brouillon enregistré.'
  })
}

export async function deleteCommunication(form: FormData): Promise<ActionResult> {
  return perform('communications:write', async (_user, schoolId) => {
    const result = await db()`DELETE FROM communications WHERE id=${id(form)!} AND school_id=${schoolId}`
    if (!result.count) throw new Error('Communication introuvable.')
    return 'Communication supprimée.'
  })
}

export async function saveSettings(form: FormData): Promise<ActionResult> {
  return perform('settings:write', async (user, schoolId) => {
    const academicYear = text(form, 'academicYear', 4, 20)
    const currentTerm = text(form, 'currentTerm', 1, 50)
    const yearStart = date(form, 'yearStart', false)
    const yearEnd = date(form, 'yearEnd', false)
    if (yearStart && yearEnd && yearEnd < yearStart) throw new Error('La fin de l’année doit suivre la rentrée.')
    await db()`UPDATE school_settings SET academic_year=${academicYear}, current_term=${currentTerm}, period_type=${choice(form, 'periodType', ['trimester', 'semester'] as const)}, year_start=${yearStart}, year_end=${yearEnd}, passing_average=${number(form, 'passingAverage', 0, 20)}, updated_at=now() WHERE school_id=${schoolId}`
    await logActivity(db(), schoolId, user.id, 'settings', 'Paramètres scolaires modifiés', academicYear)
    return 'Paramètres scolaires enregistrés.'
  })
}

export async function saveSchool(form: FormData): Promise<ActionResult> {
  return perform('school:update', async (user, schoolId) => {
    const name = text(form, 'name', 2, 160)
    const result = await db()`UPDATE schools SET name=${name}, city=${text(form, 'city', 1, 120)}, country=${text(form, 'country', 1, 120)}, updated_at=now() WHERE id=${schoolId}`
    if (!result.count) throw new Error('Établissement introuvable.')
    await logActivity(db(), schoolId, user.id, 'settings', 'Profil de l’établissement modifié', name)
    return 'Profil de l’établissement enregistré.'
  })
}

export async function deleteSchool(form: FormData): Promise<ActionResult> {
  return perform('school:update', async (_user, schoolId) => {
    if (String(form.get('confirmation')) !== 'SUPPRIMER') throw new Error('Confirmation de suppression invalide.')
    const result = await db()`DELETE FROM schools WHERE id=${schoolId}`
    if (!result.count) throw new Error('Établissement introuvable.')
    return 'Établissement et données associées supprimés. Déconnectez-vous.'
  })
}

export async function createSchool(form: FormData): Promise<ActionResult> {
  try {
    const user = await requireUser('school:create')
    if (user.role !== 'super_admin') throw new Error('Action réservée à l’administration plateforme.')
    const name = text(form, 'name', 2, 160)
    await db().begin(async (sql) => {
      const rows = await sql`INSERT INTO schools (name, city, country) VALUES (${name}, ${text(form, 'city', 1, 120)}, ${text(form, 'country', 1, 120)}) RETURNING id`
      await sql`INSERT INTO school_settings (school_id, academic_year, current_term) VALUES (${rows[0].id}, ${text(form, 'academicYear', 4, 20)}, 'Trimestre 1')`
    })
    revalidatePath('/')
    return { ok: true, message: 'Établissement créé.' }
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Création impossible.' }
  }
}

export async function saveUser(form: FormData): Promise<ActionResult> {
  return perform('users:write', async (_user, schoolId) => {
    const userId = id(form, 'id', false)
    const fullName = text(form, 'fullName', 2, 160)
    const userEmail = email(form)
    const role = choice(form, 'role', ['director', 'administration', 'teacher', 'secretary', 'viewer'] as const) as Role
    const password = String(form.get('password') ?? '')
    const sql = db()
    if (userId) {
      if (password) validatePassword(password)
      const result = password
        ? await sql`UPDATE users SET full_name=${fullName}, email=${userEmail}, role=${role}, password_hash=${await hashPassword(password)}, active=${choice(form, 'active', ['true', 'false'] as const) === 'true'}, updated_at=now() WHERE id=${userId} AND school_id=${schoolId}`
        : await sql`UPDATE users SET full_name=${fullName}, email=${userEmail}, role=${role}, active=${choice(form, 'active', ['true', 'false'] as const) === 'true'}, updated_at=now() WHERE id=${userId} AND school_id=${schoolId}`
      if (!result.count) throw new Error('Compte introuvable.')
      if (role === 'teacher') await sql`UPDATE teachers SET user_id=${userId} WHERE email=${userEmail} AND school_id=${schoolId}`
    } else {
      validatePassword(password)
      const rows = await sql`INSERT INTO users (school_id, email, full_name, password_hash, role) VALUES (${schoolId}, ${userEmail}, ${fullName}, ${await hashPassword(password)}, ${role}) RETURNING id`
      if (role === 'teacher') await sql`UPDATE teachers SET user_id=${rows[0].id} WHERE email=${userEmail} AND school_id=${schoolId}`
    }
    return userId ? 'Compte et permissions mis à jour.' : 'Compte utilisateur créé.'
  })
}

export async function deleteUser(form: FormData): Promise<ActionResult> {
  return perform('users:write', async (user, schoolId) => {
    const userId = id(form)!
    if (userId === user.id) throw new Error('Vous ne pouvez pas supprimer votre propre compte.')
    const result = await db()`DELETE FROM users WHERE id=${userId} AND school_id=${schoolId}`
    if (!result.count) throw new Error('Compte introuvable.')
    return 'Compte utilisateur supprimé.'
  })
}

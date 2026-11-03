'use server'

import { revalidatePath } from 'next/cache'
import type { TransactionSql } from 'postgres'
import { db, logActivity } from '@/lib/db'
import { actionErrorMessage } from '@/lib/action-errors.mjs'
import { updateSchoolProfile, updateSchoolSettings } from '@/lib/school-admin-data.mjs'
import { requirePlatformAdmin, requireSchool, requireUser } from '@/lib/auth'
import { canDeleteSchool, matchesSchoolDeletionConfirmation } from '@/lib/permissions.mjs'
import { hasAttendanceClassAccess, hasTeacherAssignment, resolveTeacherProfileLink } from '@/lib/teacher-scope.mjs'
import { hashPassword, validatePassword } from '@/lib/password.mjs'
import { choice, date, email, id, integer, number, optionalEmail, optionalText, text, time } from '@/lib/validation'
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
    return { ok: false, message: actionErrorMessage(error, 'Opération scolaire impossible.') }
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

async function getTeacherAssignments(user: SessionUser, schoolId: string, sql: ReturnType<typeof db> | TransactionSql) {
  if (user.role !== 'teacher') return []
  return sql`
    SELECT ta.class_id AS "classId", ta.subject_id AS "subjectId"
    FROM teacher_assignments ta
    JOIN teachers t ON t.id = ta.teacher_id AND t.school_id = ta.school_id
    JOIN users u ON u.id = t.user_id AND u.school_id = t.school_id
    WHERE t.user_id = ${user.id} AND t.school_id = ${schoolId}
      AND t.status = 'active' AND u.active = true AND ta.school_id = ${schoolId}
    FOR SHARE OF ta, t, u
  `
}

async function assertTeacherScope(user: SessionUser, schoolId: string, classId: string, subjectId?: string, sql = db()) {
  if (user.role !== 'teacher') return
  const rows = await getTeacherAssignments(user, schoolId, sql)
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
    const teacherId = id(form)!
    await db().begin(async (tx) => {
      const teachers = await tx`SELECT user_id AS "userId" FROM teachers WHERE id=${teacherId} AND school_id=${schoolId} FOR UPDATE`
      if (!teachers.length) throw new Error('Enseignant introuvable.')

      const linkedUserId = teachers[0].userId
      if (linkedUserId) {
        const linkedTeachers = await tx`SELECT id FROM users WHERE id=${linkedUserId} AND school_id=${schoolId} AND role='teacher' FOR UPDATE`
        if (linkedTeachers.length) throw new Error('Cette fiche est liée à un compte enseignant. Supprimez d’abord le compte utilisateur avant de supprimer la fiche.')
      }

      const result = await tx`DELETE FROM teachers WHERE id=${teacherId} AND school_id=${schoolId}`
      if (!result.count) throw new Error('Enseignant introuvable.')
    })
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
      const own = await sql`SELECT id FROM teachers WHERE user_id=${user.id} AND school_id=${schoolId} AND status='active'`
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
    await sql.begin(async (tx) => {
      const existingById = attendanceId
        ? await tx`SELECT id, student_id, class_id FROM attendance WHERE id=${attendanceId} AND school_id=${schoolId} FOR UPDATE`
        : []
      if (attendanceId && !existingById.length) throw new Error('Présence introuvable.')
      if (existingById.length && existingById[0].student_id !== studentId) {
        throw new Error('Cette présence appartient à un autre élève.')
      }

      const studentRows = await tx`SELECT id, class_id FROM students WHERE id=${studentId} AND school_id=${schoolId} FOR SHARE`
      if (!studentRows.length) throw new Error('Élève introuvable dans cet établissement.')
      const currentClassId = studentRows[0].class_id

      // Serialize writes for the unique student/date key before checking for an existing record.
      await tx`SELECT pg_advisory_xact_lock(hashtextextended(${`${studentId}:${attendanceDate}`}, 0))`
      const existingByDate = attendanceId
        ? []
        : await tx`SELECT id, class_id FROM attendance WHERE student_id=${studentId} AND attendance_date=${attendanceDate} AND school_id=${schoolId} FOR UPDATE`
      const existing = existingById[0] ?? existingByDate[0]

      if (user.role === 'teacher') {
        const assignments = await getTeacherAssignments(user, schoolId, tx)
        if (!hasAttendanceClassAccess(assignments, existing?.class_id ?? currentClassId, currentClassId)) {
          throw new Error('Cette classe, ou la classe de l’ancienne présence, ne fait pas partie de vos affectations actives.')
        }
      }

      if (existing) {
        const result = await tx`UPDATE attendance SET class_id=${currentClassId}, attendance_date=${attendanceDate}, status=${status}, notes=${optionalText(form, 'notes', 500)}, recorded_by=${user.id}, updated_at=now() WHERE id=${existing.id} AND school_id=${schoolId}`
        if (!result.count) throw new Error('Présence introuvable.')
      } else {
        await tx`INSERT INTO attendance (school_id, student_id, class_id, attendance_date, status, notes, recorded_by) VALUES (${schoolId}, ${studentId}, ${currentClassId}, ${attendanceDate}, ${status}, ${optionalText(form, 'notes', 500)}, ${user.id})`
      }
      await logActivity(tx, schoolId, user.id, 'absence', 'Appel de présence enregistré', `${studentId} · ${attendanceDate}`)
    })
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
    const periodType = choice(form, 'periodType', ['trimester', 'semester'] as const)
    const passingAverage = number(form, 'passingAverage', 0, 20)
    if (yearStart && yearEnd && yearEnd < yearStart) throw new Error('La fin de l’année doit suivre la rentrée.')

    await db().begin(async (tx) => {
      await updateSchoolSettings(tx, schoolId, { academicYear, currentTerm, periodType, yearStart, yearEnd, passingAverage })
      await logActivity(tx, schoolId, user.id, 'settings', 'Paramètres scolaires modifiés', academicYear)
    })
    return 'Paramètres scolaires enregistrés.'
  })
}

export async function saveSchool(form: FormData): Promise<ActionResult> {
  return perform('school:update', async (user, schoolId) => {
    const profile = {
      name: text(form, 'name', 2, 160),
      city: text(form, 'city', 1, 120),
      country: text(form, 'country', 1, 120),
      address: optionalText(form, 'address', 240),
      phone: optionalText(form, 'phone', 40),
      email: optionalEmail(form, 'email'),
    }

    await db().begin(async (tx) => {
      await updateSchoolProfile(tx, schoolId, profile)
      await logActivity(tx, schoolId, user.id, 'settings', 'Profil de l’établissement modifié', profile.name)
    })
    return 'Profil de l’établissement enregistré.'
  })
}

export async function deleteSchool(form: FormData): Promise<ActionResult> {
  try {
    const user = await requirePlatformAdmin('school:delete')
    if (!canDeleteSchool(user.role)) throw new Error('Suppression réservée à l’administration plateforme.')
    const schoolId = id(form, 'schoolId')!
    const confirmation = text(form, 'confirmation', 1, 180)
    await db().begin(async (sql) => {
      const rows = await sql`SELECT name FROM schools WHERE id=${schoolId} FOR UPDATE`
      if (!rows.length) throw new Error('Établissement introuvable.')
      if (!matchesSchoolDeletionConfirmation(confirmation, rows[0].name)) {
        throw new Error(`Saisissez « SUPPRIMER ${rows[0].name} » pour confirmer.`)
      }
      const result = await sql`DELETE FROM schools WHERE id=${schoolId} RETURNING id`
      if (!result.length) throw new Error('Établissement introuvable.')
    })
    revalidatePath('/')
    revalidatePath('/plateforme')
    return { ok: true, message: 'Établissement et données associées supprimés.' }
  } catch (error) {
    console.error('Suppression d’établissement refusée ou impossible', error)
    return { ok: false, message: actionErrorMessage(error, 'Suppression impossible.') }
  }
}

export async function createSchool(form: FormData): Promise<ActionResult> {
  try {
    await requirePlatformAdmin('school:create')
    const name = text(form, 'name', 2, 160)
    const city = text(form, 'city', 1, 120)
    const country = text(form, 'country', 1, 120)
    const address = optionalText(form, 'address', 240)
    const phone = optionalText(form, 'phone', 40)
    const schoolEmail = optionalEmail(form, 'email')
    const academicYear = text(form, 'academicYear', 4, 20)
    await db().begin(async (sql) => {
      const rows = await sql`INSERT INTO schools (name, city, country, address, phone, email) VALUES (${name}, ${city}, ${country}, ${address}, ${phone}, ${schoolEmail}) RETURNING id`
      await sql`INSERT INTO school_settings (school_id, academic_year, current_term) VALUES (${rows[0].id}, ${academicYear}, 'Trimestre 1')`
    })
    revalidatePath('/')
    revalidatePath('/plateforme')
    return { ok: true, message: 'Établissement créé.' }
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, 'Création impossible.') }
  }
}

function teacherProfileLinkMessage(reason: string) {
  if (reason === 'missing') return 'Créez d’abord une fiche enseignant active avec la même adresse e-mail.'
  if (reason === 'inactive') return 'La fiche enseignant liée ou correspondante est inactive. Réactivez-la avant d’activer le compte.'
  if (reason === 'already-linked') return 'La fiche enseignant correspondante est déjà liée à un autre compte.'
  if (reason === 'ambiguous') return 'Plusieurs fiches enseignants correspondent à cette adresse. Corrigez les doublons avant d’activer le compte.'
  if (reason === 'multiple-linked') return 'Ce compte est lié à plusieurs fiches enseignants. Corrigez ces liaisons avant de l’activer.'
  return 'Impossible de valider la fiche enseignant associée à ce compte.'
}

export async function saveUser(form: FormData): Promise<ActionResult> {
  return perform('users:write', async (_user, schoolId) => {
    const userId = id(form, 'id', false)
    const fullName = text(form, 'fullName', 2, 160)
    const userEmail = email(form)
    const role = choice(form, 'role', ['director', 'administration', 'teacher', 'secretary', 'viewer'] as const) as Role
    const password = String(form.get('password') ?? '')
    if (userId) {
      if (password) validatePassword(password)
    } else validatePassword(password)

    const active = userId ? choice(form, 'active', ['true', 'false'] as const) === 'true' : true
    const passwordHash = password ? await hashPassword(password) : null
    const sql = db()

    await sql.begin(async (tx) => {
      let teacherProfileId: string | null = null
      if (role === 'teacher' && active) {
        const linkedProfiles = userId
          ? await tx`SELECT id, user_id AS "userId", status FROM teachers WHERE school_id=${schoolId} AND user_id=${userId} FOR UPDATE`
          : []
        const profilesByEmail = await tx`SELECT id, user_id AS "userId", status FROM teachers WHERE school_id=${schoolId} AND lower(email)=${userEmail} FOR UPDATE`
        const profileLink = resolveTeacherProfileLink([...linkedProfiles, ...profilesByEmail], userId)
        if ('reason' in profileLink) throw new Error(teacherProfileLinkMessage(profileLink.reason ?? 'unknown'))
        if (profileLink.needsLink) teacherProfileId = profileLink.profileId
      }

      let targetUserId = userId
      if (userId) {
        const result = passwordHash
          ? await tx`UPDATE users SET full_name=${fullName}, email=${userEmail}, role=${role}, password_hash=${passwordHash}, active=${active}, updated_at=now() WHERE id=${userId} AND school_id=${schoolId}`
          : await tx`UPDATE users SET full_name=${fullName}, email=${userEmail}, role=${role}, active=${active}, updated_at=now() WHERE id=${userId} AND school_id=${schoolId}`
        if (!result.count) throw new Error('Compte introuvable.')
      } else {
        const rows = await tx`INSERT INTO users (school_id, email, full_name, password_hash, role) VALUES (${schoolId}, ${userEmail}, ${fullName}, ${passwordHash}, ${role}) RETURNING id`
        targetUserId = rows[0].id
      }

      if (teacherProfileId && targetUserId) {
        const linked = await tx`UPDATE teachers SET user_id=${targetUserId}, updated_at=now() WHERE id=${teacherProfileId} AND school_id=${schoolId} AND status='active' AND user_id IS NULL RETURNING id`
        if (!linked.length) throw new Error('La fiche enseignant vient d’être associée à un autre compte. Réessayez.')
      }
    })

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

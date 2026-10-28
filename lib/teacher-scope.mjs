export function hasTeacherAssignment(assignments, classId, subjectId) {
  return assignments.some((assignment) =>
    assignment.classId === classId &&
    (subjectId == null || assignment.subjectId === subjectId),
  )
}

export function scopeSchoolDataForUser(data, user, teacherIds) {
  if (user.role !== 'teacher') return data

  const teacherIdSet = new Set(teacherIds)
  const assignments = data.assignments.filter((assignment) => teacherIdSet.has(assignment.teacherId))
  const classIds = new Set(assignments.map((assignment) => assignment.classId))
  const subjectIds = new Set(assignments.map((assignment) => assignment.subjectId))
  const classByStudentId = new Map(data.students.map((student) => [student.id, student.classId]))
  const students = data.students.filter((student) => classIds.has(student.classId))
  const studentIds = new Set(students.map((student) => student.id))
  const grades = data.grades.filter((grade) => {
    const classId = classByStudentId.get(grade.studentId)
    return studentIds.has(grade.studentId) &&
      hasTeacherAssignment(assignments, classId, grade.subjectId)
  })
  const reports = data.reports
    .filter((report) => studentIds.has(report.studentId))
    .map((report) => {
      const classId = classByStudentId.get(report.studentId)
      const rows = report.rows.filter((row) =>
        hasTeacherAssignment(assignments, classId, row.subjectId),
      )
      const coefficientTotal = rows.reduce((sum, row) => sum + row.coefficient, 0)
      const average = coefficientTotal
        ? Math.round((rows.reduce((sum, row) => sum + row.average * row.coefficient, 0) / coefficientTotal + Number.EPSILON) * 100) / 100
        : null
      return { ...report, rows, average }
    })

  return {
    ...data,
    students,
    classes: data.classes.filter((classroom) => classIds.has(classroom.id)),
    teachers: data.teachers.filter((teacher) => teacherIdSet.has(teacher.id)),
    subjects: data.subjects.filter((subject) => subjectIds.has(subject.id)),
    assignments,
    grades,
    attendance: data.attendance.filter((record) =>
      studentIds.has(record.studentId) && classIds.has(record.classId),
    ),
    schedules: data.schedules.filter((schedule) =>
      teacherIdSet.has(schedule.teacherId) &&
      hasTeacherAssignment(assignments, schedule.classId, schedule.subjectId),
    ),
    communications: data.communications.filter((communication) => communication.status === 'published'),
    activities: [],
    reports,
    users: [],
  }
}

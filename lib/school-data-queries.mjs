const UUID_OID = 2950

export async function loadSchoolRows(sql, user, schoolId, { includeUsers = false } = {}) {
  if (user.role === 'teacher') {
    return sql.begin((transaction) => loadSchoolRowsInTransaction(transaction, user, schoolId, { includeUsers }))
  }
  return loadSchoolRowsInTransaction(sql, user, schoolId, { includeUsers })
}

async function loadSchoolRowsInTransaction(sql, user, schoolId, { includeUsers = false } = {}) {
  const isTeacher = user.role === 'teacher'
  const [schools, settings, teacherProfiles, teacherAssignments] = await Promise.all([
    sql`SELECT id, name, city, country FROM schools WHERE id=${schoolId}`,
    sql`SELECT academic_year, current_term, period_type, to_char(year_start, 'YYYY-MM-DD') AS year_start, to_char(year_end, 'YYYY-MM-DD') AS year_end, passing_average FROM school_settings WHERE school_id=${schoolId}`,
    isTeacher
      ? sql`SELECT t.id FROM teachers t JOIN users u ON u.id=t.user_id AND u.school_id=t.school_id WHERE t.user_id=${user.id} AND t.school_id=${schoolId} AND t.status='active' AND u.active=true FOR SHARE OF t, u`
      : Promise.resolve([]),
    isTeacher
      ? sql`SELECT ta.id, ta.teacher_id, t.full_name AS teacher_name, ta.class_id, c.name AS class_name, ta.subject_id, s.name AS subject_name FROM teacher_assignments ta JOIN teachers t ON t.id=ta.teacher_id AND t.school_id=ta.school_id JOIN users u ON u.id=t.user_id AND u.school_id=t.school_id JOIN classes c ON c.id=ta.class_id AND c.school_id=ta.school_id JOIN subjects s ON s.id=ta.subject_id AND s.school_id=ta.school_id WHERE ta.school_id=${schoolId} AND t.user_id=${user.id} AND t.status='active' AND u.active=true ORDER BY c.name, s.name FOR SHARE OF ta, t, u`
      : Promise.resolve([]),
  ])
  const teacherIds = teacherProfiles.map((profile) => profile.id)
  const teacherClassIds = [...new Set(teacherAssignments.map((assignment) => assignment.class_id))]
  const teacherSubjectIds = [...new Set(teacherAssignments.map((assignment) => assignment.subject_id))]

  const [
    students,
    classes,
    teachers,
    subjects,
    assignments,
    grades,
    attendance,
    attendanceStats,
    schedules,
    communications,
    activities,
    enrollment,
    users,
  ] = await Promise.all([
    isTeacher
      ? sql`SELECT s.id, s.student_number, s.full_name, s.class_id, c.name AS class_name, to_char(s.birth_date, 'YYYY-MM-DD') AS birth_date, s.guardian_name, s.guardian_phone, s.status, to_char(s.enrolled_at, 'YYYY-MM-DD') AS enrolled_at FROM students s JOIN classes c ON c.id=s.class_id AND c.school_id=s.school_id WHERE s.school_id=${schoolId} AND s.class_id=ANY(${sql.array(teacherClassIds, UUID_OID)}) ORDER BY s.full_name`
      : sql`SELECT s.id, s.student_number, s.full_name, s.class_id, c.name AS class_name, to_char(s.birth_date, 'YYYY-MM-DD') AS birth_date, s.guardian_name, s.guardian_phone, s.status, to_char(s.enrolled_at, 'YYYY-MM-DD') AS enrolled_at FROM students s JOIN classes c ON c.id=s.class_id AND c.school_id=s.school_id WHERE s.school_id=${schoolId} ORDER BY s.full_name`,
    isTeacher
      ? sql`SELECT c.id, c.name, c.level, c.room, c.lead_teacher_id, COALESCE(t.full_name, 'À affecter') AS lead_teacher, COUNT(s.id) AS enrolled FROM classes c LEFT JOIN teachers t ON t.id=c.lead_teacher_id AND t.school_id=c.school_id LEFT JOIN students s ON s.class_id=c.id AND s.school_id=c.school_id WHERE c.school_id=${schoolId} AND c.id=ANY(${sql.array(teacherClassIds, UUID_OID)}) GROUP BY c.id, t.full_name ORDER BY c.name`
      : sql`SELECT c.id, c.name, c.level, c.room, c.lead_teacher_id, COALESCE(t.full_name, 'À affecter') AS lead_teacher, COUNT(s.id) AS enrolled FROM classes c LEFT JOIN teachers t ON t.id=c.lead_teacher_id AND t.school_id=c.school_id LEFT JOIN students s ON s.class_id=c.id AND s.school_id=c.school_id WHERE c.school_id=${schoolId} GROUP BY c.id, t.full_name ORDER BY c.name`,
    isTeacher
      ? sql`SELECT t.id, t.full_name, t.email, t.phone, t.status, COALESCE(json_agg(json_build_object('class', c.name, 'subject', sub.name)) FILTER (WHERE ta.id IS NOT NULL), '[]') AS assignments FROM teachers t LEFT JOIN teacher_assignments ta ON ta.teacher_id=t.id AND ta.school_id=t.school_id LEFT JOIN classes c ON c.id=ta.class_id AND c.school_id=ta.school_id LEFT JOIN subjects sub ON sub.id=ta.subject_id AND sub.school_id=ta.school_id WHERE t.school_id=${schoolId} AND t.id=ANY(${sql.array(teacherIds, UUID_OID)}) GROUP BY t.id ORDER BY t.full_name`
      : sql`SELECT t.id, t.full_name, t.email, t.phone, t.status, COALESCE(json_agg(json_build_object('class', c.name, 'subject', sub.name)) FILTER (WHERE ta.id IS NOT NULL), '[]') AS assignments FROM teachers t LEFT JOIN teacher_assignments ta ON ta.teacher_id=t.id AND ta.school_id=t.school_id LEFT JOIN classes c ON c.id=ta.class_id AND c.school_id=ta.school_id LEFT JOIN subjects sub ON sub.id=ta.subject_id AND sub.school_id=ta.school_id WHERE t.school_id=${schoolId} GROUP BY t.id ORDER BY t.full_name`,
    isTeacher
      ? sql`SELECT s.id, s.name, s.coefficient FROM subjects s WHERE s.school_id=${schoolId} AND s.id=ANY(${sql.array(teacherSubjectIds, UUID_OID)}) ORDER BY s.name`
      : sql`SELECT id, name, coefficient FROM subjects WHERE school_id=${schoolId} ORDER BY name`,
    isTeacher
      ? Promise.resolve(teacherAssignments)
      : sql`SELECT ta.id, ta.teacher_id, t.full_name AS teacher_name, ta.class_id, c.name AS class_name, ta.subject_id, s.name AS subject_name FROM teacher_assignments ta JOIN teachers t ON t.id=ta.teacher_id AND t.school_id=ta.school_id JOIN classes c ON c.id=ta.class_id AND c.school_id=ta.school_id JOIN subjects s ON s.id=ta.subject_id AND s.school_id=ta.school_id WHERE ta.school_id=${schoolId} ORDER BY t.full_name, c.name, s.name`,
    isTeacher
      ? sql`SELECT g.id, g.student_id, st.full_name AS student_name, c.name AS class_name, g.subject_id, sub.name AS subject_name, g.teacher_id, g.term, g.assessment, g.score, g.max_score, g.appreciation, to_char(g.graded_at, 'YYYY-MM-DD') AS graded_at FROM grades g JOIN students st ON st.id=g.student_id AND st.school_id=g.school_id JOIN classes c ON c.id=st.class_id AND c.school_id=st.school_id JOIN subjects sub ON sub.id=g.subject_id AND sub.school_id=g.school_id WHERE g.school_id=${schoolId} AND EXISTS (SELECT 1 FROM teacher_assignments ta WHERE ta.school_id=g.school_id AND ta.class_id=st.class_id AND ta.subject_id=g.subject_id AND ta.teacher_id=ANY(${sql.array(teacherIds, UUID_OID)})) ORDER BY g.graded_at DESC, st.full_name`
      : sql`SELECT g.id, g.student_id, st.full_name AS student_name, c.name AS class_name, g.subject_id, sub.name AS subject_name, g.teacher_id, g.term, g.assessment, g.score, g.max_score, g.appreciation, to_char(g.graded_at, 'YYYY-MM-DD') AS graded_at FROM grades g JOIN students st ON st.id=g.student_id AND st.school_id=g.school_id JOIN classes c ON c.id=st.class_id AND c.school_id=st.school_id JOIN subjects sub ON sub.id=g.subject_id AND sub.school_id=g.school_id WHERE g.school_id=${schoolId} ORDER BY g.graded_at DESC, st.full_name`,
    isTeacher
      ? sql`SELECT a.id, a.student_id, s.full_name AS student_name, a.class_id, c.name AS class_name, to_char(a.attendance_date, 'YYYY-MM-DD') AS attendance_date, a.status, a.notes FROM attendance a JOIN students s ON s.id=a.student_id AND s.school_id=a.school_id JOIN classes c ON c.id=a.class_id AND c.school_id=a.school_id WHERE a.school_id=${schoolId} AND a.class_id=ANY(${sql.array(teacherClassIds, UUID_OID)}) ORDER BY a.attendance_date DESC, s.full_name LIMIT 2000`
      : sql`SELECT a.id, a.student_id, s.full_name AS student_name, a.class_id, c.name AS class_name, to_char(a.attendance_date, 'YYYY-MM-DD') AS attendance_date, a.status, a.notes FROM attendance a JOIN students s ON s.id=a.student_id AND s.school_id=a.school_id JOIN classes c ON c.id=a.class_id AND c.school_id=a.school_id WHERE a.school_id=${schoolId} ORDER BY a.attendance_date DESC, s.full_name LIMIT 2000`,
    isTeacher
      ? sql`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE a.status IN ('present', 'late')) AS present FROM attendance a WHERE a.school_id=${schoolId} AND a.attendance_date >= CURRENT_DATE - interval '30 days' AND a.class_id=ANY(${sql.array(teacherClassIds, UUID_OID)})`
      : sql`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status IN ('present', 'late')) AS present FROM attendance WHERE school_id=${schoolId} AND attendance_date >= CURRENT_DATE - interval '30 days'`,
    isTeacher
      ? sql`SELECT sc.id, sc.class_id, c.name AS class_name, sc.teacher_id, COALESCE(t.full_name, 'À affecter') AS teacher_name, sc.subject_id, sub.name AS subject_name, sc.weekday, to_char(sc.starts_at, 'HH24:MI') AS starts_at, to_char(sc.ends_at, 'HH24:MI') AS ends_at, sc.room FROM schedules sc JOIN classes c ON c.id=sc.class_id AND c.school_id=sc.school_id LEFT JOIN teachers t ON t.id=sc.teacher_id AND t.school_id=sc.school_id JOIN subjects sub ON sub.id=sc.subject_id AND sub.school_id=sc.school_id WHERE sc.school_id=${schoolId} AND EXISTS (SELECT 1 FROM teacher_assignments ta WHERE ta.school_id=sc.school_id AND ta.class_id=sc.class_id AND ta.subject_id=sc.subject_id AND ta.teacher_id=ANY(${sql.array(teacherIds, UUID_OID)})) ORDER BY sc.weekday, sc.starts_at`
      : sql`SELECT sc.id, sc.class_id, c.name AS class_name, sc.teacher_id, COALESCE(t.full_name, 'À affecter') AS teacher_name, sc.subject_id, sub.name AS subject_name, sc.weekday, to_char(sc.starts_at, 'HH24:MI') AS starts_at, to_char(sc.ends_at, 'HH24:MI') AS ends_at, sc.room FROM schedules sc JOIN classes c ON c.id=sc.class_id AND c.school_id=sc.school_id LEFT JOIN teachers t ON t.id=sc.teacher_id AND t.school_id=sc.school_id JOIN subjects sub ON sub.id=sc.subject_id AND sub.school_id=sc.school_id WHERE sc.school_id=${schoolId} ORDER BY sc.weekday, sc.starts_at`,
    isTeacher
      ? sql`SELECT co.id, co.title, co.body, co.audience, co.status, co.published_at, co.created_at, COALESCE(u.full_name, 'Compte supprimé') AS author_name FROM communications co LEFT JOIN users u ON u.id=co.author_id AND u.school_id=co.school_id WHERE co.school_id=${schoolId} AND co.status='published' AND btrim(co.audience) IN ('Enseignants', 'enseignants', 'Équipe pédagogique', 'équipe pédagogique', 'Toute la communauté scolaire', 'toute la communauté scolaire', 'Toute la communauté de l’établissement', 'toute la communauté de l’établissement') ORDER BY co.created_at DESC LIMIT 500`
      : sql`SELECT co.id, co.title, co.body, co.audience, co.status, co.published_at, co.created_at, COALESCE(u.full_name, 'Compte supprimé') AS author_name FROM communications co LEFT JOIN users u ON u.id=co.author_id AND u.school_id=co.school_id WHERE co.school_id=${schoolId} ORDER BY co.created_at DESC LIMIT 500`,
    isTeacher
      ? sql`SELECT id, kind, title, detail, created_at FROM activity_logs WHERE school_id=${schoolId} AND actor_id=${user.id} ORDER BY created_at DESC LIMIT 12`
      : sql`SELECT id, kind, title, detail, created_at FROM activity_logs WHERE school_id=${schoolId} ORDER BY created_at DESC LIMIT 12`,
    isTeacher
      ? sql`WITH months AS (SELECT generate_series(date_trunc('month', CURRENT_DATE) - interval '11 months', date_trunc('month', CURRENT_DATE), interval '1 month') AS month), totals AS (SELECT date_trunc('month', enrolled_at) AS month, COUNT(*) AS count FROM students WHERE school_id=${schoolId} AND class_id=ANY(${sql.array(teacherClassIds, UUID_OID)}) GROUP BY 1) SELECT to_char(months.month, 'TMMon') AS month, COALESCE((SELECT SUM(count) FROM totals WHERE totals.month <= months.month), 0) AS students FROM months ORDER BY months.month`
      : sql`WITH months AS (SELECT generate_series(date_trunc('month', CURRENT_DATE) - interval '11 months', date_trunc('month', CURRENT_DATE), interval '1 month') AS month), totals AS (SELECT date_trunc('month', enrolled_at) AS month, COUNT(*) AS count FROM students WHERE school_id=${schoolId} GROUP BY 1) SELECT to_char(months.month, 'TMMon') AS month, COALESCE((SELECT SUM(count) FROM totals WHERE totals.month <= months.month), 0) AS students FROM months ORDER BY months.month`,
    includeUsers
      ? sql`SELECT id, full_name, email, role, active FROM users WHERE school_id=${schoolId} ORDER BY full_name`
      : Promise.resolve([]),
  ])

  return {
    schools,
    settings,
    students,
    classes,
    teachers,
    subjects,
    assignments,
    grades,
    attendance,
    attendanceStats,
    schedules,
    communications,
    activities,
    enrollment,
    users,
    teacherIds,
  }
}

const UUID_OID = 2950

export async function loadAcademicYearRows(sql, schoolId, { isTeacher = false, classIds = [] } = {}) {
  const schoolYears = await sql`
    SELECT id, label, to_char(start_date, 'YYYY-MM-DD') AS start_date,
      to_char(end_date, 'YYYY-MM-DD') AS end_date, status
    FROM school_years
    WHERE school_id = ${schoolId}
    ORDER BY start_date DESC, created_at DESC
  `

  const [studentEnrollments, enrollmentClassChanges] = await Promise.all([
    isTeacher
      ? sql`
          SELECT e.id, e.student_id, st.full_name AS student_name, e.school_year_id,
            sy.label AS school_year_label, e.class_id, c.name AS class_name, e.status,
            to_char(e.enrolled_at, 'YYYY-MM-DD') AS enrolled_at
          FROM student_enrollments e
          JOIN school_years sy ON sy.id = e.school_year_id AND sy.school_id = e.school_id
          JOIN students st ON st.id = e.student_id AND st.school_id = e.school_id
          JOIN classes c ON c.id = e.class_id AND c.school_id = e.school_id
          WHERE e.school_id = ${schoolId}
            AND e.class_id = ANY(${sql.array(classIds, UUID_OID)})
          ORDER BY sy.start_date DESC, st.full_name
        `
      : sql`
          SELECT e.id, e.student_id, st.full_name AS student_name, e.school_year_id,
            sy.label AS school_year_label, e.class_id, c.name AS class_name, e.status,
            to_char(e.enrolled_at, 'YYYY-MM-DD') AS enrolled_at
          FROM student_enrollments e
          JOIN school_years sy ON sy.id = e.school_year_id AND sy.school_id = e.school_id
          JOIN students st ON st.id = e.student_id AND st.school_id = e.school_id
          JOIN classes c ON c.id = e.class_id AND c.school_id = e.school_id
          WHERE e.school_id = ${schoolId}
          ORDER BY sy.start_date DESC, st.full_name
        `,
    isTeacher
      ? sql`
          SELECT h.id, h.enrollment_id, e.student_id, st.full_name AS student_name,
            e.school_year_id, sy.label AS school_year_label, h.class_before_id,
            old_class.name AS class_before_name, h.class_after_id, new_class.name AS class_after_name,
            to_char(h.effective_on, 'YYYY-MM-DD') AS effective_on
          FROM student_enrollment_class_changes h
          JOIN student_enrollments e ON e.id = h.enrollment_id AND e.school_id = h.school_id
          JOIN school_years sy ON sy.id = e.school_year_id AND sy.school_id = e.school_id
          JOIN students st ON st.id = e.student_id AND st.school_id = e.school_id
          LEFT JOIN classes old_class ON old_class.id = h.class_before_id AND old_class.school_id = h.school_id
          JOIN classes new_class ON new_class.id = h.class_after_id AND new_class.school_id = h.school_id
          WHERE h.school_id = ${schoolId}
            AND h.class_after_id = ANY(${sql.array(classIds, UUID_OID)})
          ORDER BY h.effective_on DESC, h.changed_at DESC
        `
      : sql`
          SELECT h.id, h.enrollment_id, e.student_id, st.full_name AS student_name,
            e.school_year_id, sy.label AS school_year_label, h.class_before_id,
            old_class.name AS class_before_name, h.class_after_id, new_class.name AS class_after_name,
            to_char(h.effective_on, 'YYYY-MM-DD') AS effective_on
          FROM student_enrollment_class_changes h
          JOIN student_enrollments e ON e.id = h.enrollment_id AND e.school_id = h.school_id
          JOIN school_years sy ON sy.id = e.school_year_id AND sy.school_id = e.school_id
          JOIN students st ON st.id = e.student_id AND st.school_id = e.school_id
          LEFT JOIN classes old_class ON old_class.id = h.class_before_id AND old_class.school_id = h.school_id
          JOIN classes new_class ON new_class.id = h.class_after_id AND new_class.school_id = h.school_id
          WHERE h.school_id = ${schoolId}
          ORDER BY h.effective_on DESC, h.changed_at DESC
        `,
  ])

  return { schoolYears, studentEnrollments, enrollmentClassChanges }
}

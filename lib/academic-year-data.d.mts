interface AcademicYearRow {
  id: string
  label: string
  start_date: string
  end_date: string
  status: 'prepared' | 'active' | 'closed'
}

interface StudentEnrollmentRow {
  id: string
  student_id: string
  student_name: string
  school_year_id: string
  school_year_label: string
  class_id: string
  class_name: string
  status: 'enrolled' | 'withdrawn' | 'transferred' | 'completed'
  enrolled_at: string
}

interface EnrollmentClassChangeRow {
  id: string
  enrollment_id: string
  student_id: string
  student_name: string
  school_year_id: string
  school_year_label: string
  class_before_id: string | null
  class_before_name: string | null
  class_after_id: string
  class_after_name: string
  effective_on: string
}

interface AcademicYearRows {
  schoolYears: AcademicYearRow[]
  studentEnrollments: StudentEnrollmentRow[]
  enrollmentClassChanges: EnrollmentClassChangeRow[]
}

export function loadAcademicYearRows(
  sql: any,
  schoolId: string,
  options?: { isTeacher?: boolean; classIds?: string[] },
): Promise<AcademicYearRows>

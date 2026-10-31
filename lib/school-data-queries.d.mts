type DataRow = Record<string, any>

interface SchoolRows {
  schools: DataRow[]
  settings: DataRow[]
  students: DataRow[]
  classes: DataRow[]
  teachers: DataRow[]
  subjects: DataRow[]
  assignments: DataRow[]
  grades: DataRow[]
  attendance: DataRow[]
  attendanceStats: DataRow[]
  schedules: DataRow[]
  communications: DataRow[]
  activities: DataRow[]
  enrollment: DataRow[]
  users: DataRow[]
  teacherIds: string[]
}

export function loadSchoolRows(
  sql: any,
  user: { id: string; role: string },
  schoolId: string,
  options?: { includeUsers?: boolean },
): Promise<SchoolRows>

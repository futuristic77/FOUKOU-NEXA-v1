export interface CalculationGrade { subjectId: string; score: number | string; maxScore: number | string }
export interface CalculationSubject { id: string; name: string; coefficient: number | string }
export interface ReportRow { subjectId: string; subject: string; coefficient: number; assessmentCount: number; average: number }
export function calculateReportCard(grades: CalculationGrade[], subjects: CalculationSubject[]): { rows: ReportRow[]; average: number | null }
export function round(value: number): number
export function attendanceRate(records: { status: string }[]): number | null
export function initials(name: string): string

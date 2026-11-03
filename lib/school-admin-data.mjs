export async function updateSchoolProfile(sql, schoolId, profile) {
  const result = await sql`
    UPDATE schools
    SET name = ${profile.name},
        city = ${profile.city},
        country = ${profile.country},
        address = ${profile.address},
        phone = ${profile.phone},
        email = ${profile.email},
        updated_at = now()
    WHERE id = ${schoolId}
    RETURNING id
  `
  if (!result.length) throw new Error('Établissement introuvable.')
}

export async function updateSchoolSettings(sql, schoolId, settings) {
  const result = await sql`
    UPDATE school_settings
    SET academic_year = ${settings.academicYear},
        current_term = ${settings.currentTerm},
        period_type = ${settings.periodType},
        year_start = ${settings.yearStart},
        year_end = ${settings.yearEnd},
        passing_average = ${settings.passingAverage},
        updated_at = now()
    WHERE school_id = ${schoolId}
    RETURNING school_id
  `
  if (!result.length) throw new Error('Paramètres scolaires introuvables.')
}

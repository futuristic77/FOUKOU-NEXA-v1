BEGIN;

-- Stop without changing data if historical records already cross school boundaries.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM attendance a
    WHERE a.recorded_by IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM users u
        WHERE u.id = a.recorded_by
          AND u.school_id = a.school_id
      )
  ) THEN
    RAISE EXCEPTION 'attendance.recorded_by contains cross-school or missing users; review historical rows before applying this migration';
  END IF;
END;
$$;

ALTER TABLE attendance
  DROP CONSTRAINT IF EXISTS attendance_recorded_by_fkey;

ALTER TABLE attendance
  ADD CONSTRAINT attendance_school_recorded_by_fkey
  FOREIGN KEY (school_id, recorded_by)
  REFERENCES users (school_id, id)
  ON DELETE SET NULL (recorded_by)
  NOT VALID;

ALTER TABLE attendance
  VALIDATE CONSTRAINT attendance_school_recorded_by_fkey;

COMMIT;

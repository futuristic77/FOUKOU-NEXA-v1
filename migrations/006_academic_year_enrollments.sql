BEGIN;

CREATE TABLE school_years (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  label text NOT NULL CHECK (char_length(btrim(label)) BETWEEN 2 AND 100),
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'prepared' CHECK (status IN ('prepared', 'active', 'closed')),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, id),
  CONSTRAINT school_years_date_range_check CHECK (start_date < end_date),
  CONSTRAINT school_years_creator_fkey
    FOREIGN KEY (school_id, created_by)
    REFERENCES users (school_id, id)
    ON DELETE SET NULL (created_by)
);

CREATE UNIQUE INDEX school_years_school_label_key
  ON school_years (school_id, lower(btrim(label)));
CREATE UNIQUE INDEX school_years_one_active_per_school_idx
  ON school_years (school_id)
  WHERE status = 'active';
CREATE INDEX idx_school_years_school_dates
  ON school_years (school_id, start_date DESC, end_date DESC);

CREATE TABLE student_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  school_year_id uuid NOT NULL,
  student_id uuid NOT NULL,
  class_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'withdrawn', 'transferred', 'completed')),
  enrolled_at date NOT NULL DEFAULT CURRENT_DATE,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, id),
  UNIQUE (school_id, school_year_id, student_id),
  CONSTRAINT student_enrollments_school_year_fkey
    FOREIGN KEY (school_id, school_year_id)
    REFERENCES school_years (school_id, id)
    ON DELETE CASCADE,
  CONSTRAINT student_enrollments_school_student_fkey
    FOREIGN KEY (school_id, student_id)
    REFERENCES students (school_id, id)
    ON DELETE CASCADE,
  CONSTRAINT student_enrollments_school_class_fkey
    FOREIGN KEY (school_id, class_id)
    REFERENCES classes (school_id, id)
    ON DELETE RESTRICT,
  CONSTRAINT student_enrollments_creator_fkey
    FOREIGN KEY (school_id, created_by)
    REFERENCES users (school_id, id)
    ON DELETE SET NULL (created_by)
);

CREATE INDEX idx_student_enrollments_school_year_class
  ON student_enrollments (school_id, school_year_id, class_id);
CREATE INDEX idx_student_enrollments_school_student
  ON student_enrollments (school_id, student_id, created_at DESC);

CREATE TABLE student_enrollment_class_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  enrollment_id uuid NOT NULL,
  class_before_id uuid,
  class_after_id uuid NOT NULL,
  effective_on date NOT NULL,
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT student_enrollment_class_changes_enrollment_fkey
    FOREIGN KEY (school_id, enrollment_id)
    REFERENCES student_enrollments (school_id, id)
    ON DELETE CASCADE,
  CONSTRAINT student_enrollment_class_changes_before_class_fkey
    FOREIGN KEY (school_id, class_before_id)
    REFERENCES classes (school_id, id)
    ON DELETE RESTRICT,
  CONSTRAINT student_enrollment_class_changes_after_class_fkey
    FOREIGN KEY (school_id, class_after_id)
    REFERENCES classes (school_id, id)
    ON DELETE RESTRICT,
  CONSTRAINT student_enrollment_class_changes_actor_fkey
    FOREIGN KEY (school_id, changed_by)
    REFERENCES users (school_id, id)
    ON DELETE SET NULL (changed_by)
);

CREATE INDEX idx_student_enrollment_class_changes_history
  ON student_enrollment_class_changes (school_id, enrollment_id, effective_on DESC, changed_at DESC);

COMMIT;

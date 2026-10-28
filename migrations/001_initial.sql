BEGIN;

CREATE TABLE IF NOT EXISTS schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 160),
  city text NOT NULL DEFAULT '',
  country text NOT NULL DEFAULT 'Côte d’Ivoire',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  full_name text NOT NULL CHECK (char_length(full_name) BETWEEN 2 AND 160),
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('super_admin', 'director', 'administration', 'teacher', 'secretary', 'viewer')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((role = 'super_admin') = (school_id IS NULL))
);

CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_hash text NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  lead_teacher_id uuid REFERENCES teachers(id) ON DELETE SET NULL,
  name text NOT NULL,
  level text NOT NULL,
  room text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, name)
);

CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
  student_number text NOT NULL,
  full_name text NOT NULL,
  birth_date date,
  guardian_name text NOT NULL DEFAULT '',
  guardian_phone text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  enrolled_at date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, student_number)
);

CREATE TABLE IF NOT EXISTS subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  coefficient numeric(5,2) NOT NULL DEFAULT 1 CHECK (coefficient > 0 AND coefficient <= 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, name)
);

CREATE TABLE IF NOT EXISTS teacher_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (teacher_id, class_id, subject_id)
);

CREATE TABLE IF NOT EXISTS grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
  teacher_id uuid REFERENCES teachers(id) ON DELETE SET NULL,
  term text NOT NULL,
  assessment text NOT NULL,
  score numeric(6,2) NOT NULL CHECK (score >= 0),
  max_score numeric(6,2) NOT NULL DEFAULT 20 CHECK (max_score > 0 AND max_score <= 1000),
  appreciation text NOT NULL DEFAULT '',
  graded_at date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (score <= max_score),
  UNIQUE (student_id, subject_id, term, assessment)
);

CREATE TABLE IF NOT EXISTS attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  attendance_date date NOT NULL,
  status text NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
  notes text NOT NULL DEFAULT '',
  recorded_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, attendance_date)
);

CREATE TABLE IF NOT EXISTS schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id uuid REFERENCES teachers(id) ON DELETE SET NULL,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 1 AND 7),
  starts_at time NOT NULL,
  ends_at time NOT NULL,
  room text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at),
  UNIQUE (class_id, weekday, starts_at)
);

CREATE TABLE IF NOT EXISTS communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  author_id uuid REFERENCES users(id) ON DELETE SET NULL,
  title text NOT NULL,
  body text NOT NULL,
  audience text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS school_settings (
  school_id uuid PRIMARY KEY REFERENCES schools(id) ON DELETE CASCADE,
  academic_year text NOT NULL,
  current_term text NOT NULL,
  period_type text NOT NULL DEFAULT 'trimester' CHECK (period_type IN ('trimester', 'semester')),
  year_start date,
  year_end date,
  passing_average numeric(5,2) NOT NULL DEFAULT 10 CHECK (passing_average BETWEEN 0 AND 20),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  kind text NOT NULL,
  title text NOT NULL,
  detail text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_identity ON login_attempts(identity_hash, attempted_at);
CREATE INDEX IF NOT EXISTS idx_users_school ON users(school_id);
CREATE INDEX IF NOT EXISTS idx_students_school_class ON students(school_id, class_id);
CREATE INDEX IF NOT EXISTS idx_teachers_school ON teachers(school_id);
CREATE INDEX IF NOT EXISTS idx_classes_school ON classes(school_id);
CREATE INDEX IF NOT EXISTS idx_grades_school_term ON grades(school_id, term);
CREATE INDEX IF NOT EXISTS idx_grades_student ON grades(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_school_date ON attendance(school_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_schedules_school_class ON schedules(school_id, class_id);
CREATE INDEX IF NOT EXISTS idx_communications_school ON communications(school_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_school ON activity_logs(school_id, created_at DESC);

COMMIT;

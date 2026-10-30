BEGIN;

-- Composite candidate keys let every tenant-owned relation prove that both
-- the record ID and its school ID belong to the same establishment.
ALTER TABLE users ADD CONSTRAINT users_school_id_id_key UNIQUE (school_id, id);
ALTER TABLE teachers ADD CONSTRAINT teachers_school_id_id_key UNIQUE (school_id, id);
ALTER TABLE classes ADD CONSTRAINT classes_school_id_id_key UNIQUE (school_id, id);
ALTER TABLE students ADD CONSTRAINT students_school_id_id_key UNIQUE (school_id, id);
ALTER TABLE subjects ADD CONSTRAINT subjects_school_id_id_key UNIQUE (school_id, id);

ALTER TABLE teachers
  ADD CONSTRAINT teachers_school_user_fkey
  FOREIGN KEY (school_id, user_id) REFERENCES users (school_id, id) NOT VALID;
ALTER TABLE classes
  ADD CONSTRAINT classes_school_lead_teacher_fkey
  FOREIGN KEY (school_id, lead_teacher_id) REFERENCES teachers (school_id, id) NOT VALID;
ALTER TABLE students
  ADD CONSTRAINT students_school_class_fkey
  FOREIGN KEY (school_id, class_id) REFERENCES classes (school_id, id) NOT VALID;
ALTER TABLE teacher_assignments
  ADD CONSTRAINT teacher_assignments_school_teacher_fkey
  FOREIGN KEY (school_id, teacher_id) REFERENCES teachers (school_id, id) ON DELETE CASCADE NOT VALID,
  ADD CONSTRAINT teacher_assignments_school_class_fkey
  FOREIGN KEY (school_id, class_id) REFERENCES classes (school_id, id) ON DELETE CASCADE NOT VALID,
  ADD CONSTRAINT teacher_assignments_school_subject_fkey
  FOREIGN KEY (school_id, subject_id) REFERENCES subjects (school_id, id) ON DELETE CASCADE NOT VALID;
ALTER TABLE grades
  ADD CONSTRAINT grades_school_student_fkey
  FOREIGN KEY (school_id, student_id) REFERENCES students (school_id, id) ON DELETE CASCADE NOT VALID,
  ADD CONSTRAINT grades_school_subject_fkey
  FOREIGN KEY (school_id, subject_id) REFERENCES subjects (school_id, id) NOT VALID,
  ADD CONSTRAINT grades_school_teacher_fkey
  FOREIGN KEY (school_id, teacher_id) REFERENCES teachers (school_id, id) NOT VALID;
ALTER TABLE attendance
  ADD CONSTRAINT attendance_school_student_fkey
  FOREIGN KEY (school_id, student_id) REFERENCES students (school_id, id) ON DELETE CASCADE NOT VALID,
  ADD CONSTRAINT attendance_school_class_fkey
  FOREIGN KEY (school_id, class_id) REFERENCES classes (school_id, id) ON DELETE CASCADE NOT VALID;
ALTER TABLE schedules
  ADD CONSTRAINT schedules_school_class_fkey
  FOREIGN KEY (school_id, class_id) REFERENCES classes (school_id, id) ON DELETE CASCADE NOT VALID,
  ADD CONSTRAINT schedules_school_teacher_fkey
  FOREIGN KEY (school_id, teacher_id) REFERENCES teachers (school_id, id) NOT VALID,
  ADD CONSTRAINT schedules_school_subject_fkey
  FOREIGN KEY (school_id, subject_id) REFERENCES subjects (school_id, id) NOT VALID;
ALTER TABLE communications
  ADD CONSTRAINT communications_school_author_fkey
  FOREIGN KEY (school_id, author_id) REFERENCES users (school_id, id) NOT VALID;
ALTER TABLE activity_logs
  ADD CONSTRAINT activity_logs_school_actor_fkey
  FOREIGN KEY (school_id, actor_id) REFERENCES users (school_id, id) NOT VALID;

-- Validate existing rows before this migration commits. Any legacy
-- cross-school reference aborts the transaction without deleting data.
ALTER TABLE teachers VALIDATE CONSTRAINT teachers_school_user_fkey;
ALTER TABLE classes VALIDATE CONSTRAINT classes_school_lead_teacher_fkey;
ALTER TABLE students VALIDATE CONSTRAINT students_school_class_fkey;
ALTER TABLE teacher_assignments VALIDATE CONSTRAINT teacher_assignments_school_teacher_fkey;
ALTER TABLE teacher_assignments VALIDATE CONSTRAINT teacher_assignments_school_class_fkey;
ALTER TABLE teacher_assignments VALIDATE CONSTRAINT teacher_assignments_school_subject_fkey;
ALTER TABLE grades VALIDATE CONSTRAINT grades_school_student_fkey;
ALTER TABLE grades VALIDATE CONSTRAINT grades_school_subject_fkey;
ALTER TABLE grades VALIDATE CONSTRAINT grades_school_teacher_fkey;
ALTER TABLE attendance VALIDATE CONSTRAINT attendance_school_student_fkey;
ALTER TABLE attendance VALIDATE CONSTRAINT attendance_school_class_fkey;
ALTER TABLE schedules VALIDATE CONSTRAINT schedules_school_class_fkey;
ALTER TABLE schedules VALIDATE CONSTRAINT schedules_school_teacher_fkey;
ALTER TABLE schedules VALIDATE CONSTRAINT schedules_school_subject_fkey;
ALTER TABLE communications VALIDATE CONSTRAINT communications_school_author_fkey;
ALTER TABLE activity_logs VALIDATE CONSTRAINT activity_logs_school_actor_fkey;

COMMIT;

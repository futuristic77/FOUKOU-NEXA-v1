-- Supabase foundation only. This migration creates no records and grants no client access.
-- Review the target Supabase project for name conflicts before applying.
begin;

create table public.foukou_schools (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  city text not null default '',
  country text not null default 'Côte d’Ivoire',
  academic_year text,
  created_at timestamptz not null default now()
);

create table public.foukou_teachers (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.foukou_schools(id) on delete cascade,
  full_name text not null check (btrim(full_name) <> ''),
  subject text not null check (btrim(subject) <> ''),
  status text not null default 'En poste' check (status in ('En poste', 'À confirmer')),
  created_at timestamptz not null default now(),
  unique (id, school_id)
);

create table public.foukou_classrooms (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.foukou_schools(id) on delete cascade,
  label text not null check (btrim(label) <> ''),
  level text not null,
  room text not null default '',
  created_at timestamptz not null default now(),
  unique (id, school_id),
  unique (school_id, label)
);

create table public.foukou_students (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.foukou_schools(id) on delete cascade,
  classroom_id uuid not null,
  external_id text,
  full_name text not null check (btrim(full_name) <> ''),
  status text not null default 'Actif' check (status in ('Actif', 'À vérifier')),
  enrolled_at date,
  created_at timestamptz not null default now(),
  unique (id, school_id),
  foreign key (classroom_id, school_id)
    references public.foukou_classrooms(id, school_id) on delete restrict
);

create table public.foukou_teacher_class_assignments (
  school_id uuid not null references public.foukou_schools(id) on delete cascade,
  teacher_id uuid not null,
  classroom_id uuid not null,
  is_primary boolean not null default false,
  primary key (teacher_id, classroom_id),
  foreign key (teacher_id, school_id)
    references public.foukou_teachers(id, school_id) on delete cascade,
  foreign key (classroom_id, school_id)
    references public.foukou_classrooms(id, school_id) on delete cascade
);

create table public.foukou_grade_records (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.foukou_schools(id) on delete cascade,
  student_id uuid not null,
  subject text not null check (btrim(subject) <> ''),
  period text not null check (period in ('Trimestre 1', 'Trimestre 2', 'Trimestre 3')),
  evaluation_number smallint not null check (evaluation_number between 1 and 3),
  score numeric(4, 2) not null check (score between 0 and 20),
  coefficient numeric(4, 2) not null default 1 check (coefficient > 0),
  appreciation text not null default '',
  created_at timestamptz not null default now(),
  foreign key (student_id, school_id)
    references public.foukou_students(id, school_id) on delete cascade,
  unique (student_id, subject, period, evaluation_number)
);

create table public.foukou_attendance_records (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.foukou_schools(id) on delete cascade,
  student_id uuid not null,
  attendance_date date not null,
  status text not null check (status in ('present', 'absent', 'late', 'excused')),
  created_at timestamptz not null default now(),
  foreign key (student_id, school_id)
    references public.foukou_students(id, school_id) on delete cascade,
  unique (student_id, attendance_date)
);

create table public.foukou_announcements (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.foukou_schools(id) on delete cascade,
  title text not null check (btrim(title) <> ''),
  audience text not null,
  scheduled_at timestamptz,
  status text not null default 'Brouillon' check (status in ('Brouillon', 'Publié')),
  summary text not null default '',
  created_at timestamptz not null default now()
);

-- RLS is enabled and client grants are revoked. No policies are created intentionally.
alter table public.foukou_schools enable row level security;
alter table public.foukou_teachers enable row level security;
alter table public.foukou_classrooms enable row level security;
alter table public.foukou_students enable row level security;
alter table public.foukou_teacher_class_assignments enable row level security;
alter table public.foukou_grade_records enable row level security;
alter table public.foukou_attendance_records enable row level security;
alter table public.foukou_announcements enable row level security;

revoke all privileges on table
  public.foukou_schools,
  public.foukou_teachers,
  public.foukou_classrooms,
  public.foukou_students,
  public.foukou_teacher_class_assignments,
  public.foukou_grade_records,
  public.foukou_attendance_records,
  public.foukou_announcements
from anon, authenticated;

commit;

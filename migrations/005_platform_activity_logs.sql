BEGIN;

CREATE TABLE IF NOT EXISTS platform_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  school_id uuid,
  school_name text,
  action text NOT NULL CHECK (action IN (
    'school.created',
    'school.deleted',
    'super_admin.bootstrapped'
  )),
  detail text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_activity_created
  ON platform_activity_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_platform_activity_school
  ON platform_activity_logs (school_id, created_at DESC)
  WHERE school_id IS NOT NULL;

REVOKE ALL ON TABLE platform_activity_logs FROM PUBLIC;

DO $$
DECLARE
  role_name text;
BEGIN
  FOR role_name IN
    SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated', 'service_role')
  LOOP
    EXECUTE format('REVOKE ALL ON TABLE public.platform_activity_logs FROM %I', role_name);
  END LOOP;
END;
$$;

COMMIT;

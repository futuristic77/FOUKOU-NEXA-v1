# Supabase setup for FOUKOU-NEXA

## Current status

This repository has a Supabase configuration helper and an initial SQL migration. It is not connected to a live Supabase project yet: no project URL or public key is included in GitHub, and the migration has not been applied.

The existing screens still use demonstration data. This change does not alter authentication, does not replace the demo UI, and does not create or migrate records.

## Required deployment configuration

Set these values in the actual hosting provider’s environment settings, not in GitHub files:

- NEXT_PUBLIC_SUPABASE_URL: the Supabase project URL.
- NEXT_PUBLIC_SUPABASE_ANON_KEY: a publishable key or legacy anon key only.

The matching names are listed in .env.example. Do not add a service_role key, sb_secret key, database password, or connection string to browser-visible variables or this repository.

## Database migration

Review the target project for existing foukou_* tables and schema conflicts before applying supabase/migrations/202611040001_school_core.sql. The migration creates tables only; it does not seed or delete records. It enables row-level security and revokes client privileges from anon and authenticated. It intentionally creates no access policies, so browser reads and writes are denied by default.

Do not weaken RLS or add public policies to make school records work without authentication. Before real student, grade, or attendance data is used, add authentication and school-scoped policies, then review access with tests.

## Helper

lib/supabase.ts exposes a read-only PostgREST helper and accepts only publishable or anon keys. It is not wired into the demo screens yet. That is deliberate: until authentication and safe policies exist, the app must not read or write real school records.

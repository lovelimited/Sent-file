-- ------------------------------------------------------------------------------
-- MIGRATION: 20260904000002_activity_logs_insert_policy.sql
-- Description: Allow authenticated users to insert their own activity logs
-- ------------------------------------------------------------------------------

drop policy if exists "Authenticated users can insert own activity logs" on public.activity_logs;
create policy "Authenticated users can insert own activity logs"
  on public.activity_logs
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
  );

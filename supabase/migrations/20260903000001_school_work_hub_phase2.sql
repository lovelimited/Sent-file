-- ==============================================================================
-- SCHOOL WORK HUB — PHASE 2: DATABASE & RLS IMPLEMENTATION
-- Migration: 20260903000001_school_work_hub_phase2.sql
-- Description: Sets up user_groups, profiles, auth_identities, activity_logs,
--              triggers, functions, indexes, and comprehensive RLS policies.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TABLE: user_groups
-- ------------------------------------------------------------------------------
create table if not exists public.user_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

-- Index on user_groups.name
create index if not exists idx_user_groups_name on public.user_groups(name);

-- ------------------------------------------------------------------------------
-- 2. TABLE: profiles (connected to auth.users)
-- ------------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  name text not null,
  role text not null default 'teacher',
  group_id uuid references public.user_groups(id) on delete set null,
  active boolean not null default true,
  avatar_url text,
  last_seen timestamptz,
  last_password_change timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_profiles_role check (role in ('admin', 'teacher')),
  constraint chk_profiles_username_lower check (username = lower(username))
);

-- Indexes on profiles
create index if not exists idx_profiles_username on public.profiles(username);
create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_group_id on public.profiles(group_id);
create index if not exists idx_profiles_active on public.profiles(active);

-- ------------------------------------------------------------------------------
-- 3. TABLE: auth_identities (Bridge between username and auth user)
-- ------------------------------------------------------------------------------
create table if not exists public.auth_identities (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  created_at timestamptz not null default now(),
  constraint chk_auth_identities_username_lower check (username = lower(username))
);

-- Index on auth_identities.username
create index if not exists idx_auth_identities_username on public.auth_identities(username);

-- ------------------------------------------------------------------------------
-- 4. TABLE: activity_logs
-- ------------------------------------------------------------------------------
create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_type text,
  target_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);

-- Indexes on activity_logs
create index if not exists idx_activity_logs_user_id on public.activity_logs(user_id);
create index if not exists idx_activity_logs_created_at_desc on public.activity_logs(created_at desc);

-- ------------------------------------------------------------------------------
-- 5. FUNCTION & TRIGGER: update_updated_at()
-- ------------------------------------------------------------------------------
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trigger_update_profiles_updated_at on public.profiles;
create trigger trigger_update_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.update_updated_at();

-- ------------------------------------------------------------------------------
-- 6. FUNCTION: public.is_admin() (SECURITY DEFINER to avoid RLS recursion)
-- ------------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and active = true
  );
$$;

-- Revoke execute from public, grant to authenticated only
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- ------------------------------------------------------------------------------
-- 7. FUNCTION & TRIGGER: handle_new_user()
-- ------------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_raw_username text;
  v_clean_username text;
  v_name text;
  v_role text;
begin
  -- 1. Extract and normalize username (lowercase, trimmed)
  v_raw_username := coalesce(
    new.raw_user_meta_data->>'username',
    split_part(coalesce(new.email, ''), '@', 1)
  );

  v_clean_username := lower(trim(v_raw_username));

  -- Fallback if empty
  if v_clean_username is null or v_clean_username = '' then
    v_clean_username := 'user_' || substr(new.id::text, 1, 8);
  end if;

  -- 2. Extract name with fallback to username
  v_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'name'), ''),
    v_clean_username
  );

  -- 3. Extract role with default 'teacher'
  v_role := coalesce(
    nullif(trim(new.raw_user_meta_data->>'role'), ''),
    'teacher'
  );

  if v_role not in ('admin', 'teacher') then
    v_role := 'teacher';
  end if;

  -- 4. Upsert into public.profiles (NO password stored or read)
  insert into public.profiles (
    id,
    username,
    name,
    role,
    active,
    created_at,
    updated_at
  ) values (
    new.id,
    v_clean_username,
    v_name,
    v_role,
    true,
    now(),
    now()
  )
  on conflict (id) do update set
    username = excluded.username,
    name = excluded.name,
    role = excluded.role,
    updated_at = now();

  -- 5. Upsert into public.auth_identities (Bridge username -> user_id)
  insert into public.auth_identities (
    user_id,
    username,
    created_at
  ) values (
    new.id,
    v_clean_username,
    now()
  )
  on conflict (user_id) do update set
    username = excluded.username;

  return new;
end;
$$;

-- Trigger on auth.users table
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 8. DEFAULT USER GROUPS
-- ------------------------------------------------------------------------------
insert into public.user_groups (name) values
  ('ผู้บริหาร'),
  ('วิทยาศาสตร์'),
  ('คณิตศาสตร์'),
  ('ภาษาไทย'),
  ('ภาษาต่างประเทศ'),
  ('สังคมศึกษา'),
  ('ศิลปะ'),
  ('สุขศึกษาและพลศึกษา'),
  ('การงานอาชีพ'),
  ('เทคโนโลยี')
on conflict (name) do nothing;

-- ------------------------------------------------------------------------------
-- 9. ROW LEVEL SECURITY (RLS) CONFIGURATION
-- ------------------------------------------------------------------------------

-- Enable RLS on all tables
alter table public.user_groups enable row level security;
alter table public.profiles enable row level security;
alter table public.auth_identities enable row level security;
alter table public.activity_logs enable row level security;

-- ==============================================================================
-- RLS: user_groups
-- Authenticated users: SELECT
-- Admin: SELECT, INSERT, UPDATE, DELETE
-- ==============================================================================
drop policy if exists "Authenticated users can select user groups" on public.user_groups;
create policy "Authenticated users can select user groups"
  on public.user_groups
  for select
  to authenticated
  using (true);

drop policy if exists "Admins can insert user groups" on public.user_groups;
create policy "Admins can insert user groups"
  on public.user_groups
  for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Admins can update user groups" on public.user_groups;
create policy "Admins can update user groups"
  on public.user_groups
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can delete user groups" on public.user_groups;
create policy "Admins can delete user groups"
  on public.user_groups
  for delete
  to authenticated
  using (public.is_admin());

-- ==============================================================================
-- RLS: profiles
-- Teacher: SELECT own profile (id = auth.uid())
-- Admin: SELECT all profiles (is_admin())
-- Update: User can update own non-role fields OR Admin can update any
-- Insert / Delete: Forbidden from browser (done via Edge Functions / Trigger)
-- ==============================================================================
drop policy if exists "Users can view own profile or admin can view all" on public.profiles;
create policy "Users can view own profile or admin can view all"
  on public.profiles
  for select
  to authenticated
  using (
    id = auth.uid() or public.is_admin()
  );

drop policy if exists "Users can update own profile or admin can update any" on public.profiles;
create policy "Users can update own profile or admin can update any"
  on public.profiles
  for update
  to authenticated
  using (
    id = auth.uid() or public.is_admin()
  )
  with check (
    -- Normal users cannot elevate their own role
    (id = auth.uid() and role = (select p.role from public.profiles p where p.id = auth.uid()))
    or public.is_admin()
  );

-- No INSERT or DELETE policy on profiles for authenticated / anon.
-- Profiles creation/deletion is reserved for handle_new_user trigger and Edge Function.

-- ==============================================================================
-- RLS: auth_identities
-- Strictly protected: RLS enabled, NO public/authenticated SELECT/INSERT/UPDATE/DELETE.
-- Only accessible via SECURITY DEFINER triggers and privileged service_role Edge Functions.
-- ==============================================================================
drop policy if exists "No direct client access to auth identities" on public.auth_identities;
-- Intentionally no policies created for authenticated or anon.

-- ==============================================================================
-- RLS: activity_logs
-- Admin: SELECT allowed
-- Teacher: Denied (cannot view logs)
-- Insert / Update / Delete: Restricted to trusted server / Edge Function
-- ==============================================================================
drop policy if exists "Admins can view activity logs" on public.activity_logs;
create policy "Admins can view activity logs"
  on public.activity_logs
  for select
  to authenticated
  using (public.is_admin());

-- Intentionally no client INSERT, UPDATE, or DELETE policies on activity_logs.

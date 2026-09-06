-- ------------------------------------------------------------------------------
-- MIGRATION: 20260904000001_admin_user_management_rpc.sql
-- Description: Direct Database RPCs for Admin User Management
-- (Enables seamless admin user creation, password resets, active toggle, and deletion)
-- ------------------------------------------------------------------------------

-- Ensure required extension
create extension if not exists pgcrypto with schema extensions;

-- ------------------------------------------------------------------------------
-- 1. RPC: public.admin_create_user
-- ------------------------------------------------------------------------------
create or replace function public.admin_create_user(
  p_username text,
  p_name text,
  p_role text default 'teacher',
  p_group_id uuid default null,
  p_password text default '123456',
  p_nickname text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, auth
as $$
declare
  v_user_id uuid;
  v_email text;
  v_clean_username text;
  v_role user_role;
begin
  -- Verify admin privileges
  if not exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ) then
    return jsonb_build_object('error', 'Unauthorized: เฉพาะผู้ดูแลระบบ (Admin) เท่านั้น');
  end if;

  v_clean_username := lower(trim(p_username));
  if length(v_clean_username) < 3 then
    return jsonb_build_object('error', 'ชื่อผู้ใช้ต้องมีความยาวอย่างน้อย 3 ตัวอักษร');
  end if;

  -- Check if username already exists in profiles
  if exists (
    select 1 from public.profiles where username = v_clean_username
  ) then
    return jsonb_build_object('error', 'ชื่อผู้ใช้ "' || v_clean_username || '" มีอยู่ในระบบแล้ว');
  end if;

  v_email := v_clean_username || '@school.local';

  -- Clean up any ghost record in auth.users if previously orphaned
  delete from auth.users where email = v_email;

  v_user_id := gen_random_uuid();
  if p_role = 'admin' then
    v_role := 'admin'::user_role;
  else
    v_role := 'teacher'::user_role;
  end if;

  -- Insert into auth.users (trigger on_auth_user_created will create profile + auth_identity)
  insert into auth.users (
    id, instance_id, email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    raw_app_meta_data,
    role, aud,
    confirmation_token, recovery_token, email_change_token_new,
    email_change, reauthentication_token, phone_change,
    phone_change_token, email_change_token_current, email_change_confirm_status,
    created_at, updated_at
  ) values (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    v_email,
    crypt(p_password, gen_salt('bf')),
    now(),
    jsonb_build_object('username', v_clean_username, 'name', trim(p_name), 'role', p_role, 'nickname', trim(p_nickname)),
    '{"provider":"email","providers":["email"]}'::jsonb,
    'authenticated', 'authenticated',
    '', '', '', '', '', '', '', '', 0,
    now(), now()
  );

  -- Ensure identity exists
  insert into auth.identities (
    id, user_id, provider_id,
    identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), v_user_id, v_user_id::text,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true, 'phone_verified', false),
    'email',
    now(), now(), now()
  )
  on conflict (provider, provider_id) do nothing;

  -- Upsert profile with full details
  insert into public.profiles (id, username, name, nickname, role, group_id, active)
  values (v_user_id, v_clean_username, trim(p_name), trim(p_nickname), v_role, p_group_id, true)
  on conflict (id) do update set
    username = excluded.username,
    name = excluded.name,
    nickname = excluded.nickname,
    role = excluded.role,
    group_id = excluded.group_id,
    active = true;

  -- Log admin action
  insert into public.activity_logs (
    user_id,
    action,
    target_type,
    target_id,
    details
  ) values (
    auth.uid(),
    'create_user',
    'profile',
    v_user_id,
    jsonb_build_object('username', v_clean_username, 'name', trim(p_name), 'role', p_role)
  );

  return jsonb_build_object('success', true, 'user_id', v_user_id, 'username', v_clean_username);
exception
  when others then
    return jsonb_build_object('error', sqlerrm);
end;
$$;

-- ------------------------------------------------------------------------------
-- 2. RPC: public.admin_reset_password
-- ------------------------------------------------------------------------------
create or replace function public.admin_reset_password(
  p_user_id uuid,
  p_new_password text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, auth
as $$
declare
  v_caller_id uuid := auth.uid();
begin
  if not public.is_admin() then
    raise exception 'Unauthorized: เฉพาะผู้ดูแลระบบ (Admin) เท่านั้น';
  end if;

  if length(p_new_password) < 6 then
    raise exception 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร';
  end if;

  update auth.users
  set encrypted_password = extensions.crypt(p_new_password, extensions.gen_salt('bf')),
      updated_at = now()
  where id = p_user_id;

  update public.profiles
  set last_password_change = now(),
      updated_at = now()
  where id = p_user_id;

  insert into public.activity_logs (
    user_id,
    action,
    target_type,
    target_id,
    details
  ) values (
    v_caller_id,
    'reset_password',
    'profile',
    p_user_id,
    jsonb_build_object('user_id', p_user_id)
  );

  return jsonb_build_object('success', true);
end;
$$;

-- ------------------------------------------------------------------------------
-- 3. RPC: public.admin_toggle_active
-- ------------------------------------------------------------------------------
create or replace function public.admin_toggle_active(
  p_user_id uuid,
  p_active boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid := auth.uid();
begin
  if not public.is_admin() then
    raise exception 'Unauthorized: เฉพาะผู้ดูแลระบบ (Admin) เท่านั้น';
  end if;

  if p_user_id = v_caller_id then
    raise exception 'ไม่สามารถระงับบัญชีของตนเองได้';
  end if;

  update public.profiles
  set active = p_active,
      updated_at = now()
  where id = p_user_id;

  insert into public.activity_logs (
    user_id,
    action,
    target_type,
    target_id,
    details
  ) values (
    v_caller_id,
    case when p_active then 'activate_user' else 'deactivate_user' end,
    'profile',
    p_user_id,
    jsonb_build_object('active', p_active)
  );

  return jsonb_build_object('success', true, 'active', p_active);
end;
$$;

-- ------------------------------------------------------------------------------
-- 4. RPC: public.admin_delete_user
-- ------------------------------------------------------------------------------
create or replace function public.admin_delete_user(
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_caller_id uuid := auth.uid();
  v_username text;
begin
  if not public.is_admin() then
    raise exception 'Unauthorized: เฉพาะผู้ดูแลระบบ (Admin) เท่านั้น';
  end if;

  if p_user_id = v_caller_id then
    raise exception 'ไม่สามารถลบบัญชีของตนเองได้';
  end if;

  select username into v_username from public.profiles where id = p_user_id;

  -- Clean up child references safely
  delete from auth.identities where user_id = p_user_id;
  delete from public.auth_identities where user_id = p_user_id;
  delete from public.task_assignments where teacher_id = p_user_id;
  delete from public.notifications where user_id = p_user_id;
  delete from public.chat_messages where sender_id = p_user_id;
  delete from public.profiles where id = p_user_id;
  delete from auth.users where id = p_user_id;

  insert into public.activity_logs (
    user_id,
    action,
    target_type,
    target_id,
    details
  ) values (
    v_caller_id,
    'delete_user',
    'profile',
    p_user_id,
    jsonb_build_object('username', v_username)
  );

  return jsonb_build_object('success', true);
end;
$$;

-- Grant execution to authenticated users (functions enforce is_admin internally)
revoke all on function public.admin_create_user from public;
grant execute on function public.admin_create_user to authenticated;

revoke all on function public.admin_reset_password from public;
grant execute on function public.admin_reset_password to authenticated;

revoke all on function public.admin_toggle_active from public;
grant execute on function public.admin_toggle_active to authenticated;

revoke all on function public.admin_delete_user from public;
grant execute on function public.admin_delete_user to authenticated;

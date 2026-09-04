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
  p_password text default 'Teacher1234!'
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, auth
as $$
declare
  v_caller_id uuid := auth.uid();
  v_clean_username text;
  v_new_user_id uuid;
  v_internal_email text;
  v_encrypted_pw text;
begin
  -- Verify admin privileges
  if not public.is_admin() then
    raise exception 'Unauthorized: เฉพาะผู้ดูแลระบบ (Admin) เท่านั้น';
  end if;

  v_clean_username := lower(trim(p_username));
  if v_clean_username is null or length(v_clean_username) < 3 then
    raise exception 'ชื่อผู้ใช้ต้องมีความยาวอย่างน้อย 3 ตัวอักษร';
  end if;

  if length(p_password) < 6 then
    raise exception 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร';
  end if;

  -- Check if username already exists in auth_identities or profiles
  if exists (select 1 from public.auth_identities where username = v_clean_username) or
     exists (select 1 from public.profiles where username = v_clean_username) then
    raise exception 'ชื่อผู้ใช้งาน "%" มีอยู่ในระบบแล้ว', v_clean_username;
  end if;

  v_new_user_id := gen_random_uuid();
  v_internal_email := v_clean_username || '@school.local';
  v_encrypted_pw := extensions.crypt(p_password, extensions.gen_salt('bf'));

  -- Insert into auth.users (which triggers handle_new_user and creates profile + auth_identity)
  insert into auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at,
    is_sso_user,
    is_anonymous,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    reauthentication_token,
    phone_change,
    phone_change_token,
    email_change_token_current,
    email_change_confirm_status
  ) values (
    v_new_user_id,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    v_internal_email,
    v_encrypted_pw,
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object(
      'username', v_clean_username,
      'name', trim(p_name),
      'role', case when p_role = 'admin' then 'admin' else 'teacher' end
    ),
    null,
    now(),
    now(),
    false,
    false,
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    0
  );

  -- Insert into auth.identities for GoTrue email provider lookup
  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    created_at,
    updated_at
  ) values (
    gen_random_uuid(),
    v_new_user_id,
    jsonb_build_object(
      'sub', v_new_user_id::text,
      'email', v_internal_email,
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    v_new_user_id::text,
    now(),
    now()
  );

  -- Update group_id if provided
  if p_group_id is not null then
    update public.profiles
    set group_id = p_group_id
    where id = v_new_user_id;
  end if;

  -- Log admin action
  insert into public.activity_logs (
    user_id,
    action,
    target_type,
    target_id,
    details
  ) values (
    v_caller_id,
    'create_user',
    'profile',
    v_new_user_id,
    jsonb_build_object('username', v_clean_username, 'name', trim(p_name), 'role', p_role)
  );

  return jsonb_build_object(
    'success', true,
    'user_id', v_new_user_id,
    'username', v_clean_username
  );
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

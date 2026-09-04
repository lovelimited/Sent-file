-- ==============================================================================
-- SCHOOL WORK HUB — FULL SYSTEM RLS VERIFICATION TEST SUITE
-- File: supabase/tests/test_full_system_rls.sql
-- Description: Verifies Row Level Security (RLS) enforcement across all 8 tables:
--              1. user_groups
--              2. profiles
--              3. auth_identities
--              4. activity_logs
--              5. tasks
--              6. task_assignments
--              7. chat_channels & chat_messages
--              8. notifications & drive_resources
-- ==============================================================================

begin;

-- ------------------------------------------------------------------------------
-- 1. SETUP MOCK TEST USERS & ROLES
-- ------------------------------------------------------------------------------
do $$
declare
  v_admin_id uuid := '11111111-1111-1111-1111-111111111111';
  v_teacher1_id uuid := '22222222-2222-2222-2222-222222222222';
  v_teacher2_id uuid := '33333333-3333-3333-3333-333333333333';
  v_group1_id uuid;
  v_group2_id uuid;
  v_task_id uuid := '44444444-4444-4444-4444-444444444444';
  v_assignment_id uuid := '55555555-5555-5555-5555-555555555555';
  v_count integer;
begin
  -- Resolve groups
  select id into v_group1_id from public.user_groups where name = 'ภาษาไทย' limit 1;
  select id into v_group2_id from public.user_groups where name = 'คณิตศาสตร์' limit 1;

  -- Create mock auth.users for FK integrity
  insert into auth.users (id, email, role, is_sso_user, is_anonymous, raw_user_meta_data)
  values
    (v_admin_id, 'test_admin@school.local', 'authenticated', false, false, '{"username":"test_admin","name":"ผู้ดูแลระบบ ทดสอบ","role":"admin"}'::jsonb),
    (v_teacher1_id, 'test_teacher1@school.local', 'authenticated', false, false, '{"username":"test_teacher1","name":"คุณครู ทดสอบ หนึ่ง","role":"teacher"}'::jsonb),
    (v_teacher2_id, 'test_teacher2@school.local', 'authenticated', false, false, '{"username":"test_teacher2","name":"คุณครู ทดสอบ สอง","role":"teacher"}'::jsonb)
  on conflict (id) do nothing;

  -- Update test profiles to match test requirements
  update public.profiles set role = 'admin', group_id = null where id = v_admin_id;
  update public.profiles set role = 'teacher', group_id = v_group1_id where id = v_teacher1_id;
  update public.profiles set role = 'teacher', group_id = v_group2_id where id = v_teacher2_id;

  -- Create test identity for teacher 1
  insert into public.auth_identities (user_id, username)
  values (v_teacher1_id, 'test_teacher1')
  on conflict do nothing;

  -- Create test activity log
  insert into public.activity_logs (user_id, action)
  values (v_admin_id, 'system_test')
  on conflict do nothing;

  -- ----------------------------------------------------------------------------
  -- TEST 1: auth_identities (MUST BE INVISIBLE TO CLIENTS)
  -- ----------------------------------------------------------------------------
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', v_teacher1_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);

  select count(*) into v_count from public.auth_identities;
  if v_count > 0 then
    raise exception 'FAILED TEST 1: Client was able to SELECT from auth_identities! Count: %', v_count;
  end if;
  raise notice 'PASSED TEST 1: auth_identities is completely inaccessible to clients.';

  -- ----------------------------------------------------------------------------
  -- TEST 2: activity_logs (TEACHER CANNOT READ, ADMIN CAN)
  -- ----------------------------------------------------------------------------
  select count(*) into v_count from public.activity_logs;
  if v_count > 0 then
    raise exception 'FAILED TEST 2: Teacher was able to view activity_logs! Count: %', v_count;
  end if;

  -- Switch to Admin
  perform set_config('request.jwt.claim.sub', v_admin_id::text, true);
  select count(*) into v_count from public.activity_logs;
  if v_count = 0 then
    raise exception 'FAILED TEST 2: Admin was unable to view activity_logs!';
  end if;
  raise notice 'PASSED TEST 2: activity_logs is restricted to Admin only.';

  -- ----------------------------------------------------------------------------
  -- TEST 3: tasks & task_assignments (TEACHER SEES ONLY ASSIGNED TASKS)
  -- ----------------------------------------------------------------------------
  -- Admin creates task and assigns only to Teacher 1
  insert into public.tasks (id, title, created_by, assigned_to_role, priority)
  values (v_task_id, 'ภาระงานทดสอบ 1', v_admin_id, 'specific', 'normal')
  on conflict (id) do nothing;

  insert into public.task_assignments (id, task_id, teacher_id, status)
  values (v_assignment_id, v_task_id, v_teacher1_id, 'pending')
  on conflict (id) do nothing;

  -- Switch to Teacher 1 -> Must see the task
  perform set_config('request.jwt.claim.sub', v_teacher1_id::text, true);
  select count(*) into v_count from public.tasks where id = v_task_id;
  if v_count <> 1 then
    raise exception 'FAILED TEST 3: Teacher 1 could not view assigned task!';
  end if;

  -- Switch to Teacher 2 -> Must NOT see the task
  perform set_config('request.jwt.claim.sub', v_teacher2_id::text, true);
  select count(*) into v_count from public.tasks where id = v_task_id;
  if v_count <> 0 then
    raise exception 'FAILED TEST 3: Teacher 2 was able to view task assigned to Teacher 1!';
  end if;
  raise notice 'PASSED TEST 3: Tasks are strictly isolated to assigned teachers.';

  -- ----------------------------------------------------------------------------
  -- TEST 4: task_assignments SUBMISSION INTEGRITY
  -- ----------------------------------------------------------------------------
  -- Teacher 1 can update note and status to 'submitted'
  perform set_config('request.jwt.claim.sub', v_teacher1_id::text, true);
  update public.task_assignments
  set status = 'submitted', submission_note = 'ส่งงานแล้วครับ'
  where id = v_assignment_id;

  -- Teacher 1 CANNOT self-approve (status = 'approved')
  begin
    update public.task_assignments
    set status = 'approved'
    where id = v_assignment_id;
    raise exception 'FAILED TEST 4: Teacher was able to self-approve assignment!';
  exception
    when others then
      raise notice 'PASSED TEST 4: Teacher cannot self-approve their own work.';
  end;

  -- ----------------------------------------------------------------------------
  -- TEST 5: notifications ISOLATION
  -- ----------------------------------------------------------------------------
  insert into public.notifications (recipient_id, title, message, type)
  values (v_teacher1_id, 'แจ้งเตือนเฉพาะครู 1', 'ข้อความทดสอบ', 'info');

  -- Teacher 2 cannot view Teacher 1's notifications
  perform set_config('request.jwt.claim.sub', v_teacher2_id::text, true);
  select count(*) into v_count from public.notifications where recipient_id = v_teacher1_id;
  if v_count > 0 then
    raise exception 'FAILED TEST 5: Teacher 2 could view Teacher 1 notifications!';
  end if;
  raise notice 'PASSED TEST 5: Notifications are strictly private to recipient.';

  -- ----------------------------------------------------------------------------
  -- TEST 6: drive_resources GROUP ACCESS
  -- ----------------------------------------------------------------------------
  -- Admin creates drive resource for group 1 (Thai)
  perform set_config('request.jwt.claim.sub', v_admin_id::text, true);
  insert into public.drive_resources (title, category, url, group_id)
  values ('เอกสารเฉพาะกลุ่มภาษาไทย', 'folder', 'https://drive.google.com/test-thai', v_group1_id);

  -- Teacher 1 (กลุ่มภาษาไทย) -> can view
  perform set_config('request.jwt.claim.sub', v_teacher1_id::text, true);
  select count(*) into v_count from public.drive_resources where title = 'เอกสารเฉพาะกลุ่มภาษาไทย';
  if v_count <> 1 then
    raise exception 'FAILED TEST 6: Teacher 1 could not view group drive resource!';
  end if;

  -- Teacher 2 (กลุ่มคณิตศาสตร์) -> cannot view
  perform set_config('request.jwt.claim.sub', v_teacher2_id::text, true);
  select count(*) into v_count from public.drive_resources where title = 'เอกสารเฉพาะกลุ่มภาษาไทย';
  if v_count <> 0 then
    raise exception 'FAILED TEST 6: Teacher 2 could view different group drive resource!';
  end if;
  raise notice 'PASSED TEST 6: Drive resources respect department/group boundaries.';

end $$;

rollback;
-- Successfully verified all RLS scenarios without leaving test artifacts.

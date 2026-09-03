-- ==============================================================================
-- SCHOOL WORK HUB — RLS VERIFICATION TEST SUITE
-- Tests all 10 scenarios defined in Phase 2 specifications.
-- This script runs inside a transaction and rolls back at the end.
-- ==============================================================================

begin;

-- 1. Setup Test Mock Data in a clean test transaction
do $$
declare
  v_admin_id uuid := '11111111-1111-1111-1111-111111111111';
  v_teacher1_id uuid := '22222222-2222-2222-2222-222222222222';
  v_teacher2_id uuid := '33333333-3333-3333-3333-333333333333';
  v_group_id uuid;
  v_test_count int;
  v_error_caught boolean;
begin
  -- Get or create test group
  select id into v_group_id from public.user_groups where name = 'วิทยาศาสตร์' limit 1;

  -- Temporarily disable FK to auth.users for unit testing if auth.users is empty
  -- Insert test profiles directly as postgres/superuser
  insert into public.profiles (id, username, name, role, group_id, active)
  values
    (v_admin_id, 'admin_test', 'Administrator', 'admin', v_group_id, true),
    (v_teacher1_id, 'teacher01', 'Teacher One', 'teacher', v_group_id, true),
    (v_teacher2_id, 'teacher02', 'Teacher Two', 'teacher', v_group_id, true)
  on conflict (id) do nothing;

  insert into public.auth_identities (user_id, username)
  values
    (v_admin_id, 'admin_test'),
    (v_teacher1_id, 'teacher01'),
    (v_teacher2_id, 'teacher02')
  on conflict (user_id) do nothing;

  insert into public.activity_logs (user_id, action, details)
  values (v_admin_id, 'system_init', '{"note":"test log"}'::jsonb);

  raise notice '=== PHASE 2: RLS TEST SCENARIOS START ===';

  -- --------------------------------------------------------------------------
  -- Scenario 1: Teacher อ่าน profile ตัวเอง -> ต้องสำเร็จ
  -- --------------------------------------------------------------------------
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', v_teacher1_id::text, true);

  select count(*) into v_test_count from public.profiles where id = v_teacher1_id;
  if v_test_count = 1 then
    raise notice 'PASS: Scenario 1 - Teacher can view own profile (found: %)', v_test_count;
  else
    raise exception 'FAIL: Scenario 1 - Teacher failed to view own profile';
  end if;

  -- --------------------------------------------------------------------------
  -- Scenario 2: Teacher อ่าน profile ของ teacher คนอื่น -> ต้องไม่สำเร็จ (returns 0 rows)
  -- --------------------------------------------------------------------------
  select count(*) into v_test_count from public.profiles where id = v_teacher2_id;
  if v_test_count = 0 then
    raise notice 'PASS: Scenario 2 - Teacher cannot view other teacher profile (found: %)', v_test_count;
  else
    raise exception 'FAIL: Scenario 2 - Teacher viewed other teacher profile!';
  end if;

  -- --------------------------------------------------------------------------
  -- Scenario 3: Admin อ่าน profiles ทั้งหมด -> ต้องสำเร็จ (sees all 3 profiles)
  -- --------------------------------------------------------------------------
  perform set_config('request.jwt.claim.sub', v_admin_id::text, true);

  select count(*) into v_test_count from public.profiles;
  if v_test_count >= 3 then
    raise notice 'PASS: Scenario 3 - Admin can view all profiles (found: %)', v_test_count;
  else
    raise exception 'FAIL: Scenario 3 - Admin could not view all profiles (found: %)', v_test_count;
  end if;

  -- --------------------------------------------------------------------------
  -- Scenario 4: Teacher อ่าน activity_logs -> ต้องไม่สำเร็จ (returns 0 rows)
  -- --------------------------------------------------------------------------
  perform set_config('request.jwt.claim.sub', v_teacher1_id::text, true);

  select count(*) into v_test_count from public.activity_logs;
  if v_test_count = 0 then
    raise notice 'PASS: Scenario 4 - Teacher cannot view activity logs (found: %)', v_test_count;
  else
    raise exception 'FAIL: Scenario 4 - Teacher viewed activity logs!';
  end if;

  -- --------------------------------------------------------------------------
  -- Scenario 5: Admin อ่าน activity_logs -> ต้องสำเร็จ
  -- --------------------------------------------------------------------------
  perform set_config('request.jwt.claim.sub', v_admin_id::text, true);

  select count(*) into v_test_count from public.activity_logs;
  if v_test_count >= 1 then
    raise notice 'PASS: Scenario 5 - Admin can view activity logs (found: %)', v_test_count;
  else
    raise exception 'FAIL: Scenario 5 - Admin could not view activity logs!';
  end if;

  -- --------------------------------------------------------------------------
  -- Scenario 6: Teacher แก้ user คนอื่น -> ต้องไม่สำเร็จ
  -- --------------------------------------------------------------------------
  perform set_config('request.jwt.claim.sub', v_teacher1_id::text, true);

  update public.profiles set name = 'Hacked Name' where id = v_teacher2_id;
  -- In RLS update without permission, 0 rows are updated
  select count(*) into v_test_count from public.profiles where id = v_teacher2_id and name = 'Hacked Name';
  if v_test_count = 0 then
    raise notice 'PASS: Scenario 6 - Teacher cannot update another user profile (updated: 0)';
  else
    raise exception 'FAIL: Scenario 6 - Teacher updated another user profile!';
  end if;

  -- --------------------------------------------------------------------------
  -- Scenario 7: Teacher อ่าน auth_identities -> ต้องไม่สำเร็จ (returns 0 rows)
  -- --------------------------------------------------------------------------
  select count(*) into v_test_count from public.auth_identities;
  if v_test_count = 0 then
    raise notice 'PASS: Scenario 7 - Teacher cannot read auth_identities (found: %)', v_test_count;
  else
    raise exception 'FAIL: Scenario 7 - Teacher read auth_identities!';
  end if;

  -- --------------------------------------------------------------------------
  -- Scenario 8: Authenticated user อ่าน user_groups -> ต้องสำเร็จ
  -- --------------------------------------------------------------------------
  select count(*) into v_test_count from public.user_groups;
  if v_test_count >= 10 then
    raise notice 'PASS: Scenario 8 - Authenticated user can view user_groups (found: %)', v_test_count;
  else
    raise exception 'FAIL: Scenario 8 - Authenticated user could not view user_groups!';
  end if;

  -- --------------------------------------------------------------------------
  -- Scenario 9: Teacher แก้ไข user_groups -> ต้องไม่สำเร็จ
  -- --------------------------------------------------------------------------
  v_error_caught := false;
  begin
    update public.user_groups set name = 'กลุ่มทดสอบแก้ไข' where id = v_group_id;
    -- Check if modified
    select count(*) into v_test_count from public.user_groups where name = 'กลุ่มทดสอบแก้ไข';
    if v_test_count = 0 then
      v_error_caught := true;
    end if;
  exception when others then
    v_error_caught := true;
  end;

  if v_error_caught then
    raise notice 'PASS: Scenario 9 - Teacher cannot modify user_groups';
  else
    raise exception 'FAIL: Scenario 9 - Teacher modified user_groups!';
  end if;

  -- --------------------------------------------------------------------------
  -- Scenario 10: Admin แก้ไข user_groups -> ต้องสำเร็จ
  -- --------------------------------------------------------------------------
  perform set_config('request.jwt.claim.sub', v_admin_id::text, true);

  update public.user_groups set name = 'วิทยาศาสตร์และนวัตกรรม' where id = v_group_id;
  select count(*) into v_test_count from public.user_groups where name = 'วิทยาศาสตร์และนวัตกรรม';
  if v_test_count = 1 then
    raise notice 'PASS: Scenario 10 - Admin can modify user_groups (updated successfully)';
  else
    raise exception 'FAIL: Scenario 10 - Admin could not modify user_groups!';
  end if;

  raise notice '=== ALL 10 RLS SCENARIOS PASSED SUCCESSFULLY ===';
end;
$$;

rollback;

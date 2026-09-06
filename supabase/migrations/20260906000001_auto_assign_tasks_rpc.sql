-- ------------------------------------------------------------------------------
-- MIGRATION: 20260906000001_auto_assign_tasks_rpc.sql
-- Description: Auto assign open school tasks to newly added/registered teachers
-- and exclude Admins from task submissions
-- ------------------------------------------------------------------------------

-- 1. Ensure unique index on task_assignments (task_id, teacher_id)
create unique index if not exists idx_task_assignments_task_teacher 
on public.task_assignments (task_id, teacher_id);

-- 2. Remove any accidental admin assignments
delete from public.task_assignments
where teacher_id in (select id from public.profiles where role = 'admin');

-- 3. Stored Procedure: public.sync_user_task_assignments
create or replace function public.sync_user_task_assignments(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_role user_role;
  v_group_id uuid;
  v_active boolean;
begin
  select role, group_id, active 
  into v_role, v_group_id, v_active
  from public.profiles 
  where id = p_user_id;

  -- Admins never submit tasks, inactive users do not get tasks
  if v_role = 'admin' or v_active is false then
    return;
  end if;

  -- Insert missing assignments for all open tasks targeted to 'all', 'teachers', or matching teacher's group
  insert into public.task_assignments (task_id, teacher_id, status, created_at, updated_at)
  select 
    t.id as task_id,
    p_user_id as teacher_id,
    'pending' as status,
    now() as created_at,
    now() as updated_at
  from public.tasks t
  where t.status = 'open'
    and (
      t.assigned_to_role in ('all', 'teachers')
      or (t.assigned_to_role = 'group' and t.target_group_id is not null and t.target_group_id = v_group_id)
    )
  on conflict (task_id, teacher_id) do nothing;
end;
$$;

-- 4. Trigger on profiles to automatically sync whenever a new profile is created or updated
create or replace function public.trg_fn_profiles_sync_tasks()
returns trigger
language plpgsql
security definer
as $$
begin
  if NEW.role != 'admin' and NEW.active is true then
    perform public.sync_user_task_assignments(NEW.id);
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_profiles_sync_tasks on public.profiles;
create trigger trg_profiles_sync_tasks
  after insert or update of group_id, active, role
  on public.profiles
  for each row
  execute function public.trg_fn_profiles_sync_tasks();

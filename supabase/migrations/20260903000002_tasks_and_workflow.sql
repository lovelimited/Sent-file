-- ==============================================================================
-- SCHOOL WORK HUB — PHASE 5: TASK MANAGEMENT & WORKFLOW SYSTEM
-- Migration: 20260903000002_tasks_and_workflow.sql
-- Description: Creates tasks and task_assignments tables, triggers, indexes,
--              and Row Level Security (RLS) policies for school workflow.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TABLE: tasks
-- ------------------------------------------------------------------------------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  created_by uuid not null references public.profiles(id) on delete cascade,
  assigned_to_role text not null default 'all' check (assigned_to_role in ('all', 'teachers', 'group', 'specific')),
  target_group_id uuid references public.user_groups(id) on delete set null,
  due_date timestamptz,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for tasks
create index if not exists idx_tasks_created_by on public.tasks(created_by);
create index if not exists idx_tasks_target_group_id on public.tasks(target_group_id);
create index if not exists idx_tasks_due_date on public.tasks(due_date);
create index if not exists idx_tasks_priority on public.tasks(priority);
create index if not exists idx_tasks_status on public.tasks(status);

-- Trigger for updated_at
drop trigger if exists trigger_update_tasks_updated_at on public.tasks;
create trigger trigger_update_tasks_updated_at
  before update on public.tasks
  for each row
  execute function public.update_updated_at();

-- ------------------------------------------------------------------------------
-- 2. TABLE: task_assignments
-- ------------------------------------------------------------------------------
create table if not exists public.task_assignments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'submitted', 'approved', 'rejected')),
  submission_note text,
  submission_url text,
  submitted_at timestamptz,
  feedback text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_task_teacher unique (task_id, teacher_id)
);

-- Indexes for task_assignments
create index if not exists idx_task_assignments_task_id on public.task_assignments(task_id);
create index if not exists idx_task_assignments_teacher_id on public.task_assignments(teacher_id);
create index if not exists idx_task_assignments_status on public.task_assignments(status);
create index if not exists idx_task_assignments_submitted_at on public.task_assignments(submitted_at);

-- Trigger for updated_at
drop trigger if exists trigger_update_task_assignments_updated_at on public.task_assignments;
create trigger trigger_update_task_assignments_updated_at
  before update on public.task_assignments
  for each row
  execute function public.update_updated_at();

-- ------------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------

-- Enable RLS
alter table public.tasks enable row level security;
alter table public.task_assignments enable row level security;

-- ==============================================================================
-- RLS: tasks
-- Teacher: Can view tasks where they have an assignment OR if admin
-- Admin: Full access (SELECT, INSERT, UPDATE, DELETE)
-- ==============================================================================
drop policy if exists "Users can view assigned tasks or admin view all" on public.tasks;
create policy "Users can view assigned tasks or admin view all"
  on public.tasks
  for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.task_assignments ta
      where ta.task_id = tasks.id
        and ta.teacher_id = auth.uid()
    )
  );

drop policy if exists "Admins can insert tasks" on public.tasks;
create policy "Admins can insert tasks"
  on public.tasks
  for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Admins can update tasks" on public.tasks;
create policy "Admins can update tasks"
  on public.tasks
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can delete tasks" on public.tasks;
create policy "Admins can delete tasks"
  on public.tasks
  for delete
  to authenticated
  using (public.is_admin());

-- ==============================================================================
-- RLS: task_assignments
-- Teacher: Can view own assignments (teacher_id = auth.uid())
-- Teacher: Can update own assignment submission fields (submission_note, submission_url, status)
-- Admin: Full access (SELECT, INSERT, UPDATE, DELETE, REVIEW)
-- ==============================================================================
drop policy if exists "Users can view own assignments or admin view all" on public.task_assignments;
create policy "Users can view own assignments or admin view all"
  on public.task_assignments
  for select
  to authenticated
  using (
    teacher_id = auth.uid() or public.is_admin()
  );

drop policy if exists "Admins can insert task assignments" on public.task_assignments;
create policy "Admins can insert task assignments"
  on public.task_assignments
  for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Teachers can update own submission or admin update any" on public.task_assignments;
create policy "Teachers can update own submission or admin update any"
  on public.task_assignments
  for update
  to authenticated
  using (
    teacher_id = auth.uid() or public.is_admin()
  )
  with check (
    -- Teachers cannot approve/reject their own work (only submit or start)
    (
      teacher_id = auth.uid()
      and status in ('pending', 'in_progress', 'submitted')
      and feedback is not distinct from (select ta.feedback from public.task_assignments ta where ta.id = task_assignments.id)
      and reviewed_by is not distinct from (select ta.reviewed_by from public.task_assignments ta where ta.id = task_assignments.id)
    )
    or public.is_admin()
  );

drop policy if exists "Admins can delete task assignments" on public.task_assignments;
create policy "Admins can delete task assignments"
  on public.task_assignments
  for delete
  to authenticated
  using (public.is_admin());

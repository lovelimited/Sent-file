-- ==============================================================================
-- SCHOOL WORK HUB — PHASE 7: GOOGLE DRIVE INTEGRATION & EXPORT TOOLS
-- Migration: 20260903000004_drive_and_exports.sql
-- Description: Creates drive_resources table for central school Google Drive
--              folders and document templates, with RLS policies and seed data.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TABLE: drive_resources
-- ------------------------------------------------------------------------------
create table if not exists public.drive_resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text not null default 'template' check (category in ('folder', 'template', 'guideline', 'asset')),
  url text not null,
  group_id uuid references public.user_groups(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for drive_resources
create index if not exists idx_drive_resources_category on public.drive_resources(category);
create index if not exists idx_drive_resources_group_id on public.drive_resources(group_id);
create index if not exists idx_drive_resources_created_at on public.drive_resources(created_at desc);

-- Trigger for updated_at
drop trigger if exists trigger_update_drive_resources_updated_at on public.drive_resources;
create trigger trigger_update_drive_resources_updated_at
  before update on public.drive_resources
  for each row
  execute function public.update_updated_at();

-- ------------------------------------------------------------------------------
-- 2. SEED DEFAULT DRIVE FOLDERS & TEMPLATES
-- ------------------------------------------------------------------------------
-- Central School Drive Root Folder
insert into public.drive_resources (title, description, category, url)
values (
  'คลัง Google Drive กลางโรงเรียน',
  'โฟลเดอร์หลักสำหรับจัดเก็บเอกสารทางการ คำสั่งโรงเรียน และระเบียบปฏิบัติราชการ',
  'folder',
  'https://drive.google.com/drive/folders/school-work-hub-root'
) on conflict do nothing;

-- Official Lesson Plan Template
insert into public.drive_resources (title, description, category, url)
values (
  'แม่แบบแผนการจัดการเรียนรู้ (Lesson Plan Template)',
  'แบบฟอร์มมาตรฐานสำหรับการเขียนแผนการจัดการเรียนรู้ ภาคเรียนปัจจุบัน',
  'template',
  'https://docs.google.com/document/d/sample-lesson-plan-template'
) on conflict do nothing;

-- Official Classroom Action Research Template
insert into public.drive_resources (title, description, category, url)
values (
  'แม่แบบรายงานวิจัยในชั้นเรียน (Classroom Research)',
  'เค้าโครงการเขียนรายงานการวิจัยในชั้นเรียนเพื่อพัฒนาการเรียนรู้ของผู้เรียน',
  'template',
  'https://docs.google.com/document/d/sample-classroom-research'
) on conflict do nothing;

-- Official School Logo & Assets
insert into public.drive_resources (title, description, category, url)
values (
  'ตราสัญลักษณ์โรงเรียนและเทมเพลตนำเสนอ',
  'ไฟล์ตราสัญลักษณ์โรงเรียนความละเอียดสูง (PNG/SVG) และสไลด์นำเสนอทางการ',
  'asset',
  'https://drive.google.com/drive/folders/school-logos-and-assets'
) on conflict do nothing;

-- ------------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------

alter table public.drive_resources enable row level security;

-- All authenticated users can view resources (global resources or resources belonging to their group)
drop policy if exists "Authenticated users can view accessible drive resources" on public.drive_resources;
create policy "Authenticated users can view accessible drive resources"
  on public.drive_resources
  for select
  to authenticated
  using (
    group_id is null
    or public.is_admin()
    or group_id = (select p.group_id from public.profiles p where p.id = auth.uid())
  );

-- Admins can insert drive resources
drop policy if exists "Admins can insert drive resources" on public.drive_resources;
create policy "Admins can insert drive resources"
  on public.drive_resources
  for insert
  to authenticated
  with check (public.is_admin());

-- Admins can update drive resources
drop policy if exists "Admins can update drive resources" on public.drive_resources;
create policy "Admins can update drive resources"
  on public.drive_resources
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Admins can delete drive resources
drop policy if exists "Admins can delete drive resources" on public.drive_resources;
create policy "Admins can delete drive resources"
  on public.drive_resources
  for delete
  to authenticated
  using (public.is_admin());

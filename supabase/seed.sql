-- ==============================================================================
-- SCHOOL WORK HUB — SEED & INITIAL SETUP
-- File: supabase/seed.sql
-- Description: Sets up standard Thai school learning groups, communication
--              channels, and central Google Drive resources.
-- ==============================================================================

-- 1. Standard 10 Learning Departments (กลุ่มสาระการเรียนรู้)
insert into public.user_groups (name) values
  ('ภาษาไทย'),
  ('คณิตศาสตร์'),
  ('วิทยาศาสตร์และเทคโนโลยี'),
  ('สังคมศึกษา ศาสนา และวัฒนธรรม'),
  ('สุขศึกษาและพลศึกษา'),
  ('ศิลปะ'),
  ('การงานอาชีพ'),
  ('ภาษาต่างประเทศ'),
  ('กิจกรรมพัฒนาผู้เรียน'),
  ('ฝ่ายบริหารและสนับสนุน')
on conflict (name) do nothing;

-- 2. Communication Channels (ห้องสื่อสารโรงเรียน)
insert into public.chat_channels (id, name, type) values
  ('00000000-0000-0000-0000-000000000001', 'ห้องสื่อสารกลางโรงเรียน', 'general'),
  ('00000000-0000-0000-0000-000000000002', 'ประกาศข่าวสารฝ่ายบริหาร', 'announcement')
on conflict (id) do nothing;

-- Sync group channels for all learning departments
insert into public.chat_channels (name, type, group_id)
select
  'ห้องกลุ่มสาระฯ ' || ug.name,
  'group',
  ug.id
from public.user_groups ug
where not exists (
  select 1 from public.chat_channels cc where cc.group_id = ug.id
);

-- 3. Central Google Drive Resources & Official Templates
insert into public.drive_resources (title, description, category, url) values
  (
    'คลัง Google Drive กลางโรงเรียน',
    'โฟลเดอร์หลักสำหรับจัดเก็บเอกสารทางการ คำสั่งโรงเรียน และระเบียบปฏิบัติราชการ',
    'folder',
    'https://drive.google.com/drive/folders/school-work-hub-root'
  ),
  (
    'แม่แบบแผนการจัดการเรียนรู้ (Lesson Plan Template)',
    'แบบฟอร์มมาตรฐานสำหรับการเขียนแผนการจัดการเรียนรู้ ภาคเรียนปัจจุบัน',
    'template',
    'https://docs.google.com/document/d/sample-lesson-plan-template'
  ),
  (
    'แม่แบบรายงานวิจัยในชั้นเรียน (Classroom Research)',
    'เค้าโครงการเขียนรายงานการวิจัยในชั้นเรียนเพื่อพัฒนาการเรียนรู้ของผู้เรียน',
    'template',
    'https://docs.google.com/document/d/sample-classroom-research'
  ),
  (
    'ตราสัญลักษณ์โรงเรียนและเทมเพลตนำเสนอ',
    'ไฟล์ตราสัญลักษณ์โรงเรียนความละเอียดสูง (PNG/SVG) และสไลด์นำเสนอทางการ',
    'asset',
    'https://drive.google.com/drive/folders/school-logos-and-assets'
  )
on conflict do nothing;

-- ==============================================================================
-- NOTE: TO CREATE YOUR INITIAL SUPER ADMIN ACCOUNT:
-- 1. Create a user via Supabase Dashboard Auth with Email: 'admin@school.local'
-- 2. The database trigger automatically creates the profile with role 'teacher'
-- 3. Run the following SQL to elevate this user to 'admin':
--
-- UPDATE public.profiles
-- SET role = 'admin', name = 'ผู้ดูแลระบบสูงสุด'
-- WHERE username = 'admin';
-- ==============================================================================

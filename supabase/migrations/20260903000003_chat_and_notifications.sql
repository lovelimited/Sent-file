-- ==============================================================================
-- SCHOOL WORK HUB — PHASE 6: INTERNAL COMMUNICATION & NOTIFICATIONS
-- Migration: 20260903000003_chat_and_notifications.sql
-- Description: Creates chat_channels, chat_messages, and notifications tables,
--              seeds default communication rooms, and configures RLS policies.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TABLE: chat_channels
-- ------------------------------------------------------------------------------
create table if not exists public.chat_channels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('general', 'announcement', 'group')),
  group_id uuid references public.user_groups(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Index for chat_channels
create index if not exists idx_chat_channels_group_id on public.chat_channels(group_id);
create index if not exists idx_chat_channels_type on public.chat_channels(type);

-- ------------------------------------------------------------------------------
-- 2. TABLE: chat_messages
-- ------------------------------------------------------------------------------
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.chat_channels(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

-- Indexes for chat_messages
create index if not exists idx_chat_messages_channel_id on public.chat_messages(channel_id);
create index if not exists idx_chat_messages_sender_id on public.chat_messages(sender_id);
create index if not exists idx_chat_messages_created_at on public.chat_messages(created_at desc);

-- ------------------------------------------------------------------------------
-- 3. TABLE: notifications
-- ------------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'info' check (type in ('task_assigned', 'task_reviewed', 'announcement', 'info')),
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Indexes for notifications
create index if not exists idx_notifications_recipient_id on public.notifications(recipient_id);
create index if not exists idx_notifications_read on public.notifications(read);
create index if not exists idx_notifications_created_at on public.notifications(created_at desc);

-- ------------------------------------------------------------------------------
-- 4. SEED DEFAULT CHANNELS
-- ------------------------------------------------------------------------------
-- General School Channel
insert into public.chat_channels (id, name, type)
values ('00000000-0000-0000-0000-000000000001', 'ห้องสื่อสารกลางโรงเรียน', 'general')
on conflict (id) do nothing;

-- Admin Announcements Channel
insert into public.chat_channels (id, name, type)
values ('00000000-0000-0000-0000-000000000002', 'ประกาศข่าวสารฝ่ายบริหาร', 'announcement')
on conflict (id) do nothing;

-- Auto create group channels for existing user_groups
insert into public.chat_channels (name, type, group_id)
select
  'ห้องกลุ่มสาระฯ ' || ug.name,
  'group',
  ug.id
from public.user_groups ug
where not exists (
  select 1 from public.chat_channels cc where cc.group_id = ug.id
);

-- ------------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------

alter table public.chat_channels enable row level security;
alter table public.chat_messages enable row level security;
alter table public.notifications enable row level security;

-- ==============================================================================
-- RLS: chat_channels
-- Teachers can view general, announcement, or their own group channel
-- Admin can view all channels
-- ==============================================================================
drop policy if exists "Users can view accessible channels" on public.chat_channels;
create policy "Users can view accessible channels"
  on public.chat_channels
  for select
  to authenticated
  using (
    type in ('general', 'announcement')
    or public.is_admin()
    or (
      group_id is not null
      and group_id = (select p.group_id from public.profiles p where p.id = auth.uid())
    )
  );

-- ==============================================================================
-- RLS: chat_messages
-- Users can view messages from channels they have access to
-- Users can insert messages in accessible channels (announcement restricted to admin)
-- ==============================================================================
drop policy if exists "Users can view messages in accessible channels" on public.chat_messages;
create policy "Users can view messages in accessible channels"
  on public.chat_messages
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.chat_channels cc
      where cc.id = chat_messages.channel_id
        and (
          cc.type in ('general', 'announcement')
          or public.is_admin()
          or cc.group_id = (select p.group_id from public.profiles p where p.id = auth.uid())
        )
    )
  );

drop policy if exists "Users can insert messages into accessible channels" on public.chat_messages;
create policy "Users can insert messages into accessible channels"
  on public.chat_messages
  for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1
      from public.chat_channels cc
      where cc.id = chat_messages.channel_id
        and (
          (cc.type = 'general')
          or (cc.type = 'announcement' and public.is_admin())
          or (cc.type = 'group' and (public.is_admin() or cc.group_id = (select p.group_id from public.profiles p where p.id = auth.uid())))
        )
    )
  );

-- ==============================================================================
-- RLS: notifications
-- Users can view and update (mark read) only their own notifications
-- Authenticated users (like task assigner) or server can insert notifications
-- ==============================================================================
drop policy if exists "Users can view own notifications" on public.notifications;
create policy "Users can view own notifications"
  on public.notifications
  for select
  to authenticated
  using (recipient_id = auth.uid());

drop policy if exists "Users can update own notifications" on public.notifications;
create policy "Users can update own notifications"
  on public.notifications
  for update
  to authenticated
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

drop policy if exists "Authenticated users can insert notifications" on public.notifications;
create policy "Authenticated users can insert notifications"
  on public.notifications
  for insert
  to authenticated
  with check (true);

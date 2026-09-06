const { Client } = require('pg');

async function fixDeleteRpc() {
  const client = new Client({
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 5432,
    user: 'postgres.xusudxzoiqcfqxvuerhy',
    password: 'Sw#Hub2026!xKp9z',
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL database');

    const sql = `
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

  -- 1. Clean up user interactions and references
  delete from public.announcement_likes where user_id = p_user_id;
  delete from public.announcement_comments where author_id = p_user_id;
  delete from public.announcements where author_id = p_user_id;
  delete from public.teacher_ratings where teacher_id = p_user_id or admin_id = p_user_id;
  delete from public.notifications where recipient_id = p_user_id;
  delete from public.chat_messages where sender_id = p_user_id;
  delete from public.task_assignments where teacher_id = p_user_id or reviewed_by = p_user_id;
  delete from public.drive_resources where created_by = p_user_id;
  delete from public.tasks where created_by = p_user_id;
  update public.system_settings set updated_by = null where updated_by = p_user_id;
  update public.activity_logs set user_id = null where user_id = p_user_id;

  -- 2. Auth identity bridges
  delete from auth.identities where user_id = p_user_id;
  delete from public.auth_identities where user_id = p_user_id;

  -- 3. Profile and auth user
  delete from public.profiles where id = p_user_id;
  delete from auth.users where id = p_user_id;

  -- 4. Activity log for deletion
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

revoke all on function public.admin_delete_user from public;
grant execute on function public.admin_delete_user to authenticated;
    `;

    await client.query(sql);
    console.log('Successfully updated public.admin_delete_user RPC function!');

  } catch (err) {
    console.error('Error fixing RPC:', err);
  } finally {
    await client.end();
  }
}

fixDeleteRpc();

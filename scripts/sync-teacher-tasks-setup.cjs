const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.xusudxzoiqcfqxvuerhy:Sw%23Hub2026!xKp9z@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();
  console.log('Connected to PostgreSQL database.');

  // 1. Ensure unique constraint on task_assignments (task_id, teacher_id)
  await client.query(`
    create unique index if not exists idx_task_assignments_task_teacher 
    on public.task_assignments (task_id, teacher_id);
  `);
  console.log('1. Unique index confirmed.');

  // 2. Remove any admin assignments
  const delAdminAssign = await client.query(`
    delete from public.task_assignments
    where teacher_id in (select id from public.profiles where role = 'admin');
  `);
  console.log('2. Deleted admin assignments count:', delAdminAssign.rowCount);

  // 3. Create or replace sync_user_task_assignments function
  await client.query(`
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
  `);
  console.log('3. Function public.sync_user_task_assignments created.');

  // 4. Create trigger on profiles
  await client.query(`
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
  `);
  console.log('4. Trigger trg_profiles_sync_tasks created.');

  // 5. Run sync on all current active teachers
  const teachers = await client.query(`
    select id, username from public.profiles where role != 'admin' and active is true;
  `);
  for (const t of teachers.rows) {
    await client.query('select public.sync_user_task_assignments($1)', [t.id]);
    console.log('Synced teacher:', t.username);
  }

  await client.end();
  console.log('Completed successfully.');
}

main().catch(err => {
  console.error('ERROR:', err);
  process.exit(1);
});

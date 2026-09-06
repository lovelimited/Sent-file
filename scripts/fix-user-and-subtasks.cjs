const { Client } = require('pg');

async function run() {
  const client = new Client({
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 5432,
    user: 'postgres.xusudxzoiqcfqxvuerhy',
    password: 'Sw#Hub2026!xKp9z',
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  console.log('Connecting to PostgreSQL...');
  await client.connect();

  console.log('1. Adding subtask_files column to task_assignments...');
  await client.query(`
    ALTER TABLE public.task_assignments 
    ADD COLUMN IF NOT EXISTS subtask_files jsonb DEFAULT '{}'::jsonb;

    UPDATE auth.identities
    SET provider_id = user_id::text,
        identity_data = jsonb_build_object('sub', user_id::text, 'email', 'krittapot@school.local', 'email_verified', true, 'phone_verified', false)
    WHERE user_id = 'a985e786-9ffb-4de4-a82c-2cb4691228d2';

    UPDATE auth.users
    SET confirmation_token = '',
        recovery_token = '',
        email_change_token_new = '',
        email_change = '',
        reauthentication_token = '',
        phone_change = '',
        phone_change_token = '',
        email_change_token_current = '',
        email_change_confirm_status = 0,
        raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb
    WHERE email = 'krittapot@school.local';
  `);

  console.log('2. Dropping old overloaded admin_create_user functions...');
  await client.query(`
    DROP FUNCTION IF EXISTS public.admin_create_user(text, text, text, uuid, text);
    DROP FUNCTION IF EXISTS public.admin_create_user(text, text, text, uuid, text, text);
  `);

  console.log('3. Creating fixed admin_create_user function...');
  await client.query(`
    CREATE OR REPLACE FUNCTION public.admin_create_user(
      p_username text,
      p_name text,
      p_role text DEFAULT 'teacher'::text,
      p_group_id uuid DEFAULT NULL::uuid,
      p_password text DEFAULT '123456'::text,
      p_nickname text DEFAULT NULL::text
    )
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public, extensions, auth
    AS $$
    DECLARE
      v_user_id uuid;
      v_email text;
      v_clean_username text;
      v_role user_role;
    BEGIN
      -- Verify caller is admin
      IF NOT EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
      ) THEN
        RETURN jsonb_build_object('error', 'Unauthorized: เฉพาะผู้ดูแลระบบ (Admin) เท่านั้น');
      END IF;

      v_clean_username := lower(trim(p_username));
      IF length(v_clean_username) < 3 THEN
        RETURN jsonb_build_object('error', 'ชื่อผู้ใช้ต้องมีความยาวอย่างน้อย 3 ตัวอักษร');
      END IF;

      -- Check if username already exists in profiles
      IF EXISTS (
        SELECT 1 FROM public.profiles WHERE username = v_clean_username
      ) THEN
        RETURN jsonb_build_object('error', 'ชื่อผู้ใช้ "' || v_clean_username || '" มีอยู่ในระบบแล้ว');
      END IF;

      v_email := v_clean_username || '@school.local';

      -- Clean up any ghost record in auth.users if previously orphaned
      DELETE FROM auth.users WHERE email = v_email;

      v_user_id := gen_random_uuid();
      IF p_role = 'admin' THEN
        v_role := 'admin'::user_role;
      ELSE
        v_role := 'teacher'::user_role;
      END IF;

      -- Insert into auth.users with all required GoTrue non-null fields
      INSERT INTO auth.users (
        id, instance_id, email,
        encrypted_password,
        email_confirmed_at,
        raw_user_meta_data,
        raw_app_meta_data,
        role, aud,
        confirmation_token, recovery_token, email_change_token_new,
        email_change, reauthentication_token, phone_change,
        phone_change_token, email_change_token_current, email_change_confirm_status,
        created_at, updated_at
      ) VALUES (
        v_user_id,
        '00000000-0000-0000-0000-000000000000',
        v_email,
        crypt(p_password, gen_salt('bf')),
        now(),
        jsonb_build_object('username', v_clean_username, 'name', trim(p_name), 'role', p_role, 'nickname', trim(p_nickname)),
        '{"provider":"email","providers":["email"]}'::jsonb,
        'authenticated', 'authenticated',
        '', '', '', '', '', '', '', '', 0,
        now(), now()
      );

      -- Ensure identity exists
      INSERT INTO auth.identities (
        id, user_id, provider_id,
        identity_data, provider,
        last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), v_user_id, v_user_id::text,
        jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true, 'phone_verified', false),
        'email',
        now(), now(), now()
      )
      ON CONFLICT (provider, provider_id) DO NOTHING;

      -- Upsert profile with full details (handles trigger timing safely)
      INSERT INTO public.profiles (id, username, name, nickname, role, group_id, active)
      VALUES (v_user_id, v_clean_username, trim(p_name), trim(p_nickname), v_role, p_group_id, true)
      ON CONFLICT (id) DO UPDATE SET
        username = EXCLUDED.username,
        name = EXCLUDED.name,
        nickname = EXCLUDED.nickname,
        role = EXCLUDED.role,
        group_id = EXCLUDED.group_id,
        active = true;

      -- Log admin action
      INSERT INTO public.activity_logs (
        user_id,
        action,
        target_type,
        target_id,
        details
      ) VALUES (
        auth.uid(),
        'create_user',
        'profile',
        v_user_id,
        jsonb_build_object('username', v_clean_username, 'name', trim(p_name), 'role', p_role)
      );

      RETURN jsonb_build_object('success', true, 'user_id', v_user_id, 'username', v_clean_username);
    EXCEPTION
      WHEN OTHERS THEN
        RETURN jsonb_build_object('error', SQLERRM);
    END;
    $$;

    REVOKE ALL ON FUNCTION public.admin_create_user(text, text, text, uuid, text, text) FROM public;
    GRANT EXECUTE ON FUNCTION public.admin_create_user(text, text, text, uuid, text, text) TO authenticated;
  `);

  console.log('✓ Migration executed successfully!');
  await client.end();
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});

const { Client } = require('pg');

async function fixTeacher() {
  const client = new Client({
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 5432,
    user: 'postgres.xusudxzoiqcfqxvuerhy',
    password: 'Sw#Hub2026!xKp9z',
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  const res = await client.query(`
    UPDATE auth.users
    SET 
      confirmation_token = '',
      recovery_token = '',
      email_change_token_new = '',
      email_change = '',
      reauthentication_token = '',
      phone_change = '',
      phone_change_token = '',
      email_change_token_current = '',
      email_change_confirm_status = 0,
      is_super_admin = null
    WHERE email = 'teacher_thai@school.local'
    RETURNING id, email;
  `);

  console.log('Fixed teacher:', res.rows[0]);
  await client.end();
}

fixTeacher().catch(console.error);

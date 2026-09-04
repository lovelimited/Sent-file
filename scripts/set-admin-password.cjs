const { Client } = require('pg');

async function setPassword() {
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
      encrypted_password = extensions.crypt('Admin1234!', extensions.gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      updated_at = now()
    WHERE email = 'admin@school.local'
    RETURNING id, email, email_confirmed_at;
  `);

  console.log('Admin password updated:', res.rows[0]);
  await client.end();
}

setPassword().catch(console.error);

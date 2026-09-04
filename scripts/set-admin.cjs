const { Client } = require('pg');

async function setAdmin() {
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
    UPDATE public.profiles
    SET
      role = 'admin',
      name = 'ผู้ดูแลระบบโรงเรียน (Super Admin)',
      active = true
    WHERE username = 'admin'
    RETURNING *;
  `);

  console.log('Admin profile updated:', res.rows[0]);
  await client.end();
}

setAdmin().catch(console.error);

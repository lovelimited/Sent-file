const { Client } = require('pg');

async function testRole() {
  const client = new Client({
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 5432,
    user: 'postgres.xusudxzoiqcfqxvuerhy',
    password: 'Sw#Hub2026!xKp9z',
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  await client.query('BEGIN;');
  const r1 = await client.query('SELECT current_user, session_user;');
  console.log('Initial user:', r1.rows[0]);

  await client.query("SET LOCAL ROLE authenticated;");
  const r2 = await client.query('SELECT current_user, session_user;');
  console.log('After SET LOCAL ROLE:', r2.rows[0]);

  // Test selecting auth_identities as authenticated
  const r3 = await client.query('SELECT count(*) FROM public.auth_identities;');
  console.log('Count from auth_identities as authenticated:', r3.rows[0]);

  await client.query('ROLLBACK;');
  await client.end();
}

testRole().catch(console.error);

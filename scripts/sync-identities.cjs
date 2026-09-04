const { Client } = require('pg');

async function sync() {
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
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      created_at,
      updated_at
    )
    SELECT 
      gen_random_uuid(),
      u.id,
      jsonb_build_object(
        'sub', u.id::text,
        'email', u.email,
        'email_verified', true,
        'phone_verified', false
      ),
      'email',
      u.id::text,
      now(),
      now()
    FROM auth.users u
    WHERE NOT EXISTS (
      SELECT 1 FROM auth.identities i WHERE i.user_id = u.id
    )
    RETURNING user_id, email;
  `);

  console.log('Synced identities count:', res.rowCount, res.rows);
  await client.end();
}

sync().catch(console.error);

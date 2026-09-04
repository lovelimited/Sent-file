const { Client } = require('pg');

async function checkAuthSchema() {
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
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'auth' 
    ORDER BY table_name;
  `);
  console.log('Tables in auth schema:', res.rows.map(r => r.table_name));
  await client.end();
}

checkAuthSchema().catch(console.error);

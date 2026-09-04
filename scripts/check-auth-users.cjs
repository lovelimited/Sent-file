const { Client } = require('pg');
const client = new Client({
  host: 'aws-0-ap-southeast-1.pooler.supabase.com',
  port: 5432,
  user: 'postgres.xusudxzoiqcfqxvuerhy',
  password: 'Sw#Hub2026!xKp9z',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});
async function run() {
  await client.connect();
  const res = await client.query(`
    SELECT column_name, data_type, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_schema = 'auth' AND table_name = 'users'
    ORDER BY ordinal_position;
  `);
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
}
run();

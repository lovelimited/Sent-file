const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function testRLS() {
  const ports = [5432, 6543];
  let client;

  for (const port of ports) {
    try {
      console.log(`Connecting to port ${port}...`);
      client = new Client({
        host: 'aws-0-ap-southeast-1.pooler.supabase.com',
        port: port,
        user: 'postgres.xusudxzoiqcfqxvuerhy',
        password: 'Sw#Hub2026!xKp9z',
        database: 'postgres',
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 15000
      });

      client.on('notice', (msg) => {
        console.log('[PG NOTICE]', msg.message);
      });

      await client.connect();
      console.log(`Connected on port ${port}!`);
      break;
    } catch (err) {
      console.warn(`Connection failed on port ${port}:`, err.message);
      client = null;
    }
  }

  if (!client) {
    throw new Error('Could not connect on either port 5432 or 6543');
  }

  console.log('Running test_full_system_rls.sql...');
  const sql = fs.readFileSync(path.join(__dirname, '../supabase/tests/test_full_system_rls.sql'), 'utf-8');

  try {
    await client.query(sql);
    console.log('✓ All RLS tests passed successfully!');
  } catch (err) {
    console.error('✗ RLS Test failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

testRLS().catch(err => {
  console.error(err);
  process.exit(1);
});

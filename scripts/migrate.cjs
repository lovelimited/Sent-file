const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
  const client = new Client({
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 5432,
    user: 'postgres.xusudxzoiqcfqxvuerhy',
    password: 'Sw#Hub2026!xKp9z',
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  console.log('Connecting to Supabase PostgreSQL database...');
  await client.connect();
  console.log('Connected successfully!\n');

  const migrationFiles = [
    'supabase/migrations/20260903000001_school_work_hub_phase2.sql',
    'supabase/migrations/20260903000002_tasks_and_workflow.sql',
    'supabase/migrations/20260903000003_chat_and_notifications.sql',
    'supabase/migrations/20260903000004_drive_and_exports.sql',
    'supabase/seed.sql'
  ];

  for (const relativePath of migrationFiles) {
    const fullPath = path.join(__dirname, '..', relativePath);
    console.log(`Executing migration: ${relativePath}...`);
    const sql = fs.readFileSync(fullPath, 'utf-8');
    
    try {
      await client.query(sql);
      console.log(`✓ Completed: ${relativePath}\n`);
    } catch (err) {
      console.error(`✗ Error executing ${relativePath}:`, err.message);
      throw err;
    }
  }

  // Verify created tables
  console.log('Verifying created tables in public schema...');
  const res = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);

  console.log('Public tables:', res.rows.map(r => r.table_name));

  await client.end();
  console.log('\nAll migrations completed successfully!');
}

runMigrations().catch(err => {
  console.error('\nMigration failed:', err);
  process.exit(1);
});

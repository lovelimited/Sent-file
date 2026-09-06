const { Client } = require('pg');

async function checkFks() {
  const client = new Client({
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 5432,
    user: 'postgres.xusudxzoiqcfqxvuerhy',
    password: 'Sw#Hub2026!xKp9z',
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL database');

    const fkQuery = `
      SELECT
        tc.table_schema, 
        tc.table_name, 
        kcu.column_name, 
        ccu.table_schema AS foreign_table_schema,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND (ccu.table_name = 'profiles' OR ccu.table_name = 'users');
    `;

    const res = await client.query(fkQuery);
    console.log('Foreign keys referencing profiles or users:');
    console.table(res.rows);

    // Also check column names of notifications
    const notifCols = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'notifications';
    `);
    console.log('notifications columns:');
    console.table(notifCols.rows);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

checkFks();

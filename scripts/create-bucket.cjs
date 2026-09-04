const { Client } = require('pg');

async function run() {
  const client = new Client({
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 5432,
    user: 'postgres.xusudxzoiqcfqxvuerhy',
    password: 'Sw#Hub2026!xKp9z',
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  await client.query(`
    INSERT INTO storage.buckets (id, name, public) 
    VALUES ('submissions', 'submissions', true)
    ON CONFLICT (id) DO UPDATE SET public = true;

    DROP POLICY IF EXISTS "Public Read Submissions" ON storage.objects;
    CREATE POLICY "Public Read Submissions" ON storage.objects FOR SELECT USING (bucket_id = 'submissions');
    
    DROP POLICY IF EXISTS "Public Upload Submissions" ON storage.objects;
    CREATE POLICY "Public Upload Submissions" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'submissions');

    DROP POLICY IF EXISTS "Public Update Submissions" ON storage.objects;
    CREATE POLICY "Public Update Submissions" ON storage.objects FOR UPDATE USING (bucket_id = 'submissions');
  `);
  console.log('Created submissions storage bucket successfully!');
  await client.end();
}

run().catch(err => {
  console.error('Storage bucket setup failed:', err);
  process.exit(1);
});

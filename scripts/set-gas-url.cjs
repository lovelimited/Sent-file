const { Client } = require('pg');

async function setGasUrl() {
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

    const gasUrl = 'https://script.google.com/macros/s/AKfycbyyKbBPBK0r8XETDrBaSpJ5KCt4k91IJaD_rEKmto9tzasQWgvWTqNP0SBy8G0-fyc/exec';

    const query = `
      INSERT INTO public.system_settings (key, value, updated_at)
      VALUES ('gas_web_app_url', $1, NOW())
      ON CONFLICT (key) DO UPDATE
      SET value = EXCLUDED.value, updated_at = NOW();
    `;

    await client.query(query, [gasUrl]);
    console.log('Successfully configured gas_web_app_url in system_settings:', gasUrl);

    // Verify
    const res = await client.query("SELECT * FROM public.system_settings WHERE key = 'gas_web_app_url'");
    console.log('Verified system_settings row:', res.rows);
  } catch (err) {
    console.error('Error setting gas url:', err);
  } finally {
    await client.end();
  }
}

setGasUrl();

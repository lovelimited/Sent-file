const { Client } = require('pg');

async function testConnection() {
  const configs = [
    {
      name: 'Session Pooler (port 5432)',
      host: 'aws-0-ap-southeast-1.pooler.supabase.com',
      port: 5432,
      user: 'postgres.xusudxzoiqcfqxvuerhy',
      password: 'Sw#Hub2026!xKp9z',
      database: 'postgres',
      ssl: { rejectUnauthorized: false }
    },
    {
      name: 'Transaction Pooler (port 6543)',
      host: 'aws-0-ap-southeast-1.pooler.supabase.com',
      port: 6543,
      user: 'postgres.xusudxzoiqcfqxvuerhy',
      password: 'Sw#Hub2026!xKp9z',
      database: 'postgres',
      ssl: { rejectUnauthorized: false }
    }
  ];

  for (const cfg of configs) {
    console.log(`Trying ${cfg.name}...`);
    const client = new Client(cfg);

    try {
      await client.connect();
      const res = await client.query('SELECT version();');
      console.log(`SUCCESS with ${cfg.name}! Version:`, res.rows[0].version);
      await client.end();
      return cfg;
    } catch (err) {
      console.error(`FAILED with ${cfg.name}:`, err.message);
      try { await client.end(); } catch (e) {}
    }
  }

  throw new Error('All connection attempts failed');
}

testConnection().catch(err => {
  console.error(err);
  process.exit(1);
});

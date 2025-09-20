const { Client } = require('pg');
(async () => {
  const url = 'postgresql://neondb_owner:npg_lzBWtVkD3g8X@ep-old-king-a4vnwgur-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
  const client = new Client({ connectionString: url });
  try {
    await client.connect();
    const t = 'Transfer';
    const res = await client.query(`SELECT to_regclass('public."${t}"') IS NOT NULL as exists`);
    console.log('Transfer exists:', res.rows[0].exists);
  } catch (err) {
    console.error('ERROR', err.message);
  } finally {
    await client.end();
  }
})();

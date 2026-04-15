const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'ebike',
  user: process.env.DB_USER || 'ebike',
  password: process.env.DB_PASSWORD,
});

async function runMigrations() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  const dir = __dirname;
  const sqlFiles = fs.readdirSync(dir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of sqlFiles) {
    const { rows } = await pool.query(
      'SELECT id FROM migrations WHERE filename = $1', [file]
    );
    if (rows.length > 0) continue;

    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    await pool.query(sql);
    await pool.query('INSERT INTO migrations (filename) VALUES ($1)', [file]);
    console.log(`[Migration] Applied: ${file}`);
  }
}

module.exports = { runMigrations, pool };

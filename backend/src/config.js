const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : {
    rejectUnauthorized: false
  }
});

pool.on('connect', () => {
  console.log('Connected to database');
});

pool.on('error', (err) => {
  console.error('DB error:', err);
});

module.exports = pool;

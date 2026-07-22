import { pool } from './pool.js';

async function run() {
  const result = await pool.query('SELECT current_database() AS database, now() AS checked_at');
  console.log(result.rows[0]);
  await pool.end();
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

// One-off migration runner. Reads SQL config from server/.env (same as the app),
// then executes a .sql file. Usage: node scripts/run-migration.mjs migrations/003_add_photos.sql
import sql from 'mssql'
import { readFileSync } from 'node:fs'
import path from 'node:path'

try {
  process.loadEnvFile?.()
} catch {
  /* rely on process env */
}

const file = process.argv[2]
if (!file) {
  console.error('Usage: node scripts/run-migration.mjs <path-to-sql>')
  process.exit(1)
}

const config = process.env.SQL_CONNECTION_STRING
  ? process.env.SQL_CONNECTION_STRING
  : {
      server: process.env.SQL_SERVER,
      database: process.env.SQL_DATABASE,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      options: { encrypt: process.env.SQL_ENCRYPT !== 'false', trustServerCertificate: false },
    }

const text = readFileSync(path.resolve(file), 'utf8')

const pool = await sql.connect(config)
try {
  // Split on GO batch separators if present; otherwise run as one batch.
  const batches = text.split(/^\s*GO\s*$/im).map((b) => b.trim()).filter(Boolean)
  for (const batch of batches) {
    await pool.request().batch(batch)
  }
  console.log('Migration applied:', file)
} finally {
  await pool.close()
}

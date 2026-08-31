import sql from 'mssql'
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

try { process.loadEnvFile?.('./.env') } catch {}

const config = {
  server: process.env.SQL_SERVER,
  database: process.env.SQL_DATABASE,
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  options: { encrypt: process.env.SQL_ENCRYPT !== 'false', trustServerCertificate: false },
}

const dir = path.join(process.cwd(), 'migrations')
const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()

const pool = await new sql.ConnectionPool(config).connect()
console.log(`Connected to ${config.server}/${config.database}\n`)

for (const file of files) {
  const sqlText = readFileSync(path.join(dir, file), 'utf8')
  const batches = sqlText.split(/^\s*GO\s*$/gim).map((b) => b.trim()).filter(Boolean)
  console.log(`Running ${file} (${batches.length} batches)…`)
  for (const batch of batches) {
    await pool.request().batch(batch)
  }
}

console.log('\n✅ Migrations applied.')

// Show the new columns to confirm.
const cols = await pool.request().query(`
  SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'TastingEntries'
    AND COLUMN_NAME IN ('AppearanceColour','AppearanceClarity','AppearanceNotes',
      'NoseIntensity','NoseAromas','PalateSweetness','PalateBody','FinishLength','OverallNotes')
  ORDER BY COLUMN_NAME`)
console.log('Structured columns present:', cols.recordset.map((r) => r.COLUMN_NAME).join(', '))

await pool.close()

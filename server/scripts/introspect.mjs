import sql from 'mssql'

try { process.loadEnvFile?.('./.env') } catch {}

const config = {
  server: process.env.SQL_SERVER,
  database: process.env.SQL_DATABASE,
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  options: { encrypt: process.env.SQL_ENCRYPT !== 'false', trustServerCertificate: false },
}

console.log(`Connecting to ${config.server}/${config.database} as ${config.user}…`)

try {
  const pool = await new sql.ConnectionPool(config).connect()
  console.log('Connected.\n')

  const tables = await pool.request().query(`
    SELECT TABLE_SCHEMA, TABLE_NAME
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_TYPE = 'BASE TABLE'
    ORDER BY TABLE_SCHEMA, TABLE_NAME`)

  for (const t of tables.recordset) {
    const cols = await pool.request()
      .input('s', sql.NVarChar, t.TABLE_SCHEMA)
      .input('n', sql.NVarChar, t.TABLE_NAME)
      .query(`
        SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH AS Len, IS_NULLABLE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = @s AND TABLE_NAME = @n
        ORDER BY ORDINAL_POSITION`)
    const count = await pool.request()
      .query(`SELECT COUNT(*) AS c FROM [${t.TABLE_SCHEMA}].[${t.TABLE_NAME}]`)
    console.log(`\n=== ${t.TABLE_SCHEMA}.${t.TABLE_NAME}  (${count.recordset[0].c} rows) ===`)
    for (const c of cols.recordset) {
      const len = c.Len ? `(${c.Len})` : ''
      console.log(`  ${c.COLUMN_NAME.padEnd(28)} ${c.DATA_TYPE}${len} ${c.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'}`)
    }
  }

  await pool.close()
} catch (err) {
  console.error('FAILED:', err.message)
  if (err.code === 'ELOGIN' || /firewall/i.test(err.message)) {
    console.error('\nHint: the Azure SQL firewall may need to allow this client IP,')
    console.error('or check the SQL login/password.')
  }
  process.exit(1)
}

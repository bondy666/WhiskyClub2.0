import sql from 'mssql'
import type { Repo } from './types.js'
import { MemoryRepo } from './memoryRepo.js'
import { SqlRepo } from './sqlRepo.js'

let cached: Repo | null = null

function buildSqlConfig(): sql.config | string | null {
  if (process.env.SQL_CONNECTION_STRING) return process.env.SQL_CONNECTION_STRING
  if (process.env.SQL_SERVER && process.env.SQL_DATABASE) {
    return {
      server: process.env.SQL_SERVER,
      database: process.env.SQL_DATABASE,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      options: {
        encrypt: process.env.SQL_ENCRYPT !== 'false',
        trustServerCertificate: false,
      },
      pool: { max: 5, min: 0, idleTimeoutMillis: 30000 },
    }
  }
  return null
}

export async function getRepo(): Promise<Repo> {
  if (cached) return cached

  const config = buildSqlConfig()
  if (config) {
    try {
      const pool = await new sql.ConnectionPool(config as sql.config).connect()
      console.log('✅ Connected to Azure SQL (whiskyclubdb)')
      cached = new SqlRepo(pool)
      return cached
    } catch (err) {
      console.error('⚠️  SQL connection failed, falling back to in-memory store:', (err as Error).message)
    }
  } else {
    console.log('ℹ️  No SQL config set — using seeded in-memory store')
  }

  cached = new MemoryRepo()
  return cached
}

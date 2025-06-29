import { Pool } from 'pg'

const connectionString = process.env.DATABASE_URL || 
  'postgresql://gamefi_user:gamefi_password@postgres:5432/gamefi_platform'

export const db = new Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

// Test connection on startup
db.connect()
  .then((client: any) => {
    console.log('✅ Admin Dashboard connected to PostgreSQL')
    client.release()
  })
  .catch((err: Error) => {
    console.error('❌ Failed to connect to database:', err)
    process.exit(1)
  }) 
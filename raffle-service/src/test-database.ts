// Local Test Database Implementation
// Provides in-memory database for VRF testing without external dependencies

interface TestRecord {
  id: string
  created_at: string
  [key: string]: any
}

interface QueryResult<T> {
  data: T[] | null
  error: any
}

// In-memory storage
const testTables: { [tableName: string]: TestRecord[] } = {
  lives: [],
  payments: [],
  plays: [],
  vrf_seeds: [],
  score_proofs: [],
  game_sessions: [],
  move_logs: [],
  daily_raffles: [],
  raffle_qualified_wallets: [],
  raffle_config: [],
  rate_limits: [],
  suspicious_activity: [],
  daily_stats: [],
}

// Mock Supabase client for testing
export class TestDatabase {
  from(tableName: string) {
    return new TestTableQuery(tableName)
  }

  // Initialize with empty tables
  static initialize() {
    Object.keys(testTables).forEach((tableName) => {
      testTables[tableName] = []
    })
    console.log('📊 Test database initialized with empty tables')
  }

  // Reset database for clean tests
  static reset() {
    Object.keys(testTables).forEach((table) => {
      testTables[table] = []
    })
    console.log('🧹 Test database reset')
  }

  static getTable(tableName: string) {
    return testTables[tableName] || []
  }

  static getAllTables() {
    return testTables
  }
}

class TestTableQuery {
  private tableName: string
  private filters: Array<{ column: string; operator: string; value: any }> = []
  private orderBy: { column: string; ascending: boolean } | null = null
  private limitCount: number | null = null

  constructor(tableName: string) {
    this.tableName = tableName
  }

  select(columns?: string) {
    return this
  }

  eq(column: string, value: any) {
    this.filters.push({ column, operator: 'eq', value })
    return this
  }

  gte(column: string, value: any) {
    this.filters.push({ column, operator: 'gte', value })
    return this
  }

  lte(column: string, value: any) {
    this.filters.push({ column, operator: 'lte', value })
    return this
  }

  gt(column: string, value: any) {
    this.filters.push({ column, operator: 'gt', value })
    return this
  }

  lt(column: string, value: any) {
    this.filters.push({ column, operator: 'lt', value })
    return this
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderBy = { column, ascending: options?.ascending !== false }
    return this
  }

  limit(count: number) {
    this.limitCount = count
    return this
  }

  async then(resolve: (result: QueryResult<any>) => void) {
    try {
      let results = [...(testTables[this.tableName] || [])]
      for (const filter of this.filters) {
        results = results.filter((record) => {
          const recordValue = record[filter.column]
          const filterValue = filter.value
          switch (filter.operator) {
            case 'eq':
              return recordValue === filterValue
            case 'gte':
              return recordValue >= filterValue
            case 'lte':
              return recordValue <= filterValue
            case 'gt':
              return recordValue > filterValue
            case 'lt':
              return recordValue < filterValue
            default:
              return true
          }
        })
      }
      if (this.orderBy) {
        results.sort((a, b) => {
          const aVal = a[this.orderBy!.column]
          const bVal = b[this.orderBy!.column]
          if (aVal < bVal) return this.orderBy!.ascending ? -1 : 1
          if (aVal > bVal) return this.orderBy!.ascending ? 1 : -1
          return 0
        })
      }
      if (this.limitCount) {
        results = results.slice(0, this.limitCount)
      }
      resolve({ data: results, error: null })
    } catch (error) {
      resolve({ data: null, error })
    }
  }

  async insert(data: any[] | any): Promise<QueryResult<any>> {
    try {
      const table = testTables[this.tableName]
      if (!table) throw new Error(`Table ${this.tableName} not found`)
      const records = Array.isArray(data) ? data : [data]
      const inserted = records.map((r) => ({
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        created_at: new Date().toISOString(),
        ...r,
      }))
      table.push(...inserted)
      return { data: inserted, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  async update(data: any): Promise<QueryResult<any>> {
    try {
      const table = testTables[this.tableName]
      if (!table) throw new Error(`Table ${this.tableName} not found`)
      const updated: TestRecord[] = []
      for (let i = 0; i < table.length; i++) {
        const record = table[i]
        let matches = true
        for (const filter of this.filters) {
          const recordValue = record[filter.column]
          switch (filter.operator) {
            case 'eq':
              if (recordValue !== filter.value) matches = false
              break
          }
        }
        if (matches) {
          table[i] = { ...record, ...data }
          updated.push(table[i])
        }
      }
      return { data: updated, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  async delete(): Promise<QueryResult<any>> {
    try {
      const table = testTables[this.tableName]
      if (!table) throw new Error(`Table ${this.tableName} not found`)
      const deleted: TestRecord[] = []
      for (let i = table.length - 1; i >= 0; i--) {
        const record = table[i]
        let matches = true
        for (const filter of this.filters) {
          const recordValue = record[filter.column]
          if (filter.operator === 'eq' && recordValue !== filter.value) matches = false
        }
        if (matches) {
          deleted.push(table.splice(i, 1)[0])
        }
      }
      return { data: deleted, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }
}

export const testSupabase = new TestDatabase()
export const setupTestDatabase = () => {
  TestDatabase.initialize()
  return testSupabase
}
export const resetTestDatabase = () => TestDatabase.reset()
export const getTestTableData = (table: string) => TestDatabase.getTable(table)
export const isTestEnvironment = () => !process.env.DATABASE_URL && !process.env.SUPABASE_URL
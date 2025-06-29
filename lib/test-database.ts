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
  daily_stats: []
}

// Mock Supabase client for testing
export class TestDatabase {
  
  from(tableName: string) {
    return new TestTableQuery(tableName)
  }
  
  // Initialize with empty tables
  static initialize() {
    // Initialize all tables as empty arrays
    Object.keys(testTables).forEach(tableName => {
      testTables[tableName] = []
    })
    
    console.log('📊 Test database initialized with empty tables')
  }
  
  // Reset database for clean tests
  static reset() {
    Object.keys(testTables).forEach(table => {
      testTables[table] = []
    })
    console.log('🧹 Test database reset')
  }
  
  // Get table contents for debugging
  static getTable(tableName: string) {
    return testTables[tableName] || []
  }
  
  // Get all tables
  static getAllTables() {
    return testTables
  }
}

class TestTableQuery {
  private tableName: string
  private filters: Array<{ column: string, operator: string, value: any }> = []
  private orderBy: { column: string, ascending: boolean } | null = null
  private limitCount: number | null = null
  
  constructor(tableName: string) {
    this.tableName = tableName
  }
  
  // SELECT operations
  select(columns?: string) {
    return this
  }
  
  // WHERE operations
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
  
  // ORDER BY
  order(column: string, options?: { ascending?: boolean }) {
    this.orderBy = { column, ascending: options?.ascending !== false }
    return this
  }
  
  // LIMIT
  limit(count: number) {
    this.limitCount = count
    return this
  }
  
  // Execute query
  async then(resolve: (result: QueryResult<any>) => void) {
    try {
      let results = [...(testTables[this.tableName] || [])]
      
      // Apply filters
      for (const filter of this.filters) {
        results = results.filter(record => {
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
      
      // Apply ordering
      if (this.orderBy) {
        results.sort((a, b) => {
          const aVal = a[this.orderBy!.column]
          const bVal = b[this.orderBy!.column]
          
          if (aVal < bVal) return this.orderBy!.ascending ? -1 : 1
          if (aVal > bVal) return this.orderBy!.ascending ? 1 : -1
          return 0
        })
      }
      
      // Apply limit
      if (this.limitCount) {
        results = results.slice(0, this.limitCount)
      }
      
      resolve({ data: results, error: null })
    } catch (error) {
      resolve({ data: null, error })
    }
  }
  
  // INSERT operations
  async insert(data: any[] | any): Promise<QueryResult<any>> {
    try {
      const table = testTables[this.tableName]
      if (!table) {
        throw new Error(`Table ${this.tableName} not found`)
      }
      
      const records = Array.isArray(data) ? data : [data]
      const insertedRecords = records.map(record => ({
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        created_at: new Date().toISOString(),
        ...record
      }))
      
      table.push(...insertedRecords)
      
      return { data: insertedRecords, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }
  
  // UPDATE operations
  async update(data: any): Promise<QueryResult<any>> {
    try {
      const table = testTables[this.tableName]
      if (!table) {
        throw new Error(`Table ${this.tableName} not found`)
      }
      
      // Apply filters to find records to update
      let updatedRecords: TestRecord[] = []
      
      for (let i = 0; i < table.length; i++) {
        const record = table[i]
        let matches = true
        
        for (const filter of this.filters) {
          const recordValue = record[filter.column]
          const filterValue = filter.value
          
          switch (filter.operator) {
            case 'eq':
              if (recordValue !== filterValue) matches = false
              break
            // Add other operators as needed
          }
        }
        
        if (matches) {
          table[i] = { ...record, ...data }
          updatedRecords.push(table[i])
        }
      }
      
      return { data: updatedRecords, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }
  
  // DELETE operations  
  async delete(): Promise<QueryResult<any>> {
    try {
      const table = testTables[this.tableName]
      if (!table) {
        throw new Error(`Table ${this.tableName} not found`)
      }
      
      const deletedRecords: TestRecord[] = []
      
      // Apply filters to find records to delete
      for (let i = table.length - 1; i >= 0; i--) {
        const record = table[i]
        let matches = true
        
        for (const filter of this.filters) {
          const recordValue = record[filter.column]
          const filterValue = filter.value
          
          switch (filter.operator) {
            case 'eq':
              if (recordValue !== filterValue) matches = false
              break
            // Add other operators as needed
          }
        }
        
        if (matches) {
          deletedRecords.push(table.splice(i, 1)[0])
        }
      }
      
      return { data: deletedRecords, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }
}

// Export test database instance
export const testSupabase = new TestDatabase()

// Utility functions
export const setupTestDatabase = () => {
  TestDatabase.initialize()
  return testSupabase
}

export const resetTestDatabase = () => {
  TestDatabase.reset()
}

export const getTestTableData = (tableName: string) => {
  return TestDatabase.getTable(tableName)
}

// Mock environment check
export const isTestEnvironment = () => {
  return !process.env.DATABASE_URL && !process.env.SUPABASE_URL
}

/**
 * Database connection manager
 * Manages SQLite database connection using Tauri's fs API
 */

import Logger from '../utils/logger'

/**
 * In-memory database simulation
 * In a real implementation, you would use better-sqlite3 or similar
 * For now, we'll use localStorage as a simple data store
 */
class DatabaseConnection {
  private static instance: DatabaseConnection | null = null
  private data: Map<string, any> = new Map()
  private initialized = false

  private constructor() {}

  static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection()
    }
    return DatabaseConnection.instance
  }

  /**
   * Initialize database
   */
  async init(): Promise<void> {
    if (this.initialized) {
      Logger.debug('Database already initialized')
      return
    }

    Logger.info('Initializing database...')

    try {
      // Try to load from localStorage first
      const savedData = localStorage.getItem('seating-system-db')
      if (savedData) {
        const parsed = JSON.parse(savedData)
        this.data = new Map(Object.entries(parsed))
        Logger.info('Loaded data from localStorage', {
          tables: Array.from(this.data.keys())
        })
      }

      // Initialize tables if they don't exist
      this.initializeTables()

      this.initialized = true
      Logger.info('Database initialized successfully')
    } catch (error) {
      Logger.error('Failed to initialize database:', error)
      // Start fresh if there's an error
      this.initializeTables()
      this.initialized = true
    }
  }

  /**
   * Initialize tables
   */
  private initializeTables(): void {
    if (!this.data.has('students')) {
      this.data.set('students', [])
    }
    if (!this.data.has('layout_configs')) {
      this.data.set('layout_configs', [])
    }
    if (!this.data.has('seating_records')) {
      this.data.set('seating_records', [])
    }
    if (!this.data.has('app_settings')) {
      this.data.set('app_settings', {
        animation_speed: { value: 1000 },
        auto_save: { value: true },
        export_format: { value: 'pdf' }
      })
    }
  }

  /**
   * Save database to localStorage
   */
  private async save(): Promise<void> {
    try {
      const obj = Object.fromEntries(this.data)
      localStorage.setItem('seating-system-db', JSON.stringify(obj))
      Logger.debug('Database saved to localStorage')
    } catch (error) {
      Logger.error('Failed to save database:', error)
    }
  }

  /**
   * Get all records from a table
   */
  getAll(tableName: string): any[] {
    const records = this.data.get(tableName) || []
    Logger.databaseQuery(tableName, { type: 'all' }, records.length)
    return records
  }

  /**
   * Get a record by ID
   */
  getById(tableName: string, id: string): any | null {
    const records = this.getAll(tableName)
    const record = records.find((r: any) => r.id === id) || null
    Logger.databaseQuery(tableName, { id }, record ? 1 : 0)
    return record
  }

  /**
   * Insert a record
   */
  async insert(tableName: string, record: any): Promise<any> {
    Logger.databaseOp('insert', tableName, record)
    const records = this.getAll(tableName)
    records.push(record)
    this.data.set(tableName, records)
    await this.save()
    Logger.info(`✅ Inserted record into ${tableName}`, { id: record.id })
    return record
  }

  /**
   * Update a record
   */
  async update(tableName: string, id: string, updates: Partial<any>): Promise<boolean> {
    Logger.databaseOp('update', tableName, { id, updates })
    const records = this.getAll(tableName)
    const index = records.findIndex((r: any) => r.id === id)

    if (index === -1) {
      Logger.warn(`❌ Record not found for update: ${id} in ${tableName}`)
      return false
    }

    records[index] = { ...records[index], ...updates, updatedAt: new Date().toISOString() }
    this.data.set(tableName, records)
    await this.save()
    Logger.info(`✅ Updated record in ${tableName}`, { id })
    return true
  }

  /**
   * Delete a record
   */
  async delete(tableName: string, id: string): Promise<boolean> {
    Logger.databaseOp('delete', tableName, { id })
    const records = this.getAll(tableName)
    const filtered = records.filter((r: any) => r.id !== id)

    if (filtered.length === records.length) {
      Logger.warn(`❌ Record not found for delete: ${id} in ${tableName}`)
      return false
    }

    this.data.set(tableName, filtered)
    await this.save()
    Logger.info(`✅ Deleted record from ${tableName}`, { id })
    return true
  }

  /**
   * Find records by condition
   */
  find(tableName: string, condition: (record: any) => boolean): any[] {
    const records = this.getAll(tableName)
    const results = records.filter(condition)
    Logger.databaseQuery(tableName, { type: 'conditional' }, results.length)
    return results
  }

  /**
   * Get application setting
   */
  getSetting(key: string): any {
    const settings = this.data.get('app_settings') || {}
    Logger.databaseQuery('app_settings', { key }, 1)
    return settings[key]
  }

  /**
   * Set application setting
   */
  async setSetting(key: string, value: any): Promise<void> {
    Logger.databaseOp('update', 'app_settings', { key, value })
    const settings = this.data.get('app_settings') || {}
    settings[key] = value
    this.data.set('app_settings', settings)
    await this.save()
    Logger.info(`✅ Updated setting: ${key}`)
  }

  /**
   * Clear all data (for testing purposes)
   */
  async clear(): Promise<void> {
    Logger.warn('⚠️ Clearing all database data!')
    this.data.clear()
    this.initializeTables()
    await this.save()
    Logger.info('✅ Database cleared and reinitialized')
  }
}

export default DatabaseConnection

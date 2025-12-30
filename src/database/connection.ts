/**
 * Database connection manager
 * Manages SQLite database connection using Tauri's fs API
 */

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
    if (this.initialized) return

    try {
      // Try to load from localStorage first
      const savedData = localStorage.getItem('seating-system-db')
      if (savedData) {
        const parsed = JSON.parse(savedData)
        this.data = new Map(Object.entries(parsed))
      }

      // Initialize tables if they don't exist
      this.initializeTables()

      this.initialized = true
    } catch (error) {
      console.error('Failed to initialize database:', error)
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
    } catch (error) {
      console.error('Failed to save database:', error)
    }
  }

  /**
   * Get all records from a table
   */
  getAll(tableName: string): any[] {
    return this.data.get(tableName) || []
  }

  /**
   * Get a record by ID
   */
  getById(tableName: string, id: string): any | null {
    const records = this.getAll(tableName)
    return records.find((r: any) => r.id === id) || null
  }

  /**
   * Insert a record
   */
  async insert(tableName: string, record: any): Promise<any> {
    const records = this.getAll(tableName)
    records.push(record)
    this.data.set(tableName, records)
    await this.save()
    return record
  }

  /**
   * Update a record
   */
  async update(tableName: string, id: string, updates: Partial<any>): Promise<boolean> {
    const records = this.getAll(tableName)
    const index = records.findIndex((r: any) => r.id === id)

    if (index === -1) {
      return false
    }

    records[index] = { ...records[index], ...updates, updatedAt: new Date().toISOString() }
    this.data.set(tableName, records)
    await this.save()
    return true
  }

  /**
   * Delete a record
   */
  async delete(tableName: string, id: string): Promise<boolean> {
    const records = this.getAll(tableName)
    const filtered = records.filter((r: any) => r.id !== id)

    if (filtered.length === records.length) {
      return false
    }

    this.data.set(tableName, filtered)
    await this.save()
    return true
  }

  /**
   * Find records by condition
   */
  find(tableName: string, condition: (record: any) => boolean): any[] {
    const records = this.getAll(tableName)
    return records.filter(condition)
  }

  /**
   * Get application setting
   */
  getSetting(key: string): any {
    const settings = this.data.get('app_settings') || {}
    return settings[key]
  }

  /**
   * Set application setting
   */
  async setSetting(key: string, value: any): Promise<void> {
    const settings = this.data.get('app_settings') || {}
    settings[key] = value
    this.data.set('app_settings', settings)
    await this.save()
  }

  /**
   * Clear all data (for testing purposes)
   */
  async clear(): Promise<void> {
    this.data.clear()
    this.initializeTables()
    await this.save()
  }
}

export default DatabaseConnection

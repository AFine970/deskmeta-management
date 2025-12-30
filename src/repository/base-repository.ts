/**
 * Base repository class
 * Provides common CRUD operations for all repositories
 */

import DatabaseConnection from '../database/connection'

export abstract class BaseRepository<T> {
  protected db: DatabaseConnection
  protected tableName: string

  constructor(tableName: string) {
    this.db = DatabaseConnection.getInstance()
    this.tableName = tableName
  }

  /**
   * Generate unique ID
   */
  protected generateId(): string {
    return `${this.tableName.substring(0, this.tableName.length - 1)}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  }

  /**
   * Find entity by ID
   */
  findById(id: string): T | null {
    return this.db.getById(this.tableName, id)
  }

  /**
   * Find all entities
   */
  findAll(): T[] {
    return this.db.getAll(this.tableName)
  }

  /**
   * Insert new entity
   */
  async insert(entity: Omit<T, 'id'>): Promise<T> {
    const id = this.generateId()
    const now = new Date().toISOString()
    const record = {
      id,
      ...entity,
      createdAt: now,
      updatedAt: now
    } as T

    await this.db.insert(this.tableName, record)
    return record
  }

  /**
   * Update entity
   */
  async update(id: string, updates: Partial<T>): Promise<boolean> {
    return await this.db.update(this.tableName, id, updates)
  }

  /**
   * Delete entity
   */
  async delete(id: string): Promise<boolean> {
    return await this.db.delete(this.tableName, id)
  }

  /**
   * Find entities by condition
   */
  findWhere(condition: (entity: T) => boolean): T[] {
    return this.db.find(this.tableName, condition)
  }

  /**
   * Count all entities
   */
  count(): number {
    return this.findAll().length
  }
}

/**
 * Seating record repository
 * Handles all seating record operations
 */

import { BaseRepository } from './base-repository'
import type { SeatingRecord } from '../types'

export class SeatingRecordRepository extends BaseRepository<SeatingRecord> {
  constructor() {
    super('seating_records')
  }

  /**
   * Find records by layout ID
   */
  findByLayoutId(layoutId: string): SeatingRecord[] {
    return this.findWhere(r => r.layoutId === layoutId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  /**
   * Find recent records
   */
  findRecent(limit: number = 10): SeatingRecord[] {
    return this.findAll()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit)
  }

  /**
   * Find latest record for a layout
   */
  findLatestByLayout(layoutId: string): SeatingRecord | null {
    const records = this.findByLayoutId(layoutId)
    return records.length > 0 ? records[0] : null
  }

  /**
   * Find records by fill strategy
   */
  findByStrategy(strategy: string): SeatingRecord[] {
    return this.findWhere(r => r.fillStrategy === strategy)
  }

  /**
   * Get records count by layout
   */
  getCountByLayout(layoutId: string): number {
    return this.findByLayoutId(layoutId).length
  }

  /**
   * Delete all records for a layout
   */
  async deleteByLayoutId(layoutId: string): Promise<number> {
    const records = this.findByLayoutId(layoutId)
    let count = 0

    for (const record of records) {
      const success = await this.delete(record.id)
      if (success) count++
    }

    return count
  }

  /**
   * Get statistics by strategy
   */
  getStatsByStrategy(): Record<string, number> {
    const records = this.findAll()
    const stats: Record<string, number> = {}

    for (const record of records) {
      const strategy = record.fillStrategy
      stats[strategy] = (stats[strategy] || 0) + 1
    }

    return stats
  }
}

// Export singleton instance
export const seatingRecordRepository = new SeatingRecordRepository()

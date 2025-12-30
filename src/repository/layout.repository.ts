/**
 * Layout repository
 * Handles all layout configuration operations
 */

import { BaseRepository } from './base-repository'
import type { LayoutConfig, CreateLayoutDto, UpdateLayoutDto } from '../types'

export class LayoutRepository extends BaseRepository<LayoutConfig> {
  constructor() {
    super('layout_configs')
  }

  /**
   * Find default layout
   */
  findDefault(): LayoutConfig | null {
    const layouts = this.findAll()
    return layouts.find(l => l.isDefault) || null
  }

  /**
   * Set layout as default
   */
  async setDefault(id: string): Promise<boolean> {
    // First, unset all default flags
    const layouts = this.findAll()
    for (const layout of layouts) {
      if (layout.isDefault) {
        await this.update(layout.id, { isDefault: false })
      }
    }

    // Set new default
    return await this.update(id, { isDefault: true })
  }

  /**
   * Find layouts by dimensions
   */
  findByDimensions(rows: number, cols: number): LayoutConfig[] {
    return this.findWhere(l => l.rows === rows && l.cols === cols)
  }

  /**
   * Get seat count for a layout
   */
  getSeatCount(layoutId: string): number {
    const layout = this.findById(layoutId)
    return layout ? layout.seats.length : 0
  }

  /**
   * Clone a layout
   */
  async clone(layoutId: string, newName: string): Promise<LayoutConfig | null> {
    const original = this.findById(layoutId)
    if (!original) return null

    const createDto: CreateLayoutDto = {
      name: newName,
      rows: original.rows,
      cols: original.cols,
      seatNumberingMode: original.seatNumberingMode,
      seats: [...original.seats],
      functionalAreas: original.functionalAreas ? { ...original.functionalAreas } : undefined,
      isDefault: false
    }

    return await this.insert(createDto)
  }

  /**
   * Delete layout (prevent deletion of default layout)
   */
  async delete(id: string): Promise<boolean> {
    const layout = this.findById(id)

    // Prevent deletion of default layout
    if (layout && layout.isDefault) {
      throw new Error('Cannot delete default layout')
    }

    return super.delete(id)
  }
}

// Export singleton instance
export const layoutRepository = new LayoutRepository()

/**
 * Seat Manager
 * Core business logic for seat layout management
 */

import { layoutRepository } from '../repository/layout.repository'
import type { LayoutConfig, CreateLayoutDto, Seat, SeatNumberingMode, ValidationResult } from '../types'

export class SeatManager {
  /**
   * Create a new layout
   */
  async createLayout(data: CreateLayoutDto): Promise<LayoutConfig> {
    // Validate layout data
    const validation = this.validateLayoutData(data)
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '))
    }

    // Generate seats
    const seats = this.generateSeats(data.rows, data.cols, data.seatNumberingMode)

    // Create layout
    const layoutData: CreateLayoutDto = {
      ...data,
      seats,
      isDefault: data.isDefault || false
    }

    const layout = await layoutRepository.insert(layoutData)

    // Set as default if needed
    if (layoutData.isDefault) {
      await layoutRepository.setDefault(layout.id)
    }

    return layout
  }

  /**
   * Update layout
   */
  async updateLayout(id: string, data: Partial<CreateLayoutDto>): Promise<LayoutConfig> {
    const existing = layoutRepository.findById(id)
    if (!existing) {
      throw new Error('Layout not found')
    }

    // If dimensions changed, regenerate seats
    let seats = existing.seats
    if (data.rows !== undefined || data.cols !== undefined) {
      const rows = data.rows || existing.rows
      const cols = data.cols || existing.cols
      const mode = data.seatNumberingMode || existing.seatNumberingMode
      seats = this.generateSeats(rows, cols, mode)
    }

    const updateData: Partial<CreateLayoutDto> = {
      ...data,
      seats
    }

    const success = await layoutRepository.update(id, updateData)
    if (!success) {
      throw new Error('Failed to update layout')
    }

    return layoutRepository.findById(id)!
  }

  /**
   * Delete layout
   */
  async deleteLayout(id: string): Promise<boolean> {
    const layout = layoutRepository.findById(id)
    if (!layout) {
      throw new Error('Layout not found')
    }

    return await layoutRepository.delete(id)
  }

  /**
   * Get layout by ID
   */
  getLayout(id: string): LayoutConfig | null {
    return layoutRepository.findById(id)
  }

  /**
   * Get all layouts
   */
  getAllLayouts(): LayoutConfig[] {
    return layoutRepository.findAll()
  }

  /**
   * Get default layout
   */
  getDefaultLayout(): LayoutConfig | null {
    return layoutRepository.findDefault()
  }

  /**
   * Set layout as default
   */
  async setAsDefault(id: string): Promise<boolean> {
    return await layoutRepository.setDefault(id)
  }

  /**
   * Generate seats for layout
   */
  generateSeats(rows: number, cols: number, mode: SeatNumberingMode): Seat[] {
    const seats: Seat[] = []

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const id = `seat_${row}_${col}`
        const displayNumber = mode === 'sequential'
          ? this.getSequentialNumber(row, col, rows, cols)
          : undefined

        seats.push({
          row,
          col,
          type: 'normal',
          id,
          displayNumber
        })
      }
    }

    return seats
  }

  /**
   * Get sequential number for a seat
   * Rules: Number from back to front, left to right alternation
   */
  private getSequentialNumber(row: number, col: number, rows: number, cols: number): string {
    // Calculate sequential number: column by column, from bottom to top
    const seatNumber = col * rows + (rows - 1 - row) + 1
    return String(seatNumber).padStart(2, '0')
  }

  /**
   * Get seat capacity
   */
  getCapacity(layout: LayoutConfig): number {
    return layout.seats.filter(s => s.type === 'normal').length
  }

  /**
   * Get seat at position
   */
  getSeatAt(layout: LayoutConfig, row: number, col: number): Seat | null {
    return layout.seats.find(s => s.row === row && s.col === col) || null
  }

  /**
   * Validate layout data
   */
  validateLayoutData(data: Partial<CreateLayoutDto>): ValidationResult {
    const errors: string[] = []

    if (!data.name || data.name.trim().length === 0) {
      errors.push('Layout name is required')
    }

    if (data.rows !== undefined) {
      if (data.rows < 1 || data.rows > 20) {
        errors.push('Rows must be between 1 and 20')
      }
    }

    if (data.cols !== undefined) {
      if (data.cols < 1 || data.cols > 20) {
        errors.push('Columns must be between 1 and 20')
      }
    }

    if (data.rows && data.cols && data.rows * data.cols > 400) {
      errors.push('Total seats cannot exceed 400')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Clone layout
   */
  async cloneLayout(id: string, newName: string): Promise<LayoutConfig | null> {
    return await layoutRepository.clone(id, newName)
  }

  /**
   * Find layouts by dimensions
   */
  findByDimensions(rows: number, cols: number): LayoutConfig[] {
    return layoutRepository.findByDimensions(rows, cols)
  }

  /**
   * Get seat by ID
   */
  getSeatById(layout: LayoutConfig, seatId: string): Seat | null {
    return layout.seats.find(s => s.id === seatId) || null
  }

  /**
   * Update seat type
   */
  async updateSeatType(layoutId: string, seatId: string, seatType: 'normal' | 'special'): Promise<boolean> {
    const layout = layoutRepository.findById(layoutId)
    if (!layout) {
      throw new Error('Layout not found')
    }

    const seat = this.getSeatById(layout, seatId)
    if (!seat) {
      throw new Error('Seat not found')
    }

    const updatedSeats = layout.seats.map(s =>
      s.id === seatId ? { ...s, type: seatType } : s
    )

    return await layoutRepository.update(layoutId, { seats: updatedSeats })
  }
}

// Export singleton instance
export const seatManager = new SeatManager()

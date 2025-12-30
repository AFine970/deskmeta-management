/**
 * Fill Strategy Engine
 * Core business logic for seat filling strategies
 */

import { seatingRecordRepository } from '../repository/seating-record.repository'
import type { Student, LayoutConfig, FillStrategy, FillOptions, SeatingRecord, SeatAssignment, ConstraintResult } from '../types'

export class FillStrategyEngine {
  /**
   * Fill seats with random strategy
   */
  async randomFill(
    layout: LayoutConfig,
    students: Student[],
    options?: FillOptions
  ): Promise<SeatingRecord> {
    const assignments = this.performRandomFill(layout, students, options)

    return await this.saveRecord(layout.id, 'random', options?.constraintType, assignments)
  }

  /**
   * Fill seats with manual strategy
   */
  async manualFill(
    layout: LayoutConfig,
    assignments: Map<string, string>
  ): Promise<SeatingRecord> {
    const assignmentArray: SeatAssignment[] = []

    for (const [seatId, studentId] of assignments.entries()) {
      assignmentArray.push({ seatId, studentId })
    }

    return await this.saveRecord(layout.id, 'manual', undefined, assignmentArray)
  }

  /**
   * Fill seats with mixed strategy
   */
  async mixedFill(
    layout: LayoutConfig,
    students: Student[],
    fixedAssignments: Map<string, string>,
    options?: FillOptions
  ): Promise<SeatingRecord> {
    const assignments: SeatAssignment[] = []
    const assignedStudentIds = new Set<string>()
    const assignedSeatIds = new Set<string>()

    // First, assign fixed seats
    for (const [seatId, studentId] of fixedAssignments.entries()) {
      assignments.push({ seatId, studentId })
      assignedStudentIds.add(studentId)
      assignedSeatIds.add(seatId)
    }

    // Then, randomly fill remaining seats
    const availableSeats = layout.seats.filter(
      s => s.type === 'normal' && !assignedSeatIds.has(s.id)
    )

    const availableStudents = students.filter(
      s => !assignedStudentIds.has(s.id)
    )

    const remainingAssignments = this.performRandomFill(
      { ...layout, seats: availableSeats },
      availableStudents,
      options
    )

    assignments.push(...remainingAssignments)

    return await this.saveRecord(layout.id, 'mixed', options?.constraintType, assignments)
  }

  /**
   * Perform random fill algorithm
   */
  private performRandomFill(
    layout: LayoutConfig,
    students: Student[],
    options?: FillOptions
  ): SeatAssignment[] {
    const assignments: SeatAssignment[] = []

    // Filter valid seats
    const validSeats = layout.seats.filter(s => s.type === 'normal')

    // Check if we have more students than seats
    if (students.length > validSeats.length) {
      console.warn(`More students (${students.length}) than seats (${validSeats.length}). Some students will not be assigned.`)
    }

    // Separate special needs and normal students
    const specialStudents = students.filter(s => s.specialNeeds)
    const normalStudents = students.filter(s => !s.specialNeeds)

    const remainingSeats = [...validSeats]

    // Assign special needs students first
    for (const student of specialStudents) {
      if (remainingSeats.length === 0) break

      let seatIndex: number

      if (student.preferredSeatId) {
        // Try to assign to preferred seat
        seatIndex = remainingSeats.findIndex(s => s.id === student.preferredSeatId)
        if (seatIndex === -1) {
          // Preferred seat not available, assign randomly
          seatIndex = Math.floor(Math.random() * remainingSeats.length)
        }
      } else {
        seatIndex = Math.floor(Math.random() * remainingSeats.length)
      }

      const seat = remainingSeats.splice(seatIndex, 1)[0]
      assignments.push({ seatId: seat.id, studentId: student.id })
    }

    // Shuffle normal students (Fisher-Yates)
    const shuffledStudents = this.fisherYatesShuffle(normalStudents)

    // Assign remaining seats
    const count = Math.min(shuffledStudents.length, remainingSeats.length)
    for (let i = 0; i < count; i++) {
      assignments.push({
        seatId: remainingSeats[i].id,
        studentId: shuffledStudents[i].id
      })
    }

    return assignments
  }

  /**
   * Fisher-Yates shuffle algorithm
   */
  private fisherYatesShuffle<T>(array: T[]): T[] {
    const result = [...array]
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[result[i], result[j]] = [result[j], result[i]]
    }
    return result
  }

  /**
   * Validate fill result
   */
  validateFillResult(assignments: SeatAssignment[], students: Student[]): boolean {
    // Check for duplicate student assignments
    const assignedStudentIds = new Set<string>()
    for (const assignment of assignments) {
      if (assignedStudentIds.has(assignment.studentId)) {
        return false
      }
      assignedStudentIds.add(assignment.studentId)
    }

    // Check if all assigned students exist
    const studentIds = new Set(students.map(s => s.id))
    for (const assignment of assignments) {
      if (!studentIds.has(assignment.studentId)) {
        return false
      }
    }

    return true
  }

  /**
   * Save seating record
   */
  private async saveRecord(
    layoutId: string,
    strategy: FillStrategy,
    constraintType: string | undefined,
    assignments: SeatAssignment[]
  ): Promise<SeatingRecord> {
    const record = await seatingRecordRepository.insert({
      layoutId,
      fillStrategy: strategy,
      constraintType,
      assignments
    })

    return record
  }

  /**
   * Get fill history for layout
   */
  getFillHistory(layoutId: string): SeatingRecord[] {
    return seatingRecordRepository.findByLayoutId(layoutId)
  }

  /**
   * Get latest fill for layout
   */
  getLatestFill(layoutId: string): SeatingRecord | null {
    return seatingRecordRepository.findLatestByLayout(layoutId)
  }
}

// Export singleton instance
export const fillStrategyEngine = new FillStrategyEngine()

/**
 * Constraint Engine
 * Handles desk-mate constraint rules
 */

import type { Student, LayoutConfig, ConstraintType, SeatAssignment, Violation } from '../types'

export class ConstraintEngine {
  /**
   * Apply constraints to generate seat assignments
   */
  applyConstraints(
    layout: LayoutConfig,
    students: Student[],
    constraintType: ConstraintType
  ): SeatAssignment[] {
    switch (constraintType) {
      case 'mixed_gender':
        return this.applyMixedGenderConstraint(layout, students)
      case 'same_gender':
        return this.applySameGenderConstraint(layout, students)
      case 'random':
      default:
        // Random doesn't apply constraints
        return []
    }
  }

  /**
   * Apply mixed gender constraint
   * Rule: For 2-seat rows, 1 male + 1 female
   *        For 3-seat rows, at least 1 male + 1 female
   */
  private applyMixedGenderConstraint(
    layout: LayoutConfig,
    students: Student[]
  ): SeatAssignment[] {
    const assignments: SeatAssignment[] = []
    const males = students.filter(s => s.gender === 'male')
    const females = students.filter(s => s.gender === 'female')

    // Check if we have enough males and females
    if (males.length === 0 || females.length === 0) {
      console.warn('Not enough students of both genders for mixed gender constraint')
      return []
    }

    const availableMales = [...males]
    const availableFemales = [...females]

    // Group seats by rows
    const seatRows = this.groupSeatsByRow(layout)

    for (const [row, seats] of Object.entries(seatRows)) {
      const validSeats = seats.filter(s => s.type === 'normal')
      const seatCount = validSeats.length

      if (seatCount === 0) continue

      if (seatCount === 2) {
        // 2 seats: 1 male + 1 female
        if (availableMales.length > 0 && availableFemales.length > 0) {
          assignments.push({
            seatId: validSeats[0].id,
            studentId: availableMales.shift()!.id
          })
          assignments.push({
            seatId: validSeats[1].id,
            studentId: availableFemales.shift()!.id
          })
        } else {
          console.warn(`Row ${row}: Not enough students of both genders`)
        }
      } else if (seatCount === 3) {
        // 3 seats: at least 1 male + 1 female
        if (availableMales.length >= 1 && availableFemales.length >= 1) {
          // Assign 1 male and 1 female first
          assignments.push({
            seatId: validSeats[0].id,
            studentId: availableMales.shift()!.id
          })
          assignments.push({
            seatId: validSeats[1].id,
            studentId: availableFemales.shift()!.id
          })

          // Third seat: assign whichever gender is more available
          if (availableMales.length >= availableFemales.length && availableMales.length > 0) {
            assignments.push({
              seatId: validSeats[2].id,
              studentId: availableMales.shift()!.id
            })
          } else if (availableFemales.length > 0) {
            assignments.push({
              seatId: validSeats[2].id,
              studentId: availableFemales.shift()!.id
            })
          }
        } else {
          console.warn(`Row ${row}: Not enough students for mixed gender constraint`)
        }
      } else {
        // Other row sizes: assign alternately if possible
        for (let i = 0; i < Math.min(validSeats.length, availableMales.length + availableFemales.length); i++) {
          if (i % 2 === 0 && availableMales.length > 0) {
            assignments.push({
              seatId: validSeats[i].id,
              studentId: availableMales.shift()!.id
            })
          } else if (availableFemales.length > 0) {
            assignments.push({
              seatId: validSeats[i].id,
              studentId: availableFemales.shift()!.id
            })
          } else if (availableMales.length > 0) {
            assignments.push({
              seatId: validSeats[i].id,
              studentId: availableMales.shift()!.id
            })
          }
        }
      }
    }

    return assignments
  }

  /**
   * Apply same gender constraint
   * Rule: Students in the same row should be the same gender
   */
  private applySameGenderConstraint(
    layout: LayoutConfig,
    students: Student[]
  ): SeatAssignment[] {
    const assignments: SeatAssignment[] = []
    const males = students.filter(s => s.gender === 'male')
    const females = students.filter(s => s.gender === 'female')

    const availableMales = [...males]
    const availableFemales = [...females]

    // Group seats by rows
    const seatRows = this.groupSeatsByRow(layout)

    for (const [row, seats] of Object.entries(seatRows)) {
      const validSeats = seats.filter(s => s.type === 'normal')
      const seatCount = validSeats.length

      if (seatCount === 0) continue

      // Determine which gender to use for this row
      const useMales = Math.random() > 0.5

      if (useMales) {
        // Assign males to this row
        const count = Math.min(seatCount, availableMales.length)
        for (let i = 0; i < count; i++) {
          assignments.push({
            seatId: validSeats[i].id,
            studentId: availableMales.shift()!.id
          })
        }
      } else {
        // Assign females to this row
        const count = Math.min(seatCount, availableFemales.length)
        for (let i = 0; i < count; i++) {
          assignments.push({
            seatId: validSeats[i].id,
            studentId: availableFemales.shift()!.id
          })
        }
      }
    }

    return assignments
  }

  /**
   * Check if assignments satisfy constraints
   */
  checkConstraints(
    assignments: SeatAssignment[],
    students: Student[],
    layout: LayoutConfig,
    constraintType: ConstraintType
  ): boolean {
    const violations = this.getConstraintViolations(assignments, students, layout, constraintType)
    return violations.length === 0
  }

  /**
   * Get constraint violations
   */
  getConstraintViolations(
    assignments: SeatAssignment[],
    students: Student[],
    layout: LayoutConfig,
    constraintType: ConstraintType
  ): Violation[] {
    const violations: Violation[] = []

    if (constraintType === 'mixed_gender') {
      // Check each row for mixed gender compliance
      const seatRows = this.groupSeatsByRow(layout)

      for (const [row, seats] of Object.entries(seatRows)) {
        const validSeats = seats.filter(s => s.type === 'normal')
        if (validSeats.length < 2) continue

        // Get students assigned to this row
        const rowAssignments = assignments.filter(a =>
          validSeats.some(s => s.id === a.seatId)
        )

        const rowStudents = rowAssignments.map(a =>
          students.find(s => s.id === a.studentId)
        ).filter(Boolean) as Student[]

        // Check gender balance
        const males = rowStudents.filter(s => s.gender === 'male').length
        const females = rowStudents.filter(s => s.gender === 'female').length

        if (validSeats.length === 2) {
          if (males !== 1 || females !== 1) {
            violations.push({
              seatId: validSeats[0].id,
              type: 'mixed_gender',
              description: `Row ${row}: Should have 1 male and 1 female, but has ${males} males and ${females} females`
            })
          }
        } else if (validSeats.length === 3) {
          if (males === 0 || females === 0) {
            violations.push({
              seatId: validSeats[0].id,
              type: 'mixed_gender',
              description: `Row ${row}: Should have at least 1 male and 1 female`
            })
          }
        }
      }
    } else if (constraintType === 'same_gender') {
      // Check each row for same gender compliance
      const seatRows = this.groupSeatsByRow(layout)

      for (const [row, seats] of Object.entries(seatRows)) {
        const validSeats = seats.filter(s => s.type === 'normal')
        if (validSeats.length < 2) continue

        // Get students assigned to this row
        const rowAssignments = assignments.filter(a =>
          validSeats.some(s => s.id === a.seatId)
        )

        const rowStudents = rowAssignments.map(a =>
          students.find(s => s.id === a.studentId)
        ).filter(Boolean) as Student[]

        // Check if all students are the same gender
        const genders = new Set(rowStudents.map(s => s.gender))
        if (genders.size > 1) {
          violations.push({
            seatId: validSeats[0].id,
            type: 'same_gender',
            description: `Row ${row}: All students should be the same gender`
          })
        }
      }
    }

    return violations
  }

  /**
   * Group seats by row
   */
  private groupSeatsByRow(layout: LayoutConfig): Map<number, typeof layout.seats> {
    const rows = new Map<number, typeof layout.seats>()

    for (const seat of layout.seats) {
      if (!rows.has(seat.row)) {
        rows.set(seat.row, [])
      }
      rows.get(seat.row)!.push(seat)
    }

    return rows
  }

  /**
   * Get recommended constraint based on student demographics
   */
  getRecommendedConstraint(students: Student[]): ConstraintType {
    const males = students.filter(s => s.gender === 'male').length
    const females = students.filter(s => s.gender === 'female').length
    const total = students.length

    const maleRatio = males / total
    const femaleRatio = females / total

    // If gender balance is roughly equal (40%-60%), recommend mixed gender
    if (maleRatio >= 0.4 && maleRatio <= 0.6) {
      return 'mixed_gender'
    }

    // If heavily skewed towards one gender, recommend same gender or random
    return 'random'
  }

  /**
   * Check if constraint can be satisfied
   */
  canSatisfyConstraint(
    students: Student[],
    layout: LayoutConfig,
    constraintType: ConstraintType
  ): boolean {
    if (constraintType === 'random') {
      return true
    }

    const males = students.filter(s => s.gender === 'male').length
    const females = students.filter(s => s.gender === 'female').length

    if (constraintType === 'mixed_gender') {
      // Need at least some of both genders
      if (males === 0 || females === 0) {
        return false
      }
    }

    if (constraintType === 'same_gender') {
      // Need enough students of one gender to fill at least half the rows
      const maxGender = Math.max(males, females)
      const validSeats = layout.seats.filter(s => s.type === 'normal').length

      if (maxGender < validSeats / 2) {
        return false
      }
    }

    return true
  }
}

// Export singleton instance
export const constraintEngine = new ConstraintEngine()

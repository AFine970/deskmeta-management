/**
 * Fill strategy and seating related types
 */

/**
 * Fill strategy type
 */
export type FillStrategy = 'random' | 'manual' | 'mixed'

/**
 * Constraint type for desk-mate assignment
 */
export type ConstraintType = 'mixed_gender' | 'same_gender' | 'random'

/**
 * Seat assignment
 */
export interface SeatAssignment {
  seatId: string
  studentId: string
}

/**
 * Fill options
 */
export interface FillOptions {
  constraintType?: ConstraintType
  skipSpecialNeeds?: boolean
  preserveFixed?: boolean
}

/**
 * Seating record
 */
export interface SeatingRecord {
  id: string
  layoutId: string
  fillStrategy: FillStrategy
  constraintType?: ConstraintType
  assignments: SeatAssignment[]
  createdAt: Date
}

/**
 * Constraint result
 */
export interface ConstraintResult {
  success: boolean
  assignments: SeatAssignment[]
  unassignedStudents: string[]
  warnings?: string[]
}

/**
 * Constraint violation
 */
export interface Violation {
  seatId: string
  type: string
  description: string
}

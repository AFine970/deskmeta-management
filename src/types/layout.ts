/**
 * Layout and seating related types
 */

/**
 * Seat type
 */
export type SeatType = 'normal' | 'special'

/**
 * Seat numbering mode
 */
export type SeatNumberingMode = 'sequential' | 'coordinate'

/**
 * Functional area position
 */
export type Position =
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'top-center'
  | 'bottom-center'

/**
 * Seat entity
 */
export interface Seat {
  row: number
  col: number
  type: SeatType
  id: string // System internal ID (e.g., seat_0_0)
  displayNumber?: string // Display number (e.g., "01", "02")
}

/**
 * Functional area
 */
export interface FunctionalArea {
  visible: boolean
  position: Position
}

/**
 * Functional areas configuration
 */
export interface FunctionalAreas {
  frontDoor?: FunctionalArea // Front door
  backDoor?: FunctionalArea // Back door
  podium?: FunctionalArea // Podium/Platform
  windows?: FunctionalArea // Windows
  aisles?: Array<{
    row?: number
    col?: number
    type: 'horizontal' | 'vertical'
  }>
}

/**
 * Layout configuration
 */
export interface LayoutConfig {
  id: string
  name: string
  rows: number
  cols: number
  seatNumberingMode: SeatNumberingMode
  seats: Seat[]
  functionalAreas?: FunctionalAreas
  isDefault: boolean
  createdAt: Date
  updatedAt: Date
}

/**
 * Layout creation data
 */
export type CreateLayoutDto = Omit<
  LayoutConfig,
  'id' | 'seats' | 'createdAt' | 'updatedAt'
> & {
  seats?: Seat[]
}

/**
 * Layout update data
 */
export type UpdateLayoutDto = Partial<CreateLayoutDto>

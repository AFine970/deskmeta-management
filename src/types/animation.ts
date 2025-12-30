/**
 * Animation related types
 */

/**
 * Animation configuration
 */
export interface AnimationConfig {
  speed: number // Display duration per seat (ms)
  enableSound: boolean // Enable sound effects
  shuffleCount: number // Number of random shuffles per seat
  pauseBetweenSeats: number // Pause duration between seats (ms)
}

/**
 * Animation frame
 */
export interface AnimationFrame {
  seatId: string
  studentName: string
  delay: number
  isFinal: boolean
}

/**
 * Animation state
 */
export interface AnimationState {
  isPlaying: boolean
  isPaused: boolean
  currentIndex: number
  totalFrames: number
  progress: number // 0-100
}

/**
 * Animation events
 */
export type AnimationEvent =
  | { type: 'start' }
  | { type: 'progress'; frame: AnimationFrame }
  | { type: 'complete' }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'stop' }

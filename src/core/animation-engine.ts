/**
 * Animation Engine
 * Handles animation sequence generation and playback control
 */

import type { AnimationConfig, AnimationFrame, AnimationState, AnimationEvent, SeatingRecord, Student } from '../types'

export class AnimationEngine {
  private isPlaying = false
  private isPaused = false
  private currentFrameIndex = 0
  private frames: AnimationFrame[] = []
  private eventCallback?: ((event: AnimationEvent) => void) | null
  private timeoutId?: ReturnType<typeof setTimeout>

  /**
   * Generate animation sequence
   */
  generateSequence(
    record: SeatingRecord,
    students: Map<string, Student>,
    config: AnimationConfig
  ): AnimationFrame[] {
    const frames: AnimationFrame[] = []
    let delay = 0

    // Sort assignments by position (left to right, top to bottom)
    const sortedAssignments = [...record.assignments].sort((a, b) => {
      const [rowA, colA] = this.extractPosition(a.seatId)
      const [rowB, colB] = this.extractPosition(b.seatId)

      if (rowA !== rowB) return rowA - rowB
      return colA - colB
    })

    // Generate frames for each seat
    for (const assignment of sortedAssignments) {
      const student = students.get(assignment.studentId)
      if (!student) continue

      // Add shuffle frames (lottery effect)
      const candidates = this.getRandomCandidates(student, students, config.shuffleCount)

      for (let i = 0; i < candidates.length; i++) {
        frames.push({
          seatId: assignment.seatId,
          studentName: candidates[i],
          delay: delay,
          isFinal: false
        })
        delay += config.speed / config.shuffleCount
      }

      // Final frame with actual student
      frames.push({
        seatId: assignment.seatId,
        studentName: student.name,
        delay: delay,
        isFinal: true
      })
      delay += config.speed + config.pauseBetweenSeats
    }

    return frames
  }

  /**
   * Extract row and column from seat ID
   */
  private extractPosition(seatId: string): [number, number] {
    const match = seatId.match(/seat_(\d+)_(\d+)/)
    if (!match) return [0, 0]
    return [parseInt(match[1]), parseInt(match[2])]
  }

  /**
   * Get random candidate names for shuffle effect
   */
  private getRandomCandidates(
    targetStudent: Student,
    allStudents: Map<string, Student>,
    count: number
  ): string[] {
    const candidates: string[] = []
    const otherStudents = Array.from(allStudents.values()).filter(
      s => s.id !== targetStudent.id
    )

    for (let i = 0; i < count; i++) {
      if (otherStudents.length === 0) break
      const randomIndex = Math.floor(Math.random() * otherStudents.length)
      candidates.push(otherStudents[randomIndex].name)
    }

    return candidates
  }

  /**
   * Play animation
   */
  async play(
    frames: AnimationFrame[],
    config: AnimationConfig,
    callback?: (event: AnimationEvent) => void
  ): Promise<void> {
    return new Promise((resolve) => {
      // Reset state
      this.stop()
      this.frames = frames
      this.currentFrameIndex = 0
      this.eventCallback = callback
      this.isPlaying = true
      this.isPaused = false

      // Emit start event
      this.emitEvent({ type: 'start' })

      // Start playback
      this.playNextFrame(resolve, config)
    })
  }

  /**
   * Play next frame
   */
  private playNextFrame(resolve: () => void, config: AnimationConfig): void {
    if (!this.isPlaying || this.isPaused) return

    if (this.currentFrameIndex >= this.frames.length) {
      // Animation complete
      this.emitEvent({ type: 'complete' })
      this.isPlaying = false
      resolve()
      return
    }

    const frame = this.frames[this.currentFrameIndex]
    this.emitEvent({ type: 'progress', frame })
    this.currentFrameIndex++

    // Schedule next frame
    this.timeoutId = setTimeout(() => {
      this.playNextFrame(resolve, config)
    }, frame.delay)
  }

  /**
   * Pause animation
   */
  pause(): void {
    if (!this.isPlaying) return

    this.isPaused = true
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
      this.timeoutId = undefined
    }

    this.emitEvent({ type: 'pause' })
  }

  /**
   * Resume animation
   */
  resume(config: AnimationConfig): void {
    if (!this.isPlaying || !this.isPaused) return

    this.isPaused = false
    this.emitEvent({ type: 'resume' })

    // Resume playback
    const resolve = () => {} // No-op resolve as this is resuming
    this.playNextFrame(resolve, config)
  }

  /**
   * Stop animation
   */
  stop(): void {
    this.isPlaying = false
    this.isPaused = false
    this.currentFrameIndex = 0

    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
      this.timeoutId = undefined
    }

    this.emitEvent({ type: 'stop' })
  }

  /**
   * Get current animation state
   */
  getState(): AnimationState {
    return {
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      currentIndex: this.currentFrameIndex,
      totalFrames: this.frames.length,
      progress: this.frames.length > 0
        ? (this.currentFrameIndex / this.frames.length) * 100
        : 0
    }
  }

  /**
   * Emit animation event
   */
  private emitEvent(event: AnimationEvent): void {
    if (this.eventCallback) {
      this.eventCallback(event)
    }
  }

  /**
   * Calculate total animation duration
   */
  calculateDuration(frames: AnimationFrame[]): number {
    if (frames.length === 0) return 0
    const lastFrame = frames[frames.length - 1]
    return lastFrame.delay + 1000 // Add 1s buffer
  }

  /**
   * Get frames up to current index
   */
  getFramesUpToNow(): AnimationFrame[] {
    return this.frames.slice(0, this.currentFrameIndex)
  }

  /**
   * Jump to specific frame
   */
  jumpToFrame(frameIndex: number): void {
    if (frameIndex < 0 || frameIndex >= this.frames.length) return
    this.currentFrameIndex = frameIndex
  }

  /**
   * Set playback speed multiplier
   */
  setSpeedMultiplier(multiplier: number): void {
    // This would require recalculating frame delays
    // For simplicity, we'll just note it here
    console.log(`Speed multiplier set to ${multiplier}x`)
  }
}

// Export singleton instance
export const animationEngine = new AnimationEngine()

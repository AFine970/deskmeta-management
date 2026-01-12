/**
 * Fill Store
 * Manages seat filling state
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { fillStrategyEngine } from '../core/fill-strategies'
import { constraintEngine } from '../core/constraint-engine'
import { seatingRecordRepository } from '../repository/seating-record.repository'
import type { SeatingRecord, FillStrategy, ConstraintType, FillOptions, AnimationConfig, DeskMateGroup, SeatAssignment } from '../types'
import DatabaseConnection from '../database/connection'
import { generateId } from '../utils/helpers'

// Animation frame interface for real-time animation
interface AnimationFrame {
  seatId: string
  studentId: string
  delay: number
}

// Real-time animation player class
class RealtimeAnimationPlayer {
  private frames: AnimationFrame[] = []
  private currentIndex: number = 0
  private isPlaying: boolean = false
  private isPaused: boolean = false
  private pauseResolver: (() => void) | null = null

  setFrames(frames: AnimationFrame[]) {
    this.frames = frames
    this.currentIndex = 0
  }

  async play(
    onFrame: (frame: AnimationFrame, progress: number) => void,
    onComplete: () => void
  ): Promise<void> {
    this.isPlaying = true
    this.isPaused = false
    this.currentIndex = 0

    while (this.currentIndex < this.frames.length && this.isPlaying) {
      // Handle pause
      if (this.isPaused) {
        await new Promise<void>(resolve => {
          this.pauseResolver = resolve
        })
        continue
      }

      // Handle stop
      if (!this.isPlaying) {
        break
      }

      // Play current frame
      const frame = this.frames[this.currentIndex]
      const progress = ((this.currentIndex + 1) / this.frames.length) * 100
      onFrame(frame, progress)

      // Wait with interruptible delay
      await this.delayWithInterrupt(frame.delay)

      this.currentIndex++
    }

    if (this.isPlaying && this.currentIndex >= this.frames.length) {
      onComplete()
    }

    this.isPlaying = false
  }

  pause() {
    if (this.isPlaying && !this.isPaused) {
      this.isPaused = true
    }
  }

  resume() {
    if (this.isPlaying && this.isPaused && this.pauseResolver) {
      this.isPaused = false
      this.pauseResolver()
      this.pauseResolver = null
    }
  }

  stop() {
    this.isPlaying = false
    this.isPaused = false

    // Release all waiting
    if (this.pauseResolver) {
      this.pauseResolver()
      this.pauseResolver = null
    }
  }

  private async delayWithInterrupt(ms: number): Promise<void> {
    const startTime = Date.now()

    return new Promise<void>(resolve => {
      const checkInterval = setInterval(() => {
        if (!this.isPlaying || this.isPaused) {
          clearInterval(checkInterval)
          resolve()
        } else if (Date.now() - startTime >= ms) {
          clearInterval(checkInterval)
          resolve()
        }
      }, 50)
    })
  }

  getCurrentProgress(): number {
    if (this.frames.length === 0) return 0
    return ((this.currentIndex + 1) / this.frames.length) * 100
  }
}

export const useFillStore = defineStore('fill', () => {
  // State
  const currentRecord = ref<SeatingRecord | null>(null)
  const history = ref<SeatingRecord[]>([])
  const isAnimating = ref(false)
  const animationConfig = ref<AnimationConfig>({
    speed: 1000,
    enableSound: false,
    shuffleCount: 5,
    pauseBetweenSeats: 200
  })
  const fillStrategy = ref<FillStrategy>('random')
  const constraintType = ref<ConstraintType>('random')
  const loading = ref(false)

  // Animation state for real-time filling (需求3)
  const isFilling = ref<boolean>(false)
  const liveAssignments = ref<Map<string, string>>(new Map())
  const animationProgress = ref<number>(0)
  const animationPlayer = ref<RealtimeAnimationPlayer | null>(null)
  const speedMultiplier = ref<number>(1)

  // Computed
  const hasHistory = computed(() => history.value.length > 0)
  const currentAssignments = computed(() => currentRecord.value?.assignments || [])

  // Actions
  async function loadHistory(layoutId: string) {
    loading.value = true
    try {
      await DatabaseConnection.getInstance().init()
      history.value = seatingRecordRepository.findByLayoutId(layoutId)

      // Load latest record
      if (history.value.length > 0) {
        currentRecord.value = history.value[0]
      }
    } finally {
      loading.value = false
    }
  }

  // Load latest record for a layout
  async function loadLatestRecord(layoutId: string) {
    loading.value = true
    try {
      await DatabaseConnection.getInstance().init()
      const records = seatingRecordRepository.findByLayoutId(layoutId)
      if (records.length > 0) {
        currentRecord.value = records[0]
        return records[0]
      }
      return null
    } finally {
      loading.value = false
    }
  }

  async function fillSeats(
    layoutId: string,
    students: any[],
    strategy?: FillStrategy,
    constraint?: ConstraintType
  ) {
    loading.value = true
    try {
      const actualStrategy = strategy || fillStrategy.value
      const actualConstraint = constraint || constraintType.value

      const options: FillOptions = {
        constraintType: actualConstraint
      }

      // Get layout from layout store
      const { layoutRepository } = await import('../repository/layout.repository')
      const layout = layoutRepository.findById(layoutId)
      if (!layout) {
        throw new Error('Layout not found')
      }

      let record: SeatingRecord

      if (actualStrategy === 'random') {
        record = await fillStrategyEngine.randomFill(layout, students, options)
      } else if (actualStrategy === 'manual') {
        // Manual fill requires pre-defined assignments
        throw new Error('Manual fill not implemented yet')
      } else {
        // Mixed fill
        record = await fillStrategyEngine.mixedFill(
          layout,
          students,
          new Map(),
          options
        )
      }

      currentRecord.value = record
      history.value.unshift(record)

      return record
    } finally {
      loading.value = false
    }
  }

  async function loadRecord(recordId: string) {
    loading.value = true
    try {
      const record = seatingRecordRepository.findById(recordId)
      if (record) {
        currentRecord.value = record
      }
      return record
    } finally {
      loading.value = false
    }
  }

  function clearCurrentRecord() {
    currentRecord.value = null
  }

  function setAnimationConfig(config: Partial<AnimationConfig>) {
    animationConfig.value = { ...animationConfig.value, ...config }
  }

  function setFillStrategy(strategy: FillStrategy) {
    fillStrategy.value = strategy
  }

  function setConstraintType(constraint: ConstraintType) {
    constraintType.value = constraint
  }

  async function canSatisfyConstraint(students: any[], layoutId: string) {
    const { layoutRepository } = await import('../repository/layout.repository')
    const layout = layoutRepository.findById(layoutId)

    if (!layout) return false

    return constraintEngine.canSatisfyConstraint(
      students,
      layout,
      constraintType.value
    )
  }

  function getRecommendedConstraint(students: any[]) {
    return constraintEngine.getRecommendedConstraint(students)
  }

  // ==================== 需求3: 填充动画合并 ====================

  /**
   * 计算动画配置（8秒填充一人，可调节速度）
   */
  function calculateAnimationConfig(): AnimationConfig {
    const baseSpeed = 8000 // 每个学生8秒
    const speed = baseSpeed / speedMultiplier.value

    return {
      speed,
      enableSound: true,
      shuffleCount: 1, // 单次填充
      pauseBetweenSeats: 100
    }
  }

  /**
   * 设置速度倍数
   */
  function setSpeedMultiplier(multiplier: number) {
    speedMultiplier.value = multiplier
  }

  /**
   * 暂停动画
   */
  function pauseAnimation() {
    if (animationPlayer.value) {
      animationPlayer.value.pause()
    }
  }

  /**
   * 继续动画
   */
  function resumeAnimation() {
    if (animationPlayer.value) {
      animationPlayer.value.resume()
    }
  }

  /**
   * 停止动画
   */
  function stopAnimation() {
    if (animationPlayer.value) {
      animationPlayer.value.stop()
    }
    isFilling.value = false
    liveAssignments.value = new Map()
    animationProgress.value = 0
  }

  /**
   * 合并后的填充+动画操作（一键换座位）
   * @param layoutId 座位表ID
   * @param students 学生列表
   * @param strategy 填充策略
   * @param constraint 约束类型
   * @param deskMateGroups 同桌组列表
   * @returns 是否成功
   */
  async function fillWithAnimation(
    layoutId: string,
    students: any[],
    strategy: FillStrategy,
    constraint: ConstraintType,
    deskMateGroups?: DeskMateGroup[]
  ): Promise<boolean> {
    isFilling.value = true
    animationProgress.value = 0
    liveAssignments.value = new Map()

    try {
      // 1. 获取座位表
      const { layoutRepository } = await import('../repository/layout.repository')
      const layout = layoutRepository.findById(layoutId)
      if (!layout) {
        throw new Error('座位表不存在')
      }

      // 2. 生成填充结果（不立即保存）
      const options: FillOptions = { constraintType: constraint }

      let fillResult: SeatAssignment[]

      // 如果有同桌组，使用特殊处理
      if (deskMateGroups && deskMateGroups.length > 0) {
        // 使用同桌组约束进行填充
        fillResult = await applyDeskMateFill(layout, students, deskMateGroups, options)
      } else if (strategy === 'random') {
        const record = await fillStrategyEngine.randomFill(layout, students, options)
        fillResult = record.assignments
      } else if (strategy === 'mixed') {
        const record = await fillStrategyEngine.mixedFill(layout, students, new Map(), options)
        fillResult = record.assignments
      } else {
        throw new Error('手动填充模式暂不支持动画')
      }

      // 3. 计算动画配置（8秒一人）
      const config = calculateAnimationConfig()

      // 4. 生成动画帧
      const frames = generateRealTimeFrames(fillResult, layout.seats, config)

      // 5. 创建动画播放器
      animationPlayer.value = new RealtimeAnimationPlayer()
      animationPlayer.value.setFrames(frames)

      // 6. 播放动画并实时更新
      await animationPlayer.value.play(
        (frame, progress) => {
          // 每帧更新：实时分配 + 进度
          liveAssignments.value = new Map(liveAssignments.value)
          liveAssignments.value.set(frame.seatId, frame.studentId)
          animationProgress.value = progress
        },
        () => {
          // 动画完成回调
        }
      )

      // 7. 动画完成，保存记录
      if (isFilling.value) {
        const record: SeatingRecord = {
          id: generateId(),
          layoutId: layoutId,
          assignments: Array.from(liveAssignments.value.entries()).map(([seatId, studentId]) => ({
            seatId,
            studentId
          })),
          createdAt: new Date(),
          fillStrategy: strategy,
          constraintType: constraint,
          animationConfig: config
        }

        await seatingRecordRepository.insert(record)
        currentRecord.value = record
        history.value.unshift(record)

        // 成功提示（通过外部snackbar）
        return true
      }

      return false
    } catch (error) {
      console.error('Fill with animation failed:', error)
      throw error
    } finally {
      isFilling.value = false
      animationPlayer.value = null
    }
  }

  /**
   * 应用同桌组约束进行填充
   */
  async function applyDeskMateFill(
    layout: any,
    students: any[],
    deskMateGroups: DeskMateGroup[],
    options: FillOptions
  ): Promise<SeatAssignment[]> {
    const assignments: SeatAssignment[] = []
    const assignedStudentIds = new Set<string>()
    const assignedSeatIds = new Set<string>()

    // 1. 先分配同桌组（确保同桌坐在一起）
    for (const group of deskMateGroups) {
      // 获取同桌组的学生
      const groupStudents = students.filter(s => group.studentIds.includes(s.id))
      if (groupStudents.length < 2) continue

      // 在座位表中找到连续的座位
      const consecutiveSeats = findConsecutiveSeats(layout, groupStudents.length, assignedSeatIds)

      if (consecutiveSeats.length >= groupStudents.length) {
        // 分配同桌组到连续座位
        for (let i = 0; i < groupStudents.length; i++) {
          assignments.push({
            seatId: consecutiveSeats[i].id,
            studentId: groupStudents[i].id
          })
          assignedStudentIds.add(groupStudents[i].id)
          assignedSeatIds.add(consecutiveSeats[i].id)
        }
      }
    }

    // 2. 剩余学生随机填充
    const remainingStudents = students.filter((s: any) => !assignedStudentIds.has(s.id))
    const remainingSeats = layout.seats.filter(
      (s: any) => s.type === 'normal' && !assignedSeatIds.has(s.id)
    )

    if (remainingStudents.length > 0 && remainingSeats.length > 0) {
      const remainingRecord = await fillStrategyEngine.randomFill(
        { ...layout, seats: remainingSeats },
        remainingStudents,
        options
      )
      assignments.push(...remainingRecord.assignments)
    }

    return assignments
  }

  /**
   * 查找连续的座位
   */
  function findConsecutiveSeats(layout: any, count: number, excludeSeatIds: Set<string>): any[] {
    const validSeats = layout.seats.filter(
      (s: any) => s.type === 'normal' && !excludeSeatIds.has(s.id)
    )

    // 按行分组座位
    const seatsByRow = new Map<number, any[]>()
    for (const seat of validSeats) {
      if (!seatsByRow.has(seat.row)) {
        seatsByRow.set(seat.row, [])
      }
      seatsByRow.get(seat.row)!.push(seat)
    }

    // 在每一行中查找连续座位
    for (const [, seats] of seatsByRow.entries()) {
      // 按列排序
      const sortedSeats = seats.sort((a, b) => a.col - b.col)

      // 查找连续的座位
      for (let i = 0; i <= sortedSeats.length - count; i++) {
        const potentialSeats = sortedSeats.slice(i, i + count)

        // 检查是否连续（列号连续）
        let isConsecutive = true
        for (let j = 1; j < potentialSeats.length; j++) {
          if (potentialSeats[j].col !== potentialSeats[j - 1].col + 1) {
            isConsecutive = false
            break
          }
        }

        if (isConsecutive) {
          return potentialSeats
        }
      }
    }

    // 如果找不到连续座位，返回随机座位
    return validSeats.slice(0, count)
  }

  /**
   * 生成实时动画帧
   */
  function generateRealTimeFrames(
    assignments: SeatAssignment[],
    seats: any[],
    config: AnimationConfig
  ): AnimationFrame[] {
    // 按座位顺序生成帧
    const sortedSeats = [...seats].sort((a, b) => {
      if (a.row !== b.row) return a.row - b.row
      return a.col - b.col
    })

    const frames: AnimationFrame[] = []
    for (const seat of sortedSeats) {
      const assignment = assignments.find(a => a.seatId === seat.id)
      if (assignment) {
        frames.push({
          seatId: seat.id,
          studentId: assignment.studentId,
          delay: config.speed
        })
      }
    }

    return frames
  }

  return {
    // State
    currentRecord,
    history,
    isAnimating,
    animationConfig,
    fillStrategy,
    constraintType,
    loading,

    // Animation state (需求3)
    isFilling,
    liveAssignments,
    animationProgress,
    speedMultiplier,

    // Computed
    hasHistory,
    currentAssignments,

    // Actions
    loadHistory,
    loadLatestRecord,
    fillSeats,
    loadRecord,
    clearCurrentRecord,
    setAnimationConfig,
    setFillStrategy,
    setConstraintType,
    canSatisfyConstraint,
    getRecommendedConstraint,

    // Animation actions (需求3)
    calculateAnimationConfig,
    setSpeedMultiplier,
    pauseAnimation,
    resumeAnimation,
    stopAnimation,
    fillWithAnimation
  }
})

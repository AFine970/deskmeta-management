/**
 * Fill Store
 * Manages seat filling state
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { fillStrategyEngine } from '../core/fill-strategies'
import { constraintEngine } from '../core/constraint-engine'
import { seatingRecordRepository } from '../repository/seating-record.repository'
import type { SeatingRecord, FillStrategy, ConstraintType, FillOptions, AnimationConfig } from '../types'
import DatabaseConnection from '../database/connection'

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

  return {
    // State
    currentRecord,
    history,
    isAnimating,
    animationConfig,
    fillStrategy,
    constraintType,
    loading,

    // Computed
    hasHistory,
    currentAssignments,

    // Actions
    loadHistory,
    fillSeats,
    loadRecord,
    clearCurrentRecord,
    setAnimationConfig,
    setFillStrategy,
    setConstraintType,
    canSatisfyConstraint,
    getRecommendedConstraint
  }
})

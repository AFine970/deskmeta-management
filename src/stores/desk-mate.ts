/**
 * Desk Mate Store
 * 同桌组状态管理
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { deskMateManager } from '../core/desk-mate-manager'
import { deskMateRepository } from '../repository/desk-mate.repository'
import type {
  DeskMateGroup,
  DeskMateConstraintType,
  DeskMateValidationResult,
  DeskMateRecommendation,
  Student
} from '../types'
import DatabaseConnection from '../database/connection'

export const useDeskMateStore = defineStore('deskMate', () => {
  // State
  const groups = ref<DeskMateGroup[]>([])
  const selectedGroup = ref<DeskMateGroup | null>(null)
  const selectedStudents = ref<string[]>([])
  const loading = ref(false)
  const currentLayoutId = ref<string | null>(null)

  // Computed
  const totalGroups = computed(() => groups.value.length)
  const totalStudentsInGroups = computed(() =>
    groups.value.reduce((sum, g) => sum + g.studentIds.length, 0)
  )
  const hasGroups = computed(() => groups.value.length > 0)

  // Actions

  /**
   * 初始化数据库并加载同桌组
   */
  async function initialize() {
    loading.value = true
    try {
      await DatabaseConnection.getInstance().init()
    } finally {
      loading.value = false
    }
  }

  /**
   * 加载指定座位表的同桌组
   * @param layoutId 座位表ID
   */
  async function loadGroups(layoutId: string) {
    loading.value = true
    try {
      await initialize()
      currentLayoutId.value = layoutId
      groups.value = deskMateRepository.findByLayoutId(layoutId)
    } finally {
      loading.value = false
    }
  }

  /**
   * 加载所有同桌组（不按座位表过滤）
   */
  async function loadAllGroups() {
    loading.value = true
    try {
      await initialize()
      groups.value = deskMateRepository.findAll()
    } finally {
      loading.value = false
    }
  }

  /**
   * 创建同桌组
   * @param studentIds 学生ID数组
   * @param name 同桌组名称（可选）
   * @returns 创建的同桌组
   */
  async function createGroup(studentIds: string[], name?: string): Promise<DeskMateGroup> {
    loading.value = true
    try {
      // 验证学生是否已属于其他同桌组
      const existingGroups = studentIds
        .map(id => deskMateRepository.findByStudentId(id))
        .filter((g): g is DeskMateGroup => g !== null)

      if (existingGroups.length > 0) {
        const conflictNames = existingGroups.map(g => g.name).join(', ')
        throw new Error(`部分学生已属于其他同桌组: ${conflictNames}`)
      }

      // 创建同桌组
      const group = deskMateManager.createGroup(
        studentIds,
        name,
        currentLayoutId.value || undefined
      )

      // 保存到数据库
      const savedGroup = await deskMateRepository.insert(group)

      // 更新本地状态
      groups.value.push(savedGroup)

      return savedGroup
    } finally {
      loading.value = false
    }
  }

  /**
   * 删除同桌组
   * @param groupId 同桌组ID
   */
  async function deleteGroup(groupId: string) {
    loading.value = true
    try {
      const success = await deskMateRepository.delete(groupId)
      if (success) {
        groups.value = groups.value.filter(g => g.id !== groupId)
        // 清除相关学生的deskMateGroupId
        // 注意：这需要在Student store中处理
      }
      return success
    } finally {
      loading.value = false
    }
  }

  /**
   * 更新同桌组
   * @param groupId 同桌组ID
   * @param updates 更新数据
   */
  async function updateGroup(groupId: string, updates: Partial<DeskMateGroup>) {
    loading.value = true
    try {
      const success = await deskMateRepository.update(groupId, updates)
      if (success) {
        const index = groups.value.findIndex(g => g.id === groupId)
        if (index !== -1) {
          groups.value[index] = {
            ...groups.value[index],
            ...updates,
            updatedAt: new Date()
          }
        }
      }
      return success
    } finally {
      loading.value = false
    }
  }

  /**
   * 智能推荐同桌组
   * @param students 学生列表
   * @param count 推荐组数
   * @param constraintType 约束类型
   * @returns 推荐结果
   */
  function recommendGroups(
    students: Student[],
    count: number,
    constraintType: DeskMateConstraintType
  ): DeskMateRecommendation {
    return deskMateManager.recommendGroups(students, count, constraintType)
  }

  /**
   * 验证同桌约束
   * @param assignments 座位分配结果
   * @param seats 座位列表
   * @returns 验证结果
   */
  function validateConstraints(
    assignments: { seatId: string; studentId: string }[],
    seats: any[]
  ): DeskMateValidationResult {
    return deskMateManager.validateConstraints(assignments, groups.value, seats)
  }

  /**
   * 选择学生（用于创建同桌组）
   * @param studentId 学生ID
   */
  function toggleStudentSelection(studentId: string) {
    const index = selectedStudents.value.indexOf(studentId)
    if (index === -1) {
      selectedStudents.value.push(studentId)
    } else {
      selectedStudents.value.splice(index, 1)
    }
  }

  /**
   * 清除学生选择
   */
  function clearSelection() {
    selectedStudents.value = []
  }

  /**
   * 选择同桌组
   * @param group 同桌组
   */
  function selectGroup(group: DeskMateGroup | null) {
    selectedGroup.value = group
  }

  /**
   * 检查学生是否已属于同桌组
   * @param studentId 学生ID
   * @returns 是否已分配
   */
  function isStudentInGroup(studentId: string): boolean {
    return deskMateManager.isStudentInGroup(studentId, groups.value)
  }

  /**
   * 获取学生的同桌组
   * @param studentId 学生ID
   * @returns 同桌组或null
   */
  function getStudentGroup(studentId: string): DeskMateGroup | null {
    return deskMateManager.getStudentGroup(studentId, groups.value)
  }

  /**
   * 获取同桌组的学生信息
   * @param groupId 同桌组ID
   * @param students 学生列表
   * @returns 学生信息数组
   */
  function getGroupStudents(groupId: string, students: Student[]): Student[] {
    const group = groups.value.find(g => g.id === groupId)
    if (!group) return []

    return group.studentIds
      .map(id => students.find(s => s.id === id))
      .filter((s): s is Student => s !== undefined)
  }

  /**
   * 清空当前座位表的同桌组
   */
  async function clearLayoutGroups() {
    if (!currentLayoutId.value) return

    loading.value = true
    try {
      const layoutGroups = deskMateRepository.findByLayoutId(currentLayoutId.value)
      for (const group of layoutGroups) {
        await deskMateRepository.delete(group.id)
      }
      groups.value = []
    } finally {
      loading.value = false
    }
  }

  /**
   * 导入同桌组（从JSON）
   * @param data 同桌组数据
   */
  async function importGroups(data: DeskMateGroup[]) {
    loading.value = true
    try {
      for (const group of data) {
        // 检查是否已存在
        const existing = deskMateRepository.findById(group.id)
        if (existing) {
          await deskMateRepository.update(group.id, group)
        } else {
          await deskMateRepository.insert(group)
        }
      }
      await loadAllGroups()
      return true
    } catch (error) {
      console.error('Import failed:', error)
      return false
    } finally {
      loading.value = false
    }
  }

  /**
   * 导出同桌组（为JSON）
   * @param layoutId 座位表ID
   * @returns 同桌组数据
   */
  function exportGroups(layoutId?: string): DeskMateGroup[] {
    if (layoutId) {
      return deskMateRepository.findByLayoutId(layoutId)
    }
    return groups.value
  }

  return {
    // State
    groups,
    selectedGroup,
    selectedStudents,
    loading,
    currentLayoutId,

    // Computed
    totalGroups,
    totalStudentsInGroups,
    hasGroups,

    // Actions
    initialize,
    loadGroups,
    loadAllGroups,
    createGroup,
    deleteGroup,
    updateGroup,
    recommendGroups,
    validateConstraints,
    toggleStudentSelection,
    clearSelection,
    selectGroup,
    isStudentInGroup,
    getStudentGroup,
    getGroupStudents,
    clearLayoutGroups,
    importGroups,
    exportGroups
  }
})

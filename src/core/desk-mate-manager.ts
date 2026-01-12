/**
 * Desk Mate Manager
 * 同桌管理核心业务逻辑
 */

import type {
  DeskMateGroup,
  DeskMateConstraintType,
  DeskMateValidationResult,
  DeskMateRecommendation,
  Student,
  Seat,
  SeatAssignment
} from '../types'
import { generateId } from '../utils/helpers'

export class DeskMateManager {
  /**
   * 创建同桌组
   * @param studentIds 学生ID数组（2-4人）
   * @param name 同桌组名称（可选）
   * @param layoutId 关联的座位表ID（可选）
   * @returns DeskMateGroup
   */
  createGroup(
    studentIds: string[],
    name?: string,
    layoutId?: string
  ): DeskMateGroup {
    // 验证人数（2-4人）
    if (studentIds.length < 2 || studentIds.length > 4) {
      throw new Error('同桌组需要2-4人')
    }

    // 验证是否有重复ID
    const uniqueIds = [...new Set(studentIds)]
    if (uniqueIds.length !== studentIds.length) {
      throw new Error('学生ID不能重复')
    }

    return {
      id: generateId(),
      name: name || `同桌组${studentIds.length}人`,
      studentIds: uniqueIds,
      layoutId,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }

  /**
   * 删除同桌组
   * @param groupId 同桌组ID
   * @param groups 现有同桌组列表
   * @returns 更新后的同桌组列表
   */
  deleteGroup(groupId: string, groups: DeskMateGroup[]): DeskMateGroup[] {
    return groups.filter(g => g.id !== groupId)
  }

  /**
   * 验证同桌约束
   * @param assignments 座位分配结果
   * @param groups 同桌组列表
   * @param seats 座位列表
   * @returns 验证结果
   */
  validateConstraints(
    assignments: SeatAssignment[],
    groups: DeskMateGroup[],
    seats: Seat[]
  ): DeskMateValidationResult {
    const violations: string[] = []
    const warnings: string[] = []

    if (groups.length === 0) {
      return { valid: true, violations: [], warnings: ['没有配置同桌组'] }
    }

    // 创建座位ID到位置的映射
    const seatPositionMap = new Map<string, { row: number; col: number }>()
    seats.forEach(seat => {
      seatPositionMap.set(seat.id, { row: seat.row, col: seat.col })
    })

    // 创建学生到座位的映射
    const studentSeatMap = new Map<string, string>()
    assignments.forEach(assignment => {
      studentSeatMap.set(assignment.studentId, assignment.seatId)
    })

    // 验证每个同桌组
    groups.forEach(group => {
      // 检查同桌组成员是否都已分配座位
      const unassignedMembers = group.studentIds.filter(id => !studentSeatMap.has(id))
      if (unassignedMembers.length > 0) {
        violations.push(`同桌组"${group.name}"中有${unassignedMembers.length}名学生未分配座位`)
        return
      }

      // 获取同桌组成员的座位位置
      const seatPositions = group.studentIds
        .map(studentId => {
          const seatId = studentSeatMap.get(studentId)
          return seatId ? seatPositionMap.get(seatId) : null
        })
        .filter((pos): pos is { row: number; col: number } => pos !== undefined && pos !== null)

      // 检查是否所有成员都有座位位置
      if (seatPositions.length !== group.studentIds.length) {
        violations.push(`同桌组"${group.name}"无法找到所有成员的座位`)
        return
      }

      // 检查座位是否相邻（水平或垂直相邻）
      if (!this.areSeatsAdjacent(seatPositions)) {
        violations.push(`同桌组"${group.name}"的成员座位不相邻`)
      }
    })

    return {
      valid: violations.length === 0,
      violations,
      warnings
    }
  }

  /**
   * 检查座位是否相邻
   * @param positions 座位位置数组
   * @returns 是否相邻
   */
  private areSeatsAdjacent(positions: { row: number; col: number }[]): boolean {
    if (positions.length < 2) return true

    // 检查所有座位是否在同一行或同一列，并且连续
    const rows = positions.map(p => p.row)
    const cols = positions.map(p => p.col)

    const uniqueRows = [...new Set(rows)]
    const uniqueCols = [...new Set(cols)]

    // 如果所有座位在同一行
    if (uniqueRows.length === 1) {
      const sortedCols = cols.sort((a, b) => a - b)
      for (let i = 0; i < sortedCols.length - 1; i++) {
        if (sortedCols[i + 1] - sortedCols[i] !== 1) {
          return false
        }
      }
      return true
    }

    // 如果所有座位在同一列
    if (uniqueCols.length === 1) {
      const sortedRows = rows.sort((a, b) => a - b)
      for (let i = 0; i < sortedRows.length - 1; i++) {
        if (sortedRows[i + 1] - sortedRows[i] !== 1) {
          return false
        }
      }
      return true
    }

    return false
  }

  /**
   * 智能推荐同桌组
   * @param students 学生列表
   * @param count 推荐组数
   * @param constraintType 约束类型
   * @returns 推荐结果
   */
  recommendGroups(
    students: Student[],
    count: number,
    constraintType: DeskMateConstraintType
  ): DeskMateRecommendation {
    const groups: DeskMateGroup[] = []
    let score = 100
    let coverage = 0

    if (students.length < 2) {
      return { groups, score: 0, coverage: 0, constraintType }
    }

    // 按性别分组
    const males = students.filter(s => s.gender === 'male')
    const females = students.filter(s => s.gender === 'female')

    switch (constraintType) {
      case 'mixed_gender': {
        // 男女混合：优先配对1男1女
        const maxPairs = Math.min(count, Math.min(males.length, females.length))
        const maleShuffled = this.shuffleArray([...males])
        const femaleShuffled = this.shuffleArray([...females])

        for (let i = 0; i < maxPairs; i++) {
          groups.push(this.createGroup(
            [maleShuffled[i].id, femaleShuffled[i].id],
            `混合组${i + 1}`
          ))
        }

        // 如果还有剩余学生，尝试2人组
        const remainingMales = maleShuffled.slice(maxPairs)
        const remainingFemales = femaleShuffled.slice(maxPairs)
        const remainingCount = count - maxPairs

        for (let i = 0; i < Math.min(remainingCount, Math.floor(remainingMales.length / 2)); i++) {
          groups.push(this.createGroup(
            [remainingMales[i * 2].id, remainingMales[i * 2 + 1].id],
            `男生组${i + 1}`
          ))
        }

        for (let i = 0; i < Math.min(remainingCount - groups.length, Math.floor(remainingFemales.length / 2)); i++) {
          groups.push(this.createGroup(
            [remainingFemales[i * 2].id, remainingFemales[i * 2 + 1].id],
            `女生组${i + 1}`
          ))
        }

        // 计算分数和覆盖率
        const assignedStudents = groups.reduce((sum, g) => sum + g.studentIds.length, 0)
        coverage = assignedStudents / students.length
        score = 80 + (coverage * 20) // 基础分80 + 覆盖率加分

        break
      }

      case 'same_gender': {
        // 同性同桌：2-4人一组
        const allSameGender = [...males, ...females]
        const shuffled = this.shuffleArray(allSameGender)

        let index = 0
        while (groups.length < count && index + 1 < shuffled.length) {
          // 随机选择2-4人
          const groupSize = Math.min(4, Math.floor(Math.random() * 3) + 2)
          const groupStudents = shuffled.slice(index, index + groupSize)

          if (groupStudents.length >= 2) {
            const gender = groupStudents[0].gender
            const prefix = gender === 'male' ? '男生' : '女生'
            groups.push(this.createGroup(
              groupStudents.map(s => s.id),
              `${prefix}组${groups.length + 1}`
            ))
          }

          index += groupSize
        }

        const assignedStudents = groups.reduce((sum, g) => sum + g.studentIds.length, 0)
        coverage = assignedStudents / students.length
        score = 75 + (coverage * 25)

        break
      }

      case 'custom': {
        // 自定义：返回空，需要用户手动创建
        score = 50
        coverage = 0
        break
      }

      default: {
        // 无约束：随机分组
        const shuffled = this.shuffleArray([...students])
        let index = 0
        while (groups.length < count && index + 1 < shuffled.length) {
          const groupSize = Math.min(4, Math.floor(Math.random() * 3) + 2)
          const groupStudents = shuffled.slice(index, index + groupSize)

          if (groupStudents.length >= 2) {
            groups.push(this.createGroup(
              groupStudents.map(s => s.id),
              `随机组${groups.length + 1}`
            ))
          }

          index += groupSize
        }

        const assignedStudents = groups.reduce((sum, g) => sum + g.studentIds.length, 0)
        coverage = assignedStudents / students.length
        score = 60 + (coverage * 30)

        break
      }
    }

    return {
      groups,
      score: Math.round(score),
      coverage: Math.round(coverage * 100) / 100,
      constraintType
    }
  }

  /**
   * 应用同桌约束到填充策略
   * @param seats 座位列表
   * @param students 学生列表
   * @param groups 同桌组列表
   * @param constraintType 约束类型
   * @returns 座位分配映射 (seatId -> studentId)
   */
  applyDeskMateConstraints(
    seats: Seat[],
    students: Student[],
    groups: DeskMateGroup[],
    constraintType: DeskMateConstraintType
  ): Map<string, string> {
    const assignments = new Map<string, string>()

    if (groups.length === 0) {
      return assignments
    }

    // 过滤出有同桌组的学生
    const studentsWithGroups = students.filter(s => s.deskMateGroupId)
    const studentsWithoutGroups = students.filter(s => !s.deskMateGroupId)

    // 按同桌组分组
    const groupedStudents = new Map<string, Student[]>()
    studentsWithGroups.forEach(student => {
      const groupId = student.deskMateGroupId!
      if (!groupedStudents.has(groupId)) {
        groupedStudents.set(groupId, [])
      }
      groupedStudents.get(groupId)!.push(student)
    })

    // 为每个同桌组分配相邻座位
    const availableSeats = [...seats]
    for (const [groupId, groupStudents] of groupedStudents.entries()) {
      const groupSize = groupStudents.length
      const adjacentSeats = this.findAdjacentSeats(availableSeats, groupSize)

      if (adjacentSeats.length >= groupSize) {
        // 分配座位
        for (let i = 0; i < groupSize; i++) {
          const seat = adjacentSeats[i]
          const student = groupStudents[i]
          assignments.set(seat.id, student.id)
          // 从可用座位中移除
          const index = availableSeats.findIndex(s => s.id === seat.id)
          if (index !== -1) {
            availableSeats.splice(index, 1)
          }
        }
      }
    }

    // 为剩余学生分配座位（随机）
    const remainingStudents = students.filter(s => !Array.from(assignments.values()).includes(s.id))
    const shuffledStudents = this.shuffleArray(remainingStudents)

    for (let i = 0; i < Math.min(shuffledStudents.length, availableSeats.length); i++) {
      assignments.set(availableSeats[i].id, shuffledStudents[i].id)
    }

    return assignments
  }

  /**
   * 查找相邻的座位组
   * @param seats 可用座位列表
   * @param size 需要的座位数量
   * @returns 相邻座位数组
   */
  private findAdjacentSeats(seats: Seat[], size: number): Seat[] {
    if (size === 0) return []

    // 按行分组
    const seatsByRow = new Map<number, Seat[]>()
    seats.forEach(seat => {
      if (!seatsByRow.has(seat.row)) {
        seatsByRow.set(seat.row, [])
      }
      seatsByRow.get(seat.row)!.push(seat)
    })

    // 按列分组
    const seatsByCol = new Map<number, Seat[]>()
    seats.forEach(seat => {
      if (!seatsByCol.has(seat.col)) {
        seatsByCol.set(seat.col, [])
      }
      seatsByCol.get(seat.col)!.push(seat)
    })

    // 查找水平相邻的座位
    for (const rowSeats of seatsByRow.values()) {
      const sorted = rowSeats.sort((a, b) => a.col - b.col)
      for (let i = 0; i <= sorted.length - size; i++) {
        const group = sorted.slice(i, i + size)
        const isContinuous = group.every((seat, idx) => idx === 0 || seat.col === group[idx - 1].col + 1)
        if (isContinuous) {
          return group
        }
      }
    }

    // 查找垂直相邻的座位
    for (const colSeats of seatsByCol.values()) {
      const sorted = colSeats.sort((a, b) => a.row - b.row)
      for (let i = 0; i <= sorted.length - size; i++) {
        const group = sorted.slice(i, i + size)
        const isContinuous = group.every((seat, idx) => idx === 0 || seat.row === group[idx - 1].row + 1)
        if (isContinuous) {
          return group
        }
      }
    }

    // 如果找不到完全相邻的，返回前N个座位
    return seats.slice(0, size)
  }

  /**
   * Fisher-Yates 洗牌算法
   * @param array 数组
   * @returns 洗牌后的数组
   */
  private shuffleArray<T>(array: T[]): T[] {
    const result = [...array]
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[result[i], result[j]] = [result[j], result[i]]
    }
    return result
  }

  /**
   * 检查学生是否已属于同桌组
   * @param studentId 学生ID
   * @param groups 同桌组列表
   * @returns 是否已分配
   */
  isStudentInGroup(studentId: string, groups: DeskMateGroup[]): boolean {
    return groups.some(g => g.studentIds.includes(studentId))
  }

  /**
   * 获取学生的同桌组
   * @param studentId 学生ID
   * @param groups 同桌组列表
   * @returns 同桌组或null
   */
  getStudentGroup(studentId: string, groups: DeskMateGroup[]): DeskMateGroup | null {
    return groups.find(g => g.studentIds.includes(studentId)) || null
  }

  /**
   * 验证同桌组人数限制
   * @param studentIds 学生ID数组
   * @returns 是否有效
   */
  validateGroupSize(studentIds: string[]): boolean {
    return studentIds.length >= 2 && studentIds.length <= 4
  }
}

// 导出单例实例
export const deskMateManager = new DeskMateManager()

/**
 * Desk Mate Repository
 * 同桌组数据访问层
 */

import { BaseRepository } from './base-repository'
import type { DeskMateGroup } from '../types'

export class DeskMateRepository extends BaseRepository<DeskMateGroup> {
  constructor() {
    super('desk_mate_groups')
  }

  /**
   * 查询特定座位表的同桌组
   * @param layoutId 座位表ID
   * @returns 同桌组列表
   */
  findByLayoutId(layoutId: string): DeskMateGroup[] {
    return this.findWhere(group => group.layoutId === layoutId)
  }

  /**
   * 查询学生所属的同桌组
   * @param studentId 学生ID
   * @returns 同桌组或null
   */
  findByStudentId(studentId: string): DeskMateGroup | null {
    const groups = this.findAll()
    return groups.find(group => group.studentIds.includes(studentId)) || null
  }

  /**
   * 批量更新同桌组（用于特定座位表）
   * @param layoutId 座位表ID
   * @param groups 同桌组列表
   * @returns 是否成功
   */
  async batchUpdate(layoutId: string, groups: DeskMateGroup[]): Promise<boolean> {
    try {
      // 先删除该座位表的所有同桌组
      const existingGroups = this.findByLayoutId(layoutId)
      for (const group of existingGroups) {
        await this.delete(group.id)
      }

      // 插入新的同桌组
      for (const group of groups) {
        await this.insert(group)
      }

      return true
    } catch (error) {
      console.error('Batch update failed:', error)
      return false
    }
  }

  /**
   * 检查学生是否已属于某个同桌组
   * @param studentId 学生ID
   * @param layoutId 座位表ID（可选）
   * @returns 是否已分配
   */
  isStudentInGroup(studentId: string, layoutId?: string): boolean {
    const groups = layoutId ? this.findByLayoutId(layoutId) : this.findAll()
    return groups.some(g => g.studentIds.includes(studentId))
  }

  /**
   * 获取同桌组的学生数量统计
   * @returns 统计信息
   */
  getGroupStats(): { totalGroups: number; totalStudents: number; avgGroupSize: number } {
    const groups = this.findAll()
    const totalGroups = groups.length
    const totalStudents = groups.reduce((sum, g) => sum + g.studentIds.length, 0)
    const avgGroupSize = totalGroups > 0 ? totalStudents / totalGroups : 0

    return {
      totalGroups,
      totalStudents,
      avgGroupSize
    }
  }

  /**
   * 查找包含指定学生的同桌组
   * @param studentIds 学生ID数组
   * @returns 匹配的同桌组
   */
  findGroupsContainingStudents(studentIds: string[]): DeskMateGroup[] {
    const groups = this.findAll()
    return groups.filter(g =>
      studentIds.some(id => g.studentIds.includes(id))
    )
  }
}

// 导出单例实例
export const deskMateRepository = new DeskMateRepository()

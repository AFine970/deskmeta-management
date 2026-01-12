/**
 * Desk mate related types
 * 同桌功能类型定义
 */

/**
 * Desk mate group entity
 * 同桌组（一组同桌的学生）
 */
export interface DeskMateGroup {
  id: string
  name: string          // 同桌组名称（可选）
  studentIds: string[]  // 学生ID数组（2-4人）
  layoutId?: string     // 关联的座位表ID
  createdAt: Date
  updatedAt: Date
}

/**
 * Desk mate creation data
 * 创建同桌组的数据
 */
export type CreateDeskMateDto = Omit<
  DeskMateGroup,
  'id' | 'createdAt' | 'updatedAt'
>

/**
 * Desk mate update data
 * 更新同桌组的数据
 */
export type UpdateDeskMateDto = Partial<CreateDeskMateDto>

/**
 * Desk mate constraint type
 * 同桌约束类型
 */
export type DeskMateConstraintType =
  | 'none'              // 无约束
  | 'mixed_gender'      // 男女同桌
  | 'same_gender'       // 同性同桌
  | 'custom'            // 自定义同桌组

/**
 * Desk mate validation result
 * 同桌约束验证结果
 */
export interface DeskMateValidationResult {
  valid: boolean
  violations: string[]
  warnings?: string[]
}

/**
 * Smart desk mate recommendation
 * 智能同桌推荐结果
 */
export interface DeskMateRecommendation {
  groups: DeskMateGroup[]
  score: number         // 推荐分数 (0-100)
  coverage: number      // 学生覆盖率 (0-1)
  constraintType: DeskMateConstraintType
}

/**
 * Seat with desk mate information
 * 座位与同桌信息
 */
export interface SeatWithDeskMate {
  seatId: string
  studentId: string
  studentName: string
  gender: 'male' | 'female'
  deskMateGroupId?: string
  deskMateNames?: string[]  // 同桌姓名列表
}

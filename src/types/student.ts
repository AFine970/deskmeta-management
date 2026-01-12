/**
 * Student related types
 */

/**
 * Student entity
 */
export interface Student {
  id: string
  name: string
  gender: 'male' | 'female'
  contact?: string
  grade?: string
  className?: string
  specialNeeds: boolean
  preferredSeatId?: string
  notes?: string
  deskMateGroupId?: string  // 关联同桌组
  createdAt: Date
  updatedAt: Date
}

/**
 * Student creation data (without auto-generated fields)
 */
export type CreateStudentDto = Omit<
  Student,
  'id' | 'createdAt' | 'updatedAt'
>

/**
 * Student update data (all fields optional)
 */
export type UpdateStudentDto = Partial<CreateStudentDto>

/**
 * Student filter options
 */
export interface StudentFilters {
  gender?: 'male' | 'female'
  className?: string
  grade?: string
  specialNeeds?: boolean
  searchKeyword?: string
}

/**
 * Student import data
 */
export interface StudentImportData {
  name: string
  gender: string
  contact?: string
  grade?: string
  className?: string
  specialNeeds?: string
  preferredSeatId?: string
  notes?: string
}

/**
 * Import result
 */
export interface ImportResult {
  success: number
  failed: number
  errors: Array<{
    row: number
    name: string
    error: string
  }>
}

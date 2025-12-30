/**
 * Student Manager
 * Core business logic for student management
 */

import { studentRepository } from '../repository/student.repository'
import type { Student, CreateStudentDto, UpdateStudentDto, StudentImportData, ImportResult, ValidationResult } from '../types'

export class StudentManager {
  /**
   * Add a new student
   */
  async addStudent(data: CreateStudentDto): Promise<Student> {
    // Validate student data
    const validation = this.validateStudentData(data)
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '))
    }

    // Check name uniqueness
    if (!studentRepository.isNameUnique(data.name)) {
      throw new Error(`Student with name "${data.name}" already exists`)
    }

    // Create student
    return await studentRepository.insert(data)
  }

  /**
   * Update student
   */
  async updateStudent(id: string, data: UpdateStudentDto): Promise<Student> {
    const existing = studentRepository.findById(id)
    if (!existing) {
      throw new Error('Student not found')
    }

    // Check name uniqueness if name is being changed
    if (data.name && data.name !== existing.name) {
      if (!studentRepository.isNameUnique(data.name, id)) {
        throw new Error(`Student with name "${data.name}" already exists`)
      }
    }

    // Validate
    const validation = this.validateStudentData({ ...existing, ...data })
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '))
    }

    // Update student
    const success = await studentRepository.update(id, data)
    if (!success) {
      throw new Error('Failed to update student')
    }

    return studentRepository.findById(id)!
  }

  /**
   * Delete student
   */
  async deleteStudent(id: string): Promise<boolean> {
    const student = studentRepository.findById(id)
    if (!student) {
      throw new Error('Student not found')
    }

    return await studentRepository.delete(id)
  }

  /**
   * Get student by ID
   */
  getStudent(id: string): Student | null {
    return studentRepository.findById(id)
  }

  /**
   * Get all students
   */
  getAllStudents(): Student[] {
    return studentRepository.findAll()
  }

  /**
   * Import students from array
   */
  async importStudents(data: StudentImportData[]): Promise<ImportResult> {
    const result: ImportResult = {
      success: 0,
      failed: 0,
      errors: []
    }

    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      const rowNum = i + 1

      try {
        // Convert import data to student data
        const studentData: CreateStudentDto = {
          name: row.name,
          gender: this.normalizeGender(row.gender),
          contact: row.contact,
          grade: row.grade,
          className: row.className,
          specialNeeds: row.specialNeeds?.toLowerCase() === 'true' || row.specialNeeds === '1',
          preferredSeatId: row.preferredSeatId,
          notes: row.notes
        }

        // Validate
        const validation = this.validateStudentData(studentData)
        if (!validation.isValid) {
          result.failed++
          result.errors.push({
            row: rowNum,
            name: row.name,
            error: validation.errors.join(', ')
          })
          continue
        }

        // Check for duplicate
        if (!studentRepository.isNameUnique(studentData.name)) {
          result.failed++
          result.errors.push({
            row: rowNum,
            name: row.name,
            error: 'Name already exists'
          })
          continue
        }

        // Insert student
        await studentRepository.insert(studentData)
        result.success++
      } catch (error) {
        result.failed++
        result.errors.push({
          row: rowNum,
          name: row.name,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return result
  }

  /**
   * Validate student data
   */
  validateStudentData(data: Partial<CreateStudentDto>): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Required fields
    if (!data.name || data.name.trim().length === 0) {
      errors.push('Student name is required')
    } else if (data.name.length > 50) {
      errors.push('Student name must be less than 50 characters')
    }

    if (!data.gender) {
      errors.push('Gender is required')
    } else if (!['male', 'female'].includes(data.gender)) {
      errors.push('Gender must be either "male" or "female"')
    }

    // Optional field validation
    if (data.contact && data.contact.length > 100) {
      warnings.push('Contact information is too long')
    }

    if (data.grade && data.grade.length > 20) {
      warnings.push('Grade name is too long')
    }

    if (data.className && data.className.length > 50) {
      warnings.push('Class name is too long')
    }

    if (data.notes && data.notes.length > 500) {
      warnings.push('Notes are too long')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Normalize gender value
   * Handles various formats: 男/女, male/female, m/f, 1/0
   */
  private normalizeGender(gender: string): 'male' | 'female' {
    if (!gender || typeof gender !== 'string') {
      throw new Error(`Invalid gender value: ${gender}`)
    }

    // Remove all whitespace characters
    const cleaned = gender.replace(/\s+/g, '')

    // Check for male indicators
    if (
      cleaned === '男' ||
      cleaned.toLowerCase() === 'male' ||
      cleaned.toLowerCase() === 'm' ||
      cleaned === '1'
    ) {
      return 'male'
    }

    // Check for female indicators
    if (
      cleaned === '女' ||
      cleaned.toLowerCase() === 'female' ||
      cleaned.toLowerCase() === 'f' ||
      cleaned === '0'
    ) {
      return 'female'
    }

    // Additional fallback: check if string contains the characters
    if (cleaned.includes('男')) return 'male'
    if (cleaned.includes('女')) return 'female'

    throw new Error(`Invalid gender value: "${gender}" (cleaned: "${cleaned}")`)
  }

  /**
   * Get gender statistics
   */
  getGenderStats(): { male: number; female: number; total: number } {
    const stats = studentRepository.getCountByGender()
    return {
      ...stats,
      total: stats.male + stats.female
    }
  }

  /**
   * Get students by class
   */
  getStudentsByClass(className: string): Student[] {
    return studentRepository.findByClass(className)
  }

  /**
   * Get students with special needs
   */
  getSpecialNeedsStudents(): Student[] {
    return studentRepository.findSpecialNeeds()
  }

  /**
   * Search students
   */
  searchStudents(keyword: string): Student[] {
    return studentRepository.search({
      searchKeyword: keyword
    })
  }
}

// Export singleton instance
export const studentManager = new StudentManager()

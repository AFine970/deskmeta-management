/**
 * Student repository
 * Handles all student data operations
 */

import { BaseRepository } from './base-repository'
import type { Student, CreateStudentDto, UpdateStudentDto, StudentFilters } from '../types'

export class StudentRepository extends BaseRepository<Student> {
  constructor() {
    super('students')
  }

  /**
   * Find student by name
   */
  findByName(name: string): Student | null {
    const students = this.findAll()
    return students.find(s => s.name === name) || null
  }

  /**
   * Find students by gender
   */
  findByGender(gender: 'male' | 'female'): Student[] {
    return this.findWhere(s => s.gender === gender)
  }

  /**
   * Find students by class
   */
  findByClass(className: string): Student[] {
    return this.findWhere(s => s.className === className)
  }

  /**
   * Find students with special needs
   */
  findSpecialNeeds(): Student[] {
    return this.findWhere(s => s.specialNeeds === true)
  }

  /**
   * Check if name is unique (excluding current student)
   */
  isNameUnique(name: string, excludeId?: string): boolean {
    const existing = this.findByName(name)
    if (!existing) return true
    return excludeId !== undefined && existing.id === excludeId
  }

  /**
   * Search students by filters
   */
  search(filters: StudentFilters): Student[] {
    let students = this.findAll()

    if (filters.gender) {
      students = students.filter(s => s.gender === filters.gender)
    }

    if (filters.className) {
      students = students.filter(s => s.className === filters.className)
    }

    if (filters.grade) {
      students = students.filter(s => s.grade === filters.grade)
    }

    if (filters.specialNeeds !== undefined) {
      students = students.filter(s => s.specialNeeds === filters.specialNeeds)
    }

    if (filters.searchKeyword) {
      const keyword = filters.searchKeyword.toLowerCase()
      students = students.filter(s =>
        s.name.toLowerCase().includes(keyword) ||
        s.notes?.toLowerCase().includes(keyword) ||
        s.contact?.toLowerCase().includes(keyword)
      )
    }

    return students
  }

  /**
   * Bulk insert students
   */
  async bulkInsert(students: CreateStudentDto[]): Promise<Student[]> {
    const results: Student[] = []

    for (const studentData of students) {
      // Check for duplicate names
      if (!this.isNameUnique(studentData.name)) {
        console.warn(`Student with name "${studentData.name}" already exists, skipping`)
        continue
      }

      const student = await this.insert(studentData)
      results.push(student)
    }

    return results
  }

  /**
   * Get student count by gender
   */
  getCountByGender(): { male: number; female: number } {
    const students = this.findAll()
    return {
      male: students.filter(s => s.gender === 'male').length,
      female: students.filter(s => s.gender === 'female').length
    }
  }

  /**
   * Delete all students (with confirmation)
   */
  async deleteAll(): Promise<number> {
    const students = this.findAll()
    let count = 0

    for (const student of students) {
      const success = await this.delete(student.id)
      if (success) count++
    }

    return count
  }
}

// Export singleton instance
export const studentRepository = new StudentRepository()

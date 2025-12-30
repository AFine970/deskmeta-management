/**
 * Student Store
 * Manages student data state
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { studentManager } from '../core/student-manager'
import type { Student, CreateStudentDto, StudentFilters, StudentImportData } from '../types'
import DatabaseConnection from '../database/connection'

export const useStudentStore = defineStore('student', () => {
  // State
  const students = ref<Student[]>([])
  const selectedStudents = ref<string[]>([])
  const loading = ref(false)
  const filters = ref<StudentFilters>({})

  // Computed
  const totalStudents = computed(() => students.value.length)
  const maleCount = computed(() => students.value.filter(s => s.gender === 'male').length)
  const femaleCount = computed(() => students.value.filter(s => s.gender === 'female').length)
  const specialNeedsCount = computed(() => students.value.filter(s => s.specialNeeds).length)

  const filteredStudents = computed(() => {
    let filtered = students.value

    // Apply search filter
    if (filters.value.searchKeyword) {
      const keyword = filters.value.searchKeyword.toLowerCase()
      filtered = filtered.filter(s =>
        s.name.toLowerCase().includes(keyword) ||
        s.notes?.toLowerCase().includes(keyword) ||
        s.contact?.toLowerCase().includes(keyword)
      )
    }

    // Apply other filters
    if (filters.value.gender) {
      filtered = filtered.filter(s => s.gender === filters.value.gender)
    }

    if (filters.value.className) {
      filtered = filtered.filter(s => s.className === filters.value.className)
    }

    if (filters.value.grade) {
      filtered = filtered.filter(s => s.grade === filters.value.grade)
    }

    if (filters.value.specialNeeds !== undefined) {
      filtered = filtered.filter(s => s.specialNeeds === filters.value.specialNeeds)
    }

    return filtered
  })

  // Actions
  async function loadStudents() {
    loading.value = true
    try {
      await DatabaseConnection.getInstance().init()
      students.value = studentManager.getAllStudents()
    } finally {
      loading.value = false
    }
  }

  async function addStudent(data: CreateStudentDto) {
    const student = await studentManager.addStudent(data)
    // 防止重复添加：检查是否已存在相同ID的学生
    const exists = students.value.some(s => s.id === student.id)
    if (!exists) {
      students.value.push(student)
    }
    return student
  }

  async function updateStudent(id: string, data: Partial<CreateStudentDto>) {
    const student = await studentManager.updateStudent(id, data)
    const index = students.value.findIndex(s => s.id === id)
    if (index !== -1) {
      // 使用 splice 替换以确保响应式更新
      students.value.splice(index, 1, student)
    } else {
      // 如果本地没有，添加到数组中
      students.value.push(student)
    }
    return student
  }

  async function deleteStudent(id: string) {
    const success = await studentManager.deleteStudent(id)
    if (success) {
      students.value = students.value.filter(s => s.id !== id)
      selectedStudents.value = selectedStudents.value.filter(sid => sid !== id)
    }
    return success
  }

  async function importStudents(data: StudentImportData[]) {
    const result = await studentManager.importStudents(data)
    if (result.success > 0) {
      // 重新加载所有学生以确保数据一致性
      await loadStudents()
    }
    return result
  }

  function selectStudent(id: string) {
    if (!selectedStudents.value.includes(id)) {
      selectedStudents.value.push(id)
    }
  }

  function deselectStudent(id: string) {
    selectedStudents.value = selectedStudents.value.filter(sid => sid !== id)
  }

  function toggleStudent(id: string) {
    if (selectedStudents.value.includes(id)) {
      deselectStudent(id)
    } else {
      selectStudent(id)
    }
  }

  function clearSelection() {
    selectedStudents.value = []
  }

  function selectAllStudents() {
    selectedStudents.value = students.value.map(s => s.id)
  }

  function updateFilters(newFilters: Partial<StudentFilters>) {
    filters.value = { ...filters.value, ...newFilters }
  }

  function clearFilters() {
    filters.value = {}
  }

  function getStudentById(id: string) {
    return students.value.find(s => s.id === id)
  }

  function getSelectedStudents() {
    return students.value.filter(s => selectedStudents.value.includes(s.id))
  }

  return {
    // State
    students,
    selectedStudents,
    loading,
    filters,

    // Computed
    totalStudents,
    maleCount,
    femaleCount,
    specialNeedsCount,
    filteredStudents,

    // Actions
    loadStudents,
    addStudent,
    updateStudent,
    deleteStudent,
    importStudents,
    selectStudent,
    deselectStudent,
    toggleStudent,
    clearSelection,
    selectAllStudents,
    updateFilters,
    clearFilters,
    getStudentById,
    getSelectedStudents
  }
})

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
    return studentManager.searchStudents(filters.value.searchKeyword || '')
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
    students.value.push(student)
    return student
  }

  async function updateStudent(id: string, data: Partial<CreateStudentDto>) {
    const student = await studentManager.updateStudent(id, data)
    const index = students.value.findIndex(s => s.id === id)
    if (index !== -1) {
      students.value[index] = student
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

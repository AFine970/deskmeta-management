/**
 * Layout Store
 * Manages seat layout state
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { seatManager } from '../core/seat-manager'
import { layoutRepository } from '../repository/layout.repository'
import type { LayoutConfig, CreateLayoutDto } from '../types'
import DatabaseConnection from '../database/connection'

export const useLayoutStore = defineStore('layout', () => {
  // State
  const layouts = ref<LayoutConfig[]>([])
  const currentLayout = ref<LayoutConfig | null>(null)
  const selectedSeats = ref<string[]>([])
  const loading = ref(false)

  // Computed
  const hasLayouts = computed(() => layouts.value.length > 0)
  const currentLayoutCapacity = computed(() =>
    currentLayout.value ? seatManager.getCapacity(currentLayout.value) : 0
  )

  // Actions
  async function loadLayouts() {
    loading.value = true
    try {
      await DatabaseConnection.getInstance().init()
      layouts.value = layoutRepository.findAll()

      // Load default layout if available
      const defaultLayout = layoutRepository.findDefault()
      if (defaultLayout) {
        currentLayout.value = defaultLayout
      }
    } finally {
      loading.value = false
    }
  }

  async function createLayout(data: CreateLayoutDto) {
    loading.value = true
    try {
      const layout = await seatManager.createLayout(data)
      layouts.value.push(layout)
      currentLayout.value = layout
      return layout
    } finally {
      loading.value = false
    }
  }

  async function updateLayout(id: string, data: Partial<CreateLayoutDto>) {
    loading.value = true
    try {
      const layout = await seatManager.updateLayout(id, data)
      const index = layouts.value.findIndex(l => l.id === id)
      if (index !== -1) {
        layouts.value[index] = layout
      }
      if (currentLayout.value?.id === id) {
        currentLayout.value = layout
      }
      return layout
    } finally {
      loading.value = false
    }
  }

  async function deleteLayout(id: string) {
    loading.value = true
    try {
      await seatManager.deleteLayout(id)
      layouts.value = layouts.value.filter(l => l.id !== id)
      if (currentLayout.value?.id === id) {
        currentLayout.value = null
      }
    } finally {
      loading.value = false
    }
  }

  async function setAsDefault(id: string) {
    try {
      await seatManager.setAsDefault(id)
      layouts.value.forEach(l => {
        l.isDefault = l.id === id
      })
    } catch (error) {
      console.error('Failed to set default layout:', error)
      throw error
    }
  }

  function selectSeat(seatId: string) {
    if (!selectedSeats.value.includes(seatId)) {
      selectedSeats.value.push(seatId)
    }
  }

  function deselectSeat(seatId: string) {
    selectedSeats.value = selectedSeats.value.filter(id => id !== seatId)
  }

  function toggleSeat(seatId: string) {
    if (selectedSeats.value.includes(seatId)) {
      deselectSeat(seatId)
    } else {
      selectSeat(seatId)
    }
  }

  function clearSelection() {
    selectedSeats.value = []
  }

  function selectAllSeats() {
    if (!currentLayout.value) return
    selectedSeats.value = currentLayout.value.seats.map(s => s.id)
  }

  async function cloneLayout(id: string, newName: string) {
    loading.value = true
    try {
      const layout = await seatManager.cloneLayout(id, newName)
      if (layout) {
        layouts.value.push(layout)
      }
      return layout
    } finally {
      loading.value = false
    }
  }

  return {
    // State
    layouts,
    currentLayout,
    selectedSeats,
    loading,

    // Computed
    hasLayouts,
    currentLayoutCapacity,

    // Actions
    loadLayouts,
    createLayout,
    updateLayout,
    deleteLayout,
    setAsDefault,
    selectSeat,
    deselectSeat,
    toggleSeat,
    clearSelection,
    selectAllSeats,
    cloneLayout
  }
})

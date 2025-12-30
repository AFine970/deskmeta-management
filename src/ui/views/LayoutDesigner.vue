<template>
  <v-container fluid>
    <!-- Header -->
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 mb-2">座位表设计</h1>
        <p class="text-subtitle-1 text-grey">创建和管理座位表布局</p>
      </v-col>
    </v-row>

    <!-- Layout List -->
    <v-row v-if="!currentLayout">
      <v-col cols="12">
        <v-card>
          <v-card-title class="d-flex align-center">
            <span>我的座位表</span>
            <v-spacer />
            <v-btn
              color="primary"
              prepend-icon="mdi-plus"
              @click="showCreateDialog = true"
            >
              新建座位表
            </v-btn>
          </v-card-title>

          <v-card-text>
            <v-row v-if="layoutStore.hasLayouts">
              <v-col
                v-for="layout in layoutStore.layouts"
                :key="layout.id"
                cols="12"
                sm="6"
                md="4"
              >
                <v-card
                  hover
                  :color="layout.isDefault ? 'primary' : undefined"
                  :variant="layout.isDefault ? 'tonal' : undefined"
                  @click="selectLayout(layout)"
                >
                  <v-card-item>
                    <v-card-title>
                      {{ layout.name }}
                      <v-chip
                        v-if="layout.isDefault"
                        size="small"
                        color="primary"
                        class="ml-2"
                      >
                        默认
                      </v-chip>
                    </v-card-title>
                    <v-card-subtitle>
                      {{ layout.rows }} 行 × {{ layout.cols }} 列
                      · {{ layout.seats.length }} 个座位
                    </v-card-subtitle>
                  </v-card-item>

                  <v-card-actions>
                    <v-btn
                      size="small"
                      color="primary"
                      @click.stop="selectLayout(layout)"
                    >
                      选择
                    </v-btn>
                    <v-btn
                      v-if="!layout.isDefault"
                      size="small"
                      color="warning"
                      @click.stop="setDefault(layout)"
                    >
                      设为默认
                    </v-btn>
                    <v-spacer />
                    <v-btn
                      size="small"
                      icon="mdi-delete"
                      color="error"
                      @click.stop="confirmDelete(layout)"
                    />
                  </v-card-actions>
                </v-card>
              </v-col>
            </v-row>

            <v-alert
              v-else
              type="info"
              variant="tonal"
              class="mt-4"
            >
              还没有座位表,点击"新建座位表"创建一个吧!
            </v-alert>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Layout Editor -->
    <v-row v-if="currentLayout">
      <v-col cols="12">
        <v-btn
          prepend-icon="mdi-arrow-left"
          @click="backToList"
          class="mb-4"
        >
          返回列表
        </v-btn>

        <v-card>
          <v-card-item>
            <v-card-title>
              {{ currentLayout.name }}
            </v-card-title>
            <v-card-subtitle>
              {{ currentLayout.rows }} 行 × {{ currentLayout.cols }} 列
            </v-card-subtitle>
          </v-card-item>

          <v-card-text>
            <!-- Seating Grid Preview -->
            <div id="seating-chart-preview" class="seating-chart-preview">
              <v-row
                v-for="row in currentLayout.rows"
                :key="row"
                class="seat-row"
                no-gutters
              >
                <v-col
                  v-for="col in currentLayout.cols"
                  :key="`${row}-${col}`"
                  class="seat-col"
                >
                  <div
                    class="seat-box"
                    :class="{ 'seat-special': isSpecialSeat(row - 1, col - 1) }"
                  >
                    {{ getSeatNumber(row - 1, col - 1) }}
                  </div>
                </v-col>
              </v-row>
            </div>
          </v-card-text>

          <v-card-actions>
            <v-btn
              color="primary"
              prepend-icon="mdi-pencil"
              @click="showEditDialog = true"
            >
              编辑
            </v-btn>
            <v-btn
              color="success"
              prepend-icon="mdi-content-copy"
              @click="cloneLayout"
            >
              克隆
            </v-btn>
            <v-spacer />
            <v-btn
              color="info"
              prepend-icon="mdi-arrow-right"
              @click="goToFill"
            >
              填充座位
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <!-- Create/Edit Dialog -->
    <v-dialog v-model="showCreateDialog" max-width="600px">
      <v-card>
        <v-card-title>新建座位表</v-card-title>

        <v-card-text>
          <v-form ref="formRef">
            <v-text-field
              v-model="newLayout.name"
              label="座位表名称"
              prepend-icon="mdi-label"
              :rules="[rules.required]"
            />

            <v-row>
              <v-col cols="6">
                <v-text-field
                  v-model.number="newLayout.rows"
                  label="行数"
                  type="number"
                  prepend-icon="mdi-arrow-expand-vertical"
                  :rules="[rules.required, rules.min(1), rules.max(20)]"
                />
              </v-col>
              <v-col cols="6">
                <v-text-field
                  v-model.number="newLayout.cols"
                  label="列数"
                  type="number"
                  prepend-icon="mdi-arrow-expand-horizontal"
                  :rules="[rules.required, rules.min(1), rules.max(20)]"
                />
              </v-col>
            </v-row>

            <v-select
              v-model="newLayout.seatNumberingMode"
              :items="numberingModes"
              label="编号模式"
              prepend-icon="mdi-numeric"
            >
              <template #item="{ item, props }">
                <v-list-item v-bind="props">
                  <template #title>{{ item.title }}</template>
                  <template #subtitle>{{ item.description }}</template>
                </v-list-item>
              </template>
            </v-select>

            <v-checkbox
              v-model="newLayout.isDefault"
              label="设为默认座位表"
            />
          </v-form>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn @click="showCreateDialog = false">取消</v-btn>
          <v-btn color="primary" @click="createLayout">创建</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="showDeleteDialog" max-width="400px">
      <v-card>
        <v-card-title>确认删除</v-card-title>
        <v-card-text>
          确定要删除座位表 "{{ layoutToDelete?.name }}" 吗?
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="showDeleteDialog = false">取消</v-btn>
          <v-btn color="error" @click="deleteLayout">删除</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useLayoutStore } from '../../stores/layout'
import { storeToRefs } from 'pinia'
import type { LayoutConfig } from '../../types'

const router = useRouter()
const layoutStore = useLayoutStore()
const { layouts, currentLayout } = storeToRefs(layoutStore)

// Dialog states
const showCreateDialog = ref(false)
const showEditDialog = ref(false)
const showDeleteDialog = ref(false)

// Form data
const newLayout = ref({
  name: '',
  rows: 8,
  cols: 8,
  seatNumberingMode: 'sequential' as const,
  isDefault: false
})

const layoutToDelete = ref<LayoutConfig | null>(null)

// Numbering mode options
const numberingModes = [
  {
    title: '连续编号',
    value: 'sequential',
    description: '01、02、03... 适合打印展示'
  },
  {
    title: '坐标编号',
    value: 'coordinate',
    description: 'seat_0_0、seat_0_1... 系统内部使用'
  }
]

// Validation rules
const rules = {
  required: (v: string) => !!v || '此项为必填',
  min: (min: number) => (v: number) => v >= min || `不能小于 ${min}`,
  max: (max: number) => (v: number) => v <= max || `不能大于 ${max}`
}

// Load layouts on mount
onMounted(async () => {
  await layoutStore.loadLayouts()
})

// Select layout
function selectLayout(layout: LayoutConfig) {
  layoutStore.currentLayout = layout
}

// Back to list
function backToList() {
  layoutStore.currentLayout = null
}

// Create layout
async function createLayout() {
  try {
    await layoutStore.createLayout(newLayout.value)
    showCreateDialog.value = false

    // Reset form
    newLayout.value = {
      name: '',
      rows: 8,
      cols: 8,
      seatNumberingMode: 'sequential',
      isDefault: false
    }
  } catch (error) {
    console.error('Failed to create layout:', error)
    alert('创建座位表失败: ' + (error as Error).message)
  }
}

// Set as default
async function setDefault(layout: LayoutConfig) {
  try {
    await layoutStore.setAsDefault(layout.id)
  } catch (error) {
    console.error('Failed to set default:', error)
    alert('设置默认失败: ' + (error as Error).message)
  }
}

// Confirm delete
function confirmDelete(layout: LayoutConfig) {
  layoutToDelete.value = layout
  showDeleteDialog.value = true
}

// Delete layout
async function deleteLayout() {
  if (!layoutToDelete.value) return

  try {
    await layoutStore.deleteLayout(layoutToDelete.value.id)
    showDeleteDialog.value = false
    layoutToDelete.value = null
  } catch (error) {
    console.error('Failed to delete layout:', error)
    alert('删除失败: ' + (error as Error).message)
  }
}

// Clone layout
async function cloneLayout() {
  if (!currentLayout.value) return

  const newName = `${currentLayout.value.name} - 副本`
  try {
    await layoutStore.cloneLayout(currentLayout.value.id, newName)
  } catch (error) {
    console.error('Failed to clone layout:', error)
    alert('克隆失败: ' + (error as Error).message)
  }
}

// Go to fill page
function goToFill() {
  router.push('/fill')
}

// Get seat number
function getSeatNumber(row: number, col: number): string {
  if (!currentLayout.value) return ''

  const seat = currentLayout.value.seats.find(
    s => s.row === row && s.col === col
  )

  return seat?.displayNumber || ''
}

// Check if seat is special
function isSpecialSeat(row: number, col: number): boolean {
  if (!currentLayout.value) return false

  const seat = currentLayout.value.seats.find(
    s => s.row === row && s.col === col
  )

  return seat?.type === 'special'
}
</script>

<style scoped>
.seating-chart-preview {
  background-color: #f5f5f5;
  padding: 40px;
  border-radius: 8px;
  overflow-x: auto;
}

.seat-row {
  margin-bottom: 8px;
}

.seat-col {
  padding: 4px;
}

.seat-box {
  width: 60px;
  height: 60px;
  border: 2px solid #1976d2;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: white;
  font-weight: bold;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.seat-box:hover {
  background-color: #e3f2fd;
  transform: scale(1.05);
}

.seat-box.seat-special {
  background-color: #fff3cd;
  border-color: #ffc107;
}
</style>

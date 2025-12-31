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
            <!-- Seating Grid with Functional Areas -->
            <div class="seating-layout-container">
              <!-- Top Area (only podium if positioned at top) -->
              <div
                v-if="hasTopArea"
                class="functional-area-area area-top"
              >
                <span class="area-label">
                  <span v-if="currentLayout.functionalAreas?.podium?.visible && currentLayout.functionalAreas.podium.position.startsWith('top')">
                    <v-icon size="small" class="mr-1">mdi-television</v-icon> 讲台
                  </span>
                </span>
              </div>

              <!-- Middle Section: Left Area + Grid + Right Area -->
              <div class="seating-middle-section">
                <!-- Left Area -->
                <div
                  v-if="hasLeftArea"
                  class="functional-area-area area-left"
                >
                  <div class="area-label-vertical">
                    <span v-if="currentLayout.functionalAreas?.backDoor?.visible && currentLayout.functionalAreas.backDoor.position === 'left'">
                      <v-icon size="small">mdi-door-closed</v-icon> 后门
                    </span>
                  </div>
                </div>

                <!-- Seating Grid -->
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
                        :class="{
                          'seat-special': isSpecialSeat(row - 1, col - 1)
                        }"
                        :title="getSeatTooltip(row - 1, col - 1)"
                      >
                        {{ getSeatNumber(row - 1, col - 1) }}
                      </div>
                    </v-col>
                  </v-row>
                </div>

                <!-- Right Area -->
                <div
                  v-if="hasRightArea"
                  class="functional-area-area area-right"
                >
                  <div class="area-label-vertical">
                    <span v-if="currentLayout.functionalAreas?.backDoor?.visible && currentLayout.functionalAreas.backDoor.position === 'right'">
                      <v-icon size="small">mdi-door-closed</v-icon> 后门
                    </span>
                  </div>
                </div>
              </div>

              <!-- Bottom Area (backDoor, podium if positioned at bottom) -->
              <div
                v-if="hasBottomArea"
                class="functional-area-area area-bottom"
              >
                <span class="area-label">
                  <span v-if="currentLayout.functionalAreas?.backDoor?.visible && currentLayout.functionalAreas.backDoor.position === 'bottom'">
                    <v-icon size="small" class="mr-1">mdi-door-closed</v-icon> 后门
                  </span>
                  <span v-if="currentLayout.functionalAreas?.podium?.visible && currentLayout.functionalAreas.podium.position === 'bottom'">
                    <v-icon size="small" class="mr-1">mdi-television</v-icon> 讲台
                  </span>
                </span>
              </div>
            </div>

            <!-- Functional Areas Summary Chips (for reference) -->
            <div v-if="currentLayout.functionalAreas" class="mt-4">
              <div class="text-caption text-grey">已配置区域:</div>
              <div class="functional-areas-summary">
                <v-chip
                  v-if="currentLayout.functionalAreas.backDoor?.visible"
                  size="x-small"
                  color="orange"
                  class="mr-1 mb-1"
                  variant="outlined"
                >
                  后门({{ getAreaPositionLabel(currentLayout.functionalAreas.backDoor.position) }})
                </v-chip>
                <v-chip
                  v-if="currentLayout.functionalAreas.podium?.visible"
                  size="x-small"
                  color="purple"
                  class="mr-1 mb-1"
                  variant="outlined"
                >
                  讲台({{ getAreaPositionLabel(currentLayout.functionalAreas.podium.position) }})
                </v-chip>
              </div>
            </div>
          </v-card-text>

          <v-card-actions>
            <v-btn
              color="primary"
              prepend-icon="mdi-pencil"
              @click="openEditDialog"
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

    <!-- Create Dialog -->
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
              item-title="title"
              item-value="value"
              label="编号模式"
              prepend-icon="mdi-numeric"
            />

            <v-checkbox
              v-model="newLayout.isDefault"
              label="设为默认座位表"
            />

            <!-- Functional Areas Configuration -->
            <div class="mt-4">
              <div class="text-subtitle-2 mb-2">功能区域标注</div>
              <v-row>
                <v-col cols="6">
                  <v-checkbox
                    v-model="newLayout.functionalAreas.backDoor.visible"
                    label="后门"
                    density="compact"
                  />
                </v-col>
                <v-col cols="6">
                  <v-checkbox
                    v-model="newLayout.functionalAreas.podium.visible"
                    label="讲台"
                    density="compact"
                  />
                </v-col>
              </v-row>

              <v-select
                v-model="newLayout.functionalAreas.backDoor.position"
                :items="positionOptions"
                label="后门位置"
                prepend-icon="mdi-door-closed"
                density="compact"
                class="mt-2"
                :disabled="!newLayout.functionalAreas.backDoor.visible"
              />
              <v-select
                v-model="newLayout.functionalAreas.podium.position"
                :items="positionOptions"
                label="讲台位置"
                prepend-icon="mdi-television"
                density="compact"
                class="mt-2"
                :disabled="!newLayout.functionalAreas.podium.visible"
              />
            </div>
          </v-form>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn @click="showCreateDialog = false">取消</v-btn>
          <v-btn color="primary" @click="createLayout">创建</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Edit Dialog -->
    <v-dialog v-model="showEditDialog" max-width="600px">
      <v-card>
        <v-card-title>编辑座位表</v-card-title>

        <v-card-text>
          <v-form ref="editFormRef">
            <v-text-field
              v-model="editLayout.name"
              label="座位表名称"
              prepend-icon="mdi-label"
              :rules="[rules.required]"
            />

            <v-row>
              <v-col cols="6">
                <v-text-field
                  v-model.number="editLayout.rows"
                  label="行数"
                  type="number"
                  prepend-icon="mdi-arrow-expand-vertical"
                  :rules="[rules.required, rules.min(1), rules.max(20)]"
                  :disabled="editLayout.hasStudents"
                />
                <div v-if="editLayout.hasStudents" class="text-caption text-warning mt-1">
                  ⚠️ 已有学生数据，修改行列数将清空座位分配
                </div>
              </v-col>
              <v-col cols="6">
                <v-text-field
                  v-model.number="editLayout.cols"
                  label="列数"
                  type="number"
                  prepend-icon="mdi-arrow-expand-horizontal"
                  :rules="[rules.required, rules.min(1), rules.max(20)]"
                  :disabled="editLayout.hasStudents"
                />
              </v-col>
            </v-row>

            <v-select
              v-model="editLayout.seatNumberingMode"
              :items="numberingModes"
              item-title="title"
              item-value="value"
              label="编号模式"
              prepend-icon="mdi-numeric"
            />

            <v-checkbox
              v-model="editLayout.isDefault"
              label="设为默认座位表"
              :disabled="editLayout.isDefault"
            />

            <!-- Functional Areas Configuration -->
            <div class="mt-4">
              <div class="text-subtitle-2 mb-2">功能区域标注</div>
              <v-row>
                <v-col cols="6">
                  <v-checkbox
                    v-model="editLayout.functionalAreas.backDoor.visible"
                    label="后门"
                    density="compact"
                  />
                </v-col>
                <v-col cols="6">
                  <v-checkbox
                    v-model="editLayout.functionalAreas.podium.visible"
                    label="讲台"
                    density="compact"
                  />
                </v-col>
              </v-row>

              <v-select
                v-model="editLayout.functionalAreas.backDoor.position"
                :items="positionOptions"
                label="后门位置"
                prepend-icon="mdi-door-closed"
                density="compact"
                class="mt-2"
                :disabled="!editLayout.functionalAreas.backDoor.visible"
              />
              <v-select
                v-model="editLayout.functionalAreas.podium.position"
                :items="positionOptions"
                label="讲台位置"
                prepend-icon="mdi-television"
                density="compact"
                class="mt-2"
                :disabled="!editLayout.functionalAreas.podium.visible"
              />
            </div>
          </v-form>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn @click="showEditDialog = false">取消</v-btn>
          <v-btn color="primary" @click="updateLayout">保存</v-btn>
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

    <!-- Message Snackbar -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="snackbar.timeout"
      location="top"
    >
      {{ snackbar.message }}
      <template #actions>
        <v-btn variant="text" @click="snackbar.show = false">
          关闭
        </v-btn>
      </template>
    </v-snackbar>
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

// Form refs
const formRef = ref<any>(null)
const editFormRef = ref<any>(null)

// Dialog states
const showCreateDialog = ref(false)
const showEditDialog = ref(false)
const showDeleteDialog = ref(false)

// Snackbar state
const snackbar = ref({
  show: false,
  message: '',
  color: 'info' as 'info' | 'error' | 'success' | 'warning',
  timeout: 3000
})

// Form data
const newLayout = ref({
  name: '',
  rows: 8,
  cols: 8,
  seatNumberingMode: 'sequential' as const,
  isDefault: false,
  functionalAreas: {
    backDoor: { visible: false, position: 'bottom' as const },
    podium: { visible: false, position: 'top-center' as const },
    aisles: []
  }
})

const editLayout = ref({
  id: '',
  name: '',
  rows: 8,
  cols: 8,
  seatNumberingMode: 'sequential' as 'sequential' | 'coordinate',
  isDefault: false,
  hasStudents: false,
  functionalAreas: {
    backDoor: { visible: false, position: 'bottom' as const },
    podium: { visible: false, position: 'top-center' as const },
    aisles: []
  }
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

// Position options for functional areas
const positionOptions = [
  { title: '顶部', value: 'top' },
  { title: '底部', value: 'bottom' },
  { title: '左侧', value: 'left' },
  { title: '右侧', value: 'right' },
  { title: '顶部居中', value: 'top-center' },
  { title: '底部居中', value: 'bottom-center' }
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

// Helper function to show snackbar
function showSnackbar(message: string, color: 'info' | 'error' | 'success' | 'warning' = 'info') {
  snackbar.value = {
    show: true,
    message,
    color,
    timeout: 3000
  }
}

// Select layout
function selectLayout(layout: LayoutConfig) {
  layoutStore.currentLayout = layout
}

// Open edit dialog
function openEditDialog() {
  if (!currentLayout.value) return

  // Check if layout has students (would need to check seating records)
  // For now, we'll assume false and allow editing
  const fa = currentLayout.value.functionalAreas || {
    backDoor: { visible: false, position: 'bottom' },
    podium: { visible: false, position: 'top-center' },
    aisles: []
  }

  editLayout.value = {
    id: currentLayout.value.id,
    name: currentLayout.value.name,
    rows: currentLayout.value.rows,
    cols: currentLayout.value.cols,
    seatNumberingMode: currentLayout.value.seatNumberingMode,
    isDefault: currentLayout.value.isDefault,
    hasStudents: false,
    functionalAreas: {
      backDoor: { ...fa.backDoor },
      podium: { ...fa.podium },
      aisles: [...(fa.aisles || [])]
    }
  }
  showEditDialog.value = true
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
    showSnackbar('座位表创建成功', 'success')

    // Reset form
    newLayout.value = {
      name: '',
      rows: 8,
      cols: 8,
      seatNumberingMode: 'sequential',
      isDefault: false,
      functionalAreas: {
        backDoor: { visible: false, position: 'bottom' as const },
        podium: { visible: false, position: 'top-center' as const },
        aisles: []
      }
    }
  } catch (error) {
    console.error('Failed to create layout:', error)
    showSnackbar('创建座位表失败: ' + (error as Error).message, 'error')
  }
}

// Update layout
async function updateLayout() {
  if (!editLayout.value.id) return

  try {
    await layoutStore.updateLayout(editLayout.value.id, {
      name: editLayout.value.name,
      rows: editLayout.value.rows,
      cols: editLayout.value.cols,
      seatNumberingMode: editLayout.value.seatNumberingMode,
      isDefault: editLayout.value.isDefault,
      functionalAreas: editLayout.value.functionalAreas
    })
    showEditDialog.value = false
    showSnackbar('座位表更新成功', 'success')
  } catch (error) {
    console.error('Failed to update layout:', error)
    showSnackbar('更新座位表失败: ' + (error as Error).message, 'error')
  }
}

// Set as default
async function setDefault(layout: LayoutConfig) {
  try {
    await layoutStore.setAsDefault(layout.id)
    showSnackbar('设置默认成功', 'success')
  } catch (error) {
    console.error('Failed to set default:', error)
    showSnackbar('设置默认失败: ' + (error as Error).message, 'error')
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
    showSnackbar('删除成功', 'success')
  } catch (error) {
    console.error('Failed to delete layout:', error)
    showSnackbar('删除失败: ' + (error as Error).message, 'error')
  }
}

// Clone layout
async function cloneLayout() {
  if (!currentLayout.value) return

  const newName = `${currentLayout.value.name} - 副本`
  try {
    await layoutStore.cloneLayout(currentLayout.value.id, newName)
    showSnackbar('克隆成功', 'success')
  } catch (error) {
    console.error('Failed to clone layout:', error)
    showSnackbar('克隆失败: ' + (error as Error).message, 'error')
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

// Get position label
function getAreaPositionLabel(position: string): string {
  const labels: Record<string, string> = {
    'top': '顶部',
    'bottom': '底部',
    'left': '左侧',
    'right': '右侧',
    'top-center': '顶部居中',
    'bottom-center': '底部居中'
  }
  return labels[position] || position
}

// Get seat tooltip
function getSeatTooltip(row: number, col: number): string {
  if (!currentLayout.value) return ''

  const seat = currentLayout.value.seats.find(s => s.row === row && s.col === col)
  if (!seat) return ''

  let tooltip = `座位: ${seat.displayNumber || '未编号'}`

  if (seat.type === 'special') {
    tooltip += ' (特殊座位)'
  }

  return tooltip
}

// Computed properties for functional areas display
const hasTopArea = computed(() => {
  if (!currentLayout.value?.functionalAreas) return false
  const fa = currentLayout.value.functionalAreas
  return fa.podium?.visible && fa.podium.position.startsWith('top')
})

const hasLeftArea = computed(() => {
  if (!currentLayout.value?.functionalAreas) return false
  const fa = currentLayout.value.functionalAreas
  return fa.backDoor?.visible && fa.backDoor.position === 'left'
})

const hasRightArea = computed(() => {
  if (!currentLayout.value?.functionalAreas) return false
  const fa = currentLayout.value.functionalAreas
  return fa.backDoor?.visible && fa.backDoor.position === 'right'
})

const hasBottomArea = computed(() => {
  if (!currentLayout.value?.functionalAreas) return false
  const fa = currentLayout.value.functionalAreas
  return (fa.backDoor?.visible && fa.backDoor.position === 'bottom') ||
         (fa.podium?.visible && fa.podium.position === 'bottom')
})

</script>

<style scoped>
/* Main container for seating layout with functional areas */
.seating-layout-container {
  background-color: #f5f5f5;
  border-radius: 8px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 0;
  overflow-x: auto;
}

/* Top functional area */
.functional-area-area.area-top {
  min-height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px dashed #9c27b0;
  background-color: #f3e5f5;
  border-radius: 6px 6px 0 0;
  margin-bottom: 0;
}

/* Bottom functional area */
.functional-area-area.area-bottom {
  min-height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px dashed #ff9800;
  background-color: #fff3e0;
  border-radius: 0 0 6px 6px;
  margin-top: 0;
}

/* Middle section with left/right areas and seating grid */
.seating-middle-section {
  display: flex;
  gap: 0;
  align-items: stretch;
}

/* Left functional area */
.functional-area-area.area-left {
  width: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px dashed #2196f3;
  background-color: #e3f2fd;
  border-radius: 6px 0 0 6px;
}

/* Right functional area */
.functional-area-area.area-right {
  width: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px dashed #009688;
  background-color: #e0f2f1;
  border-radius: 0 6px 6px 0;
}

/* Seating grid container */
.seating-chart-preview {
  flex: 1;
  padding: 20px;
  background-color: white;
  border: 2px solid #1976d2;
  border-radius: 4px;
  min-width: 400px;
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

/* Area labels */
.area-label {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  display: flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
}

.area-label-vertical {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  justify-content: center;
  height: 100%;
  white-space: nowrap;
}

/* Functional areas summary chips */
.functional-areas-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

/* Position-specific styles for top area */
.area-top-center {
  justify-content: center;
}

/* Position-specific styles for bottom area */
.area-bottom-center {
  justify-content: center;
}
</style>

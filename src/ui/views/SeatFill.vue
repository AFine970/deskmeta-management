<template>
  <v-container fluid>
    <!-- Header -->
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 mb-2">座位填充</h1>
        <p class="text-subtitle-1 text-grey">为学生分配座位</p>
      </v-col>
    </v-row>

    <!-- Check prerequisites -->
    <v-alert
      v-if="!hasLayout"
      type="warning"
      variant="tonal"
      class="mb-4"
    >
      <template #title>
        还没有座位表
      </template>
      请先创建座位表后再进行填充操作。
      <template #close>
        <v-btn color="primary" to="/layout">创建座位表</v-btn>
      </template>
    </v-alert>

    <v-alert
      v-if="hasLayout && !hasStudents"
      type="warning"
      variant="tonal"
      class="mb-4"
    >
      <template #title>
        还没有学生
      </template>
      请先添加学生后再进行填充操作。
      <template #close>
        <v-btn color="primary" to="/students">添加学生</v-btn>
      </template>
    </v-alert>

    <!-- Main Content -->
    <template v-if="hasLayout && hasStudents">
      <!-- Fill Controls -->
      <v-row>
        <v-col cols="12">
          <v-card>
            <v-card-title>填充配置</v-card-title>

            <v-card-text>
              <v-row>
                <v-col cols="12" sm="4">
                  <v-select
                    v-model="fillStore.fillStrategy"
                    :items="fillStrategies"
                    label="填充策略"
                    prepend-icon="mdi-gamepad-variant"
                  />
                </v-col>

                <v-col cols="12" sm="4">
                  <v-select
                    v-model="fillStore.constraintType"
                    :items="constraintTypes"
                    label="同桌约束"
                    prepend-icon="mdi-account-group"
                    :disabled="fillStore.fillStrategy === 'random'"
                  />
                </v-col>

                <v-col cols="12" sm="4" class="text-right">
                  <v-btn
                    size="x-large"
                    color="primary"
                    prepend-icon="mdi-dice-5"
                    :loading="fillStore.loading"
                    @click="performFill"
                  >
                    开始填充
                  </v-btn>
                </v-col>
              </v-row>

              <v-row class="mt-2">
                <v-col cols="12">
                  <v-alert
                    v-if="constraintWarning"
                    type="info"
                    variant="tonal"
                    closable
                  >
                    {{ constraintWarning }}
                  </v-alert>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Layout Preview with Assignments -->
      <v-row>
        <v-col cols="12">
          <v-card>
            <v-card-item>
              <v-card-title>
                {{ layoutStore.currentLayout?.name }}
              </v-card-title>
              <v-card-subtitle>
                {{ studentStore.totalStudents }} 名学生 · {{ layoutStore.currentLayoutCapacity }} 个座位
              </v-card-subtitle>
            </v-card-item>

            <v-card-text>
              <div id="fill-preview" class="fill-preview">
                <v-row
                  v-for="row in layoutStore.currentLayout?.rows"
                  :key="row"
                  class="seat-row"
                  no-gutters
                >
                  <v-col
                    v-for="col in layoutStore.currentLayout?.cols"
                    :key="`${row}-${col}`"
                    class="seat-col"
                  >
                    <div
                      class="seat-box"
                      :class="getSeatClasses(row - 1, col - 1)"
                    >
                      <div class="seat-number">
                        {{ getSeatNumber(row - 1, col - 1) }}
                      </div>
                      <div class="student-name">
                        {{ getStudentName(row - 1, col - 1) }}
                      </div>
                    </div>
                  </v-col>
                </v-row>
              </div>
            </v-card-text>

            <v-card-actions>
              <v-spacer />
              <v-btn
                color="success"
                prepend-icon="mdi-animation-play"
                :disabled="!fillStore.currentRecord"
                @click="goToAnimation"
              >
                动画演示
              </v-btn>
              <v-btn
                color="info"
                prepend-icon="mdi-export"
                :disabled="!fillStore.currentRecord"
                @click="exportChart"
              >
                导出
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>

      <!-- Fill History -->
      <v-row v-if="fillStore.hasHistory">
        <v-col cols="12">
          <v-card>
            <v-card-title>填充历史</v-card-title>

            <v-card-text>
              <v-list>
                <v-list-item
                  v-for="(record, index) in fillStore.history.slice(0, 5)"
                  :key="record.id"
                  @click="loadHistoryRecord(record)"
                  class="cursor-pointer"
                >
                  <template #prepend>
                    <v-avatar color="primary">
                      {{ index + 1 }}
                    </v-avatar>
                  </template>

                  <v-list-item-title>
                    {{ getStrategyLabel(record.fillStrategy) }}
                    <v-chip v-if="record.constraintType" size="small" class="ml-2">
                      {{ getConstraintLabel(record.constraintType) }}
                    </v-chip>
                  </v-list-item-title>

                  <v-list-item-subtitle>
                    {{ formatDate(record.createdAt) }}
                  </v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </template>

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
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useLayoutStore } from '../../stores/layout'
import { useStudentStore } from '../../stores/student'
import { useFillStore } from '../../stores/fill'
import { storeToRefs } from 'pinia'
import { formatDate } from '../../utils/helpers'
import { Exporter } from '../../utils/exporters'
import type { FillStrategy, ConstraintType } from '../../types'

const router = useRouter()
const layoutStore = useLayoutStore()
const studentStore = useStudentStore()
const fillStore = useFillStore()

const { currentLayout } = storeToRefs(layoutStore)

// Snackbar state
const snackbar = ref({
  show: false,
  message: '',
  color: 'info' as 'info' | 'error' | 'success' | 'warning',
  timeout: 3000
})

// Fill strategies
const fillStrategies = [
  { title: '随机填充', value: 'random' as FillStrategy },
  { title: '手动填充', value: 'manual' as FillStrategy },
  { title: '混合填充', value: 'mixed' as FillStrategy }
]

// Constraint types
const constraintTypes = [
  { title: '随机同桌', value: 'random' as ConstraintType },
  { title: '男女同桌', value: 'mixed_gender' as ConstraintType },
  { title: '同性同桌', value: 'same_gender' as ConstraintType }
]

// Computed
const hasLayout = computed(() => layoutStore.currentLayout !== null)
const hasStudents = computed(() => studentStore.totalStudents > 0)
const constraintWarning = computed(() => {
  if (studentStore.totalStudents > layoutStore.currentLayoutCapacity) {
    return `学生人数(${studentStore.totalStudents})超过座位数(${layoutStore.currentLayoutCapacity}),部分学生将无法分配座位。`
  }
  return null
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

// Load data on mount
onMounted(async () => {
  await layoutStore.loadLayouts()
  await studentStore.loadStudents()

  if (layoutStore.currentLayout) {
    await fillStore.loadHistory(layoutStore.currentLayout.id)
  }
})

// Perform fill
async function performFill() {
  if (!layoutStore.currentLayout) return

  try {
    await fillStore.fillSeats(
      layoutStore.currentLayout.id,
      studentStore.students
    )
    showSnackbar('座位填充成功', 'success')
  } catch (error) {
    console.error('Fill failed:', error)
    showSnackbar('填充失败: ' + (error as Error).message, 'error')
  }
}

// Load history record
async function loadHistoryRecord(record: any) {
  await fillStore.loadRecord(record.id)
  showSnackbar('已加载历史记录', 'info')
}

// Get seat number
function getSeatNumber(row: number, col: number): string {
  if (!layoutStore.currentLayout) return ''

  const seat = layoutStore.currentLayout.seats.find(
    s => s.row === row && s.col === col
  )

  return seat?.displayNumber || ''
}

// Get student name for seat
function getStudentName(row: number, col: number): string {
  if (!layoutStore.currentLayout || !fillStore.currentRecord) return ''

  const seat = layoutStore.currentLayout.seats.find(
    s => s.row === row && s.col === col
  )

  if (!seat) return ''

  const assignment = fillStore.currentRecord.assignments.find(
    a => a.seatId === seat.id
  )

  if (!assignment) return ''

  const student = studentStore.getStudentById(assignment.studentId)
  return student?.name || ''
}

// Get seat classes
function getSeatClasses(row: number, col: number): any {
  const classes: string[] = []

  if (!layoutStore.currentLayout) return classes

  const seat = layoutStore.currentLayout.seats.find(
    s => s.row === row && s.col === col
  )

  if (seat?.type === 'special') {
    classes.push('seat-special')
  }

  const hasStudent = getStudentName(row, col) !== ''
  if (hasStudent) {
    classes.push('seat-filled')
  }

  return classes
}

// Get strategy label
function getStrategyLabel(strategy: FillStrategy): string {
  const item = fillStrategies.find(s => s.value === strategy)
  return item?.title || strategy
}

// Get constraint label
function getConstraintLabel(constraint: ConstraintType): string {
  const item = constraintTypes.find(c => c.value === constraint)
  return item?.title || constraint
}

// Go to animation page
function goToAnimation() {
  router.push('/animation')
}

// Export chart
async function exportChart() {
  try {
    await Exporter.exportToPDF('fill-preview', 'seating-chart.pdf')
    showSnackbar('导出成功', 'success')
  } catch (error) {
    console.error('Export failed:', error)
    showSnackbar('导出失败: ' + (error as Error).message, 'error')
  }
}
</script>

<style scoped>
.fill-preview {
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
  width: 80px;
  height: 80px;
  border: 2px solid #1976d2;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: white;
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

.seat-box.seat-filled {
  background-color: #c8e6c9;
  border-color: #4caf50;
}

.seat-number {
  font-size: 12px;
  font-weight: bold;
  color: #666;
}

.student-name {
  font-size: 14px;
  font-weight: bold;
  color: #333;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.cursor-pointer {
  cursor: pointer;
}
</style>

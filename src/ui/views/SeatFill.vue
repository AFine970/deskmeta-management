<template>
  <v-container fluid>
    <!-- Header -->
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 mb-2">换座位</h1>
        <p class="text-subtitle-1 text-grey">一键换座位，实时动画展示</p>
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
      <!-- Configuration Card -->
      <v-row>
        <v-col cols="12">
          <v-card>
            <v-card-title>
              <v-icon left>mdi-seat-recline-normal</v-icon>
              换座位配置
            </v-card-title>

            <v-card-text>
              <!-- Strategy & Constraint -->
              <v-row>
                <v-col cols="12" sm="6" md="4">
                  <v-select
                    v-model="fillStore.fillStrategy"
                    :items="fillStrategies"
                    label="填充策略"
                    prepend-icon="mdi-dice-multiple"
                    density="compact"
                  />
                </v-col>

                <v-col cols="12" sm="6" md="4">
                  <v-select
                    v-model="fillStore.constraintType"
                    :items="constraintTypes"
                    label="同桌约束"
                    prepend-icon="mdi-account-group"
                    density="compact"
                    :disabled="fillStore.fillStrategy === 'random'"
                  />
                </v-col>

                <v-col cols="12" sm="6" md="4">
                  <div class="text-caption mb-1">动画速度</div>
                  <v-btn-toggle
                    v-model="fillStore.speedMultiplier"
                    density="compact"
                    mandatory
                    divided
                  >
                    <v-btn :value="0.5">0.5x</v-btn>
                    <v-btn :value="1">1x</v-btn>
                    <v-btn :value="2">2x</v-btn>
                    <v-btn :value="4">4x</v-btn>
                  </v-btn-toggle>
                </v-col>
              </v-row>

              <!-- 同桌管理入口 -->
              <v-expand-transition>
                <div v-if="fillStore.constraintType !== 'random'" class="mt-2">
                  <v-btn
                    block
                    color="secondary"
                    @click="showDeskMateDialog = true"
                    class="mt-2"
                    variant="outlined"
                  >
                    <v-icon left>mdi-cog</v-icon>
                    管理同桌组（可选）
                  </v-btn>

                  <!-- 显示当前同桌组数量 -->
                  <div v-if="deskMateStore.totalGroups > 0" class="mt-2 text-caption">
                    已配置 {{ deskMateStore.totalGroups }} 个同桌组
                    <v-chip size="x-small" color="info" class="ml-1" variant="tonal">
                      {{ deskMateStore.totalStudentsInGroups }} 人
                    </v-chip>
                  </div>
                </div>
              </v-expand-transition>

              <!-- 智能提示 -->
              <v-alert
                type="info"
                border="start"
                class="mt-4"
                v-if="studentStore.totalStudents > 0"
              >
                学生数量：{{ studentStore.totalStudents }}人<br>
                预估时长：{{ estimatedDuration }}秒（{{ fillStore.speedMultiplier }}x速度）
              </v-alert>
            </v-card-text>

            <v-card-actions>
              <v-btn
                color="primary"
                size="large"
                block
                @click="startSeatingAnimation"
                :loading="fillStore.isFilling"
                :disabled="!canStartFilling"
              >
                <v-icon left>mdi-play-circle</v-icon>
                开始换座位
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>

      <!-- Animation Status (when filling) -->
      <v-row v-if="fillStore.isFilling">
        <v-col cols="12">
          <v-card>
            <v-card-text>
              <div class="text-center mb-2">
                正在换座位...（{{ fillStore.speedMultiplier }}x速度）
              </div>
              <v-progress-linear
                :model-value="fillStore.animationProgress"
                height="20"
                color="primary"
                striped
              >
                <template #default="{ value }">
                  <strong>{{ Math.round(value) }}%</strong>
                </template>
              </v-progress-linear>

              <!-- 实时预览 -->
              <div class="live-preview mt-4">
                <div class="text-caption mb-2">实时预览</div>
                <div class="seat-preview-grid">
                  <div
                    v-for="seat in layoutStore.currentLayout?.seats || []"
                    :key="seat.id"
                    class="seat-cell"
                    :class="getLiveSeatClass(seat.id)"
                  >
                    <div class="seat-number">{{ seat.displayNumber }}</div>
                    <div class="student-name">
                      {{ getLiveStudentName(seat.id) }}
                    </div>
                  </div>
                </div>
              </div>
            </v-card-text>

            <v-card-actions>
              <v-btn @click="togglePause" :disabled="!fillStore.isFilling" variant="outlined">
                <v-icon left>{{ isPaused ? 'mdi-play' : 'mdi-pause' }}</v-icon>
                {{ isPaused ? '继续' : '暂停' }}
              </v-btn>
              <v-btn @click="stopAnimation" color="error" variant="outlined">
                <v-icon left>mdi-stop</v-icon>
                停止
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>

      <!-- Layout Preview with Assignments -->
      <v-row v-if="!fillStore.isFilling">
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
      <v-row v-if="!fillStore.isFilling && fillStore.hasHistory">
        <v-col cols="12">
          <v-card>
            <v-card-title>
              <v-icon left>mdi-history</v-icon>
              填充历史
            </v-card-title>

            <v-card-text>
              <v-list density="compact">
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
                    <v-chip v-if="record.constraintType" size="small" class="ml-2" variant="tonal">
                      {{ getConstraintLabel(record.constraintType) }}
                    </v-chip>
                  </v-list-item-title>

                  <v-list-item-subtitle>
                    {{ formatDate(record.createdAt) }} · {{ record.assignments.length }} 人
                  </v-list-item-subtitle>

                  <template #append>
                    <v-btn icon size="small" @click.stop="exportRecord(record)" variant="text">
                      <v-icon>mdi-download</v-icon>
                    </v-btn>
                  </template>
                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </template>

    <!-- 同桌管理对话框 -->
    <DeskMateEditor
      v-model="showDeskMateDialog"
      :layout-id="layoutStore.currentLayout?.id"
      @save="onDeskMateGroupsSaved"
    />

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
import { useDeskMateStore } from '../../stores/desk-mate'
import { storeToRefs } from 'pinia'
import { formatDate } from '../../utils/helpers'
import { Exporter } from '../../utils/exporters'
import type { FillStrategy, ConstraintType } from '../../types'
import DeskMateEditor from '../../ui/components/DeskMateEditor.vue'

const router = useRouter()
const layoutStore = useLayoutStore()
const studentStore = useStudentStore()
const fillStore = useFillStore()
const deskMateStore = useDeskMateStore()

const { currentLayout } = storeToRefs(layoutStore)

// Snackbar state
const snackbar = ref({
  show: false,
  message: '',
  color: 'info' as 'info' | 'error' | 'success' | 'warning',
  timeout: 3000
})

// UI state
const showDeskMateDialog = ref(false)
const isPaused = ref(false)

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

// 预估时长（8秒一人，考虑速度倍数）
const estimatedDuration = computed(() => {
  const count = studentStore.totalStudents
  return Math.round((count * 8) / fillStore.speedMultiplier)
})

// 是否可以开始
const canStartFilling = computed(() => {
  return layoutStore.currentLayout &&
         studentStore.students.length > 0 &&
         !fillStore.isFilling
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
    // 加载同桌组
    await deskMateStore.loadGroups(layoutStore.currentLayout.id)
  }
})

// 实时预览 - 获取座位CSS类
function getLiveSeatClass(seatId: string): string {
  if (!fillStore.liveAssignments.has(seatId)) return 'empty'
  const studentId = fillStore.liveAssignments.get(seatId)
  const student = studentStore.getStudentById(studentId!)
  return student?.gender === 'male' ? 'male' : 'female'
}

// 实时预览 - 获取学生姓名
function getLiveStudentName(seatId: string): string {
  const studentId = fillStore.liveAssignments.get(seatId)
  const student = studentStore.getStudentById(studentId!)
  return student?.name || ''
}

// 开始换座位动画
async function startSeatingAnimation() {
  if (!canStartFilling.value || !layoutStore.currentLayout) return

  try {
    const success = await fillStore.fillWithAnimation(
      layoutStore.currentLayout.id,
      studentStore.students,
      fillStore.fillStrategy,
      fillStore.constraintType,
      deskMateStore.groups
    )

    if (success) {
      showSnackbar('换座位完成！', 'success')
      isPaused.value = false
    }
  } catch (error) {
    console.error('Animation failed:', error)
    showSnackbar('换座位失败: ' + (error as Error).message, 'error')
  }
}

// 暂停/继续
function togglePause() {
  if (isPaused.value) {
    fillStore.resumeAnimation()
    isPaused.value = false
  } else {
    fillStore.pauseAnimation()
    isPaused.value = true
  }
}

// 停止动画
function stopAnimation() {
  fillStore.stopAnimation()
  isPaused.value = false
  showSnackbar('已停止', 'warning')
}

// 同桌管理保存回调
function onDeskMateGroupsSaved(groups: any[]) {
  // 同桌组已保存，可以显示提示
  if (groups.length > 0) {
    showSnackbar(`已保存 ${groups.length} 个同桌组`, 'success')
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

// Export specific record
async function exportRecord(record: any) {
  try {
    // 临时设置当前记录以导出
    const originalRecord = fillStore.currentRecord
    fillStore.currentRecord = record
    await Exporter.exportToPDF('fill-preview', `seating-${formatDate(record.createdAt)}.pdf`)
    fillStore.currentRecord = originalRecord
    showSnackbar('导出成功', 'success')
  } catch (error) {
    console.error('Export failed:', error)
    showSnackbar('导出失败: ' + (error as Error).message, 'error')
  }
}
</script>

<style scoped>
/* 配置区域 */
.v-card-title {
  border-bottom: 1px solid rgba(0,0,0,0.1);
  padding-bottom: 12px;
}

/* 实时预览区域 */
.live-preview {
  background: #f5f5f5;
  padding: 12px;
  border-radius: 8px;
}

.seat-preview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(50px, 1fr));
  gap: 6px;
}

.seat-cell {
  height: 50px;
  border: 2px solid #ccc;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: white;
  font-size: 11px;
}

.seat-cell.empty {
  background: #e0e0e0;
}

.seat-cell.male {
  background: #bbdefb;
  border-color: #1976d2;
}

.seat-cell.female {
  background: #f8bbd0;
  border-color: #c2185b;
}

/* 填充预览区域 */
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

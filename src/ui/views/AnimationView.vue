<template>
  <v-container fluid class="fill-height">
    <!-- Header -->
    <v-row>
      <v-col cols="12" class="d-flex justify-space-between align-center">
        <div>
          <h1 class="text-h4 mb-2">动画演示</h1>
          <p class="text-subtitle-1 text-grey">类似抽奖的座位展示效果</p>
        </div>
        <v-btn
          v-if="animationState.isPlaying"
          color="error"
          prepend-icon="mdi-stop"
          @click="stopAnimation"
        >
          停止
        </v-btn>
      </v-col>
    </v-row>

    <!-- Check if has fill record -->
    <v-alert
      v-if="!fillStore.currentRecord"
      type="info"
      variant="tonal"
      class="mb-4"
    >
      <template #title>
        还没有填充记录
      </template>
      请先进行座位填充操作。
      <template #close>
        <v-btn color="primary" to="/fill">去填充</v-btn>
      </template>
    </v-alert>

    <!-- Animation Area -->
    <template v-if="fillStore.currentRecord">
      <!-- Controls -->
      <v-row class="mb-4">
        <v-col cols="12">
          <v-card>
            <v-card-text>
              <v-row align="center">
                <v-col cols="12" sm="3">
                  <v-slider
                    v-model="fillStore.animationConfig.speed"
                    label="动画速度"
                    min="200"
                    max="3000"
                    step="100"
                    prepend-icon="mdi-speedometer"
                    :thumb-size="20"
                  >
                    <template #thumb-label="{ modelValue }">
                      {{ modelValue }}ms
                    </template>
                  </v-slider>
                </v-col>

                <v-col cols="12" sm="3">
                  <v-slider
                    v-model="fillStore.animationConfig.shuffleCount"
                    label="滚动次数"
                    min="1"
                    max="20"
                    step="1"
                    prepend-icon="mdi-refresh"
                    :thumb-size="20"
                  />
                </v-col>

                <v-col cols="12" sm="6" class="text-right">
                  <v-btn
                    v-if="!animationState.isPlaying"
                    size="x-large"
                    color="primary"
                    prepend-icon="mdi-play"
                    @click="startAnimation"
                  >
                    开始演示
                  </v-btn>

                  <template v-else>
                    <v-btn
                      v-if="!animationState.isPaused"
                      size="large"
                      color="warning"
                      prepend-icon="mdi-pause"
                      @click="pauseAnimation"
                      class="mr-2"
                    >
                      暂停
                    </v-btn>
                    <v-btn
                      v-else
                      size="large"
                      color="success"
                      prepend-icon="mdi-play"
                      @click="resumeAnimation"
                      class="mr-2"
                    >
                      继续
                    </v-btn>
                    <v-btn
                      size="large"
                      color="info"
                      prepend-icon="mdi-restart"
                      @click="restartAnimation"
                    >
                      重新开始
                    </v-btn>
                  </template>
                </v-col>
              </v-row>

              <!-- Progress Bar -->
              <v-progress-linear
                v-if="animationState.isPlaying"
                :model-value="animationState.progress"
                color="primary"
                height="8"
                class="mt-4"
              />
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Animation Canvas -->
      <v-row>
        <v-col cols="12">
          <v-card>
            <v-card-item>
              <v-card-title class="text-center">
                {{ layoutStore.currentLayout?.name }}
              </v-card-title>
            </v-card-item>

            <v-card-text>
              <div id="animation-canvas" class="animation-canvas">
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
                      class="seat-box animated-seat"
                      :class="getSeatAnimationClasses(row - 1, col - 1)"
                    >
                      <div class="seat-number">
                        {{ getSeatNumber(row - 1, col - 1) }}
                      </div>
                      <div class="student-name">
                        {{ getCurrentStudentName(row - 1, col - 1) }}
                      </div>
                    </div>
                  </v-col>
                </v-row>
              </div>
            </v-card-text>

            <v-card-actions class="justify-center">
              <v-btn
                color="info"
                prepend-icon="mdi-export"
                @click="exportChart"
                :disabled="animationState.isPlaying"
              >
                导出为PDF
              </v-btn>
              <v-btn
                color="success"
                prepend-icon="mdi-printer"
                @click="printChart"
                :disabled="animationState.isPlaying"
              >
                打印
              </v-btn>
            </v-card-actions>
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useLayoutStore } from '../../stores/layout'
import { useStudentStore } from '../../stores/student'
import { useFillStore } from '../../stores/fill'
import { animationEngine } from '../../core/animation-engine'
import { storeToRefs } from 'pinia'
import type { AnimationFrame } from '../../types'
import { Exporter } from '../../utils/exporters'

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

// Animation state
const animationState = ref({
  isPlaying: false,
  isPaused: false,
  currentIndex: 0,
  totalFrames: 0,
  progress: 0
})

// Current displayed names for each seat
const seatNames = ref<Map<string, string>>(new Map())

// Animation frames
const frames = ref<AnimationFrame[]>([])

// Helper function to show snackbar
function showSnackbar(message: string, color: 'info' | 'error' | 'success' | 'warning' = 'info') {
  snackbar.value = {
    show: true,
    message,
    color,
    timeout: 3000
  }
}

// Cleanup on unmount
onUnmounted(() => {
  animationEngine.stop()
})

// Load data on mount
onMounted(async () => {
  await layoutStore.loadLayouts()
  await studentStore.loadStudents()

  if (layoutStore.currentLayout && fillStore.currentRecord) {
    await fillStore.loadHistory(layoutStore.currentLayout.id)
    prepareAnimation()
  }
})

// Prepare animation frames
function prepareAnimation() {
  if (!fillStore.currentRecord) return

  // Create student map
  const studentMap = new Map(
    studentStore.students.map(s => [s.id, s])
  )

  // Generate animation frames
  frames.value = animationEngine.generateSequence(
    fillStore.currentRecord,
    studentMap,
    fillStore.animationConfig
  )

  animationState.value.totalFrames = frames.value.length

  // Initialize seat names
  for (const seat of layoutStore.currentLayout?.seats || []) {
    seatNames.value.set(seat.id, '')
  }
}

// Start animation
async function startAnimation() {
  if (!fillStore.currentRecord) return

  animationState.value.isPlaying = true
  animationState.value.isPaused = false

  try {
    await animationEngine.play(
      frames.value,
      fillStore.animationConfig,
      handleAnimationEvent
    )
    showSnackbar('动画演示完成', 'success')
  } catch (error) {
    console.error('Animation failed:', error)
    showSnackbar('动画演示失败: ' + (error as Error).message, 'error')
    animationState.value.isPlaying = false
  }
}

// Pause animation
function pauseAnimation() {
  animationEngine.pause()
  animationState.value.isPaused = true
}

// Resume animation
function resumeAnimation() {
  animationEngine.resume(fillStore.animationConfig)
  animationState.value.isPaused = false
}

// Stop animation
function stopAnimation() {
  animationEngine.stop()
  animationState.value.isPlaying = false
  animationState.value.isPaused = false

  // Clear seat names
  for (const seat of layoutStore.currentLayout?.seats || []) {
    seatNames.value.set(seat.id, '')
  }
  showSnackbar('动画已停止', 'info')
}

// Restart animation
function restartAnimation() {
  stopAnimation()
  setTimeout(() => {
    startAnimation()
  }, 100)
}

// Handle animation events
function handleAnimationEvent(event: any) {
  if (event.type === 'start') {
    animationState.value.isPlaying = true
  } else if (event.type === 'progress') {
    const frame = event.frame as AnimationFrame
    seatNames.value.set(frame.seatId, frame.studentName)

    // Update progress
    const state = animationEngine.getState()
    animationState.value.progress = state.progress
    animationState.value.currentIndex = state.currentIndex
  } else if (event.type === 'complete') {
    animationState.value.isPlaying = false
    animationState.value.progress = 100
  }
}

// Get seat number
function getSeatNumber(row: number, col: number): string {
  if (!layoutStore.currentLayout) return ''

  const seat = layoutStore.currentLayout.seats.find(
    s => s.row === row && s.col === col
  )

  return seat?.displayNumber || ''
}

// Get current student name (for animation)
function getCurrentStudentName(row: number, col: number): string {
  if (!layoutStore.currentLayout) return ''

  const seat = layoutStore.currentLayout.seats.find(
    s => s.row === row && s.col === col
  )

  if (!seat) return ''

  return seatNames.value.get(seat.id) || ''
}

// Get seat animation classes
function getSeatAnimationClasses(row: number, col: number): any {
  const classes: string[] = []

  const studentName = getCurrentStudentName(row, col)

  if (studentName && animationState.value.isPlaying) {
    classes.push('seat-active')
  }

  return classes
}

// Export chart
async function exportChart() {
  try {
    await Exporter.exportToPDF('animation-canvas', 'seating-chart.pdf')
    showSnackbar('导出成功', 'success')
  } catch (error) {
    console.error('Export failed:', error)
    showSnackbar('导出失败: ' + (error as Error).message, 'error')
  }
}

// Print chart
async function printChart() {
  try {
    await Exporter.print('animation-canvas')
    showSnackbar('打印任务已发送', 'success')
  } catch (error) {
    console.error('Print failed:', error)
    showSnackbar('打印失败: ' + (error as Error).message, 'error')
  }
}
</script>

<style scoped>
.animation-canvas {
  background-color: #f5f5f5;
  padding: 40px;
  border-radius: 8px;
  overflow-x: auto;
  min-height: 600px;
}

.seat-row {
  margin-bottom: 8px;
}

.seat-col {
  padding: 4px;
}

.seat-box {
  width: 100px;
  height: 100px;
  border: 3px solid #1976d2;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: white;
  transition: all 0.3s;
}

.animated-seat.seat-active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-color: #667eea;
  animation: pulse 0.5s ease-in-out;
  transform: scale(1.1);
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1.1);
  }
  50% {
    transform: scale(1.15);
  }
}

.seat-number {
  font-size: 12px;
  font-weight: bold;
  color: #666;
  margin-bottom: 4px;
}

.animated-seat.seat-active .seat-number {
  color: rgba(255, 255, 255, 0.9);
}

.student-name {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
  padding: 0 8px;
}

.animated-seat.seat-active .student-name {
  color: white;
  font-size: 18px;
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>

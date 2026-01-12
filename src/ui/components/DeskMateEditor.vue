<template>
  <v-dialog v-model="dialog" max-width="800px" persistent>
    <v-card>
      <v-card-title class="d-flex align-center">
        <span>同桌管理</span>
        <v-spacer />
        <v-btn icon variant="text" @click="closeDialog">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-card-text>
        <!-- 选择学生创建同桌组 -->
        <v-row class="mb-4">
          <v-col cols="12">
            <div class="text-subtitle-2 mb-2">创建同桌组</div>
            <v-card variant="outlined" class="pa-3">
              <div class="text-caption mb-2">
                已选择 {{ selectedStudents.length }} 名学生
                <span v-if="selectedStudents.length > 0" class="text-grey">
                  ({{ selectedStudents.length < 2 ? '至少需要2人' : selectedStudents.length > 4 ? '最多4人' : '可创建' }})
                </span>
              </div>

              <!-- 学生选择列表 -->
              <v-list density="compact" max-height="200" class="overflow-y-auto mb-2">
                <v-list-item
                  v-for="student in availableStudents"
                  :key="student.id"
                  @click="toggleStudent(student.id)"
                  :active="selectedStudents.includes(student.id)"
                  active-color="primary"
                >
                  <template #prepend="{ isActive }">
                    <v-checkbox-btn
                      :model-value="selectedStudents.includes(student.id)"
                      :color="isActive ? 'primary' : undefined"
                    />
                  </template>
                  <v-list-item-title>
                    {{ student.name }}
                    <v-chip
                      size="x-small"
                      :color="student.gender === 'male' ? 'blue' : 'pink'"
                      class="ml-2"
                      variant="tonal"
                    >
                      {{ student.gender === 'male' ? '男' : '女' }}
                    </v-chip>
                    <v-chip
                      v-if="student.deskMateGroupId"
                      size="x-small"
                      color="grey"
                      class="ml-1"
                      variant="outlined"
                    >
                      已分组
                    </v-chip>
                  </v-list-item-title>
                </v-list-item>
              </v-list>

              <!-- 同桌组名称输入 -->
              <v-text-field
                v-model="newGroupName"
                label="同桌组名称（可选）"
                placeholder="如：第一组"
                density="compact"
                variant="outlined"
                class="mb-2"
                prepend-inner-icon="mdi-rename-box"
              />

              <!-- 操作按钮 -->
              <div class="d-flex gap-2">
                <v-btn
                  color="primary"
                  :disabled="!canCreateGroup"
                  @click="createGroup"
                  prepend-icon="mdi-account-group-plus"
                >
                  创建同桌组
                </v-btn>
                <v-btn
                  color="secondary"
                  :disabled="availableStudents.length < 2"
                  @click="autoRecommend"
                  prepend-icon="mdi-auto-fix"
                >
                  智能推荐
                </v-btn>
                <v-btn
                  variant="outlined"
                  @click="clearSelection"
                  :disabled="selectedStudents.length === 0"
                >
                  清空选择
                </v-btn>
              </div>

              <!-- 智能推荐配置 -->
              <v-expand-transition>
                <div v-if="showRecommendConfig" class="mt-3 pt-3 border-t">
                  <div class="text-caption mb-2">推荐配置</div>
                  <v-row>
                    <v-col cols="6">
                      <v-select
                        v-model="recommendConstraint"
                        :items="[
                          { title: '男女同桌', value: 'mixed_gender' },
                          { title: '同性同桌', value: 'same_gender' },
                          { title: '随机', value: 'random' }
                        ]"
                        label="约束类型"
                        density="compact"
                        variant="outlined"
                        hide-details
                      />
                    </v-col>
                    <v-col cols="6">
                      <v-text-field
                        v-model.number="recommendCount"
                        label="推荐组数"
                        type="number"
                        min="1"
                        max="10"
                        density="compact"
                        variant="outlined"
                        hide-details
                      />
                    </v-col>
                  </v-row>
                </div>
              </v-expand-transition>
            </v-card>
          </v-col>
        </v-row>

        <!-- 同桌组列表 -->
        <v-row>
          <v-col cols="12">
            <div class="text-subtitle-2 mb-2">
              同桌组列表
              <v-chip size="x-small" color="primary" class="ml-2">
                {{ deskMateStore.totalGroups }} 个
              </v-chip>
            </div>

            <v-card variant="outlined">
              <v-list density="compact" v-if="deskMateStore.groups.length > 0">
                <v-list-item
                  v-for="group in deskMateStore.groups"
                  :key="group.id"
                  class="group-item"
                >
                  <v-list-item-title>
                    <span class="font-weight-bold">{{ group.name }}</span>
                    <v-chip size="x-small" class="ml-2" color="info" variant="tonal">
                      {{ group.studentIds.length }}人
                    </v-chip>
                  </v-list-item-title>

                  <v-list-item-subtitle>
                    <div class="mt-1">
                      <v-chip
                        v-for="studentId in group.studentIds"
                        :key="studentId"
                        size="x-small"
                        class="mr-1 mb-1"
                        color="grey-lighten-2"
                        variant="flat"
                      >
                        {{ getStudentName(studentId) }}
                        <template #append>
                          <v-icon size="x-small" class="ml-1">mdi-account</v-icon>
                        </template>
                      </v-chip>
                    </div>
                  </v-list-item-subtitle>

                  <template #append>
                    <v-btn
                      icon
                      size="small"
                      color="error"
                      variant="text"
                      @click="deleteGroup(group.id)"
                    >
                      <v-icon>mdi-delete</v-icon>
                    </v-btn>
                  </template>
                </v-list-item>
              </v-list>

              <v-card-text v-else class="text-center text-grey">
                <v-icon size="large" class="mb-2">mdi-account-group-outline</v-icon>
                <div>暂无同桌组，请选择学生创建</div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- 验证结果 -->
        <v-row v-if="validationResult" class="mt-2">
          <v-col cols="12">
            <v-alert
              :type="validationResult.valid ? 'success' : 'warning'"
              variant="tonal"
              density="compact"
            >
              <div class="font-weight-bold">
                {{ validationResult.valid ? '✓ 同桌约束验证通过' : '⚠ 存在约束问题' }}
              </div>
              <div v-if="!validationResult.valid" class="mt-1">
                <div v-for="(violation, i) in validationResult.violations" :key="i" class="text-caption">
                  • {{ violation }}
                </div>
              </div>
              <div v-if="validationResult.warnings && validationResult.warnings.length > 0" class="mt-1">
                <div v-for="(warning, i) in validationResult.warnings" :key="i" class="text-caption text-grey-darken-1">
                  • {{ warning }}
                </div>
              </div>
            </v-alert>
          </v-col>
        </v-row>

        <!-- 智能推荐结果预览 -->
        <v-row v-if="recommendationResult" class="mt-2">
          <v-col cols="12">
            <v-card variant="outlined" class="pa-2">
              <div class="text-subtitle-2 mb-2">
                推荐结果预览
                <v-chip size="x-small" color="success" class="ml-2" variant="tonal">
                  评分: {{ recommendationResult.score }}
                </v-chip>
                <v-chip size="x-small" color="info" class="ml-1" variant="tonal">
                  覆盖率: {{ (recommendationResult.coverage * 100).toFixed(0) }}%
                </v-chip>
              </div>
              <div class="d-flex flex-wrap gap-1">
                <v-chip
                  v-for="(group, i) in recommendationResult.groups"
                  :key="i"
                  size="small"
                  color="primary"
                  variant="outlined"
                  class="mb-1"
                >
                  {{ group.name }}: {{ group.studentIds.map(id => getStudentName(id)).join('、') }}
                </v-chip>
              </div>
              <v-card-actions class="pa-0 mt-2">
                <v-btn
                  size="small"
                  color="success"
                  prepend-icon="mdi-check"
                  @click="applyRecommendation"
                >
                  应用推荐
                </v-btn>
                <v-btn size="small" variant="text" @click="recommendationResult = null">
                  关闭
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions>
        <v-btn color="grey" variant="text" @click="closeDialog">
          关闭
        </v-btn>
        <v-spacer />
        <v-btn color="primary" @click="saveAndClose" prepend-icon="mdi-content-save">
          保存并关闭
        </v-btn>
      </v-card-actions>
    </v-card>

    <!-- Snackbar -->
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
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useDeskMateStore } from '../../stores/desk-mate'
import { useStudentStore } from '../../stores/student'
import type { DeskMateGroup, DeskMateConstraintType, DeskMateValidationResult, DeskMateRecommendation } from '../../types'

const props = defineProps<{
  modelValue: boolean
  layoutId?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  save: [groups: DeskMateGroup[]]
}>()

const deskMateStore = useDeskMateStore()
const studentStore = useStudentStore()

// Dialog state
const dialog = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})

// UI state
const selectedStudents = ref<string[]>([])
const newGroupName = ref('')
const showRecommendConfig = ref(false)
const recommendConstraint = ref<DeskMateConstraintType>('mixed_gender')
const recommendCount = ref(3)
const recommendationResult = ref<DeskMateRecommendation | null>(null)
const validationResult = ref<DeskMateValidationResult | null>(null)

// Snackbar
const snackbar = ref({
  show: false,
  message: '',
  color: 'info' as 'info' | 'error' | 'success' | 'warning',
  timeout: 3000
})

// Computed
const availableStudents = computed(() => {
  return studentStore.students.filter(s => !deskMateStore.isStudentInGroup(s.id))
})

const canCreateGroup = computed(() => {
  return selectedStudents.value.length >= 2 &&
         selectedStudents.value.length <= 4 &&
         selectedStudents.value.every(id => !deskMateStore.isStudentInGroup(id))
})

// Watch
watch(() => props.modelValue, async (newValue) => {
  if (newValue) {
    await initialize()
  }
})

watch(selectedStudents, (newVal) => {
  if (newVal.length >= 2) {
    showRecommendConfig.value = true
  }
}, { deep: true })

// Methods
async function initialize() {
  try {
    await deskMateStore.initialize()
    if (props.layoutId) {
      await deskMateStore.loadGroups(props.layoutId)
    } else {
      await deskMateStore.loadAllGroups()
    }
    await studentStore.loadStudents()
    clearForm()
  } catch (error) {
    showSnackbar('加载数据失败: ' + (error as Error).message, 'error')
  }
}

function toggleStudent(studentId: string) {
  deskMateStore.toggleStudentSelection(studentId)
  // 同步本地状态
  selectedStudents.value = [...deskMateStore.selectedStudents]
}

function clearSelection() {
  deskMateStore.clearSelection()
  selectedStudents.value = []
}

async function createGroup() {
  if (!canCreateGroup.value) {
    showSnackbar('请选择2-4名未分组的学生', 'warning')
    return
  }

  try {
    const group = await deskMateStore.createGroup(
      selectedStudents.value,
      newGroupName.value || undefined
    )
    showSnackbar(`同桌组"${group.name}"创建成功`, 'success')
    clearForm()
    // 更新学生数据以显示deskMateGroupId
    await studentStore.loadStudents()
  } catch (error) {
    showSnackbar('创建失败: ' + (error as Error).message, 'error')
  }
}

function autoRecommend() {
  if (availableStudents.value.length < 2) {
    showSnackbar('没有足够的学生进行推荐', 'warning')
    return
  }

  showRecommendConfig.value = true
  const result = deskMateStore.recommendGroups(
    availableStudents.value,
    recommendCount.value,
    recommendConstraint.value
  )

  recommendationResult.value = result
  showSnackbar(`推荐完成，评分: ${result.score}`, 'info')
}

async function applyRecommendation() {
  if (!recommendationResult.value) return

  try {
    for (const group of recommendationResult.value.groups) {
      await deskMateStore.createGroup(group.studentIds, group.name)
    }
    showSnackbar(`已应用${recommendationResult.value.groups.length}个推荐组`, 'success')
    recommendationResult.value = null
    clearForm()
    await studentStore.loadStudents()
  } catch (error) {
    showSnackbar('应用推荐失败: ' + (error as Error).message, 'error')
  }
}

async function deleteGroup(groupId: string) {
  if (!confirm('确定要删除这个同桌组吗？')) return

  try {
    const success = await deskMateStore.deleteGroup(groupId)
    if (success) {
      showSnackbar('同桌组已删除', 'success')
      await studentStore.loadStudents()
    }
  } catch (error) {
    showSnackbar('删除失败: ' + (error as Error).message, 'error')
  }
}

function validate() {
  // 这里可以调用store的验证方法
  // 需要传入当前的座位分配和座位列表
  // 暂时返回空
  validationResult.value = null
}

function getStudentName(studentId: string): string {
  const student = studentStore.getStudentById(studentId)
  return student?.name || '未知学生'
}

function clearForm() {
  selectedStudents.value = []
  deskMateStore.clearSelection()
  newGroupName.value = ''
  recommendationResult.value = null
  validationResult.value = null
  showRecommendConfig.value = false
}

function closeDialog() {
  clearForm()
  dialog.value = false
}

function saveAndClose() {
  emit('save', deskMateStore.groups)
  closeDialog()
}

function showSnackbar(message: string, color: 'info' | 'error' | 'success' | 'warning' = 'info') {
  snackbar.value = {
    show: true,
    message,
    color,
    timeout: 3000
  }
}

// Initialize on mount
onMounted(async () => {
  if (props.modelValue) {
    await initialize()
  }
})
</script>

<style scoped>
.gap-2 {
  gap: 8px;
}

.border-t {
  border-top: 1px solid rgba(0, 0, 0, 0.12);
}

.group-item {
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.group-item:last-child {
  border-bottom: none;
}
</style>

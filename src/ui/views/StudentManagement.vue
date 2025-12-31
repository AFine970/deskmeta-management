<template>
  <v-container fluid>
    <!-- Header -->
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 mb-2">学生管理</h1>
        <p class="text-subtitle-1 text-grey">添加和管理学生信息</p>
      </v-col>
    </v-row>

    <!-- Stats Cards -->
    <v-row class="mb-4">
      <v-col cols="12" sm="4">
        <v-card color="primary" variant="tonal">
          <v-card-item>
            <div class="text-h5">总人数</div>
            <div class="text-h2">{{ studentStore.totalStudents }}</div>
          </v-card-item>
        </v-card>
      </v-col>
      <v-col cols="12" sm="4">
        <v-card color="blue" variant="tonal">
          <v-card-item>
            <div class="text-h5">男生</div>
            <div class="text-h2">{{ studentStore.maleCount }}</div>
          </v-card-item>
        </v-card>
      </v-col>
      <v-col cols="12" sm="4">
        <v-card color="pink" variant="tonal">
          <v-card-item>
            <div class="text-h5">女生</div>
            <div class="text-h2">{{ studentStore.femaleCount }}</div>
          </v-card-item>
        </v-card>
      </v-col>
    </v-row>

    <!-- Actions -->
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-item>
            <v-row align="center">
              <v-col cols="12" sm="4">
                <v-text-field
                  v-model="searchKeyword"
                  label="搜索学生"
                  prepend-icon="mdi-magnify"
                  clearable
                  @update:model-value="handleSearch"
                />
              </v-col>
              <v-col cols="12" sm="8" class="text-right">
                <v-btn
                  color="primary"
                  prepend-icon="mdi-plus"
                  @click="showAddDialog = true"
                  class="mr-2"
                >
                  添加学生
                </v-btn>
                <v-btn
                  color="success"
                  prepend-icon="mdi-file-import"
                  @click="showImportDialog = true"
                  class="mr-2"
                >
                  批量导入
                </v-btn>
                <v-btn
                  color="info"
                  prepend-icon="mdi-file-export"
                  @click="exportStudents"
                  :disabled="studentStore.totalStudents === 0"
                >
                  导出
                </v-btn>
              </v-col>
            </v-row>
          </v-card-item>

          <!-- Student Table -->
          <v-card-text>
            <v-data-table
              :headers="headers"
              :items="studentStore.filteredStudents"
              :items-per-page="10"
              :loading="studentStore.loading"
            >
              <template #item.index="{ index }">
                {{ index + 1 }}
              </template>

              <template #item.gender="{ item }">
                <v-chip
                  :color="item.gender === 'male' ? 'blue' : 'pink'"
                  size="small"
                >
                  {{ item.gender === 'male' ? '男' : '女' }}
                </v-chip>
              </template>

              <template #item.specialNeeds="{ item }">
                <v-chip
                  v-if="item.specialNeeds"
                  color="orange"
                  size="small"
                >
                  特殊需求
                </v-chip>
                <span v-else>-</span>
              </template>

              <template #item.actions="{ item }">
                <v-btn
                  size="small"
                  color="primary"
                  icon="mdi-pencil"
                  @click="editStudent(item)"
                  class="mr-1"
                />
                <v-btn
                  size="small"
                  color="error"
                  icon="mdi-delete"
                  @click="confirmDelete(item)"
                />
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Add/Edit Dialog -->
    <v-dialog v-model="showAddDialog" max-width="600px">
      <v-card>
        <v-card-title>{{ editingStudent ? '编辑学生' : '添加学生' }}</v-card-title>

        <v-card-text>
          <v-form ref="studentFormRef">
            <v-text-field
              v-model="studentForm.name"
              label="姓名"
              prepend-icon="mdi-account"
              :rules="[rules.required, rules.name, rules.uniqueName]"
            />

            <v-radio-group
              v-model="studentForm.gender"
              label="性别"
              inline
            >
              <v-radio label="男" value="male" />
              <v-radio label="女" value="female" />
            </v-radio-group>

            <v-text-field
              v-model="studentForm.contact"
              label="联系方式"
              prepend-icon="mdi-phone"
            />

            <v-text-field
              v-model="studentForm.grade"
              label="年级"
              prepend-icon="mdi-school"
            />

            <v-text-field
              v-model="studentForm.className"
              label="班级"
              prepend-icon="mdi-google-classroom"
            />

            <v-checkbox
              v-model="studentForm.specialNeeds"
              label="特殊需求"
            />

            <v-textarea
              v-model="studentForm.notes"
              label="备注"
              prepend-icon="mdi-text"
              rows="3"
            />
          </v-form>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn @click="closeAddDialog" :disabled="saving">取消</v-btn>
          <v-btn color="primary" @click="saveStudent" :loading="saving" :disabled="saving">保存</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Import Dialog -->
    <v-dialog v-model="showImportDialog" max-width="600px">
      <v-card>
        <v-card-title>批量导入学生</v-card-title>

        <v-card-text>
          <v-alert type="info" variant="tonal" class="mb-4">
            请上传CSV文件,文件应包含以下列:姓名、性别、联系方式(可选)、年级(可选)、班级(可选)
          </v-alert>

          <div class="mb-4">
            <v-btn
              color="secondary"
              prepend-icon="mdi-download"
              @click="downloadTemplate"
              variant="outlined"
              block
            >
              下载导入模板
            </v-btn>
          </div>

          <v-file-input
            v-model="importFile"
            label="选择CSV文件"
            accept=".csv"
            prepend-icon="mdi-file-upload"
            show-size
          />

          <v-btn
            v-if="importFile"
            color="primary"
            @click="importStudents"
            :loading="importing"
            block
          >
            开始导入
          </v-btn>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn @click="showImportDialog = false">关闭</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation -->
    <v-dialog v-model="showDeleteDialog" max-width="400px">
      <v-card>
        <v-card-title>确认删除</v-card-title>
        <v-card-text>
          确定要删除学生 "{{ studentToDelete?.name }}" 吗?
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="showDeleteDialog = false">取消</v-btn>
          <v-btn color="error" @click="deleteStudent">删除</v-btn>
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

    <!-- Import Result Dialog -->
    <v-dialog v-model="showImportResultDialog" max-width="500px">
      <v-card>
        <v-card-title>导入结果</v-card-title>
        <v-card-text>
          <v-alert type="success" variant="tonal" class="mb-2">
            导入完成!
          </v-alert>
          <div class="text-body-1">
            <div>✅ 成功: {{ importResult.success }} 人</div>
            <div v-if="importResult.failed > 0" class="text-error">❌ 失败: {{ importResult.failed }} 人</div>
          </div>
          <div v-if="importResult.errors.length > 0" class="mt-4">
            <div class="text-subtitle-2 mb-1">错误详情:</div>
            <v-list density="compact" max-height="200" class="overflow-y-auto">
              <v-list-item v-for="(error, index) in importResult.errors" :key="index">
                <v-list-item-title class="text-error">{{ error }}</v-list-item-title>
              </v-list-item>
            </v-list>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="primary" @click="showImportResultDialog = false">确定</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Template Download Snackbar -->
    <v-snackbar
      v-model="templateSnackbar.show"
      color="success"
      timeout="3000"
      location="top"
    >
      {{ templateSnackbar.message }}
      <template #actions>
        <v-btn variant="text" @click="templateSnackbar.show = false">
          关闭
        </v-btn>
      </template>
    </v-snackbar>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useStudentStore } from '../../stores/student'
import { storeToRefs } from 'pinia'
import type { Student, CreateStudentDto } from '../../types'
import { parseCSV, downloadFile } from '../../utils/helpers'
import { TemplateGenerator } from '../../utils/template'

const studentStore = useStudentStore()
const { students, loading } = storeToRefs(studentStore)

// Dialog states
const showAddDialog = ref(false)
const showImportDialog = ref(false)
const showDeleteDialog = ref(false)
const showImportResultDialog = ref(false)

// Form data
const studentForm = ref<CreateStudentDto>({
  name: '',
  gender: 'male',
  contact: '',
  grade: '',
  className: '',
  specialNeeds: false,
  notes: ''
})

const editingStudent = ref<Student | null>(null)
const studentToDelete = ref<Student | null>(null)
const importFile = ref<File | null>(null)
const importing = ref(false)
const searchKeyword = ref('')
const saving = ref(false) // 防重复提交标记

// Snackbar state
const snackbar = ref({
  show: false,
  message: '',
  color: 'info' as 'info' | 'error' | 'success' | 'warning',
  timeout: 3000
})

// Template download snackbar
const templateSnackbar = ref({
  show: false,
  message: ''
})

// Import result
const importResult = ref({
  success: 0,
  failed: 0,
  errors: [] as string[]
})

// Table headers
const headers = [
  { title: '序号', key: 'index', sortable: false },
  { title: '姓名', key: 'name', sortable: true },
  { title: '性别', key: 'gender', sortable: true },
  { title: '联系方式', key: 'contact', sortable: false },
  { title: '年级', key: 'grade', sortable: true },
  { title: '班级', key: 'className', sortable: true },
  { title: '特殊需求', key: 'specialNeeds', sortable: true },
  { title: '操作', key: 'actions', sortable: false, align: 'end' as const }
]

// Validation rules
const rules = {
  required: (v: string) => !!v || '此项为必填',
  name: (v: string) => v.length <= 50 || '姓名不能超过50个字符',
  uniqueName: (v: string) => {
    if (!v) return true
    const existing = studentStore.students.find(s => s.name === v)
    // 如果是编辑模式，排除当前学生
    if (editingStudent.value) {
      return !existing || existing.id === editingStudent.value.id || '姓名已存在'
    }
    return !existing || '姓名已存在'
  }
}

// Load students on mount
onMounted(async () => {
  await studentStore.loadStudents()
})

// Search handler
function handleSearch() {
  studentStore.updateFilters({ searchKeyword: searchKeyword.value })
}

// Edit student
function editStudent(student: Student) {
  editingStudent.value = student
  saving.value = false  // 重置保存状态
  studentForm.value = {
    name: student.name,
    gender: student.gender,
    contact: student.contact || '',
    grade: student.grade || '',
    className: student.className || '',
    specialNeeds: student.specialNeeds,
    notes: student.notes || ''
  }
  showAddDialog.value = true
}

// Save student
async function saveStudent() {
  // 防止重复提交
  if (saving.value) return

  saving.value = true
  try {
    if (editingStudent.value) {
      await studentStore.updateStudent(editingStudent.value.id, studentForm.value)
    } else {
      await studentStore.addStudent(studentForm.value)
    }
    closeAddDialog()
    showSnackbar('保存成功', 'success')
  } catch (error) {
    console.error('Failed to save student:', error)
    showSnackbar('保存失败: ' + (error as Error).message, 'error')
  } finally {
    saving.value = false
  }
}

// Close add dialog
function closeAddDialog() {
  showAddDialog.value = false
  editingStudent.value = null
  saving.value = false
  studentForm.value = {
    name: '',
    gender: 'male',
    contact: '',
    grade: '',
    className: '',
    specialNeeds: false,
    notes: ''
  }
}

// Confirm delete
function confirmDelete(student: Student) {
  studentToDelete.value = student
  showDeleteDialog.value = true
}

// Delete student
async function deleteStudent() {
  if (!studentToDelete.value) return

  try {
    await studentStore.deleteStudent(studentToDelete.value.id)
    showDeleteDialog.value = false
    studentToDelete.value = null
    showSnackbar('删除成功', 'success')
  } catch (error) {
    console.error('Failed to delete student:', error)
    showSnackbar('删除失败: ' + (error as Error).message, 'error')
  }
}

// Import students
async function importStudents() {
  if (!importFile.value) return

  importing.value = true

  try {
    const text = await importFile.value.text()
    const rows = parseCSV(text)

    // Skip header row if exists
    const dataRows = rows[0][0] === '姓名' ? rows.slice(1) : rows

    const importData = dataRows.map((row) => ({
      name: row[0] || '',
      gender: row[1] || 'male',
      contact: row[2] || '',
      grade: row[3] || '',
      className: row[4] || '',
      specialNeeds: row[5] || '',
      notes: row[6] || ''
    }))

    const result = await studentStore.importStudents(importData)

    // Show result in dialog
    importResult.value = {
      success: result.success,
      failed: result.failed,
      errors: result.errors || []
    }
    showImportResultDialog.value = true

    if (result.failed > 0 && result.errors.length > 0) {
      console.log('Import errors:', result.errors)
    }

    showImportDialog.value = false
    importFile.value = null
  } catch (error) {
    console.error('Import failed:', error)
    showSnackbar('导入失败: ' + (error as Error).message, 'error')
  } finally {
    importing.value = false
  }
}

// Export students
function exportStudents() {
  // Create CSV content
  let csv = '姓名,性别,联系方式,年级,班级,特殊需求,备注\\n'

  for (const student of studentStore.students) {
    csv += [
      student.name,
      student.gender === 'male' ? '男' : '女',
      student.contact || '',
      student.grade || '',
      student.className || '',
      student.specialNeeds ? '是' : '否',
      student.notes || ''
    ].join(',') + '\\n'
  }

  downloadFile(csv, 'students.csv', 'text/csv')
}

// Download import template
function downloadTemplate() {
  try {
    TemplateGenerator.downloadStudentTemplate()
    templateSnackbar.value = {
      show: true,
      message: '导入模板已下载！请查看浏览器下载文件夹。'
    }
  } catch (error) {
    console.error('Failed to download template:', error)
    showSnackbar('下载模板失败: ' + (error as Error).message, 'error')
  }
}

// Helper function to show snackbar
function showSnackbar(message: string, color: 'info' | 'error' | 'success' | 'warning' = 'info') {
  snackbar.value = {
    show: true,
    message,
    color,
    timeout: 3000
  }
}
</script>

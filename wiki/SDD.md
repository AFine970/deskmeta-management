# 系统设计文档（SDD）

## 智能换座位系统

---

## 一、技术选型

### 1.1 技术栈概览

| 层级 | 技术选型 | 说明 |
|------|----------|------|
| **前端框架** | Vue 3 | 采用Composition API，提供良好的类型推断 |
| **UI组件库** | Vuetify | Material Design风格，组件丰富，文档完善 |
| **桌面框架** | Tauri | 轻量级，基于Rust，打包体积小，安全性高 |
| **状态管理** | Pinia | Vue 3官方推荐，轻量级状态管理方案 |
| **数据库** | SQLite | 轻量级关系型数据库，无需独立服务 |
| **ORM** | better-sqlite3 | 高性能同步API，适合桌面应用 |
| **PDF导出** | jsPDF + html2canvas | 前端生成PDF，无需后端支持 |
| **动画库** | GSAP | 强大的动画库，支持复杂时间轴控制 |

### 1.2 选型理由

#### 为什么选择Tauri而非Electron？
- **打包体积**：Tauri打包后约10-20MB，Electron通常100MB+
- **性能**：Tauri使用系统WebView，内存占用更小
- **安全性**：Tauri基于Rust，内存安全特性更好
- **开发体验**：前端技术栈与Web开发一致

#### 为什么选择SQLite？
- **零配置**：无需独立数据库服务
- **跨平台**：支持Windows/Mac/Linux
- **离线优先**：完全本地化，无需网络连接
- **事务支持**：保证数据一致性

---

## 二、系统架构设计

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                      Presentation Layer                  │
│                    (Vue 3 + Vuetify UI)                  │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                     State Management                     │
│                          (Pinia)                         │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                      Business Logic Layer                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ SeatManager  │  │StudentMgr    │  │FillEngine    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                      Data Access Layer                   │
│                    (Repository Pattern)                  │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                   Data Storage Layer                     │
│                     (SQLite Database)                    │
└─────────────────────────────────────────────────────────┘
```

### 2.2 分层职责

#### Presentation Layer（表现层）
- **职责**：UI渲染、用户交互、数据展示
- **技术**：Vue 3 + Vuetify
- **核心组件**：
  - LayoutDesigner（座位表设计器）
  - StudentList（学生列表）
  - AnimationPlayer（动画播放器）
  - ExportDialog（导出对话框）

#### State Management（状态管理层）
- **职责**：全局状态管理、组件间通信
- **技术**：Pinia
- **核心Store**：
  - useLayoutStore：座位表布局状态
  - useStudentStore：学生数据状态
  - useFillStore：填充状态

#### Business Logic Layer（业务逻辑层）
- **职责**：核心业务逻辑、算法实现
- **核心模块**：
  - SeatManager：座位管理
  - StudentManager：学生管理
  - FillStrategyEngine：填充策略引擎
  - ConstraintEngine：约束引擎（同桌规则）

#### Data Access Layer（数据访问层）
- **职责**：数据持久化、CRUD操作
- **技术**：Repository Pattern + better-sqlite3
- **核心Repository**：
  - StudentRepository
  - LayoutRepository
  - SeatingRecordRepository

---

## 三、数据库设计

### 3.1 数据表设计

```sql
-- ============================================
-- 学生表
-- ============================================
CREATE TABLE students (
  id TEXT PRIMARY KEY,              -- UUID
  name TEXT UNIQUE NOT NULL,         -- 姓名（唯一）
  gender TEXT NOT NULL,              -- 性别：'male' | 'female'
  contact TEXT,                      -- 联系方式
  grade TEXT,                        -- 年级
  class_name TEXT,                   -- 班级
  special_needs INTEGER DEFAULT 0,   -- 特殊需求：0-否 1-是
  preferred_seat_id TEXT,            -- 优先座位ID（可选）
  notes TEXT,                        -- 备注信息
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 学生表索引
CREATE INDEX idx_students_gender ON students(gender);
CREATE INDEX idx_students_class ON students(class_name);

-- ============================================
-- 座位表配置表
-- ============================================
CREATE TABLE layout_configs (
  id TEXT PRIMARY KEY,              -- UUID
  name TEXT NOT NULL,                -- 布局名称
  rows INTEGER NOT NULL,             -- 行数
  cols INTEGER NOT NULL,             -- 列数
  seat_numbering_mode TEXT NOT NULL DEFAULT 'sequential',  -- 编号模式：'sequential'(连续编号) | 'coordinate'(坐标编号)
  layout_data TEXT NOT NULL,         -- JSON：座位配置
  functional_areas TEXT,             -- JSON：功能区域标注（前门/后门/窗户/讲台等）
  is_default INTEGER DEFAULT 0,      -- 是否默认布局
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- layout_data JSON 格式示例：
-- {
--   "seats": [
--     {"row": 0, "col": 0, "type": "normal", "id": "seat_0_0", "displayNumber": "01"},
--     {"row": 0, "col": 1, "type": "normal", "id": "seat_0_1", "displayNumber": "02"},
--     {"row": 1, "col": 0, "type": "special", "id": "seat_1_0", "displayNumber": "03"}
--   ]
-- }

-- functional_areas JSON 格式示例：
-- {
--   "frontDoor": {"position": "bottom", "visible": true},
--   "backDoor": {"position": "top", "visible": true},
--   "podium": {"position": "bottom-center", "visible": true},
--   "windows": {"position": "right", "visible": true},
--   "aisles": [{"row": 2, "type": "horizontal"}]
-- }

-- ============================================
-- 填充记录表
-- ============================================
CREATE TABLE seating_records (
  id TEXT PRIMARY KEY,              -- UUID
  layout_id TEXT NOT NULL,           -- 关联的布局ID
  fill_strategy TEXT NOT NULL,       -- 填充策略：'random' | 'manual' | 'mixed'
  constraint_type TEXT,              -- 约束类型：'mixed_gender' | 'same_gender' | 'random'
  seating_data TEXT NOT NULL,        -- JSON：座位分配结果
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (layout_id) REFERENCES layout_configs(id)
);

-- seating_data JSON 格式示例：
-- {
--   "assignments": [
--     {"seatId": "seat_0_0", "studentId": "student_001"},
--     {"seatId": "seat_0_1", "studentId": "student_002"}
--   ]
-- }

-- ============================================
-- 系统配置表
-- ============================================
CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,              -- 配置键
  value TEXT NOT NULL,               -- 配置值（JSON字符串）
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 预设配置
-- {
--   "animation_speed": 1000,        -- 动画速度(ms)
--   "auto_save": true,              -- 自动保存
--   "export_format": "pdf"          -- 导出格式
-- }
```

### 3.2 数据模型（TypeScript类型定义）

```typescript
// ==================== 学生相关类型 ====================
interface Student {
  id: string;
  name: string;
  gender: 'male' | 'female';
  contact?: string;
  grade?: string;
  className?: string;
  specialNeeds: boolean;
  preferredSeatId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== 座位表相关类型 ====================
type SeatType = 'normal' | 'special';  // 普通座位 | 特殊需求座位

type SeatNumberingMode = 'sequential' | 'coordinate';  // 连续编号 | 坐标编号

interface Seat {
  row: number;
  col: number;
  type: SeatType;
  id: string;                        // 系统内部ID（如 seat_0_0）
  displayNumber?: string;            // 显示编号（如 "01"、"02"）
}

// 功能区域位置类型
type Position = 'top' | 'bottom' | 'left' | 'right' | 'top-center' | 'bottom-center';

interface FunctionalArea {
  visible: boolean;
  position: Position;
}

interface FunctionalAreas {
  frontDoor?: FunctionalArea;        // 前门
  backDoor?: FunctionalArea;         // 后门
  podium?: FunctionalArea;           // 讲台
  windows?: FunctionalArea;          // 窗户
  aisles?: Array<{                  // 过道
    row?: number;
    col?: number;
    type: 'horizontal' | 'vertical';
  }>;
}

interface LayoutConfig {
  id: string;
  name: string;
  rows: number;
  cols: number;
  seatNumberingMode: SeatNumberingMode;
  seats: Seat[];
  functionalAreas?: FunctionalAreas;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== 填充相关类型 ====================
type FillStrategy = 'random' | 'manual' | 'mixed';
type ConstraintType = 'mixed_gender' | 'same_gender' | 'random';

interface SeatAssignment {
  seatId: string;
  studentId: string;
}

interface SeatingRecord {
  id: string;
  layoutId: string;
  fillStrategy: FillStrategy;
  constraintType?: ConstraintType;
  assignments: SeatAssignment[];
  createdAt: Date;
}

// ==================== 动画配置 ====================
interface AnimationConfig {
  speed: number;           // 每个座位的显示时长(ms)
  enableSound: boolean;    // 是否启用音效
  shuffleCount: number;    // 每个座位随机滚动次数
}
```

---

## 四、核心模块设计

### 4.1 项目结构

```
src/
├── main/                           # Tauri后端（Rust）
│   ├── ...
├── renderer/                       # Vue前端
│   ├── src/
│   │   ├── core/                   # 核心业务逻辑
│   │   │   ├── seat-manager.ts
│   │   │   ├── student-manager.ts
│   │   │   ├── fill-strategies.ts
│   │   │   └── constraint-engine.ts
│   │   ├── ui/                     # UI组件
│   │   │   ├── components/
│   │   │   │   ├── layout-designer/
│   │   │   │   │   ├── SeatingGrid.vue      # 座位网格
│   │   │   │   │   ├── FunctionalAreas.vue  # 功能区域标注
│   │   │   │   │   ├── SeatEditor.vue       # 座位编辑器
│   │   │   │   │   └── NumberingSelector.vue # 编号模式选择器
│   │   │   │   ├── student-list/
│   │   │   │   ├── fill-controls/
│   │   │   │   └── animation-player/
│   │   │   └── views/
│   │   │       ├── Home.vue
│   │   │       ├── LayoutDesigner.vue
│   │   │       └── AnimationView.vue
│   │   ├── stores/                 # Pinia状态管理
│   │   │   ├── layout.ts
│   │   │   ├── student.ts
│   │   │   └── fill.ts
│   │   ├── repository/             # 数据访问层
│   │   │   ├── base-repository.ts
│   │   │   ├── student.repository.ts
│   │   │   ├── layout.repository.ts
│   │   │   └── seating-record.repository.ts
│   │   ├── database/               # 数据库
│   │   │   ├── connection.ts
│   │   │   ├── migrations/
│   │   │   └── seeds/
│   │   ├── utils/                  # 工具函数
│   │   │   ├── validators.ts
│   │   │   ├── exporters.ts
│   │   │   └── helpers.ts
│   │   ├── types/                  # TypeScript类型定义
│   │   │   └── index.ts
│   │   ├── App.vue
│   │   └── main.ts
│   └── package.json
└── tauri.conf.json
```

### 4.2 核心模块设计

#### 4.2.1 SeatManager（座位管理器）

```typescript
export class SeatManager {
  /**
   * 创建座位表布局
   */
  createLayout(config: LayoutConfig): LayoutConfig;

  /**
   * 验证布局有效性
   */
  validateLayout(layout: LayoutConfig): ValidationResult;

  /**
   * 获取座位容量
   */
  getCapacity(layout: LayoutConfig): number;

  /**
   * 根据行列获取座位
   */
  getSeatAt(layout: LayoutConfig, row: number, col: number): Seat | null;
}
```

#### 4.2.2 StudentManager（学生管理器）

```typescript
export class StudentManager {
  /**
   * 添加学生
   */
  addStudent(student: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>): Student;

  /**
   * 批量导入学生
   */
  importStudents(data: Array<{
    name: string;
    gender: 'male' | 'female';
    [key: string]: any;
  }>): ImportResult;

  /**
   * 验证学生数据
   */
  validateStudent(data: any): ValidationResult;

  /**
   * 检查姓名唯一性
   */
  isNameUnique(name: string, excludeId?: string): boolean;
}
```

#### 4.2.3 FillStrategyEngine（填充策略引擎）

```typescript
export class FillStrategyEngine {
  /**
   * 随机填充
   */
  randomFill(
    layout: LayoutConfig,
    students: Student[],
    options?: FillOptions
  ): SeatingRecord;

  /**
   * 手动填充
   */
  manualFill(
    layout: LayoutConfig,
    assignments: Map<string, string>
  ): SeatingRecord;

  /**
   * 混合填充
   */
  mixedFill(
    layout: LayoutConfig,
    students: Student[],
    fixedAssignments: Map<string, string>,
    options?: FillOptions
  ): SeatingRecord;

  /**
   * 验证填充结果
   */
  validateFillResult(record: SeatingRecord): ValidationResult;
}
```

#### 4.2.4 ConstraintEngine（约束引擎）

```typescript
export class ConstraintEngine {
  /**
   * 应用同桌约束
   */
  applyConstraints(
    layout: LayoutConfig,
    students: Student[],
    constraintType: ConstraintType
  ): ConstraintResult;

  /**
   * 检查是否满足约束
   */
  checkConstraints(
    assignments: SeatAssignment[],
    students: Student[],
    constraintType: ConstraintType
  ): boolean;

  /**
   * 获取约束不满足的原因
   */
  getConstraintViolations(
    assignments: SeatAssignment[],
    students: Student[],
    constraintType: ConstraintType
  ): Violation[];
}
```

### 4.3 UI组件设计

#### 4.3.1 SeatingGrid.vue（座位网格组件）

**职责**：渲染座位网格，支持座位选择和编辑

**Props**：
```typescript
interface Props {
  layout: LayoutConfig;        // 座位表配置
  editable?: boolean;          // 是否可编辑
  showNumbers?: boolean;       // 是否显示编号
  selectedSeats?: string[];    // 已选中的座位ID列表
}
```

**核心功能**：
- 根据layout.rows和layout.cols动态生成网格
- 支持两种编号模式显示（sequential/coordinate）
- 座位点击交互（选择/取消选择）
- 特殊座位视觉区分（不同颜色或图标）

**示例代码**：
```vue
<template>
  <div class="seating-grid">
    <div
      v-for="seat in layout.seats"
      :key="seat.id"
      :class="[
        'seat',
        `seat-${seat.type}`,
        { 'selected': isSelected(seat.id) }
      ]"
      :style="getSeatStyle(seat)"
      @click="handleSeatClick(seat)"
    >
      {{ displaySeatNumber(seat) }}
    </div>
  </div>
</template>

<script setup lang="ts">
const displaySeatNumber = (seat: Seat) => {
  if (layout.seatNumberingMode === 'sequential') {
    return seat.displayNumber;
  }
  return '';  // 坐标模式不显示编号
};

const getSeatStyle = (seat: Seat) => {
  const rowSize = 600 / layout.rows;  // 假设容器高度600px
  const colSize = 800 / layout.cols;  // 假设容器宽度800px
  return {
    gridRow: seat.row + 1,
    gridColumn: seat.col + 1,
    width: `${colSize}px`,
    height: `${rowSize}px`
  };
};
</script>

<style scoped>
.seating-grid {
  display: grid;
  gap: 4px;
  padding: 20px;
}

.seat {
  border: 2px solid #333;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
}

.seat-normal {
  background-color: #fff;
}

.seat-special {
  background-color: #fff3cd;
  border-color: #ffc107;
}

.seat.selected {
  background-color: #e3f2fd;
  border-color: #2196f3;
}
</style>
```

---

#### 4.3.2 FunctionalAreas.vue（功能区域标注组件）

**职责**：在座位表周围标注功能区域（前门/后门/窗户/讲台）

**Props**：
```typescript
interface Props {
  functionalAreas: FunctionalAreas;  // 功能区域配置
  editable?: boolean;                // 是否可编辑
}
```

**Emits**：
```typescript
interface Emits {
  (e: 'update', areas: FunctionalAreas): void;
}
```

**核心功能**：
- 在座位表四周渲染功能区域标签
- 支持拖拽调整位置
- 支持显示/隐藏切换
- 编辑模式下可点击修改位置

**示例代码**：
```vue
<template>
  <div class="functional-areas-container">
    <!-- 后门 -->
    <div
      v-if="functionalAreas.backDoor?.visible"
      class="area-label back-door"
      :style="{ top: '0', left: '50%', transform: 'translateX(-50%)' }"
    >
      后门
    </div>

    <!-- 前门 -->
    <div
      v-if="functionalAreas.frontDoor?.visible"
      class="area-label front-door"
      :style="{ bottom: '0', left: '50%', transform: 'translateX(-50%)' }"
    >
      前门
    </div>

    <!-- 讲台 -->
    <div
      v-if="functionalAreas.podium?.visible"
      class="area-label podium"
      :style="{ bottom: '0', left: '50%', transform: 'translateX(-50%) translateY(100%)' }"
    >
      教室讲台
    </div>

    <!-- 窗户 -->
    <div
      v-if="functionalAreas.windows?.visible"
      class="area-label windows"
      :style="{ top: '50%', right: '0', transform: 'translateY(-50%) translateX(100%)' }"
    >
      窗户
    </div>

    <!-- 编辑模式下的编辑按钮 -->
    <div v-if="editable" class="edit-controls">
      <v-btn @click="openEditDialog" size="small">
        编辑区域
      </v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const openEditDialog = () => {
  // 打开编辑对话框，允许用户配置功能区域
  emit('update', props.functionalAreas);
};
</script>

<style scoped>
.functional-areas-container {
  position: relative;
  padding: 40px 60px;  /* 为四周的标签留出空间 */
}

.area-label {
  position: absolute;
  padding: 8px 16px;
  background-color: #1976d2;
  color: white;
  border-radius: 4px;
  font-weight: bold;
  font-size: 14px;
  white-space: nowrap;
}

.back-door {
  background-color: #4caf50;
}

.front-door {
  background-color: #4caf50;
}

.podium {
  background-color: #ff9800;
  min-width: 120px;
  text-align: center;
}

.windows {
  background-color: #9e9e9e;
}
</style>
```

---

#### 4.3.3 NumberingSelector.vue（编号模式选择器）

**职责**：选择和切换座位编号模式

**Props**：
```typescript
interface Props {
  modelValue: SeatNumberingMode;
  rows: number;
  cols: number;
}
```

**核心功能**：
- 下拉选择编号模式（连续编号/坐标编号）
- 预览当前编号规则的示例
- 实时更新座位显示

**示例代码**：
```vue
<template>
  <div class="numbering-selector">
    <v-select
      :model-value="modelValue"
      :items="modes"
      label="座位编号模式"
      @update:model-value="$emit('update:modelValue', $event)"
    >
      <template #item="{ item, props }">
        <v-list-item v-bind="props">
          <template #title>
            <span>{{ item.title }}</span>
            <v-chip size="small" class="ml-2">{{ item.value }}</v-chip>
          </template>
          <template #subtitle>
            {{ item.description }}
          </template>
        </v-list-item>
      </template>
    </v-select>

    <!-- 预览区域 -->
    <div class="preview-area mt-4">
      <div class="text-caption">编号预览（前6个座位）：</div>
      <v-chip v-for="i in 6" :key="i" class="ma-1">
        {{ getPreviewNumber(i) }}
      </v-chip>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<Props>();

const modes = [
  {
    title: '连续编号',
    value: 'sequential',
    description: '01、02、03... 适合打印展示，符合传统教室习惯'
  },
  {
    title: '坐标编号',
    value: 'coordinate',
    description: 'seat_0_0、seat_0_1... 系统内部使用，便于定位'
  }
];

const getPreviewNumber = (index: number) => {
  if (props.modelValue === 'sequential') {
    return String(index).padStart(2, '0');
  }
  return `seat_0_${index - 1}`;
};
</script>
```

---

## 五、关键算法设计

### 5.1 座位编号算法

```typescript
/**
 * 生成连续编号（01-64）
 * 规则：从后往前、左右交替
 * 示例：8列8行的座位表
 * - 第1列（最左侧）：01, 03, 05, 07, 09, 11, 13, 15
 * - 第2列：02, 04, 06, 08, 10, 12, 14, 16
 * - 第3列：17, 19, 21, 23, 25, 27, 29, 31
 * ...
 */
function generateSequentialNumbers(rows: number, cols: number): Map<string, string> {
  const numberMap = new Map<string, string>();
  let currentNumber = 1;

  // 按列从左到右，每列从后往前编号
  for (let col = 0; col < cols; col++) {
    for (let row = rows - 1; row >= 0; row--) {
      const seatId = `seat_${row}_${col}`;
      const displayNumber = String(currentNumber).padStart(2, '0');
      numberMap.set(seatId, displayNumber);
      currentNumber++;
    }
  }

  return numberMap;
}

/**
 * 生成坐标编号（seat_0_0格式）
 */
function generateCoordinateNumbers(rows: number, cols: number): Map<string, string> {
  const numberMap = new Map<string, string>();

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const seatId = `seat_${row}_${col}`;
      numberMap.set(seatId, seatId);
    }
  }

  return numberMap;
}

/**
 * 根据编号模式生成座位编号
 */
function assignSeatNumbers(
  layout: LayoutConfig
): LayoutConfig {
  let numberMap: Map<string, string>;

  switch (layout.seatNumberingMode) {
    case 'sequential':
      numberMap = generateSequentialNumbers(layout.rows, layout.cols);
      break;
    case 'coordinate':
      numberMap = generateCoordinateNumbers(layout.rows, layout.cols);
      break;
    default:
      throw new Error(`Unknown numbering mode: ${layout.seatNumberingMode}`);
  }

  // 为每个座位分配显示编号
  const seats = layout.seats.map(seat => ({
    ...seat,
    displayNumber: numberMap.get(seat.id)
  }));

  return {
    ...layout,
    seats
  };
}
```

### 5.2 随机填充算法

```typescript
/**
 * 随机填充算法（Fisher-Yates洗牌）
 */
function randomFill(
  availableSeats: Seat[],
  availableStudents: Student[]
): SeatAssignment[] {
  // 1. 过滤可用座位（排除过道、讲台等）
  const validSeats = availableSeats.filter(s => s.type === 'normal');

  // 2. 特殊需求学生优先分配
  const specialStudents = availableStudents.filter(s => s.specialNeeds);
  const normalStudents = availableStudents.filter(s => !s.specialNeeds);

  const assignments: SeatAssignment[] = [];
  const remainingSeats = [...validSeats];

  // 3. 处理特殊需求学生
  for (const student of specialStudents) {
    if (remainingSeats.length === 0) break;

    let seatIndex: number;
    if (student.preferredSeatId) {
      // 优先分配指定座位
      seatIndex = remainingSeats.findIndex(s => s.id === student.preferredSeatId);
      if (seatIndex === -1) {
        seatIndex = Math.floor(Math.random() * remainingSeats.length);
      }
    } else {
      seatIndex = Math.floor(Math.random() * remainingSeats.length);
    }

    const seat = remainingSeats.splice(seatIndex, 1)[0];
    assignments.push({ seatId: seat.id, studentId: student.id });
  }

  // 4. Fisher-Yates洗牌普通学生
  const shuffledStudents = fisherYatesShuffle(normalStudents);

  // 5. 分配剩余座位
  const count = Math.min(shuffledStudents.length, remainingSeats.length);
  for (let i = 0; i < count; i++) {
    assignments.push({
      seatId: remainingSeats[i].id,
      studentId: shuffledStudents[i].id
    });
  }

  return assignments;
}

function fisherYatesShuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
```

### 5.3 男女同桌约束算法

```typescript
/**
 * 男女同桌约束算法
 */
function applyMixedGenderConstraint(
  seats: Seat[][],
  students: Student[]
): SeatAssignment[] {
  const males = students.filter(s => s.gender === 'male');
  const females = students.filter(s => s.gender === 'female');

  const assignments: SeatAssignment[] = [];
  const availableMales = [...males];
  const availableFemales = [...females];

  // 按行处理，每行是一个独立的小组
  for (const row of seats) {
    // 跳过过道和讲台
    const validSeats = row.filter(s => s.type === 'normal');
    const seatCount = validSeats.length;

    if (seatCount === 0) continue;

    if (seatCount === 2) {
      // 2人座：1男1女
      if (availableMales.length > 0 && availableFemales.length > 0) {
        assignments.push({
          seatId: validSeats[0].id,
          studentId: availableMales.shift()!.id
        });
        assignments.push({
          seatId: validSeats[1].id,
          studentId: availableFemales.shift()!.id
        });
      }
    } else if (seatCount === 3) {
      // 3人座：至少1男1女
      const need = { male: 1, female: 1 };
      const remaining = seatCount - 2;

      // 尽量平衡分配
      if (availableMales.length >= need.male && availableFemales.length >= need.female) {
        for (let i = 0; i < seatCount; i++) {
          if (i < need.male && availableMales.length > 0) {
            assignments.push({
              seatId: validSeats[i].id,
              studentId: availableMales.shift()!.id
            });
          } else if (availableFemales.length > 0) {
            assignments.push({
              seatId: validSeats[i].id,
              studentId: availableFemales.shift()!.id
            });
          } else if (availableMales.length > 0) {
            assignments.push({
              seatId: validSeats[i].id,
              studentId: availableMales.shift()!.id
            });
          }
        }
      }
    } else {
      // 其他情况：随机填充
      const available = [...availableMales, ...availableFemales];
      for (let i = 0; i < Math.min(validSeats.length, available.length); i++) {
        const student = available[Math.floor(Math.random() * available.length)];
        assignments.push({
          seatId: validSeats[i].id,
          studentId: student.id
        });
        // 从可用列表中移除
        const idx = availableMales.findIndex(s => s.id === student.id);
        if (idx !== -1) availableMales.splice(idx, 1);
        else {
          const idx2 = availableFemales.findIndex(s => s.id === student.id);
          if (idx2 !== -1) availableFemales.splice(idx2, 1);
        }
      }
    }
  }

  return assignments;
}
```

### 5.4 动画生成算法

```typescript
/**
 * 动画序列生成算法
 */
interface AnimationFrame {
  seatId: string;
  studentName: string;
  delay: number;
}

function generateAnimationSequence(
  assignments: SeatAssignment[],
  students: Map<string, Student>,
  config: AnimationConfig
): AnimationFrame[] {
  const frames: AnimationFrame[] = [];
  let delay = 0;

  // 1. 按行列排序（从左上到右下）
  const sortedAssignments = [...assignments].sort((a, b) => {
    // 提取行列信息
    const [rowA, colA] = a.seatId.split('_').slice(1).map(Number);
    const [rowB, colB] = b.seatId.split('_').slice(1).map(Number);

    if (rowA !== rowB) return rowA - rowB;
    return colA - colB;
  });

  // 2. 生成动画帧
  for (const assignment of sortedAssignments) {
    const student = students.get(assignment.studentId);
    if (!student) continue;

    // 为每个座位添加多个随机帧（抽奖效果）
    const candidates = getRandomCandidates(student, students, config.shuffleCount);

    for (let i = 0; i < candidates.length; i++) {
      frames.push({
        seatId: assignment.seatId,
        studentName: candidates[i],
        delay: delay
      });
      delay += config.speed / config.shuffleCount;
    }

    // 最终定格
    frames.push({
      seatId: assignment.seatId,
      studentName: student.name,
      delay: delay
    });
    delay += config.speed;
  }

  return frames;
}

function getRandomCandidates(
  targetStudent: Student,
  allStudents: Map<string, Student>,
  count: number
): string[] {
  const candidates: string[] = [];
  const otherStudents = Array.from(allStudents.values())
    .filter(s => s.id !== targetStudent.id);

  for (let i = 0; i < count; i++) {
    const randomStudent = otherStudents[
      Math.floor(Math.random() * otherStudents.length)
    ];
    candidates.push(randomStudent.name);
  }

  return candidates;
}
```

---

## 六、API接口设计（Tauri Commands）

### 6.1 学生管理接口

```rust
// Tauri后端命令定义
#[tauri::command]
async fn add_student(name: String, gender: String, contact: Option<String>) -> Result<Student, String> {
    // 实现逻辑
}

#[tauri::command]
async fn import_students(file_path: String) -> Result<ImportResult, String> {
    // 实现逻辑
}

#[tauri::command]
async fn get_all_students() -> Result<Vec<Student>, String> {
    // 实现逻辑
}

#[tauri::command]
async fn delete_student(id: String) -> Result<(), String> {
    // 实现逻辑
}
```

### 6.2 座位表接口

```rust
#[tauri::command]
async fn create_layout(name: String, rows: i32, cols: i32) -> Result<LayoutConfig, String> {
    // 实现逻辑
}

#[tauri::command]
async fn get_layouts() -> Result<Vec<LayoutConfig>, String> {
    // 实现逻辑
}

#[tauri::command]
async fn update_layout(id: String, layout_data: String) -> Result<(), String> {
    // 实现逻辑
}
```

### 6.3 填充接口

```rust
#[tauri::command]
async fn fill_seats(
    layout_id: String,
    strategy: String,
    constraint: Option<String>
) -> Result<SeatingRecord, String> {
    // 实现逻辑
}

#[tauri::command]
async fn get_fill_history(limit: Option<i32>) -> Result<Vec<SeatingRecord>, String> {
    // 实现逻辑
}
```

### 6.4 导出接口

```rust
#[tauri::command]
async fn export_to_pdf(record_id: String, output_path: String) -> Result<String, String> {
    // 实现逻辑
}
```

---

## 七、技术实现要点

### 7.1 数据库连接管理

```typescript
// src/database/connection.ts
import Database from 'better-sqlite3';
import path from 'path';
import { app } from '@tauri-apps/api';

class DatabaseConnection {
  private static instance: Database.Database | null = null;

  static async getConnection(): Promise<Database.Database> {
    if (!this.instance) {
      const appDataDir = await app.dataDir();
      const dbPath = path.join(appDataDir, 'seating-system.db');

      this.instance = new Database(dbPath);
      this.instance.pragma('journal_mode = WAL');
      this.instance.pragma('foreign_keys = ON');

      this.runMigrations();
    }

    return this.instance;
  }

  private static runMigrations() {
    // 执行数据库迁移
  }

  static close() {
    if (this.instance) {
      this.instance.close();
      this.instance = null;
    }
  }
}

export default DatabaseConnection;
```

### 7.2 Repository基类

```typescript
// src/repository/base-repository.ts
import Database from 'better-sqlite3';

export abstract class BaseRepository<T> {
  protected db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  abstract findById(id: string): T | null;
  abstract findAll(): T[];
  abstract insert(entity: Omit<T, 'id'>): T;
  abstract update(id: string, entity: Partial<T>): boolean;
  abstract delete(id: string): boolean;

  protected generateId(): string {
    return `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

### 7.3 PDF导出实现

```typescript
// src/utils/exporters.ts
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export class PDFExporter {
  static async exportSeatingChart(
    elementId: string,
    filename: string = 'seating-chart.pdf'
  ): Promise<void> {
    const element = document.getElementById(elementId);
    if (!element) throw new Error('Element not found');

    // 转换为canvas
    const canvas = await html2canvas(element, {
      scale: 2, // 提高清晰度
      backgroundColor: '#ffffff'
    });

    // 生成PDF
    const pdf = new jsPDF({
      orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
      unit: 'px',
      format: [canvas.width, canvas.height]
    });

    pdf.addImage(
      canvas.toDataURL('image/png'),
      'PNG',
      0,
      0,
      canvas.width,
      canvas.height
    );

    pdf.save(filename);
  }
}
```

---

## 八、性能优化策略

### 8.1 数据库优化
- 使用WAL模式（Write-Ahead Logging）提升并发性能
- 为常用查询字段建立索引
- 使用事务批量操作减少IO

### 8.2 前端优化
- 使用虚拟滚动处理大量学生数据
- 动画使用GPU加速（CSS transform）
- 延迟加载非关键组件

### 8.3 打包优化
- Tauri启用upx压缩减小体积
- 移除未使用的依赖
- 启用Tree-shaking

---

## 九、安全性考虑

### 9.1 数据安全
- 所有数据库操作使用参数化查询防止SQL注入
- 敏感数据（如联系方式）本地加密存储

### 9.2 输入验证
- 前后端双重验证所有用户输入
- 文件导入时严格校验数据格式

### 9.3 权限控制（未来扩展）
- 预留用户角色字段
- 敏感操作需要权限验证

---

## 十、测试策略

### 10.1 单元测试
- 核心算法（填充策略、约束引擎）
- 数据验证逻辑
- Repository层CRUD操作

### 10.2 集成测试
- 数据库操作流程
- Tauri命令调用
- 导入导出功能

### 10.3 E2E测试
- 完整的换座位流程
- 动画演示效果
- 异常场景处理

---

## 十一、部署与发布

### 11.1 打包流程
```bash
# 开发环境
npm run tauri dev

# 生产构建
npm run tauri build
```

### 11.2 安装包类型
- **Windows**：.msi（推荐）、.exe（NSIS）
- **签名**：使用代码签名证书（可选）

---

## 十二、未来扩展方向

### 12.1 功能扩展
- 云端同步（可选功能）
- 多班级管理
- 数据统计分析（座位变换频率等）
- 家长查看端（Web版）

### 12.2 技术升级
- 支持多语言（i18n）
- 主题定制
- 插件系统

---

**文档版本**：v1.0
**创建日期**：2025-12-27
**技术负责人**：Claude

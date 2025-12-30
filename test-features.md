# 新功能测试清单

## 已实现的功能

### 1. Bug 修复 ✅
- [x] 列表刷新问题 - `src/stores/student.ts` 中的 `filteredStudents` 计算属性已修复
- [x] 姓名重复验证 - `src/ui/views/StudentManagement.vue` 中添加了 `uniqueName` 规则

### 2. 日志模块 ✅
- [x] 创建 `src/utils/logger.ts` - 支持彩色控制台输出
- [x] 在 `src/database/connection.ts` 中集成日志

### 3. CSV 模板生成器 ✅
- [x] 创建 `src/utils/template.ts` - 模板生成器
- [x] 在 `src/ui/views/StudentManagement.vue` 中添加下载按钮

## 测试步骤

### 测试日志功能
1. 启动应用: `npm run tauri:dev`
2. 打开浏览器控制台 (F12)
3. 执行以下操作并观察控制台输出:
   - 添加学生
   - 编辑学生
   - 删除学生
   - 搜索学生

**预期结果**: 看到带时间戳的彩色日志输出，例如:
```
[14:32:15.123] [INFO] ✅ Inserted record into students
[14:32:15.124] [INFO] DB INSERT on table "students"
```

### 测试模板下载功能
1. 打开学生管理页面
2. 点击"批量导入"按钮
3. 在导入对话框中点击"下载导入模板"按钮
4. 检查浏览器下载文件夹

**预期结果**: 下载一个名为 `学生导入模板.csv` 的文件，内容包含:
```csv
姓名,性别,联系方式,年级,班级,特殊需求,备注
张三,男,13800138000,三年级,1班,否,
李四,女,13900139000,三年级,1班,是,视力需要关注
```

### 测试列表刷新功能
1. 添加新学生
2. 观察表格是否立即更新
3. 编辑学生信息
4. 观察表格是否立即更新
5. 删除学生
6. 观察表格是否立即更新

**预期结果**: 所有操作后表格立即更新，无需手动刷新

### 测试姓名重复验证
1. 添加一个学生，姓名为"张三"
2. 尝试添加另一个学生，姓名也为"张三"
3. 编辑"张三"的学生信息，保持姓名不变
4. 尝试将另一个学生的姓名改为"张三"

**预期结果**:
- 步骤2: 显示错误提示"姓名已存在"
- 步骤3: 允许保存
- 步骤4: 显示错误提示"姓名已存在"

## 文件清单

### 新创建的文件
- `src/utils/logger.ts` - 日志工具类
- `src/utils/template.ts` - CSV模板生成器

### 修改的文件
- `src/database/connection.ts` - 集成日志功能
- `src/ui/views/StudentManagement.vue` - 添加下载模板按钮
- `src/stores/student.ts` - 修复列表刷新问题 (之前已修改)

## 预期控制台输出示例

```
[14:35:20.123] [INFO] Initializing database...
[14:35:20.125] [INFO] Database initialized successfully
[14:35:25.456] [INFO] DB INSERT on table "students" { id: "student_123456", name: "张三", ... }
[14:35:25.457] [INFO] ✅ Inserted record into students { id: "student_123456" }
[14:35:30.789] [INFO] DB UPDATE on table "students" { id: "student_123456", updates: { ... } }
[14:35:30.790] [INFO] ✅ Updated record in students { id: "student_123456" }
[14:35:35.012] [INFO] DB DELETE on table "students" { id: "student_123456" }
[14:35:35.013] [INFO] ✅ Deleted record from students { id: "student_123456" }
```

## 故障排除

### 如果日志不显示
- 检查 `Logger` 是否正确导入
- 确认浏览器控制台没有过滤 INFO 级别的日志
- 可以调用 `Logger.enable()` 手动启用

### 如果模板下载失败
- 检查 `TemplateGenerator` 是否正确导入
- 确认 `downloadFile` 函数可用
- 检查浏览器是否阻止了下载

### 如果列表不刷新
- 检查 `src/stores/student.ts` 中的 `filteredStudents` 计算属性
- 确认 `students.value` 在操作后被正确更新
- 检查浏览器控制台是否有错误信息

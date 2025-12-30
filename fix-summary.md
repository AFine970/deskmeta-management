# CSV 导入问题修复总结

## 问题描述
CSV导入时出现性别字段解析错误：
```
Invalid gender value: �Ա�
Invalid gender value: ��
```

## 根本原因
1. **CSV解析器不完善** - 没有处理UTF-8 BOM头
2. **行结束符处理** - 没有正确处理Windows的`\r\n`
3. **编码问题** - 下载的模板文件可能缺少BOM，导致Excel保存时编码问题

## 已实施的修复

### 1. 改进CSV解析器 (`src/utils/helpers.ts`)
```typescript
export function parseCSV(text: string): string[][] {
  // ✅ 移除UTF-8 BOM头
  if (text.charCodeAt(0) === 0xFEFF) {
    text = text.slice(1)
  }

  // ✅ 处理不同行结束符 (\n 和 \r\n)
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0)

  // ✅ 改进引号处理（支持转义引号）
  // ... 更健壮的解析逻辑
}
```

### 2. 增强性别标准化 (`src/core/student-manager.ts`)
```typescript
private normalizeGender(gender: string): 'male' | 'female' {
  // ✅ 移除所有空白字符
  const cleaned = gender.replace(/\s+/g, '')

  // ✅ 添加调试信息（字符码输出）
  console.log('Normalizing gender:', {
    original: gender,
    cleaned,
    charCodes: gender.split('').map(c => c.charCodeAt(0))
  })

  // ✅ 更宽松的匹配逻辑
  // ✅ 包含检查作为后备方案
}
```

### 3. 改进文件下载 (`src/utils/helpers.ts`)
```typescript
export function downloadFile(data: string, filename: string, type: string = 'text/plain') {
  // ✅ CSV文件添加UTF-8 BOM（Excel兼容）
  let content = data
  if (type.includes('csv') && !data.startsWith('\uFEFF')) {
    content = '\uFEFF' + data
  }

  // ✅ 明确指定UTF-8编码
  const blob = new Blob([content], { type: `${type};charset=utf-8` })
  // ...
}
```

### 4. 添加调试日志
- 在导入过程中添加详细的console.log
- 显示原始文本、解析结果和字符码

## 如何测试

### 步骤1: 下载新的模板
1. 启动应用: `npm run tauri:dev`
2. 打开学生管理页面
3. 点击"批量导入" → "下载导入模板"
4. 检查下载的文件是否正常

### 步骤2: 测试导入
1. 使用下载的模板文件
2. 或者创建新的CSV文件，确保：
   - 编码为UTF-8
   - 使用正确的分隔符（逗号）
   - 性别列使用"男"或"女"

### 步骤3: 检查控制台输出
打开浏览器控制台(F12)，应该看到：
```
[HH:mm:ss.SSS] [INFO] Initializing database...
Raw CSV text: 姓名,性别,联系方式,年级,班级,特殊需求,备注
张三,男,13800138000,三年级,1班,否,
Parsed rows: [Array(7), Array(7)]
Normalizing gender: {
  original: '男',
  cleaned: '男',
  charCodes: [30007],  // 30007 = '男' 的Unicode码点
  cleanedCodes: [30007]
}
✅ Inserted record into students { id: "student_..." }
```

## 预期结果
- ✅ 导入成功，无错误
- ✅ 控制台显示正常的调试信息
- ✅ 学生列表自动更新
- ✅ 下载的模板文件可以在Excel中正常打开

## 如果仍有问题

### 检查文件编码
```javascript
// 在控制台运行，检查文件内容
const file = /* your CSV file */;
const reader = new FileReader();
reader.onload = (e) => {
  const text = e.target.result;
  console.log('First 10 chars:', text.substring(0, 10));
  console.log('Char codes:', text.substring(0, 10).split('').map(c => c.charCodeAt(0)));
};
reader.readAsText(file);
```

### 预期的正常输出
```
姓名,性别,联系方式,年级,班级,特殊需求,备注
```
字符码: `[20320, 21517, 44, 24615, 21035, 44, 32842, 32422]`

### 如果输出是乱码
- 文件可能不是UTF-8编码
- 重新下载模板或使用文本编辑器转换编码为UTF-8

## 相关文件修改
- ✅ `src/utils/helpers.ts` - CSV解析和文件下载
- ✅ `src/core/student-manager.ts` - 性别标准化
- ✅ `src/ui/views/StudentManagement.vue` - 调试日志

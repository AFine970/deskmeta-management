# CSV 导入调试指南

## 问题分析

从错误信息看：
```
Invalid gender value: �Ա�
Invalid gender value: ��
```

这表明CSV解析后的性别值是乱码，可能的原因：
1. CSV文件编码问题（不是UTF-8）
2. CSV解析器处理中文字符有问题
3. 文件上传过程中编码损坏

## 调试步骤

### 1. 检查原始CSV内容
在浏览器控制台查看 `console.log('Raw CSV text:', text)` 的输出

### 2. 检查解析后的行
查看 `console.log('Parsed rows:', rows)` 的输出

### 3. 检查字符编码
查看 `console.log('Row 0:', row)` 和字符码：
- 正常的"男"应该是字符码: 30007 (十六进制: 7537)
- 正常的"女"应该是字符码: 22899 (十六进制: 5973)

## 解决方案

### 方案1: 改进CSV解析器
如果解析器有问题，可以使用更健壮的解析方法：

```typescript
export function parseCSV(text: string): string[][] {
  // 处理BOM头
  if (text.charCodeAt(0) === 0xFEFF) {
    text = text.slice(1)
  }

  const lines = text.split(/\r?\n/).filter(line => line.trim())
  return lines.map(line => {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]

      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }

    if (current) {
      result.push(current.trim())
    }

    return result
  })
}
```

### 方案2: 添加编码检测和转换
在文件读取时指定编码：

```typescript
const text = await importFile.value.text()
// 如果有BOM，移除它
if (text.charCodeAt(0) === 0xFEFF) {
  text = text.slice(1)
}
```

### 方案3: 使用更简单的性别映射
在 `normalizeGender` 中添加更多容错处理：

```typescript
private normalizeGender(gender: string): 'male' | 'female' {
  // 移除所有空白字符
  const cleaned = gender.replace(/\s+/g, '')

  // 检查是否包含特定字符
  if (cleaned.includes('男') || cleaned.toLowerCase().includes('male') || cleaned === 'm' || cleaned === '1') {
    return 'male'
  }

  if (cleaned.includes('女') || cleaned.toLowerCase().includes('female') || cleaned === 'f' || cleaned === '0') {
    return 'female'
  }

  throw new Error(`Invalid gender value: ${gender}`)
}
```

## 测试建议

1. **创建新的CSV文件**，确保使用UTF-8编码保存
2. **使用模板下载功能**生成标准CSV文件
3. **检查文件编辑器**是否支持UTF-8编码

## 预期的正常输出

```
Raw CSV text: 姓名,性别,联系方式,年级,班级,特殊需求,备注
张三,男,13800138000,三年级,1班,否,
李四,女,13900139000,三年级,1班,是,视力需要关注

Parsed rows: [
  ['姓名', '性别', '联系方式', '年级', '班级', '特殊需求', '备注'],
  ['张三', '男', '13800138000', '三年级', '1班', '否', ''],
  ['李四', '女', '13900139000', '三年级', '1班', '是', '视力需要关注']
]

Normalizing gender: {
  original: '男',
  normalized: '男',
  charCodes: [30007]  // 这是"男"的Unicode码点
}
```

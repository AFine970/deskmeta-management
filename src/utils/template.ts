/**
 * CSV Template Generator
 * Provides downloadable templates for bulk data import
 */

import { downloadFile } from './helpers'

export class TemplateGenerator {
  /**
   * Generate student import template CSV
   * Returns CSV content as string
   */
  static generateStudentTemplate(): string {
    const headers = ['姓名', '性别', '联系方式', '年级', '班级', '特殊需求', '备注']

    const sampleData = [
      ['张三', '男', '13800138000', '三年级', '1班', '否', ''],
      ['李四', '女', '13900139000', '三年级', '1班', '是', '视力需要关注'],
      ['王五', '男', '', '三年级', '2班', '否', '数学课代表'],
      ['赵六', '女', '13700137000', '四年级', '1班', '否', '']
    ]

    // Build CSV content
    let csv = headers.join(',') + '\n'
    sampleData.forEach(row => {
      csv += row.map(cell => {
        // Handle cells that might contain commas or quotes
        if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
          return `"${cell.replace(/"/g, '""')}"`
        }
        return cell
      }).join(',') + '\n'
    })

    return csv
  }

  /**
   * Generate layout configuration template CSV
   */
  static generateLayoutTemplate(): string {
    const headers = ['布局名称', '行数', '列数', '描述']

    const sampleData = [
      ['标准教室', '6', '8', '6行8列，48个座位'],
      ['小型教室', '5', '6', '5行6列，30个座位'],
      ['阶梯教室', '8', '10', '8行10列，80个座位']
    ]

    let csv = headers.join(',') + '\n'
    sampleData.forEach(row => {
      csv += row.join(',') + '\n'
    })

    return csv
  }

  /**
   * Download student template
   */
  static downloadStudentTemplate(): void {
    const csv = this.generateStudentTemplate()
    downloadFile(csv, '学生导入模板.csv', 'text/csv;charset=utf-8')
  }

  /**
   * Download layout template
   */
  static downloadLayoutTemplate(): void {
    const csv = this.generateLayoutTemplate()
    downloadFile(csv, '座位布局模板.csv', 'text/csv;charset=utf-8')
  }

  /**
   * Get template preview (for display in UI)
   */
  static getStudentTemplatePreview(): string[] {
    return [
      '姓名,性别,联系方式,年级,班级,特殊需求,备注',
      '张三,男,13800138000,三年级,1班,否,',
      '李四,女,13900139000,三年级,1班,是,视力需要关注'
    ]
  }

  /**
   * Validate if a CSV string matches the student template format
   */
  static validateStudentTemplate(csv: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = []
    const lines = csv.trim().split('\n')

    if (lines.length < 2) {
      errors.push('模板至少需要包含表头和一行示例数据')
      return { isValid: false, errors }
    }

    const headers = lines[0].split(',')
    const expectedHeaders = ['姓名', '性别', '联系方式', '年级', '班级', '特殊需求', '备注']

    if (headers.length !== expectedHeaders.length) {
      errors.push(`表头列数不匹配，期望 ${expectedHeaders.length} 列，实际 ${headers.length} 列`)
    }

    for (let i = 0; i < expectedHeaders.length; i++) {
      if (headers[i] !== expectedHeaders[i]) {
        errors.push(`表头 "${headers[i]}" 应为 "${expectedHeaders[i]}"`)
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }
}

export default TemplateGenerator

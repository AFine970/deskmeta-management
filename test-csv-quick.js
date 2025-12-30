// Quick test for CSV parsing
// Run this in browser console to test

// Test data
const testCSV = `姓名,性别,联系方式,年级,班级,特殊需求,备注
张三,男,13800138000,三年级,1班,否,
李四,女,13900139000,三年级,1班,是,视力需要关注`

// Simulate parseCSV function
function parseCSV(text) {
  // Remove UTF-8 BOM if present
  if (text.charCodeAt(0) === 0xFEFF) {
    text = text.slice(1)
  }

  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0)

  return lines.map(line => {
    const result = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]

      if (char === '"') {
        if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }

    result.push(current.trim())
    return result
  })
}

// Test
console.log('=== CSV Parsing Test ===')
console.log('Input:', testCSV)
const result = parseCSV(testCSV)
console.log('Parsed:', result)

// Test gender normalization
function normalizeGender(gender) {
  if (!gender || typeof gender !== 'string') {
    throw new Error(`Invalid gender value: ${gender}`)
  }

  const cleaned = gender.replace(/\s+/g, '')
  console.log('Normalizing:', { original: gender, cleaned, codes: cleaned.split('').map(c => c.charCodeAt(0)) })

  if (cleaned === '男' || cleaned.toLowerCase() === 'male' || cleaned === 'm' || cleaned === '1') {
    return 'male'
  }

  if (cleaned === '女' || cleaned.toLowerCase() === 'female' || cleaned === 'f' || cleaned === '0') {
    return 'female'
  }

  if (cleaned.includes('男')) return 'male'
  if (cleaned.includes('女')) return 'female'

  throw new Error(`Invalid gender: "${gender}"`)
}

console.log('\n=== Gender Normalization Test ===')
try {
  console.log('男 ->', normalizeGender('男'))
  console.log('女 ->', normalizeGender('女'))
  console.log('男 (from CSV) ->', normalizeGender(result[1][1])) // Should be '男'
  console.log('女 (from CSV) ->', normalizeGender(result[2][1])) // Should be '女'
} catch (e) {
  console.error('Error:', e.message)
}

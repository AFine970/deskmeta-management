/**
 * Validation utilities
 */

import type { ValidationResult } from '../types'

/**
 * Validate required field
 */
export function validateRequired(value: any, fieldName: string): ValidationResult {
  const errors: string[] = []

  if (value === null || value === undefined || value === '') {
    errors.push(`${fieldName} is required`)
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Validate email
 */
export function validateEmail(email: string): ValidationResult {
  const errors: string[] = []

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    errors.push('Invalid email format')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Validate phone number
 */
export function validatePhone(phone: string): ValidationResult {
  const errors: string[] = []

  const phoneRegex = /^[1-9]\d{10}$/
  if (!phoneRegex.test(phone)) {
    errors.push('Invalid phone number format')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Validate string length
 */
export function validateLength(
  value: string,
  min: number,
  max: number,
  fieldName: string
): ValidationResult {
  const errors: string[] = []

  if (value.length < min) {
    errors.push(`${fieldName} must be at least ${min} characters`)
  }

  if (value.length > max) {
    errors.push(`${fieldName} must be at most ${max} characters`)
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Validate number range
 */
export function validateRange(
  value: number,
  min: number,
  max: number,
  fieldName: string
): ValidationResult {
  const errors: string[] = []

  if (value < min) {
    errors.push(`${fieldName} must be at least ${min}`)
  }

  if (value > max) {
    errors.push(`${fieldName} must be at most ${max}`)
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Validate student name
 */
export function validateStudentName(name: string): ValidationResult {
  const errors: string[] = []

  if (!name || name.trim().length === 0) {
    errors.push('Student name is required')
  } else if (name.length > 50) {
    errors.push('Student name must be less than 50 characters')
  } else if (!/^[\u4e00-\u9fa5a-zA-Z\s]+$/.test(name)) {
    errors.push('Student name can only contain Chinese characters, letters, and spaces')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Validate CSV row data
 */
export function validateCSVRow(row: string[], requiredFields: number[]): ValidationResult {
  const errors: string[] = []

  if (row.length < requiredFields.length) {
    errors.push(`CSV row must have at least ${requiredFields.length} columns`)
  }

  for (const fieldIndex of requiredFields) {
    if (!row[fieldIndex] || row[fieldIndex].trim().length === 0) {
      errors.push(`Column ${fieldIndex + 1} is required`)
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Combine multiple validation results
 */
export function combineValidations(...results: ValidationResult[]): ValidationResult {
  const allErrors = results.flatMap(r => r.errors)
  const allWarnings = results.flatMap(r => r.warnings || [])

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings
  }
}

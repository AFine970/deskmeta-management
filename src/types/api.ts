/**
 * API related types
 */

/**
 * Error response
 */
export interface ErrorResponse {
  message: string
  code?: string
  details?: unknown
}

/**
 * Command result (for Tauri commands)
 */
export interface CommandResult<T = void> {
  success: boolean
  data?: T
  error?: string
}

/**
 * File dialog options
 */
export interface FileDialogOptions {
  title?: string
  filters?: Array<{
    name: string
    extensions: string[]
  }>
  defaultPath?: string
}

/**
 * Export options
 */
export interface ExportOptions {
  format: 'pdf' | 'png' | 'jpg'
  quality?: number
  scale?: number
}

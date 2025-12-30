/**
 * Logger utility for database operations and application events
 * Provides colored console output with timestamps
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

class Logger {
  private static enabled = true
  private static showDebug = false

  /**
   * Format current time as HH:mm:ss.SSS
   */
  private static getTimestamp(): string {
    const now = new Date()
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    const seconds = String(now.getSeconds()).padStart(2, '0')
    const ms = String(now.getMilliseconds()).padStart(3, '0')
    return `${hours}:${minutes}:${seconds}.${ms}`
  }

  /**
   * Main logging method with color support
   */
  private static log(level: LogLevel, message: string, data?: any): void {
    if (!this.enabled) return
    if (level === 'debug' && !this.showDebug) return

    const timestamp = this.getTimestamp()
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`

    // Color styles for console
    const colors = {
      info: 'color: #2196F3; font-weight: bold',    // Blue
      warn: 'color: #FF9800; font-weight: bold',    // Orange
      error: 'color: #F44336; font-weight: bold',   // Red
      debug: 'color: #9C27B0; font-weight: bold'    // Purple
    }

    if (data !== undefined) {
      console.log(`%c${prefix} ${message}`, colors[level], data)
    } else {
      console.log(`%c${prefix} ${message}`, colors[level])
    }
  }

  /**
   * Info level logging
   */
  static info(message: string, data?: any): void {
    this.log('info', message, data)
  }

  /**
   * Warning level logging
   */
  static warn(message: string, data?: any): void {
    this.log('warn', message, data)
  }

  /**
   * Error level logging
   */
  static error(message: string, data?: any): void {
    this.log('error', message, data)
  }

  /**
   * Debug level logging (only shown when debug mode is enabled)
   */
  static debug(message: string, data?: any): void {
    this.log('debug', message, data)
  }

  /**
   * Database operation logging
   */
  static databaseOp(operation: string, table: string, details: any): void {
    const message = `DB ${operation.toUpperCase()} on table "${table}"`
    this.info(message, details)
  }

  /**
   * Database query logging
   */
  static databaseQuery(table: string, filters: any, resultsCount: number): void {
    this.info(`DB QUERY on table "${table}"`, {
      filters,
      resultsCount
    })
  }

  /**
   * Enable all logging
   */
  static enable(): void {
    this.enabled = true
    this.info('Logger enabled')
  }

  /**
   * Disable all logging
   */
  static disable(): void {
    this.enabled = false
    console.log('[Logger] Disabled')
  }

  /**
   * Enable debug mode
   */
  static enableDebug(): void {
    this.showDebug = true
    this.debug('Debug mode enabled')
  }

  /**
   * Disable debug mode
   */
  static disableDebug(): void {
    this.showDebug = false
    this.info('Debug mode disabled')
  }

  /**
   * Group related log messages
   */
  static group(label: string): void {
    console.group(`%c[Logger] ${label}`, 'color: #2196F3; font-weight: bold')
  }

  /**
   * End group
   */
  static groupEnd(): void {
    console.groupEnd()
  }
}

export default Logger

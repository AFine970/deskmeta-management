/**
 * PDF and image export utilities
 */

import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

export class Exporter {
  /**
   * Export seating chart to PDF
   */
  static async exportToPDF(
    elementId: string,
    filename: string = 'seating-chart.pdf'
  ): Promise<void> {
    const element = document.getElementById(elementId)
    if (!element) {
      throw new Error('Element not found')
    }

    // Convert element to canvas
    const canvas = await html2canvas(element, {
      scale: 2, // Higher quality
      backgroundColor: '#ffffff',
      logging: false
    })

    // Calculate dimensions
    const imgWidth = canvas.width
    const imgHeight = canvas.height

    // Create PDF
    const orientation = imgWidth > imgHeight ? 'landscape' : 'portrait'
    const pdf = new jsPDF({
      orientation,
      unit: 'px',
      format: [imgWidth, imgHeight]
    })

    // Add image to PDF
    const imgData = canvas.toDataURL('image/png')
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight)

    // Save
    pdf.save(filename)
  }

  /**
   * Export seating chart to image
   */
  static async exportToImage(
    elementId: string,
    filename: string = 'seating-chart.png',
    format: 'png' | 'jpg' = 'png'
  ): Promise<void> {
    const element = document.getElementById(elementId)
    if (!element) {
      throw new Error('Element not found')
    }

    // Convert element to canvas
    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false
    })

    // Convert canvas to blob and download
    canvas.toBlob((blob) => {
      if (!blob) return

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.click()

      // Cleanup
      URL.revokeObjectURL(url)
    }, `image/${format}`)
  }

  /**
   * Print seating chart directly
   */
  static async print(elementId: string): Promise<void> {
    const element = document.getElementById(elementId)
    if (!element) {
      throw new Error('Element not found')
    }

    // Create print window
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      throw new Error('Failed to open print window')
    }

    // Clone element
    const clone = element.cloneNode(true) as HTMLElement

    // Add styles
    const styles = document.querySelectorAll('style, link[rel="stylesheet"]')
    let styleHTML = ''
    styles.forEach(style => {
      styleHTML += style.outerHTML
    })

    // Write to print window
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Seating Chart</title>
          ${styleHTML}
          <style>
            body { margin: 0; padding: 20px; }
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          ${clone.outerHTML}
        </body>
      </html>
    `)
    printWindow.document.close()

    // Wait for content to load then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print()
        printWindow.close()
      }, 250)
    }
  }
}

export default Exporter

// Export utilities for CSV, JSON, PNG, and PDF

export interface ExportData {
  results: any[]
  query?: string
  visualizationType?: string
}

/**
 * Export data as CSV file
 */
export function exportToCSV(data: ExportData): void {
  if (!data.results || data.results.length === 0) {
    alert('No data to export')
    return
  }

  // Get all unique keys from the data
  const columns = Object.keys(data.results[0])
  
  // Create CSV header
  const header = columns.map(col => `"${col.replace(/"/g, '""')}"`).join(',')
  
  // Create CSV rows
  const rows = data.results.map(row => {
    return columns.map(col => {
      const value = row[col]
      if (value === null || value === undefined) {
        return '""'
      }
      // Convert to string and escape quotes
      const stringValue = String(value).replace(/"/g, '""')
      return `"${stringValue}"`
    }).join(',')
  })
  
  // Combine header and rows
  const csvContent = [header, ...rows].join('\n')
  
  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `querymind-export-${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Export data as JSON file
 */
export function exportToJSON(data: ExportData): void {
  if (!data.results || data.results.length === 0) {
    alert('No data to export')
    return
  }

  const exportObject = {
    query: data.query || 'N/A',
    visualizationType: data.visualizationType || 'N/A',
    exportedAt: new Date().toISOString(),
    results: data.results
  }

  const jsonContent = JSON.stringify(exportObject, null, 2)
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `querymind-export-${new Date().toISOString().split('T')[0]}.json`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Export visualization as PNG image
 */
export async function exportToPNG(elementId: string, filename?: string): Promise<void> {
  try {
    // Dynamic import to avoid loading html2canvas if not needed
    const html2canvas = (await import('html2canvas')).default
    
    const element = document.getElementById(elementId)
    if (!element) {
      // Try to find the element by class or other selector
      const chartElement = document.querySelector('.viz-chart-wrapper') || 
                          document.querySelector('.viz-chart-container') ||
                          document.querySelector('.viz-content')
      
      if (!chartElement) {
        alert('Could not find visualization element to export')
        return
      }
      
      const canvas = await html2canvas(chartElement as HTMLElement, {
        backgroundColor: document.documentElement.classList.contains('dark') ? '#1a1a1a' : '#ffffff',
        scale: 2,
        logging: false
      })
      
      canvas.toBlob((blob) => {
        if (!blob) {
          alert('Failed to create image')
          return
        }
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.setAttribute('href', url)
        link.setAttribute('download', filename || `querymind-chart-${new Date().toISOString().split('T')[0]}.png`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      })
    } else {
      const canvas = await html2canvas(element, {
        backgroundColor: document.documentElement.classList.contains('dark') ? '#1a1a1a' : '#ffffff',
        scale: 2,
        logging: false
      })
      
      canvas.toBlob((blob) => {
        if (!blob) {
          alert('Failed to create image')
          return
        }
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.setAttribute('href', url)
        link.setAttribute('download', filename || `querymind-chart-${new Date().toISOString().split('T')[0]}.png`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      })
    }
  } catch (error) {
    console.error('Error exporting to PNG:', error)
    alert('Failed to export PNG. Please ensure html2canvas is installed.')
  }
}

/**
 * Export data as PDF
 */
export async function exportToPDF(data: ExportData, elementId?: string): Promise<void> {
  try {
    // Dynamic import to avoid loading jsPDF if not needed
    const { jsPDF } = await import('jspdf')
    const html2canvas = (await import('html2canvas')).default
    
    const pdf = new jsPDF('landscape', 'mm', 'a4')
    const isDark = document.documentElement.classList.contains('dark')
    
    // Add title
    pdf.setFontSize(16)
    pdf.setTextColor(isDark ? 245 : 26, isDark ? 245 : 26, isDark ? 245 : 26)
    pdf.text('QueryMind Export', 20, 20)
    
    // Add query info if available
    if (data.query) {
      pdf.setFontSize(12)
      pdf.setTextColor(isDark ? 200 : 100, isDark ? 200 : 100, isDark ? 200 : 100)
      pdf.text(`Query: ${data.query}`, 20, 30)
    }
    
    // Try to export visualization as image if elementId is provided
    if (elementId) {
      const element = document.getElementById(elementId)
      if (element) {
        const canvas = await html2canvas(element, {
          backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
          scale: 2,
          logging: false
        })
        
        const imgData = canvas.toDataURL('image/png')
        const imgWidth = 250
        const imgHeight = (canvas.height * imgWidth) / canvas.width
        pdf.addImage(imgData, 'PNG', 20, 40, imgWidth, imgHeight)
      }
    }
    
    // If we have table data, add it as a table
    if (data.results && data.results.length > 0 && !elementId) {
      const columns = Object.keys(data.results[0])
      const rows = data.results.slice(0, 20).map(row => 
        columns.map(col => String(row[col] || ''))
      )
      
      // Simple table rendering
      let yPos = 50
      pdf.setFontSize(10)
      pdf.setTextColor(isDark ? 245 : 26, isDark ? 245 : 26, isDark ? 245 : 26)
      
      // Header
      columns.forEach((col, idx) => {
        pdf.text(col.substring(0, 15), 20 + (idx * 40), yPos)
      })
      yPos += 10
      
      // Rows
      rows.forEach(row => {
        row.forEach((cell, idx) => {
          pdf.text(cell.substring(0, 15), 20 + (idx * 40), yPos)
        })
        yPos += 10
        if (yPos > 180) {
          pdf.addPage()
          yPos = 20
        }
      })
    }
    
    pdf.save(`querymind-export-${new Date().toISOString().split('T')[0]}.pdf`)
  } catch (error) {
    console.error('Error exporting to PDF:', error)
    alert('Failed to export PDF. Please ensure jsPDF and html2canvas are installed.')
  }
}


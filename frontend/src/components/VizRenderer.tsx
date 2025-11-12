import { useState, useEffect, useRef } from 'react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'
import Plot from 'react-plotly.js'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { exportToCSV, exportToJSON, exportToPNG, exportToPDF } from '@/utils/exportUtils'
import type { ExportData } from '@/utils/exportUtils'
import { useTheme } from '@/contexts/ThemeContext'

interface VisualizationConfig {
  type: 'bar' | 'line' | 'table' | 'map' | 'text'
  x_axis?: string
  y_axis?: string
  color?: string
}

interface VizData {
  results: any[] | null
  visualization_config: VisualizationConfig | null
}

interface VizRendererProps {
  vizData: VizData
}

export default function VizRenderer({ vizData }: VizRendererProps) {
  const { theme } = useTheme()
  const [zoomLevel, setZoomLevel] = useState(1) // 1 = 100%, 0.5 = 50%, 2 = 200%
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [translatedReviews, setTranslatedReviews] = useState<{ [key: number]: string }>({})
  const [translating, setTranslating] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const exportMenuRef = useRef<HTMLDivElement>(null)
  const exportButtonRef = useRef<HTMLButtonElement>(null)
  const baseHeight = 450
  const minZoom = 0.5
  const maxZoom = 3
  const zoomStep = 0.25
  
  // Get text color based on theme
  const textColor = theme === 'dark' ? '#f5f5f5' : '#374151'
  const axisColor = theme === 'dark' ? '#9ca3af' : '#6b7280'

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + zoomStep, maxZoom))
  }

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - zoomStep, minZoom))
  }

  const handleResetZoom = () => {
    setZoomLevel(1)
  }

  const translateReview = async (review: string, index: number) => {
    if (translatedReviews[index]) {
      return // Already translated
    }

    try {
      setTranslating(true)
      const response = await fetch('http://localhost:8000/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: review }),
      })

      if (response.ok) {
        const data = await response.json()
        setTranslatedReviews(prev => ({
          ...prev,
          [index]: data.translated
        }))
      }
    } catch (error) {
      console.error('Translation error:', error)
    } finally {
      setTranslating(false)
    }
  }

  const handleBarClick = (data: any) => {
    if (data && data.reviews) {
      setSelectedProduct(data)
      setShowReviewModal(true)
      setTranslatedReviews({}) // Reset translations
    }
  }

  const handleLineClick = (data: any) => {
    if (data && data.reviews) {
      setSelectedProduct(data)
      setShowReviewModal(true)
      setTranslatedReviews({}) // Reset translations
    }
  }

  const closeReviewModal = () => {
    setShowReviewModal(false)
    setSelectedProduct(null)
    setTranslatedReviews({})
  }

  const chartHeight = baseHeight * zoomLevel

  // Reset zoom when visualization data changes
  useEffect(() => {
    setZoomLevel(1)
    setShowReviewModal(false)
    setSelectedProduct(null)
  }, [vizData?.visualization_config?.type, vizData?.results])

  // Close export menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        exportMenuRef.current &&
        exportButtonRef.current &&
        !exportMenuRef.current.contains(event.target as Node) &&
        !exportButtonRef.current.contains(event.target as Node)
      ) {
        setShowExportMenu(false)
      }
    }

    if (showExportMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [showExportMenu])

  const handleExport = async (format: 'csv' | 'json' | 'png' | 'pdf') => {
    if (!vizData.results || vizData.results.length === 0) {
      alert('No data to export')
      return
    }

    const exportData: ExportData = {
      results: vizData.results,
      query: 'Query from QueryMind',
      visualizationType: vizData.visualization_config?.type || 'unknown'
    }

    try {
      switch (format) {
        case 'csv':
          exportToCSV(exportData)
          break
        case 'json':
          exportToJSON(exportData)
          break
        case 'png':
          await exportToPNG('viz-chart-container')
          break
        case 'pdf':
          await exportToPDF(exportData, 'viz-chart-container')
          break
      }
      setShowExportMenu(false)
    } catch (error) {
      console.error('Export error:', error)
      alert(`Failed to export as ${format.toUpperCase()}`)
    }
  }

  // Return placeholder if vizData is null or visualization_config is null/undefined
  if (!vizData || !vizData.visualization_config) {
    return (
      <div className="viz-empty-state">
        <div className="viz-empty-icon">📊</div>
        <h3 className="viz-empty-title">No visualization data</h3>
        <p className="viz-empty-description">
          Send a query to see visualizations and insights here.
        </p>
      </div>
    )
  }

  // Handle empty results - show message but still render table if type is table
  const data = vizData.results || []
  if (data.length === 0 && vizData.visualization_config.type !== 'table') {
    return (
      <div className="viz-empty-state">
        <div className="viz-empty-icon">📭</div>
        <h3 className="viz-empty-title">No data available</h3>
        <p className="viz-empty-description">
          The query executed successfully but returned no results.
        </p>
      </div>
    )
  }

  const config = vizData.visualization_config

  // Validate that required columns exist (only if we have data)
  if (data.length > 0) {
    const firstRow = data[0]
    if (config.x_axis && !(config.x_axis in firstRow)) {
      return (
        <div className="viz-empty-state">
          <div className="viz-empty-icon">⚠️</div>
          <h3 className="viz-empty-title">Column Not Found</h3>
          <p className="viz-empty-description">
            Column "{config.x_axis}" not found in data.
          </p>
        </div>
      )
    }
    if (config.y_axis && !(config.y_axis in firstRow)) {
      return (
        <div className="viz-empty-state">
          <div className="viz-empty-icon">⚠️</div>
          <h3 className="viz-empty-title">Column Not Found</h3>
          <p className="viz-empty-description">
            Column "{config.y_axis}" not found in data.
          </p>
        </div>
      )
    }
  }

  const renderChart = () => {
    switch (config.type) {
      case 'bar':
      // Format x-axis labels - truncate long IDs and show first/last chars
      const formatXAxisLabel = (label: string) => {
        if (typeof label !== 'string') return String(label)
        if (label.length > 12) {
          return `${label.substring(0, 6)}...${label.substring(label.length - 4)}`
        }
        return label
      }

        return (
          <div className="viz-chart-container" id="viz-chart-container">
            <div className="viz-chart-controls">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button 
                  className="viz-zoom-button" 
                  onClick={handleZoomOut}
                  disabled={zoomLevel <= minZoom}
                  title="Zoom Out"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 8H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
                <span className="viz-zoom-level">{Math.round(zoomLevel * 100)}%</span>
                <button 
                  className="viz-zoom-button" 
                  onClick={handleZoomIn}
                  disabled={zoomLevel >= maxZoom}
                  title="Zoom In"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
                <button 
                  className="viz-zoom-reset" 
                  onClick={handleResetZoom}
                  title="Reset Zoom"
                >
                  Reset
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <button
                  ref={exportButtonRef}
                  className="viz-export-button"
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  title="Export"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Export
                </button>
                {showExportMenu && (
                  <div ref={exportMenuRef} className="viz-export-menu">
                    <button onClick={() => handleExport('csv')} className="viz-export-menu-item">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2"/>
                        <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      Export as CSV
                    </button>
                    <button onClick={() => handleExport('json')} className="viz-export-menu-item">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2"/>
                        <path d="M14 2v6h6M10 18v-4M14 18v-2M18 18v-6" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      Export as JSON
                    </button>
                    <button onClick={() => handleExport('png')} className="viz-export-menu-item">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="2"/>
                        <path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      Export as PNG
                    </button>
                    <button onClick={() => handleExport('pdf')} className="viz-export-menu-item">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2"/>
                        <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      Export as PDF
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="viz-chart-wrapper">
              <ResponsiveContainer width="100%" height={chartHeight}>
                <BarChart 
                  data={data} 
                  margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                  onClick={(e: any) => {
                    if (e && e.activePayload && e.activePayload[0]) {
                      const clickedData = e.activePayload[0].payload
                      if (clickedData && clickedData.reviews) {
                        handleBarClick(clickedData)
                      }
                    }
                  }}
                >
                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#f0f0f0'} opacity={0.5} vertical={false} />
                <XAxis 
                  dataKey={config.x_axis}
                  stroke={axisColor}
                  fontSize={10}
                  tickLine={false}
                  axisLine={{ stroke: theme === 'dark' ? '#374151' : '#e5e7eb' }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tickFormatter={formatXAxisLabel}
                  tick={{ fill: axisColor, fontSize: 10 }}
                />
                <YAxis 
                  stroke={axisColor}
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: theme === 'dark' ? '#374151' : '#e5e7eb' }}
                  tick={{ fill: axisColor, fontSize: 11 }}
                  width={60}
                  tickFormatter={(value) => {
                    if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
                    return value.toString()
                  }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: theme === 'dark' ? 'rgba(31, 41, 55, 0.98)' : 'rgba(255, 255, 255, 0.98)',
                    border: theme === 'dark' ? '1px solid #374151' : '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    fontSize: '12px',
                    padding: '8px 12px',
                    color: textColor
                  }}
                  itemStyle={{ color: textColor }}
                  labelStyle={{ color: textColor }}
                  cursor={{ fill: 'rgba(16, 185, 129, 0.1)' }}
                  formatter={(value: any) => {
                    if (typeof value === 'number') {
                      return value.toLocaleString('en-US', { maximumFractionDigits: 2 })
                    }
                    return value
                  }}
                />
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={1} />
                  </linearGradient>
                </defs>
                <Legend 
                  wrapperStyle={{ paddingTop: '20px', color: textColor }}
                  iconType="circle"
                  formatter={(value) => <span style={{ color: textColor }}>{value}</span>}
                />
                <Bar 
                  dataKey={config.y_axis}
                  fill="url(#barGradient)"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={80}
                  cursor="pointer"
                >
                  {data.map((entry: any, index: number) => (
                    <Cell 
                      key={`cell-${index}`}
                      onClick={() => {
                        if (entry && entry.reviews) {
                          handleBarClick(entry)
                        }
                      }}
                    />
                  ))}
                </Bar>
              </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )

      case 'line':
        return (
          <div className="viz-chart-container" id="viz-chart-container">
          <div className="viz-chart-controls">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button 
              className="viz-zoom-button" 
              onClick={handleZoomOut}
              disabled={zoomLevel <= minZoom}
              title="Zoom Out"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 8H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
            <span className="viz-zoom-level">{Math.round(zoomLevel * 100)}%</span>
            <button 
              className="viz-zoom-button" 
              onClick={handleZoomIn}
              disabled={zoomLevel >= maxZoom}
              title="Zoom In"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
            <button 
              className="viz-zoom-reset" 
              onClick={handleResetZoom}
              title="Reset Zoom"
            >
              Reset
            </button>
            </div>
            <div style={{ position: 'relative' }}>
              <button
                ref={exportButtonRef}
                className="viz-export-button"
                onClick={() => setShowExportMenu(!showExportMenu)}
                title="Export"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Export
              </button>
              {showExportMenu && (
                <div ref={exportMenuRef} className="viz-export-menu">
                  <button onClick={() => handleExport('csv')} className="viz-export-menu-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2"/>
                      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    Export as CSV
                  </button>
                  <button onClick={() => handleExport('json')} className="viz-export-menu-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2"/>
                      <path d="M14 2v6h6M10 18v-4M14 18v-2M18 18v-6" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    Export as JSON
                  </button>
                  <button onClick={() => handleExport('png')} className="viz-export-menu-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="2"/>
                      <path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    Export as PNG
                  </button>
                  <button onClick={() => handleExport('pdf')} className="viz-export-menu-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2"/>
                      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    Export as PDF
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="viz-chart-wrapper">
            <ResponsiveContainer width="100%" height={chartHeight}>
              <LineChart 
                data={data} 
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload[0]) {
                    const clickedData = e.activePayload[0].payload
                    if (clickedData && clickedData.reviews) {
                      handleLineClick(clickedData)
                    }
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#f0f0f0'} opacity={0.5} vertical={false} />
                <XAxis 
                  dataKey={config.x_axis} 
                  stroke={axisColor}
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: theme === 'dark' ? '#374151' : '#e5e7eb' }}
                  tick={{ fill: axisColor, fontSize: 11 }}
                />
                <YAxis 
                  stroke={axisColor}
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: theme === 'dark' ? '#374151' : '#e5e7eb' }}
                  tick={{ fill: axisColor, fontSize: 11 }}
                  width={60}
                  tickFormatter={(value) => {
                    if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
                    return value.toString()
                  }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: theme === 'dark' ? 'rgba(31, 41, 55, 0.98)' : 'rgba(255, 255, 255, 0.98)',
                    border: theme === 'dark' ? '1px solid #374151' : '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    fontSize: '12px',
                    padding: '8px 12px',
                    color: textColor
                  }}
                  itemStyle={{ color: textColor }}
                  labelStyle={{ color: textColor }}
                  formatter={(value: any) => {
                    if (typeof value === 'number') {
                      return value.toLocaleString('en-US', { maximumFractionDigits: 2 })
                    }
                    return value
                  }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px', color: textColor }}
                  iconType="circle"
                  formatter={(value) => <span style={{ color: textColor }}>{value}</span>}
                />
                <Line 
                  type="monotone" 
                  dataKey={config.y_axis} 
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ fill: '#10b981', r: 5, strokeWidth: 2, stroke: '#fff', cursor: 'pointer' }}
                  activeDot={{ r: 7, fill: '#059669', strokeWidth: 2, stroke: '#fff', cursor: 'pointer' }}
                  onClick={(data: any) => {
                    if (data && data.reviews) {
                      handleLineClick(data)
                    }
                  }}
                />
              </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )

      case 'table':
      // Get all unique keys from the data
      const columns = data.length > 0 ? Object.keys(data[0]) : []
      
      return (
        <div className="viz-table-container" id="viz-chart-container">
          <div className="viz-chart-controls" style={{ marginBottom: '1rem' }}>
            <div style={{ marginLeft: 'auto', position: 'relative' }}>
              <button
                ref={exportButtonRef}
                className="viz-export-button"
                onClick={() => setShowExportMenu(!showExportMenu)}
                title="Export"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Export
              </button>
              {showExportMenu && (
                <div ref={exportMenuRef} className="viz-export-menu">
                  <button onClick={() => handleExport('csv')} className="viz-export-menu-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2"/>
                      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    Export as CSV
                  </button>
                  <button onClick={() => handleExport('json')} className="viz-export-menu-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2"/>
                      <path d="M14 2v6h6M10 18v-4M14 18v-2M18 18v-6" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    Export as JSON
                  </button>
                  <button onClick={() => handleExport('png')} className="viz-export-menu-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="2"/>
                      <path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    Export as PNG
                  </button>
                  <button onClick={() => handleExport('pdf')} className="viz-export-menu-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2"/>
                      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    Export as PDF
                  </button>
                </div>
              )}
            </div>
          </div>
          {data.length === 0 ? (
            <div className="viz-empty-state">
              <div className="viz-empty-icon">📭</div>
              <h3 className="viz-empty-title">No data found</h3>
              <p className="viz-empty-description">
                The query executed successfully but returned no results.
              </p>
            </div>
          ) : (
            <div className="table-wrapper">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map((col) => (
                      <TableHead key={col}>{col.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((row, idx) => (
                    <TableRow key={idx}>
                      {columns.map((col) => (
                        <TableCell key={col}>{String(row[col] ?? '')}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            )}
          </div>
        )

      case 'map':
      // For map visualization, we'll use react-plotly.js with scattermapbox
      // Assuming the data has latitude and longitude columns
      // We'll try to infer them or use x_axis and y_axis if they're lat/lon
      const latKey = config.x_axis || 'latitude'
      const lonKey = config.y_axis || 'longitude'
      
      // Try to find lat/lon columns if x_axis/y_axis don't exist
      const possibleLatKeys = ['latitude', 'lat', 'y', 'Y']
      const possibleLonKeys = ['longitude', 'lon', 'lng', 'x', 'X']
      
      const foundLatKey = possibleLatKeys.find(key => data[0]?.[key] !== undefined) || latKey
      const foundLonKey = possibleLonKeys.find(key => data[0]?.[key] !== undefined) || lonKey
      
      const mapData = data.map((row) => ({
        lat: parseFloat(row[foundLatKey]) || 0,
        lon: parseFloat(row[foundLonKey]) || 0,
        text: config.color ? String(row[config.color]) : ''
      }))

      return (
        <Plot
          data={[
            {
              type: 'scattermapbox',
              mode: 'markers',
              lat: mapData.map(d => d.lat),
              lon: mapData.map(d => d.lon),
              text: mapData.map(d => d.text),
              marker: { size: 10 }
            }
          ]}
          layout={{
            mapbox: {
              style: 'open-street-map',
              center: {
                lat: mapData.length > 0 ? mapData[0].lat : 0,
                lon: mapData.length > 0 ? mapData[0].lon : 0
              },
              zoom: 10
            },
            height: 600,
            margin: { t: 0, b: 0, l: 0, r: 0 }
          }}
            config={{ mapboxAccessToken: '' }} // You may need to add a Mapbox token for better maps
          />
        )

      case 'text':
      // Handle text results from tool queries (definitions, Wikipedia lookups, etc.)
      const textContent = data.length > 0 && data[0].text ? data[0].text : 'No text content available'
      return (
        <div className="viz-text-container">
          <div className="viz-text-content">
            <p className="viz-text">{textContent}</p>
            </div>
          </div>
        )

      default:
        return (
          <div className="viz-empty-state">
            <div className="viz-empty-icon">⚠️</div>
            <h3 className="viz-empty-title">Unsupported visualization type</h3>
            <p className="viz-empty-description">
              Visualization type "{config.type}" is not yet supported.
            </p>
          </div>
        )
    }
  }

  return (
    <>
      {renderChart()}
      {showReviewModal && selectedProduct && (
        <div className="review-modal-overlay" onClick={closeReviewModal}>
          <div className="review-modal" onClick={(e) => e.stopPropagation()}>
            <div className="review-modal-header">
              <h3 className="review-modal-title">Product Reviews</h3>
              <button className="review-modal-close" onClick={closeReviewModal}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <div className="review-modal-content">
              <div className="review-product-info">
                <p><strong>Product ID:</strong> {selectedProduct.product_id || (vizData?.visualization_config?.x_axis ? selectedProduct[vizData.visualization_config.x_axis] : 'N/A')}</p>
                {selectedProduct.product_category_name_english && (
                  <p><strong>Category:</strong> {selectedProduct.product_category_name_english}</p>
                )}
                {selectedProduct.avg_score && (
                  <p><strong>Average Score:</strong> {selectedProduct.avg_score.toFixed(2)}</p>
                )}
              </div>
              <div className="review-text-container">
                <h4>Reviews:</h4>
                {selectedProduct.reviews ? (
                  <div className="review-text">
                    {selectedProduct.reviews.split(' | ').map((review: string, idx: number) => (
                      <div key={idx} className="review-item">
                        <div className="review-original">
                          <p className="review-label">Original:</p>
                          <p>{review}</p>
                        </div>
                        <div className="review-translated">
                          <p className="review-label">English Translation:</p>
                          {translatedReviews[idx] ? (
                            <p>{translatedReviews[idx]}</p>
                          ) : (
                            <button 
                              className="translate-button"
                              onClick={() => translateReview(review, idx)}
                              disabled={translating}
                            >
                              {translating ? 'Translating...' : 'Translate to English'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="no-reviews">No reviews available for this product.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

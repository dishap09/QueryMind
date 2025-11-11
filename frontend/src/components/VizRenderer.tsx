import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import Plot from 'react-plotly.js'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

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
        <div className="viz-chart-container">
          <div className="viz-chart-wrapper">
            <ResponsiveContainer width="100%" height={550}>
              <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" opacity={0.5} vertical={false} />
                <XAxis 
                  dataKey={config.x_axis}
                  stroke="#6b7280"
                  fontSize={10}
                  tickLine={false}
                  axisLine={true}
                  axisLineStroke="#e5e7eb"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tickFormatter={formatXAxisLabel}
                  tick={{ fill: '#6b7280', fontSize: 10 }}
                />
                <YAxis 
                  stroke="#6b7280"
                  fontSize={11}
                  tickLine={false}
                  axisLine={true}
                  axisLineStroke="#e5e7eb"
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  width={60}
                  tickFormatter={(value) => {
                    if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
                    return value.toString()
                  }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.98)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    fontSize: '12px',
                    padding: '8px 12px'
                  }}
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
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="circle"
                />
                <Bar 
                  dataKey={config.y_axis}
                  fill="url(#barGradient)"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={80}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )

    case 'line':
      return (
        <div className="viz-chart-container">
          <div className="viz-chart-wrapper">
            <ResponsiveContainer width="100%" height={550}>
              <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" opacity={0.5} vertical={false} />
                <XAxis 
                  dataKey={config.x_axis} 
                  stroke="#6b7280"
                  fontSize={11}
                  tickLine={false}
                  axisLine={true}
                  axisLineStroke="#e5e7eb"
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                />
                <YAxis 
                  stroke="#6b7280"
                  fontSize={11}
                  tickLine={false}
                  axisLine={true}
                  axisLineStroke="#e5e7eb"
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  width={60}
                  tickFormatter={(value) => {
                    if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
                    return value.toString()
                  }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.98)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    fontSize: '12px',
                    padding: '8px 12px'
                  }}
                  formatter={(value: any) => {
                    if (typeof value === 'number') {
                      return value.toLocaleString('en-US', { maximumFractionDigits: 2 })
                    }
                    return value
                  }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="circle"
                />
                <Line 
                  type="monotone" 
                  dataKey={config.y_axis} 
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ fill: '#10b981', r: 5, strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 7, fill: '#059669', strokeWidth: 2, stroke: '#fff' }}
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
        <div className="viz-table-container">
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

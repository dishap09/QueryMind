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
      return (
        <div className="viz-chart-container">
          <ResponsiveContainer width="100%" height={500}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
              <XAxis 
                dataKey={config.x_axis} 
                stroke="#9ca3af"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke="#9ca3af"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                  fontSize: '12px'
                }}
              />
              <Legend />
              <Bar 
                dataKey={config.y_axis} 
                fill="#10b981"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )

    case 'line':
      return (
        <div className="viz-chart-container">
          <ResponsiveContainer width="100%" height={500}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
              <XAxis 
                dataKey={config.x_axis} 
                stroke="#9ca3af"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke="#9ca3af"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                  fontSize: '12px'
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey={config.y_axis} 
                stroke="#10b981"
                strokeWidth={2.5}
                dot={{ fill: '#10b981', r: 4, strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 6, fill: '#059669', strokeWidth: 2, stroke: '#fff' }}
              />
            </LineChart>
          </ResponsiveContainer>
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

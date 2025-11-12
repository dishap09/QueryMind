import { useState } from 'react'
import './InsightsPanel.css'

interface InsightsPanelProps {
  insights: string | null
}

export default function InsightsPanel({ insights }: InsightsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  if (!insights) {
    return null
  }

  // Parse insights text into lines for better formatting
  const insightLines = insights.split('\n').filter(line => line.trim().length > 0)

  return (
    <div className="insights-panel">
      <div className="insights-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="insights-header-left">
          <div className="insights-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <h3 className="insights-title">Data Insights</h3>
            <p className="insights-subtitle">Key findings and recommendations</p>
          </div>
        </div>
        <button className="insights-toggle">
          <svg 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}
          >
            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
      {isExpanded && (
        <div className="insights-content">
          <div className="insights-text">
            {insightLines.map((line, index) => {
              // Check if line starts with bullet point or dash
              const trimmedLine = line.trim()
              const isBullet = trimmedLine.startsWith('•') || trimmedLine.startsWith('-') || trimmedLine.startsWith('*') || 
                              /^\d+\./.test(trimmedLine)
              
              // Remove any remaining emojis from the line
              const cleanLine = trimmedLine.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{02702}-\u{027B0}]|[\u{024C2}-\u{1F251}]/gu, '').trim()
              
              if (!cleanLine) return null
              
              // Check if line has bold text with colon (format: **Title:** Description)
              // Also handle bullet point format: • **Title:** Description
              let processedLine = cleanLine
              if (processedLine.startsWith('•')) {
                processedLine = processedLine.substring(1).trim()
              }
              
              const boldMatch = processedLine.match(/\*\*(.+?)\*\*:\s*(.+)/)
              
              if (boldMatch) {
                // Split into title and description
                const title = boldMatch[1].trim()
                const description = boldMatch[2].trim()
                
                if (title && description) {
                  return (
                    <div key={index} className="insight-item">
                      <div className="insight-item-header">
                        <div className="insight-bullet-marker"></div>
                        <h4 className="insight-item-title">{title}</h4>
                      </div>
                      <p className="insight-item-description">{description}</p>
                    </div>
                  )
                }
              }
              
              // Fallback: Remove markdown bold syntax and render as plain text
              const plainText = cleanLine.replace(/\*\*(.+?)\*\*/g, '$1').trim()
              
              if (!plainText) return null
              
              return (
                <div key={index} className={`insight-line ${isBullet ? 'insight-bullet' : 'insight-paragraph'}`}>
                  {plainText}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}


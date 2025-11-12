import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import './UserGuide.css'

interface GuideStep {
  id: string
  title: string
  description: string
  target: string
  position: 'top' | 'bottom' | 'left' | 'right'
}

const guideSteps: GuideStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to QueryMind! 🎉',
    description: 'QueryMind is your intelligent data analytics assistant. Ask questions in natural language and get instant insights with beautiful visualizations, AI-powered analysis, and export capabilities.',
    target: 'header',
    position: 'bottom'
  },
  {
    id: 'theme-toggle',
    title: 'Theme Toggle',
    description: 'Switch between light and dark mode using this button. Your preference is automatically saved for your next visit.',
    target: 'theme-toggle',
    position: 'bottom'
  },
  {
    id: 'chat',
    title: 'Chat Interface',
    description: 'Ask questions about your data here. You can query for analytics, search for products, or get definitions. Your conversation history is displayed in this panel.',
    target: 'chat-panel',
    position: 'right'
  },
  {
    id: 'examples',
    title: 'Example Queries',
    description: 'Click on any example query to try it out. These examples show different types of queries you can ask: analytical, semantic search, and definitions.',
    target: 'example-queries',
    position: 'top'
  },
  {
    id: 'input',
    title: 'Query Input',
    description: 'Type your question here and press Enter or click Send. You can also use the microphone icon for voice input. QueryMind understands natural language and will generate the appropriate SQL queries or search your data.',
    target: 'chat-input-container',
    position: 'top'
  },
  {
    id: 'visualization',
    title: 'Visualization Panel',
    description: 'Your query results will appear here as interactive charts, tables, or visualizations. The system automatically selects the best visualization type for your data. Use the zoom controls to adjust the view.',
    target: 'viz-panel',
    position: 'left'
  },
  {
    id: 'export',
    title: 'Export Results',
    description: 'Export your visualization and data in multiple formats: CSV for spreadsheets, JSON for developers, PNG for images, or PDF for reports. Click the Export button to see all options.',
    target: 'export-button',
    position: 'bottom'
  },
  {
    id: 'insights',
    title: 'AI-Generated Insights',
    description: 'Get intelligent insights automatically generated from your query results. The AI analyzes patterns, trends, and anomalies to provide actionable recommendations and key findings.',
    target: 'insights-panel',
    position: 'top'
  }
]

interface UserGuideProps {
  onComplete: () => void
  isVisible: boolean
}

export default function UserGuide({ onComplete, isVisible }: UserGuideProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [highlightStyle, setHighlightStyle] = useState<React.CSSProperties>({})
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({})
  const tooltipRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isVisible) return

    const updatePosition = () => {
      const step = guideSteps[currentStep]
      let targetElement = document.querySelector(`[data-guide-target="${step.target}"]`)
      
      // Special handling for specific targets
      if (step.target === 'theme-toggle') {
        targetElement = document.querySelector('.theme-toggle-button')
      } else if (step.target === 'export-button') {
        targetElement = document.querySelector('.viz-export-button')
        // Skip export step if button is not visible (no visualization yet)
        if (!targetElement) {
          // Auto-advance to next step if element not found
          if (currentStep < guideSteps.length - 1) {
            setTimeout(() => setCurrentStep(currentStep + 1), 100)
            return
          }
        }
      } else if (step.target === 'insights-panel') {
        targetElement = document.querySelector('.insights-panel')
        // Skip insights step if panel is not visible (no insights yet)
        if (!targetElement) {
          // Auto-advance to next step if element not found
          if (currentStep < guideSteps.length - 1) {
            setTimeout(() => setCurrentStep(currentStep + 1), 100)
            return
          }
        }
      }
      
      if (!targetElement) {
        // If element not found, center the tooltip
        setHighlightStyle({ display: 'none' })
        setTooltipStyle({
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1001,
        })
        return
      }

      const rect = targetElement.getBoundingClientRect()
      const tooltipRefElement = tooltipRef.current
      const tooltipWidth = tooltipRefElement?.offsetWidth || 380
      const tooltipHeight = tooltipRefElement?.offsetHeight || 280
      const spacing = 16
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      // Set highlight position
      setHighlightStyle({
        position: 'fixed',
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        zIndex: 1000,
      })

      // Smart positioning: try preferred position first, then fallback to best available
      let preferredPosition = step.position
      let tooltipTop = 0
      let tooltipLeft = 0
      let transform = ''
      let finalPosition = preferredPosition

      // Check if preferred position has enough space
      const checkPosition = (pos: 'top' | 'bottom' | 'left' | 'right'): boolean => {
        switch (pos) {
          case 'bottom':
            return rect.bottom + spacing + tooltipHeight <= viewportHeight - spacing
          case 'top':
            return rect.top - spacing - tooltipHeight >= spacing
          case 'right':
            return rect.right + spacing + tooltipWidth <= viewportWidth - spacing
          case 'left':
            return rect.left - spacing - tooltipWidth >= spacing
          default:
            return false
        }
      }

      // Try preferred position first
      if (!checkPosition(preferredPosition)) {
        // Find best alternative position
        const positions: Array<'top' | 'bottom' | 'left' | 'right'> = ['bottom', 'top', 'right', 'left']
        for (const pos of positions) {
          if (pos !== preferredPosition && checkPosition(pos)) {
            finalPosition = pos
            break
          }
        }
      }

      // Calculate position based on final chosen position
      switch (finalPosition) {
        case 'bottom':
          tooltipTop = rect.bottom + spacing
          tooltipLeft = rect.left + (rect.width / 2)
          transform = 'translateX(-50%)'
          break
        case 'top':
          tooltipTop = rect.top - tooltipHeight - spacing
          tooltipLeft = rect.left + (rect.width / 2)
          transform = 'translateX(-50%)'
          break
        case 'right':
          tooltipTop = rect.top + (rect.height / 2)
          tooltipLeft = rect.right + spacing
          transform = 'translateY(-50%)'
          break
        case 'left':
          tooltipTop = rect.top + (rect.height / 2)
          tooltipLeft = rect.left - tooltipWidth - spacing
          transform = 'translate(-100%, -50%)'
          break
      }

      // Final boundary checks and adjustments
      if (finalPosition === 'bottom' || finalPosition === 'top') {
        // Horizontal centering with boundary checks
        if (tooltipLeft - tooltipWidth / 2 < spacing) {
          tooltipLeft = spacing + tooltipWidth / 2
        } else if (tooltipLeft + tooltipWidth / 2 > viewportWidth - spacing) {
          tooltipLeft = viewportWidth - spacing - tooltipWidth / 2
        }
      } else {
        // Vertical centering with boundary checks
        if (tooltipTop - tooltipHeight / 2 < spacing) {
          tooltipTop = spacing + tooltipHeight / 2
        } else if (tooltipTop + tooltipHeight / 2 > viewportHeight - spacing) {
          tooltipTop = viewportHeight - spacing - tooltipHeight / 2
        }
      }

      // Ensure tooltip stays within viewport
      tooltipLeft = Math.max(spacing, Math.min(tooltipLeft, viewportWidth - tooltipWidth - spacing))
      tooltipTop = Math.max(spacing, Math.min(tooltipTop, viewportHeight - tooltipHeight - spacing))

      setTooltipStyle({
        position: 'fixed',
        top: tooltipTop,
        left: tooltipLeft,
        transform: transform,
        zIndex: 1001,
      })
    }

    // Small delay to ensure DOM is ready, then update again after render to get accurate dimensions
    let timeoutId2: NodeJS.Timeout | null = null
    const timeoutId1 = setTimeout(() => {
      updatePosition()
      // Update again after a short delay to account for tooltip rendering
      timeoutId2 = setTimeout(updatePosition, 100)
    }, 50)
    
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      clearTimeout(timeoutId1)
      if (timeoutId2) clearTimeout(timeoutId2)
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [currentStep, isVisible])

  const handleNext = () => {
    if (currentStep < guideSteps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }

  const handleSkip = () => {
    handleComplete()
  }

  const handleComplete = () => {
    localStorage.setItem('querymind-guide-seen', 'true')
    onComplete()
  }

  if (!isVisible) return null

  const step = guideSteps[currentStep]

  return (
    <>
      {/* Overlay */}
      <div className="guide-overlay" onClick={handleSkip} />
      
      {/* Highlight */}
      <div className="guide-highlight" style={highlightStyle} />

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="guide-tooltip"
        style={tooltipStyle}
      >
        <div className="guide-tooltip-header">
          <h3 className="guide-tooltip-title">{step.title}</h3>
          <button className="guide-close-button" onClick={handleSkip} aria-label="Close guide">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        <p className="guide-tooltip-description">{step.description}</p>
        <div className="guide-tooltip-footer">
          <div className="guide-progress">
            {guideSteps.map((_, index) => (
              <div
                key={index}
                className={`guide-progress-dot ${index === currentStep ? 'active' : ''} ${index < currentStep ? 'completed' : ''}`}
              />
            ))}
          </div>
          <div className="guide-tooltip-actions">
            {currentStep > 0 && (
              <Button
                variant="outline"
                onClick={() => setCurrentStep(currentStep - 1)}
                className="guide-button"
              >
                Previous
              </Button>
            )}
            <Button
              onClick={handleNext}
              className="guide-button guide-button-primary"
            >
              {currentStep === guideSteps.length - 1 ? 'Get Started' : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}


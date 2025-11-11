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
    description: 'QueryMind is your intelligent data analytics assistant. Ask questions in natural language and get instant insights with beautiful visualizations.',
    target: 'header',
    position: 'bottom'
  },
  {
    id: 'chat',
    title: 'Chat Interface',
    description: 'Ask questions about your data here. You can query for analytics, search for products, or get definitions. Try the example queries below to get started!',
    target: 'chat-panel',
    position: 'right'
  },
  {
    id: 'visualization',
    title: 'Visualization Panel',
    description: 'Your query results will appear here as interactive charts, tables, or visualizations. The system automatically selects the best visualization type for your data.',
    target: 'viz-panel',
    position: 'left'
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
    description: 'Type your question here and press Enter or click Send. QueryMind understands natural language and will generate the appropriate SQL queries or search your data.',
    target: 'chat-input-container',
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
      const targetElement = document.querySelector(`[data-guide-target="${step.target}"]`)
      
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
      const scrollY = window.scrollY
      const scrollX = window.scrollX

      // Set highlight position
      setHighlightStyle({
        position: 'fixed',
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        zIndex: 1000,
      })

      // Calculate tooltip position based on step position
      let tooltipTop = 0
      let tooltipLeft = 0

      switch (step.position) {
        case 'bottom':
          tooltipTop = rect.bottom + scrollY + 20
          tooltipLeft = rect.left + scrollX + (rect.width / 2)
          break
        case 'top':
          tooltipTop = rect.top + scrollY - 220
          tooltipLeft = rect.left + scrollX + (rect.width / 2)
          break
        case 'right':
          tooltipTop = rect.top + scrollY + (rect.height / 2)
          tooltipLeft = rect.right + scrollX + 20
          break
        case 'left':
          tooltipTop = rect.top + scrollY + (rect.height / 2)
          tooltipLeft = rect.left + scrollX - 380
          break
      }

      // Adjust if tooltip would go off screen
      if (tooltipLeft < 20) tooltipLeft = 20
      if (tooltipLeft > window.innerWidth - 400) tooltipLeft = window.innerWidth - 400
      if (tooltipTop < 20) tooltipTop = 20
      if (tooltipTop > window.innerHeight + scrollY - 250) tooltipTop = window.innerHeight + scrollY - 250

      setTooltipStyle({
        position: 'absolute',
        top: tooltipTop,
        left: tooltipLeft,
        transform: step.position === 'bottom' || step.position === 'top' ? 'translateX(-50%)' : step.position === 'right' ? 'translateY(-50%)' : 'translate(-100%, -50%)',
        zIndex: 1001,
      })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition)
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


import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import VizRenderer from '@/components/VizRenderer'
import UserGuide from '@/components/UserGuide'
import VoiceInput from '@/components/VoiceInput'
import './App.css'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp?: Date
}

interface VisualizationConfig {
  type: 'bar' | 'line' | 'table' | 'map' | 'text'
  x_axis?: string
  y_axis?: string
  color?: string
}

interface CurrentViz {
  results: any[] | null
  visualization_config: VisualizationConfig | null
}

function App() {
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const [currentViz, setCurrentViz] = useState<CurrentViz>({
    results: null,
    visualization_config: null
  })

  useEffect(() => {
    // Check if user has seen the guide
    const hasSeenGuide = localStorage.getItem('querymind-guide-seen')
    if (!hasSeenGuide) {
      // Show guide after a short delay
      const timer = setTimeout(() => {
        setShowGuide(true)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [])

  const sendQuery = async (query: string) => {
    // Add user's query to messages
    setMessages(prev => [...prev, { role: 'user', content: query, timestamp: new Date() }])
    setIsLoading(true)

    try {
      // POST to the FastAPI backend
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 120000) // 2 minute timeout
      
      const response = await fetch('http://localhost:8000/api/chat/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: query,
          conversation_id: 'default',
          user_id: 'default'
        }),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }))
        throw new Error(errorData.detail?.message || errorData.detail?.error || `HTTP error! status: ${response.status}`)
      }

      // Get the JSON response (final QueryState)
      const finalState = await response.json()

      // Ensure results is always an array (backend should handle this, but double-check)
      const results = Array.isArray(finalState.results) ? finalState.results : []

      // Check for errors first - this takes priority over everything else
      if (finalState.error) {
        // Error occurred - show error message
        const errorMessage = finalState.message || `Error: ${finalState.error}`
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: errorMessage,
          timestamp: new Date()
        }])
        setCurrentViz({
          results: null,
          visualization_config: null
        })
      } else if (results.length > 0) {
        // We have results - show success message and visualization
        const successMessage = finalState.message || "Here's what I found."
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: successMessage,
          timestamp: new Date()
        }])

        // Set currentViz with results and visualization_config
        setCurrentViz({
          results: results,
          visualization_config: finalState.visualization_config || null
        })
      } else {
        // No results but no error - this means the query executed but returned empty
        const noDataMessage = finalState.message || 'No results found for your query. Please try rephrasing your question.'
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: noDataMessage,
          timestamp: new Date()
        }])
        
        // Still set visualization config if available (might be a table showing no data)
        setCurrentViz({
          results: [],
          visualization_config: finalState.visualization_config || null
        })
      }
    } catch (error) {
      console.error('Error sending query:', error)
      let errorMessage = 'Sorry, there was an error processing your query.'
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Request timed out. The query is taking too long to process. Please try again.'
        } else {
          errorMessage = error.message || errorMessage
        }
      }
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: errorMessage,
        timestamp: new Date()
      }])
      setCurrentViz({
        results: null,
        visualization_config: null
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSend = () => {
    if (message.trim()) {
      sendQuery(message)
      setMessage('')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSend()
    }
  }

  const handleVoiceTranscript = (transcript: string) => {
    setMessage(transcript.trim())
    // Automatically send the query after a short delay
    setTimeout(() => {
      if (transcript.trim()) {
        sendQuery(transcript.trim())
        setMessage('')
      }
    }, 300)
  }

  return (
    <div className="app-container">
      {/* User Guide */}
      <UserGuide isVisible={showGuide} onComplete={() => setShowGuide(false)} />

      {/* Header */}
      <header className="app-header" data-guide-target="header">
        <div className="header-content">
          <div className="logo-container">
            <div className="logo-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
            </div>
            <div className="logo-text">
              <h1 className="logo-title">QueryMind</h1>
              <p className="logo-subtitle">Intelligent Data Analytics</p>
            </div>
          </div>
          <div className="header-actions">
            <button 
              className="help-button"
              onClick={() => setShowGuide(true)}
              title="Show user guide"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 16v-4M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Help
            </button>
          </div>
        </div>
        <div className="header-divider"></div>
      </header>

      {/* Main Content */}
      <div className="app-main">
        {/* Chat Panel - 30% */}
        <div className="chat-panel" data-guide-target="chat-panel">
          <div className="chat-header">
            <div className="chat-header-icon">💬</div>
            <div>
              <h2 className="chat-title">Chat</h2>
              <p className="chat-subtitle">Ask questions about your data</p>
            </div>
          </div>
          
          <ScrollArea className="chat-messages">
            <div className="messages-container">
              {messages.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">💬</div>
                  <h3 className="empty-title">Start a conversation</h3>
                  <p className="empty-description">
                    Ask questions about your data, request visualizations, or get insights.
                  </p>
                  <div className="example-queries" data-guide-target="example-queries">
                    <p className="examples-title">Try asking:</p>
                    <div className="example-chip" onClick={() => {
                      setMessage("Top 5 highest products");
                      sendQuery("Top 5 highest products");
                    }}>
                      <span className="example-icon">📊</span>
                      <span>"Top 5 highest products"</span>
                    </div>
                    <div className="example-chip" onClick={() => {
                      setMessage("Show me the top 10 sellers by number of orders");
                      sendQuery("Show me the top 10 sellers by number of orders");
                    }}>
                      <span className="example-icon">🏆</span>
                      <span>"Top 10 sellers by orders"</span>
                    </div>
                    <div className="example-chip" onClick={() => {
                      setMessage("good quality products");
                      sendQuery("good quality products");
                    }}>
                      <span className="example-icon">✨</span>
                      <span>"Good quality products"</span>
                    </div>
                  </div>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`message ${msg.role === 'user' ? 'message-user' : 'message-assistant'}`}
                  >
                    <div className="message-content">
                      <div className="message-avatar">
                        {msg.role === 'user' ? '👤' : '🤖'}
                      </div>
                      <div className="message-text">
                        <p>{msg.content}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
              {isLoading && (
                <div className="message message-assistant">
                  <div className="message-content">
                    <div className="message-avatar">🤖</div>
                    <div className="message-text">
                      <div className="loading-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          
          {/* Chat Input Controls */}
          <div className="chat-input-container" data-guide-target="chat-input-container">
            <div className="input-wrapper">
              <svg className="input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask a question about your data..."
                className="chat-input"
                disabled={isLoading}
              />
            </div>
            <VoiceInput 
              onTranscript={handleVoiceTranscript}
              disabled={isLoading}
            />
            <Button 
              onClick={handleSend} 
              disabled={isLoading || !message.trim()}
              className="send-button"
            >
              {isLoading ? (
                <span className="button-loading">
                  <span className="spinner"></span>
                  Sending...
                </span>
              ) : (
                <>
                  Send
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1.5 1.5L14.5 8L1.5 14.5L1.5 9.5L9.5 8L1.5 6.5L1.5 1.5Z" fill="currentColor"/>
                  </svg>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Panel Divider */}
        <div className="panel-divider">
          <div className="panel-divider-handle" title="Resize panels">
            <div className="panel-divider-handle-dot"></div>
            <div className="panel-divider-handle-dot"></div>
            <div className="panel-divider-handle-dot"></div>
          </div>
        </div>

        {/* Viz Panel - 70% */}
        <div className="viz-panel" data-guide-target="viz-panel">
          <div className="viz-header">
            <div className="viz-header-left">
              <div className="viz-header-icon">📈</div>
              <div>
                <h2 className="viz-title">Visualization</h2>
                <p className="viz-subtitle">Data insights and charts</p>
              </div>
            </div>
            {currentViz.results && currentViz.results.length > 0 && (
              <div className="viz-badge">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M8 5v3l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                {currentViz.results.length} result{currentViz.results.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
          <div className="viz-content">
            <VizRenderer vizData={currentViz} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default App

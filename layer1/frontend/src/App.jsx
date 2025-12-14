import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import './App.css'

const API_BASE = '/api'

function App() {
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [sessionId, setSessionId] = useState(null)
  const [checklist, setChecklist] = useState({})
  const [isReadyToGenerate, setIsReadyToGenerate] = useState(false)
  const [datasetAvailable, setDatasetAvailable] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Add welcome message on first load
  useEffect(() => {
    setMessages([{
      type: 'bot',
      content: `👋 Welcome to the **Complaint Dataset Generator**!

I'm here to help you create a customized complaint dataset for your customer support system. This dataset will help train AI models to understand and categorize customer complaints specific to your industry.

**How it works:**
1. I'll ask you some questions about your business
2. Once I have enough information, I'll generate a dataset of realistic complaint examples
3. You can download the dataset as a CSV file

Let's get started! **What industry or domain does your business operate in?** (e.g., Finance, E-commerce, Healthcare, Restaurant, etc.)`
    }])
  }, [])

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage = inputValue.trim()
    setInputValue('')
    
    // Add user message to chat
    setMessages(prev => [...prev, { type: 'user', content: userMessage }])
    setIsLoading(true)

    try {
      const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          message: userMessage
        })
      })

      if (!response.ok) throw new Error('Failed to send message')

      const data = await response.json()
      
      setSessionId(data.session_id)
      setChecklist(data.checklist)
      setIsReadyToGenerate(data.is_ready_to_generate)
      setDatasetAvailable(data.dataset_available)
      
      // Add bot response
      setMessages(prev => [...prev, { type: 'bot', content: data.response }])
    } catch (error) {
      console.error('Error:', error)
      setMessages(prev => [...prev, { 
        type: 'error', 
        content: 'Sorry, something went wrong. Please try again.' 
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const generateDataset = async () => {
    if (!sessionId || isGenerating) return

    setIsGenerating(true)
    setMessages(prev => [...prev, { 
      type: 'bot', 
      content: '🔄 Generating your complaint dataset... This may take a moment.' 
    }])

    try {
      const response = await fetch(`${API_BASE}/generate/${sessionId}`, {
        method: 'POST'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to generate dataset')
      }

      const data = await response.json()
      setDatasetAvailable(true)
      
      setMessages(prev => [...prev, { 
        type: 'bot', 
        content: `✅ **Dataset Generated Successfully!**

Your complaint dataset is ready for download. Here's a preview:

\`\`\`
${data.preview}
\`\`\`

Click the **Download Dataset** button below to get your CSV file.`
      }])
    } catch (error) {
      console.error('Error:', error)
      setMessages(prev => [...prev, { 
        type: 'error', 
        content: `Failed to generate dataset: ${error.message}` 
      }])
    } finally {
      setIsGenerating(false)
    }
  }

  const downloadDataset = () => {
    if (!sessionId) return
    window.open(`${API_BASE}/download/${sessionId}`, '_blank')
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const getChecklistItems = () => {
    return Object.entries(checklist).map(([key, value]) => ({
      key,
      ...value
    }))
  }

  const completedCount = getChecklistItems().filter(item => item.collected).length
  const totalCount = getChecklistItems().length

  return (
    <div className="app-container">
      {/* Sidebar with checklist */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>📋 Data Checklist</h2>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
            />
          </div>
          <span className="progress-text">{completedCount}/{totalCount} completed</span>
        </div>
        
        <div className="checklist">
          {getChecklistItems().map(item => (
            <div key={item.key} className={`checklist-item ${item.collected ? 'completed' : ''}`}>
              <span className="check-icon">{item.collected ? '✓' : '○'}</span>
              <div className="check-content">
                <span className="check-label">{item.description}</span>
                {item.value && (
                  <span className="check-value">{item.value}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="sidebar-actions">
          {isReadyToGenerate && !datasetAvailable && (
            <button 
              className="btn btn-primary"
              onClick={generateDataset}
              disabled={isGenerating}
            >
              {isGenerating ? '⏳ Generating...' : '🚀 Generate Dataset'}
            </button>
          )}
          
          {datasetAvailable && (
            <button 
              className="btn btn-success"
              onClick={downloadDataset}
            >
              📥 Download Dataset
            </button>
          )}
        </div>
      </aside>

      {/* Main chat area */}
      <main className="chat-container">
        <header className="chat-header">
          <h1>🤖 Complaint Dataset Generator</h1>
          <p>AI-powered tool for creating domain-specific complaint datasets</p>
        </header>

        <div className="messages-container">
          {messages.map((msg, index) => (
            <div key={index} className={`message ${msg.type}`}>
              <div className="message-content">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="message bot">
              <div className="message-content loading">
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        <div className="input-container">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            rows={1}
            disabled={isLoading}
          />
          <button 
            className="send-btn"
            onClick={sendMessage}
            disabled={!inputValue.trim() || isLoading}
          >
            ➤
          </button>
        </div>
      </main>
    </div>
  )
}

export default App

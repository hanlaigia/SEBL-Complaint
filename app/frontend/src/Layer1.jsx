import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'

const API_BASE = '/api/layer1'

// DatasetTable component to display CSV data as table
function DatasetTable({ csvData }) {
  const lines = csvData.trim().split('\n')
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  const rows = lines.slice(1).map(line => {
    // Parse CSV properly handling quoted values
    const values = []
    let current = ''
    let inQuotes = false
    for (let char of line) {
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim().replace(/^"|"$/g, ''))
        current = ''
      } else {
        current += char
      }
    }
    values.push(current.trim().replace(/^"|"$/g, ''))
    return values
  })

  return (
    <div className="dataset-table-wrapper">
      <table className="dataset-table">
        <thead>
          <tr>
            {headers.map((header, i) => (
              <th key={i}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Layer1() {
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [sessionId, setSessionId] = useState(null)
  const [checklist, setChecklist] = useState({})
  const [isReadyToGenerate, setIsReadyToGenerate] = useState(false)
  const [datasetAvailable, setDatasetAvailable] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentDataset, setCurrentDataset] = useState(null)
  const [feedbackMode, setFeedbackMode] = useState(false)
  const [feedbackInput, setFeedbackInput] = useState('')
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [iterationCount, setIterationCount] = useState(0)
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
      content: `👋 Welcome to the **Risk Classification Dataset Generator**!

I'm here to help you create a customized risk classification dataset for your business. This dataset will help identify and categorize potential risks specific to your industry.

**How it works:**
1. I'll ask you some questions about your business
2. Once I have enough information, I'll generate a dataset with risk codes, impact scores, and descriptions
3. You can provide feedback and regenerate until you're satisfied
4. Download the final dataset as a CSV file

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
      content: '🔄 Generating your risk classification dataset... This may take a moment.' 
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
      setCurrentDataset(data.dataset)
      setIterationCount(0)
      setDatasetAvailable(true)
      setFeedbackMode(true)
      
      // Add message with dataset table
      setMessages(prev => [...prev, { 
        type: 'dataset',
        content: data.dataset,
        iteration: data.iteration
      }])
      
      // Ask for feedback
      setMessages(prev => [...prev, { 
        type: 'bot',
        content: `✅ **Dataset Generated!** (Iteration ${data.iteration})

I've generated a risk classification dataset with 20 entries for your industry. Review the table above to see the risk codes, impact scores, and descriptions.

**What do you think?** You have two options:
1. **Provide feedback** - Tell me what you'd like to change or improve, and I'll regenerate the dataset
2. **Satisfied** - Download the current dataset

What would you like to do?`
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

  const submitFeedback = async () => {
    if (!feedbackInput.trim() || isRegenerating || !sessionId) return

    const feedback = feedbackInput.trim()
    setFeedbackInput('')
    setIsRegenerating(true)

    // Add user feedback to chat
    setMessages(prev => [...prev, { 
      type: 'user', 
      content: `Feedback: ${feedback}` 
    }])

    // Show regenerating message
    setMessages(prev => [...prev, { 
      type: 'bot', 
      content: '🔄 Regenerating dataset with your feedback... This may take a moment.' 
    }])

    try {
      const response = await fetch(`${API_BASE}/regenerate/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to regenerate dataset')
      }

      const data = await response.json()
      setCurrentDataset(data.dataset)
      setIterationCount(data.iteration)

      // Add new dataset table
      setMessages(prev => [...prev, { 
        type: 'dataset',
        content: data.dataset,
        iteration: data.iteration
      }])

      // Ask for feedback again
      setMessages(prev => [...prev, { 
        type: 'bot',
        content: `✅ **Dataset Regenerated!** (Iteration ${data.iteration})

I've updated the dataset based on your feedback. Review the new table above.

**How does this look?** Would you like to:
1. **Provide more feedback** - Continue refining the dataset
2. **Satisfied** - Download this version`
      }])
    } catch (error) {
      console.error('Error:', error)
      setMessages(prev => [...prev, { 
        type: 'error', 
        content: `Failed to regenerate dataset: ${error.message}` 
      }])
    } finally {
      setIsRegenerating(false)
    }
  }

  const markSatisfied = () => {
    setFeedbackMode(false)
    setFeedbackInput('')
    setMessages(prev => [...prev, { 
      type: 'bot', 
      content: `🎉 **Great!** Your risk classification dataset is ready for download.

Click the **Download Dataset** button to save your dataset as a CSV file. You can use this for risk assessment and management in your organization.` 
    }])
  }

  const downloadDataset = () => {
    if (!sessionId) return
    window.open(`${API_BASE}/download/${sessionId}`, '_blank')
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (feedbackMode) {
        submitFeedback()
      } else {
        sendMessage()
      }
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
    <div className="layer-container">
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
          
          {datasetAvailable && !feedbackMode && (
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
          <h1>🤖 Risk Classification Generator</h1>
          <p>AI-powered tool for creating domain-specific risk classification datasets</p>
        </header>

        <div className="messages-container">
          {messages.map((msg, index) => (
            <div key={index} className={`message ${msg.type}`}>
              <div className="message-content">
                {msg.type === 'dataset' ? (
                  <DatasetTable csvData={msg.content} />
                ) : (
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                )}
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
          {feedbackMode ? (
            <>
              <textarea
                value={feedbackInput}
                onChange={(e) => setFeedbackInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Describe what you'd like to change or improve in the dataset..."
                rows={2}
                disabled={isRegenerating}
              />
              <div className="feedback-actions">
                <button 
                  className="send-btn"
                  onClick={submitFeedback}
                  disabled={!feedbackInput.trim() || isRegenerating}
                  title="Regenerate with feedback"
                >
                  🔄
                </button>
                <button 
                  className="send-btn btn-success"
                  onClick={markSatisfied}
                  disabled={isRegenerating}
                  title="Satisfied with current dataset"
                >
                  ✓
                </button>
              </div>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      </main>
    </div>
  )
}

export default Layer1

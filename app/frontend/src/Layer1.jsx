import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { useData } from './DataContext'
import DatasetTable from './DatasetTable'

const API_BASE = '/api/layer1'
const STORAGE_KEY = 'sebl_layer1_state'

// Load state from localStorage
const loadLayer1State = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return {
        messages: parsed.messages || [],
        sessionId: parsed.sessionId || null,
        checklist: parsed.checklist || {},
        isReadyToGenerate: parsed.isReadyToGenerate || false,
        datasetAvailable: parsed.datasetAvailable || false,
        currentDataset: parsed.currentDataset || null,
        feedbackMode: parsed.feedbackMode || false,
        iterationCount: parsed.iterationCount || 0
      }
    }
  } catch (error) {
    console.error('Error loading Layer1 state:', error)
  }
  return {
    messages: [],
    sessionId: null,
    checklist: {},
    isReadyToGenerate: false,
    datasetAvailable: false,
    currentDataset: null,
    feedbackMode: false,
    iterationCount: 0
  }
}

// Save state to localStorage
const saveLayer1State = (state) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (error) {
    console.error('Error saving Layer1 state:', error)
  }
}

function Layer1() {
  const { updateLayer1Data, extractDomain, layer1Data } = useData()
  const loadedState = loadLayer1State()
  
  // Load messages from context if available, otherwise from localStorage
  const initialMessages = layer1Data.messages?.length > 0 ? layer1Data.messages : loadedState.messages
  const initialChecklist = layer1Data.checklist || loadedState.checklist
  const initialDataset = layer1Data.dataset || loadedState.currentDataset
  
  const [messages, setMessages] = useState(initialMessages)
  const [inputValue, setInputValue] = useState('')
  const [sessionId, setSessionId] = useState(loadedState.sessionId)
  const [checklist, setChecklist] = useState(initialChecklist)
  const [isReadyToGenerate, setIsReadyToGenerate] = useState(loadedState.isReadyToGenerate)
  const [datasetAvailable, setDatasetAvailable] = useState(loadedState.datasetAvailable || initialDataset !== null)
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentDataset, setCurrentDataset] = useState(initialDataset)
  const [feedbackMode, setFeedbackMode] = useState(loadedState.feedbackMode)
  const [feedbackInput, setFeedbackInput] = useState('')
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [iterationCount, setIterationCount] = useState(loadedState.iterationCount)
  const messagesEndRef = useRef(null)

  // Save state to localStorage whenever it changes
  useEffect(() => {
    saveLayer1State({
      messages,
      sessionId,
      checklist,
      isReadyToGenerate,
      datasetAvailable,
      currentDataset,
      feedbackMode,
      iterationCount
    })
  }, [messages, sessionId, checklist, isReadyToGenerate, datasetAvailable, currentDataset, feedbackMode, iterationCount])

  // Update context when messages or checklist change
  useEffect(() => {
    updateLayer1Data({ messages, checklist, dataset: currentDataset })
    // Extract and update domain from messages or checklist
    const domain = extractDomain(messages, checklist)
    if (domain) {
      updateLayer1Data({ domain })
    }
  }, [messages, checklist, currentDataset, extractDomain, updateLayer1Data])
  
  // Load data from context on mount if available (only once)
  useEffect(() => {
    if (layer1Data.messages?.length > 0 && messages.length <= 1) {
      // Only load if we only have welcome message
      const hasOnlyWelcome = messages.length === 1 && messages[0]?.type === 'bot' && messages[0]?.content?.includes('Welcome')
      if (hasOnlyWelcome) {
        setMessages(layer1Data.messages)
      }
    }
    if (layer1Data.checklist && Object.keys(layer1Data.checklist).length > 0 && Object.keys(checklist).length === 0) {
      setChecklist(layer1Data.checklist)
    }
    if (layer1Data.dataset && !currentDataset) {
      setCurrentDataset(layer1Data.dataset)
      setDatasetAvailable(true)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Add welcome message on first load only if no messages exist
  useEffect(() => {
    if (messages.length === 0) {
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
    }
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
      
      // Update context with dataset
      updateLayer1Data({ dataset: data.dataset })
      
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

      // Update context with new dataset
      updateLayer1Data({ dataset: data.dataset })

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
          <h1><span className="header-icon">🤖</span> Risk Classification Generator</h1>
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

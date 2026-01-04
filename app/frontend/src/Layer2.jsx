import { useState, useRef, useEffect } from 'react'
import { FcHighPriority, FcDocument, FcBarChart } from 'react-icons/fc'
import { useData } from './DataContext'
import './App.css'

const STORAGE_KEY = 'sebl_layer2_state'

// Load state from localStorage
const loadLayer2State = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return {
        sessionId: parsed.sessionId || null,
        results: parsed.results || [],
        progress: parsed.progress || {
          status: 'pending',
          total_rows: 0,
          processed_rows: 0,
          elapsed_seconds: 0
        },
        regenerationCount: parsed.regenerationCount || 0
      }
    }
  } catch (error) {
    console.error('Error loading Layer2 state:', error)
  }
  return {
    sessionId: null,
    results: [],
    progress: {
      status: 'pending',
      total_rows: 0,
      processed_rows: 0,
      elapsed_seconds: 0
    },
    regenerationCount: 0
  }
}

// Save state to localStorage
const saveLayer2State = (state) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (error) {
    console.error('Error saving Layer2 state:', error)
  }
}

function Layer2() {
  const { updateLayer2Data, layer2Data } = useData()
  const loadedState = loadLayer2State()
  
  // Load results from context if available, otherwise from localStorage
  const initialResults = layer2Data.results?.length > 0 ? layer2Data.results : loadedState.results
  
  // File upload state
  const [complaintsFile, setComplaintsFile] = useState(null)
  const [riskTableFile, setRiskTableFile] = useState(null)
  const [sessionId, setSessionId] = useState(loadedState.sessionId)
  
  // Processing state
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(loadedState.progress)
  const [localElapsed, setLocalElapsed] = useState(0)
  
  // Results state
  const [results, setResults] = useState(initialResults)
  const [error, setError] = useState(null)
  const [feedbackMode, setFeedbackMode] = useState(false)
  const [feedbackInput, setFeedbackInput] = useState('')
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [regenerationCount, setRegenerationCount] = useState(loadedState.regenerationCount)

  // Save state to localStorage whenever it changes
  useEffect(() => {
    saveLayer2State({
      sessionId,
      results,
      progress,
      regenerationCount
    })
  }, [sessionId, results, progress, regenerationCount])
  
  // Load data from context on mount if available (only once)
  useEffect(() => {
    if (layer2Data.results?.length > 0 && results.length === 0) {
      setResults(layer2Data.results)
    }
    if (layer2Data.totalComplaints > 0 && progress.total_rows === 0) {
      setProgress(prev => ({ ...prev, total_rows: layer2Data.totalComplaints }))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  
  // Refs for file inputs
  const complaintsInputRef = useRef(null)
  const riskTableInputRef = useRef(null)
  const progressInterval = useRef(null)
  const timerInterval = useRef(null)
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current)
      }
      if (timerInterval.current) {
        clearInterval(timerInterval.current)
      }
    }
  }, [])
  
  const handleFileChange = (e, fileType) => {
    const file = e.target.files[0]
    if (file) {
      if (fileType === 'complaints') {
        setComplaintsFile(file)
      } else {
        setRiskTableFile(file)
      }
    }
  }
  
  const handleDrop = (e, fileType) => {
    e.preventDefault()
    e.stopPropagation()
    const file = e.dataTransfer.files[0]
    if (file) {
      if (fileType === 'complaints') {
        setComplaintsFile(file)
      } else {
        setRiskTableFile(file)
      }
    }
  }
  
  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }
  
  const handleUpload = async () => {
    if (!complaintsFile || !riskTableFile) {
      setError('Please upload both files')
      return
    }
    
    setError(null)
    
    const formData = new FormData()
    formData.append('complaints_file', complaintsFile)
    formData.append('risk_table_file', riskTableFile)
    
    try {
      const response = await fetch('/api/layer2/upload', {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.detail || 'Upload failed')
      }
      
      const data = await response.json()
      setSessionId(data.session_id)
      setProgress({
        status: 'pending',
        total_rows: data.complaints_count,
        processed_rows: 0,
        elapsed_seconds: 0
      })
      
      // Update context with total complaints and date created
      updateLayer2Data({
        totalComplaints: data.complaints_count,
        dateCreated: new Date().toISOString()
      })
      
    } catch (err) {
      setError(err.message)
    }
  }
  
  const startProcessing = async () => {
    if (!sessionId) return
    
    setIsProcessing(true)
    setError(null)
    setResults([])
    setLocalElapsed(0)
    
    try {
      const response = await fetch(`/api/layer2/process/${sessionId}`, {
        method: 'POST'
      })
      
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.detail || 'Failed to start processing')
      }
      
      // Start local timer that ticks every 100ms for smooth updates
      timerInterval.current = setInterval(() => {
        setLocalElapsed(prev => prev + 0.1)
      }, 100)
      
      // Start polling for progress
      progressInterval.current = setInterval(checkProgress, 500)
      
    } catch (err) {
      setIsProcessing(false)
      setError(err.message)
    }
  }
  
  const checkProgress = async () => {
    if (!sessionId) return
    
    try {
      const response = await fetch(`/api/layer2/progress/${sessionId}`)
      if (!response.ok) throw new Error('Failed to get progress')
      
      const data = await response.json()
      setProgress(data)
      
      if (data.status === 'completed') {
        clearInterval(progressInterval.current)
        clearInterval(timerInterval.current)
        progressInterval.current = null
        timerInterval.current = null
        setIsProcessing(false)
        fetchResults()
      } else if (data.status === 'error') {
        clearInterval(progressInterval.current)
        clearInterval(timerInterval.current)
        progressInterval.current = null
        timerInterval.current = null
        setIsProcessing(false)
        setError(data.error_message || 'Processing failed')
      }
      
    } catch (err) {
      console.error('Progress check failed:', err)
    }
  }
  
  const fetchResults = async () => {
    if (!sessionId) return
    
    try {
      const response = await fetch(`/api/layer2/results/${sessionId}`)
      if (!response.ok) throw new Error('Failed to fetch results')
      
      const data = await response.json()
      setResults(data.results)
      
      // Update context with new results after regeneration
      updateLayer2Data({ results: data.results })
      
    } catch (err) {
      setError(err.message)
    }
  }
  
  const handleDownload = async () => {
    if (!sessionId) return
    
    try {
      const response = await fetch(`/api/layer2/download/${sessionId}`)
      if (!response.ok) throw new Error('Download failed')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `priority_classification_${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      
    } catch (err) {
      setError(err.message)
    }
  }
  
  const submitFeedback = async () => {
    if (!feedbackInput.trim() || isRegenerating || !sessionId) return
    
    const feedback = feedbackInput.trim()
    setFeedbackInput('')
    setIsRegenerating(true)
    setError(null)
    setLocalElapsed(0)
    
    try {
      const response = await fetch(`/api/layer2/regenerate/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback })
      })
      
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.detail || 'Failed to regenerate')
      }
      
      // Start progress polling
      setProgress({
        status: 'processing',
        total_rows: progress.total_rows,
        processed_rows: 0,
        elapsed_seconds: 0
      })
      setRegenerationCount(regenerationCount + 1)
      
      // Start local timer
      timerInterval.current = setInterval(() => {
        setLocalElapsed(prev => prev + 0.1)
      }, 100)
      
      // Start polling for progress
      progressInterval.current = setInterval(checkProgress, 500)
      
    } catch (err) {
      setIsRegenerating(false)
      setError(err.message)
    }
  }
  
  const resetSession = () => {
    setComplaintsFile(null)
    setRiskTableFile(null)
    setSessionId(null)
    setIsProcessing(false)
    setProgress({
      status: 'pending',
      total_rows: 0,
      processed_rows: 0,
      elapsed_seconds: 0
    })
    setLocalElapsed(0)
    setResults([])
    setError(null)
    setFeedbackMode(false)
    setFeedbackInput('')
    setIsRegenerating(false)
    setRegenerationCount(0)
    
    // Clear context data
    updateLayer2Data({
      totalComplaints: 0,
      results: [],
      dateCreated: null
    })
    
    if (progressInterval.current) {
      clearInterval(progressInterval.current)
      progressInterval.current = null
    }
    if (timerInterval.current) {
      clearInterval(timerInterval.current)
      timerInterval.current = null
    }
  }
  
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
  }
  
  const getPriorityClass = (level) => {
    if (level.includes('P1')) return 'priority-critical'
    if (level.includes('P2')) return 'priority-high'
    if (level.includes('P3')) return 'priority-medium'
    return 'priority-low'
  }
  
  return (
    <div className="layer-container layer2-container">
      <div className="layer2-header">
        <h1>Complaint Priority Classification</h1>
        <p>Upload complaints and risk table to classify and prioritize</p>
      </div>
      
      {error && (
        <div className="layer2-error">
          <span><FcHighPriority /></span> {error}
        </div>
      )}
      
      {/* File Upload Section */}
      {!sessionId && (
        <div className="layer2-upload-section">
          <div className="upload-grid">
            <div 
              className={`upload-zone ${complaintsFile ? 'has-file' : ''}`}
              onDrop={(e) => handleDrop(e, 'complaints')}
              onDragOver={handleDragOver}
              onClick={() => complaintsInputRef.current?.click()}
            >
              <input
                type="file"
                ref={complaintsInputRef}
                onChange={(e) => handleFileChange(e, 'complaints')}
                accept=".csv"
                hidden
              />
              <div className="upload-icon"><FcDocument /></div>
              <h3>Complaints CSV</h3>
              {complaintsFile ? (
                <p className="file-name">{complaintsFile.name}</p>
              ) : (
                <p>Drop file here or click to browse</p>
              )}
            </div>
            
            <div 
              className={`upload-zone ${riskTableFile ? 'has-file' : ''}`}
              onDrop={(e) => handleDrop(e, 'riskTable')}
              onDragOver={handleDragOver}
              onClick={() => riskTableInputRef.current?.click()}
            >
              <input
                type="file"
                ref={riskTableInputRef}
                onChange={(e) => handleFileChange(e, 'riskTable')}
                accept=".csv"
                hidden
              />
              <div className="upload-icon"><FcBarChart /></div>
              <h3>Risk Table CSV</h3>
              {riskTableFile ? (
                <p className="file-name">{riskTableFile.name}</p>
              ) : (
                <p>Drop file here or click to browse</p>
              )}
            </div>
          </div>
          
          <button 
            className="upload-btn"
            onClick={handleUpload}
            disabled={!complaintsFile || !riskTableFile}
          >
            Upload Files
          </button>
        </div>
      )}
      
      {/* Session Info & Processing */}
      {sessionId && results.length === 0 && (
        <div className="layer2-processing-section">
          <div className="session-info">
            <h3>Session Ready</h3>
            <p>
              <strong>{progress.total_rows}</strong> complaints loaded
            </p>
          </div>
          
          {progress.status === 'pending' && (
            <div className="processing-actions">
              <button 
                className="process-btn"
                onClick={startProcessing}
              >
                Start Classification
              </button>
              <button 
                className="reset-btn"
                onClick={resetSession}
              >
                Reset
              </button>
            </div>
          )}
          
          {(progress.status === 'processing' || isProcessing) && (
            <div className="progress-display">
              <div className="progress-bar-container">
                <div 
                  className="progress-bar-fill"
                  style={{ 
                    width: `${progress.total_rows ? (progress.processed_rows / progress.total_rows * 100) : 0}%` 
                  }}
                />
              </div>
              <div className="progress-stats">
                <span>
                  Processing: <strong>{progress.processed_rows}</strong> / {progress.total_rows}
                </span>
                <span>
                  Elapsed: <strong>{formatTime(localElapsed)}</strong>
                </span>
              </div>
              <div className="processing-spinner">⏳ Classifying complaints...</div>
            </div>
          )}
        </div>
      )}
      
      {/* Results Section */}
      {results.length > 0 && (
        <div className="layer2-results-section">
          <div className="results-header">
            <h3>Classification Results ({results.length} complaints) {regenerationCount > 0 && `(Regenerated ${regenerationCount}x)`}</h3>
            <div className="results-actions">
              <button className="download-btn" onClick={handleDownload}>
                📥 Download CSV
              </button>
              <button className="reset-btn" onClick={resetSession}>
                New Session
              </button>
            </div>
          </div>
          
          {!feedbackMode && !isRegenerating && (
            <div className="feedback-prompt">
              <p>Are the results satisfactory? You can provide feedback to improve the classifications.</p>
              <button 
                className="feedback-toggle-btn"
                onClick={() => setFeedbackMode(true)}
              >
                ✏️ Provide Feedback
              </button>
            </div>
          )}
          
          {(feedbackMode || isRegenerating) && (
            <div className="feedback-section">
              {isRegenerating ? (
                <>
                  <div className="progress-display">
                    <div className="progress-bar-container">
                      <div 
                        className="progress-bar-fill"
                        style={{ 
                          width: `${progress.total_rows ? (progress.processed_rows / progress.total_rows * 100) : 0}%` 
                        }}
                      />
                    </div>
                    <div className="progress-stats">
                      <span>
                        Re-processing: <strong>{progress.processed_rows}</strong> / {progress.total_rows}
                      </span>
                      <span>
                        Elapsed: <strong>{formatTime(localElapsed)}</strong>
                      </span>
                    </div>
                    <div className="processing-spinner">🔄 Regenerating with feedback...</div>
                  </div>
                </>
              ) : (
                <>
                  <h4>Feedback for Improvement</h4>
                  <p>Tell me what you'd like to improve or change in the classifications:</p>
                  <textarea
                    className="feedback-textarea"
                    value={feedbackInput}
                    onChange={(e) => setFeedbackInput(e.target.value)}
                    placeholder="Example: The complaints about room cleanliness should be marked as P1 Critical, not P2. Also, increase urgency scores for service quality issues..."
                    rows="4"
                  />
                  <div className="feedback-actions">
                    <button
                      className="regenerate-btn"
                      onClick={submitFeedback}
                      disabled={!feedbackInput.trim() || isRegenerating}
                    >
                      🔄 Regenerate with Feedback
                    </button>
                    <button
                      className="cancel-btn"
                      onClick={() => {
                        setFeedbackMode(false)
                        setFeedbackInput('')
                      }}
                      disabled={isRegenerating}
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
          
          <div className="results-table-container">
            <table className="results-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Complaint</th>
                  <th>Risk Code</th>
                  <th>Risk Description</th>
                  <th>Impact</th>
                  <th>Urgency</th>
                  <th>Frequency</th>
                  <th>Controllability</th>
                  <th>Priority Score</th>
                  <th>Priority Level</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, index) => (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td className="complaint-cell" title={result.complaint}>
                      {result.complaint.length > 100 
                        ? result.complaint.substring(0, 100) + '...' 
                        : result.complaint}
                    </td>
                    <td><code>{result.risk_code}</code></td>
                    <td>{result.risk_description}</td>
                    <td className="score-cell">{result.impact_score}</td>
                    <td className="score-cell">{result.urgency_score}</td>
                    <td className="score-cell">{result.frequency_score}</td>
                    <td className="score-cell">{result.controllability_score}</td>
                    <td className="score-cell">{result.priority_score}</td>
                    <td className={`priority-cell ${getPriorityClass(result.priority_level)}`}>
                      {result.priority_level}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}


export default Layer2

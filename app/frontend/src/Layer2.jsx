import { useState, useRef, useEffect } from 'react'
import './App.css'

function Layer2() {
  // File upload state
  const [complaintsFile, setComplaintsFile] = useState(null)
  const [riskTableFile, setRiskTableFile] = useState(null)
  const [sessionId, setSessionId] = useState(null)
  
  // Processing state
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState({
    status: 'pending',
    total_rows: 0,
    processed_rows: 0,
    elapsed_seconds: 0
  })
  const [localElapsed, setLocalElapsed] = useState(0)
  
  // Results state
  const [results, setResults] = useState([])
  const [error, setError] = useState(null)
  
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
          <span>⚠️</span> {error}
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
              <div className="upload-icon">📋</div>
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
              <div className="upload-icon">📊</div>
              <h3>Risk Table CSV (Layer 1 Output)</h3>
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
            <h3>Classification Results ({results.length} complaints)</h3>
            <div className="results-actions">
              <button className="download-btn" onClick={handleDownload}>
                📥 Download CSV
              </button>
              <button className="reset-btn" onClick={resetSession}>
                New Session
              </button>
            </div>
          </div>
          
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

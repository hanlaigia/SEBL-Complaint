import { useState } from 'react'
import Layer1 from './Layer1'
import Layer2 from './Layer2'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState('layer1')

  return (
    <div className="app-container">
      {/* Tab Navigation */}
      <nav className="tab-navigation">
        <div className="tab-list">
          <button 
            className={`tab-button ${activeTab === 'layer1' ? 'active' : ''}`}
            onClick={() => setActiveTab('layer1')}
          >
            <span className="tab-icon">📊</span>
            <span className="tab-label">Layer 1</span>
            <span className="tab-subtitle">Risk Classification</span>
          </button>
          <button 
            className={`tab-button ${activeTab === 'layer2' ? 'active' : ''}`}
            onClick={() => setActiveTab('layer2')}
          >
            <span className="tab-icon">🎯</span>
            <span className="tab-label">Layer 2</span>
            <span className="tab-subtitle">Priority Classification</span>
          </button>
        </div>
      </nav>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'layer1' && <Layer1 />}
        {activeTab === 'layer2' && <Layer2 />}
      </div>
    </div>
  )
}

export default App

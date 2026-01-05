import { useState } from 'react'
import { FcComments, FcDatabase, FcStatistics } from 'react-icons/fc'
import Layer1 from './Layer1'
import Layer2 from './Layer2'
import Dashboard from './Dashboard'
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
            <span className="tab-icon"><FcComments /></span>
            <span className="tab-label">Chatbot</span>
          </button>
          <button 
            className={`tab-button ${activeTab === 'layer2' ? 'active' : ''}`}
            onClick={() => setActiveTab('layer2')}
          >
            <span className="tab-icon"><FcDatabase /></span>
            <span className="tab-label">Database</span>
          </button>
          <button 
            className={`tab-button ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <span className="tab-icon"><FcStatistics /></span>
            <span className="tab-label">Dashboard</span>
          </button>
        </div>
      </nav>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'layer1' && <Layer1 />}
        {activeTab === 'layer2' && <Layer2 />}
        {activeTab === 'dashboard' && <Dashboard />}
      </div>
    </div>
  )
}

export default App

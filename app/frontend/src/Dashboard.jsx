import { FcBarChart, FcDocument, FcHighPriority, FcCalendar, FcBusiness } from 'react-icons/fc'
import { useData } from './DataContext'
import DatasetTable from './DatasetTable'

function Dashboard() {
  const { layer1Data, layer2Data, extractDomain } = useData()

  // Extract domain from messages or checklist if not already set
  const domain = layer1Data.domain || extractDomain(layer1Data.messages, layer1Data.checklist) || 'Not specified'
  
  const totalComplaints = layer2Data.totalComplaints || 0
  const criticalComplaints = layer2Data.results?.filter(r => r.priority_level?.includes('P1')).length || 0
  const dateCreated = layer2Data.dateCreated ? new Date(layer2Data.dateCreated).toLocaleDateString() : 'Not created yet'

  const hasLayer1Data = layer1Data.dataset !== null
  const hasLayer2Data = layer2Data.results.length > 0

  const hasData = hasLayer1Data || hasLayer2Data

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1><span className="header-icon"><FcBarChart /></span> Dashboard</h1>
        <p>Overview of your risk classification and complaint analysis</p>
      </div>

      {!hasData ? (
        <div className="dashboard-empty">
          <div className="empty-icon"><FcDocument /></div>
          <h2>No Data Available</h2>
          <p>Please complete Layer 1 and Layer 2 first to view the dashboard.</p>
          <div className="empty-steps">
            <div className="empty-step">
              <span className="step-number">1</span>
              <span>Go to <strong>Layer 1</strong> tab and generate a risk classification dataset</span>
            </div>
            <div className="empty-step">
              <span className="step-number">2</span>
              <span>Go to <strong>Layer 2</strong> tab and classify your complaints</span>
            </div>
            <div className="empty-step">
              <span className="step-number">3</span>
              <span>Return here to view your dashboard</span>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Cards Section */}
          <div className="dashboard-cards">
            <div className="dashboard-card">
              <div className="card-icon"><FcBusiness /></div>
              <div className="card-content">
                <h3>Domain</h3>
                <p className="card-value">{domain}</p>
              </div>
            </div>

            <div className="dashboard-card">
              <div className="card-icon"><FcDocument /></div>
              <div className="card-content">
                <h3>Total Complaints</h3>
                <p className="card-value">{totalComplaints}</p>
              </div>
            </div>

            <div className="dashboard-card">
              <div className="card-icon"><FcHighPriority /></div>
              <div className="card-content">
                <h3>Critical Complaints</h3>
                <p className="card-value">{criticalComplaints}</p>
              </div>
            </div>

            <div className="dashboard-card">
              <div className="card-icon"><FcCalendar /></div>
              <div className="card-content">
                <h3>Date Created</h3>
                <p className="card-value">{dateCreated}</p>
              </div>
            </div>
          </div>

          {/* Tables Section */}
          <div className="dashboard-tables">
            {hasLayer1Data && (
              <div className="dashboard-table-section layer1-table-section">
                <h2>Layer 1 - Risk Classification Dataset</h2>
                <DatasetTable csvData={layer1Data.dataset} />
              </div>
            )}

            {hasLayer2Data && (
              <div className="dashboard-table-section">
                <h2>Layer 2 - Priority Classification Results</h2>
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
                      {layer2Data.results.map((result, index) => (
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
        </>
      )}
    </div>
  )
}

function getPriorityClass(level) {
  if (!level) return 'priority-low'
  if (level.includes('P1')) return 'priority-critical'
  if (level.includes('P2')) return 'priority-high'
  if (level.includes('P3')) return 'priority-medium'
  return 'priority-low'
}

export default Dashboard


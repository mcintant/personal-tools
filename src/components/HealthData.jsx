import React, { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { addHealthData, getAllHealthData, deleteHealthData, getHealthDataTypes } from '../utils/healthDB'
import SleepAnalysis from './SleepAnalysis'
import './HealthData.css'

function HealthData() {
  const [activeSection, setActiveSection] = useState(() => {
    // Load saved section from localStorage
    const savedSection = localStorage.getItem('koboHealthActiveSection')
    return savedSection || 'tracker'
  })
  const [healthData, setHealthData] = useState([])
  const [dataTypes, setDataTypes] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Form state
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'weight',
    value: '',
    notes: ''
  })

  // Save active section to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('koboHealthActiveSection', activeSection)
  }, [activeSection])

  // Load health data on mount
  useEffect(() => {
    loadHealthData()
  }, [])

  const loadHealthData = async () => {
    try {
      setLoading(true)
      const data = await getAllHealthData()
      setHealthData(data)
      
      const types = await getHealthDataTypes()
      setDataTypes(types.length > 0 ? types : ['weight', 'blood_pressure', 'heart_rate', 'steps', 'calories', 'sleep_hours'])
    } catch (error) {
      console.error('Error loading health data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.value || !formData.type) {
      alert('Please fill in all required fields')
      return
    }

    try {
      await addHealthData({
        date: formData.date,
        type: formData.type,
        value: parseFloat(formData.value) || formData.value,
        notes: formData.notes
      })
      
      // Reset form
      setFormData({
        date: new Date().toISOString().split('T')[0],
        type: formData.type, // Keep the same type
        value: '',
        notes: ''
      })
      
      // Reload data
      await loadHealthData()
    } catch (error) {
      console.error('Error adding health data:', error)
      alert('Failed to add health data')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this entry?')) {
      return
    }

    try {
      await deleteHealthData(id)
      await loadHealthData()
    } catch (error) {
      console.error('Error deleting health data:', error)
      alert('Failed to delete health data')
    }
  }

  // Prepare data for charts
  const prepareChartData = (type) => {
    const filtered = healthData
      .filter(entry => entry.type === type)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(-30) // Last 30 entries
    
    return filtered.map(entry => ({
      date: new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: typeof entry.value === 'number' ? entry.value : parseFloat(entry.value) || 0,
      fullDate: entry.date
    }))
  }

  const getTypeLabel = (type) => {
    const labels = {
      weight: 'Weight (lbs)',
      blood_pressure: 'Blood Pressure',
      heart_rate: 'Heart Rate (bpm)',
      steps: 'Steps',
      calories: 'Calories',
      sleep_hours: 'Sleep Hours',
      blood_sugar: 'Blood Sugar (mg/dL)',
      temperature: 'Temperature (°F)'
    }
    return labels[type] || type
  }

  const formatValue = (value, type) => {
    if (type === 'blood_pressure' && typeof value === 'string') {
      return value
    }
    if (typeof value === 'number') {
      return value.toFixed(1)
    }
    return value
  }

  // Group data by type for display
  const dataByType = {}
  healthData.forEach(entry => {
    if (!dataByType[entry.type]) {
      dataByType[entry.type] = []
    }
    dataByType[entry.type].push(entry)
  })

  return (
    <div className="health-data-container">
      <div className="health-header">
        <h2>💊 Health Data Tracker</h2>
        <p>Track and visualize your health metrics</p>
      </div>

      {/* Section Tabs */}
      <div className="health-section-tabs">
        <button
          className={`section-tab ${activeSection === 'tracker' ? 'active' : ''}`}
          onClick={() => setActiveSection('tracker')}
        >
          📊 Manual Tracker
        </button>
        <button
          className={`section-tab ${activeSection === 'sleep' ? 'active' : ''}`}
          onClick={() => setActiveSection('sleep')}
        >
          😴 Sleep Analysis
        </button>
      </div>

      {activeSection === 'sleep' ? (
        <React.Suspense fallback={<div className="loading">Loading sleep analysis...</div>}>
          <SleepAnalysis />
        </React.Suspense>
      ) : (
        <>
          {/* Data Entry Form */}
          <div className="health-form-section">
        <h3>Add Health Data</h3>
        <form onSubmit={handleSubmit} className="health-form">
          <div className="form-row">
            <div className="form-group">
              <label>Date:</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Type:</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                required
                className="form-input"
              >
                <option value="weight">Weight (lbs)</option>
                <option value="blood_pressure">Blood Pressure</option>
                <option value="heart_rate">Heart Rate (bpm)</option>
                <option value="steps">Steps</option>
                <option value="calories">Calories</option>
                <option value="sleep_hours">Sleep Hours</option>
                <option value="blood_sugar">Blood Sugar (mg/dL)</option>
                <option value="temperature">Temperature (°F)</option>
              </select>
            </div>

            <div className="form-group">
              <label>Value:</label>
              <input
                type="text"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                placeholder={formData.type === 'blood_pressure' ? 'e.g., 120/80' : 'Enter value'}
                required
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Notes (optional):</label>
            <input
              type="text"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes..."
              className="form-input"
            />
          </div>

          <button type="submit" className="submit-button">
            Add Entry ➕
          </button>
        </form>
          </div>

              {/* Charts */}
          {loading ? (
            <div className="loading">Loading health data...</div>
          ) : healthData.length === 0 ? (
            <div className="no-data">
              <p>No health data yet. Add your first entry above!</p>
            </div>
          ) : (
            <>
                  {/* Charts for each data type */}
              {Object.keys(dataByType).map(type => {
            const chartData = prepareChartData(type)
            if (chartData.length === 0) return null

            const isNumeric = chartData.every(d => typeof d.value === 'number' && !isNaN(d.value))
            
                return (
                  <div key={type} className="chart-section">
                    <h3>{getTypeLabel(type)}</h3>
                    <div className="chart-container">
                      <ResponsiveContainer width="100%" height={300}>
                        {isNumeric ? (
                          <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line 
                              type="monotone" 
                              dataKey="value" 
                              stroke="#667eea" 
                              strokeWidth={2}
                              dot={{ r: 4 }}
                              name={getTypeLabel(type)}
                            />
                          </LineChart>
                        ) : (
                          <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="value" fill="#667eea" name={getTypeLabel(type)} />
                          </BarChart>
                        )}
                      </ResponsiveContainer>
                    </div>
                  </div>
                )
              })}

              {/* Recent Entries Table */}
              <div className="recent-entries">
            <h3>Recent Entries</h3>
            <div className="entries-table">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Value</th>
                    <th>Notes</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {healthData.slice(0, 20).map(entry => (
                    <tr key={entry.id}>
                      <td>{new Date(entry.date).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })}</td>
                      <td>{getTypeLabel(entry.type)}</td>
                      <td>{formatValue(entry.value, entry.type)}</td>
                      <td>{entry.notes || '-'}</td>
                      <td>
                        <button 
                          className="delete-button"
                          onClick={() => handleDelete(entry.id)}
                          title="Delete entry"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

export default HealthData


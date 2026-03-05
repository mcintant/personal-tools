import React from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

function SessionTimesChart({ data }) {
  if (!data || data.length === 0) {
    return <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
      No session data available
    </div>
  }

  // Group sessions by date and calculate total duration per day
  const sessionsByDate = new Map()
  
  data.forEach(session => {
    const date = session.date
    const current = sessionsByDate.get(date) || { date, totalMinutes: 0, count: 0 }
    current.totalMinutes += session.duration
    current.count += 1
    sessionsByDate.set(date, current)
  })

  const chartData = Array.from(sessionsByDate.values())
    .map(item => ({
      date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      minutes: Math.round(item.totalMinutes),
      sessions: item.count
    }))
    .sort((a, b) => new Date(a.date) - new Date(b.date))

  return (
    <div>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis 
            dataKey="date" 
            stroke="#666"
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis 
            stroke="#666"
            label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #ccc',
              borderRadius: '8px'
            }}
            formatter={(value, name) => {
              if (name === 'minutes') {
                const hours = Math.floor(value / 60)
                const mins = value % 60
                return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
              }
              return value
            }}
          />
          <Legend />
          <Bar 
            dataKey="minutes" 
            fill="#764ba2" 
            name="Reading Time (minutes)"
            radius={[8, 8, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
      
      <div style={{ marginTop: '20px', padding: '15px', background: '#f0f0f0', borderRadius: '8px' }}>
        <h3 style={{ marginBottom: '10px', fontSize: '1rem', color: '#333' }}>Session Details</h3>
        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
          {data.slice(-20).reverse().map((session, idx) => (
            <div key={idx} style={{ 
              padding: '8px', 
              marginBottom: '5px', 
              background: 'white', 
              borderRadius: '4px',
              fontSize: '0.9rem'
            }}>
              <strong>{new Date(session.date).toLocaleDateString()}</strong> at {session.startTime} - 
              {' '}{Math.floor(session.duration / 60)}h {session.duration % 60}m
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default SessionTimesChart




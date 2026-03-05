import React from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

function ReadingProgressChart({ data }) {
  if (!data || data.length === 0) {
    return <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
      No reading data available
    </div>
  }

  // Format data for chart
  const chartData = data.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    pages: item.pages
  }))

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
          label={{ value: 'Pages', angle: -90, position: 'insideLeft' }}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid #ccc',
            borderRadius: '8px'
          }}
        />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="pages" 
          stroke="#667eea" 
          strokeWidth={2}
          dot={{ fill: '#667eea', r: 4 }}
          name="Pages Read"
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

export default ReadingProgressChart




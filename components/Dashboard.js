
'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'

export default function Dashboard() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState('unsolved')
  const [zones, setZones] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchZones()
  }, [activeTab])

  const fetchZones = async () => {
    try {
      const response = await fetch(`/api/zones?status=${activeTab}`)
      const data = await response.json()
      setZones(data)
    } catch (error) {
      console.error('Error fetching zones:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'complete': return 'Complete'
      case 'rejected': return 'Rejected'
      case 'inprogress': return 'In Progress'
      default: return 'Pending'
    }
  }

  const getStatusClass = (status) => {
    switch (status) {
      case 'complete': return 'status-complete'
      case 'rejected': return 'status-rejected'
      case 'inprogress': return 'status-inprogress'
      default: return 'status-pending'
    }
  }

  return (
    <div>
      <header className="header">
        <div className="header-content">
          <h1>Zone Photo Tracker</h1>
          <div className="user-info">
            <span>Welcome, {session?.user?.name || session?.user?.email}</span>
            <span className="role-badge">({session?.user?.role})</span>
            {session?.user?.assignedZone && (
              <span className="zone-badge">Zone {session.user.assignedZone}</span>
            )}
            <button className="logout-btn" onClick={() => signOut()}>
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="main-content">
        <div className="dashboard">
          <h2>Zone Management Dashboard</h2>

          <div className="tabs">
            <button 
              className={`tab ${activeTab === 'unsolved' ? 'active' : ''}`}
              onClick={() => setActiveTab('unsolved')}
            >
              Unsolved
            </button>
            <button 
              className={`tab ${activeTab === 'complete' ? 'active' : ''}`}
              onClick={() => setActiveTab('complete')}
            >
              Completed
            </button>
            <button 
              className={`tab ${activeTab === 'rejected' ? 'active' : ''}`}
              onClick={() => setActiveTab('rejected')}
            >
              Rejected
            </button>
          </div>

          {loading ? (
            <div className="loading">Loading zones...</div>
          ) : (
            <div className="zone-grid">
              {zones.map((zone) => (
                <Link key={zone.id} href={`/zones/${zone.id}`} className="zone-card">
                  <h3>Zone {zone.id}</h3>
                  <div className="zone-status">
                    <span className={`status-indicator ${getStatusClass(zone.status)}`}>
                      {getStatusText(zone.status)}
                    </span>
                  </div>
                  <p style={{ color: '#7f8c8d', marginTop: '10px' }}>
                    Work Records: {zone.workCount || 0}
                  </p>
                  <p style={{ color: '#7f8c8d', fontSize: '0.9rem' }}>
                    Last Updated: {zone.lastUpdated || 'N/A'}
                  </p>
                </Link>
              ))}
            </div>
          )}

          {!loading && zones.length === 0 && (
            <div style={{ textAlign: 'center', padding: '50px', color: '#7f8c8d' }}>
              <h3>No zones found for this category</h3>
              <p>Switch to another tab to see more zones.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

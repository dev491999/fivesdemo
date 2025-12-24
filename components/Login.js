
'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'

export default function Login() {
  const [credentials, setCredentials] = useState({
    email: '',
    password: '',
    role: 'user'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        email: credentials.email,
        password: credentials.password,
        role: credentials.role,
        redirect: false
      })

      if (result?.error) {
        setError('Invalid credentials')
      }
    } catch (err) {
      setError('Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleSubmit}>
        <h2>Zone Photo Tracker</h2>

        {error && (
          <div className="notification error">{error}</div>
        )}

        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            value={credentials.email}
            onChange={(e) => setCredentials(prev => ({...prev, email: e.target.value}))}
            required
          />
        </div>

        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            value={credentials.password}
            onChange={(e) => setCredentials(prev => ({...prev, password: e.target.value}))}
            required
          />
        </div>

        <div className="form-group">
          <label>Role</label>
          <select
            value={credentials.role}
            onChange={(e) => setCredentials(prev => ({...prev, role: e.target.value}))}
          >
            <option value="user">User</option>
            <option value="zone_manager">Zone Manager</option>
            <option value="ceo">CEO</option>
          </select>
        </div>

        <button 
          type="submit" 
          className="submit-btn" 
          disabled={loading}
        >
          {loading ? 'Signing In...' : 'Sign In'}
        </button>

        <div style={{ marginTop: '20px', fontSize: '0.9rem', color: '#7f8c8d' }}>
          <p><strong>Test Credentials:</strong></p>
          <p>CEO: raghawendra.joshi@enproindia.com / password</p>
          <p>Manager 1: rahulujoshi@rediffmail.com / password</p>
          <p>User: rahulujoshi75@gmail.com / password</p>
        </div>
      </form>
    </div>
  )
}

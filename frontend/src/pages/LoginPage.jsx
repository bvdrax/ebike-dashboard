import { useState } from 'react'
import { api } from '../lib/api.js'
import { useAuth } from '../lib/auth.jsx'

export default function LoginPage() {
  const { login } = useAuth()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    const data = new FormData(e.target)
    const username = data.get('username')
    const password = data.get('password')
    setError('')
    setLoading(true)
    try {
      const data = await api.login(username, password)
      login(data.token, data.user)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%',
    background: 'var(--surface-3)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '0.55rem 0.75rem',
    color: 'var(--text)',
    fontSize: '0.875rem',
    outline: 'none',
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
    }}>
      <div style={{ width: '100%', maxWidth: '360px' }}>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.5rem',
          letterSpacing: '0.1em',
          textAlign: 'center',
          marginBottom: '2rem',
          color: 'var(--text)',
        }}>
          EBIKE DASHBOARD
        </h1>
        <form onSubmit={submit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="label" style={{ display: 'block', marginBottom: '0.35rem' }}>Username</label>
            <input
              type="text"
              name="username"
              style={inputStyle}
              autoFocus
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
            />
          </div>
          <div>
            <label className="label" style={{ display: 'block', marginBottom: '0.35rem' }}>Password</label>
            <input
              type="password"
              name="password"
              style={inputStyle}
              autoComplete="current-password"
            />
          </div>
          {error && <div style={{ color: 'var(--red)', fontSize: '0.875rem' }}>{error}</div>}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ justifyContent: 'center' }}
          >
            {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}

import { useState, useRef, useEffect } from 'react'
import { AuthProvider, useAuth } from './lib/auth.jsx'
import { api } from './lib/api.js'
import DashboardPage from './pages/DashboardPage.jsx'
import AdminPage from './pages/AdminPage.jsx'
import LoginPage from './pages/LoginPage.jsx'

function NavButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? 'var(--surface-3)' : 'none',
        border: active ? '1px solid var(--border-bright)' : '1px solid transparent',
        color: active ? 'var(--text)' : 'var(--text-muted)',
        borderRadius: 'var(--radius)',
        padding: '0.35rem 0.875rem',
        fontSize: '0.875rem',
        cursor: 'pointer',
        fontFamily: 'var(--font-body)',
      }}
    >
      {children}
    </button>
  )
}

function ChangePasswordModal({ onClose }) {
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    const current = e.target.current_password.value
    const next = e.target.new_password.value
    const confirm = e.target.confirm_password.value
    if (next !== confirm) { setError('New passwords do not match'); return }
    if (next.length < 4) { setError('Password must be at least 4 characters'); return }
    setError(''); setSaving(true)
    try {
      await api.changePassword(current, next)
      setDone(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = {
    width: '100%', background: 'var(--surface-3)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', padding: '0.55rem 0.75rem',
    color: 'var(--text)', fontSize: '0.875rem', outline: 'none',
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 100, padding: '1rem',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'var(--surface-1)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '1.5rem', width: '100%', maxWidth: '360px',
      }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', letterSpacing: '0.05em', marginBottom: '1.25rem' }}>
          CHANGE PASSWORD
        </h2>
        {done ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ color: 'var(--green)', fontSize: '0.875rem' }}>✓ Password updated successfully.</div>
            <button className="btn btn-primary" onClick={onClose}>Close</button>
          </div>
        ) : (
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <div>
              <label className="label" style={{ display: 'block', marginBottom: '0.35rem' }}>Current Password</label>
              <input type="password" name="current_password" style={inputStyle} autoComplete="current-password" autoCapitalize="none" autoCorrect="off" />
            </div>
            <div>
              <label className="label" style={{ display: 'block', marginBottom: '0.35rem' }}>New Password</label>
              <input type="password" name="new_password" style={inputStyle} autoComplete="new-password" autoCapitalize="none" autoCorrect="off" />
            </div>
            <div>
              <label className="label" style={{ display: 'block', marginBottom: '0.35rem' }}>Confirm New Password</label>
              <input type="password" name="confirm_password" style={inputStyle} autoComplete="new-password" autoCapitalize="none" autoCorrect="off" />
            </div>
            {error && <div style={{ color: 'var(--red)', fontSize: '0.8rem' }}>{error}</div>}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <span className="spinner" style={{ width: 14, height: 14 }} /> : 'Update Password'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

function AppShell() {
  const { user, loading, logout } = useAuth()
  const [page, setPage] = useState('dashboard')
  const [showMenu, setShowMenu] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div className="spinner" />
    </div>
  )

  if (!user) return <LoginPage />

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <nav style={{
        background: 'var(--surface-1)',
        borderBottom: '1px solid var(--border)',
        padding: '0 1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        height: '52px',
      }}>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: '0.85rem',
          letterSpacing: '0.1em',
          color: 'var(--text-muted)',
          flex: 1,
        }}>
          EBIKE DASHBOARD
        </span>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          <NavButton active={page === 'dashboard'} onClick={() => setPage('dashboard')}>
            Dashboard
          </NavButton>
          {user.role === 'admin' && (
            <NavButton active={page === 'admin'} onClick={() => setPage('admin')}>
              Admin
            </NavButton>
          )}
        </div>
        <div ref={menuRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setShowMenu(m => !m)}
            style={{
              background: 'none', border: 'none', color: 'var(--text-muted)',
              fontSize: '0.8rem', cursor: 'pointer', padding: '0.25rem 0.5rem',
              fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: '0.3rem',
            }}
          >
            {user.display_name} <span style={{ fontSize: '0.6rem' }}>▾</span>
          </button>
          {showMenu && (
            <div style={{
              position: 'absolute', right: 0, top: 'calc(100% + 4px)',
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', minWidth: '160px', zIndex: 50,
              boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            }}>
              {[
                { label: 'Change Password', action: () => { setShowMenu(false); setShowChangePassword(true) } },
                { label: 'Sign out', action: logout, danger: true },
              ].map(item => (
                <button key={item.label} onClick={item.action} style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  background: 'none', border: 'none', padding: '0.6rem 1rem',
                  fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'var(--font-body)',
                  color: item.danger ? 'var(--red)' : 'var(--text)',
                }}>
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
        {showChangePassword && <ChangePasswordModal onClose={() => setShowChangePassword(false)} />}
      </nav>
      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        {page === 'dashboard' && <DashboardPage />}
        {page === 'admin' && user.role === 'admin' && <AdminPage />}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  )
}

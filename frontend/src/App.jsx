import { useState } from 'react'
import { AuthProvider, useAuth } from './lib/auth.jsx'
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

function AppShell() {
  const { user, loading, logout } = useAuth()
  const [page, setPage] = useState('dashboard')

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
        <button
          onClick={logout}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: '0.8rem',
            cursor: 'pointer',
            padding: '0.25rem 0.5rem',
            fontFamily: 'var(--font-body)',
          }}
        >
          {user.display_name} · Sign out
        </button>
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

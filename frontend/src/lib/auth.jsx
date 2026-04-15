import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('auth')
    if (stored) {
      try {
        const { user: u } = JSON.parse(stored)
        setUser(u)
      } catch {}
    }
    setLoading(false)
  }, [])

  const login = (token, userData) => {
    localStorage.setItem('auth', JSON.stringify({ token, user: userData }))
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem('auth')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

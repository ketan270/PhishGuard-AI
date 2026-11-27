import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import api, { setUnauthorizedHandler } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('pg_token'))
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('pg_user')) } catch { return null }
  })

  const logout = useCallback(() => {
    localStorage.removeItem('pg_token')
    localStorage.removeItem('pg_user')
    setToken(null)
    setUser(null)
  }, [])

  const login = useCallback((newToken, userData) => {
    localStorage.setItem('pg_token', newToken)
    localStorage.setItem('pg_user', JSON.stringify(userData))
    setToken(newToken)
    setUser(userData)
  }, [])

  useEffect(() => { setUnauthorizedHandler(logout) }, [logout])

  // Validate the stored token once on load (token may have expired or DB been reset)
  useEffect(() => {
    if (!token) return
    api.get('/auth/me').then((r) => {
      setUser(r.data)
      localStorage.setItem('pg_user', JSON.stringify(r.data))
    }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const value = useMemo(() => ({ token, user, login, logout, isAuthed: !!token }), [token, user, login, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)

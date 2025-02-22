import React, { createContext, useContext, useState, useEffect } from 'react'
import { User, auth } from '../lib/api'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  error: string | null
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider ({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      fetchUser()
    } else {
      setIsLoading(false)
    }
  }, [])

  const fetchUser = async () => {
    try {
      const userData = await auth.getUser()
      setUser(userData)
      setError(null)
    } catch (err) {
      console.error('Failed to fetch user:', err)
      setError('Failed to fetch user data')
      localStorage.removeItem('token')
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (username: string, password: string) => {
    try {
      setIsLoading(true)
      const response = await auth.login({ username, password })
      localStorage.setItem('token', response.access_token)
      await fetchUser()
    } catch (err) {
      console.error('Login failed:', err)
      setError('Invalid username or password')
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
    setError(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth () {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function useRequireAuth () {
  const auth = useAuth()

  useEffect(() => {
    if (!auth.isLoading && !auth.user) {
      // Redirect to login if not authenticated
      window.location.href = '/login'
    }
  }, [auth.isLoading, auth.user])

  return auth
}

// contexts/AuthContext.tsx
'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import api from '../lib/api'

interface AdminUser {
  id: number
  email: string
  role: 'super_admin' | 'accountant' | 'technical' | 'readonly'
  created_at: string
}

interface AuthContextType {
  user: AdminUser | null
  token: string | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshToken: () => Promise<boolean>
  isAuthenticated: boolean
  hasRole: (roles: string | string[]) => boolean
  hasPermission: (permission: string) => boolean
  hasAnyPermission: (permissions: string | string[]) => boolean
  hasAllPermissions: (permissions: string | string[]) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check for existing session on mount
    const storedToken = localStorage.getItem('admin_token')
    const storedUser = localStorage.getItem('admin_user')
    
    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser)
        setToken(storedToken)
        setUser(parsedUser)
        api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`
        console.log('Session restored for:', parsedUser.email)
      } catch (error) {
        console.error('Failed to restore session:', error)
        localStorage.removeItem('admin_token')
        localStorage.removeItem('admin_user')
        localStorage.removeItem('admin_refresh_token')
      }
    }
    setIsLoading(false)
  }, [])

  const refreshToken = async (): Promise<boolean> => {
    try {
      const storedRefreshToken = localStorage.getItem('admin_refresh_token')
      
      if (!storedRefreshToken) {
        console.warn('No refresh token available')
        return false
      }

      console.log('Attempting to refresh token...')
      const response = await api.post('/admin/auth/refresh', {
        refresh_token: storedRefreshToken
      })

      const { access_token, refresh_token: new_refresh_token, user: userData } = response.data
      
      // Store new tokens
      localStorage.setItem('admin_token', access_token)
      if (new_refresh_token) {
        localStorage.setItem('admin_refresh_token', new_refresh_token)
      }
      localStorage.setItem('admin_user', JSON.stringify(userData))
      
      // Update state and headers
      setToken(access_token)
      setUser(userData)
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
      
      console.log('Token refreshed successfully for:', userData.email)
      return true
    } catch (error) {
      console.error('Failed to refresh token:', error)
      // If refresh fails, log out the user
      await logout()
      return false
    }
  }

  const login = async (email: string, password: string) => {
    try {
      console.log('Attempting login for:', email)
      const response = await api.post('/admin/auth/login', { email, password })
      const { access_token, refresh_token, user: userData } = response.data
      
      // Store all auth data
      setToken(access_token)
      setUser(userData)
      
      localStorage.setItem('admin_token', access_token)
      localStorage.setItem('admin_refresh_token', refresh_token)
      localStorage.setItem('admin_user', JSON.stringify(userData))
      
      // Set default Authorization header
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
      
      console.log('Login successful:', {
        user: userData.email,
        role: userData.role,
        hasAccessToken: !!access_token,
        hasRefreshToken: !!refresh_token
      })
    } catch (error) {
      console.error('Login failed:', error)
      throw error
    }
  }

  const logout = async () => {
    try {
      const storedRefreshToken = localStorage.getItem('admin_refresh_token')
      
      if (storedRefreshToken) {
        // Call logout endpoint to revoke refresh token on server
        await api.post('/admin/auth/logout', {
          refresh_token: storedRefreshToken
        }).catch(err => {
          console.warn('Logout API call failed (token may already be invalid):', err.message)
        })
      }
    } catch (error) {
      console.warn('Error during logout:', error)
    } finally {
      // Clear React state
      setToken(null)
      setUser(null)
      
      // Clear localStorage
      localStorage.removeItem('admin_token')
      localStorage.removeItem('admin_refresh_token')
      localStorage.removeItem('admin_user')
      
      // Clear Authorization header
      delete api.defaults.headers.common['Authorization']
      
      console.log('Logout complete, session cleared')
      
      // Redirect to login page
      router.push('/login')
    }
  }

  const hasRole = (roles: string | string[]): boolean => {
    if (!user) return false
    
    const roleArray = Array.isArray(roles) ? roles : [roles]
    return roleArray.includes(user.role)
  }

  const hasPermission = (permission: string): boolean => {
    if (!user) return false

    // Define role-based permissions
    const rolePermissions: Record<string, string[]> = {
      'super_admin': [
        'view:users', 'edit:users', 'delete:users',
        'view:transactions', 'edit:transactions', 'delete:transactions',
        'view:settings', 'edit:settings',
        'view:reports', 'export:reports',
        'manage:roles', 'manage:permissions'
      ],
      'accountant': [
        'view:users',
        'view:transactions', 'edit:transactions',
        'view:reports', 'export:reports'
      ],
      'technical': [
        'view:users',
        'view:transactions',
        'view:settings', 'edit:settings',
        'view:reports'
      ],
      'readonly': [
        'view:users',
        'view:transactions',
        'view:reports'
      ]
    }

    const userPermissions = rolePermissions[user.role] || []
    return userPermissions.includes(permission)
  }

  const hasAnyPermission = (permissions: string | string[]): boolean => {
    if (!user) return false
    
    const permissionArray = Array.isArray(permissions) ? permissions : [permissions]
    return permissionArray.some(permission => hasPermission(permission))
  }

  const hasAllPermissions = (permissions: string | string[]): boolean => {
    if (!user) return false
    
    const permissionArray = Array.isArray(permissions) ? permissions : [permissions]
    return permissionArray.every(permission => hasPermission(permission))
  }

  const value = {
    user,
    token,
    isLoading,
    login,
    logout,
    refreshToken,
    isAuthenticated: !!user && !!token,
    hasRole,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
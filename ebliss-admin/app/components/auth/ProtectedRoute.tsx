'use client'

import { ReactNode } from 'react'
import { useAuth } from '../../../contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

interface ProtectedRouteProps {
  children: ReactNode
  requiredRoles?: string | string[]
  fallbackUrl?: string
}

export function ProtectedRoute({ 
  children, 
  requiredRoles, 
  fallbackUrl = '/login' 
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, hasRole } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(fallbackUrl)
      return
    }

    if (!isLoading && isAuthenticated && requiredRoles && !hasRole(requiredRoles)) {
      router.push('/unauthorized')
    }
  }, [isLoading, isAuthenticated, requiredRoles, hasRole, router, fallbackUrl])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  if (requiredRoles && !hasRole(requiredRoles)) {
    return null
  }

  return <>{children}</>
}
'use client'

import { ReactNode } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { UserRole } from '@/types/roles'
import { AlertTriangle } from 'lucide-react'

interface RoleGuardProps {
  children: ReactNode
  roles?: UserRole | UserRole[]
  permissions?: string | string[]
  fallback?: ReactNode
}

export function RoleGuard({ children, roles, permissions, fallback }: RoleGuardProps) {
  const { hasRole, hasPermission, hasAnyPermission, user } = useAuth()

  let hasAccess = true

  if (roles) {
    hasAccess = hasAccess && hasRole(roles)
  }

  if (permissions) {
    if (Array.isArray(permissions)) {
      hasAccess = hasAccess && hasAnyPermission(permissions)
    } else {
      hasAccess = hasAccess && hasPermission(permissions)
    }
  }
   hasAccess = true

  if (!hasAccess) {
    return fallback || (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <AlertTriangle className="h-8 w-8 text-red-500" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-500 max-w-md">
          You don't have permission to access this page. Please contact your administrator if you believe this is a mistake.
        </p>
      </div>
    )
  }

  return <>{children}</>
}
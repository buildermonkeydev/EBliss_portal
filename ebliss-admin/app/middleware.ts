import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Define protected routes and their required roles
const routePermissions: Record<string, string[]> = {
  '/dashboard': ['super_admin', 'accountant', 'technical', 'readonly'],
  '/users': ['super_admin'],
  '/billing': ['super_admin', 'accountant'],
  '/infrastructure': ['super_admin', 'technical'],
  '/vms': ['super_admin', 'technical'],
  '/nodes': ['super_admin', 'technical'],
  '/tickets': ['super_admin', 'technical'],
  '/reports': ['super_admin', 'accountant'],
  '/settings': ['super_admin'],
  '/admin': ['super_admin'],
  '/audit-logs': ['super_admin'],
}

// Public routes that don't require authentication
const publicRoutes = ['/login', '/forgot-password', '/reset-password']

export function middleware(request: NextRequest) {
  const token = request.cookies.get('admin_token')?.value || 
                request.headers.get('authorization')?.replace('Bearer ', '')
  
  const { pathname } = request.nextUrl

  // Allow public routes
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    if (token && pathname === '/login') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return NextResponse.next()
  }

  // Check authentication for protected routes
  if (!token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  try {
    // Decode the JWT token to get user role
    const tokenData = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString())
    const userRole = tokenData.role

    // Check role-based access
    for (const [route, allowedRoles] of Object.entries(routePermissions)) {
      if (pathname.startsWith(route)) {
        if (!allowedRoles.includes(userRole)) {
          return NextResponse.redirect(new URL('/unauthorized', request.url))
        }
        break
      }
    }

    // Clone the request headers and add user info
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-id', tokenData.sub)
    requestHeaders.set('x-user-role', userRole)
    requestHeaders.set('x-user-email', tokenData.email)

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  } catch (error) {
    // Invalid token
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)',
  ],
}
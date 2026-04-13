// lib/api.ts
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL ;

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Token refresh state
let isRefreshing = false
let failedQueue: any[] = []

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

// Request interceptor
api.interceptors.request.use((config) => {
  // Try admin token first, then regular token
  const adminToken = localStorage.getItem('admin_token')
  const token = adminToken
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  
  return config
})

// Response interceptor with refresh token logic
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    
    // If error is not 401 or already retried, reject
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error)
    }
    
    // Check if this is an admin endpoint
    const isAdminEndpoint = originalRequest.url?.includes('/admin/')
    
    if (isAdminEndpoint) {
      const refreshToken = localStorage.getItem('admin_refresh_token')
      
      if (!refreshToken) {
        // No refresh token, redirect to login
        clearAuthAndRedirect()
        return Promise.reject(error)
      }
      
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return api(originalRequest)
          })
          .catch(err => Promise.reject(err))
      }
      
      originalRequest._retry = true
      isRefreshing = true
      
      try {
        console.log('Attempting to refresh admin token...')
        
        // IMPORTANT: Don't use the api instance here (to avoid interceptor loop)
        // Use plain axios without Authorization header
        const response = await axios.post(
          `${API_URL}/admin/auth/refresh`,
          { refresh_token: refreshToken },
          {
            headers: {
              'Content-Type': 'application/json',
              // Don't send the expired token
            }
          }
        )
        
        const { access_token, refresh_token: new_refresh_token } = response.data
        
        // Store new tokens
        localStorage.setItem('admin_token', access_token)
        if (new_refresh_token) {
          localStorage.setItem('admin_refresh_token', new_refresh_token)
        }
        
        // Update Authorization header for future requests
        api.defaults.headers.common.Authorization = `Bearer ${access_token}`
        originalRequest.headers.Authorization = `Bearer ${access_token}`
        
        // Process queued requests
        processQueue(null, access_token)
        
        console.log('Admin token refreshed successfully')
        
        // Retry original request
        return api(originalRequest)
      } catch (refreshError: any) {
        console.error('Failed to refresh admin token:', refreshError)
        
        // Process queue with error
        processQueue(refreshError, null)
        
        // Clear auth data and redirect
        clearAuthAndRedirect()
        
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    } else {
      // Regular user token refresh
      const userRefreshToken = localStorage.getItem('refresh_token')
      
      if (!userRefreshToken) {
        clearUserAuthAndRedirect()
        return Promise.reject(error)
      }
      
      originalRequest._retry = true
      
      try {
        const response = await axios.post(
          `${API_URL}/auth/refresh`,
          { refresh_token: userRefreshToken },
          {
            headers: {
              'Content-Type': 'application/json',
            }
          }
        )
        
        const { access_token, refresh_token: new_refresh_token } = response.data
        
        localStorage.setItem('token', access_token)
        if (new_refresh_token) {
          localStorage.setItem('refresh_token', new_refresh_token)
        }
        
        api.defaults.headers.common.Authorization = `Bearer ${access_token}`
        originalRequest.headers.Authorization = `Bearer ${access_token}`
        
        return api(originalRequest)
      } catch (refreshError) {
        clearUserAuthAndRedirect()
        return Promise.reject(refreshError)
      }
    }
  }
)

function clearAuthAndRedirect() {
  localStorage.removeItem('admin_token')
  localStorage.removeItem('admin_refresh_token')
  localStorage.removeItem('admin_user')
  delete api.defaults.headers.common.Authorization
  
  if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
    window.location.href = '/login'
  }
}

function clearUserAuthAndRedirect() {
  localStorage.removeItem('token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('user')
  delete api.defaults.headers.common.Authorization
  
  if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
    window.location.href = '/login'
  }
}

export default api
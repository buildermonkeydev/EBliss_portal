// lib/api.ts
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL 

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
    console.log('Adding token to request:', token.substring(0, 50) + '...')
  } else {
    console.warn('No token found in localStorage')
  }
  
  return config
})

// Response interceptor with refresh token logic
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.status, response.config.url)
    return response
  },
  async (error) => {
    console.error('API Error:', error.response?.status, error.response?.data)
    
    const originalRequest = error.config
    
    // Check if error is 401 and not already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Check if this is an admin endpoint
      const isAdminEndpoint = originalRequest.url?.includes('/admin/')
      
      if (isAdminEndpoint) {
        const refreshToken = localStorage.getItem('admin_refresh_token')
        
        if (refreshToken) {
          if (isRefreshing) {
            // If already refreshing, queue the request
            return new Promise((resolve, reject) => {
              failedQueue.push({ resolve, reject })
            }).then(token => {
              originalRequest.headers.Authorization = `Bearer ${token}`
              return api(originalRequest)
            }).catch(err => Promise.reject(err))
          }
          
          originalRequest._retry = true
          isRefreshing = true
          
          try {
            console.log('Attempting to refresh admin token...')
            
            // Call refresh endpoint
            const response = await axios.post(`${API_URL}/admin/auth/refresh`, {
              refresh_token: refreshToken
            })
            
            const { access_token, refresh_token: new_refresh_token } = response.data
            
            // Store new tokens
            localStorage.setItem('admin_token', access_token)
            if (new_refresh_token) {
              localStorage.setItem('admin_refresh_token', new_refresh_token)
            }
            
            // Update Authorization header
            api.defaults.headers.common.Authorization = `Bearer ${access_token}`
            originalRequest.headers.Authorization = `Bearer ${access_token}`
            
            // Process queued requests
            processQueue(null, access_token)
            
            console.log('Admin token refreshed successfully')
            
            // Retry original request
            return api(originalRequest)
          } catch (refreshError) {
            console.error('Failed to refresh admin token:', refreshError)
            
            // Process queue with error
            processQueue(refreshError, null)
            
            // Clear auth data and redirect to login
            localStorage.removeItem('admin_token')
            localStorage.removeItem('admin_refresh_token')
            localStorage.removeItem('admin_user')
            
            // Only redirect if not already on login page
            if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
              window.location.href = '/login'
            }
            
            return Promise.reject(refreshError)
          } finally {
            isRefreshing = false
          }
        } else {
          // No refresh token, clear and redirect
          localStorage.removeItem('admin_token')
          localStorage.removeItem('admin_refresh_token')
          localStorage.removeItem('admin_user')
          
          if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
            window.location.href = '/login'
          }
        }
      } else {
        // Regular user token refresh (existing logic)
        const userRefreshToken = localStorage.getItem('refresh_token')
        
        if (userRefreshToken) {
          originalRequest._retry = true
          
          try {
            const response = await axios.post(`${API_URL}/auth/refresh`, {
              refresh_token: userRefreshToken
            })
            
            const { access_token, refresh_token: new_refresh_token } = response.data
            
            localStorage.setItem('token', access_token)
            if (new_refresh_token) {
              localStorage.setItem('refresh_token', new_refresh_token)
            }
            
            api.defaults.headers.common.Authorization = `Bearer ${access_token}`
            originalRequest.headers.Authorization = `Bearer ${access_token}`
            
            return api(originalRequest)
          } catch (refreshError) {
            localStorage.removeItem('token')
            localStorage.removeItem('refresh_token')
            localStorage.removeItem('user')
            
            if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
              window.location.href = '/login'
            }
            
            return Promise.reject(refreshError)
          }
        } else {
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          
          if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
            window.location.href = '/login'
          }
        }
      }
    }
    
    return Promise.reject(error)
  }
)

export default api
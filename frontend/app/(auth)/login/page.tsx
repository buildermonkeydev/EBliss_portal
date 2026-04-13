"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  LogIn, 
  AlertCircle,
  Github,
  Chrome,
  Shield,
  ArrowRight,
} from "lucide-react"
import api from "../../../lib/api/auth" 

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [socialLoading, setSocialLoading] = useState<string | null>(null)

  // Check for OAuth callback errors
  useEffect(() => {
    const error = searchParams.get("error")
    if (error) {
      setError(decodeURIComponent(error))
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const response = await api.post('/auth/login', {
        email, 
        password, 
        remember_me: rememberMe 
      })

      const data = response.data

      // Store tokens
      localStorage.setItem("access_token", data.access_token)
      localStorage.setItem("refresh_token", data.refresh_token)
      
      // Store user data
      if (rememberMe) {
        localStorage.setItem("user", JSON.stringify(data.user))
        localStorage.setItem("rememberMe", "true")
      } else {
        sessionStorage.setItem("user", JSON.stringify(data.user))
      }
      
      // Redirect to dashboard
      router.push("/dashboard")
    } catch (err: any) {
      setError(err.response?.data?.message || "Invalid email or password")
      console.error("Login error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSocialLogin = async (provider: string) => {
  setSocialLoading(provider)
  setError("")
  
  try {
    // Get the OAuth URL from your backend
    const response = await api.get(`/auth/${provider}/url`)
    const { url } = response.data
    
    // Store the current URL to redirect back after OAuth
    localStorage.setItem("oauth_redirect_url", "/dashboard")
    
    // Redirect to OAuth provider
    window.location.href = url
  } catch (err: any) {
    setError(`Failed to initialize ${provider} login. Please try again.`)
    console.error(`${provider} login error:`, err)
    setSocialLoading(null)
  }
}

  // Handle OAuth callback (if this page is loaded with OAuth params)
  // useEffect(() => {
  //   const handleOAuthCallback = async () => {
  //     const code = searchParams.get("code")
  //     const provider = searchParams.get("provider")
      
  //     if (code && provider) {
  //       setIsLoading(true)
  //       try {
  //         // Exchange code for tokens
  //         const response = await api.post(`/auth/${provider}/callback`, { code })
  //         const data = response.data
          
  //         // Store tokens
  //         localStorage.setItem("access_token", data.access_token)
  //         localStorage.setItem("refresh_token", data.refresh_token)
          
  //         // Store user data
  //         const rememberFromStorage = localStorage.getItem("rememberMe") === "true"
  //         if (rememberFromStorage) {
  //           localStorage.setItem("user", JSON.stringify(data.user))
  //         } else {
  //           sessionStorage.setItem("user", JSON.stringify(data.user))
  //         }
          
  //         // Clear OAuth state
  //         localStorage.removeItem("oauth_redirect_url")
          
  //         // Redirect to dashboard
  //         router.push("/dashboard")
  //       } catch (err: any) {
  //         setError(err.response?.data?.message || `${provider} authentication failed`)
  //         console.error("OAuth callback error:", err)
          
  //         // Clean up URL params
  //         router.replace("/login", undefined)
  //       } finally {
  //         setIsLoading(false)
  //       }
  //     }
  //   }
    
  //   handleOAuthCallback()
  // }, [searchParams, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-indigo-500/5 to-purple-500/5 rounded-full blur-3xl" />
      </div>

      {/* Main Card */}
      <div className="relative w-full max-w-md mx-4">
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full blur-2xl" />
          
          <div className="relative p-8">
            {/* Logo */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-24 h-24 mb-4">
                <Image 
                  src="/ChatGPT Image Feb 27, 2026, 10_44_36 AM.png"
                  alt="eBliss Logo"
                  width={96}
                  height={96}
                  className="object-contain"
                  priority
                />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                Welcome Back
              </h1>
              <p className="text-slate-400 text-sm mt-2">
                Sign in to access your dashboard
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email Field */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

        
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm animate-shake">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900"
                    disabled={isLoading}
                  />
                  <span className="text-sm text-slate-400">Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={() => router.push("/forget-password")}
                  className="text-sm text-indigo-400 hover:text-indigo-300 transition"
                  disabled={isLoading}
                >
                  Forgot password?
                </button>
              </div>

           
              <button
                type="submit"
                disabled={isLoading || !!socialLoading}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading && !socialLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    Sign In
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

           
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-700"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-slate-900 px-4 text-slate-500">Or continue with</span>
              </div>
            </div>

            {/* Social Login Buttons */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => handleSocialLogin("google")}
                disabled={isLoading || !!socialLoading}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed relative"
              >
                {socialLoading === "google" ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm">Connecting...</span>
                  </>
                ) : (
                  <>
                    <Chrome className="w-4 h-4" />
                    <span className="text-sm">Google</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => handleSocialLogin("github")}
                disabled={isLoading || !!socialLoading}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed relative"
              >
                {socialLoading === "github" ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm">Connecting...</span>
                  </>
                ) : (
                  <>
                    <Github className="w-4 h-4" />
                    <span className="text-sm">GitHub</span>
                  </>
                )}
              </button>
            </div>

            {/* Sign Up Link */}
            <p className="text-center text-sm text-slate-400 mt-6">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => router.push("/sign-up")}
                className="text-indigo-400 hover:text-indigo-300 font-medium transition inline-flex items-center gap-1"
                disabled={isLoading}
              >
                Create account
              </button>
            </p>

            {/* Security Note */}
            <div className="mt-6 pt-4 border-t border-slate-700/50">
              <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                <Shield className="w-3 h-3" />
                <span>Secure login with 256-bit encryption</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.3s ease-out;
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        .animate-pulse {
          animation: pulse 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
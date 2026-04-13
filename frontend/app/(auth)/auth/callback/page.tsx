"use client"

import { Suspense } from "react"
import { Loader2 } from "lucide-react"

// Separate component that uses useSearchParams
function OAuthCallbackContent() {
  return (
    <Suspense fallback={<CallbackLoading />}>
      <OAuthCallbackHandler />
    </Suspense>
  )
}

function CallbackLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800">
      <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 max-w-md w-full mx-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-500/10 mb-4">
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">
            Loading...
          </h2>
          <p className="text-slate-400 text-sm">
            Please wait...
          </p>
        </div>
        <div className="mt-6 w-full h-1 bg-slate-700 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 animate-progress" />
        </div>
      </div>
      <style jsx>{`
        @keyframes progress {
          0% { width: 0%; }
          50% { width: 70%; }
          100% { width: 100%; }
        }
        .animate-progress {
          animation: progress 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}

// Main handler component that uses useSearchParams
import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CheckCircle2, XCircle } from "lucide-react"

function OAuthCallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get parameters from URL
        const accessToken = searchParams.get("access_token")
        const refreshToken = searchParams.get("refresh_token")
        const expiresIn = searchParams.get("expires_in")
        const userParam = searchParams.get("user")
        const error = searchParams.get("message")

        // Handle error from OAuth
        if (error) {
          setStatus("error")
          setErrorMessage(decodeURIComponent(error))
          // Redirect to login after 3 seconds
          setTimeout(() => {
            router.push(`/login?error=${encodeURIComponent(error)}`)
          }, 3000)
          return
        }

        // Validate required tokens
        if (!accessToken || !refreshToken || !userParam) {
          throw new Error("Missing authentication data")
        }

        // Parse user data
        const user = JSON.parse(decodeURIComponent(userParam))

        // Store tokens
        localStorage.setItem("access_token", accessToken)
        localStorage.setItem("refresh_token", refreshToken)

        // Check if remember me was previously set
        const rememberMe = localStorage.getItem("rememberMe") === "true"
        
        if (rememberMe) {
          localStorage.setItem("user", JSON.stringify(user))
        } else {
          sessionStorage.setItem("user", JSON.stringify(user))
          // Clear any existing localStorage user data
          localStorage.removeItem("user")
        }

        // Store session expiry info
        if (expiresIn) {
          const expiryTime = Date.now() + parseInt(expiresIn) * 1000
          sessionStorage.setItem("token_expiry", expiryTime.toString())
        }

        setStatus("success")

        // Redirect to dashboard after short delay
        setTimeout(() => {
          // Check if there was a redirect URL stored
          const redirectUrl = localStorage.getItem("oauth_redirect_url") || "/dashboard"
          localStorage.removeItem("oauth_redirect_url")
          router.push(redirectUrl)
        }, 1500)

      } catch (err) {
        console.error("OAuth callback error:", err)
        setStatus("error")
        setErrorMessage(err instanceof Error ? err.message : "Authentication failed")
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push("/login?error=Authentication%20failed")
        }, 3000)
      }
    }

    handleCallback()
  }, [searchParams, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800">
      <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 max-w-md w-full mx-4">
        <div className="text-center">
          {status === "loading" && (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-500/10 mb-4">
                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">
                Completing Authentication
              </h2>
              <p className="text-slate-400 text-sm">
                Please wait while we verify your credentials...
              </p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-400" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">
                Authentication Successful!
              </h2>
              <p className="text-slate-400 text-sm">
                Redirecting you to the dashboard...
              </p>
            </>
          )}

          {status === "error" && (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 mb-4">
                <XCircle className="w-8 h-8 text-red-400" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">
                Authentication Failed
              </h2>
              <p className="text-slate-400 text-sm mb-4">
                {errorMessage || "Unable to complete authentication"}
              </p>
              <p className="text-slate-500 text-xs">
                Redirecting to login page...
              </p>
            </>
          )}
        </div>

        {/* Progress bar for loading state */}
        {status === "loading" && (
          <div className="mt-6 w-full h-1 bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 animate-progress" />
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes progress {
          0% { width: 0%; }
          50% { width: 70%; }
          100% { width: 100%; }
        }
        .animate-progress {
          animation: progress 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}

// Default export
export default OAuthCallbackContent
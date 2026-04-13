"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Shield, Loader2 } from "lucide-react"

export default function HomePage() {
  const router = useRouter()
  const [countdown, setCountdown] = useState(3)

  useEffect(() => {
    // Countdown timer
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    // Redirect after 3 seconds
    const redirectTimer = setTimeout(() => {
      router.push("/login")
    }, 3000)

    return () => {
      clearInterval(timer)
      clearTimeout(redirectTimer)
    }
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Main Content */}
      <div className="relative text-center">
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 shadow-2xl">
          {/* Logo/Icon */}
          <div className="inline-flex items-center justify-center w-20 h-20 mb-6 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-2xl">
            <Shield className="w-10 h-10 text-indigo-400" />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent mb-2">
            Welcome to eBliss
          </h1>
          
          <p className="text-slate-400 mb-6">
            Your cloud infrastructure platform
          </p>

          {/* Loading Spinner */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
            <span className="text-slate-400 text-sm">
              Redirecting to login in {countdown} seconds...
            </span>
          </div>

          {/* Manual Redirect Option */}
          <button
            onClick={() => router.push("/login")}
            className="text-sm text-indigo-400 hover:text-indigo-300 transition"
          >
            Click here if not redirected automatically
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }
        .animate-pulse {
          animation: pulse 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
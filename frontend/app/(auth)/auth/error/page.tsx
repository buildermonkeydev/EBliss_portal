"use client"

import { Suspense } from "react"
import { Loader2 } from "lucide-react"

// Default export with Suspense wrapper
export default function AuthErrorPage() {
  return (
    <Suspense fallback={<ErrorLoading />}>
      <AuthErrorHandler />
    </Suspense>
  )
}

function ErrorLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-500/10 mb-4">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
        </div>
        <h2 className="text-xl font-semibold text-white">Loading...</h2>
      </div>
    </div>
  )
}

// Main handler component
import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { XCircle, ArrowLeft } from "lucide-react"

function AuthErrorHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    const message = searchParams.get("message")
    if (message) {
      setErrorMessage(decodeURIComponent(message))
    }
  }, [searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800">
      <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 max-w-md w-full mx-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 mb-4">
            <XCircle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">
            Authentication Error
          </h2>
          <p className="text-slate-400 text-sm mb-6">
            {errorMessage || "An error occurred during authentication"}
          </p>
          
          <button
            onClick={() => router.push("/login")}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </button>
        </div>
      </div>
    </div>
  )
}
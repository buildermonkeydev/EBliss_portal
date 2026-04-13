"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

const HARDCODED_EMAIL = "test@test.com"
const HARDCODED_PASSWORD = "9009@Atfenix"

export default function SignIn() {
  const router = useRouter()

  const [email, setEmail] = useState(HARDCODED_EMAIL)
  const [password, setPassword] = useState(HARDCODED_PASSWORD)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    const trimmedEmail = email.trim()
    const trimmedPassword = password.trim()

    // console.log("Attempting login with:", JSON.stringify(trimmedEmail), JSON.stringify(trimmedPassword))

    setTimeout(() => {
      if (trimmedEmail === HARDCODED_EMAIL && trimmedPassword === HARDCODED_PASSWORD) {
        router.push("/dashboard")
      } else {
        setError("Invalid email or password.")
        setLoading(false)
      }
    }, 600)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-lg p-8">

        {/* Logo */}
        <h1 className="text-3xl font-bold text-center text-indigo-500 mb-2">
          eblghjiss
        </h1>

        <h2 className="text-xl font-semibold text-center text-gray-100">
          Sign in to your account
        </h2>

        <p className="text-center text-sm text-gray-400 mt-1">
          Or <span className="text-indigo-400 cursor-pointer">create a new account</span>
        </p>

        {/* Error message */}
        {error && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-md text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">

          {/* Email */}
          <div>
            <label className="block text-sm text-gray-300">
              Email address
            </label>
            <input
              type="email"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full mt-1 p-2 bg-slate-800 border border-slate-700 rounded-md text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm text-gray-300">
              Password
            </label>
            <input
              type="password"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full mt-1 p-2 bg-slate-800 border border-slate-700 rounded-md text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Remember + Forgot */}
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-gray-400">
              <input type="checkbox" className="accent-indigo-500" />
              Remember me
            </label>
            <a className="text-indigo-400 hover:underline cursor-pointer">
              Forgot your password?
            </a>
          </div>

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>

        </form>

        {/* Divider */}
        <div className="flex items-center my-6">
          <div className="flex-grow border-t border-slate-700"></div>
          <span className="mx-3 text-sm text-gray-500">Or continue with</span>
          <div className="flex-grow border-t border-slate-700"></div>
        </div>

        {/* Social Login */}
        <div className="flex gap-4">
          <button type="button" className="flex items-center justify-center gap-2 w-1/2 border border-slate-700 rounded-md py-2 text-gray-200 hover:bg-slate-800 transition">
            <img
              src="https://www.svgrepo.com/show/475656/google-color.svg"
              className="w-5 h-5"
            />
            Google
          </button>
          <button type="button" className="flex items-center justify-center gap-2 w-1/2 border border-slate-700 rounded-md py-2 text-gray-200 hover:bg-slate-800 transition">
            <img
              src="https://www.svgrepo.com/show/512317/github-142.svg"
              className="w-5 h-5"
            />
            GitHub
          </button>
        </div>

      </div>
    </div>
  )
}
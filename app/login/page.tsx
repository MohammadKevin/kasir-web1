'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()

    if (!email || !password) {
      setError('Email dan password wajib diisi')
      return
    }

    try {
      setLoading(true)
      setError('')

      const res = await api.post('/auth/login', {
        email,
        password,
      })

      const { accessToken, user } = res.data

      localStorage.setItem('token', accessToken)
      localStorage.setItem('user', JSON.stringify(user))

      document.cookie = `token=${accessToken}; path=/; max-age=86400; SameSite=Lax`
      document.cookie = `userRole=${user.type}; path=/; max-age=86400; SameSite=Lax`
      document.cookie = `user=${encodeURIComponent(JSON.stringify(user))}; path=/; max-age=86400; SameSite=Lax`

      switch (user.type) {
        case 'ADMIN':
          router.replace('/dashboard/admin')
          break
        case 'STORE':
          router.replace('/dashboard/store')
          break
        default:
          router.replace('/dashboard')
      }
    } catch (e: any) {
      const msg = e.response?.data?.message
      setError(
        Array.isArray(msg)
          ? msg.join(', ')
          : msg ?? 'Email atau password salah'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50/50 px-4 antialiased">
      <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-8 shadow-xl shadow-slate-100/40">
        
        <div className="mb-8 text-center">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 mb-4 shadow-md shadow-blue-500/20">
            <span className="h-3.5 w-3.5 rounded-sm bg-white rotate-45" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Store<span className="text-blue-600">Flow</span>
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Masuk untuk mengelola toko Anda
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 tracking-wide">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              placeholder="nama@toko.com"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-50 disabled:text-slate-400 transition-all duration-200"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-slate-700 tracking-wide">
                Password
              </label>
              <Link href="/forgot-password" className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline">
                Lupa Password?
              </Link>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-200 pl-4 pr-11 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-50 disabled:text-slate-400 transition-all duration-200"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 p-3.5 text-sm text-red-600 transition-all">
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 px-4 text-sm font-semibold text-white shadow-md shadow-blue-600/10 hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/10 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 transition-all cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Memproses...</span>
              </>
            ) : (
              <span>Masuk ke Akun</span>
            )}
          </button>

        </form>

      </div>
    </main>
  )
}
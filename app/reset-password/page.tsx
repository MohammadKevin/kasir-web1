'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { Lock, Eye, EyeOff, Loader2, CheckCircle, AlertTriangle } from 'lucide-react'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!token) {
      setError('Token reset password tidak ditemukan. Silakan minta link reset baru.')
      return
    }

    if (!password) {
      setError('Password baru wajib diisi')
      return
    }

    if (password.length < 6) {
      setError('Password minimal harus 6 karakter')
      return
    }

    if (password !== confirmPassword) {
      setError('Konfirmasi password tidak cocok')
      return
    }

    try {
      setLoading(true)
      setError('')
      setSuccess('')

      const res = await api.post('/auth/reset-password', {
        token,
        password,
      })

      setSuccess(res.data.message || 'Password Anda berhasil diperbarui.')
      setTimeout(() => {
        router.replace('/login')
      }, 3000)
    } catch (e: any) {
      const msg = e.response?.data?.message
      setError(
        Array.isArray(msg)
          ? msg.join(', ')
          : msg ?? 'Token reset tidak valid atau sudah kedaluwarsa. Silakan minta link reset baru.'
      )
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="space-y-6 text-center">
        <div className="flex flex-col items-center justify-center p-6 bg-red-50 rounded-2xl border border-red-100 text-red-800">
          <AlertTriangle className="h-12 w-12 text-red-600 mb-3" />
          <p className="font-bold text-base">Token Tidak Ditemukan</p>
          <p className="text-xs text-red-650 mt-1 leading-relaxed">
            Link reset password tidak valid atau tidak memiliki parameter token. Silakan hubungi admin atau lakukan permintaan ulang.
          </p>
        </div>

        <Link 
          href="/forgot-password" 
          className="flex w-full items-center justify-center rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors cursor-pointer"
        >
          Minta Link Reset Baru
        </Link>
      </div>
    )
  }

  return (
    <>
      {success ? (
        <div className="space-y-6">
          <div className="flex flex-col items-center justify-center text-center p-6 bg-emerald-50 rounded-2xl border border-emerald-100 text-emerald-800">
            <CheckCircle className="h-12 w-12 text-emerald-600 mb-3" />
            <p className="font-bold text-base">Password Diperbarui</p>
            <p className="text-xs text-emerald-650 mt-1 leading-relaxed">{success}</p>
            <p className="text-[10px] text-slate-400 mt-3 animate-pulse">Mengalihkan ke halaman login...</p>
          </div>

          <Link 
            href="/login" 
            className="flex w-full items-center justify-center rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-650 hover:bg-slate-50 transition-colors"
          >
            Masuk Sekarang
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 tracking-wide">
              Password Baru
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                placeholder="Minimal 6 karakter"
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

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 tracking-wide">
              Konfirmasi Password Baru
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              placeholder="Ketik ulang password baru"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-50 disabled:text-slate-400 transition-all duration-200"
            />
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
              <span>Perbarui Password</span>
            )}
          </button>

        </form>
      )}
    </>
  )
}

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50/50 px-4 antialiased">
      <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-8 shadow-xl shadow-slate-100/40">
        
        <div className="mb-8 text-center">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 mb-4 shadow-md shadow-blue-500/20">
            <Lock className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Reset Password
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Silakan masukkan password baru untuk akun Anda
          </p>
        </div>

        <Suspense fallback={
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        }>
          <ResetPasswordForm />
        </Suspense>

      </div>
    </main>
  )
}

'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { Lock, Eye, EyeOff, Loader2, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react'

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
      <div className="space-y-5">
        <div className="flex flex-col items-center justify-center p-5 bg-red-50 rounded-2xl border border-red-100 text-red-800 text-center space-y-2.5">
          <AlertTriangle size={36} className="text-red-650" />
          <div className="space-y-1">
            <p className="font-extrabold text-sm">Token Tidak Valid</p>
            <p className="text-[10.5px] text-red-650 leading-relaxed font-semibold max-w-xs">
              Link reset password tidak valid atau tidak memiliki parameter token. Silakan periksa kembali tautan Anda.
            </p>
          </div>
        </div>

        <Link 
          href="/forgot-password" 
          className="flex w-full items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-750 text-white font-bold py-3.5 px-4 text-xs transition-colors shadow-3xs cursor-pointer"
        >
          Minta Link Reset Baru
        </Link>
      </div>
    )
  }

  return (
    <>
      {success ? (
        <div className="space-y-5">
          <div className="flex flex-col items-center justify-center text-center p-5 bg-emerald-50 rounded-2xl border border-emerald-150 text-emerald-800 space-y-2.5 animate-pulse">
            <CheckCircle2 size={36} className="text-emerald-650 stroke-[2.5]" />
            <div className="space-y-1">
              <p className="font-extrabold text-sm">Sandi Diperbarui</p>
              <p className="text-[10.5px] text-emerald-650 leading-relaxed font-semibold">{success}</p>
            </div>
            <p className="text-[9.5px] text-slate-400 font-bold">Mengalihkan ke halaman masuk dalam 3 detik...</p>
          </div>

          <Link 
            href="/login" 
            className="flex w-full items-center justify-center rounded-xl border border-slate-200 py-3.5 text-xs font-bold text-slate-650 hover:bg-slate-50 transition-colors"
          >
            Masuk Sekarang
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
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
                className="w-full rounded-xl border border-slate-200 pl-4 pr-11 py-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-50 disabled:text-slate-400 transition-all duration-200 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-655 focus:outline-none transition-colors"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
              Konfirmasi Password Baru
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              placeholder="Ulangi kata sandi baru"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-50 disabled:text-slate-400 transition-all duration-200 font-mono"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2.5 rounded-xl bg-red-50 border border-red-100 p-3.5 text-xs text-red-600 transition-all">
              <svg className="h-4 w-4 shrink-0 text-red-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="font-semibold leading-relaxed">{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 py-3.5 px-4 text-xs font-bold text-white shadow-md shadow-blue-600/10 active:scale-98 disabled:pointer-events-none disabled:opacity-50 transition-all cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Menyimpan sandi...</span>
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
    <main className="min-h-screen bg-slate-50/50 flex items-center justify-center px-4 antialiased font-sans select-none">
      <div className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-8 shadow-xl shadow-slate-100/40 space-y-6">
        
        {/* Back navigation */}
        <div>
          <Link 
            href="/login" 
            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-400 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft size={13} />
            <span>Batal & Kembali</span>
          </Link>
        </div>

        {/* Brand header details */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-150 shadow-3xs">
            <Lock size={18} />
          </div>
          <h1 className="text-xl font-black tracking-tight text-slate-950">Reset Password</h1>
          <p className="text-slate-500 text-xs font-semibold max-w-xs mx-auto leading-relaxed">
            Buat sandi baru untuk akun kasir atau dashboard administrasi Anda.
          </p>
        </div>

        <Suspense fallback={
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
          </div>
        }>
          <ResetPasswordForm />
        </Suspense>

      </div>
    </main>
  )
}

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { Mail, ArrowLeft, Loader2, CheckCircle } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [devResetUrl, setDevResetUrl] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!email) {
      setError('Email wajib diisi')
      return
    }

    try {
      setLoading(true)
      setError('')
      setSuccess('')
      setDevResetUrl('')

      const res = await api.post('/auth/forgot-password', { email })
      setSuccess(res.data.message || 'Link reset password telah dikirim ke email Anda.')
      
      // Save debug reset link if returned (for local dev mode)
      if (res.data.resetLink) {
        setDevResetUrl(res.data.resetLink)
      }
    } catch (e: any) {
      const msg = e.response?.data?.message
      setError(
        Array.isArray(msg)
          ? msg.join(', ')
          : msg ?? 'Email tidak ditemukan atau terjadi kesalahan'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50/50 px-4 antialiased">
      <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-8 shadow-xl shadow-slate-100/40">
        
        <div className="mb-6">
          <Link href="/login" className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" />
            Kembali ke Login
          </Link>
        </div>

        <div className="mb-8 text-center">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 mb-4 shadow-md shadow-blue-500/20">
            <Mail className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Lupa Password
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Masukkan email Anda untuk menerima link reset password
          </p>
        </div>

        {success ? (
          <div className="space-y-6">
            <div className="flex flex-col items-center justify-center text-center p-6 bg-emerald-50 rounded-2xl border border-emerald-100 text-emerald-800">
              <CheckCircle className="h-12 w-12 text-emerald-600 mb-3" />
              <p className="font-bold text-base">Permintaan Berhasil</p>
              <p className="text-xs text-emerald-650 mt-1 leading-relaxed">{success}</p>
            </div>

            {devResetUrl && (
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs">
                <p className="font-bold uppercase mb-1">🛠️ DEBUG MODE (Local Dev Only):</p>
                <p className="mb-2.5">Email pengiriman dinonaktifkan atau menggunakan console log. Silakan klik tombol di bawah untuk langsung mereset password:</p>
                <a 
                  href={devResetUrl} 
                  className="inline-flex w-full items-center justify-center rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 px-4 text-center transition-colors"
                >
                  Buka Halaman Reset Password
                </a>
              </div>
            )}

            <Link 
              href="/login" 
              className="flex w-full items-center justify-center rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Kembali ke Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 tracking-wide">
                Email Terdaftar
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                placeholder="nama@toko.com"
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
                  <span>Mengirim...</span>
                </>
              ) : (
                <span>Kirim Link Reset Password</span>
              )}
            </button>

          </form>
        )}

      </div>
    </main>
  )
}

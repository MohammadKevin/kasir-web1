'use client'

import { useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { Mail, ArrowLeft, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'

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
    <main className="min-h-screen bg-slate-50/50 flex items-center justify-center px-4 antialiased font-sans select-none">
      <div className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-8 shadow-xl shadow-slate-100/40 space-y-6">
        
        <div>
          <Link 
            href="/login" 
            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-400 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft size={13} />
            <span>Kembali ke Login</span>
          </Link>
        </div>

        <div className="text-center space-y-2">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-150 shadow-3xs">
            <Mail size={18} />
          </div>
          <h1 className="text-xl font-black tracking-tight text-slate-950">Lupa Password</h1>
          <p className="text-slate-500 text-xs font-semibold max-w-xs mx-auto leading-relaxed">
            Masukkan email Anda terdaftar untuk mendapatkan link instruksi reset password baru.
          </p>
        </div>

        {success ? (
          <div className="space-y-6">
            <div className="flex flex-col items-center justify-center text-center p-5 bg-emerald-50 rounded-2xl border border-emerald-150 text-emerald-800 space-y-2.5">
              <CheckCircle2 size={36} className="text-emerald-600 stroke-[2.5]" />
              <div className="space-y-1">
                <p className="font-extrabold text-sm">Email Terkirim</p>
                <p className="text-[10.5px] text-emerald-600 leading-relaxed font-semibold max-w-xs">{success}</p>
              </div>
            </div>

            {devResetUrl && (
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 space-y-3">
                <p className="font-extrabold text-[10px] tracking-wider uppercase text-amber-800">🛠️ LOCAL DEVELOPMENT HELPER:</p>
                <p className="text-[10.5px] text-amber-700 leading-normal font-semibold">
                  Karena sistem dalam mode pengembangan lokal, klik tombol di bawah untuk langsung menuju halaman pembaruan sandi tanpa membuka email:
                </p>
                <a 
                  href={devResetUrl} 
                  className="flex w-full items-center justify-center rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 px-4 text-center text-xs transition-colors shadow-3xs cursor-pointer"
                >
                  Reset Password Sekarang
                </a>
              </div>
            )}

            <Link 
              href="/login" 
              className="flex w-full items-center justify-center rounded-xl border border-slate-200 py-3.5 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              Kembali ke Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                Email Akun Anda
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                placeholder="nama@toko.com"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-50 disabled:text-slate-400 transition-all duration-200 font-semibold"
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
                  <span>Mengirim tautan...</span>
                </>
              ) : (
                <span>Kirim Link Reset</span>
              )}
            </button>

          </form>
        )}

      </div>
    </main>
  )
}

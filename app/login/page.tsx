'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { Eye, EyeOff, Loader2, ArrowLeft, ShieldCheck, CheckCircle2, TrendingUp } from 'lucide-react'

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

      document.cookie = `token=${accessToken}; path=/; max-age=7200; SameSite=Lax`
      document.cookie = `userRole=${user.type}; path=/; max-age=7200; SameSite=Lax`
      document.cookie = `user=${encodeURIComponent(JSON.stringify(user))}; path=/; max-age=7200; SameSite=Lax`

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
    <main className="min-h-screen bg-slate-50/50 flex items-stretch antialiased font-sans select-none">
      
      {/* ─── LEFT PANEL: Internal Portal Branding & System Status Showcase ─── */}
      <div className="hidden lg:flex lg:w-[42%] bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white p-12 flex-col justify-between relative overflow-hidden shrink-0 select-none">
        
        {/* Glow Spheres */}
        <div className="absolute top-[-10%] left-[-15%] h-[350px] w-[350px] rounded-full bg-blue-500/15 blur-3xl" />
        <div className="absolute bottom-[-15%] right-[-10%] h-[400px] w-[400px] rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:3rem_3rem] -z-10" />

        {/* Header Branding */}
        <div className="relative z-10 flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-blue-600 text-white flex items-center justify-center font-black text-xs shadow-md">
            L
          </div>
          <span className="font-extrabold text-sm tracking-tight text-white">
            laila<span className="text-blue-400">collections</span>
            <span className="ml-2 text-[8px] font-black uppercase tracking-widest text-blue-300 bg-blue-500/20 border border-blue-400/35 px-1.5 py-0.5 rounded-md leading-none">INTERNAL</span>
          </span>
        </div>

        {/* Center Value Points */}
        <div className="relative z-10 my-auto space-y-8">
          <div className="space-y-3">
            <h2 className="text-2xl font-black leading-snug">Sistem ERP & POS Terintegrasi</h2>
            <p className="text-slate-350 text-xs font-medium leading-relaxed max-w-sm">
              Gunakan kredensial akun karyawan Anda untuk mengakses portal manajemen kasir, pengawasan inventaris produk, pencetakan barcode, dan laporan keuangan butik Laila Collections.
            </p>
          </div>

          {/* Graphical Micro Mockup (System & Database Monitor) */}
          <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-4 shadow-xl space-y-3.5 max-w-sm">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-blue-300">Status Layanan Internal</span>
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[7.5px] font-bold text-emerald-400 uppercase">ONLINE</span>
              </span>
            </div>
            
            <div className="flex justify-between items-end">
              <div>
                <p className="text-[8px] text-slate-450 font-bold uppercase tracking-wider">Server Utama</p>
                <p className="text-sm font-bold tracking-tight text-white mt-1">Laila Core Service v.1.0</p>
              </div>
              <div className="flex items-center gap-1.5 text-[8.5px] font-bold text-sky-400 bg-sky-500/10 rounded-full px-2 py-0.5 border border-sky-500/20">
                <span>Latency: 12ms</span>
              </div>
            </div>
            
            <div className="flex gap-2">
              <div className="flex-1 bg-white/5 rounded-lg p-2 border border-white/5">
                <p className="text-[7.5px] text-slate-400">Database POS</p>
                <p className="text-xs font-bold mt-0.5 text-slate-200">Terhubung</p>
              </div>
              <div className="flex-1 bg-white/5 rounded-lg p-2 border border-white/5">
                <p className="text-[7.5px] text-slate-400">Gudang Pusat</p>
                <p className="text-xs font-bold mt-0.5 text-slate-200">Sinkron</p>
              </div>
            </div>
          </div>

          {/* Quick List Bullet Benefits */}
          <div className="space-y-2.5 text-xs font-semibold text-slate-350">
            <div className="flex items-center gap-2">
              <ShieldCheck size={13} className="text-blue-400 shrink-0" />
              <span>Akses Keamanan Jalur SSL/TLS 256-bit</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={13} className="text-blue-400 shrink-0" />
              <span>Pencatatan Log Audit Setiap Aktivitas Transaksi</span>
            </div>
          </div>

        </div>

        {/* Footer Support Info */}
        <div className="relative z-10 text-[9.5px] text-slate-400 font-bold tracking-wide flex justify-between items-center border-t border-white/5 pt-4">
          <span>IT Division • Laila Collections</span>
          <span className="text-slate-500">v.1.0</span>
        </div>

      </div>

      {/* ─── RIGHT PANEL: Authentication Login Form Card ─── */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-12 md:px-24 bg-white">
        
        {/* Back to Home Header */}
        <div className="flex justify-between items-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-400 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft size={13} />
            <span>Kembali ke Beranda</span>
          </Link>
          <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider lg:hidden">Laila Collections</span>
        </div>

        {/* Center Login Card Form */}
        <div className="w-full max-w-sm mx-auto my-auto space-y-6">
          
          <div className="space-y-1.5 text-center sm:text-left">
            <h1 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight">Login Portal Staff</h1>
            <p className="text-slate-500 text-xs font-medium">Masuk untuk mengakses dasbor admin atau terminal kasir outlet.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Email Karyawan</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                placeholder="nama.staf@lailacollections.com"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-50 disabled:text-slate-400 transition-all duration-200 font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Password</label>
                <Link
                  href="/forgot-password"
                  className="text-[10.5px] font-bold text-blue-600 hover:text-blue-750 hover:underline"
                >
                  Lupa Password?
                </Link>
              </div>
              
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-200 pl-4 pr-11 py-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-50 disabled:text-slate-400 transition-all duration-200 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 focus:outline-none transition-colors"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Error Message banner */}
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
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 py-3.5 px-4 text-xs font-bold text-white shadow-md shadow-blue-600/10 active:scale-98 disabled:pointer-events-none disabled:opacity-50 transition-all cursor-pointer mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Memproses masuk...</span>
                </>
              ) : (
                <span>Masuk ke Akun</span>
              )}
            </button>

          </form>

          {/* Security Notice Callout */}
          <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3.5 text-[10.5px] font-semibold text-slate-550 leading-relaxed mt-4 flex items-start gap-2">
            <ShieldCheck size={14} className="shrink-0 mt-0.5 text-blue-650" />
            <span>
              <strong>Pemberitahuan Keamanan:</strong> Portal ini ditujukan khusus untuk karyawan Laila Collections. Jika Anda membutuhkan hak akses baru atau mengalami kendala login, silakan hubungi <strong>IT Administrator / Kepala Cabang</strong>.
            </span>
          </div>

        </div>

        {/* Footer notices */}
        <div className="text-center text-[10px] text-slate-400 font-semibold mt-8 border-t border-slate-100 pt-4 flex justify-center items-center gap-2">
          <span>Khusus Penggunaan Internal Laila Collections • Hak Cipta © {new Date().getFullYear()}</span>
        </div>

      </div>

    </main>
  )
}
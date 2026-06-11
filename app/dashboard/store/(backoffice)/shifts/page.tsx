'use client'

import { useEffect, useMemo, useState } from 'react'
import { 
  Clock3, 
  Search, 
  User, 
  CheckCircle2, 
  XCircle, 
  Calendar,
  Coins,
  TrendingUp,
  AlertCircle,
  Clock,
  Loader2,
  RefreshCw
} from 'lucide-react'
import { api } from '@/lib/api'

type ShiftUser = {
  id: string
  name: string
}

type Shift = {
  id: string
  status: 'OPEN' | 'CLOSED'
  openingCash: number
  closingCash: number | null
  difference: number | null
  createdAt: string
  updatedAt: string
  closedAt?: string | null
  user?: ShiftUser | null
}

export default function ShiftPage() {
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [shifts, setShifts] = useState<Shift[]>([])
  const [active, setActive] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadShiftHistory()
  }, [])

  async function loadShiftHistory() {
    try {
      setLoading(true)
      setError(null)
      const storeId = localStorage.getItem('storeId')
      const token = localStorage.getItem('token')
      
      if (!storeId || !token) {
        setError('Otentikasi tidak valid atau ID Toko tidak ditemukan.')
        setShifts([])
        return
      }

      const headers = { Authorization: `Bearer ${token}` }
      const res = await api.get(`/reports/shifts/${storeId}`, { headers })
      
      const data = res.data || []
      const sorted = [...data].sort(
        (a: Shift, b: Shift) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      
      setShifts(sorted)

      const activeShift = sorted.find((s: Shift) => s.status === 'OPEN')
      if (activeShift) {
        setActive({
          id: activeShift.id,
          name: activeShift.user?.name || 'Kasir',
          createdAt: activeShift.createdAt,
          openingCash: activeShift.openingCash
        })
      } else {
        setActive(null)
      }
    } catch (err: any) {
      console.error('Failed to load shift history:', err)
      const errMsg = err.response?.data?.message || err.message || 'Gagal terhubung ke server backend.'
      setError(`Error ${err.response?.status || ''}: ${errMsg}`)
      setShifts([])
      setActive(null)
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    return shifts.filter((x) => {
      const cashierName = x.user?.name || ''
      return cashierName.toLowerCase().includes(search.toLowerCase())
    })
  }, [shifts, search])

  function formatDate(value: string) {
    return new Date(value).toLocaleString('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short'
    })
  }

  function duration(start: string, end?: string) {
    const a = new Date(start).getTime()
    const b = end ? new Date(end).getTime() : Date.now()
    const diff = Math.floor((b - a) / 60000)

    if (diff <= 0) return '0m'

    const h = Math.floor(diff / 60)
    const m = diff % 60

    return h > 0 ? `${h}j ${m}m` : `${m}m`
  }

  return (
    <div className="space-y-6">
      
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Riwayat Shift Kasir</h1>
          <p className="text-xs font-semibold text-slate-450 mt-0.5">Pantau durasi aktivitas operasional dan rekam log masuk petugas outlet.</p>
        </div>
        <button
          onClick={loadShiftHistory}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 shadow-3xs cursor-pointer active:scale-[0.98] transition-all"
        >
          <RefreshCw size={13} className="text-indigo-600" />
          Refresh Data
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 text-rose-800 flex items-start gap-3 shadow-3xs animate-in fade-in duration-200">
          <AlertCircle className="text-rose-600 shrink-0 mt-0.5" size={16} />
          <div>
            <h3 className="text-xs font-black text-rose-955">Gagal Memuat Riwayat Shift</h3>
            <p className="text-xs font-semibold text-rose-750 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Active Shift Info */}
      {!error && (
        active ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 shadow-3xs text-emerald-800 flex items-start gap-3 animate-in fade-in duration-200">
            <CheckCircle2 className="text-emerald-600 shrink-0 mt-0.5" size={16} />
            <div className="space-y-1">
              <h3 className="text-xs font-black text-emerald-950">Shift Kerja Sedang Berjalan</h3>
              <p className="text-xs font-semibold text-emerald-700">
                Petugas Aktif: <span className="font-bold text-slate-900">{active.name}</span>
              </p>
              <p className="text-[10px] font-semibold text-emerald-600">
                Dimulai pada: <span>{formatDate(active.createdAt)}</span>
              </p>
              <span className="inline-block mt-2 rounded-md bg-emerald-100/75 border border-emerald-200/50 px-2 py-0.5 text-[8.5px] font-bold text-emerald-700 tracking-wide font-mono">
                TERMINAL POS OPEN
              </span>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 text-slate-600 flex items-start gap-3 shadow-3xs">
            <XCircle className="text-slate-400 shrink-0 mt-0.5" size={16} />
            <div className="space-y-1">
              <h3 className="text-xs font-black text-slate-800">Tidak Ada Shift Aktif</h3>
              <p className="text-xs font-semibold text-slate-450 leading-relaxed">
                Silakan lakukan otentikasi pin personel kasir terlebih dahulu di menu Terminal Kasir untuk mulai berjualan.
              </p>
            </div>
          </div>
        )
      )}

      {/* Filters */}
      <div className="relative w-full max-w-sm">
        <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama personel kasir..."
          className="w-full rounded-xl border border-slate-250/70 bg-white pl-11 pr-4 py-3.5 text-xs font-semibold text-slate-900 placeholder:text-slate-455 focus:border-indigo-550 focus:outline-none focus:ring-4 focus:ring-indigo-550/10 transition-all shadow-3xs"
        />
      </div>

      {/* Shift Log Items */}
      <div className="space-y-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100 border border-slate-150" />
          ))
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-12 text-center text-xs font-bold text-slate-400 italic">
            Belum ada rekam jejak histori shift pada outlet ini
          </div>
        ) : (
          filtered.map((shift) => (
            <div
              key={shift.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-3xs flex flex-col md:flex-row md:items-center justify-between gap-5 hover:bg-slate-50/45 transition-colors"
            >
              {/* Left Column */}
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-indigo-50 border border-indigo-150 flex items-center justify-center text-indigo-600 font-bold text-xs">
                    {shift.user?.name?.charAt(0).toUpperCase() || 'K'}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-xs sm:text-sm text-slate-900">{shift.user?.name || 'Kasir'}</h3>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                      <span className={`inline-block h-1.5 w-1.5 rounded-full ${shift.status === 'OPEN' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      <span>{shift.status === 'OPEN' ? 'Sesi Aktif' : 'Sesi Selesai'}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-[11px] font-semibold text-slate-500 border-t border-slate-100/80 pt-3">
                  <div className="space-y-0.5">
                    <span className="text-[9px] text-slate-400 block uppercase tracking-wider">Mulai Shift</span>
                    <span className="text-slate-800 font-bold">{formatDate(shift.createdAt)}</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[9px] text-slate-400 block uppercase tracking-wider">Selesai Shift</span>
                    <span className="text-slate-800 font-bold">
                      {shift.status === 'OPEN' ? (
                        <span className="text-emerald-600 font-extrabold font-sans">Sesi Berjalan</span>
                      ) : (
                        formatDate(shift.closedAt || shift.updatedAt || shift.createdAt)
                      )}
                    </span>
                  </div>
                  <div className="space-y-0.5 col-span-2 sm:col-span-1">
                    <span className="text-[9px] text-slate-400 block uppercase tracking-wider">Durasi Kerja</span>
                    <span className="text-slate-850 font-mono font-bold">
                      {duration(shift.createdAt, shift.status === 'OPEN' ? undefined : (shift.closedAt || shift.updatedAt))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="flex flex-wrap items-center gap-3 md:border-l md:border-slate-100 md:pl-5 pt-3 md:pt-0">
                <div className="rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2 text-left min-w-[100px] shadow-3xs">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Modal Awal</p>
                  <p className="text-xs font-black font-mono text-slate-800 mt-1">
                    Rp {shift.openingCash.toLocaleString('id-ID')}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2 text-left min-w-[100px] shadow-3xs">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Kas Aktual</p>
                  <p className="text-xs font-black font-mono text-slate-800 mt-1">
                    {shift.status === 'OPEN' ? (
                      <span className="text-slate-450 italic font-sans font-semibold text-[10px]">Berjalan...</span>
                    ) : (
                      `Rp ${(shift.closingCash || 0).toLocaleString('id-ID')}`
                    )}
                  </p>
                </div>

                <div className={`rounded-xl border px-3.5 py-2 text-left min-w-[100px] shadow-3xs ${
                  shift.status === 'OPEN' 
                    ? 'bg-slate-50 border-slate-200' 
                    : (shift.difference || 0) < 0 
                      ? 'bg-rose-50 border-rose-100 text-rose-700' 
                      : (shift.difference || 0) > 0 
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                        : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Selisih Kas</p>
                  <p className="text-xs font-black font-mono mt-1">
                    {shift.status === 'OPEN' ? (
                      <span className="text-slate-450 italic font-sans font-semibold text-[10px]">Berjalan...</span>
                    ) : (
                      `${(shift.difference || 0) < 0 ? '-' : (shift.difference || 0) > 0 ? '+' : ''}Rp ${Math.abs(shift.difference || 0).toLocaleString('id-ID')}`
                    )}
                  </p>
                </div>
              </div>

            </div>
          ))
        )}
      </div>

    </div>
  )
}
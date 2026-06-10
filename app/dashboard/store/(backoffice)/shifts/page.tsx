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
  AlertCircle
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
      // Sort shifts by opening time (createdAt) descending (latest first)
      const sorted = [...data].sort(
        (a: Shift, b: Shift) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      
      setShifts(sorted)

      // Find an active open shift from the backend data
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
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-xl font-semibold text-slate-900">Riwayat Shift Kasir</h1>
        <p className="text-xs text-slate-500 mt-0.5">Pantau durasi aktivitas operasional dan rekam log masuk petugas outlet</p>
      </div>

      {/* Error Alert Banner */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50/70 p-4 text-red-800 flex items-start gap-3 shadow-3xs animate-in fade-in duration-200">
          <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={16} />
          <div>
            <h3 className="text-xs font-bold text-red-950">Gagal Memuat Riwayat Shift</h3>
            <p className="text-xs text-red-750 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Status Banner Shift Saat Ini */}
      {!error && (
        active ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-3xs text-emerald-800 flex items-start gap-3 animate-in fade-in duration-200">
            <CheckCircle2 className="text-emerald-600 shrink-0 mt-0.5" size={16} />
            <div>
              <h3 className="text-xs font-bold text-emerald-950">Shift Kerja Sedang Berjalan</h3>
              <p className="text-xs text-emerald-700 mt-1">
                Petugas Aktif: <span className="font-semibold text-slate-900">{active.name}</span>
              </p>
              <p className="text-[11px] text-emerald-600 mt-0.5">
                Dimulai pada: <span className="font-medium">{formatDate(active.createdAt)}</span>
              </p>
              <span className="inline-block mt-2.5 rounded-md bg-emerald-100 border border-emerald-200/50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 font-mono tracking-wide">
                TERMINAL POS OPEN
              </span>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-slate-600 flex items-start gap-3 shadow-3xs">
            <XCircle className="text-slate-400 shrink-0 mt-0.5" size={16} />
            <div>
              <h3 className="text-xs font-bold text-slate-800">Tidak Ada Shift Aktif</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Silakan lakukan otentikasi pin personel kasir terlebih dahulu di menu Terminal Kasir untuk mulai berjualan.
              </p>
            </div>
          </div>
        )
      )}

      {/* Input Pencarian */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama personel kasir..."
            className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-4 py-2 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-3xs"
          />
        </div>
        <button
          onClick={loadShiftHistory}
          className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-3xs transition-colors cursor-pointer"
        >
          Refresh Data
        </button>
      </div>

      {/* Log Timeline List */}
      <div className="space-y-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-100 border border-slate-200" />
          ))
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center text-xs text-slate-400 italic">
            Belum ada rekam jejak histori shift pada outlet ini
          </div>
        ) : (
          filtered.map((shift) => (
            <div
              key={shift.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-3xs flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/40 transition-colors"
            >
              {/* Left Column: Info & Status */}
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-full bg-blue-50 border border-blue-150 flex items-center justify-center text-blue-600 font-bold text-xs">
                    {shift.user?.name?.charAt(0).toUpperCase() || 'K'}
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-slate-900">{shift.user?.name || 'Kasir'}</h3>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                      <span className={`inline-block h-1.5 w-1.5 rounded-full ${shift.status === 'OPEN' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-350'}`} />
                      <span>{shift.status === 'OPEN' ? 'Sesi Aktif' : 'Sesi Selesai'}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-[11px] font-medium text-slate-500 border-t border-slate-100 pt-3">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Mulai Shift</span>
                    <span className="text-slate-800">{formatDate(shift.createdAt)}</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Selesai Shift</span>
                    <span className="text-slate-800">
                      {shift.status === 'OPEN' ? (
                        <span className="text-emerald-600 font-bold font-sans">Sesi Berjalan</span>
                      ) : (
                        formatDate(shift.closedAt || shift.updatedAt || shift.createdAt)
                      )}
                    </span>
                  </div>
                  <div className="space-y-0.5 col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Durasi Kerja</span>
                    <span className="text-slate-850 font-mono font-bold">
                      {duration(shift.createdAt, shift.status === 'OPEN' ? undefined : (shift.closedAt || shift.updatedAt))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Financial Reconciliation */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 md:border-l md:border-slate-100 md:pl-6 pt-3 md:pt-0">
                
                {/* Modal Awal */}
                <div className="rounded-lg bg-slate-50 border border-slate-200/60 px-3 py-2 text-left min-w-[100px] shadow-3xs">
                  <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Modal Awal</p>
                  <p className="text-xs font-bold font-mono text-slate-800 mt-0.5">
                    Rp {shift.openingCash.toLocaleString('id-ID')}
                  </p>
                </div>

                {/* Kas Aktual */}
                <div className="rounded-lg bg-slate-50 border border-slate-200/60 px-3 py-2 text-left min-w-[100px] shadow-3xs">
                  <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Kas Aktual</p>
                  <p className="text-xs font-bold font-mono text-slate-800 mt-0.5">
                    {shift.status === 'OPEN' ? (
                      <span className="text-slate-450 italic font-sans font-medium text-[10px]">Berjalan...</span>
                    ) : (
                      `Rp ${(shift.closingCash || 0).toLocaleString('id-ID')}`
                    )}
                  </p>
                </div>

                {/* Selisih Kas */}
                <div className={`rounded-lg border px-3 py-2 text-left min-w-[100px] shadow-3xs ${
                  shift.status === 'OPEN' 
                    ? 'bg-slate-50 border-slate-200/60' 
                    : (shift.difference || 0) < 0 
                      ? 'bg-rose-50 border-rose-100 text-rose-700' 
                      : (shift.difference || 0) > 0 
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                        : 'bg-slate-50 border-slate-200/60 text-slate-805'
                }`}>
                  <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Selisih Kas</p>
                  <p className="text-xs font-bold font-mono mt-0.5">
                    {shift.status === 'OPEN' ? (
                      <span className="text-slate-455 italic font-sans font-medium text-[10px] text-slate-400">Berjalan...</span>
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
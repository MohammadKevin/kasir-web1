'use client'

import { useEffect, useMemo, useState } from 'react'
import { 
  Clock3, 
  Search, 
  User, 
  CheckCircle2, 
  XCircle, 
  Calendar 
} from 'lucide-react'

type Shift = {
  cashierId: string
  cashierName: string
  loginAt: string
  logoutAt?: string
}

export default function ShiftPage() {
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [shifts, setShifts] = useState<Shift[]>([])
  const [active, setActive] = useState<any>(null)

  useEffect(() => {
    loadShiftHistory()
  }, [])

  function loadShiftHistory() {
    try {
      const activeCashier = localStorage.getItem('cashier')
      if (activeCashier) {
        setActive(JSON.parse(activeCashier))
      }

      const history = JSON.parse(localStorage.getItem('cashierShifts') || '[]')
      setShifts(history)
    } catch (error) {
      console.error(error)
      setShifts([])
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    return shifts.filter((x) =>
      x.cashierName.toLowerCase().includes(search.toLowerCase())
    )
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

    const h = Math.floor(diff / 60)
    const m = diff % 60

    return `${h}j ${m}m`
  }

  return (
    <div className="space-y-6">
      
      {/* Header Panel */}
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-xl font-semibold text-slate-900">Riwayat Shift Kasir</h1>
        <p className="text-xs text-slate-500 mt-0.5">Pantau durasi aktivitas operasional dan rekam log masuk petugas outlet</p>
      </div>

      {/* Status Banner Shift Saat Ini */}
      {active ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-3xs text-emerald-800 flex items-start gap-3 animate-in fade-in duration-200">
          <CheckCircle2 className="text-emerald-600 shrink-0 mt-0.5" size={16} />
          <div>
            <h3 className="text-xs font-bold">Shift Kerja Sedang Berjalan</h3>
            <p className="text-xs text-emerald-700 mt-1">Petugas Aktif: <span className="font-semibold text-slate-900">{active.name}</span></p>
            <span className="inline-block mt-2 rounded-md bg-emerald-100 border border-emerald-200/50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 font-mono tracking-wide">
              TERMINAL POS OPEN
            </span>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-slate-600 flex items-start gap-3 shadow-3xs">
          <XCircle className="text-slate-400 shrink-0 mt-0.5" size={16} />
          <div>
            <h3 className="text-xs font-bold text-slate-800">Tidak Ada Shift Aktif</h3>
            <p className="text-xs text-slate-500 mt-0.5">Silakan lakukan otentikasi pin personel kasir terlebih dahulu untuk mulai berjualan.</p>
          </div>
        </div>
      )}

      {/* Input Pencarian */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama personel kasir..."
          className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-4 py-2 text-xs outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 shadow-3xs"
        />
      </div>

      {/* Log Timeline List */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-100 border border-slate-200" />
          ))
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center text-xs text-slate-400 italic">
            Belum ada rekam jejak histori shift pada outlet ini
          </div>
        ) : (
          filtered.map((shift, index) => (
            <div
              key={index}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-3xs flex items-center justify-between gap-4 hover:bg-slate-50/40 transition-colors"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-slate-900">
                  <User size={14} className="text-slate-400" />
                  <h3 className="font-semibold text-xs">{shift.cashierName}</h3>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 font-medium">
                  <div className="flex items-center gap-1">
                    <Calendar size={12} className="text-slate-400" />
                    <span>Mulai: {formatDate(shift.loginAt)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock3 size={12} className="text-slate-400" />
                    <span>
                      Selesai: {shift.logoutAt ? formatDate(shift.logoutAt) : <span className="text-emerald-600 font-semibold font-sans">Sesi Berjalan</span>}
                    </span>
                  </div>
                </div>
              </div>

              {/* Badge Durasi Kerja */}
              <div className="text-right shrink-0">
                <div className="rounded-lg bg-slate-50 border border-slate-200/60 px-3 py-1.5 text-center shadow-3xs">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Durasi</p>
                  <p className="text-xs font-bold font-mono text-slate-800 mt-0.5">
                    {duration(shift.loginAt, shift.logoutAt)}
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
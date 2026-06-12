'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { 
  Search, 
  Lock, 
  Users, 
  CheckCircle2, 
  ArrowRight, 
  LogOut, 
  ShieldCheck, 
  Loader2,
  AlertCircle,
  ChevronDown
} from 'lucide-react'

type Cashier = {
  id: string
  name: string
  phone: string | null
  isActive: boolean
}

export default function CashierPage() {
  const router = useRouter()
  const [cashiers, setCashiers] = useState<Cashier[]>([])
  const [selected, setSelected] = useState<Cashier | null>(null)
  const [pin, setPin] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [activeCashier, setActiveCashier] = useState<any>(null)

  useEffect(() => {
    const session = localStorage.getItem('cashier')
    if (session) {
      setActiveCashier(JSON.parse(session))
    }
    loadCashiersData()
  }, [])

  async function loadCashiersData() {
    try {
      setLoading(true)
      const storeId = localStorage.getItem('storeId')
      const token = localStorage.getItem('token')

      if (!storeId) {
        alert('ID Toko tidak ditemukan. Pastikan konfigurasi store terikat dengan benar.')
        return
      }

      const res = await api.get(`/stores/${storeId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      setCashiers(res.data.cashiers || [])
    } catch (e: any) {
      console.error('Gagal memuat daftar personel:', e.response?.data || e.message)
    } finally {
      setLoading(false)
    }
  }

  async function activate() {
    if (!selected) return alert('Silakan pilih personel kasir!')
    if (!pin || pin.length < 4) return alert('Masukkan kode PIN verifikasi dengan benar!')

    try {
      setSubmitting(true)
      
      const res = await api.post('/cashier/login-pin', {
        cashierId: selected.id,
        pin,
      })

      localStorage.setItem('cashier', JSON.stringify(res.data.cashier))
      localStorage.setItem('cashierActive', 'true')
      
      router.push('/dashboard/store/pos')
    } catch (err: any) {
      alert(err.response?.data?.message || 'Kode PIN otentikasi salah!')
    } finally {
      setSubmitting(false)
    }
  }

  function logout() {
    localStorage.removeItem('cashier')
    localStorage.removeItem('cashierActive')
    window.location.reload()
  }

  const filtered = cashiers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Terminal Otentikasi POS</h1>
          <p className="text-xs font-semibold text-slate-400 mt-0.5">Pilih personel aktif dan masukkan PIN akses laci kasir pintar.</p>
        </div>
        {activeCashier && (
          <button
            onClick={logout}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-all cursor-pointer active:scale-97"
          >
            <LogOut size={13} />
            Tutup Sesi Aktif
          </button>
        )}
      </div>

      {activeCashier && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-150 p-5 text-emerald-800 flex items-start gap-3 shadow-3xs animate-in fade-in duration-200">
          <CheckCircle2 className="text-emerald-600 shrink-0 mt-0.5" size={16} />
          <div className="space-y-1">
            <h3 className="text-xs font-black">Terminal POS Siap Digunakan</h3>
            <p className="text-xs font-semibold text-emerald-700/95">Petugas Berjaga: <span className="font-bold text-slate-900">{activeCashier.name}</span></p>
            <button 
              onClick={() => router.push('/dashboard/store/pos')}
              className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-4.5 py-2 rounded-xl shadow-3xs transition-colors cursor-pointer"
            >
              Buka Layar Kasir POS <ArrowRight size={12} />
            </button>
          </div>
        </div>
      )}

      <div className="relative w-full max-w-sm">
        <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama personil kasir outlet..."
          className="w-full rounded-xl border border-slate-250/70 bg-white pl-11 pr-4 py-3.5 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-3xs"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100 border border-slate-150" />
          ))
        ) : filtered.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400 border border-dashed border-slate-200 rounded-3xl bg-white text-xs flex flex-col items-center justify-center gap-2">
            <AlertCircle size={20} className="text-slate-300" />
            <p className="font-bold">Tidak ada data petugas kasir yang terdaftar</p>
          </div>
        ) : (
          filtered.map((cashier) => {
            const isSelected = selected?.id === cashier.id
            return (
              <button
                key={cashier.id}
                onClick={() => cashier.isActive && setSelected(cashier)}
                disabled={!cashier.isActive}
                className={`rounded-2xl border p-5 text-left transition-all relative flex flex-col justify-between h-28 bg-white cursor-pointer ${
                  isSelected 
                    ? 'border-indigo-600 bg-indigo-50/10 shadow-3xs ring-1 ring-indigo-500/20' 
                    : 'border-slate-200 hover:bg-slate-50/50'
                } ${!cashier.isActive ? 'opacity-40 cursor-not-allowed bg-slate-50' : ''}`}
              >
                <div className="flex w-full items-center justify-between text-slate-400">
                  <Users size={16} className={isSelected ? 'text-indigo-600' : 'text-slate-400'} />
                  {isSelected && <ShieldCheck size={16} className="text-indigo-600 animate-in zoom-in-75 duration-150" />}
                </div>
                <div>
                  <div className="flex items-center justify-between gap-2 mt-2">
                    <h2 className="font-extrabold text-slate-900 text-xs sm:text-sm truncate">{cashier.name}</h2>
                    <span className={`inline-block shrink-0 rounded-md px-1.5 py-0.5 text-[8.5px] font-bold border ${
                      cashier.isActive 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}>
                      {cashier.isActive ? 'Ready' : 'Off'}
                    </span>
                  </div>
                  <p className="text-[10px] font-mono font-semibold text-slate-400 mt-1">{cashier.phone || 'No Phone'}</p>
                </div>
              </button>
            )
          })
        )}
      </div>

      {selected && (
        <div className="rounded-2xl bg-white border border-slate-200 p-5 max-w-sm shadow-3xs space-y-4 animate-in slide-in-from-bottom-2 duration-200">
          <div>
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Verifikasi Laci Kasir</h3>
            <p className="text-xs font-semibold text-slate-800 mt-1">Petugas Shift: <span className="text-indigo-600 font-bold">{selected.name}</span></p>
          </div>

          <div className="relative">
            <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="password"
              value={pin}
              maxLength={6}
              onChange={(e) => setPin(e.target.value)}
              className="w-full border border-slate-200/80 bg-slate-50/40 rounded-xl pl-10 pr-4 py-3 text-xs font-mono tracking-widest text-slate-900 placeholder:text-slate-350 focus:bg-white focus:border-indigo-500 focus:outline-none"
              placeholder="Masukkan 6 digit PIN"
            />
          </div>

          <button
            onClick={activate}
            disabled={submitting || !pin}
            className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white py-3 text-xs font-bold flex justify-center items-center gap-1.5 disabled:opacity-40 transition-all shadow-3xs cursor-pointer active:scale-97"
          >
            {submitting ? (
              <Loader2 className="animate-spin" size={14} />
            ) : (
              <>
                <span>Buka Layar POS Mandiri</span>
                <ArrowRight size={13} />
              </>
            )}
          </button>
        </div>
      )}

    </div>
  )
}

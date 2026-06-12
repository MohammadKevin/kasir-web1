'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Store, User, Monitor, KeyRound, Loader2, X, Coins } from 'lucide-react'
import { api } from '@/lib/api'

export default function PosLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [cashier, setCashier] = useState<any>(null)
  const [storeName, setStoreName] = useState('')
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  
  const [isOpenCloseShiftModal, setIsOpenCloseShiftModal] = useState(false)
  const [closingCashInput, setClosingCashInput] = useState<number | ''>('')

  // Open Shift States
  const [checkingShift, setCheckingShift] = useState(true)
  const [isOpenOpenShiftModal, setIsOpenOpenShiftModal] = useState(false)
  const [openingCashInput, setOpeningCashInput] = useState<number | ''>('')
  const [isOpeningShift, setIsOpeningShift] = useState(false)

  useEffect(() => {
    const hasCookieToken = typeof document !== 'undefined' ? document.cookie.split('; ').some((row) => row.startsWith('token=')) : false
    const isCashierActive = localStorage.getItem('cashierActive') === 'true'
    const cachedCashier = localStorage.getItem('cashier')
    const cachedStoreId = localStorage.getItem('storeId')
    const token = localStorage.getItem('token')

    if (!hasCookieToken || !isCashierActive || !cachedCashier || !token) {
      localStorage.clear()
      document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      document.cookie = 'userRole=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      document.cookie = 'user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      router.replace('/login')
      return
    }

    const cashierObj = JSON.parse(cachedCashier)
    setCashier(cashierObj)

    if (cachedStoreId) {
      api.get(`/stores/${cachedStoreId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => {
        if (res.data?.name) setStoreName(res.data.name)
      })
      .catch(() => setStoreName('Outlet Utama'))

      setCheckingShift(true)
      api.get(`/shifts/store/${cachedStoreId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => {
        const shifts = res.data || []
        const activeShift = shifts.find((s: any) => s.status === 'OPEN' && s.userId === cashierObj.id)
        
        if (activeShift) {
          localStorage.setItem('currentShiftId', activeShift.id)
          setIsOpenOpenShiftModal(false)
        } else {
          localStorage.removeItem('currentShiftId')
          setIsOpenOpenShiftModal(true)
        }
      })
      .catch((err) => {
        console.error('Gagal mengecek status shift:', err)
        setIsOpenOpenShiftModal(true)
      })
      .finally(() => {
        setCheckingShift(false)
      })
    } else {
      setCheckingShift(false)
    }
  }, [router])

  function handleExitPos() {
    if (confirm('Keluar dari layar kasir? Sesi shift Anda akan tetap aktif di background.')) {
      router.push('/dashboard/store')
    }
  }

  async function handleOpenShiftSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (openingCashInput === '') return alert('Masukkan nominal modal awal!')

    try {
      setIsOpeningShift(true)
      const token = localStorage.getItem('token')
      const storeId = localStorage.getItem('storeId')

      const res = await api.post('/shifts/open', {
        storeId,
        userId: cashier.id,
        openingCash: Number(openingCashInput)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (res.data?.id) {
        localStorage.setItem('currentShiftId', res.data.id)
        setIsOpenOpenShiftModal(false)
      } else {
        alert('Respon server tidak valid saat membuka shift.')
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal membuka shift kasir')
    } finally {
      setIsOpeningShift(false)
    }
  }

  async function handleCloseShiftSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (closingCashInput === '') return alert('Masukkan nominal uang penutupan laci fisik!')

    try {
      setIsLoggingOut(true)
      const token = localStorage.getItem('token')
      
      const currentShiftId = localStorage.getItem('currentShiftId') || cashier?.shiftId || cashier?.session?.id

      if (!currentShiftId) {
        localStorage.removeItem('cashier')
        localStorage.removeItem('cashierActive')
        localStorage.removeItem('currentShiftId')
        router.replace('/dashboard/store/cashier')
        return
      }

      const res = await api.post(`/shifts/${currentShiftId}/close`, {
        closingCash: Number(closingCashInput)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      const summary = res.data?.summary
      if (summary) {
        alert(
          `Shift Berhasil Ditutup!\n\n` +
          `Modal Awal: Rp ${summary.openingCash.toLocaleString('id-ID')}\n` +
          `Penjualan Tunai: Rp ${summary.cashSales.toLocaleString('id-ID')}\n` +
          `Penjualan QRIS: Rp ${(summary.qrisSales || 0).toLocaleString('id-ID')}\n` +
          `Penjualan Debit: Rp ${(summary.debitSales || 0).toLocaleString('id-ID')}\n` +
          `Ekspektasi Laci: Rp ${summary.expectedCash.toLocaleString('id-ID')}\n` +
          `Uang Fisik Aktual: Rp ${summary.closingCash.toLocaleString('id-ID')}\n` +
          `Selisih Laci: Rp ${summary.difference.toLocaleString('id-ID')}`
        )
      } else {
        alert('Shift berhasil ditutup!')
      }

      localStorage.removeItem('cashier')
      localStorage.removeItem('cashierActive')
      localStorage.removeItem('currentShiftId')
      setIsOpenCloseShiftModal(false)
      router.replace('/dashboard/store/cashier')
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal mengeksekusi penutupan shift kasir')
    } finally {
      setIsLoggingOut(false)
    }
  }

  if (checkingShift) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="animate-spin text-indigo-600" size={32} />
          <p className="text-xs font-semibold text-slate-500">Memverifikasi sesi shift kasir...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-800 antialiased overflow-hidden select-none">
      
      {/* Header POS */}
      <header className="h-14 bg-white border-b border-slate-200/80 px-4 flex items-center justify-between flex-shrink-0 shadow-3xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-xl text-xs font-bold text-indigo-600">
            <Monitor size={14} />
            <span>TERMINAL POS v.1.0</span>
          </div>
          <div className="hidden md:flex items-center gap-1 text-xs font-bold text-slate-500">
            <Store size={13} className="text-slate-400" />
            <span>{storeName || 'Memuat Outlet...'}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 border-r border-slate-200 pr-4">
            <div className="h-7 w-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 font-bold text-[10px]">
              {cashier?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-[8.5px] text-slate-400 font-bold uppercase tracking-wider leading-none">Kasir Aktif</p>
              <p className="text-xs font-black text-slate-850 mt-0.5 leading-none">{cashier?.name || 'Loading...'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => { setClosingCashInput(''); setIsOpenCloseShiftModal(true); }}
              className="flex items-center gap-1 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-600 transition-all cursor-pointer active:scale-97"
              title="Tutup laci kasir dan simpan rekap log penjualan harian"
            >
              <KeyRound size={13} />
              <span className="hidden sm:inline">Tutup Shift</span>
            </button>

            <button
              onClick={handleExitPos}
              className="flex items-center gap-1 rounded-xl bg-indigo-650 hover:bg-indigo-700 px-3 py-1.5 text-xs font-bold text-white transition-all shadow-3xs cursor-pointer active:scale-97"
            >
              <LogOut size={13} />
              <span className="hidden sm:inline">Dashboard</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main POS Container */}
      <main className="flex-1 overflow-hidden p-4">
        {children}
      </main>

      {/* Open Shift Modal */}
      {isOpenOpenShiftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-all animate-in fade-in duration-200">
          <div className="w-full max-w-xs overflow-hidden rounded-2xl border border-slate-150 bg-white p-6 shadow-xl relative animate-in zoom-in-95 duration-150 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900">Buka Shift Baru</h3>
              <p className="text-[10px] font-semibold text-slate-450 mt-0.5">Masukkan modal kas kecil awal untuk memulai sesi kasir.</p>
            </div>
            
            <form onSubmit={handleOpenShiftSubmit} className="space-y-4">
              <div>
                <label className="block text-[9.5px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Modal Awal Laci Kas (Rp) *</label>
                <div className="relative">
                  <Coins className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="number"
                    required
                    min={0}
                    placeholder="Masukkan modal awal"
                    value={openingCashInput}
                    onChange={e => setOpeningCashInput(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full border border-slate-200/80 rounded-xl bg-slate-50/50 pl-10 pr-4 py-2.5 text-xs font-mono font-bold text-slate-900 outline-none focus:bg-white focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => router.push('/dashboard/store')}
                  className="rounded-xl border border-slate-200 bg-white py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isOpeningShift || openingCashInput === ''}
                  className="rounded-xl bg-indigo-600 text-white py-2 text-xs font-bold hover:bg-indigo-750 shadow-indigo-500/10 transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-97"
                >
                  {isOpeningShift ? (
                    <Loader2 className="animate-spin" size={13} />
                  ) : (
                    <span>Buka Shift</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Close Shift Modal */}
      {isOpenCloseShiftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-all animate-in fade-in duration-200">
          <div className="w-full max-w-xs overflow-hidden rounded-2xl border border-slate-150 bg-white p-6 shadow-xl relative animate-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900">Rekonsiliasi Kas Selesai</h3>
              <button 
                type="button" 
                onClick={() => setIsOpenCloseShiftModal(false)} 
                className="rounded-lg p-0.5 text-slate-400 hover:bg-slate-50 hover:text-slate-655 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleCloseShiftSubmit} className="space-y-4">
              <div>
                <label className="block text-[9.5px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Total Uang Fisik Di Laci *</label>
                <div className="relative">
                  <Coins className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="number"
                    required
                    min={0}
                    placeholder="0"
                    value={closingCashInput}
                    onChange={e => setClosingCashInput(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full border border-slate-200/80 rounded-xl bg-slate-50/50 pl-10 pr-4 py-2.5 text-xs font-mono font-bold text-slate-900 outline-none focus:bg-white focus:border-indigo-500 transition-all"
                  />
                </div>
                <p className="text-[9.5px] font-semibold text-slate-400 mt-2 leading-relaxed">Hitung lembaran uang kertas dan koin fisik di dalam laci tunai aktual untuk memverifikasi selisih pembukuan.</p>
              </div>

              <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  disabled={isLoggingOut}
                  onClick={() => setIsOpenCloseShiftModal(false)}
                  className="rounded-xl border border-slate-200 bg-white py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isLoggingOut || closingCashInput === ''}
                  className="rounded-xl bg-rose-600 text-white py-2 text-xs font-bold hover:bg-rose-700 transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-97"
                >
                  {isLoggingOut ? (
                    <Loader2 className="animate-spin" size={13} />
                  ) : (
                    <span>Selesai Shift</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
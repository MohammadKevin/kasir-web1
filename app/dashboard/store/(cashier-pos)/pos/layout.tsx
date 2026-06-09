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

  useEffect(() => {
    const isCashierActive = localStorage.getItem('cashierActive') === 'true'
    const cachedCashier = localStorage.getItem('cashier')
    const cachedStoreId = localStorage.getItem('storeId')
    const token = localStorage.getItem('token')

    if (!isCashierActive || !cachedCashier || !token) {
      router.replace('/dashboard/store/cashier')
      return
    }

    setCashier(JSON.parse(cachedCashier))

    if (cachedStoreId) {
      api.get(`/stores/${cachedStoreId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => {
        if (res.data?.name) setStoreName(res.data.name)
      })
      .catch(() => setStoreName('Outlet Utama'))
    }
  }, [router])

  function handleExitPos() {
    if (confirm('Keluar dari layar kasir? Sesi shift Anda akan tetap aktif di background.')) {
      router.push('/dashboard/store')
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

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-800 antialiased overflow-hidden select-none">
      
      <header className="h-14 bg-slate-900 text-white px-4 flex items-center justify-between flex-shrink-0 shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-lg text-xs font-semibold text-blue-400">
            <Monitor size={14} />
            <span>TERMINAL POS</span>
          </div>
          <div className="flex items-center gap-1 text-xs font-medium text-slate-300">
            <Store size={13} className="text-slate-400" />
            <span>{storeName || 'Memuat Outlet...'}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 border-r border-slate-700 pr-4">
            <div className="h-7 w-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
              <User size={14} />
            </div>
            <div className="text-left">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none">Petugas Shift</p>
              <p className="text-xs font-semibold text-slate-100 mt-0.5 leading-none">{cashier?.name || 'Loading...'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => { setClosingCashInput(''); setIsOpenCloseShiftModal(true); }}
              className="flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-700 px-3 py-1.5 text-xs font-bold text-white transition-all shadow-sm"
              title="Tutup laci kasir dan simpan rekap log penjualan harian"
            >
              <KeyRound size={13} />
              <span>Tutup Shift</span>
            </button>

            <button
              onClick={handleExitPos}
              className="flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-all"
            >
              <LogOut size={13} />
              <span>Dashboard</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden p-4">
        {children}
      </main>

      {/* POP-UP MODAL INPUT CASH RECONCILIATION CLOSING SHIFT */}
      {isOpenCloseShiftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs">
          <div className="w-full max-w-xs overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-sm font-bold text-slate-900">Rekonsiliasi Kas Selesai</h3>
              <button type="button" onClick={() => setIsOpenCloseShiftModal(false)} className="rounded p-0.5 text-slate-400 hover:bg-slate-50"><X size={16} /></button>
            </div>
            
            <form onSubmit={handleCloseShiftSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Uang Fisik Di Laci Akomodasi *</label>
                <div className="relative">
                  <Coins className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="number"
                    required
                    min={0}
                    placeholder="0"
                    value={closingCashInput}
                    onChange={e => setClosingCashInput(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full border border-slate-200 rounded-lg bg-slate-50/50 pl-9 pr-4 py-2 text-xs font-mono font-bold text-slate-900 outline-none focus:bg-white focus:border-slate-400"
                  />
                </div>
                <p className="text-[10px] text-slate-400 leading-normal">Hitung lembaran uang kertas dan koin fisik di dalam laci tunai aktual untuk memverifikasi selisih pembukuan.</p>
              </div>

              <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  disabled={isLoggingOut}
                  onClick={() => setIsOpenCloseShiftModal(false)}
                  className="rounded-lg border border-slate-200 bg-white py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isLoggingOut || closingCashInput === ''}
                  className="rounded-lg bg-red-600 text-white py-1.5 text-xs font-bold hover:bg-red-700 shadow-3xs flex items-center justify-center gap-1"
                >
                  {isLoggingOut ? (
                    <Loader2 className="animate-spin" size={13} />
                  ) : (
                    <>
                      <span>Selesai Shift</span>
                    </>
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
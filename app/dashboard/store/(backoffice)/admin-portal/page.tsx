'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { 
  ShieldCheck, 
  Lock, 
  Unlock, 
  Printer, 
  Package, 
  Clock, 
  ArrowLeft, 
  AlertCircle, 
  Loader2,
  Wallet,
  FileText
} from 'lucide-react'

export default function AdminPortalPage() {
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [cashierName, setCashierName] = useState('')

  useEffect(() => {
    checkAdminStatus()
  }, [])

  function checkAdminStatus() {
    setLoading(true)
    const cachedCashier = localStorage.getItem('cashier')
    if (cachedCashier) {
      try {
        const cashierObj = JSON.parse(cachedCashier)
        if (cashierObj && (cashierObj.isStoreAdmin || (cashierObj.name && cashierObj.name.toLowerCase().includes('admin')))) {
          setIsAdmin(true)
          setCashierName(cashierObj.name)
        } else {
          setIsAdmin(false)
        }
      } catch (e) {
        console.error(e)
        setIsAdmin(false)
      }
    } else {
      setIsAdmin(false)
    }
    setLoading(false)
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    if (!pin || pin.length < 4) {
      setError('PIN harus berisi 4-6 digit angka.')
      return
    }

    const storeId = localStorage.getItem('storeId')
    if (!storeId) {
      setError('ID Toko tidak ditemukan. Hubungi administrator.')
      return
    }

    setVerifying(true)
    setError('')

    try {
      const { data } = await api.post('/cashier/verify-admin-pin', {
        storeId,
        pin
      })

      if (data.success && data.cashier) {
        // Save original cashier session if one exists and isn't already admin
        const current = localStorage.getItem('cashier')
        if (current) {
          try {
            const parsed = JSON.parse(current)
            if (!(parsed.isStoreAdmin || (parsed.name && parsed.name.toLowerCase().includes('admin')))) {
              localStorage.setItem('previousCashier', current)
            }
          } catch (e) {
            console.error(e)
          }
        }

        // Save to localstorage and activate
        localStorage.setItem('cashier', JSON.stringify(data.cashier))
        localStorage.setItem('cashierActive', 'true')
        
        setIsAdmin(true)
        setCashierName(data.cashier.name)
        
        // Force refresh layout and state
        window.location.reload()
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'PIN Admin Store salah atau tidak terdaftar!')
    } finally {
      setVerifying(false)
    }
  }

  function exitAdminStore() {
    const prev = localStorage.getItem('previousCashier')
    if (prev) {
      localStorage.setItem('cashier', prev)
      localStorage.removeItem('previousCashier')
    } else {
      localStorage.removeItem('cashier')
      localStorage.removeItem('cashierActive')
    }
    window.location.href = '/dashboard/store'
  }

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-2">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-650" />
        <p className="text-xs font-bold text-slate-500">Memeriksa hak akses...</p>
      </div>
    )
  }

  // Render Lock Screen if not Admin Store
  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto py-12 px-4 animate-in fade-in duration-200">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 relative overflow-hidden text-center">
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-500 to-amber-600"></div>
          
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="h-14 w-14 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-650 shrink-0">
              <Lock size={28} className="text-amber-500" />
            </div>
            <h1 className="text-lg font-black text-slate-900 tracking-tight">Otorisasi Admin Store</h1>
            <p className="text-xs font-medium text-slate-400 max-w-xs leading-relaxed">
              Halaman ini dibatasi. Masukkan kode PIN staf kasir yang memiliki hak akses **Admin Store** untuk membukanya.
            </p>
          </div>

          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">PIN Otorisasi Admin *</label>
              <input
                type="password"
                maxLength={6}
                required
                value={pin}
                onChange={e => {
                  setPin(e.target.value)
                  setError('')
                }}
                placeholder="Masukkan PIN Admin Store"
                className="w-full text-center tracking-widest rounded-xl border border-slate-200 py-3.5 text-sm text-slate-900 placeholder:text-slate-400 placeholder:tracking-normal focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-mono font-bold"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-xl font-semibold text-left">
                <AlertCircle size={14} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => router.push('/dashboard/store')}
                className="flex-1 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 py-3 text-xs font-bold text-slate-700 transition-all shadow-3xs cursor-pointer active:scale-97 flex items-center justify-center gap-1.5"
              >
                <ArrowLeft size={14} />
                Batal
              </button>
              <button
                type="submit"
                disabled={verifying}
                className="flex-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 py-3 text-xs font-bold text-white transition-all shadow-md shadow-indigo-600/10 cursor-pointer active:scale-97 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {verifying ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Memverifikasi...
                  </>
                ) : (
                  <>
                    <Unlock size={14} />
                    Verifikasi PIN
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  // Render Portal Dashboard if Admin Store
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-indigo-50 border border-indigo-100/50 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Portal Admin Store</h1>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">
              Selamat datang kembali, <span className="text-indigo-600 font-extrabold">{cashierName}</span>. Kelola otorisasi operasional outlet Anda.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exitAdminStore}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 px-4 py-2.5 text-xs font-bold text-amber-700 shadow-3xs transition-all active:scale-97 cursor-pointer"
          >
            <ShieldCheck size={14} />
            <span>Kembali ke Sesi Kasir</span>
          </button>
          <button
            onClick={() => router.push('/dashboard/store/cashier')}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-750 shadow-3xs transition-all active:scale-97 cursor-pointer"
          >
            <Wallet size={14} className="text-slate-500" />
            <span>Buka Terminal Kasir</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        
        {/* Card 1: Cetak Barcode */}
        <div 
          onClick={() => router.push('/dashboard/store/barcode')}
          className="group bg-white border border-slate-200 rounded-3xl p-5 hover:border-indigo-500 hover:shadow-md cursor-pointer transition-all duration-300 flex flex-col justify-between h-44 relative overflow-hidden"
        >
          <div className="absolute right-0 bottom-0 translate-x-2 translate-y-2 opacity-5 group-hover:opacity-10 group-hover:scale-105 transition-all text-indigo-650 pointer-events-none">
            <Printer size={120} />
          </div>
          <div className="space-y-2.5">
            <div className="h-9 w-9 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-650 shrink-0">
              <Printer size={16} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 tracking-tight">Cetak Barcode SKU</h3>
              <p className="text-[11px] font-semibold text-slate-400 mt-0.5 leading-relaxed">
                Generate kode barcode SKU baru secara otomatis dan lakukan cetak label barcode baju/tunik secara kolektif.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold text-indigo-600 group-hover:underline flex items-center gap-1">
            Buka Halaman Barcode SKU &rarr;
          </span>
        </div>

        {/* Card 2: Kelola Katalog */}
        <div 
          onClick={() => router.push('/dashboard/store/products')}
          className="group bg-white border border-slate-200 rounded-3xl p-5 hover:border-indigo-500 hover:shadow-md cursor-pointer transition-all duration-300 flex flex-col justify-between h-44 relative overflow-hidden"
        >
          <div className="absolute right-0 bottom-0 translate-x-2 translate-y-2 opacity-5 group-hover:opacity-10 group-hover:scale-105 transition-all text-indigo-650 pointer-events-none">
            <Package size={120} />
          </div>
          <div className="space-y-2.5">
            <div className="h-9 w-9 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-650 shrink-0">
              <Package size={16} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 tracking-tight">Kelola Katalog Produk</h3>
              <p className="text-[11px] font-semibold text-slate-400 mt-0.5 leading-relaxed">
                Akses kelola produk terikat cabang: Tambah, edit detail harga jual/modal, update stok fisik, dan hapus katalog.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold text-indigo-600 group-hover:underline flex items-center gap-1">
            Buka Katalog Produk &rarr;
          </span>
        </div>

        {/* Card 3: Riwayat Transaksi & Void */}
        <div 
          onClick={() => router.push('/dashboard/store')}
          className="group bg-white border border-slate-200 rounded-3xl p-5 hover:border-indigo-500 hover:shadow-md cursor-pointer transition-all duration-300 flex flex-col justify-between h-44 relative overflow-hidden"
        >
          <div className="absolute right-0 bottom-0 translate-x-2 translate-y-2 opacity-5 group-hover:opacity-10 group-hover:scale-105 transition-all text-indigo-650 pointer-events-none">
            <FileText size={120} />
          </div>
          <div className="space-y-2.5">
            <div className="h-9 w-9 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-650 shrink-0">
              <FileText size={16} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 tracking-tight">Buka Otoritas Void</h3>
              <p className="text-[11px] font-semibold text-slate-400 mt-0.5 leading-relaxed">
                Buka list transaksi kasir di dashboard outlet utama untuk melakukan verifikasi Void (pembatalan transaksi kasir).
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold text-indigo-600 group-hover:underline flex items-center gap-1">
            Buka Transaksi Dashboard &rarr;
          </span>
        </div>

        {/* Card 4: Riwayat Shift */}
        <div 
          onClick={() => router.push('/dashboard/store/shifts')}
          className="group bg-white border border-slate-200 rounded-3xl p-5 hover:border-indigo-500 hover:shadow-md cursor-pointer transition-all duration-300 flex flex-col justify-between h-44 relative overflow-hidden"
        >
          <div className="absolute right-0 bottom-0 translate-x-2 translate-y-2 opacity-5 group-hover:opacity-10 group-hover:scale-105 transition-all text-indigo-650 pointer-events-none">
            <Clock size={120} />
          </div>
          <div className="space-y-2.5">
            <div className="h-9 w-9 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-650 shrink-0">
              <Clock size={16} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 tracking-tight">Riwayat Shift & Keuangan</h3>
              <p className="text-[11px] font-semibold text-slate-400 mt-0.5 leading-relaxed">
                Pantau log laporan buka/tutup shift kasir beserta total uang laci aktual dan rincian transaksi harian.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold text-indigo-600 group-hover:underline flex items-center gap-1">
            Buka Riwayat Shift &rarr;
          </span>
        </div>

      </div>

    </div>
  )
}

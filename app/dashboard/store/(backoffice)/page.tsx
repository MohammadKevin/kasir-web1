'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Package,
  ShoppingCart,
  Wallet,
  ArrowUpRight,
  Users,
  ShieldCheck,
  Clock,
  AlertTriangle,
  Lock,
  Barcode,
  Loader2,
  X
} from 'lucide-react'
import { api } from '@/lib/api'

type Summary = {
  todaySales: number
  todayTransactions: number
  todayPurchase: number
  todayProductsSold: number
  totalCustomers: number
  lowStockProducts: number
  activeShift: number
}

type Transaction = {
  id: string
  invoiceNumber: string
  subtotal: number
  totalDiscount: number
  total: number
  paidAmount: number
  changeAmount: number
  paymentMethod: string
  status: string
  voidReason?: string
  cashier?: {
    name: string
  }
  createdAt: string
}

export default function StoreDashboard() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  
  // Store Attendance States
  const [storeOpen, setStoreOpen] = useState(false)
  const [storeAttendance, setStoreAttendance] = useState<any>(null)
  const [checkingStore, setCheckingStore] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  // Recent Transactions States
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loadingTransactions, setLoadingTransactions] = useState(true)
  const [isAdminKasir, setIsAdminKasir] = useState(false)
  const [storeId, setStoreId] = useState('')

  // Void modal states
  const [isOpenVoidModal, setIsOpenVoidModal] = useState(false)
  const [voidId, setVoidId] = useState('')
  const [voidReason, setVoidReason] = useState('')
  const [isSubmittingVoid, setIsSubmittingVoid] = useState(false)

  const [summary, setSummary] = useState<Summary>({
    todaySales: 0,
    todayTransactions: 0,
    todayPurchase: 0,
    todayProductsSold: 0,
    totalCustomers: 0,
    lowStockProducts: 0,
    activeShift: 0
  })

  useEffect(() => {
    const u = localStorage.getItem('user')
    if (u) {
      setUser(JSON.parse(u))
    }
    const cachedStoreId = localStorage.getItem('storeId') || ''
    setStoreId(cachedStoreId)

    loadDashboardData()
    checkStoreStatus()

    if (cachedStoreId) {
      loadRecentTransactions(cachedStoreId)
    }

    const cachedCashier = localStorage.getItem('cashier')
    if (cachedCashier) {
      try {
        const cashierObj = JSON.parse(cachedCashier)
        if (cashierObj && (cashierObj.isStoreAdmin || (cashierObj.name && cashierObj.name.toLowerCase().includes('admin')))) {
          setIsAdminKasir(true)
        }
      } catch (e) {
        console.error(e)
      }
    }
  }, [])

  async function loadDashboardData() {
    try {
      const cachedStoreId = localStorage.getItem('storeId')
      const token = localStorage.getItem('token')

      if (!cachedStoreId) return

      const headers = { Authorization: `Bearer ${token}` }

      const res = await api.get(`/dashboard/${cachedStoreId}`, { headers })
      if (res.data) {
        setSummary({
          todaySales: Number(res.data.todaySales || 0),
          todayTransactions: Number(res.data.todayTransactions || 0),
          todayPurchase: Number(res.data.todayPurchase || 0),
          todayProductsSold: Number(res.data.todayProductsSold || 0),
          totalCustomers: Number(res.data.totalCustomers || 0),
          lowStockProducts: Number(res.data.lowStockProducts || 0),
          activeShift: Number(res.data.activeShift || 0)
        })
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function loadRecentTransactions(id: string) {
    setLoadingTransactions(true)
    const token = localStorage.getItem('token')
    const headers = { Authorization: `Bearer ${token}` }
    try {
      const res = await api.get(`/transactions/store/${id}`, { headers })
      // Sort by date descending and take top 10
      const sorted = (res.data || []).sort(
        (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      setTransactions(sorted.slice(0, 10))
    } catch (err) {
      console.error('Gagal memuat transaksi terbaru:', err)
    } finally {
      setLoadingTransactions(false)
    }
  }

  async function checkStoreStatus() {
    try {
      const token = localStorage.getItem('token')
      const headers = { Authorization: `Bearer ${token}` }
      const res = await api.get('/attendance/store/status', { headers })
      setStoreOpen(res.data.isOpen)
      setStoreAttendance(res.data.attendance)
      if (res.data.isOpen) {
        localStorage.setItem('storeOpen', 'true')
      } else {
        localStorage.removeItem('storeOpen')
      }
    } catch (err) {
      console.error('Gagal memuat status buka toko:', err)
    } finally {
      setCheckingStore(false)
    }
  }

  async function handleOpenStore() {
    setActionLoading(true)
    try {
      const token = localStorage.getItem('token')
      const headers = { Authorization: `Bearer ${token}` }
      const res = await api.post('/attendance/store/open', {}, { headers })
      setStoreOpen(true)
      setStoreAttendance(res.data)
      localStorage.setItem('storeOpen', 'true')
      alert('Toko berhasil dibuka! Selamat bekerja.')
      if (storeId) {
        loadRecentTransactions(storeId)
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal membuka toko')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleCloseStore() {
    if (!confirm('Apakah Anda yakin ingin menutup toko hari ini?')) return
    setActionLoading(true)
    try {
      const token = localStorage.getItem('token')
      const headers = { Authorization: `Bearer ${token}` }
      await api.post('/attendance/store/close', {}, { headers })
      setStoreOpen(false)
      setStoreAttendance(null)
      localStorage.removeItem('storeOpen')
      localStorage.removeItem('cashier')
      localStorage.removeItem('cashierActive')
      localStorage.removeItem('currentShiftId')
      alert('Toko berhasil ditutup! Sampai jumpa besok.')
      setTransactions([])
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal menutup toko')
    } finally {
      setActionLoading(false)
    }
  }

  function openVoid(id: string) {
    setVoidId(id)
    setVoidReason('')
    setIsOpenVoidModal(true)
  }

  async function handleConfirmVoid(e: React.FormEvent) {
    e.preventDefault()
    if (!voidReason.trim()) return alert('Alasan pembatalan (Void) wajib diisi!')

    setIsSubmittingVoid(true)
    try {
      const token = localStorage.getItem('token')
      await api.patch(`/transactions/${voidId}/void`, { reason: voidReason.trim() }, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      setIsOpenVoidModal(false)
      alert('Transaksi berhasil dibatalkan (Void)')
      if (storeId) {
        loadRecentTransactions(storeId)
        loadDashboardData() // Refresh dashboard cards
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Gagal membatalkan transaksi'
      alert(Array.isArray(msg) ? msg.join(', ') : msg)
    } finally {
      setIsSubmittingVoid(false)
    }
  }

  const formatIDR = (num: number) => `Rp ${num.toLocaleString('id-ID')}`

  const isCashierActive = summary.activeShift > 0 && (typeof window !== 'undefined' && localStorage.getItem('cashierActive') === 'true')

  return (
    <div className="space-y-6">
      
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Ringkasan Outlet</h1>
          <p className="text-xs font-semibold text-slate-400 mt-0.5">
            Selamat datang kembali, <span className="text-indigo-600 font-bold">{user?.name || 'Owner'}</span>
          </p>
        </div>
        <div className="text-right text-[10px] text-slate-400 font-bold tracking-wider uppercase bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md">
          Sesi: Terotentikasi
        </div>
      </div>

      {/* Store Attendance Block */}
      <div className={`p-5 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-200 ${
        storeOpen 
          ? 'bg-emerald-50/40 border-emerald-150 text-slate-800 animate-in fade-in duration-300' 
          : 'bg-amber-50/40 border-amber-150 text-slate-800 animate-in fade-in duration-300'
      }`}>
        <div className="flex gap-3 items-start">
          <div className={`p-2.5 rounded-xl border shrink-0 ${
            storeOpen 
              ? 'bg-emerald-100/50 border-emerald-200 text-emerald-600' 
              : 'bg-amber-100/50 border-amber-200 text-amber-600'
          }`}>
            <Clock size={18} />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider">
              Status Operasional Toko: {storeOpen ? 'BUKA' : 'TUTUP'}
            </h3>
            <p className="text-[11px] font-semibold text-slate-500 mt-1">
              {storeOpen 
                ? `Toko dibuka sejak: ${storeAttendance?.openTime ? new Date(storeAttendance.openTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}. Terminal kasir kini aktif.`
                : 'Toko belum dibuka. Silakan klik "Mulai Buka Toko" untuk mengaktifkan terminal kasir dan mulai absensi toko.'
              }
            </p>
          </div>
        </div>
        <button
          onClick={storeOpen ? handleCloseStore : handleOpenStore}
          disabled={actionLoading || checkingStore}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold shadow-3xs transition-all active:scale-97 cursor-pointer shrink-0 disabled:opacity-50 ${
            storeOpen 
              ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/10' 
              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/10'
          }`}
        >
          {actionLoading ? 'Memproses...' : storeOpen ? 'Tutup Toko' : 'Mulai Buka Toko'}
        </button>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
        <Card 
          icon={Wallet} 
          title="Omset Hari Ini" 
          value={loading ? '...' : formatIDR(summary.todaySales)} 
          isMono
          highlight
        />
        <Card 
          icon={ShoppingCart} 
          title="Transaksi Hari Ini" 
          value={loading ? '...' : `${summary.todayTransactions} Nota`} 
        />
        <Card 
          icon={Package} 
          title="Produk Terjual" 
          value={loading ? '...' : `${summary.todayProductsSold} Pcs`} 
        />
        <div className="border border-slate-200/80 rounded-2xl p-5 bg-white flex flex-col justify-between h-28 shadow-3xs relative overflow-hidden">
          <div className="flex justify-between items-start text-slate-400">
            <Users size={18} className="text-indigo-500" />
            <span className={`h-2.5 w-2.5 rounded-full mt-0.5 ${isCashierActive ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-amber-400'}`} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Status Terminal</p>
            <p className="text-xs font-black text-slate-900 mt-2 leading-none uppercase">
              {isCashierActive ? 'KASIR AKTIF' : 'BELUM AKTIVASI'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {storeOpen ? (
          <Link
            href={isCashierActive ? "/dashboard/store/pos" : "/dashboard/store/cashier"}
            className="group border border-slate-200 bg-white p-5 rounded-2xl hover:bg-slate-50/50 hover:border-slate-350 transition-all flex justify-between items-start shadow-3xs cursor-pointer"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-indigo-600" />
                <h2 className="text-xs font-black text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-wider">Terminal Kasir</h2>
              </div>
              <p className="text-[11px] font-semibold text-slate-400 leading-relaxed">Buka sesi kerja, pilih personil, dan verifikasi PIN laci POS.</p>
            </div>
            <ArrowUpRight size={14} className="text-slate-400 group-hover:text-indigo-600 transition-colors shrink-0" />
          </Link>
        ) : (
          <button
            onClick={() => alert('Silakan klik "Mulai Buka Toko" terlebih dahulu untuk mengakses Terminal Kasir!')}
            className="group border border-slate-200 bg-slate-50/50 opacity-60 p-5 rounded-2xl flex justify-between items-start shadow-3xs cursor-not-allowed text-left w-full"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-slate-450" />
                <h2 className="text-xs font-black text-slate-500 uppercase tracking-wider">Terminal Kasir</h2>
              </div>
              <p className="text-[11px] font-semibold text-slate-400 leading-relaxed">Buka sesi kerja, pilih personil, dan verifikasi PIN laci POS.</p>
            </div>
            <Lock size={14} className="text-slate-400 shrink-0 mt-0.5" />
          </button>
        )}

        {isAdminKasir && (
          <Link
            href="/dashboard/store/products"
            className="group border border-slate-200 bg-white p-5 rounded-2xl hover:bg-slate-50/50 hover:border-slate-350 transition-all flex justify-between items-start shadow-3xs cursor-pointer"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Package size={16} className="text-indigo-600" />
                <h2 className="text-xs font-black text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-wider">Katalog Produk</h2>
              </div>
              <p className="text-[11px] font-semibold text-slate-400 leading-relaxed">Pantau ketersediaan stok barang dan penataan master list data.</p>
            </div>
            <ArrowUpRight size={14} className="text-slate-400 group-hover:text-indigo-600 transition-colors shrink-0" />
          </Link>
        )}

        {isAdminKasir && (
          <Link
            href="/dashboard/store/barcode"
            className="group border border-slate-200 bg-white p-5 rounded-2xl hover:bg-slate-50/50 hover:border-slate-350 transition-all flex justify-between items-start shadow-3xs cursor-pointer"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Barcode size={16} className="text-indigo-600" />
                <h2 className="text-xs font-black text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-wider">Barcode SKU</h2>
              </div>
              <p className="text-[11px] font-semibold text-slate-400 leading-relaxed">Generate kode barcode baru untuk produk dan cetak tag label thermal.</p>
            </div>
            <ArrowUpRight size={14} className="text-slate-400 group-hover:text-indigo-600 transition-colors shrink-0" />
          </Link>
        )}

        <div className="border border-slate-200 bg-white p-5 rounded-2xl flex justify-between items-start shadow-3xs">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className={summary.lowStockProducts > 0 ? 'text-rose-500 animate-pulse' : 'text-slate-400'} />
              <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">Peringatan Stok</h2>
            </div>
            <p className="text-[11px] font-semibold text-slate-400 leading-relaxed">
              {summary.lowStockProducts > 0 ? (
                <span>Ada <span className="font-extrabold text-rose-600">{summary.lowStockProducts} produk</span> dengan stok sangat tipis (di bawah 5 pcs).</span>
              ) : (
                <span>Stok aman. Tidak ada barang yang kehabisan saat ini.</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Riwayat Transaksi Terbaru Table Section */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-3xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Riwayat Transaksi Terbaru (Limit 10)</h2>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5">Monitoring transaksi penjualan terupdate di outlet cabang ini</p>
          </div>
          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg">
            Terbaca: {transactions.length} Nota
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                <th className="p-4 pl-6">No. Invoice</th>
                <th className="p-4">Tanggal & Waktu</th>
                <th className="p-4">Operator / Kasir</th>
                <th className="p-4">Total Belanja</th>
                <th className="p-4">Metode Bayar</th>
                <th className="p-4">Status</th>
                <th className="p-4 pr-6 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600 font-semibold">
              {loadingTransactions ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center">
                    <Loader2 className="w-5 h-5 animate-spin text-slate-400 mx-auto" />
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400 font-bold">
                    Belum ada transaksi terekam hari ini.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const txDate = new Date(tx.createdAt)
                  const formattedDateTime = `${txDate.toLocaleDateString('id-ID')} ${txDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/45 transition-colors">
                      <td className="p-4 pl-6 font-mono font-bold text-slate-900">
                        {tx.invoiceNumber}
                      </td>
                      <td className="p-4">
                        {formattedDateTime}
                      </td>
                      <td className="p-4">
                        {tx.cashier?.name || 'Kasir'}
                      </td>
                      <td className="p-4 font-mono font-extrabold text-slate-900">
                        {formatIDR(tx.total)}
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center rounded-md bg-slate-50 border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                          {tx.paymentMethod === 'CASH' ? 'Tunai' : tx.paymentMethod === 'QRIS' ? 'QRIS' : tx.paymentMethod === 'DEBIT' ? 'Debit' : tx.paymentMethod}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-bold border text-[9px] uppercase tracking-wider ${
                          tx.status === 'PAID' 
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                            : tx.status === 'CANCELLED'
                            ? 'bg-rose-50 border-rose-200 text-rose-700'
                            : 'bg-slate-50 border-slate-200 text-slate-400'
                        }`}>
                          <span className={`h-1 w-1 rounded-full ${tx.status === 'PAID' ? 'bg-emerald-500' : tx.status === 'CANCELLED' ? 'bg-rose-500' : 'bg-slate-400'}`} />
                          {tx.status === 'PAID' ? 'Lunas' : tx.status === 'CANCELLED' ? 'Dibatalkan (Void)' : tx.status}
                        </span>
                        {tx.voidReason && (
                          <span className="block text-[9px] text-slate-400 italic mt-0.5 max-w-[150px] truncate" title={tx.voidReason}>
                            Alasan: {tx.voidReason}
                          </span>
                        )}
                      </td>
                      <td className="p-4 pr-6 text-right">
                        {tx.status === 'PAID' && isAdminKasir && (
                          <button
                            onClick={() => openVoid(tx.id)}
                            className="rounded-xl border border-rose-200 hover:border-rose-455 bg-white text-rose-600 hover:bg-rose-50 px-3 py-1.5 text-[10px] font-bold transition-all active:scale-97 cursor-pointer"
                          >
                            Void
                          </button>
                        )}
                        {tx.status !== 'PAID' && (
                          <span className="text-slate-300 text-xs italic">-</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="border border-indigo-100 bg-indigo-50/35 p-5 rounded-2xl flex items-start gap-3 shadow-3xs">
        <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600 shrink-0">
          <Clock size={16} />
        </div>
        <div>
          <h3 className="text-xs font-black text-indigo-600 uppercase tracking-wider leading-none">SOP Penjualan Harian</h3>
          <p className="text-xs text-slate-600 mt-2.5 leading-relaxed font-semibold">
            Pilih Personel Kasir <span className="text-slate-350">→</span> Masukkan PIN <span className="text-slate-350">→</span> Input Modal Kas Kecil <span className="text-slate-350">→</span> Buka POS Scan Penjualan.
          </p>
        </div>
      </div>

      {/* Void Confirmation Modal */}
      {isOpenVoidModal && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={e => { if (e.target === e.currentTarget) setIsOpenVoidModal(false) }}
        >
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200/80 animate-in slide-in-from-bottom-3 duration-250 flex flex-col">
            
            <div className="p-6 pb-0 flex items-start justify-between">
              <div>
                <h3 className="text-base font-black text-slate-950">Batalkan Transaksi (Void)</h3>
                <p className="text-[10.5px] font-semibold text-slate-400 mt-0.5">
                  Transaksi yang dibatalkan akan mengembalikan persediaan stok produk otomatis.
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setIsOpenVoidModal(false)}
                className="h-8 w-8 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="h-px bg-slate-100 my-4 mx-6" />

            <form onSubmit={handleConfirmVoid} className="p-6 pt-0 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block">Alasan Void *</label>
                <input
                  type="text"
                  required
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="Contoh: Kesalahan input item belanja / Pelanggan batal bayar"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-rose-550 focus:outline-none focus:ring-4 focus:ring-rose-500/10 transition-all font-semibold"
                  autoFocus
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsOpenVoidModal(false)} 
                  disabled={isSubmittingVoid}
                  className="flex-1 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 py-3 text-xs font-bold text-slate-655 transition-all active:scale-98 cursor-pointer disabled:opacity-50 text-slate-600"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmittingVoid || !voidReason.trim()}
                  className="flex-1 rounded-xl bg-rose-605 hover:bg-rose-700 py-3 text-xs font-bold text-white shadow-md shadow-rose-600/15 transition-all active:scale-98 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer bg-rose-600"
                >
                  {isSubmittingVoid ? (
                    <>
                      <Loader2 size={14} className="animate-spin text-white" />
                      <span>Memproses...</span>
                    </>
                  ) : (
                    <span>Konfirmasi Void</span>
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

function Card({ icon: Icon, title, value, isMono = false, highlight = false }: any) {
  return (
    <div className="border border-slate-200 rounded-2xl p-5 bg-white flex flex-col justify-between h-28 shadow-3xs relative overflow-hidden group hover:border-slate-350 transition-all">
      {highlight && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-650 bg-indigo-650" style={{ backgroundColor: '#4f46e5' }} />
      )}
      <div className={highlight ? 'text-indigo-600' : 'text-slate-400'}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">{title}</p>
        <p className={`text-base font-black text-slate-900 mt-2 leading-none ${isMono ? 'font-mono' : ''}`}>
          {value}
        </p>
      </div>
    </div>
  )
}

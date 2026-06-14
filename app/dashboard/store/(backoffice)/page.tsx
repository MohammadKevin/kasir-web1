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
  Barcode
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

export default function StoreDashboard() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  
  // Store Attendance States
  const [storeOpen, setStoreOpen] = useState(false)
  const [storeAttendance, setStoreAttendance] = useState<any>(null)
  const [checkingStore, setCheckingStore] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

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
    loadDashboardData()
    checkStoreStatus()
  }, [])

  async function loadDashboardData() {
    try {
      const storeId = localStorage.getItem('storeId')
      const token = localStorage.getItem('token')

      if (!storeId) return

      const headers = { Authorization: `Bearer ${token}` }

      const res = await api.get(`/dashboard/${storeId}`, { headers })
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
      alert('Toko berhasil ditutup! Sampai jumpa besok.')
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal menutup toko')
    } finally {
      setActionLoading(false)
    }
  }

  const formatIDR = (num: number) => `Rp ${num.toLocaleString('id-ID')}`

  const isCashierActive = summary.activeShift > 0 || (typeof window !== 'undefined' && localStorage.getItem('cashierActive') === 'true')

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
            href="/dashboard/store/cashier"
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

    </div>
  )
}

function Card({ icon: Icon, title, value, isMono = false, highlight = false }: any) {
  return (
    <div className="border border-slate-200 rounded-2xl p-5 bg-white flex flex-col justify-between h-28 shadow-3xs relative overflow-hidden group hover:border-slate-300 transition-all">
      {highlight && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-600" />
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

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
  AlertTriangle
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

  const formatIDR = (num: number) => `Rp ${num.toLocaleString('id-ID')}`

  const isCashierActive = summary.activeShift > 0 || (typeof window !== 'undefined' && localStorage.getItem('cashierActive') === 'true')

  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.16))] justify-between gap-6 pb-2 font-sans antialiased">
      
      <div className="space-y-6 flex-1">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Ringkasan Outlet</h1>
            <p className="text-xs text-slate-500 mt-1">
              Selamat datang kembali, <span className="font-semibold text-blue-600">{user?.name || 'Owner'}</span>
            </p>
          </div>
          <div className="text-right text-xs text-slate-450 font-mono hidden sm:block">
            Sesi: Terotentikasi
          </div>
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
          <div className="border border-slate-200/80 rounded-2xl p-4 bg-white flex flex-col justify-between h-24 shadow-xs shadow-slate-100/40">
            <div className="flex justify-between items-start text-slate-400">
              <Users size={18} className="text-blue-500" />
              <span className={`h-2.5 w-2.5 rounded-full mt-0.5 ${isCashierActive ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-amber-400'}`} />
            </div>
            <div>
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none">Status Terminal</p>
              <p className="text-xs font-black text-slate-900 mt-1.5 leading-none">
                {isCashierActive ? 'KASIR AKTIF' : 'BELUM AKTIVASI'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          <Link
            href="/dashboard/store/cashier"
            className="group border border-slate-200/85 bg-white p-4.5 rounded-2xl hover:bg-blue-50/20 hover:border-blue-300 transition-all flex justify-between items-start shadow-xs shadow-slate-100/30 cursor-pointer"
          >
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-slate-700">
                <ShieldCheck size={16} className="text-blue-600" />
                <h2 className="text-xs font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-wider">Terminal Kasir</h2>
              </div>
              <p className="text-xs text-slate-500 leading-normal">Buka sesi kerja, pilih personil, dan verifikasi PIN laci POS.</p>
            </div>
            <ArrowUpRight size={14} className="text-slate-400 group-hover:text-blue-600 transition-colors shrink-0" />
          </Link>

          <Link
            href="/dashboard/store/products"
            className="group border border-slate-200/85 bg-white p-4.5 rounded-2xl hover:bg-blue-50/20 hover:border-blue-300 transition-all flex justify-between items-start shadow-xs shadow-slate-100/30 cursor-pointer"
          >
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-slate-700">
                <Package size={16} className="text-blue-600" />
                <h2 className="text-xs font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-wider">Kelola Inventori</h2>
              </div>
              <p className="text-xs text-slate-500 leading-normal">Pantau ketersediaan stok barang dan penataan master list data.</p>
            </div>
            <ArrowUpRight size={14} className="text-slate-400 group-hover:text-blue-600 transition-colors shrink-0" />
          </Link>

          <div className="border border-slate-200/85 bg-white p-4.5 rounded-2xl flex justify-between items-start shadow-xs shadow-slate-100/30">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-slate-700">
                <AlertTriangle size={16} className={summary.lowStockProducts > 0 ? 'text-red-500 animate-pulse' : 'text-slate-400'} />
                <h2 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Peringatan Stok</h2>
              </div>
              <p className="text-xs text-slate-500 leading-normal">
                {summary.lowStockProducts > 0 ? (
                  <span>Ada <span className="font-bold text-red-655">{summary.lowStockProducts} produk</span> dengan stok sangat tipis (di bawah 5 pcs).</span>
                ) : (
                  <span>Stok aman. Tidak ada barang yang kehabisan saat ini.</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="border border-slate-200/85 bg-blue-50/20 p-4.5 rounded-2xl flex items-start gap-3 shadow-xs shadow-blue-500/5 flex-shrink-0">
        <div className="p-2 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900 rounded-xl text-blue-600 dark:text-blue-400 shrink-0 shadow-3xs">
          <Clock size={16} />
        </div>
        <div>
          <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider leading-none">SOP Penjualan Harian</h3>
          <p className="text-xs text-slate-650 mt-2 leading-relaxed font-medium">
            Pilih Personel Kasir <span className="text-slate-350">→</span> Masukkan PIN <span className="text-slate-350">→</span> Input Modal Kas Kecil <span className="text-slate-350">→</span> Mulai Scan Penjualan Barang.
          </p>
        </div>
      </div>

    </div>
  )
}

function Card({ icon: Icon, title, value, isMono = false, highlight = false }: any) {
  return (
    <div className={`border border-slate-200/80 rounded-2xl p-4 bg-white flex flex-col justify-between h-24 shadow-xs shadow-slate-100/40 relative overflow-hidden`}>
      {highlight && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-blue-600" />
      )}
      <div className={highlight ? 'text-blue-600' : 'text-slate-400'}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none">{title}</p>
        <p className={`text-sm font-black text-slate-900 mt-1.5 leading-none ${isMono ? 'font-mono' : ''}`}>
          {value}
        </p>
      </div>
    </div>
  )
}
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
  Clock
} from 'lucide-react'
import { api } from '@/lib/api'

type Summary = {
  totalProducts: number
  totalTransactions: number
  todaySales: number
  cashierActive: boolean
}

export default function StoreDashboard() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [summary, setSummary] = useState<Summary>({
    totalProducts: 0,
    totalTransactions: 0,
    todaySales: 0,
    cashierActive: false,
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

      const [products, trx] = await Promise.all([
        api.get(`/products/store/${storeId}`, { headers }),
        api.get(`/transactions/store/${storeId}`, { headers }),
      ])

      const transactions = trx.data ?? []

      setSummary({
        totalProducts: products.data?.length || 0,
        totalTransactions: transactions.length,
        todaySales: transactions.reduce((a: number, b: any) => a + (b.total || 0), 0),
        cashierActive: localStorage.getItem('cashierActive') === 'true',
      })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const formatIDR = (num: number) => `Rp ${num.toLocaleString('id-ID')}`

  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.16))] justify-between gap-6 pb-2">
      
      <div className="space-y-6 flex-1">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Ringkasan Outlet</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Selamat datang kembali, <span className="font-medium text-slate-700">{user?.name || 'Owner'}</span>
            </p>
          </div>
          <div className="text-right text-xs text-slate-400 font-mono hidden sm:block">
            Sesi: Ter otentikasi
          </div>
        </div>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
          <Card 
            icon={Package} 
            title="Total Jenis Produk" 
            value={loading ? '...' : summary.totalProducts} 
          />
          <Card 
            icon={ShoppingCart} 
            title="Transaksi Hari Ini" 
            value={loading ? '...' : `${summary.totalTransactions} Nota`} 
          />
          <Card 
            icon={Wallet} 
            title="Omset Hari Ini" 
            value={loading ? '...' : formatIDR(summary.todaySales)} 
            isMono
          />
          <div className="border border-slate-200 rounded-xl p-4 bg-white flex flex-col justify-between h-24 shadow-3xs">
            <div className="flex justify-between items-start text-slate-400">
              <Users size={18} />
              <span className={`h-2 w-2 rounded-full mt-1.5 ${summary.cashierActive ? 'bg-emerald-500 shadow-[0_0_8px_theme(colors.emerald.500)]' : 'bg-amber-400'}`} />
            </div>
            <div>
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Status Terminal</p>
              <p className="text-xs font-bold text-slate-900 mt-0.5">
                {summary.cashierActive ? 'KASIR AKTIF' : 'BELUM AKTIVASI'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          <Link
            href="/dashboard/store/cashier"
            className="group border border-slate-200 bg-white p-4 rounded-xl hover:bg-slate-50/50 hover:border-slate-400 transition-all flex justify-between items-start shadow-3xs"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-slate-700">
                <ShieldCheck size={16} />
                <h2 className="text-sm font-semibold text-slate-900">Terminal Kasir</h2>
              </div>
              <p className="text-xs text-slate-500">Buka sesi kerja, pilih personil, dan verifikasi PIN laci POS.</p>
            </div>
            <ArrowUpRight size={14} className="text-slate-400 group-hover:text-slate-900 transition-colors" />
          </Link>

          <Link
            href="/dashboard/store/products"
            className="group border border-slate-200 bg-white p-4 rounded-xl hover:bg-slate-50/50 hover:border-slate-400 transition-all flex justify-between items-start shadow-3xs"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-slate-700">
                <Package size={16} />
                <h2 className="text-sm font-semibold text-slate-900">Kelola Inventori</h2>
              </div>
              <p className="text-xs text-slate-500">Pantau ketersediaan stok barang dan penataan master list data.</p>
            </div>
            <ArrowUpRight size={14} className="text-slate-400 group-hover:text-slate-900 transition-colors" />
          </Link>
        </div>
      </div>

      <div className="border border-slate-200 bg-white p-4 rounded-xl flex items-start gap-3 shadow-3xs flex-shrink-0">
        <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 shrink-0">
          <Clock size={16} />
        </div>
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">SOP Penjualan Harian</h3>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed font-medium">
            Pilih Personel Kasir <span className="text-slate-400">→</span> Masukkan PIN <span className="text-slate-400">→</span> Input Modal Kas Kecil <span className="text-slate-400">→</span> Mulai Scan Penjualan Barang.
          </p>
        </div>
      </div>

    </div>
  )
}

function Card({ icon: Icon, title, value, isMono = false }: any) {
  return (
    <div className="border border-slate-200 rounded-xl p-4 bg-white flex flex-col justify-between h-24 shadow-3xs">
      <div className="text-slate-400">
        <Icon size={18} />
      </div>
      <div>
        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{title}</p>
        <p className={`text-sm font-bold text-slate-900 mt-0.5 ${isMono ? 'font-mono' : ''}`}>
          {value}
        </p>
      </div>
    </div>
  )
}
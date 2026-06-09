'use client'

import { useEffect, useMemo, useState } from 'react'
import { api } from '@/lib/api'
import { 
  Store, 
  Users, 
  ShoppingBag, 
  DollarSign, 
  RefreshCw, 
  AlertCircle, 
  Calendar,
  TrendingUp
} from 'lucide-react'

type StoreType = {
  id: string
  name: string
}

type Transaction = {
  id: string
  invoiceNumber: string
  total: number
  status: 'PAID' | 'VOID' | string
  createdAt: string
  storeName: string
  cashier: {
    name: string
  }
  customer?: {
    name: string
  } | null
}

type DashboardData = {
  totalStores: number
  totalCashiers: number
  totalTransactions: number
  totalRevenue: number
  allTransactions: Transaction[]
  recentTransactions: Transaction[]
}

type FilterPeriod = '1d' | '1w' | '1m' | '1y'

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<FilterPeriod>('1w')
  const [data, setData] = useState<DashboardData>({
    totalStores: 0,
    totalCashiers: 0,
    totalTransactions: 0,
    totalRevenue: 0,
    allTransactions: [],
    recentTransactions: [],
  })

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    setLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem('token')
      const headers = { Authorization: `Bearer ${token}` }

      const storesRes = await api.get('/stores', { headers })
      const stores = storesRes.data

      let totalCashiers = 0
      let totalTransactions = 0
      let totalRevenue = 0
      let allTransactions: Transaction[] = []

      await Promise.all(
        stores.map(async (store: StoreType) => {
          try {
            const [cashier, transaction, profit] = await Promise.all([
              api.get(`/cashier/store/${store.id}`, { headers }),
              api.get(`/transactions/store/${store.id}`, { headers }),
              api.get(`/reports/profit/${store.id}`, { headers }),
            ])

            totalCashiers += cashier.data?.length ?? 0
            totalTransactions += transaction.data?.length ?? 0
            totalRevenue += Number(profit.data?.totalSales ?? 0)

            if (Array.isArray(transaction.data)) {
              const txWithStore = transaction.data.map((tx: any) => ({
                ...tx,
                storeName: store.name
              }))
              allTransactions = [...allTransactions, ...txWithStore]
            }
          } catch (err) {
            console.error(err)
          }
        })
      )

      const sortedTransactions = [...allTransactions]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

      setData({
        totalStores: stores.length,
        totalCashiers,
        totalTransactions,
        totalRevenue,
        allTransactions: sortedTransactions,
        recentTransactions: sortedTransactions.slice(0, 5),
      })
    } catch (err) {
      console.error(err)
      setError('Gagal memuat data dashboard. Silakan coba beberapa saat lagi.')
    } finally {
      setLoading(false)
    }
  }

  const chartData = useMemo(() => {
    const now = new Date()
    const paidTransactions = data.allTransactions.filter(tx => tx.status === 'PAID')

    if (period === '1d') {
      const hours = [0, 6, 12, 18, 23]
      const values = hours.map(h => {
        return paidTransactions
          .filter(tx => {
            const d = new Date(tx.createdAt)
            return d.toDateString() === now.toDateString() && d.getHours() <= h
          })
          .reduce((sum, tx) => sum + tx.total, 0)
      })
      
      const max = Math.max(...values, 1)
      const points = hours.map((h, i) => {
        const x = (i / (hours.length - 1)) * 400
        const y = 100 - ((values[i] / max) * 90)
        return `${x},${y}`
      }).join(' ')

      return {
        points,
        labels: ['00:00', '06:00', '12:00', '18:00', '24:00'],
        growth: values[values.length - 1] >= values[0]
      }
    }

    if (period === '1w') {
      const values = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date()
        d.setDate(now.getDate() - (6 - i))
        return paidTransactions
          .filter(tx => new Date(tx.createdAt).toDateString() === d.toDateString())
          .reduce((sum, tx) => sum + tx.total, 0)
      })

      const max = Math.max(...values, 1)
      const points = values.map((val, i) => {
        const x = (i / 6) * 400
        const y = 100 - ((val / max) * 90)
        return `${x},${y}`
      }).join(' ')

      const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
      const labels = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date()
        d.setDate(now.getDate() - (6 - i))
        return days[d.getDay()]
      })

      return { points, labels, growth: values[6] >= values[0] }
    }

    if (period === '1m') {
      const values = Array.from({ length: 4 }).map((_, i) => {
        const start = new Date()
        start.setDate(now.getDate() - ((4 - i) * 7))
        const end = new Date()
        end.setDate(now.getDate() - ((3 - i) * 7))
        return paidTransactions
          .filter(tx => {
            const d = new Date(tx.createdAt)
            return d >= start && d < end
          })
          .reduce((sum, tx) => sum + tx.total, 0)
      })

      const max = Math.max(...values, 1)
      const points = values.map((val, i) => {
        const x = (i / 3) * 400
        const y = 100 - ((val / max) * 90)
        return `${x},${y}`
      }).join(' ')

      return { points, labels: ['W1', 'W2', 'W3', 'W4'], growth: values[3] >= values[0] }
    }

    if (period === '1y') {
      const values = Array.from({ length: 4 }).map((_, i) => {
        const startMonth = i * 3
        const endMonth = (i + 1) * 3
        return paidTransactions
          .filter(tx => {
            const d = new Date(tx.createdAt)
            return d.getFullYear() === now.getFullYear() && d.getMonth() >= startMonth && d.getMonth() < endMonth
          })
          .reduce((sum, tx) => sum + tx.total, 0)
      })

      const max = Math.max(...values, 1)
      const points = values.map((val, i) => {
        const x = (i / 3) * 400
        const y = 100 - ((val / max) * 90)
        return `${x},${y}`
      }).join(' ')

      return { points, labels: ['Q1', 'Q2', 'Q3', 'Q4'], growth: values[3] >= values[0] }
    }

    return { points: '0,100 400,100', labels: [], growth: true }
  }, [data.allTransactions, period])

  const cards = [
    { title: 'Total Toko', value: data.totalStores.toLocaleString('id-ID'), icon: Store, color: 'text-blue-600', bgColor: 'bg-blue-50' },
    { title: 'Total Kasir', value: data.totalCashiers.toLocaleString('id-ID'), icon: Users, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
    { title: 'Total Transaksi', value: data.totalTransactions.toLocaleString('id-ID'), icon: ShoppingBag, color: 'text-violet-600', bgColor: 'bg-violet-50' },
    { title: 'Total Pendapatan', value: `Rp ${data.totalRevenue.toLocaleString('id-ID')}`, icon: DollarSign, color: 'text-amber-600', bgColor: 'bg-amber-50' },
  ]

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="space-y-2">
          <div className="h-9 w-48 animate-pulse rounded-lg bg-slate-200" />
          <div className="h-5 w-64 animate-pulse rounded-lg bg-slate-100" />
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl border border-slate-100 bg-white p-6" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-80 animate-pulse rounded-2xl border border-slate-100 bg-white" />
          <div className="h-80 animate-pulse rounded-2xl border border-slate-100 bg-white" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="flex max-w-xl items-center gap-4 rounded-2xl border border-red-100 bg-red-50 p-5 text-red-800">
          <AlertCircle className="h-6 w-6 shrink-0 text-red-600" />
          <div className="flex-1">
            <h3 className="font-semibold">Terjadi Kesalahan</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
          <button onClick={loadDashboard} className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50">
            <RefreshCw className="h-4 w-4" /> Coba Lagi
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 p-6">
      
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Statistik dan performa seluruh bisnis Anda secara real-time</p>
        </div>
        <button onClick={loadDashboard} className="flex self-start items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100">
          <RefreshCw className="h-4 w-4" /> Perbarui Data
        </button>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <div key={card.title} className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-slate-200 hover:shadow-md">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-500">{card.title}</p>
                  <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{card.value}</h2>
                </div>
                <div className={`rounded-xl p-3 ${card.bgColor} ${card.color} transition-transform group-hover:scale-110`}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm flex flex-col justify-between overflow-hidden">
          <div>
            <div className="border-b border-slate-100 p-5">
              <h3 className="text-base font-bold text-slate-900">Riwayat Transaksi Terbaru</h3>
              <p className="text-xs text-slate-500 mt-0.5">5 transaksi log kasir dari seluruh cabang toko</p>
            </div>

            <div className="overflow-x-auto">
              {data.recentTransactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                  <ShoppingBag className="h-8 w-8 text-slate-300" />
                  <p className="mt-2 text-xs font-medium text-slate-500">Belum ada aktivitas transaksi</p>
                </div>
              ) : (
                <table className="w-full min-w-[550px] text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 font-semibold uppercase tracking-wider text-slate-500">
                      <th className="p-3.5 pl-5">Invoice</th>
                      <th className="p-3.5">Cabang</th>
                      <th className="p-3.5">Operator</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 pr-5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600">
                    {data.recentTransactions.map((tx) => (
                      <tr key={tx.id} className="group hover:bg-slate-50/40 transition-colors">
                        <td className="p-3.5 pl-5 font-mono font-semibold text-slate-900">{tx.invoiceNumber}</td>
                        <td className="p-3.5 font-medium text-slate-800">{tx.storeName}</td>
                        <td className="p-3.5">{tx.cashier?.name}</td>
                        <td className="p-3.5">
                          <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 font-medium border text-[10px] ${
                            tx.status === 'PAID' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'
                          }`}>
                            {tx.status === 'PAID' ? 'Selesai' : 'Batal'}
                          </span>
                        </td>
                        <td className="p-3.5 pr-5 text-right font-bold text-slate-900">Rp {tx.total.toLocaleString('id-ID')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Grafik Garis Pendapatan</h3>
                <p className="text-xs text-slate-500 mt-0.5">Manifestasi omset penjualan riil cabang usaha</p>
              </div>
              
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/40">
                {(['1d', '1w', '1m', '1y'] as FilterPeriod[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-2.5 py-1 rounded-md text-[10px] uppercase font-bold transition-all ${
                      period === p ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/50' : 'text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative pt-6 px-2">
              <div className={`flex items-center gap-1.5 text-xs font-bold border rounded-lg px-2.5 py-1.5 w-fit mb-4 ${
                chartData.growth ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-amber-600 bg-amber-50 border-amber-100'
              }`}>
                <TrendingUp size={14} className={chartData.growth ? '' : 'transform rotate-90'} />
                <span>{chartData.growth ? 'Tren Penjualan Stabil/Naik' : 'Perubahan Sesi Fluktuatif'}</span>
              </div>

              <div className="w-full h-36 border-b border-l border-slate-200/80 relative">
                <svg viewBox="0 0 400 100" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  
                  {chartData.points && (
                    <path d={`M 0,100 L ${chartData.points} L 400,100 Z`} fill="url(#chartGrad)" className="transition-all duration-300" />
                  )}
                  {chartData.points && (
                    <polyline fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={chartData.points} className="transition-all duration-300" />
                  )}
                </svg>
              </div>

              <div className="flex justify-between text-[10px] text-slate-400 font-semibold font-mono mt-2 px-1">
                {chartData.labels.map((lbl) => <span key={lbl}>{lbl}</span>)}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
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
    { 
      title: 'Total Toko', 
      value: data.totalStores.toLocaleString('id-ID'), 
      icon: Store,
      bgClass: 'bg-gradient-to-br from-blue-50/40 via-white to-white',
      borderClass: 'border-slate-200/70 hover:border-blue-300 hover:shadow-blue-500/5',
      textClass: 'text-slate-900',
      iconBgClass: 'bg-blue-50 border border-blue-100/50',
      iconTextClass: 'text-blue-600',
    },
    { 
      title: 'Total Kasir', 
      value: data.totalCashiers.toLocaleString('id-ID'), 
      icon: Users,
      bgClass: 'bg-gradient-to-br from-emerald-50/40 via-white to-white',
      borderClass: 'border-slate-200/70 hover:border-emerald-350 hover:shadow-emerald-500/5',
      textClass: 'text-slate-900',
      iconBgClass: 'bg-emerald-50 border border-emerald-100/50',
      iconTextClass: 'text-emerald-600',
    },
    { 
      title: 'Total Transaksi', 
      value: data.totalTransactions.toLocaleString('id-ID'), 
      icon: ShoppingBag,
      bgClass: 'bg-gradient-to-br from-violet-50/40 via-white to-white',
      borderClass: 'border-slate-200/70 hover:border-violet-350 hover:shadow-violet-500/5',
      textClass: 'text-slate-900',
      iconBgClass: 'bg-violet-50 border border-violet-100/50',
      iconTextClass: 'text-violet-600',
    },
    { 
      title: 'Total Pendapatan', 
      value: `Rp ${data.totalRevenue.toLocaleString('id-ID')}`, 
      icon: DollarSign,
      bgClass: 'bg-gradient-to-br from-amber-50/40 via-white to-white',
      borderClass: 'border-slate-200/70 hover:border-amber-350 hover:shadow-amber-500/5',
      textClass: 'text-slate-900',
      iconBgClass: 'bg-amber-50 border border-amber-100/50',
      iconTextClass: 'text-amber-600',
    },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-9 w-48 animate-pulse rounded-xl bg-slate-200" />
          <div className="h-5 w-64 animate-pulse rounded-xl bg-slate-100" />
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl border border-slate-200/50 bg-white p-6" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-80 animate-pulse rounded-2xl border border-slate-200/50 bg-white" />
          <div className="h-80 animate-pulse rounded-2xl border border-slate-200/50 bg-white" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <div className="flex max-w-xl items-center gap-4 rounded-2xl border border-red-150 bg-red-50/50 p-6 text-red-800 backdrop-blur-xs">
          <AlertCircle className="h-6 w-6 shrink-0 text-red-650" />
          <div className="flex-1">
            <h3 className="font-bold text-sm">Terjadi Kesalahan</h3>
            <p className="mt-1 text-xs text-slate-550 leading-relaxed">{error}</p>
          </div>
          <button onClick={loadDashboard} className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-slate-705 shadow-sm border border-slate-200 transition hover:bg-slate-50 cursor-pointer">
            <RefreshCw className="h-3.5 w-3.5" /> Coba Lagi
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      
      {/* Header section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Ringkasan Dashboard</h1>
          <p className="mt-1 text-xs font-semibold text-slate-500">Statistik dan performa seluruh bisnis Laila Collections secara real-time</p>
        </div>
        <button 
          onClick={loadDashboard}
          className="flex self-start items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-655 shadow-3xs transition-all hover:bg-slate-50 hover:text-slate-900 active:scale-97 cursor-pointer hover:border-slate-300"
        >
          <RefreshCw className="h-3.5 w-3.5 text-slate-400" />
          <span>Perbarui Data</span>
        </button>
      </div>

      {/* Cards list */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <div 
              key={card.title} 
              className={`group relative overflow-hidden rounded-2xl border ${card.bgClass} ${card.borderClass} p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-md`}
            >
              <div className="absolute top-0 right-0 -mr-6 -mt-6 h-24 w-24 rounded-full bg-slate-950/[0.01] transition-transform duration-300 group-hover:scale-150" />
              <div className="flex items-center justify-between relative z-10">
                <div className="space-y-1.5">
                  <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-450">{card.title}</p>
                  <h2 className="text-xl font-black tracking-tight text-slate-950 sm:text-2xl">{card.value}</h2>
                </div>
                <div className={`rounded-xl p-3 transition-transform group-hover:scale-110 ${card.iconBgClass} ${card.iconTextClass}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Chart & Tables row */}
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        
        {/* Recent Transactions list */}
        <div className="rounded-2xl border border-slate-200/70 bg-white shadow-3xs flex flex-col justify-between overflow-hidden">
          <div>
            <div className="border-b border-slate-100 p-5 bg-slate-50/50 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Riwayat Transaksi Terbaru</h3>
                <p className="text-[10px] font-semibold text-slate-400 mt-0.5">5 transaksi log kasir dari seluruh cabang toko</p>
              </div>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>

            <div className="overflow-x-auto">
              {data.recentTransactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-16 text-center">
                  <div className="p-4 rounded-full bg-slate-50 border border-slate-100 mb-3 text-slate-350">
                    <ShoppingBag className="h-6 w-6" />
                  </div>
                  <p className="text-xs font-bold text-slate-500">Belum ada aktivitas transaksi</p>
                </div>
              ) : (
                <table className="w-full min-w-[500px] text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-55/25 font-bold uppercase tracking-wider text-slate-400 text-[9px]">
                      <th className="p-4 pl-6">Invoice</th>
                      <th className="p-4">Cabang</th>
                      <th className="p-4">Operator</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 pr-6 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600 font-semibold">
                    {data.recentTransactions.map((tx) => (
                      <tr key={tx.id} className="group hover:bg-slate-50/45 transition-colors">
                        <td className="p-4 pl-6 font-mono font-bold text-slate-900 group-hover:text-blue-650 transition-colors">{tx.invoiceNumber}</td>
                        <td className="p-4 text-slate-800 font-bold">{tx.storeName}</td>
                        <td className="p-4 text-slate-500">{tx.cashier?.name}</td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-bold border text-[9px] uppercase tracking-wider ${
                            tx.status === 'PAID' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'
                          }`}>
                            <span className={`h-1 w-1 rounded-full ${tx.status === 'PAID' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                            {tx.status === 'PAID' ? 'Lunas' : 'Void'}
                          </span>
                        </td>
                        <td className="p-4 pr-6 text-right font-black text-slate-950 font-mono">Rp {tx.total.toLocaleString('id-ID')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Chart Card */}
        <div className="rounded-2xl border border-slate-200/70 bg-white shadow-3xs p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between border-b border-slate-100 pb-5">
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Grafik Garis Pendapatan</h3>
                <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Manifestasi omset penjualan riil cabang usaha</p>
              </div>
              
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/60">
                {(['1d', '1w', '1m', '1y'] as FilterPeriod[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-3 py-1.5 rounded-lg text-[9px] uppercase font-black transition-all cursor-pointer ${
                      period === p ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-455 hover:text-slate-700'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative pt-6 px-1">
              <div className={`flex items-center gap-1.5 text-[9px] font-bold border rounded-full px-3 py-1 w-fit mb-6 uppercase tracking-wider ${
                chartData.growth ? 'text-emerald-600 bg-emerald-50/50 border-emerald-150' : 'text-amber-600 bg-amber-50/50 border-amber-150'
              }`}>
                <TrendingUp size={11} className={chartData.growth ? '' : 'transform rotate-90'} />
                <span>{chartData.growth ? 'Tren Penjualan Stabil/Naik' : 'Perubahan Sesi Fluktuatif'}</span>
              </div>

              {/* Chart Canvas with custom gridlines */}
              <div className="w-full h-40 border-b border-l border-slate-200/75 relative">
                
                {/* Visual grid lines backdrop */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-0.5">
                  <div className="w-full border-t border-dashed border-slate-100" />
                  <div className="w-full border-t border-dashed border-slate-100" />
                  <div className="w-full border-t border-dashed border-slate-100" />
                  <div className="w-full border-t border-dashed border-slate-100" />
                </div>

                <svg viewBox="0 0 400 100" className="w-full h-full overflow-visible relative z-10" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563eb" stopOpacity="0.22" />
                      <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  
                  {chartData.points && (
                    <path d={`M 0,100 L ${chartData.points} L 400,100 Z`} fill="url(#chartGrad)" className="transition-all duration-300" />
                  )}
                  {chartData.points && (
                    <polyline fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" points={chartData.points} className="transition-all duration-300" />
                  )}

                  {/* Pulsing indicator dots */}
                  {chartData.points && chartData.points.split(' ').map((pt, i) => {
                    const coords = pt.split(',')
                    const x = coords[0]
                    const y = coords[1]
                    if (!x || !y) return null
                    return (
                      <g key={i}>
                        <circle cx={x} cy={y} r="3" className="fill-blue-600 stroke-white stroke-2" />
                        <circle cx={x} cy={y} r="5" className="fill-blue-600/20 animate-ping" />
                      </g>
                    )
                  })}
                </svg>
              </div>

              <div className="flex justify-between text-[9px] text-slate-400 font-extrabold font-mono mt-3 px-1">
                {chartData.labels.map((lbl) => <span key={lbl}>{lbl}</span>)}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
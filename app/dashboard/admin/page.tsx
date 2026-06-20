
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
  TrendingUp,
  X,
  Loader2
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

type StoreStat = {
  id: string
  name: string
  cashiersCount: number
  transactionsCount: number
  revenue: number
  bestSeller?: {
    name: string
    sold: number
  } | null
}

type DashboardData = {
  totalStores: number
  totalCashiers: number
  totalTransactions: number
  totalRevenue: number
  allTransactions: Transaction[]
  recentTransactions: Transaction[]
  storeStats: StoreStat[]
}

type FilterPeriod = '1d' | '1w' | '1m' | '1y'

type ChartPoint = { x: number; y: number }

function getNiceMax(rawMax: number): number {
  if (rawMax <= 0) return 1000
  const digits = Math.floor(Math.log10(rawMax))
  const power = Math.pow(10, digits)
  const ratio = rawMax / power
  let roundedRatio = 2
  if (ratio <= 1) roundedRatio = 1
  else if (ratio <= 2) roundedRatio = 2
  else if (ratio <= 5) roundedRatio = 5
  else if (ratio <= 10) roundedRatio = 10
  
  return roundedRatio * power
}

function getCurvePath(points: ChartPoint[]): string {
  if (points.length === 0) return ''
  let path = `M ${points[0].x},${points[0].y}`
  const smoothing = 0.2

  for (let i = 0; i < points.length - 1; i++) {
    const curr = points[i]
    const next = points[i + 1]

    let cp1x = curr.x
    let cp1y = curr.y
    if (i > 0) {
      const prev = points[i - 1]
      const dx = next.x - prev.x
      const dy = next.y - prev.y
      cp1x = curr.x + dx * smoothing
      cp1y = curr.y + dy * smoothing
    } else {
      const dx = next.x - curr.x
      const dy = next.y - curr.y
      cp1x = curr.x + dx * smoothing
      cp1y = curr.y + dy * smoothing
    }

    let cp2x = next.x
    let cp2y = next.y
    if (i < points.length - 2) {
      const nextNext = points[i + 2]
      const dx = nextNext.x - curr.x
      const dy = nextNext.y - curr.y
      cp2x = next.x - dx * smoothing
      cp2y = next.y - dy * smoothing
    } else {
      const dx = next.x - curr.x
      const dy = next.y - curr.y
      cp2x = next.x - dx * smoothing
      cp2y = next.y - dy * smoothing
    }

    path += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${next.x.toFixed(1)},${next.y.toFixed(1)}`
  }

  return path
}

function getFillPath(points: ChartPoint[]): string {
  if (points.length === 0) return ''
  const curvePath = getCurvePath(points)
  return `${curvePath} L 400,100 L 0,100 Z`
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<FilterPeriod>('1w')
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [detailModalType, setDetailModalType] = useState<'TRANSACTION' | 'REVENUE' | null>(null)
  const [txDetails, setTxDetails] = useState<Record<string, any>>({})
  const [loadingTxId, setLoadingTxId] = useState<string | null>(null)
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null)

  const [data, setData] = useState<DashboardData>({
    totalStores: 0,
    totalCashiers: 0,
    totalTransactions: 0,
    totalRevenue: 0,
    allTransactions: [],
    recentTransactions: [],
    storeStats: [],
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
      const storeStats: StoreStat[] = []

      await Promise.all(
        stores.map(async (store: StoreType) => {
          try {
            const [cashier, transaction, profit, topProductsRes] = await Promise.all([
              api.get(`/cashier/store/${store.id}`, { headers }),
              api.get(`/transactions/store/${store.id}`, { headers }),
              api.get(`/reports/profit/${store.id}`, { headers }),
              api.get(`/dashboard/${store.id}/top-products`, { headers }).catch(() => ({ data: [] })),
            ])

            const cashiersCount = cashier.data?.length ?? 0
            const transactionsCount = transaction.data?.length ?? 0
            const revenue = Number(profit.data?.totalSales ?? 0)
            
            const topProducts = topProductsRes.data || []
            const bestSeller = topProducts.length > 0 && topProducts[0].name
              ? { name: topProducts[0].name, sold: topProducts[0].sold }
              : null

            totalCashiers += cashiersCount
            totalTransactions += transactionsCount
            totalRevenue += revenue

            storeStats.push({
              id: store.id,
              name: store.name,
              cashiersCount,
              transactionsCount,
              revenue,
              bestSeller
            })

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

      const sortedStoreStats = [...storeStats]
        .sort((a, b) => b.revenue - a.revenue)

      setData({
        totalStores: stores.length,
        totalCashiers,
        totalTransactions,
        totalRevenue,
        allTransactions: sortedTransactions,
        recentTransactions: sortedTransactions.slice(0, 5),
        storeStats: sortedStoreStats,
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
      const hours = Array.from({ length: 24 }).map((_, i) => i)
      const values = hours.map(h => {
        return paidTransactions
          .filter(tx => {
            const d = new Date(tx.createdAt)
            return d.toDateString() === now.toDateString() && d.getHours() === h
          })
          .reduce((sum, tx) => sum + tx.total, 0)
      })
      
      const rawMax = Math.max(...values, 0)
      const niceMax = getNiceMax(rawMax)
      const points = hours.map((h, i) => {
        const x = (i / 23) * 400
        const y = 100 - ((values[i] / niceMax) * 90)
        return { x, y }
      })

      const labels = hours.map(h => `${String(h).padStart(2, '0')}:00`)

      return {
        points,
        values,
        niceMax,
        strokePath: getCurvePath(points),
        fillPath: getFillPath(points),
        labels,
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

      const rawMax = Math.max(...values, 0)
      const niceMax = getNiceMax(rawMax)
      const points = values.map((val, i) => {
        const x = (i / 6) * 400
        const y = 100 - ((val / niceMax) * 90)
        return { x, y }
      })

      const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
      const labels = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date()
        d.setDate(now.getDate() - (6 - i))
        return days[d.getDay()]
      })

      return {
        points,
        values,
        niceMax,
        strokePath: getCurvePath(points),
        fillPath: getFillPath(points),
        labels,
        growth: values[6] >= values[0]
      }
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

      const rawMax = Math.max(...values, 0)
      const niceMax = getNiceMax(rawMax)
      const points = values.map((val, i) => {
        const x = (i / 3) * 400
        const y = 100 - ((val / niceMax) * 90)
        return { x, y }
      })

      return {
        points,
        values,
        niceMax,
        strokePath: getCurvePath(points),
        fillPath: getFillPath(points),
        labels: ['W1', 'W2', 'W3', 'W4'],
        growth: values[3] >= values[0]
      }
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

      const rawMax = Math.max(...values, 0)
      const niceMax = getNiceMax(rawMax)
      const points = values.map((val, i) => {
        const x = (i / 3) * 400
        const y = 100 - ((val / niceMax) * 90)
        return { x, y }
      })

      return {
        points,
        values,
        niceMax,
        strokePath: getCurvePath(points),
        fillPath: getFillPath(points),
        labels: ['Q1', 'Q2', 'Q3', 'Q4'],
        growth: values[3] >= values[0]
      }
    }

    return {
      points: [],
      values: [],
      niceMax: 1000,
      strokePath: '',
      fillPath: '',
      labels: [],
      growth: true
    }
  }, [data.allTransactions, period])

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (!chartData.points || chartData.points.length === 0) return
    const svg = e.currentTarget
    const rect = svg.getBoundingClientRect()
    const mouseX = ((e.clientX - rect.left) / rect.width) * 400
    
    let closestIndex = 0
    let minDiff = Infinity
    chartData.points.forEach((pt, idx) => {
      const diff = Math.abs(pt.x - mouseX)
      if (diff < minDiff) {
        minDiff = diff
        closestIndex = idx
      }
    })
    setHoveredIndex(closestIndex)
  }

  const handleMouseLeave = () => {
    setHoveredIndex(null)
  }

  const activeIndex = useMemo(() => {
    if (!chartData.points || chartData.points.length === 0) return null
    if (hoveredIndex !== null && hoveredIndex < chartData.points.length) {
      return hoveredIndex
    }
    let maxIdx = 0
    let maxVal = -1
    chartData.values.forEach((v, idx) => {
      if (v > maxVal) {
        maxVal = v
        maxIdx = idx
      }
    })
    if (maxVal <= 0) {
      return chartData.points.length - 1
    }
    return maxIdx
  }, [chartData.points, chartData.values, hoveredIndex])

  const filteredTransactions = useMemo(() => {
    const now = new Date()
    return data.allTransactions.filter(tx => {
      const txDate = new Date(tx.createdAt)
      if (period === '1d') {
        return txDate.toDateString() === now.toDateString()
      }
      if (period === '1w') {
        const start = new Date()
        start.setDate(now.getDate() - 6)
        start.setHours(0, 0, 0, 0)
        return txDate >= start
      }
      if (period === '1m') {
        const start = new Date()
        start.setDate(now.getDate() - 27)
        start.setHours(0, 0, 0, 0)
        return txDate >= start
      }
      if (period === '1y') {
        return txDate.getFullYear() === now.getFullYear()
      }
      return true
    })
  }, [data.allTransactions, period])

  const filteredRevenue = useMemo(() => {
    return filteredTransactions
      .filter(tx => tx.status === 'PAID')
      .reduce((sum, tx) => sum + tx.total, 0)
  }, [filteredTransactions])

  const handleCardClick = (type: 'TRANSACTION' | 'REVENUE') => {
    setDetailModalType(type)
    setDetailModalOpen(true)
  }

  const toggleExpandRow = async (id: string) => {
    if (expandedTxId === id) {
      setExpandedTxId(null)
      return
    }
    setExpandedTxId(id)
    if (!txDetails[id]) {
      setLoadingTxId(id)
      try {
        const token = localStorage.getItem('token')
        const headers = { Authorization: `Bearer ${token}` }
        const res = await api.get(`/transactions/${id}`, { headers })
        setTxDetails(prev => ({ ...prev, [id]: res.data }))
      } catch (err) {
        console.error('Failed to load transaction details:', err)
      } finally {
        setLoadingTxId(null)
      }
    }
  }

  const periodLabels = {
    '1d': 'Hari Ini',
    '1w': '1 Minggu',
    '1m': '1 Bulan',
    '1y': '1 Tahun'
  }

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
      title: `Total Transaksi (${periodLabels[period]})`, 
      value: filteredTransactions.length.toLocaleString('id-ID'), 
      icon: ShoppingBag,
      bgClass: 'bg-gradient-to-br from-violet-50/40 via-white to-white',
      borderClass: 'border-slate-200/70 hover:border-violet-350 hover:shadow-violet-500/5 cursor-pointer active:scale-[0.99]',
      textClass: 'text-slate-900',
      iconBgClass: 'bg-violet-50 border border-violet-100/50',
      iconTextClass: 'text-violet-600',
      onClick: () => handleCardClick('TRANSACTION')
    },
    { 
      title: `Total Pendapatan (${periodLabels[period]})`, 
      value: `Rp ${filteredRevenue.toLocaleString('id-ID')}`, 
      icon: DollarSign,
      bgClass: 'bg-gradient-to-br from-amber-50/40 via-white to-white',
      borderClass: 'border-slate-200/70 hover:border-amber-350 hover:shadow-amber-500/5 cursor-pointer active:scale-[0.99]',
      textClass: 'text-slate-900',
      iconBgClass: 'bg-amber-50 border border-amber-100/50',
      iconTextClass: 'text-amber-600',
      onClick: () => handleCardClick('REVENUE')
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
          <AlertCircle className="h-6 w-6 shrink-0 text-red-600" />
          <div className="flex-1">
            <h3 className="font-bold text-sm">Terjadi Kesalahan</h3>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">{error}</p>
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
      
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Ringkasan Dashboard</h1>
          <p className="mt-1 text-xs font-semibold text-slate-500">Statistik dan performa seluruh bisnis Laila Collections secara real-time</p>
        </div>
        <button 
          onClick={loadDashboard}
          className="flex self-start items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 shadow-3xs transition-all hover:bg-slate-50 hover:text-slate-900 active:scale-97 cursor-pointer hover:border-slate-300"
        >
          <RefreshCw className="h-3.5 w-3.5 text-slate-400" />
          <span>Perbarui Data</span>
        </button>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card, idx) => {
          const Icon = card.icon
          return (
            <div 
              key={idx} 
              onClick={card.onClick}
              className={`group relative overflow-hidden rounded-2xl border ${card.bgClass} ${card.borderClass} p-6 transition-all duration-300 ${card.onClick ? 'hover:-translate-y-1 hover:shadow-md cursor-pointer active:scale-[0.98]' : ''}`}
            >
              <div className="absolute top-0 right-0 -mr-6 -mt-6 h-24 w-24 rounded-full bg-slate-950/[0.01] transition-transform duration-300 group-hover:scale-150" />
              <div className="flex items-center justify-between relative z-10">
                <div className="space-y-1.5">
                  <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">{card.title}</p>
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

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        
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
                        <td className="p-4 pl-6 font-mono font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{tx.invoiceNumber}</td>
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
                      period === p ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-700'
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

              <div className="flex gap-3">
                
                <div className="relative w-12 h-40 select-none text-right text-[8px] font-extrabold font-mono text-slate-450 pr-1">
                  <span className="absolute left-0 right-0 -translate-y-1/2" style={{ top: '10%' }}>
                    {chartData.niceMax.toLocaleString('id-ID')}
                  </span>
                  <span className="absolute left-0 right-0 -translate-y-1/2" style={{ top: '32.5%' }}>
                    {Math.round(chartData.niceMax * 0.75).toLocaleString('id-ID')}
                  </span>
                  <span className="absolute left-0 right-0 -translate-y-1/2" style={{ top: '55%' }}>
                    {Math.round(chartData.niceMax * 0.5).toLocaleString('id-ID')}
                  </span>
                  <span className="absolute left-0 right-0 -translate-y-1/2" style={{ top: '77.5%' }}>
                    {Math.round(chartData.niceMax * 0.25).toLocaleString('id-ID')}
                  </span>
                  <span className="absolute left-0 right-0 -translate-y-1/2" style={{ top: '100%' }}>
                    0
                  </span>
                </div>

                
                <div className="flex-1 h-40 border-b border-l border-slate-200/75 relative">
                  
                  
                  {activeIndex !== null && chartData.points[activeIndex] && (
                    (() => {
                      const pt = chartData.points[activeIndex]
                      const val = chartData.values[activeIndex]
                      const lbl = chartData.labels[activeIndex]
                      
                      const leftPercent = `${(pt.x / 400) * 100}%`
                      const topPercent = `${(pt.y / 100) * 100}%`
                      
                      return (
                        <div 
                          className="absolute z-20 pointer-events-none transition-all duration-150 ease-out -translate-x-1/2 -translate-y-[calc(100%+12px)] bg-white border border-slate-200/80 rounded-xl px-3 py-2 shadow-lg text-center min-w-[90px]"
                          style={{ left: leftPercent, top: topPercent }}
                        >
                          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-white border-r border-b border-slate-200/80" />
                          <p className="text-[9px] font-extrabold text-slate-450 uppercase tracking-wider">{lbl}</p>
                          <p className="text-[11px] font-black text-slate-900 mt-0.5 font-mono">Rp {val.toLocaleString('id-ID')}</p>
                        </div>
                      )
                    })()
                  )}

                  <svg 
                    viewBox="0 0 400 100" 
                    className="w-full h-full overflow-visible relative z-10 cursor-crosshair" 
                    preserveAspectRatio="none"
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                  >
                    <defs>
                      <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3bc0f0" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#3bc0f0" stopOpacity="0" />
                      </linearGradient>
                    </defs>

                    
                    <line x1="0" y1="10" x2="400" y2="10" stroke="#f1f5f9" strokeWidth="1" />
                    <line x1="0" y1="32.5" x2="400" y2="32.5" stroke="#f1f5f9" strokeWidth="1" />
                    <line x1="0" y1="55" x2="400" y2="55" stroke="#f1f5f9" strokeWidth="1" />
                    <line x1="0" y1="77.5" x2="400" y2="77.5" stroke="#f1f5f9" strokeWidth="1" />
                    
                    {chartData.points.length > 0 && (
                      <path d={chartData.fillPath} fill="url(#chartGrad)" className="transition-all duration-300" />
                    )}
                    {chartData.points.length > 0 && (
                      <path fill="none" stroke="#3bc0f0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" d={chartData.strokePath} className="transition-all duration-300" />
                    )}

                    
                    {chartData.points.length > 0 && chartData.points.map((pt, i) => {
                      const isHoveredOrMax = i === activeIndex
                      if (isHoveredOrMax) return null 
                      return (
                        <circle key={i} cx={pt.x} cy={pt.y} r="2" className="fill-slate-200" />
                      )
                    })}

                    
                    {activeIndex !== null && chartData.points[activeIndex] && (
                      <g>
                        <circle 
                          cx={chartData.points[activeIndex].x} 
                          cy={chartData.points[activeIndex].y} 
                          r="4.5" 
                          className="fill-sky-450 stroke-white stroke-2" 
                        />
                        <circle 
                          cx={chartData.points[activeIndex].x} 
                          cy={chartData.points[activeIndex].y} 
                          r="8" 
                          className="fill-sky-400/20 animate-ping pointer-events-none" 
                        />
                      </g>
                    )}
                  </svg>
                </div>
              </div>

              
              <div className="flex justify-between text-[9px] text-slate-400 font-extrabold font-mono mt-3 pl-[60px] pr-1">
                {chartData.labels.map((lbl, idx) => {
                  
                  if (chartData.labels.length === 24) {
                    if (idx % 3 !== 0 && idx !== 23) return <span key={lbl} className="w-0 overflow-visible invisible" />
                  }
                  return <span key={lbl}>{lbl}</span>
                })}
              </div>
            </div>
          </div>
        </div>

      </div>

      
      <div className="rounded-2xl border border-slate-200/70 bg-white shadow-3xs flex flex-col overflow-hidden">
        <div className="border-b border-slate-100 p-5 bg-slate-50/50 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Pendapatan per Cabang Toko</h3>
            <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Kontribusi omset penjualan riil dari setiap cabang toko</p>
          </div>
          <Store className="h-4 w-4 text-slate-400" />
        </div>
        
        <div className="overflow-x-auto">
          {data.storeStats.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <p className="text-xs font-bold text-slate-500">Belum ada data cabang toko</p>
            </div>
          ) : (
            <table className="w-full min-w-[600px] text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-55/25 font-bold uppercase tracking-wider text-slate-400 text-[9px]">
                  <th className="p-4 pl-6">Nama Cabang</th>
                  <th className="p-4">Total Operator Kasir</th>
                  <th className="p-4">Total Transaksi Sukses</th>
                  <th className="p-4 pr-6 text-right">Total Pendapatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600 font-semibold">
                {data.storeStats.map((stat) => (
                  <tr key={stat.id} className="group hover:bg-slate-50/45 transition-colors">
                    <td className="p-4 pl-6 font-bold text-slate-900 flex flex-col justify-center">
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-lg bg-blue-50 border border-blue-100/50 flex items-center justify-center text-blue-600 shrink-0 group-hover:scale-105 transition-transform">
                          <Store className="h-3.5 w-3.5" />
                        </div>
                        <span>{stat.name}</span>
                      </div>
                      {stat.bestSeller ? (
                        <span className="text-[10px] text-slate-400 font-semibold mt-1 ml-9">
                          Terlaris: <span className="font-extrabold text-indigo-650">{stat.bestSeller.name}</span> ({stat.bestSeller.sold}x terjual)
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-semibold mt-1 ml-9">
                          Terlaris: -
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-slate-500 font-medium">{stat.cashiersCount.toLocaleString('id-ID')} Kasir</td>
                    <td className="p-4 text-slate-500 font-medium">{stat.transactionsCount.toLocaleString('id-ID')} Transaksi</td>
                    <td className="p-4 pr-6 text-right font-mono font-black text-emerald-600 text-sm">
                      Rp {stat.revenue.toLocaleString('id-ID')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {detailModalOpen && detailModalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-all duration-200">
          <div className="w-full max-w-4xl h-[85vh] overflow-hidden rounded-2xl border border-slate-150 bg-white shadow-xl relative animate-in fade-in zoom-in-95 duration-150 flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 p-5 bg-slate-50/50 flex-shrink-0">
              <div className="flex items-center gap-3 text-slate-900">
                <div className="h-9 w-9 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center justify-center text-indigo-650 shrink-0">
                  <ShoppingBag size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
                    {detailModalType === 'REVENUE' ? 'Rincian Pendapatan' : 'Rincian Transaksi'} ({periodLabels[period]})
                  </h3>
                  <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
                    Daftar log aktivitas penjualan terfilter periodik
                  </p>
                </div>
              </div>
              <button 
                onClick={() => { setDetailModalOpen(false); setExpandedTxId(null); }} 
                className="rounded-lg p-1.5 border border-slate-200 bg-white text-slate-405 hover:text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Summary Cards */}
            <div className="grid grid-cols-2 gap-4 p-5 bg-slate-50/20 border-b border-slate-100 flex-shrink-0">
              <div className="border border-slate-250/70 rounded-xl p-4 bg-white shadow-3xs flex justify-between items-center">
                <div>
                  <p className="text-[8.5px] font-extrabold uppercase tracking-widest text-slate-400">Total Transaksi ({periodLabels[period]})</p>
                  <h4 className="text-lg font-black text-slate-950 mt-1 font-mono">{filteredTransactions.length}</h4>
                </div>
                <div className="h-8 w-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center border border-violet-100/50"><ShoppingBag size={15}/></div>
              </div>
              <div className="border border-slate-250/70 rounded-xl p-4 bg-white shadow-3xs flex justify-between items-center">
                <div>
                  <p className="text-[8.5px] font-extrabold uppercase tracking-widest text-slate-400">Total Pendapatan ({periodLabels[period]})</p>
                  <h4 className="text-lg font-black text-slate-955 mt-1 font-mono">Rp {filteredRevenue.toLocaleString('id-ID')}</h4>
                </div>
                <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100/50"><DollarSign size={15}/></div>
              </div>
            </div>

            {/* Modal Table Body */}
            <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
              {(() => {
                const modalTx = detailModalType === 'REVENUE' 
                  ? filteredTransactions.filter(tx => tx.status === 'PAID') 
                  : filteredTransactions;

                if (modalTx.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-450 gap-2">
                      <div className="p-3 bg-slate-50 border border-slate-150 rounded-2xl text-slate-400">
                        <ShoppingBag className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-bold text-slate-500">Belum ada data terekam pada rentang waktu ini</p>
                    </div>
                  )
                }

                return (
                  <div className="space-y-4">
                    {modalTx.map((tx) => {
                      const isExpanded = expandedTxId === tx.id
                      return (
                        <div key={tx.id} className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-3xs transition-all hover:border-slate-350">
                          {/* Row Header */}
                          <div 
                            onClick={() => toggleExpandRow(tx.id)}
                            className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer select-none bg-slate-50/20 hover:bg-slate-50/60"
                          >
                            <div className="flex items-center gap-3">
                              <span className="font-mono font-bold text-slate-900">{tx.invoiceNumber}</span>
                              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-bold border text-[8.5px] uppercase tracking-wider ${
                                tx.status === 'PAID' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'
                              }`}>
                                {tx.status === 'PAID' ? 'Lunas' : 'Void'}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] font-semibold text-slate-500">
                              <span>Toko: <strong className="text-slate-800">{tx.storeName}</strong></span>
                              <span>Kasir: <strong className="text-slate-700">{tx.cashier?.name}</strong></span>
                              <span>Tanggal: <strong className="text-slate-600">{new Date(tx.createdAt).toLocaleDateString('id-ID')}</strong></span>
                              <span className="font-mono font-black text-slate-950 text-xs md:text-sm">Rp {tx.total.toLocaleString('id-ID')}</span>
                            </div>
                          </div>

                          {/* Row Expandable Content */}
                          {isExpanded && (
                            <div className="border-t border-slate-100 p-4 bg-slate-50/30 animate-in fade-in duration-200">
                              {loadingTxId === tx.id ? (
                                <div className="flex items-center justify-center py-6 gap-2">
                                  <Loader2 className="w-4 h-4 animate-spin text-indigo-650" />
                                  <span className="text-[10px] text-slate-400 font-bold">Memuat rincian barang...</span>
                                </div>
                              ) : txDetails[tx.id] ? (
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Barang Belanjaan</h5>
                                    <span className="text-[9.5px] font-extrabold text-slate-500 font-mono">
                                      {txDetails[tx.id].items?.reduce((s: number, i: any) => s + i.quantity, 0)} Items
                                    </span>
                                  </div>

                                  <div className="space-y-3.5">
                                    {txDetails[tx.id].items?.map((item: any) => {
                                      const discount = (item.masterDiscount || 0) + (item.cashierDiscount || 0)
                                      return (
                                        <div key={item.id} className="text-xs space-y-1 bg-white border border-slate-150 p-3 rounded-xl shadow-3xs">
                                          <div className="flex justify-between font-extrabold text-slate-900">
                                            <span>{item.product?.name}</span>
                                            <div className="flex gap-8 shrink-0 text-slate-800">
                                              <span>{item.quantity} Pcs</span>
                                              <span className="w-24 text-right font-mono">Rp {item.subtotal.toLocaleString('id-ID')}</span>
                                            </div>
                                          </div>
                                          <div className="flex justify-between pl-1 text-[10px] text-slate-500 font-bold">
                                            <span>Harga Satuan: Rp {item.originalPrice.toLocaleString('id-ID')}</span>
                                          </div>
                                          {discount > 0 && (
                                            <div className="pl-1 text-[10px] text-rose-500 font-extrabold italic flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                                              <span>Diskon: -Rp {discount.toLocaleString('id-ID')}</span>
                                              <span>(Rp {item.originalPrice.toLocaleString('id-ID')} - Rp {discount.toLocaleString('id-ID')} = Rp {item.finalPrice.toLocaleString('id-ID')})</span>
                                            </div>
                                          )}
                                        </div>
                                      )
                                    })}
                                  </div>

                                  {/* Price calculation block */}
                                  <div className="border-t border-dashed border-slate-300 pt-3 flex flex-col items-end text-xs space-y-1.5 font-bold font-mono">
                                    <div className="flex justify-between w-full max-w-[280px] text-slate-500">
                                      <span>Subtotal</span><span>Rp {txDetails[tx.id].subtotal.toLocaleString('id-ID')}</span>
                                    </div>
                                    <div className="flex justify-between w-full max-w-[280px] text-rose-500">
                                      <span>Total Diskon</span><span>-Rp {txDetails[tx.id].totalDiscount.toLocaleString('id-ID')}</span>
                                    </div>
                                    {txDetails[tx.id].taxAmount > 0 && (
                                      <div className="flex justify-between w-full max-w-[280px] text-slate-550">
                                        <span>PPN</span><span>Rp {txDetails[tx.id].taxAmount.toLocaleString('id-ID')}</span>
                                      </div>
                                    )}
                                    {txDetails[tx.id].serviceAmount > 0 && (
                                      <div className="flex justify-between w-full max-w-[280px] text-slate-550">
                                        <span>Service Charge</span><span>Rp {txDetails[tx.id].serviceAmount.toLocaleString('id-ID')}</span>
                                      </div>
                                    )}
                                    <div className="flex justify-between w-full max-w-[280px] text-sm font-black text-slate-955 pt-2 border-t border-slate-200">
                                      <span>Total Akhir</span><span>Rp {txDetails[tx.id].total.toLocaleString('id-ID')}</span>
                                    </div>
                                    <div className="flex justify-between w-full max-w-[280px] text-slate-500">
                                      <span>Bayar</span><span>Rp {txDetails[tx.id].paidAmount.toLocaleString('id-ID')}</span>
                                    </div>
                                    <div className="flex justify-between w-full max-w-[280px] text-slate-500">
                                      <span>Kembali</span><span>Rp {txDetails[tx.id].changeAmount.toLocaleString('id-ID')}</span>
                                    </div>
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

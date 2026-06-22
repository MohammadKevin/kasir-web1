'use client'

import { useEffect, useState, useMemo, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { 
  BarChart3, 
  Store, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Download, 
  FileSpreadsheet, 
  FileText,
  Loader2,
  ChevronDown,
  Calendar,
  X,
  Clock,
  Tag,
  CreditCard,
  Boxes,
  Users,
  Percent,
  UserCheck,
  Coins,
  ArrowLeft
} from 'lucide-react'

type StoreType = {
  id: string
  name: string
}

type ProfitData = {
  totalSales: number
  totalDiscount: number
  totalExpense: number
  estimatedProfit: number
}

type TabType = 'sales' | 'expenses' | 'products' | 'shifts' | 'purchases' | 'stock'

function ReportPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const menuParam = searchParams.get('menu') || 'sales-menu'

  const [stores, setStores] = useState<StoreType[]>([])
  const [selectedStoreId, setSelectedStoreId] = useState('')
  const [loadingSummary, setLoadingSummary] = useState(true)
  const [loadingTable, setLoadingTable] = useState(true)
  const [downloading, setDownloading] = useState<string | null>(null)

  const [profit, setProfit] = useState<ProfitData>({ totalSales: 0, totalDiscount: 0, totalExpense: 0, estimatedProfit: 0 })
  const [tableData, setTableData] = useState<any[]>([])

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const [isMounted, setIsMounted] = useState(false)
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('sales')

  // States for Margin Analyzer & Price Tracker
  const [marginTierFilter, setMarginTierFilter] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL')
  const [marginSortBy, setMarginSortBy] = useState<'marginDesc' | 'marginAsc' | 'profitDesc' | 'revenueDesc'>('marginDesc')
  const [allProducts, setAllProducts] = useState<any[]>([])
  const [selectedTrackerProductId, setSelectedTrackerProductId] = useState<string>('')

  
  const salesReportCards = [
    { id: 'ringkasan', label: 'Ringkasan', icon: FileText, tab: 'sales' as TabType, desc: 'Ringkasan omset dan grafik penjualan harian' },
    { id: 'transaksi', label: 'Data Transaksi Penjualan', icon: FileText, tab: 'sales' as TabType, desc: 'Log lengkap seluruh transaksi penjualan' },
    { id: 'produk', label: 'Penjualan Produk', icon: Boxes, tab: 'products' as TabType, desc: 'Kuantitas dan total terjual per produk' },
    { id: 'outlet', label: 'Penjualan Per Outlet', icon: Store, tab: 'sales' as TabType, desc: 'Grafik kontribusi omset per cabang toko' },
    { id: 'harian', label: 'Penjualan Harian', icon: Calendar, tab: 'sales' as TabType, desc: 'Laporan volume transaksi per tanggal' },
    { id: 'jam', label: 'Penjualan Per Jam', icon: Clock, tab: 'sales' as TabType, desc: 'Peta waktu ramai transaksi harian' },
    { id: 'kategori', label: 'Penjualan Per Kategori', icon: Tag, tab: 'products' as TabType, desc: 'Penjualan produk berdasarkan kategori' },
    { id: 'pelanggan', label: 'Penjualan Per Pelanggan', icon: UserCheck, tab: 'sales' as TabType, desc: 'Laporan riwayat belanja member terdaftar' },
    { id: 'metode', label: 'Metode Pembayaran', icon: Coins, tab: 'sales' as TabType, desc: 'Metode transaksi (Cash, Card, dll)' }
  ]

  const operationalReportCards = [
    { id: 'rekap-kas', label: 'Rekap Kas', icon: Coins, tab: 'shifts' as TabType, desc: 'Detail logs buka/tutup kasir per shift' },
    { id: 'stok', label: 'Stok', icon: Boxes, tab: 'stock' as TabType, desc: 'Laporan mutasi stock opname barang masuk/keluar' },
    { id: 'absensi', label: 'Absensi', icon: Users, tab: 'shifts' as TabType, desc: 'Laporan absensi kehadiran karyawan kasir' },
    { id: 'pengeluaran', label: 'Pengeluaran', icon: CreditCard, tab: 'expenses' as TabType, desc: 'Biaya operasional kas dan dana keluar toko' },
    { id: 'komisi', label: 'Komisi', icon: Percent, tab: 'shifts' as TabType, desc: 'Laporan bonus/komisi penjualan staf' },
  ]

  const profitReportCards = [
    { id: 'pajak', label: 'Penerimaan Pajak', icon: Coins, tab: 'sales' as TabType, desc: 'Pajak penjualan terhitung otomatis' },
    { id: 'promo', label: 'Promo', icon: Percent, tab: 'sales' as TabType, desc: 'Log pemakaian kupon diskon dan promo' },
    { id: 'laba-harian', label: 'Laba Harian', icon: TrendingUp, tab: 'sales' as TabType, desc: 'Audit laba bersih dikurangi modal HPP' },
    { id: 'laba-produk', label: 'Laba Produk', icon: Boxes, tab: 'products' as TabType, desc: 'Margin laba per item barang' },
    { id: 'harga-modal', label: 'Riwayat Modal Supplier', icon: TrendingDown, tab: 'purchases' as TabType, desc: 'Track perubahan harga modal / cost price dari supplier' }
  ]

  
  const currentReports = useMemo(() => {
    if (menuParam === 'operational-menu') return operationalReportCards
    if (menuParam === 'profit-menu') return profitReportCards
    return salesReportCards
  }, [menuParam])

  const menuTitle = useMemo(() => {
    if (menuParam === 'operational-menu') return 'Laporan Operasional'
    if (menuParam === 'profit-menu') return 'Laporan Laba & Rugi'
    return 'Laporan Penjualan'
  }, [menuParam])

  useEffect(() => {
    initPage()
    setIsMounted(true)
  }, [])

  useEffect(() => {
    
    setSelectedReportId(null)
  }, [menuParam])

  useEffect(() => {
    if (selectedStoreId) {
      loadSummaryData(selectedStoreId, startDate, endDate)
      loadTabTableData(selectedStoreId, activeTab, startDate, endDate)
    }
  }, [selectedStoreId, activeTab, startDate, endDate, selectedReportId])

  function handleCardClick(report: typeof salesReportCards[0]) {
    setSelectedReportId(report.id)
    setActiveTab(report.tab)
  }

  function getActiveQuickFilter() {
    const today = new Date()
    const todayStr = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split('T')[0]
    
    if (!startDate && !endDate) return 'all'
    if (startDate === todayStr && endDate === todayStr) return 'today'
    
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const sevenDaysAgoStr = new Date(sevenDaysAgo.getTime() - sevenDaysAgo.getTimezoneOffset() * 60000).toISOString().split('T')[0]
    if (startDate === sevenDaysAgoStr && endDate === todayStr) return '7days'
    
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const startOfMonthStr = new Date(startOfMonth.getTime() - startOfMonth.getTimezoneOffset() * 60000).toISOString().split('T')[0]
    if (startDate === startOfMonthStr && endDate === todayStr) return 'month'
    
    return 'custom'
  }

  function handleQuickFilter(val: string) {
    const today = new Date()
    const todayStr = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split('T')[0]
    
    if (val === 'all') {
      setStartDate('')
      setEndDate('')
    } else if (val === 'today') {
      setStartDate(todayStr)
      setEndDate(todayStr)
    } else if (val === '7days') {
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const sevenDaysAgoStr = new Date(sevenDaysAgo.getTime() - sevenDaysAgo.getTimezoneOffset() * 60000).toISOString().split('T')[0]
      setStartDate(sevenDaysAgoStr)
      setEndDate(todayStr)
    } else if (val === 'month') {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      const startOfMonthStr = new Date(startOfMonth.getTime() - startOfMonth.getTimezoneOffset() * 60000).toISOString().split('T')[0]
      setStartDate(startOfMonthStr)
      setEndDate(todayStr)
    }
  }

  async function initPage() {
    try {
      const token = localStorage.getItem('token')
      const headers = { Authorization: `Bearer ${token}` }
      const storesRes = await api.get('/stores', { headers })
      setStores(storesRes.data)

      const cachedStoreId = localStorage.getItem('storeId')
      const initialStoreId = storesRes.data.find((s: StoreType) => s.id === cachedStoreId)?.id || storesRes.data[0]?.id || ''

      if (initialStoreId) {
        setSelectedStoreId(initialStoreId)
      } else {
        setLoadingSummary(false)
        setLoadingTable(false)
      }
    } catch (error) {
      console.error(error)
      setLoadingSummary(false)
      setLoadingTable(false)
    }
  }

  async function loadSummaryData(storeId: string, start?: string, end?: string) {
    setLoadingSummary(true)
    try {
      const res = await api.get(`/reports/profit/${storeId}`, {
        params: { startDate: start || undefined, endDate: end || undefined },
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      })
      setProfit(res.data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoadingSummary(false)
    }
  }

  async function loadTabTableData(storeId: string, tab: TabType, start?: string, end?: string) {
    setLoadingTable(true)
    setTableData([])
    try {
      let endpoint = `/reports/sales/${storeId}`
      
      if (selectedReportId) {
        if (selectedReportId === 'ringkasan' || selectedReportId === 'transaksi') {
          endpoint = `/reports/sales/${storeId}`
        } else if (selectedReportId === 'outlet') {
          endpoint = `/reports/sales-by-outlet/${storeId}`
        } else if (selectedReportId === 'harian') {
          endpoint = `/reports/sales-by-date/${storeId}`
        } else if (selectedReportId === 'jam') {
          endpoint = `/reports/sales-by-hour/${storeId}`
        } else if (selectedReportId === 'kategori') {
          endpoint = `/reports/sales-by-category/${storeId}`
        } else if (selectedReportId === 'pelanggan') {
          endpoint = `/reports/sales-by-customer/${storeId}`
        } else if (selectedReportId === 'metode') {
          endpoint = `/reports/sales-by-payment-method/${storeId}`
        } else if (selectedReportId === 'rekap-kas') {
          endpoint = `/reports/shifts/${storeId}`
        } else if (selectedReportId === 'stok') {
          endpoint = `/reports/stock-movements/${storeId}`
        } else if (selectedReportId === 'absensi') {
          endpoint = `/reports/attendance/${storeId}`
        } else if (selectedReportId === 'pengeluaran') {
          endpoint = `/reports/expenses/${storeId}`
        } else if (selectedReportId === 'komisi') {
          endpoint = `/reports/commission/${storeId}`
        } else if (selectedReportId === 'pajak') {
          endpoint = `/reports/taxes/${storeId}`
        } else if (selectedReportId === 'promo') {
          endpoint = `/reports/promos/${storeId}`
        } else if (selectedReportId === 'laba-harian') {
          endpoint = `/reports/daily-profit/${storeId}`
        } else if (selectedReportId === 'laba-produk' || selectedReportId === 'produk') {
          endpoint = `/reports/product-profit/${storeId}`
        } else if (selectedReportId === 'harga-modal') {
          endpoint = `/purchases/store/${storeId}`
        }
      } else {
        if (tab === 'expenses') endpoint = `/reports/expenses/${storeId}`
        else if (tab === 'products') endpoint = `/reports/product-profit/${storeId}`
        else if (tab === 'shifts') endpoint = `/reports/shifts/${storeId}`
        else if (tab === 'purchases') endpoint = `/reports/purchases/${storeId}`
        else if (tab === 'stock') endpoint = `/reports/stock-movements/${storeId}`
      }

      const res = await api.get(endpoint, {
        params: { startDate: start || undefined, endDate: end || undefined },
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      })

      if (endpoint.includes('/reports/sales/') || endpoint.includes('/reports/expenses/')) {
        setTableData(res.data.data || [])
      } else {
        setTableData(res.data || [])
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoadingTable(false)
    }
  }

  async function handleExport(type: 'excel' | 'pdf') {
    setDownloading(type)
    try {
      const response = await api.get(`/reports/sales/${selectedStoreId}/${type}`, {
        params: { startDate: startDate || undefined, endDate: endDate || undefined },
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        responseType: 'blob'
      })
      
      const blob = new Blob([response.data], { 
        type: type === 'excel' 
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
          : 'application/pdf' 
      })
      
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const dateStr = startDate && endDate ? `_${startDate}_to_${endDate}` : ''
      link.setAttribute('download', `laporan_penjualan_${selectedStoreId}${dateStr}.${type === 'excel' ? 'xlsx' : 'pdf'}`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      console.error(error)
      alert('Gagal mengunduh dokumen laporan.')
    } finally {
      setDownloading(null)
    }
  }

  // Load products list for Cost Price Tracker
  useEffect(() => {
    if (selectedReportId === 'harga-modal' && selectedStoreId) {
      const token = localStorage.getItem('token')
      api.get(`/products/store/${selectedStoreId}`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => {
        setAllProducts(res.data || [])
        if (res.data && res.data.length > 0) {
          setSelectedTrackerProductId(res.data[0].id)
        }
      }).catch(err => console.error(err))
    }
  }, [selectedReportId, selectedStoreId])

  // Gross Profit Margin Analyzer calculations
  const analyzedProducts = useMemo(() => {
    if (selectedReportId !== 'laba-produk' && selectedReportId !== 'produk') return []
    return tableData.map(row => {
      const rev = row.revenue ?? 0
      const cost = row.cost ?? 0
      const profit = row.profit ?? 0
      const marginPct = rev > 0 ? (profit / rev) * 100 : 0
      
      let tier: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM'
      if (marginPct >= 30) tier = 'HIGH'
      else if (marginPct < 15) tier = 'LOW'

      return {
        ...row,
        marginPct,
        tier
      }
    })
  }, [tableData, selectedReportId])

  const marginStats = useMemo(() => {
    if (analyzedProducts.length === 0) return { avgMargin: 0, highCount: 0, medCount: 0, lowCount: 0, highest: null, lowest: null }
    
    const totalRev = analyzedProducts.reduce((sum, p) => sum + (p.revenue ?? 0), 0)
    const totalCost = analyzedProducts.reduce((sum, p) => sum + (p.cost ?? 0), 0)
    const totalProfit = totalRev - totalCost
    const avgMargin = totalRev > 0 ? (totalProfit / totalRev) * 100 : 0

    let highest = analyzedProducts[0]
    let lowest = analyzedProducts[0]
    let highCount = 0
    let medCount = 0
    let lowCount = 0

    analyzedProducts.forEach(p => {
      if (p.marginPct > (highest?.marginPct ?? -999)) highest = p
      if (p.marginPct < (lowest?.marginPct ?? 999)) lowest = p
      if (p.tier === 'HIGH') highCount++
      else if (p.tier === 'MEDIUM') medCount++
      else if (p.tier === 'LOW') lowCount++
    })

    return { avgMargin, highCount, medCount, lowCount, highest, lowest }
  }, [analyzedProducts])

  const processedProducts = useMemo(() => {
    let result = [...analyzedProducts]
    if (marginTierFilter !== 'ALL') {
      result = result.filter(p => p.tier === marginTierFilter)
    }
    
    result.sort((a, b) => {
      if (marginSortBy === 'marginDesc') return b.marginPct - a.marginPct
      if (marginSortBy === 'marginAsc') return a.marginPct - b.marginPct
      if (marginSortBy === 'profitDesc') return (b.profit ?? 0) - (a.profit ?? 0)
      if (marginSortBy === 'revenueDesc') return (b.revenue ?? 0) - (a.revenue ?? 0)
      return 0
    })

    return result
  }, [analyzedProducts, marginTierFilter, marginSortBy])

  // Cost Tracker calculations
  const costHistory = useMemo(() => {
    if (!selectedTrackerProductId || tableData.length === 0) return []
    
    const history: Array<{
      date: string
      invoiceNumber: string
      supplierName: string
      costPrice: number
      quantity: number
    }> = []

    tableData.forEach((purchase: any) => {
      if (purchase.items && Array.isArray(purchase.items)) {
        purchase.items.forEach((item: any) => {
          if (String(item.productId) === String(selectedTrackerProductId)) {
            history.push({
              date: purchase.createdAt,
              invoiceNumber: purchase.invoiceNumber,
              supplierName: purchase.supplier?.name || 'Umum',
              costPrice: item.costPrice ?? 0,
              quantity: item.quantity ?? 0
            })
          }
        })
      }
    })

    return history.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [selectedTrackerProductId, tableData])

  const costHistoryWithChanges = useMemo(() => {
    return costHistory.map((item, idx) => {
      const prev = idx > 0 ? costHistory[idx - 1] : null
      const diff = prev ? item.costPrice - prev.costPrice : 0
      return {
        ...item,
        diff
      }
    })
  }, [costHistory])

  const sortedHistoryLogs = useMemo(() => {
    return [...costHistoryWithChanges].reverse()
  }, [costHistoryWithChanges])

  if (!isMounted) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
      </div>
    )
  }

  
  if (!selectedReportId) {
    return (
      <div className="space-y-6">
        
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <div className="text-xs font-bold text-slate-400">Laporan</div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight mt-1">{menuTitle}</h1>
          </div>
          
          <div className="relative shrink-0">
            <select
              value={selectedStoreId}
              onChange={(e) => {
                setSelectedStoreId(e.target.value)
                localStorage.setItem('storeId', e.target.value)
              }}
              className="w-full sm:w-60 appearance-none bg-white border border-slate-200 pl-4 pr-10 py-2.5 rounded-lg text-xs font-bold text-slate-700 focus:border-sky-500 focus:outline-none cursor-pointer transition-all"
            >
              {stores.map((store, idx) => (
                <option key={store.id || idx} value={store.id}>{store.name}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {currentReports.map((report) => {
            const Icon = report.icon
            return (
              <button
                key={report.id}
                onClick={() => handleCardClick(report)}
                className="flex items-center gap-4 bg-white border border-slate-200/80 rounded-xl p-5 hover:shadow-md hover:border-slate-300 transition-all text-left group cursor-pointer"
              >
                <div className="h-12 w-12 bg-sky-50 rounded-xl flex items-center justify-center text-sky-500 group-hover:scale-115 transition-transform shrink-0">
                  <Icon size={22} className="stroke-[1.75]" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xs font-bold text-slate-800 tracking-tight leading-snug group-hover:text-sky-600 transition-colors">
                    {report.label}
                  </h3>
                  <p className="text-[10px] text-slate-450 mt-1 font-semibold leading-normal truncate">
                    {report.desc}
                  </p>
                </div>
              </button>
            )
          })}
        </div>

      </div>
    )
  }

  
  const currentReportObj = currentReports.find(r => r.id === selectedReportId)

  return (
    <div className="space-y-6">
      
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <button
            onClick={() => setSelectedReportId(null)}
            className="inline-flex items-center gap-1.5 text-xs font-extrabold text-sky-500 hover:text-sky-600 hover:underline transition-all cursor-pointer mb-2"
          >
            <ArrowLeft size={14} />
            <span>Kembali ke Laporan</span>
          </button>
          
          <h1 className="text-lg font-black text-slate-900 tracking-tight leading-tight">
            {currentReportObj?.label || 'Detail Laporan'}
          </h1>
          <p className="text-[10.5px] font-semibold text-slate-400 mt-1">
            Menampilkan data laporan dari outlet {stores.find(s => s.id === selectedStoreId)?.name || 'toko'}
          </p>
        </div>

        <div className="relative shrink-0">
          <select
            value={selectedStoreId}
            onChange={(e) => {
              setSelectedStoreId(e.target.value)
              localStorage.setItem('storeId', e.target.value)
            }}
            className="w-full sm:w-60 appearance-none bg-white border border-slate-200 pl-4 pr-10 py-2.5 rounded-lg text-xs font-bold text-slate-700 focus:border-sky-500 focus:outline-none cursor-pointer transition-all"
          >
            {stores.map((store, idx) => (
              <option key={store.id || idx} value={store.id}>{store.name}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-3xs">
        <div className="flex items-center gap-3 text-slate-800">
          <div className="h-9 w-9 bg-sky-50 border border-sky-100 rounded-lg flex items-center justify-center text-sky-500 shrink-0">
            <Calendar size={16} />
          </div>
          <div>
            <h2 className="text-xs font-black text-slate-900 tracking-tight">Rentang Waktu Laporan</h2>
            <p className="text-[10px] text-slate-450 font-semibold mt-0.5">Filter metrik & tabel transaksi secara realtime.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-slate-100/80 p-0.5 rounded-lg border border-slate-200/40">
            {[
              { label: 'Semua', value: 'all' },
              { label: 'Hari Ini', value: 'today' },
              { label: '7 Hari', value: '7days' },
              { label: 'Bulan Ini', value: 'month' },
            ].map((opt) => {
              const isSelected = getActiveQuickFilter() === opt.value
              return (
                <button
                  key={opt.value}
                  onClick={() => handleQuickFilter(opt.value)}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white text-sky-600 shadow-3xs font-extrabold'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 focus:border-sky-500 focus:outline-none cursor-pointer transition-all"
            />
            <span className="text-[10px] font-bold text-slate-400">s/d</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 focus:border-sky-500 focus:outline-none cursor-pointer transition-all"
            />
            {(startDate || endDate) && (
              <button
                onClick={() => {
                  setStartDate('')
                  setEndDate('')
                }}
                className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-lg border border-slate-200 transition-all cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>
      </div>

      
      {/* Gross Profit Margin Analyzer KPI Summary & Filters */}
      {(selectedReportId === 'laba-produk' || selectedReportId === 'produk') && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Avg Margin */}
            <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-3xs flex items-center gap-4 hover:shadow-xs transition-all">
              <div className="p-3 bg-indigo-500/10 rounded-lg border border-indigo-100/50 text-indigo-600 shrink-0">
                <Percent className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rata-Rata Margin</p>
                <p className="text-base font-black text-slate-900 font-mono mt-0.5">{marginStats.avgMargin.toFixed(1)}%</p>
                <p className="text-[8.5px] text-slate-450 font-semibold mt-1">
                  Margin kotor terbobot seluruh produk
                </p>
              </div>
            </div>

            {/* Highest Margin Item */}
            <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-3xs flex items-center gap-4 hover:shadow-xs transition-all">
              <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-100/50 text-emerald-600 shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Margin Tertinggi</p>
                <p className="text-sm font-black text-slate-900 mt-0.5 truncate" title={marginStats.highest?.productName || '-'}>
                  {marginStats.highest?.productName || '-'}
                </p>
                <p className="text-[9px] font-mono text-emerald-650 font-extrabold mt-0.5">
                  {marginStats.highest ? `${marginStats.highest.marginPct.toFixed(1)}% Margin` : '—'}
                </p>
              </div>
            </div>

            {/* Lowest Margin Item */}
            <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-3xs flex items-center gap-4 hover:shadow-xs transition-all">
              <div className="p-3 bg-rose-500/10 rounded-lg border border-rose-100/50 text-rose-600 shrink-0">
                <TrendingDown className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Margin Terendah</p>
                <p className="text-sm font-black text-slate-900 mt-0.5 truncate" title={marginStats.lowest?.productName || '-'}>
                  {marginStats.lowest?.productName || '-'}
                </p>
                <p className="text-[9px] font-mono text-rose-650 font-extrabold mt-0.5">
                  {marginStats.lowest ? `${marginStats.lowest.marginPct.toFixed(1)}% Margin` : '—'}
                </p>
              </div>
            </div>
          </div>

          {/* Filtering and Sorting control bar */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Filter Margin:</span>
              <div className="flex bg-white p-0.5 rounded-lg border border-slate-200 shadow-3xs">
                {[
                  { label: 'Semua', value: 'ALL' },
                  { label: 'Tinggi (≥30%)', value: 'HIGH' },
                  { label: 'Sedang (15-30%)', value: 'MEDIUM' },
                  { label: 'Rendah (<15%)', value: 'LOW' }
                ].map((tierOpt) => (
                  <button
                    key={tierOpt.value}
                    onClick={() => setMarginTierFilter(tierOpt.value as any)}
                    className={`px-3 py-1 text-[10px] font-bold rounded transition-all cursor-pointer ${
                      marginTierFilter === tierOpt.value
                        ? 'bg-indigo-650 text-white shadow-3xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {tierOpt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-bold text-slate-500">Urutkan:</span>
              <select
                value={marginSortBy}
                onChange={(e) => setMarginSortBy(e.target.value as any)}
                className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 focus:border-indigo-500 focus:outline-none cursor-pointer shadow-3xs"
              >
                <option value="marginDesc">Margin % (Tertinggi)</option>
                <option value="marginAsc">Margin % (Terendah)</option>
                <option value="profitDesc">Laba (Terbesar)</option>
                <option value="revenueDesc">Penjualan (Terbesar)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Supplier Cost Tracker Selector & SVG Chart */}
      {selectedReportId === 'harga-modal' && (
        <div className="space-y-6">
          {/* Selector Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-3xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xs font-black text-slate-900 tracking-tight">Pilih Produk Supplier</h3>
              <p className="text-[10px] text-slate-450 font-semibold mt-0.5">Analisis tren harga modal HPP dari waktu ke waktu.</p>
            </div>
            <div className="relative shrink-0 w-full sm:w-80">
              <select
                value={selectedTrackerProductId}
                onChange={(e) => setSelectedTrackerProductId(e.target.value)}
                className="w-full appearance-none bg-slate-50 border border-slate-200 pl-4 pr-10 py-2.5 rounded-lg text-xs font-bold text-slate-700 focus:bg-white focus:border-indigo-500 focus:outline-none cursor-pointer transition-all shadow-3xs"
              >
                {allProducts.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} {p.sku ? `(SKU: ${p.sku})` : ''}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {costHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 bg-white border border-slate-200 rounded-xl shadow-3xs text-slate-400 gap-2">
              <TrendingUp className="w-8 h-8 text-slate-350" />
              <p className="text-xs font-bold text-slate-500">Belum ada riwayat pembelian supplier</p>
              <p className="text-[10px] text-slate-400">Pastikan produk ini terdaftar di Purchase Order (PO) masuk di menu Bisnis &gt; Pembelian.</p>
            </div>
          ) : (
            <>
              {/* Cost Tracker KPI Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-3xs flex items-center gap-4 hover:shadow-xs transition-all">
                  <div className="p-3 bg-indigo-500/10 rounded-lg border border-indigo-100/50 text-indigo-600 shrink-0">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Harga Modal Terakhir</p>
                    <p className="text-base font-black text-slate-900 font-mono mt-0.5">
                      Rp {costHistory[costHistory.length - 1].costPrice.toLocaleString('id-ID')}
                    </p>
                    <p className="text-[8.5px] text-slate-450 font-semibold mt-1">
                      Berdasarkan PO masuk terakhir
                    </p>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-3xs flex items-center gap-4 hover:shadow-xs transition-all">
                  <div className={`p-3 rounded-lg border shrink-0 ${
                    costHistoryWithChanges[costHistoryWithChanges.length - 1].diff === 0
                      ? 'bg-slate-100 border-slate-200 text-slate-500'
                      : costHistoryWithChanges[costHistoryWithChanges.length - 1].diff > 0
                        ? 'bg-rose-500/10 border-rose-100/50 text-rose-600'
                        : 'bg-emerald-500/10 border-emerald-100/50 text-emerald-600'
                  }`}>
                    {costHistoryWithChanges[costHistoryWithChanges.length - 1].diff >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Perubahan Terakhir</p>
                    <p className={`text-base font-black font-mono mt-0.5 ${
                      costHistoryWithChanges[costHistoryWithChanges.length - 1].diff === 0
                        ? 'text-slate-800'
                        : costHistoryWithChanges[costHistoryWithChanges.length - 1].diff > 0
                          ? 'text-rose-650'
                          : 'text-emerald-650'
                    }`}>
                      {costHistoryWithChanges[costHistoryWithChanges.length - 1].diff === 0
                        ? 'Tetap'
                        : costHistoryWithChanges[costHistoryWithChanges.length - 1].diff > 0
                          ? `+Rp ${costHistoryWithChanges[costHistoryWithChanges.length - 1].diff.toLocaleString('id-ID')}`
                          : `-Rp ${Math.abs(costHistoryWithChanges[costHistoryWithChanges.length - 1].diff).toLocaleString('id-ID')}`
                      }
                    </p>
                    <p className="text-[8.5px] text-slate-450 font-semibold mt-1">
                      Dibandingkan harga modal sebelumnya
                    </p>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-3xs flex items-center gap-4 hover:shadow-xs transition-all">
                  <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-100/50 text-blue-600 shrink-0">
                    <Boxes className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Terbeli</p>
                    <p className="text-base font-black text-slate-900 font-mono mt-0.5">
                      {costHistory.reduce((sum, item) => sum + item.quantity, 0)} Pcs
                    </p>
                    <p className="text-[8.5px] text-slate-450 font-semibold mt-1">
                      Akumulasi kuantitas pasokan
                    </p>
                  </div>
                </div>
              </div>

              {/* Custom SVG Line Chart */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-3xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-black text-slate-900">Grafik Pergerakan Harga Modal</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Visualisasi kronologis fluktuasi harga beli supplier.</p>
                  </div>
                </div>
                
                <div className="w-full overflow-x-auto pt-2 pb-2">
                  <div className="min-w-[600px] h-60 flex justify-center items-center">
                    {/* SVG Chart Code */}
                    {(() => {
                      const chartWidth = 700
                      const chartHeight = 220
                      const paddingLeft = 60
                      const paddingRight = 40
                      const paddingTop = 20
                      const paddingBottom = 40

                      const prices = costHistory.map(h => h.costPrice)
                      const maxPrice = Math.max(...prices) * 1.1
                      const minPrice = Math.min(...prices) * 0.9

                      const priceRange = maxPrice - minPrice || 1
                      const steps = 4

                      const points = costHistory.map((item, index) => {
                        const x = paddingLeft + (index / Math.max(1, costHistory.length - 1)) * (chartWidth - paddingLeft - paddingRight)
                        const y = paddingTop + (1 - (item.costPrice - minPrice) / priceRange) * (chartHeight - paddingTop - paddingBottom)
                        return { x, y, price: item.costPrice, date: item.date, supplier: item.supplierName }
                      })

                      const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
                      const areaPath = points.length > 0 
                        ? `${linePath} L ${points[points.length - 1].x} ${chartHeight - paddingBottom} L ${points[0].x} ${chartHeight - paddingBottom} Z`
                        : ''

                      return (
                        <svg width="100%" height="100%" viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="overflow-visible select-none">
                          <defs>
                            <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.15" />
                              <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>

                          {/* Grid Lines */}
                          {Array.from({ length: steps + 1 }).map((_, i) => {
                            const gridY = paddingTop + (i / steps) * (chartHeight - paddingTop - paddingBottom)
                            const gridPrice = maxPrice - (i / steps) * priceRange
                            return (
                              <g key={i} className="opacity-40">
                                <line 
                                  x1={paddingLeft} 
                                  y1={gridY} 
                                  x2={chartWidth - paddingRight} 
                                  y2={gridY} 
                                  stroke="#e2e8f0" 
                                  strokeWidth="1" 
                                  strokeDasharray="4 4" 
                                />
                                <text 
                                  x={paddingLeft - 8} 
                                  y={gridY + 4} 
                                  textAnchor="end" 
                                  className="fill-slate-400 font-mono text-[9px] font-bold"
                                >
                                  Rp {Math.round(gridPrice).toLocaleString('id-ID')}
                                </text>
                              </g>
                            )
                          })}

                          {/* Area Under Curve */}
                          {areaPath && (
                            <path d={areaPath} fill="url(#chartGrad)" />
                          )}

                          {/* Main Line */}
                          {linePath && (
                            <path 
                              d={linePath} 
                              fill="none" 
                              stroke="#4f46e5" 
                              strokeWidth="2.5" 
                              strokeLinecap="round" 
                              strokeLinejoin="round" 
                            />
                          )}

                          {/* Dots & Labels */}
                          {points.map((p, i) => (
                            <g key={i} className="group cursor-pointer">
                              <circle 
                                cx={p.x} 
                                cy={p.y} 
                                r="4.5" 
                                fill="#ffffff" 
                                stroke="#4f46e5" 
                                strokeWidth="2.5" 
                              />
                              
                              {/* Hover tooltip structure */}
                              <g className="opacity-0 hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                                <rect 
                                  x={p.x - 65} 
                                  y={p.y - 45} 
                                  width="130" 
                                  height="35" 
                                  rx="6" 
                                  fill="#1e293b" 
                                />
                                <text x={p.x} y={p.y - 32} textAnchor="middle" className="fill-white font-mono text-[8px] font-black">
                                  Rp {p.price.toLocaleString('id-ID')}
                                </text>
                                <text x={p.x} y={p.y - 20} textAnchor="middle" className="fill-slate-300 text-[7px] font-bold">
                                  {p.supplier} ({new Date(p.date).toLocaleDateString('id-ID', {day: 'numeric', month: 'short'})})
                                </text>
                              </g>

                              {/* X Axis Labels */}
                              {(i === 0 || i === points.length - 1 || points.length <= 6 || i % Math.ceil(points.length / 5) === 0) && (
                                <text 
                                  x={p.x} 
                                  y={chartHeight - paddingBottom + 16} 
                                  textAnchor="middle" 
                                  className="fill-slate-400 font-bold text-[8px]"
                                >
                                  {new Date(p.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                </text>
                              )}
                            </g>
                          ))}
                        </svg>
                      )
                    })()}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {(selectedReportId === 'ringkasan' || selectedReportId === 'laba-harian' || selectedReportId === 'transaksi') && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-3xs flex items-center gap-4 hover:shadow-xs transition-all">
            <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-100/50 text-emerald-600 shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Omset Penjualan</p>
              <p className="text-base font-black text-slate-900 font-mono mt-0.5">Rp {(profit.totalSales ?? 0).toLocaleString('id-ID')}</p>
              {profit.totalDiscount > 0 ? (
                <div className="text-[9px] text-slate-500 font-semibold mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                  <span>Gross: Rp {((profit.totalSales ?? 0) + (profit.totalDiscount ?? 0)).toLocaleString('id-ID')}</span>
                  <span className="text-rose-600 font-bold">(-Rp {(profit.totalDiscount ?? 0).toLocaleString('id-ID')} diskon)</span>
                </div>
              ) : null}
              <p className="text-[8.5px] text-slate-450 font-semibold mt-1">Total nilai transaksi kotor</p>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-3xs flex items-center gap-4 hover:shadow-xs transition-all">
            <div className="p-3 bg-rose-500/10 rounded-lg border border-rose-100/50 text-rose-600 shrink-0">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Biaya Pengeluaran</p>
              <p className="text-base font-black text-slate-900 font-mono mt-0.5">Rp {(profit.totalExpense ?? 0).toLocaleString('id-ID')}</p>
              <p className="text-[8.5px] text-slate-450 font-semibold mt-1">HPP + Biaya Operasional</p>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-3xs flex items-center gap-4 hover:shadow-xs transition-all">
            <div className="p-3 bg-sky-500/10 rounded-lg border border-sky-100/50 text-sky-600 shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estimasi Laba Bersih</p>
              <p className={`text-base font-black font-mono mt-0.5 ${profit.estimatedProfit >= 0 ? 'text-sky-600' : 'text-rose-600'}`}>
                Rp {(profit.estimatedProfit ?? 0).toLocaleString('id-ID')}
              </p>
              <p className="text-[8.5px] text-slate-450 font-semibold mt-1">Margin laba bersih terhitung</p>
            </div>
          </div>
        </div>
      )}

      
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="text-xs font-bold text-slate-500">
          Manifestasi Log Laporan
        </div>
        {activeTab === 'sales' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExport('excel')}
              disabled={downloading !== null}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-3xs hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
            >
              {downloading === 'excel' ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />}
              Excel
            </button>
            <button
              onClick={() => handleExport('pdf')}
              disabled={downloading !== null}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-3xs hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
            >
              {downloading === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <FileText className="w-3.5 h-3.5 text-rose-600" />}
              PDF
            </button>
          </div>
        )}
      </div>

      
      <div className="rounded-xl border border-slate-200 bg-white shadow-3xs overflow-hidden">
        <div className="overflow-x-auto">
          {loadingTable ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : tableData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
              <BarChart3 className="w-8 h-8 text-slate-300" />
              <p className="text-xs font-bold text-slate-500">Manifes data pembukuan masih kosong</p>
            </div>
          ) : (
            <table className="w-full border-collapse text-left text-xs text-slate-600 font-semibold">
              
              
              {(selectedReportId === 'ringkasan' || selectedReportId === 'transaksi') && (
                <>
                  <thead className="bg-slate-50 text-[9px] font-bold uppercase text-slate-400 border-b border-slate-200/70 tracking-wider">
                    <tr>
                      <th className="p-4 pl-6">Invoice</th>
                      <th className="p-4">Waktu Transaksi</th>
                      <th className="p-4">Operator Kasir</th>
                      <th className="p-4">Member Pelanggan</th>
                      <th className="p-4">Metode Bayar</th>
                      <th className="p-4">Diskon</th>
                      <th className="p-4 pr-6">Total Jual</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tableData.map((tx: any, idx: number) => (
                      <tr key={tx.id || idx} className="hover:bg-slate-50/45 transition-colors">
                        <td className="p-4 pl-6 font-mono font-bold text-slate-900">{tx.invoiceNumber}</td>
                        <td className="p-4 text-slate-500 font-medium">{new Date(tx.createdAt).toLocaleString('id-ID')}</td>
                        <td className="p-4 text-slate-800">{tx.cashier?.name}</td>
                        <td className="p-4 text-slate-500 font-medium">{tx.customer?.name || '-'}</td>
                        <td className="p-4">
                          <span className="bg-sky-50 text-sky-700 border border-sky-100 text-[10px] px-2 py-0.5 rounded-full font-bold">
                            {tx.paymentMethod}
                          </span>
                        </td>
                        <td className="p-4">
                          {tx.totalDiscount > 0 ? (
                            <span className="bg-rose-50 text-rose-700 border border-rose-100 text-[10px] px-2.5 py-0.5 rounded-full font-bold">
                              -Rp {tx.totalDiscount.toLocaleString('id-ID')}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-medium font-mono">Rp 0</span>
                          )}
                        </td>
                        <td className="p-4 pr-6 font-bold text-slate-950 font-mono">Rp {(tx.total ?? 0).toLocaleString('id-ID')}</td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              
              {selectedReportId === 'outlet' && (
                <>
                  <thead className="bg-slate-50 text-[9px] font-bold uppercase text-slate-400 border-b border-slate-200/70 tracking-wider">
                    <tr>
                      <th className="p-4 pl-6">Nama Outlet</th>
                      <th className="p-4">Jumlah Transaksi</th>
                      <th className="p-4 pr-6">Total Omset Penjualan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tableData.map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/45 transition-colors">
                        <td className="p-4 pl-6 font-bold text-slate-900">{row.storeName}</td>
                        <td className="p-4 text-slate-500 font-mono">{row.count} Transaksi</td>
                        <td className="p-4 pr-6 font-bold text-emerald-600 font-mono">Rp {(row.totalSales ?? 0).toLocaleString('id-ID')}</td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              
              {selectedReportId === 'harian' && (
                <>
                  <thead className="bg-slate-50 text-[9px] font-bold uppercase text-slate-400 border-b border-slate-200/70 tracking-wider">
                    <tr>
                      <th className="p-4 pl-6">Tanggal</th>
                      <th className="p-4">Jumlah Transaksi</th>
                      <th className="p-4 pr-6">Total Omset Harian</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tableData.map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/45 transition-colors">
                        <td className="p-4 pl-6 font-bold text-slate-900">{row.date}</td>
                        <td className="p-4 text-slate-500 font-mono">{row.count} Transaksi</td>
                        <td className="p-4 pr-6 font-bold text-emerald-600 font-mono">Rp {(row.totalSales ?? 0).toLocaleString('id-ID')}</td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              
              {selectedReportId === 'jam' && (
                <>
                  <thead className="bg-slate-50 text-[9px] font-bold uppercase text-slate-400 border-b border-slate-200/70 tracking-wider">
                    <tr>
                      <th className="p-4 pl-6">Jam Operasional</th>
                      <th className="p-4">Jumlah Transaksi</th>
                      <th className="p-4 pr-6">Total Omset Terkumpul</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tableData.map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/45 transition-colors">
                        <td className="p-4 pl-6 font-bold text-slate-900">{row.hour}</td>
                        <td className="p-4 text-slate-500 font-mono">{row.count} Transaksi</td>
                        <td className="p-4 pr-6 font-bold text-sky-600 font-mono">Rp {(row.totalSales ?? 0).toLocaleString('id-ID')}</td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              
              {selectedReportId === 'kategori' && (
                <>
                  <thead className="bg-slate-50 text-[9px] font-bold uppercase text-slate-400 border-b border-slate-200/70 tracking-wider">
                    <tr>
                      <th className="p-4 pl-6">Nama Kategori Produk</th>
                      <th className="p-4">Kuantitas Terjual</th>
                      <th className="p-4">Total Diskon</th>
                      <th className="p-4 pr-6">Total Omset Penjualan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tableData.map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/45 transition-colors">
                        <td className="p-4 pl-6 font-bold text-slate-900">{row.categoryName}</td>
                        <td className="p-4 text-slate-500 font-mono">{row.quantity} Pcs</td>
                        <td className="p-4">
                          {row.totalDiscount > 0 ? (
                            <span className="bg-rose-50 text-rose-700 border border-rose-100 text-[10px] px-2.5 py-0.5 rounded-full font-bold">
                              -Rp {row.totalDiscount.toLocaleString('id-ID')}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-medium font-mono">Rp 0</span>
                          )}
                        </td>
                        <td className="p-4 pr-6 font-bold text-sky-600 font-mono">Rp {(row.totalSales ?? 0).toLocaleString('id-ID')}</td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              
              {selectedReportId === 'pelanggan' && (
                <>
                  <thead className="bg-slate-50 text-[9px] font-bold uppercase text-slate-400 border-b border-slate-200/70 tracking-wider">
                    <tr>
                      <th className="p-4 pl-6">Nama Pelanggan (Member)</th>
                      <th className="p-4">Nomor Kontak</th>
                      <th className="p-4">Frekuensi Belanja</th>
                      <th className="p-4 pr-6">Total Nilai Belanja</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tableData.map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/45 transition-colors">
                        <td className="p-4 pl-6 font-bold text-slate-900">{row.customerName}</td>
                        <td className="p-4 text-slate-500 font-mono">{row.phone}</td>
                        <td className="p-4 text-slate-500 font-mono">{row.count} Kali</td>
                        <td className="p-4 pr-6 font-bold text-sky-600 font-mono">Rp {(row.totalSpent ?? 0).toLocaleString('id-ID')}</td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              
              {selectedReportId === 'metode' && (
                <>
                  <thead className="bg-slate-50 text-[9px] font-bold uppercase text-slate-400 border-b border-slate-200/70 tracking-wider">
                    <tr>
                      <th className="p-4 pl-6">Metode Transaksi</th>
                      <th className="p-4">Jumlah Transaksi</th>
                      <th className="p-4 pr-6">Total Penerimaan Dana</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tableData.map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/45 transition-colors">
                        <td className="p-4 pl-6 font-bold text-slate-900">{row.method}</td>
                        <td className="p-4 text-slate-500 font-mono">{row.count} Kali</td>
                        <td className="p-4 pr-6 font-bold text-sky-600 font-mono">Rp {(row.totalSales ?? 0).toLocaleString('id-ID')}</td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              
              {selectedReportId === 'pajak' && (
                <>
                  <thead className="bg-slate-50 text-[9px] font-bold uppercase text-slate-400 border-b border-slate-200/70 tracking-wider">
                    <tr>
                      <th className="p-4 pl-6">Tanggal</th>
                      <th className="p-4">Nomor Invoice</th>
                      <th className="p-4">Total Transaksi</th>
                      <th className="p-4 pr-6">Pajak Terhitung</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tableData.map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/45 transition-colors">
                        <td className="p-4 pl-6 text-slate-500 font-medium">{new Date(row.createdAt).toLocaleDateString('id-ID')}</td>
                        <td className="p-4 font-mono font-bold text-slate-900">{row.invoiceNumber}</td>
                        <td className="p-4 font-mono">Rp {(row.total ?? 0).toLocaleString('id-ID')}</td>
                        <td className="p-4 pr-6 font-bold text-emerald-600 font-mono">Rp {(row.taxAmount ?? 0).toLocaleString('id-ID')}</td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              
              {selectedReportId === 'promo' && (
                <>
                  <thead className="bg-slate-50 text-[9px] font-bold uppercase text-slate-400 border-b border-slate-200/70 tracking-wider">
                    <tr>
                      <th className="p-4 pl-6">Tanggal</th>
                      <th className="p-4">Nomor Invoice</th>
                      <th className="p-4">Total Transaksi</th>
                      <th className="p-4 pr-6">Diskon / Potongan Harga</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tableData.map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/45 transition-colors">
                        <td className="p-4 pl-6 text-slate-500 font-medium">{new Date(row.createdAt).toLocaleDateString('id-ID')}</td>
                        <td className="p-4 font-mono font-bold text-slate-900">{row.invoiceNumber}</td>
                        <td className="p-4 font-mono">Rp {(row.total ?? 0).toLocaleString('id-ID')}</td>
                        <td className="p-4 pr-6 font-bold text-rose-600 font-mono">Rp {(row.totalDiscount ?? 0).toLocaleString('id-ID')}</td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              
              {selectedReportId === 'laba-harian' && (
                <>
                  <thead className="bg-slate-50 text-[9px] font-bold uppercase text-slate-400 border-b border-slate-200/70 tracking-wider">
                    <tr>
                      <th className="p-4 pl-6">Tanggal</th>
                      <th className="p-4">Pendapatan Kotor (Revenue)</th>
                      <th className="p-4">Pengeluaran Operasional & COGS</th>
                      <th className="p-4 pr-6">Laba Bersih Harian</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tableData.map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/45 transition-colors">
                        <td className="p-4 pl-6 font-bold text-slate-900">{row.date}</td>
                        <td className="p-4 font-mono text-emerald-600">Rp {(row.revenue ?? 0).toLocaleString('id-ID')}</td>
                        <td className="p-4 font-mono text-rose-600">Rp {((row.cogs ?? 0) + (row.expense ?? 0)).toLocaleString('id-ID')}</td>
                        <td className={`p-4 pr-6 font-bold font-mono ${row.profit >= 0 ? 'text-sky-600' : 'text-rose-600'}`}>
                          Rp {(row.profit ?? 0).toLocaleString('id-ID')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              
              {(selectedReportId === 'laba-produk' || selectedReportId === 'produk') && (
                <>
                  <thead className="bg-slate-50 text-[9px] font-bold uppercase text-slate-400 border-b border-slate-200/70 tracking-wider">
                    <tr>
                      <th className="p-4 pl-6">Nama Barang</th>
                      <th className="p-4">SKU Code</th>
                      <th className="p-4">Kuantitas Terjual</th>
                      <th className="p-4">Total Penjualan Kotor</th>
                      <th className="p-4">Total Modal HPP</th>
                      <th className="p-4 pr-6">Laba & Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {processedProducts.map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/45 transition-colors">
                        <td className="p-4 pl-6 font-bold text-slate-900">{row.productName}</td>
                        <td className="p-4 text-slate-400 font-mono">{row.sku}</td>
                        <td className="p-4 text-slate-700 font-mono">{row.quantity} Pcs</td>
                        <td className="p-4 font-mono text-slate-800">Rp {(row.revenue ?? 0).toLocaleString('id-ID')}</td>
                        <td className="p-4 font-mono text-rose-600">Rp {(row.cost ?? 0).toLocaleString('id-ID')}</td>
                        <td className="p-4 pr-6">
                          <div className="font-mono font-bold text-slate-950">
                            Rp {(row.profit ?? 0).toLocaleString('id-ID')}
                          </div>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[8.5px] font-black uppercase tracking-wider border mt-1 ${
                            row.tier === 'HIGH'
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                              : row.tier === 'LOW'
                                ? 'bg-rose-50 border-rose-200 text-rose-700'
                                : 'bg-amber-50 border-amber-200 text-amber-700'
                          }`}>
                            {row.marginPct.toFixed(1)}% ({row.tier === 'HIGH' ? 'Tinggi' : row.tier === 'LOW' ? 'Rendah' : 'Sedang'})
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              {selectedReportId === 'harga-modal' && (
                <>
                  <thead className="bg-slate-50 text-[9px] font-bold uppercase text-slate-400 border-b border-slate-200/70 tracking-wider">
                    <tr>
                      <th className="p-4 pl-6">Invoice PO</th>
                      <th className="p-4">Tanggal Pembelian</th>
                      <th className="p-4">Supplier</th>
                      <th className="p-4">Kuantitas</th>
                      <th className="p-4">Harga Modal (Pcs)</th>
                      <th className="p-4 pr-6">Perubahan Modal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortedHistoryLogs.map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/45 transition-colors">
                        <td className="p-4 pl-6 font-mono font-bold text-slate-900">{row.invoiceNumber}</td>
                        <td className="p-4 text-slate-500 font-medium">{new Date(row.date).toLocaleString('id-ID')}</td>
                        <td className="p-4 text-slate-800 font-bold">{row.supplierName}</td>
                        <td className="p-4 text-slate-500 font-mono font-medium">{row.quantity} Pcs</td>
                        <td className="p-4 font-mono font-bold text-slate-950">Rp {row.costPrice.toLocaleString('id-ID')}</td>
                        <td className="p-4 pr-6">
                          {row.diff === 0 ? (
                            <span className="bg-slate-50 text-slate-500 border border-slate-250 text-[9px] px-2 py-0.5 rounded-full font-bold">
                              Tetap (Rp 0)
                            </span>
                          ) : row.diff > 0 ? (
                            <span className="bg-rose-50 text-rose-700 border border-rose-250 text-[9px] px-2 py-0.5 rounded-full font-bold">
                              Naik Rp {row.diff.toLocaleString('id-ID')}
                            </span>
                          ) : (
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-250 text-[9px] px-2 py-0.5 rounded-full font-bold">
                              Turun Rp {Math.abs(row.diff).toLocaleString('id-ID')}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              
              {selectedReportId === 'rekap-kas' && (
                <>
                  <thead className="bg-slate-50 text-[9px] font-bold uppercase text-slate-400 border-b border-slate-200/70 tracking-wider">
                    <tr>
                      <th className="p-4 pl-6">Nama Personil</th>
                      <th className="p-4">Waktu Buka Shift</th>
                      <th className="p-4">Modal Awal Kas</th>
                      <th className="p-4">Kas Akhir Aktual</th>
                      <th className="p-4">Selisih Fisik Kas</th>
                      <th className="p-4 pr-6">Status Sesi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tableData.map((sh: any, idx: number) => (
                      <tr key={sh.id || idx} className="hover:bg-slate-50/45 transition-colors">
                        <td className="p-4 pl-6 font-bold text-slate-900">{sh.user?.name}</td>
                        <td className="p-4 text-slate-500 font-medium">{new Date(sh.createdAt).toLocaleString('id-ID')}</td>
                        <td className="p-4 font-mono">Rp {(sh.openingCash ?? 0).toLocaleString('id-ID')}</td>
                        <td className="p-4 font-mono">{sh.closingCash ? `Rp ${(sh.closingCash ?? 0).toLocaleString('id-ID')}` : '-'}</td>
                        <td className={`p-4 font-bold font-mono ${sh.difference < 0 ? 'text-rose-600' : sh.difference > 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
                          Rp {sh.difference?.toLocaleString('id-ID') ?? 0}
                        </td>
                        <td className="p-4 pr-6">
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${sh.status === 'OPEN' ? 'bg-emerald-50 text-emerald-700 border-emerald-250/70' : 'bg-slate-100 text-slate-500 border-slate-250/70'}`}>
                            {sh.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              
              {selectedReportId === 'stok' && (
                <>
                  <thead className="bg-slate-50 text-[9px] font-bold uppercase text-slate-400 border-b border-slate-200/70 tracking-wider">
                    <tr>
                      <th className="p-4 pl-6">Barang / SKU</th>
                      <th className="p-4">Waktu Koreksi</th>
                      <th className="p-4">Jenis Perubahan</th>
                      <th className="p-4">Kuantitas</th>
                      <th className="p-4 pr-6">Memo / Catatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tableData.map((st: any, idx: number) => (
                      <tr key={st.id || idx} className="hover:bg-slate-50/45 transition-colors">
                        <td className="p-4 pl-6">
                          <p className="font-extrabold text-slate-900">{st.product?.name}</p>
                          <p className="text-[10px] font-mono text-slate-400 mt-0.5">SKU: {st.product?.sku}</p>
                        </td>
                        <td className="p-4 text-slate-500 font-medium">{new Date(st.createdAt).toLocaleString('id-ID')}</td>
                        <td className="p-4">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${st.type === 'IN' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : st.type === 'OUT' ? 'bg-sky-50 text-sky-700 border-sky-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                            {st.type}
                          </span>
                        </td>
                        <td className={`p-4 font-black font-mono ${st.type === 'IN' ? 'text-emerald-600' : 'text-slate-900'}`}>{st.type === 'IN' ? `+${st.qty}` : `-${st.qty}`} Pcs</td>
                        <td className="p-4 pr-6 text-slate-500 font-medium max-w-xs truncate">{st.note || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              
              {selectedReportId === 'absensi' && (
                <>
                  <thead className="bg-slate-50 text-[9px] font-bold uppercase text-slate-400 border-b border-slate-200/70 tracking-wider">
                    <tr>
                      <th className="p-4 pl-6">Nama Staf / Karyawan</th>
                      <th className="p-4">Waktu Clock In (Masuk)</th>
                      <th className="p-4 pr-6">Waktu Clock Out (Pulang)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tableData.map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/45 transition-colors">
                        <td className="p-4 pl-6 font-bold text-slate-900">{row.user?.name}</td>
                        <td className="p-4 text-slate-500 font-medium">{new Date(row.clockIn).toLocaleString('id-ID')}</td>
                        <td className="p-4 pr-6 text-slate-500 font-medium">
                          {row.clockOut ? new Date(row.clockOut).toLocaleString('id-ID') : (
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] px-2 py-0.5 rounded-full font-bold">Sedang Aktif Bekerja</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              
              {selectedReportId === 'pengeluaran' && (
                <>
                  <thead className="bg-slate-50 text-[9px] font-bold uppercase text-slate-400 border-b border-slate-200/70 tracking-wider">
                    <tr>
                      <th className="p-4 pl-6">Deskripsi / Judul</th>
                      <th className="p-4">Kategori Pengeluaran</th>
                      <th className="p-4">Waktu Catat</th>
                      <th className="p-4 pr-6">Biaya Dana Keluar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tableData.map((ex: any, idx: number) => (
                      <tr key={ex.id || idx} className="hover:bg-slate-50/45 transition-colors">
                        <td className="p-4 pl-6 font-bold text-slate-900">{ex.title}</td>
                        <td className="p-4 whitespace-nowrap">
                          <span className="bg-slate-100 border border-slate-200 text-[10px] px-2 py-0.5 rounded-full font-bold text-slate-600">
                            {ex.category}
                          </span>
                        </td>
                        <td className="p-4 text-slate-500 font-medium">{new Date(ex.createdAt).toLocaleString('id-ID')}</td>
                        <td className="p-4 pr-6 font-bold text-rose-600 font-mono">Rp {(ex.amount ?? 0).toLocaleString('id-ID')}</td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              
              {selectedReportId === 'komisi' && (
                <>
                  <thead className="bg-slate-50 text-[9px] font-bold uppercase text-slate-400 border-b border-slate-200/70 tracking-wider">
                    <tr>
                      <th className="p-4 pl-6">Nama Kasir</th>
                      <th className="p-4">Jumlah Penjualan Melalui Kasir</th>
                      <th className="p-4">Total Omset Penjualan</th>
                      <th className="p-4 pr-6">Komisi Penjualan (1%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tableData.map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/45 transition-colors">
                        <td className="p-4 pl-6 font-bold text-slate-900">{row.cashierName}</td>
                        <td className="p-4 text-slate-500 font-mono">{row.count} Transaksi</td>
                        <td className="p-4 font-mono text-slate-800">Rp {(row.sales ?? 0).toLocaleString('id-ID')}</td>
                        <td className="p-4 pr-6 font-bold text-emerald-600 font-mono">Rp {(row.commission ?? 0).toLocaleString('id-ID')}</td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

            </table>
          )}
        </div>
      </div>

    </div>
  )
}

export default function ReportPage() {
  return (
    <Suspense fallback={
      <div className="flex h-[50vh] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
      </div>
    }>
      <ReportPageContent />
    </Suspense>
  )
}

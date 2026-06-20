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

  const [profit, setProfit] = useState<ProfitData>({ totalSales: 0, totalExpense: 0, estimatedProfit: 0 })
  const [tableData, setTableData] = useState<any[]>([])

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const [isMounted, setIsMounted] = useState(false)
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('sales')

  
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
    { id: 'laba-produk', label: 'Laba Produk', icon: Boxes, tab: 'products' as TabType, desc: 'Margin laba per item barang' }
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

      
      {(selectedReportId === 'ringkasan' || selectedReportId === 'laba-harian' || selectedReportId === 'transaksi') && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-3xs flex items-center gap-4 hover:shadow-xs transition-all">
            <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-100/50 text-emerald-600 shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Omset Penjualan</p>
              <p className="text-base font-black text-slate-900 font-mono mt-0.5">Rp {(profit.totalSales ?? 0).toLocaleString('id-ID')}</p>
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
                      <th className="p-4 pr-6">Margin Keuntungan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tableData.map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/45 transition-colors">
                        <td className="p-4 pl-6 font-bold text-slate-900">{row.productName}</td>
                        <td className="p-4 text-slate-400 font-mono">{row.sku}</td>
                        <td className="p-4 text-slate-700 font-mono">{row.quantity} Pcs</td>
                        <td className="p-4 font-mono text-slate-800">Rp {(row.revenue ?? 0).toLocaleString('id-ID')}</td>
                        <td className="p-4 font-mono text-rose-600">Rp {(row.cost ?? 0).toLocaleString('id-ID')}</td>
                        <td className="p-4 pr-6 font-bold text-emerald-600 font-mono">Rp {(row.profit ?? 0).toLocaleString('id-ID')}</td>
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

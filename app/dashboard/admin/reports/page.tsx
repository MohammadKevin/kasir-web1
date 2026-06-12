'use client'

import { useEffect, useState, useMemo } from 'react'
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
  Info,
  Calendar,
  X
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

export default function ReportPage() {
  const [stores, setStores] = useState<StoreType[]>([])
  const [selectedStoreId, setSelectedStoreId] = useState('')
  const [activeTab, setActiveTab] = useState<TabType>('sales')
  const [loadingSummary, setLoadingSummary] = useState(true)
  const [loadingTable, setLoadingTable] = useState(true)
  const [downloading, setDownloading] = useState<string | null>(null)

  const [profit, setProfit] = useState<ProfitData>({ totalSales: 0, totalExpense: 0, estimatedProfit: 0 })
  const [tableData, setTableData] = useState<any[]>([])

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    initPage()
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (selectedStoreId) {
      loadSummaryData(selectedStoreId, startDate, endDate)
      loadTabTableData(selectedStoreId, activeTab, startDate, endDate)
    }
  }, [selectedStoreId, activeTab, startDate, endDate])

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
      if (tab === 'expenses') endpoint = `/reports/expenses/${storeId}`
      if (tab === 'products') endpoint = `/reports/products/${storeId}`
      if (tab === 'shifts') endpoint = `/reports/shifts/${storeId}`
      if (tab === 'purchases') endpoint = `/reports/purchases/${storeId}`
      if (tab === 'stock') endpoint = `/reports/stock-movements/${storeId}`

      const res = await api.get(endpoint, {
        params: { startDate: start || undefined, endDate: end || undefined },
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      })

      if (tab === 'sales' || tab === 'expenses') {
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
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  if (loadingSummary && stores.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="h-9 w-44 animate-pulse rounded-xl bg-slate-200" />
            <div className="h-4 w-72 animate-pulse rounded-lg bg-slate-100" />
          </div>
          <div className="h-11 w-36 animate-pulse rounded-xl bg-slate-200" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="h-24 rounded-2xl animate-pulse bg-slate-100" />
          <div className="h-24 rounded-2xl animate-pulse bg-slate-100" />
          <div className="h-24 rounded-2xl animate-pulse bg-slate-100" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 bg-indigo-50 border border-indigo-100/55 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
            <BarChart3 size={20} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Manajemen Laporan Toko</h1>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">Audit finansial komprehensif, tracking performa inventori gudang, log shift, serta unduh berkas pembukuan.</p>
          </div>
        </div>

        <div className="relative shrink-0">
          <select
            value={selectedStoreId}
            onChange={(e) => {
              setSelectedStoreId(e.target.value)
              localStorage.setItem('storeId', e.target.value)
            }}
            className="w-full sm:w-60 appearance-none bg-white border border-slate-250/70 pl-4 pr-10 py-3.5 rounded-xl text-xs font-bold text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 cursor-pointer transition-all shadow-3xs"
          >
            {stores.map((store) => (
              <option key={store.id} value={store.id}>{store.name}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-3xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-slate-800">
          <div className="h-9 w-9 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
            <Calendar size={18} />
          </div>
          <div>
            <h2 className="text-xs font-black text-slate-900 tracking-tight">Rentang Waktu Laporan</h2>
            <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Filter metrik ringkasan & tabel data transaksi secara realtime.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Quick ranges */}
          <div className="flex bg-slate-100/80 p-1 rounded-xl border border-slate-200/40">
            {[
              { label: 'Semua', value: 'all' },
              { label: 'Hari Ini', value: 'today' },
              { label: '7 Hari Terakhir', value: '7days' },
              { label: 'Bulan Ini', value: 'month' },
            ].map((opt) => {
              const isSelected = getActiveQuickFilter() === opt.value
              return (
                <button
                  key={opt.value}
                  onClick={() => handleQuickFilter(opt.value)}
                  className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white text-indigo-600 shadow-3xs font-extrabold'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-white border border-slate-250/70 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 cursor-pointer transition-all shadow-3xs"
              />
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">s/d</span>
            <div className="relative">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-white border border-slate-250/70 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 cursor-pointer transition-all shadow-3xs"
              />
            </div>
            {(startDate || endDate) && (
              <button
                onClick={() => {
                  setStartDate('')
                  setEndDate('')
                }}
                className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-xl border border-slate-200 transition-all cursor-pointer shadow-3xs"
                title="Reset Filter Tanggal"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Profit Loss Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="border border-slate-200 rounded-2xl p-5 bg-white shadow-3xs flex items-center gap-4 hover:border-slate-350 transition-all duration-200">
          <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-100/50 text-emerald-600 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Omset Penjualan</p>
            <p className="text-xl font-black text-slate-900 font-mono mt-0.5">Rp {(profit.totalSales ?? 0).toLocaleString('id-ID')}</p>
            <p className="text-[8.5px] text-slate-400 font-semibold mt-1 leading-tight">Total nilai transaksi kotor (Harga Jual)</p>
          </div>
        </div>

        <div className="border border-slate-200 rounded-2xl p-5 bg-white shadow-3xs flex items-center gap-4 hover:border-slate-355 transition-all duration-200">
          <div className="p-3 bg-rose-500/10 rounded-xl border border-rose-100/50 text-rose-600 shrink-0">
            <TrendingDown className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Biaya Pengeluaran</p>
            <p className="text-xl font-black text-slate-900 font-mono mt-0.5">Rp {(profit.totalExpense ?? 0).toLocaleString('id-ID')}</p>
            <p className="text-[8.5px] text-slate-400 font-semibold mt-1 leading-tight">Harga Pokok Penjualan (HPP) + Biaya Ops</p>
          </div>
        </div>

        <div className="border border-slate-200 rounded-2xl p-5 bg-white shadow-3xs flex items-center gap-4 hover:border-slate-355 transition-all duration-200">
          <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-100/50 text-indigo-600 shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estimasi Laba Bersih</p>
            <p className={`text-xl font-black font-mono mt-0.5 ${profit.estimatedProfit >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
              Rp {(profit.estimatedProfit ?? 0).toLocaleString('id-ID')}
            </p>
            <p className="text-[8.5px] text-slate-400 font-semibold mt-1 leading-tight">Sisa bersih (Omset dikurangi HPP & Biaya Ops)</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-slate-200/60 pb-3">
        <div className="flex flex-wrap gap-1 bg-slate-100/80 p-1 rounded-2xl border border-slate-200/40">
          {[
            { id: 'sales', label: 'Penjualan' },
            { id: 'expenses', label: 'Pengeluaran' },
            { id: 'products', label: 'Produk' },
            { id: 'shifts', label: 'Shift Kerja' },
            { id: 'purchases', label: 'Kulakan' },
            { id: 'stock', label: 'Log Mutasi' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-3xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'sales' && (
          <div className="flex items-center gap-2 self-start lg:self-auto shrink-0">
            <button
              onClick={() => handleExport('excel')}
              disabled={downloading !== null}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-3xs hover:bg-slate-50 transition-all hover:border-slate-350 disabled:opacity-50 cursor-pointer"
            >
              {downloading === 'excel' ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />}
              Excel
            </button>
            <button
              onClick={() => handleExport('pdf')}
              disabled={downloading !== null}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-3xs hover:bg-slate-50 transition-all hover:border-slate-350 disabled:opacity-50 cursor-pointer"
            >
              {downloading === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <FileText className="w-3.5 h-3.5 text-rose-600" />}
              PDF
            </button>
          </div>
        )}
      </div>

      {/* Tab Contents Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-3xs overflow-hidden">
        <div className="overflow-x-auto">
          {loadingTable ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : tableData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
              <BarChart3 className="w-8 h-8 text-slate-350" />
              <p className="text-xs font-bold text-slate-500">Manifes data pembukuan masih kosong</p>
            </div>
          ) : (
            <table className="w-full border-collapse text-left text-xs text-slate-600 font-semibold">
              {activeTab === 'sales' && (
                <>
                  <thead className="bg-slate-50/70 text-[9px] font-bold uppercase text-slate-400 border-b border-slate-200 tracking-wider">
                    <tr>
                      <th className="p-4 pl-6">Invoice</th>
                      <th className="p-4">Waktu Transaksi</th>
                      <th className="p-4">Operator Kasir</th>
                      <th className="p-4">Member Pelanggan</th>
                      <th className="p-4 pr-6">Total Jual</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tableData.map((tx: any) => (
                      <tr key={tx.id} className="hover:bg-slate-50/45 transition-colors">
                        <td className="p-4 pl-6 font-mono font-bold text-slate-900">{tx.invoiceNumber}</td>
                        <td className="p-4 text-slate-500 font-medium">{new Date(tx.createdAt).toLocaleString('id-ID')}</td>
                        <td className="p-4 text-slate-800">{tx.cashier?.name}</td>
                        <td className="p-4 text-slate-500 font-medium">{tx.customer?.name || '-'}</td>
                        <td className="p-4 pr-6 font-bold text-slate-950 font-mono">Rp {(tx.total ?? 0).toLocaleString('id-ID')}</td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              {activeTab === 'expenses' && (
                <>
                  <thead className="bg-slate-50/70 text-[9px] font-bold uppercase text-slate-400 border-b border-slate-200 tracking-wider">
                    <tr>
                      <th className="p-4 pl-6">Deskripsi / Judul</th>
                      <th className="p-4">Kategori Pengeluaran</th>
                      <th className="p-4">Waktu Catat</th>
                      <th className="p-4 pr-6">Biaya Dana Keluar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tableData.map((ex: any) => (
                      <tr key={ex.id} className="hover:bg-slate-50/45 transition-colors">
                        <td className="p-4 pl-6 font-bold text-slate-900">{ex.title}</td>
                        <td className="p-4 whitespace-nowrap">
                          <span className="bg-slate-100 border border-slate-200 text-[10px] px-2 py-0.5 rounded-full font-bold text-slate-605">
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

              {activeTab === 'products' && (
                <>
                  <thead className="bg-slate-50/70 text-[9px] font-bold uppercase text-slate-400 border-b border-slate-200 tracking-wider">
                    <tr>
                      <th className="p-4 pl-6">Komoditas / Nama Barang</th>
                      <th className="p-4">SKU Code</th>
                      <th className="p-4">Harga Pokok (Modal)</th>
                      <th className="p-4">Sisa Stok Fisik</th>
                      <th className="p-4 pr-6">Kondisi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tableData.map((p: any) => (
                      <tr key={p.id} className="hover:bg-slate-50/45 transition-colors">
                        <td className="p-4 pl-6 font-bold text-slate-900">{p.name}</td>
                        <td className="p-4 font-mono text-slate-400">{p.sku || '-'}</td>
                        <td className="p-4 font-mono">Rp {(p.costPrice ?? 0).toLocaleString('id-ID')}</td>
                        <td className="p-4 font-bold font-mono text-slate-950">{p.stock} Item</td>
                        <td className="p-4 pr-6">
                          {p.stock <= p.minimumStock ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-150 px-2 py-0.5 text-[9px] font-bold text-rose-700">Gawat</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-150 px-2 py-0.5 text-[9px] font-bold text-emerald-700">Aman</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              {activeTab === 'purchases' && (
                <>
                  <thead className="bg-slate-50/70 text-[9px] font-bold uppercase text-slate-400 border-b border-slate-200 tracking-wider">
                    <tr>
                      <th className="p-4 pl-6">No Nota Kulakan</th>
                      <th className="p-4">Waktu Masuk</th>
                      <th className="p-4">Vendor Supplier</th>
                      <th className="p-4 pr-6">Total Pembayaran</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tableData.map((pu: any) => (
                      <tr key={pu.id} className="hover:bg-slate-50/45 transition-colors">
                        <td className="p-4 pl-6 font-mono font-bold text-slate-900">{pu.invoiceNumber}</td>
                        <td className="p-4 text-slate-500 font-medium">{new Date(pu.createdAt).toLocaleString('id-ID')}</td>
                        <td className="p-4 text-slate-800">{pu.supplier?.name}</td>
                        <td className="p-4 pr-6 font-bold font-mono text-slate-950">Rp {(pu.total ?? 0).toLocaleString('id-ID')}</td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              {activeTab === 'stock' && (
                <>
                  <thead className="bg-slate-50/70 text-[9px] font-bold uppercase text-slate-400 border-b border-slate-200 tracking-wider">
                    <tr>
                      <th className="p-4 pl-6">Barang / SKU</th>
                      <th className="p-4">Waktu Koreksi</th>
                      <th className="p-4">Jenis Perubahan</th>
                      <th className="p-4">Kuantitas</th>
                      <th className="p-4 pr-6">Memo / Catatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tableData.map((st: any) => (
                      <tr key={st.id} className="hover:bg-slate-50/45 transition-colors">
                        <td className="p-4 pl-6">
                          <p className="font-extrabold text-slate-900">{st.product?.name}</p>
                          <p className="text-[10px] font-mono text-slate-400 mt-0.5">SKU: {st.product?.sku}</p>
                        </td>
                        <td className="p-4 text-slate-500 font-medium">{new Date(st.createdAt).toLocaleString('id-ID')}</td>
                        <td className="p-4">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${st.type === 'IN' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : st.type === 'OUT' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
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

              {activeTab === 'shifts' && (
                <>
                  <thead className="bg-slate-50/70 text-[9px] font-bold uppercase text-slate-400 border-b border-slate-200 tracking-wider">
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
                    {tableData.map((sh: any) => (
                      <tr key={sh.id} className="hover:bg-slate-50/45 transition-colors">
                        <td className="p-4 pl-6 font-bold text-slate-900">{sh.user?.name}</td>
                        <td className="p-4 text-slate-500 font-medium">{new Date(sh.createdAt).toLocaleString('id-ID')}</td>
                        <td className="p-4 font-mono">Rp {(sh.openingCash ?? 0).toLocaleString('id-ID')}</td>
                        <td className="p-4 font-mono">{sh.closingCash ? `Rp ${(sh.closingCash ?? 0).toLocaleString('id-ID')}` : '-'}</td>
                        <td className={`p-4 font-bold font-mono ${sh.difference < 0 ? 'text-rose-600' : sh.difference > 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
                          Rp {sh.difference?.toLocaleString('id-ID') ?? 0}
                        </td>
                        <td className="p-4 pr-6">
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${sh.status === 'OPEN' ? 'bg-emerald-50 text-emerald-700 border-emerald-150' : 'bg-slate-100 text-slate-500 border-slate-250/70'}`}>
                            {sh.status}
                          </span>
                        </td>
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

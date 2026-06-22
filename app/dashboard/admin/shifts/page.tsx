'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import * as XLSX from 'xlsx'
import {
  KeyRound,
  Search,
  Store,
  ChevronDown,
  Loader2,
  Calendar,
  Clock,
  User,
  Coins,
  TrendingDown,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  FileSpreadsheet,
  RefreshCw,
  X
} from 'lucide-react'

type ShiftLog = {
  id: string
  storeId: string
  userId: string
  status: 'OPEN' | 'CLOSED'
  openingCash: number
  expectedCash?: number
  closingCash?: number
  difference?: number
  createdAt: string
  updatedAt: string
  closedAt?: string
  user?: { name: string }
}

type Cashier = {
  id: string
  name: string
}

type StoreType = {
  id: string
  name: string
}

export default function ShiftsPage() {
  const [shifts, setShifts] = useState<ShiftLog[]>([])
  const [cashiers, setCashiers] = useState<Cashier[]>([])
  const [stores, setStores] = useState<StoreType[]>([])
  const [selectedStoreId, setSelectedStoreId] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'CLOSED'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    initPage()
  }, [])

  useEffect(() => {
    if (selectedStoreId) {
      loadShifts(selectedStoreId)
      loadCashiers(selectedStoreId)
    }
  }, [selectedStoreId])

  async function initPage() {
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` }
      const { data } = await api.get('/stores', { headers })
      setStores(data)
      
      const cachedStoreId = localStorage.getItem('storeId')
      const initialStoreId = data.find((s: StoreType) => s.id === cachedStoreId)?.id || data[0]?.id || ''
      if (initialStoreId) {
        setSelectedStoreId(initialStoreId)
      } else {
        setLoading(false)
      }
    } catch (err) {
      console.error('Error loading stores:', err)
      setLoading(false)
    }
  }

  async function loadShifts(storeId: string, isRefresh = false) {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` }
      const { data } = await api.get(`/shifts/store/${storeId}`, { headers })
      setShifts(data || [])
    } catch (err) {
      console.error('Error loading shifts:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  async function loadCashiers(storeId: string) {
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` }
      const { data } = await api.get(`/cashier/store/${storeId}`, { headers })
      setCashiers(data || [])
    } catch (err) {
      console.error('Error loading cashiers:', err)
    }
  }

  function getCashierName(userId: string, shiftItem?: ShiftLog) {
    if (shiftItem?.user?.name) return shiftItem.user.name
    const found = cashiers.find(c => c.id === userId)
    return found ? found.name : `Kasir #${userId.slice(0, 4)}`
  }

  function formatTime(isoString: string) {
    if (!isoString) return '—'
    const date = new Date(isoString)
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  }

  function formatDate(isoString: string) {
    if (!isoString) return '—'
    const date = new Date(isoString)
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  function formatCurrency(n?: number) {
    if (n === undefined || n === null) return 'Rp 0'
    return `Rp ${n.toLocaleString('id-ID')}`
  }

  function handleExportExcel() {
    if (filteredShifts.length === 0) return alert('Tidak ada data shift untuk diekspor!')
    
    const formattedData = filteredShifts.map(s => {
      const cashierName = getCashierName(s.userId, s)
      const diff = s.status === 'CLOSED' ? (s.difference !== undefined ? s.difference : (s.closingCash || 0) - (s.expectedCash || 0)) : 0
      return {
        'ID Shift': s.id,
        'Kasir': cashierName,
        'Tanggal Mulai': formatDate(s.createdAt),
        'Jam Mulai': formatTime(s.createdAt),
        'Tanggal Selesai': s.status === 'CLOSED' ? formatDate(s.updatedAt || s.closedAt || '') : 'Aktif',
        'Jam Selesai': s.status === 'CLOSED' ? formatTime(s.updatedAt || s.closedAt || '') : 'Aktif',
        'Modal Awal (Rp)': s.openingCash,
        'Ekspektasi Uang (Rp)': s.expectedCash || 0,
        'Uang Fisik Aktual (Rp)': s.closingCash || 0,
        'Selisih (Rp)': diff,
        'Status': s.status === 'OPEN' ? 'Berjalan (OPEN)' : 'Selesai (CLOSED)'
      }
    })

    const worksheet = XLSX.utils.json_to_sheet(formattedData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Shift History')
    
    // Auto-fit column widths
    const maxLens = Object.keys(formattedData[0]).map(key => {
      const lengths = formattedData.map(row => String((row as any)[key] || '').length)
      lengths.push(key.length)
      return { wch: Math.max(...lengths) + 2 }
    })
    worksheet['!cols'] = maxLens

    XLSX.writeFile(workbook, `Laporan_Shift_Kasir_${Date.now()}.xlsx`)
  }

  const filteredShifts = shifts
    .filter(s => {
      const cashierName = getCashierName(s.userId, s).toLowerCase()
      const matchesSearch = cashierName.includes(searchQuery.toLowerCase()) || s.id.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter
      return matchesSearch && matchesStatus
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  // KPI Calculations
  const activeShiftsCount = shifts.filter(s => s.status === 'OPEN').length
  
  const closedShifts = shifts.filter(s => s.status === 'CLOSED')
  const totalDiscrepancy = closedShifts.reduce((acc, s) => {
    const diff = s.difference !== undefined ? s.difference : (s.closingCash || 0) - (s.expectedCash || 0)
    return acc + diff
  }, 0)

  const accurateShiftsCount = closedShifts.filter(s => {
    const diff = s.difference !== undefined ? s.difference : (s.closingCash || 0) - (s.expectedCash || 0)
    return diff === 0
  }).length

  const accuracyRate = closedShifts.length > 0 
    ? Math.round((accurateShiftsCount / closedShifts.length) * 100)
    : 100

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 bg-indigo-50 border border-indigo-100/50 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
            <KeyRound size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900">Shift & Rekonsiliasi Kasir</h1>
              {!loading && (
                <span className="rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 px-2 py-0.5 text-[10px] font-extrabold tracking-wide">
                  {shifts.length}
                </span>
              )}
            </div>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">Pantau log shift, modal awal, ekspektasi laci, dan selisih uang fisik kasir secara real-time</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => loadShifts(selectedStoreId, true)}
            disabled={loading || refreshing}
            className="flex items-center justify-center h-10 w-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <button 
            onClick={handleExportExcel}
            className="flex items-center justify-center gap-2 h-10 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 px-4 text-xs font-bold text-emerald-700 transition-all active:scale-97 cursor-pointer"
          >
            <FileSpreadsheet size={15} />
            <span>Ekspor Excel</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Card 1: Active Shifts */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-3xs flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <Clock size={22} className="animate-pulse" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Shift Berjalan (Aktif)</p>
            <p className="text-xl font-black text-slate-900 mt-1">{activeShiftsCount} Kasir</p>
            <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Sesi kasir aktif di toko saat ini</p>
          </div>
        </div>

        {/* Card 2: Cumulative Discrepancy */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-3xs flex items-center gap-4">
          <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 border ${
            totalDiscrepancy === 0 
              ? 'bg-emerald-50 border-emerald-100 text-emerald-600' 
              : totalDiscrepancy < 0 
                ? 'bg-rose-50 border-rose-100 text-rose-600' 
                : 'bg-amber-50 border-amber-100 text-amber-600'
          }`}>
            {totalDiscrepancy >= 0 ? <TrendingUp size={22} /> : <TrendingDown size={22} />}
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Selisih Laci (Net)</p>
            <p className={`text-xl font-black mt-1 ${
              totalDiscrepancy === 0 
                ? 'text-slate-800' 
                : totalDiscrepancy < 0 
                  ? 'text-rose-600' 
                  : 'text-amber-600'
            }`}>
              {totalDiscrepancy === 0 ? 'Sesuai (Rp 0)' : totalDiscrepancy > 0 ? `+Rp ${totalDiscrepancy.toLocaleString('id-ID')}` : `-Rp ${Math.abs(totalDiscrepancy).toLocaleString('id-ID')}`}
            </p>
            <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Akumulasi selisih dari semua shift tutup</p>
          </div>
        </div>

        {/* Card 3: Reconciliation Accuracy */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-3xs flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <CheckCircle size={22} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Rasio Kecocokan Uang</p>
            <p className="text-xl font-black text-slate-900 mt-1">{accuracyRate}% Akurat</p>
            <p className="text-[10px] font-semibold text-slate-400 mt-0.5">{accurateShiftsCount} dari {closedShifts.length} shift tutup tanpa selisih</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari berdasarkan kasir..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200/80 pl-11 pr-11 py-3.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-semibold"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Filter Status */}
        <div className="flex gap-2">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-4 py-3 rounded-xl text-xs font-bold transition-all border ${
              statusFilter === 'ALL'
                ? 'bg-slate-900 border-slate-900 text-white shadow-3xs'
                : 'bg-white border-slate-200/80 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Semua
          </button>
          <button
            onClick={() => setStatusFilter('OPEN')}
            className={`px-4 py-3 rounded-xl text-xs font-bold transition-all border ${
              statusFilter === 'OPEN'
                ? 'bg-blue-600 border-blue-600 text-white shadow-3xs'
                : 'bg-white border-slate-200/80 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Aktif
          </button>
          <button
            onClick={() => setStatusFilter('CLOSED')}
            className={`px-4 py-3 rounded-xl text-xs font-bold transition-all border ${
              statusFilter === 'CLOSED'
                ? 'bg-emerald-600 border-emerald-600 text-white shadow-3xs'
                : 'bg-white border-slate-200/80 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Selesai
          </button>
        </div>

        {/* Outlet Switcher */}
        <div className="relative shrink-0 w-full sm:w-60">
          <select 
            value={selectedStoreId} 
            onChange={e => {
              setSelectedStoreId(e.target.value)
              localStorage.setItem('storeId', e.target.value)
            }}
            className="w-full appearance-none bg-white border border-slate-200/80 pl-4 pr-10 py-3.5 rounded-xl text-xs font-bold text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 cursor-pointer transition-all"
          >
            {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Main Table Card */}
      <div className="rounded-2xl border border-slate-200/70 bg-white shadow-3xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                <th className="p-4 pl-6 w-52">Nama Kasir</th>
                <th className="p-4 w-40">Mulai Shift</th>
                <th className="p-4 w-40">Tutup Shift</th>
                <th className="p-4 w-28 text-right">Modal Awal</th>
                <th className="p-4 w-32 text-right">Ekspektasi Kas</th>
                <th className="p-4 w-32 text-right">Fisik Kas</th>
                <th className="p-4 w-32 text-right">Selisih</th>
                <th className="p-4 pr-6 w-24 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600 font-semibold">
              {loading ? (
                [1, 2, 3, 4].map(i => (
                  <tr key={i}>
                    <td colSpan={8} className="p-5 pl-6">
                      <div className="h-4 animate-pulse rounded-lg bg-slate-100" style={{ width: `${70 + i * 5}%` }} />
                    </td>
                  </tr>
                ))
              ) : filteredShifts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-20 text-center text-slate-400">
                    <Clock size={36} className="mx-auto text-slate-350 opacity-60 mb-3" />
                    <p className="text-xs font-bold text-slate-500">
                      Tidak ada log shift ditemukan
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {searchQuery || statusFilter !== 'ALL' 
                        ? 'Coba ubah filter status atau nama pencarian Anda' 
                        : 'Belum ada staf kasir yang pernah membuka shift di outlet ini'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredShifts.map(s => {
                  const diffVal = s.status === 'CLOSED' 
                    ? (s.difference !== undefined ? s.difference : (s.closingCash || 0) - (s.expectedCash || 0)) 
                    : 0
                  
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/45 transition-colors">
                      {/* Cashier profile */}
                      <td className="p-4 pl-6">
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center border shrink-0 bg-slate-50 border-slate-200 text-slate-500`}>
                            <User size={13} />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-extrabold text-slate-900 text-xs leading-snug">{getCashierName(s.userId, s)}</span>
                            <span className="text-[8.5px] font-bold text-slate-400 tracking-wider font-mono select-all">ID: {s.id.slice(-6).toUpperCase()}</span>
                          </div>
                        </div>
                      </td>

                      {/* Started at */}
                      <td className="p-4">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1 text-slate-700">
                            <Calendar size={11} className="text-slate-400" />
                            <span>{formatDate(s.createdAt)}</span>
                          </div>
                          <div className="flex items-center gap-1 text-slate-400 text-[10px]">
                            <Clock size={11} />
                            <span>{formatTime(s.createdAt)} WIB</span>
                          </div>
                        </div>
                      </td>

                      {/* Closed at */}
                      <td className="p-4">
                        {s.status === 'CLOSED' ? (
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1 text-slate-700">
                              <Calendar size={11} className="text-slate-400" />
                              <span>{formatDate(s.updatedAt || s.closedAt || '')}</span>
                            </div>
                            <div className="flex items-center gap-1 text-slate-400 text-[10px]">
                              <Clock size={11} />
                              <span>{formatTime(s.updatedAt || s.closedAt || '')} WIB</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-blue-600 font-extrabold text-[10px] tracking-wide animate-pulse">BERJALAN (SEKARANG)</span>
                        )}
                      </td>

                      {/* Opening Cash */}
                      <td className="p-4 text-right font-mono font-bold text-slate-800 text-xs">
                        {formatCurrency(s.openingCash)}
                      </td>

                      {/* Expected Cash */}
                      <td className="p-4 text-right font-mono font-bold text-slate-800 text-xs">
                        {s.status === 'CLOSED' ? formatCurrency(s.expectedCash) : '—'}
                      </td>

                      {/* Closing Cash */}
                      <td className="p-4 text-right font-mono font-bold text-slate-800 text-xs">
                        {s.status === 'CLOSED' ? formatCurrency(s.closingCash) : '—'}
                      </td>

                      {/* Discrepancy (Selisih) */}
                      <td className="p-4 text-right">
                        {s.status === 'CLOSED' ? (
                          diffVal === 0 ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 font-mono font-bold text-xs">
                              <CheckCircle size={11} />
                              <span>Rp 0</span>
                            </span>
                          ) : diffVal > 0 ? (
                            <span className="inline-flex items-center gap-1 text-amber-600 font-mono font-bold text-xs" title="Kelebihan uang laci">
                              <TrendingUp size={11} />
                              <span>+{formatCurrency(diffVal).replace('Rp ', '')}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-rose-600 font-mono font-bold text-xs" title="Kekurangan uang laci">
                              <TrendingDown size={11} />
                              <span>-{formatCurrency(Math.abs(diffVal)).replace('Rp ', '')}</span>
                            </span>
                          )
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="p-4 text-center pr-6">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-bold border text-[9px] uppercase tracking-wider ${
                          s.status === 'OPEN'
                            ? 'bg-blue-50 border-blue-200 text-blue-700 animate-pulse'
                            : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        }`}>
                          {s.status === 'OPEN' ? 'Aktif' : 'Tutup'}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!loading && filteredShifts.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-[10.5px] font-bold text-slate-400 mt-2">
          <span>Menampilkan {filteredShifts.length} dari {shifts.length} shift terdaftar</span>
          <span>Sistem sinkron otomatis ke pusat</span>
        </div>
      )}
    </div>
  )
}

'use client'

import { useEffect, useState, useMemo } from 'react'
import { api } from '@/lib/api'
import {
  Coins,
  Calendar,
  Store,
  Loader2,
  ChevronDown,
  User,
  Clock,
  Calculator,
  AlertCircle,
  FileText,
  CheckCircle2,
  Receipt,
  UserCheck,
  Coins as CoinsIcon,
  Percent,
  Banknote
} from 'lucide-react'

type StoreType = {
  id: string
  name: string
}

type CashierType = {
  id: string
  name: string
  phone: string | null
  isActive: boolean
}

type AttendanceType = {
  id: string
  userId: string
  clockIn: string
  clockOut: string | null
  user: {
    name: string
  }
}

type TransactionType = {
  id: string
  invoiceNumber: string
  cashierId: string
  total: number
  status: string
  createdAt: string
  cashier: {
    name: string
  }
}

export default function SalariesPage() {
  const [stores, setStores] = useState<StoreType[]>([])
  const [cashiers, setCashiers] = useState<CashierType[]>([])
  const [selectedStoreId, setSelectedStoreId] = useState('')
  const [selectedCashierId, setSelectedCashierId] = useState('')
  
  // Date range defaults to first day of current month to today
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Configurations
  const [hourlyWage, setHourlyWage] = useState<number>(15000)
  const [commissionRate, setCommissionRate] = useState<number>(1)
  const [transactionBonus, setTransactionBonus] = useState<number>(1000)

  // Loading States
  const [loadingStores, setLoadingStores] = useState(true)
  const [loadingData, setLoadingData] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Raw Data lists
  const [allAttendances, setAllAttendances] = useState<AttendanceType[]>([])
  const [allTransactions, setAllTransactions] = useState<TransactionType[]>([])

  useEffect(() => {
    // Initialize default dates
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    setStartDate(`${year}-${month}-01`)
    setEndDate(now.toISOString().split('T')[0])

    initPage()
  }, [])

  useEffect(() => {
    if (selectedStoreId) {
      loadStoreData(selectedStoreId)
    }
  }, [selectedStoreId])

  async function initPage() {
    setLoadingStores(true)
    try {
      const token = localStorage.getItem('token')
      const headers = { Authorization: `Bearer ${token}` }
      const res = await api.get('/stores', { headers })
      setStores(res.data)

      const cachedStoreId = localStorage.getItem('storeId')
      const initialStoreId = res.data.find((s: StoreType) => s.id === cachedStoreId)?.id || res.data[0]?.id || ''
      if (initialStoreId) {
        setSelectedStoreId(initialStoreId)
      } else {
        setLoadingStores(false)
      }
    } catch (err) {
      console.error('Gagal memuat daftar toko:', err)
      setLoadingStores(false)
    }
  }

  async function loadStoreData(storeId: string) {
    setLoadingData(true)
    setSelectedCashierId('')
    try {
      const token = localStorage.getItem('token')
      const headers = { Authorization: `Bearer ${token}` }

      // 1. Fetch cashiers for the store
      const cashiersRes = await api.get(`/cashier/store/${storeId}`, { headers })
      setCashiers(cashiersRes.data || [])
      if (cashiersRes.data?.length > 0) {
        setSelectedCashierId(cashiersRes.data[0].id)
      }

      // 2. Fetch all attendance logs for the store
      const attendanceRes = await api.get(`/attendance/store/${storeId}`, { headers })
      setAllAttendances(attendanceRes.data || [])

      // 3. Fetch all transactions for the store
      const transactionsRes = await api.get(`/transactions/store/${storeId}`, { headers })
      setAllTransactions(transactionsRes.data || [])

    } catch (err) {
      console.error('Gagal memuat data outlet:', err)
    } finally {
      setLoadingData(false)
      setLoadingStores(false)
    }
  }

  // Filter and compute attendance data for the selected cashier & date range
  const filteredAttendances = useMemo(() => {
    if (!selectedCashierId || !startDate || !endDate) return []
    return allAttendances.filter(att => {
      if (att.userId !== selectedCashierId) return false
      const attDate = att.clockIn.split('T')[0]
      return attDate >= startDate && attDate <= endDate
    })
  }, [allAttendances, selectedCashierId, startDate, endDate])

  const attendanceMetrics = useMemo(() => {
    let totalMs = 0
    let completedShifts = 0
    let activeShifts = 0

    filteredAttendances.forEach(att => {
      if (att.clockIn) {
        const start = new Date(att.clockIn).getTime()
        const end = att.clockOut ? new Date(att.clockOut).getTime() : new Date().getTime()
        if (end > start) {
          totalMs += (end - start)
        }
        if (att.clockOut) {
          completedShifts++
        } else {
          activeShifts++
        }
      }
    })

    const totalHours = totalMs / 3600000
    return {
      totalHours: Number(totalHours.toFixed(1)),
      completedShifts,
      activeShifts,
      totalShifts: filteredAttendances.length
    }
  }, [filteredAttendances])

  // Filter and compute transactions data for the selected cashier & date range
  const filteredTransactions = useMemo(() => {
    if (!selectedCashierId || !startDate || !endDate) return []
    return allTransactions.filter(trx => {
      if (trx.cashierId !== selectedCashierId) return false
      if (trx.status !== 'PAID') return false
      const trxDate = trx.createdAt.split('T')[0]
      return trxDate >= startDate && trxDate <= endDate
    })
  }, [allTransactions, selectedCashierId, startDate, endDate])

  const transactionMetrics = useMemo(() => {
    const totalSales = filteredTransactions.reduce((sum, trx) => sum + trx.total, 0)
    return {
      count: filteredTransactions.length,
      totalSales
    }
  }, [filteredTransactions])

  // Salary breakdown calculations
  const salaryBreakdown = useMemo(() => {
    const baseSalary = Math.round(attendanceMetrics.totalHours * hourlyWage)
    const salesCommission = Math.round(transactionMetrics.totalSales * (commissionRate / 100))
    const transBonus = transactionMetrics.count * transactionBonus
    const grandTotal = baseSalary + salesCommission + transBonus

    return {
      baseSalary,
      salesCommission,
      transBonus,
      grandTotal
    }
  }, [attendanceMetrics, transactionMetrics, hourlyWage, commissionRate, transactionBonus])

  // Save the salary payout as an operational expense
  async function handleRecordExpense() {
    if (salaryBreakdown.grandTotal <= 0) {
      alert('Total nominal gaji yang dihitung bernilai Rp 0 atau kurang. Tidak dapat menyimpan.')
      return
    }

    const cashierName = cashiers.find(c => c.id === selectedCashierId)?.name || 'Staf'
    const title = `Gaji Staf: ${cashierName} (${startDate} s/d ${endDate})`

    if (!confirm(`Apakah Anda yakin ingin menyimpan pengeluaran gaji ini?\n\nJudul: ${title}\nNominal: Rp ${salaryBreakdown.grandTotal.toLocaleString('id-ID')}`)) {
      return
    }

    setIsSubmitting(true)
    try {
      const token = localStorage.getItem('token')
      const headers = { Authorization: `Bearer ${token}` }
      await api.post('/expenses', {
        storeId: selectedStoreId,
        title: title.trim(),
        amount: salaryBreakdown.grandTotal,
        category: 'SALARY'
      }, { headers })

      alert('Gaji staf berhasil dihitung dan dicatat sebagai pengeluaran operasional outlet!')
    } catch (err: any) {
      console.error(err)
      const serverMessage = err.response?.data?.message
      alert(`Gagal mencatat pengeluaran gaji: ${Array.isArray(serverMessage) ? serverMessage.join(', ') : serverMessage || err.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatIDR = (num: number) => `Rp ${num.toLocaleString('id-ID')}`
  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return d.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
  }

  if (loadingStores) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-2">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-xs font-bold text-slate-500">Memuat kalkulator gaji...</p>
      </div>
    )
  }

  if (stores.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50/70 text-amber-600 border border-amber-200/50 shadow-sm mb-4">
          <Store className="w-8 h-8" />
        </div>
        <h3 className="text-sm font-black text-slate-900 mb-2">Belum Ada Toko Terdaftar</h3>
        <p className="text-xs text-slate-400 max-w-sm mb-6">
          Anda perlu mendaftarkan setidaknya satu cabang toko terlebih dahulu sebelum dapat mengakses kalkulator gaji karyawan.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 bg-indigo-50 border border-indigo-100/55 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
            <Coins size={20} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Kalkulator Gaji Staf</h1>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">
              Hitung kompensasi gaji kasir & staf secara otomatis berdasarkan durasi jam kerja, jumlah nota transaksi, dan omset penjualan.
            </p>
          </div>
        </div>
      </div>

      {/* Select Filters Panel */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs space-y-4">
        <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">Parameter Audit Kinerja</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {/* Store select */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Cabang Toko / Outlet</label>
            <div className="relative">
              <select
                value={selectedStoreId}
                onChange={e => setSelectedStoreId(e.target.value)}
                className="w-full appearance-none bg-white border border-slate-250/70 pl-4 pr-10 py-3 rounded-xl text-xs font-bold text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 cursor-pointer transition-all shadow-3xs"
              >
                {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Cashier select */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Pilih Staf Kasir</label>
            <div className="relative">
              <select
                value={selectedCashierId}
                onChange={e => setSelectedCashierId(e.target.value)}
                disabled={loadingData || cashiers.length === 0}
                className="w-full appearance-none bg-white border border-slate-250/70 pl-4 pr-10 py-3 rounded-xl text-xs font-bold text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 cursor-pointer transition-all shadow-3xs disabled:opacity-50"
              >
                {cashiers.length === 0 ? (
                  <option value="">Tidak ada staf terdaftar</option>
                ) : (
                  cashiers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                )}
              </select>
              <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Start date */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Tanggal Mulai</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full border border-slate-250/70 bg-white rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 focus:border-indigo-500 focus:outline-none shadow-3xs"
            />
          </div>

          {/* End date */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Tanggal Selesai</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full border border-slate-250/70 bg-white rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 focus:border-indigo-500 focus:outline-none shadow-3xs"
            />
          </div>
        </div>
      </div>

      {loadingData ? (
        <div className="py-16 flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          <p className="text-xs font-bold text-slate-500">Menganalisis hasil kerja staf...</p>
        </div>
      ) : !selectedCashierId ? (
        <div className="bg-amber-50 border border-amber-250 rounded-2xl p-5 text-amber-800 flex items-start gap-3 shadow-3xs">
          <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={16} />
          <div>
            <h3 className="text-xs font-black">Staf Kasir Tidak Ditemukan</h3>
            <p className="text-xs font-semibold text-amber-700/95 mt-1">
              Outlet yang dipilih belum memiliki staf kasir yang terdaftar. Daftarkan personel di menu manajemen kasir terlebih dahulu.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">
          {/* Main workspace */}
          <div className="space-y-6">
            
            {/* Rates Configuration Section */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Calculator size={15} className="text-indigo-600" />
                <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">Pengaturan Tarif Kompensasi</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {/* Hourly rate input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1">
                    <Clock size={11} className="text-slate-400" />
                    <span>Gaji Pokok Per Jam (Rp)</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={hourlyWage}
                    onChange={e => setHourlyWage(Number(e.target.value))}
                    className="w-full border border-slate-200/80 bg-slate-50/50 focus:bg-white rounded-xl px-4 py-3 text-xs font-mono font-bold text-slate-900 outline-none focus:border-indigo-500 transition-all shadow-3xs"
                  />
                </div>

                {/* Commission rate input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1">
                    <Percent size={11} className="text-slate-400" />
                    <span>Komisi Penjualan (%)</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={commissionRate}
                    onChange={e => setCommissionRate(Number(e.target.value))}
                    className="w-full border border-slate-200/80 bg-slate-50/50 focus:bg-white rounded-xl px-4 py-3 text-xs font-mono font-bold text-slate-900 outline-none focus:border-indigo-500 transition-all shadow-3xs"
                  />
                </div>

                {/* Bonus rate input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1">
                    <Banknote size={11} className="text-slate-400" />
                    <span>Insentif Per Nota (Rp)</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={transactionBonus}
                    onChange={e => setTransactionBonus(Number(e.target.value))}
                    className="w-full border border-slate-200/80 bg-slate-50/50 focus:bg-white rounded-xl px-4 py-3 text-xs font-mono font-bold text-slate-900 outline-none focus:border-indigo-500 transition-all shadow-3xs"
                  />
                </div>
              </div>
            </div>

            {/* Performance Results details */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs space-y-6">
              
              {/* Attendances Summary */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <UserCheck size={14} className="text-indigo-500" />
                    <span>Riwayat Kehadiran ({attendanceMetrics.totalShifts} Shift)</span>
                  </h3>
                  <span className="text-[10px] font-extrabold text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
                    Total Kerja: {attendanceMetrics.totalHours} Jam
                  </span>
                </div>
                
                <div className="max-h-56 overflow-y-auto overflow-x-auto border border-slate-100 rounded-2xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-150 text-slate-400 font-bold uppercase tracking-wider text-[8.5px]">
                        <th className="px-4 py-2">Mulai Clock-In</th>
                        <th className="px-4 py-2">Selesai Clock-Out</th>
                        <th className="px-4 py-2 text-right">Durasi Kerja</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-600 font-bold">
                      {filteredAttendances.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="text-center py-6 text-slate-400 font-medium">
                            Tidak ditemukan log absensi untuk staf ini pada rentang tanggal tersebut.
                          </td>
                        </tr>
                      ) : (
                        filteredAttendances.map(att => {
                          const start = new Date(att.clockIn).getTime()
                          const end = att.clockOut ? new Date(att.clockOut).getTime() : new Date().getTime()
                          const diffMs = end - start
                          const hrs = Math.floor(diffMs / 3600000)
                          const mins = Math.floor((diffMs % 3600000) / 60000)

                          return (
                            <tr key={att.id} className="hover:bg-slate-50/40">
                              <td className="px-4 py-2.5 font-mono text-slate-700">{formatDateTime(att.clockIn)}</td>
                              <td className="px-4 py-2.5 font-mono text-slate-700">
                                {att.clockOut ? formatDateTime(att.clockOut) : (
                                  <span className="text-emerald-600 font-black">Masih Aktif</span>
                                )}
                              </td>
                              <td className="px-4 py-2.5 text-right text-slate-500 font-normal">
                                {hrs} jam {mins} menit
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Transactions Summary */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Receipt size={14} className="text-indigo-500" />
                    <span>Performa Transaksi ({transactionMetrics.count} Nota)</span>
                  </h3>
                  <span className="text-[10px] font-extrabold text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
                    Total Omset: {formatIDR(transactionMetrics.totalSales)}
                  </span>
                </div>

                <div className="max-h-56 overflow-y-auto overflow-x-auto border border-slate-100 rounded-2xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-150 text-slate-400 font-bold uppercase tracking-wider text-[8.5px]">
                        <th className="px-4 py-2">Nomor Invoice</th>
                        <th className="px-4 py-2">Waktu Pembayaran</th>
                        <th className="px-4 py-2 text-right">Nilai Belanja</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-600 font-bold">
                      {filteredTransactions.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="text-center py-6 text-slate-400 font-medium">
                            Tidak ditemukan riwayat transaksi pembayaran kasir pada rentang tanggal tersebut.
                          </td>
                        </tr>
                      ) : (
                        filteredTransactions.map(trx => (
                          <tr key={trx.id} className="hover:bg-slate-50/40">
                            <td className="px-4 py-2.5 text-slate-900 font-extrabold">{trx.invoiceNumber}</td>
                            <td className="px-4 py-2.5 text-slate-500 font-medium">{formatDateTime(trx.createdAt)}</td>
                            <td className="px-4 py-2.5 text-right font-mono text-slate-950">{formatIDR(trx.total)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

          </div>

          {/* Sidebar calculations & Record payout card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs space-y-6 relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-blue-600 to-indigo-600" />
            
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-xs font-black text-slate-450 uppercase tracking-widest">Rincian Slip Gaji</h3>
              <p className="text-sm font-black text-slate-900 mt-1">
                {cashiers.find(c => c.id === selectedCashierId)?.name || 'Loading Staff...'}
              </p>
              <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1 mt-1">
                <span>{startDate}</span>
                <span className="text-slate-300">s/d</span>
                <span>{endDate}</span>
              </p>
            </div>

            {/* Calculations metrics breakdown */}
            <div className="space-y-3.5">
              
              {/* Base salary element */}
              <div className="flex justify-between items-start text-xs">
                <div>
                  <p className="font-extrabold text-slate-800">Gaji Pokok</p>
                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                    {attendanceMetrics.totalHours} jam × {formatIDR(hourlyWage)}
                  </p>
                </div>
                <span className="font-bold text-slate-900 font-mono">
                  {formatIDR(salaryBreakdown.baseSalary)}
                </span>
              </div>

              {/* Commission element */}
              <div className="flex justify-between items-start text-xs">
                <div>
                  <p className="font-extrabold text-slate-800">Komisi Penjualan</p>
                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                    {commissionRate}% dari {formatIDR(transactionMetrics.totalSales)}
                  </p>
                </div>
                <span className="font-bold text-slate-900 font-mono">
                  {formatIDR(salaryBreakdown.salesCommission)}
                </span>
              </div>

              {/* Transaction bonus element */}
              <div className="flex justify-between items-start text-xs">
                <div>
                  <p className="font-extrabold text-slate-800">Insentif Transaksi</p>
                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                    {transactionMetrics.count} nota × {formatIDR(transactionBonus)}
                  </p>
                </div>
                <span className="font-bold text-slate-900 font-mono">
                  {formatIDR(salaryBreakdown.transBonus)}
                </span>
              </div>

              {/* Divider */}
              <div className="h-px bg-slate-100 my-2" />

              {/* Grand total */}
              <div className="flex justify-between items-center bg-indigo-50/50 border border-indigo-100/50 p-4.5 rounded-2xl">
                <div>
                  <p className="text-[9px] font-black uppercase text-indigo-500 tracking-wider">Total Dibayarkan</p>
                  <p className="text-lg font-black text-slate-950 font-mono mt-1">
                    {formatIDR(salaryBreakdown.grandTotal)}
                  </p>
                </div>
              </div>
            </div>

            {/* Record as expense */}
            <button
              onClick={handleRecordExpense}
              disabled={isSubmitting || salaryBreakdown.grandTotal <= 0}
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-4 text-xs font-black text-white hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md shadow-indigo-500/10 cursor-pointer active:scale-97"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={14} />
                  <span>Mencatat Slip...</span>
                </>
              ) : (
                <>
                  <CoinsIcon size={14} />
                  <span>Simpan ke Pengeluaran Toko</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

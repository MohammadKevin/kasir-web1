'use client'

import { useEffect, useState, useMemo } from 'react'
import { api } from '@/lib/api'
import { 
  Receipt, 
  Search, 
  X, 
  Store, 
  Calendar, 
  CreditCard, 
  AlertTriangle,
  Eye,
  Printer,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  Loader2,
  Filter
} from 'lucide-react'

type TransactionItem = {
  id: string
  product: {
    name: string
    sku: string
  }
  quantity: number
  originalPrice: number
  masterDiscount?: number
  cashierDiscount?: number
  finalPrice: number
  subtotal: number
}

type Transaction = {
  id: string
  invoiceNumber: string
  subtotal: number
  totalDiscount: number
  total: number
  paidAmount: number
  changeAmount: number
  paymentMethod: 'CASH' | 'QRIS' | 'DEBIT'
  status: 'PENDING' | 'PAID' | 'CANCELLED' | 'REFUNDED'
  voidReason?: string
  cashier: {
    name: string
  }
  customer?: {
    name: string
  }
  items?: TransactionItem[]
  storeId?: string
  createdAt: string
}

type StoreType = {
  id: string
  name: string
  address?: string | null
  phone?: string | null
  email?: string | null
  receiptFooter?: string | null
}

const PAYMENT_METHOD_MAP: Record<string, string> = {
  CASH: 'Tunai',
  QRIS: 'QRIS',
  DEBIT: 'Debit'
}

const formatDate = (dateInput: string | Date) => {
  const d = new Date(dateInput)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const formatTime = (dateInput: string | Date) => {
  const d = new Date(dateInput)
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${hh}:${min}:${ss}`
}

const getReceiptUniqueCode = (invoice: string, createdAt: string | Date) => {
  const d = new Date(createdAt)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  
  let hash = 0
  if (invoice) {
    for (let i = 0; i < invoice.length; i++) {
      hash = (hash << 5) - hash + invoice.charCodeAt(i)
      hash |= 0
    }
  }
  const prefix = Math.abs(hash).toString().slice(0, 6).padEnd(6, '0')
  return `${prefix}${yyyy}${mm}${dd}${hh}${min}${ss}`
}

export default function TransactionAdminPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [stores, setStores] = useState<StoreType[]>([])
  const [selectedStoreId, setSelectedStoreId] = useState('')
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('ALL')
  const [dateFilter, setDateFilter] = useState('')

  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [isOpenDetail, setIsOpenDetail] = useState(false)
  const [isOpenVoidModal, setIsOpenVoidModal] = useState(false)
  const [voidId, setVoidId] = useState<string | null>(null)
  const [voidReason, setVoidReason] = useState('')
  const [isSubmittingVoid, setIsSubmittingVoid] = useState(false)

  useEffect(() => {
    initPage()
  }, [])

  useEffect(() => {
    if (selectedStoreId) {
      loadTransactions(selectedStoreId)
    }
  }, [selectedStoreId])

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
        setLoading(false)
      }
    } catch (error) {
      console.error('Gagal menginisialisasi riwayat transaksi:', error)
      setLoading(false)
    }
  }

  async function loadTransactions(storeId: string) {
    setLoading(true)
    try {
      const res = await api.get(`/transactions/store/${storeId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })
      setTransactions(res.data)
    } catch (error) {
      console.error('Gagal memuat transaksi:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleOpenDetail(id: string) {
    try {
      const res = await api.get(`/transactions/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })
      setSelectedTransaction(res.data)
      setIsOpenDetail(true)
    } catch (error) {
      alert('Gagal mengambil rincian detail transaksi')
    }
  }

  function handleOpenVoid(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    setVoidId(id)
    setVoidReason('')
    setIsOpenVoidModal(true)
  }

  async function handleConfirmVoid(e: React.FormEvent) {
    e.preventDefault()
    if (!voidReason.trim()) return alert('Alasan pembatalan (Void) wajib diisi!')

    setIsSubmittingVoid(true)
    try {
      await api.patch(`/transactions/${voidId}/void`, { reason: voidReason.trim() }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })
      setIsOpenVoidModal(false)
      if (isOpenDetail && selectedTransaction?.id === voidId) {
        setIsOpenDetail(false)
      }
      loadTransactions(selectedStoreId)
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Gagal membatalkan transaksi'
      alert(Array.isArray(msg) ? msg.join(', ') : msg)
    } finally {
      setIsSubmittingVoid(false)
    }
  }

  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch = t.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.cashier?.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter
    const matchesPayment = paymentMethodFilter === 'ALL' || t.paymentMethod === paymentMethodFilter
    
    let matchesDate = true
    if (dateFilter) {
      const txLocalDate = new Date(t.createdAt)
      const yyyy = txLocalDate.getFullYear()
      const mm = String(txLocalDate.getMonth() + 1).padStart(2, '0')
      const dd = String(txLocalDate.getDate()).padStart(2, '0')
      const txDateStr = `${yyyy}-${mm}-${dd}`
      
      if (txDateStr !== dateFilter) {
        matchesDate = false
      }
    }
    
    return matchesSearch && matchesStatus && matchesPayment && matchesDate
  })

  const totalPaymentAmount = useMemo(() => {
    return filteredTransactions.reduce((sum, t) => sum + t.total, 0)
  }, [filteredTransactions])

  const activeStoreName = stores.find((s) => s.id === selectedStoreId)?.name || 'Laila Collections'

  function getStatusBadge(status: string) {
    switch (status) {
      case 'PAID':
        return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-150 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700"><CheckCircle2 className="w-3 h-3"/>Lunas</span>
      case 'CANCELLED':
        return <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-150 px-2.5 py-0.5 text-[10px] font-bold text-rose-700"><XCircle className="w-3 h-3"/>Void</span>
      case 'PENDING':
        return <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-150 px-2.5 py-0.5 text-[10px] font-bold text-amber-700"><Clock className="w-3 h-3"/>Pending</span>
      default:
        return <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-[10px] font-bold text-slate-700">{status}</span>
    }
  }

  return (
    <div className="space-y-6">
      
      <style>{`
        @media print {
          @page {
            size: auto;
            margin: 0mm;
          }
          body * {
            visibility: hidden;
          }
          #receipt-print-content, #receipt-print-content * {
            visibility: visible;
          }
          #receipt-print-content {
            position: absolute;
            left: 50%;
            top: 0;
            transform: translateX(-50%);
            width: 100%;
            max-width: 210px;
            padding: 4px 6px;
            margin: 0;
            background: white !important;
            border: none !important;
            box-shadow: none !important;
          }
          #receipt-print-content * {
            color: black !important;
            background: transparent !important;
            border-color: black !important;
          }
          #receipt-print-items {
            max-height: none !important;
            overflow: visible !important;
          }
          aside, 
          header, 
          .print-hidden, 
          .print\:hidden {
            display: none !important;
          }
          main, 
          .flex-1 {
            padding: 0 !important;
            margin: 0 !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
          }
        }
      `}</style>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print-hidden">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 bg-indigo-50 border border-indigo-100/55 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
            <Receipt size={20} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Riwayat Transaksi POS</h1>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">Audit manifes penjualan, cetak ulang nota kasir digital, serta kontrol penuh pembatalan (Void) nota cabang.</p>
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

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print-hidden">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari nomor invoice nota atau nama kasir..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-250/70 bg-white pl-11 pr-11 py-3.5 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-3xs"
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

        <div className="flex items-center gap-3 shrink-0">
          {paymentMethodFilter !== 'ALL' && (
            <div className="bg-emerald-50 border border-emerald-150 text-emerald-700 px-3.5 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-3xs">
              <span className="text-[10px] text-emerald-500 uppercase tracking-wider font-bold">Total {PAYMENT_METHOD_MAP[paymentMethodFilter] || paymentMethodFilter}:</span>
              <span className="font-mono text-emerald-800">Rp {totalPaymentAmount.toLocaleString('id-ID')}</span>
            </div>
          )}

          <div className="flex border border-slate-200/80 rounded-xl p-1 bg-slate-50/50 shrink-0">
            {['ALL', 'PAID', 'CANCELLED', 'PENDING'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  statusFilter === status 
                    ? 'bg-indigo-600 text-white shadow-3xs' 
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {status === 'ALL' ? 'Semua' : status === 'PAID' ? 'Lunas' : status === 'CANCELLED' ? 'Void' : 'Pending'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50/60 p-4 rounded-2xl border border-slate-200/60 print-hidden">
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Metode Pembayaran</label>
          <div className="relative">
            <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <select
              value={paymentMethodFilter}
              onChange={(e) => setPaymentMethodFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 py-2.5 text-xs font-semibold text-slate-800 outline-none cursor-pointer appearance-none focus:border-indigo-500 transition-all"
            >
              <option value="ALL">Semua Metode</option>
              <option value="CASH">Cash / Tunai</option>
              <option value="QRIS">QRIS</option>
            </select>
            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          </div>
        </div>

        <div className="flex flex-col gap-1.5 md:col-span-2">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Waktu Transaksi</label>
          <div className="relative">
            <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500 transition-all"
            />
          </div>
        </div>

        <div className="flex items-end">
          <button
            onClick={() => {
              setPaymentMethodFilter('ALL')
              setDateFilter('')
              setSearchQuery('')
              setStatusFilter('ALL')
            }}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-all cursor-pointer shadow-3xs"
          >
            <X className="w-3.5 h-3.5" />
            Reset Filter
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-3xs overflow-hidden print-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                <th className="p-4 pl-6">Nomor Invoice</th>
                <th className="p-4">Waktu Transaksi</th>
                <th className="p-4">Operator Kasir</th>
                <th className="p-4">Metode Bayar</th>
                <th className="p-4">Total Belanja</th>
                <th className="p-4">Status</th>
                <th className="p-4 pr-6 text-right">Opsi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-600 font-semibold">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center">
                    <Loader2 className="w-5 h-5 animate-spin text-slate-400 mx-auto" />
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="p-3 bg-slate-50 border border-slate-150 rounded-2xl text-slate-400">
                        <Receipt className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-bold text-slate-500">Manifes transaksi tidak ditemukan</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="group hover:bg-slate-50/45 transition-colors cursor-pointer" onClick={() => handleOpenDetail(tx.id)}>
                    <td className="p-4 pl-6 font-mono font-bold text-slate-900">{tx.invoiceNumber}</td>
                    <td className="p-4 whitespace-nowrap text-slate-500 font-medium">
                      {new Date(tx.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                    </td>
                    <td className="p-4 whitespace-nowrap text-slate-700">{tx.cashier?.name}</td>
                    <td className="p-4 whitespace-nowrap">
                      <span className="font-extrabold text-[10px] text-slate-500 uppercase tracking-wide">
                        {PAYMENT_METHOD_MAP[tx.paymentMethod] || tx.paymentMethod}
                      </span>
                    </td>
                    <td className="p-4 whitespace-nowrap font-bold text-slate-900">
                      Rp {tx.total.toLocaleString('id-ID')}
                    </td>
                    <td className="p-4 whitespace-nowrap">{getStatusBadge(tx.status)}</td>
                    <td className="p-4 pr-6 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenDetail(tx.id)}
                          className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
                          title="Lihat Rincian Faktur"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {tx.status === 'PAID' && (
                          <button
                            onClick={(e) => handleOpenVoid(tx.id, e)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                            title="Batalkan Transaksi (Void)"
                          >
                            <AlertTriangle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isOpenDetail && selectedTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-all">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-150 bg-white p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-slate-500" />
                <h3 className="text-sm font-black text-slate-900">Rincian Faktur Nota</h3>
              </div>
              <button onClick={() => setIsOpenDetail(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div id="receipt-print-content" className="mt-4 p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 font-mono text-xs text-slate-700 space-y-3 print:p-0 print:border-none print:bg-white">
              {/* Store Icon */}
              <svg className="w-9 h-9 mx-auto text-slate-800" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21.9 8.89l-1.05-4.37c-.22-.9-1-1.52-1.91-1.52H5.05c-.9 0-1.69.63-1.9 1.52L2.1 8.89c-.24.97.26 1.96 1.2 2.32c.12.04.24.07.37.08v7.71c0 .99.81 1.8 1.8 1.8h13c.99 0 1.8-.81 1.8-1.8v-7.71c.13-.01.25-.04.37-.08c.95-.36 1.45-1.35 1.21-2.32zM13 18H8v-4h5v4z"/>
              </svg>

              {/* Store Header Info */}
              <div className="text-center space-y-0.5">
                <p className="font-bold text-xs text-slate-900 uppercase">{activeStoreName}</p>
                <p className="text-[8.5px] leading-snug">
                  {stores.find((s) => s.id === (selectedTransaction.storeId || selectedStoreId))?.address || 'Jl. Dr. Ir. H. Soekarno No.19, Medokan Semampir Surabaya'}
                </p>
                <p className="text-[8.5px]">
                  No. Telp {stores.find((s) => s.id === (selectedTransaction.storeId || selectedStoreId))?.phone || '0812345678'}
                </p>
                <p className="text-[8.5px] font-bold mt-1.5">{getReceiptUniqueCode(selectedTransaction.invoiceNumber, selectedTransaction.createdAt)}</p>
              </div>

              <div className="border-t border-dotted border-slate-400 my-1"></div>

              {/* Transaction Meta */}
              <div className="text-[8.5px] leading-tight flex justify-between">
                <div>
                  <p>{formatDate(selectedTransaction.createdAt)}</p>
                  <p>{formatTime(selectedTransaction.createdAt)}</p>
                  <p className="font-bold">No. {selectedTransaction.invoiceNumber}</p>
                </div>
                <div className="text-right">
                  <p>{stores.find((s) => s.id === (selectedTransaction.storeId || selectedStoreId))?.email ? (stores.find((s) => s.id === (selectedTransaction.storeId || selectedStoreId))?.email as string).split('@')[0] : 'karis'}</p>
                  <p>{selectedTransaction.cashier?.name}</p>
                  <p>
                    {stores.find((s) => s.id === (selectedTransaction.storeId || selectedStoreId))?.address?.split(',').slice(-1)[0]?.trim() || 'Sby'}
                  </p>
                </div>
              </div>

              <div className="border-t border-dashed border-slate-400 my-1"></div>

              {/* Items Block */}
              <div id="receipt-print-items" className="space-y-2">
                {selectedTransaction.items?.map((item) => {
                  const itemDiscount = ((item.masterDiscount || 0) + (item.cashierDiscount || 0)) * item.quantity
                  const itemTotal = item.originalPrice * item.quantity
                  return (
                    <div key={item.id} className="space-y-0.5 text-[9.5px]">
                      <p className="font-bold text-slate-900">{item.product?.name}</p>
                      <div className="flex justify-between pl-2.5 text-slate-600">
                        <span>{item.quantity} x {item.originalPrice.toLocaleString('id-ID')}</span>
                        <span className="font-semibold text-slate-800">Rp {itemTotal.toLocaleString('id-ID')}</span>
                      </div>
                      {itemDiscount > 0 && (
                        <div className="flex justify-between pl-2.5 text-rose-500 italic">
                          <span>Diskon Item</span>
                          <span>-Rp {itemDiscount.toLocaleString('id-ID')}</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="border-t border-dotted border-slate-400 my-1"></div>

              {/* Summary Block */}
              <div className="space-y-1 text-[9px] text-slate-600 border-t border-dashed border-slate-200 pt-2">
                <div className="flex justify-between"><span>Total QTY : {selectedTransaction.items?.reduce((s, i) => s + i.quantity, 0)}</span></div>
                <div className="flex justify-between"><span>Sub Total</span><span>Rp {selectedTransaction.subtotal.toLocaleString('id-ID')}</span></div>
                <div className="flex justify-between"><span>Diskon</span><span>Rp {selectedTransaction.totalDiscount.toLocaleString('id-ID')}</span></div>
                <div className="flex justify-between font-bold text-slate-950 text-xs border-t border-dashed border-slate-350 pt-1.5">
                  <span>Total</span><span>Rp {selectedTransaction.total.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between"><span>Bayar ({PAYMENT_METHOD_MAP[selectedTransaction.paymentMethod] || selectedTransaction.paymentMethod})</span><span>Rp {selectedTransaction.paidAmount.toLocaleString('id-ID')}</span></div>
                <div className="flex justify-between font-bold text-slate-950"><span>Kembali</span><span>Rp {selectedTransaction.changeAmount.toLocaleString('id-ID')}</span></div>
              </div>

              <div className="border-t border-dotted border-slate-400 my-1"></div>

              {/* Footer Block */}
              <div className="text-center space-y-0.5 text-[8px] font-bold text-slate-900 pt-1">
                <p>
                  {stores.find((s) => s.id === (selectedTransaction.storeId || selectedStoreId))?.receiptFooter || 'Terimakasih Telah Berbelanja'}
                </p>
                <div className="w-24 h-4 bg-slate-200 mx-auto mt-2 print:border print:border-slate-300"></div>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-5">
              <button 
                onClick={() => window.print()}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50 cursor-pointer transition-all active:scale-97"
              >
                <Printer className="w-3.5 h-3.5" /> Cetak Ulang
              </button>
              {selectedTransaction.status === 'PAID' && (
                <button 
                  onClick={(e) => handleOpenVoid(selectedTransaction.id, e)}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-rose-700 cursor-pointer transition-all active:scale-97"
                >
                  Void Nota
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {isOpenVoidModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-all">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-slate-150 bg-white p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2 bg-rose-50 rounded-xl border border-rose-100 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">Otorisasi Void Transaksi</h3>
                <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Konfirmasi pembatalan nota invoice kasir.</p>
              </div>
            </div>

            <form onSubmit={handleConfirmVoid} className="mt-4 space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Alasan Pembatalan Nota</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Contoh: Salah input kuantitas barang / Konsumen membatalkan transaksi belanja."
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-200/80 bg-slate-50/50 px-3 py-2 text-xs font-semibold outline-none transition-all resize-none focus:border-rose-500 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  disabled={isSubmittingVoid}
                  onClick={() => setIsOpenVoidModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingVoid}
                  className="rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-rose-700 transition-all disabled:opacity-40 cursor-pointer"
                >
                  {isSubmittingVoid ? 'Memproses...' : 'Ya, Void Nota'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}

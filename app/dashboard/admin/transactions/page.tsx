'use client'

import { useEffect, useState } from 'react'
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
  User
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
  paymentMethod: 'CASH' | 'QRIS' | 'TRANSFER' | 'DEBIT' | 'CREDIT'
  status: 'PENDING' | 'PAID' | 'CANCELLED' | 'REFUNDED'
  voidReason?: string
  cashier: {
    name: string
  }
  customer?: {
    name: string
  }
  items?: TransactionItem[]
  createdAt: string
}

type StoreType = {
  id: string
  name: string
}

export default function TransactionAdminPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [stores, setStores] = useState<StoreType[]>([])
  const [selectedStoreId, setSelectedStoreId] = useState('')
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  // State Detail Modal & Void Modal
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
    e.stopPropagation() // Mencegah modal detail terbuka otomatis
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
    return matchesSearch && matchesStatus
  })

  function getStatusBadge(status: string) {
    switch (status) {
      case 'PAID':
        return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-semibold text-emerald-700"><CheckCircle2 className="w-3 h-3"/>Lunas</span>
      case 'CANCELLED':
        return <span className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-200 px-2.5 py-0.5 text-xs font-semibold text-red-700"><XCircle className="w-3 h-3"/>Void (Batal)</span>
      case 'PENDING':
        return <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-semibold text-amber-700"><Clock className="w-3 h-3"/>Pending</span>
      default:
        return <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-700">{status}</span>
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Riwayat Transaksi POS</h1>
          <p className="text-sm text-slate-500 mt-1">Audit manifes penjualan, cetak ulang nota kasir digital, serta kontrol penuh pembatalan (Void) nota cabang.</p>
        </div>

        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm self-start sm:self-auto">
          <Store className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Toko:</span>
          <select
            value={selectedStoreId}
            onChange={(e) => {
              setSelectedStoreId(e.target.value)
              localStorage.setItem('storeId', e.target.value)
            }}
            className="bg-transparent text-sm font-semibold text-slate-800 outline-none pr-2 cursor-pointer"
          >
            {stores.map((store) => (
              <option key={store.id} value={store.id}>{store.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nomor invoice nota atau nama kasir..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 py-3 text-sm outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-sm"
          />
        </div>

        <div className="flex border border-slate-200 rounded-xl p-1 bg-slate-50 self-start sm:self-auto shadow-sm">
          {['ALL', 'PAID', 'CANCELLED', 'PENDING'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                statusFilter === status 
                  ? 'bg-blue-600 text-white shadow-xs border border-blue-600' 
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {status === 'ALL' ? 'Semua' : status === 'PAID' ? 'Lunas' : status === 'CANCELLED' ? 'Void' : 'Pending'}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm text-slate-600">
            <thead className="bg-slate-50/70 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-100">
              <tr>
                <th scope="col" className="px-6 py-4">Nomor Invoice</th>
                <th scope="col" className="px-6 py-4">Waktu Transaksi</th>
                <th scope="col" className="px-6 py-4">Operator Kasir</th>
                <th scope="col" className="px-6 py-4">Metode Bayar</th>
                <th scope="col" className="px-6 py-4">Total Belanja</th>
                <th scope="col" className="px-6 py-4">Status</th>
                <th scope="col" className="px-6 py-4 text-right">Opsi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-slate-400">
                        <Receipt className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-medium text-slate-600">Manifes transaksi tidak ditemukan</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="transition-colors hover:bg-slate-50/50 group cursor-pointer" onClick={() => handleOpenDetail(tx.id)}>
                    <td className="px-6 py-4 font-mono font-bold text-slate-900">{tx.invoiceNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-500">
                      <div className="flex items-center gap-1.5 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(tx.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-700">{tx.cashier?.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-slate-500">
                        <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                        {tx.paymentMethod}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-900">
                      Rp {tx.total.toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(tx.status)}</td>
                    <td className="px-6 py-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenDetail(tx.id)}
                          className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
                          title="Lihat Struktur Nota"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {tx.status === 'PAID' && (
                          <button
                            onClick={(e) => handleOpenVoid(tx.id, e)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-100 bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-slate-500" />
                <h3 className="text-base font-bold text-slate-900">Rincian Faktur Nota Kasir</h3>
              </div>
              <button onClick={() => setIsOpenDetail(false)} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 p-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 font-mono text-xs text-slate-700 space-y-3">
              <div className="text-center border-b border-dashed border-slate-200 pb-2">
                <p className="font-bold text-sm text-slate-900 uppercase">NOTA DIGITAL POS</p>
                <p className="text-[10px] text-slate-400 mt-0.5">ID: {selectedTransaction.invoiceNumber}</p>
              </div>

              <div className="space-y-1 text-slate-500">
                <p><span className="font-semibold text-slate-700">Waktu :</span> {new Date(selectedTransaction.createdAt).toLocaleString('id-ID')}</p>
                <p><span className="font-semibold text-slate-700">Kasir :</span> {selectedTransaction.cashier?.name}</p>
                <p><span className="font-semibold text-slate-700">Member:</span> {selectedTransaction.customer?.name || 'Non-Member'}</p>
              </div>

              <div className="border-t border-b border-dashed border-slate-200 py-2.5 space-y-2.5 max-h-[200px] overflow-y-auto pr-1">
                {selectedTransaction.items?.map((item) => {
                  const itemDiscount = ((item.masterDiscount || 0) + (item.cashierDiscount || 0)) * item.quantity
                  return (
                    <div key={item.id} className="space-y-0.5">
                      <div className="flex justify-between items-start gap-4">
                        <span className="font-bold text-slate-850 dark:text-slate-200 text-[11px]">{item.product?.name}</span>
                        <span className="font-bold text-slate-850 dark:text-slate-200 shrink-0">Rp {(item.originalPrice * item.quantity).toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 pl-3">
                        <span>{item.quantity} x Rp {item.originalPrice.toLocaleString('id-ID')}</span>
                        {itemDiscount > 0 && <span className="text-red-500 font-medium">- Rp {itemDiscount.toLocaleString('id-ID')}</span>}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="space-y-1.5 text-slate-600">
                <div className="flex justify-between"><span>Subtotal:</span><span>Rp {selectedTransaction.subtotal.toLocaleString('id-ID')}</span></div>
                <div className="flex justify-between text-red-600"><span>Diskon:</span><span>-Rp {selectedTransaction.totalDiscount.toLocaleString('id-ID')}</span></div>
                <div className="flex justify-between font-bold text-slate-900 text-sm border-t border-dashed border-slate-200 pt-1.5">
                  <span>TOTAL JUAL:</span><span>Rp {selectedTransaction.total.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between"><span>Tunai/Bayar:</span><span>Rp {selectedTransaction.paidAmount.toLocaleString('id-ID')}</span></div>
                <div className="flex justify-between font-bold text-slate-900"><span>Kembalian:</span><span>Rp {selectedTransaction.changeAmount.toLocaleString('id-ID')}</span></div>
              </div>

              <div className="text-center pt-2 border-t border-dashed border-slate-200">
                <p className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Metode: {selectedTransaction.paymentMethod}</p>
                {selectedTransaction.status === 'CANCELLED' && (
                  <div className="mt-2 p-2 bg-red-50 rounded-xl border border-red-200 text-red-700 text-[10px] font-sans text-left">
                    <p className="font-bold uppercase">🚨 DATA VOID / DIBATALKAN</p>
                    <p className="mt-0.5"><span className="font-semibold">Alasan:</span> {selectedTransaction.voidReason}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 mt-5">
              <button 
                onClick={() => window.print()}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Printer className="w-4 h-4" /> Cetak Ulang
              </button>
              {selectedTransaction.status === 'PAID' && (
                <button 
                  onClick={(e) => handleOpenVoid(selectedTransaction.id, e)}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-500"
                >
                  Void Nota
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {isOpenVoidModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-xl">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2 bg-red-50 rounded-xl border border-red-200">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Otorisasi Void Transaksi</h3>
                <p className="text-xs text-slate-500 mt-0.5">Konfirmasi pembatalan nota invoice kasir.</p>
              </div>
            </div>

            <form onSubmit={handleConfirmVoid} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Alasan Pembatalan Nota</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Contoh: Salah input kuantitas barang oleh kasir / Konsumen melakukan refund barang."
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm outline-none transition-all resize-none focus:border-slate-400 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  disabled={isSubmittingVoid}
                  onClick={() => setIsOpenVoidModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingVoid}
                  className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-500 transition-all disabled:opacity-40"
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
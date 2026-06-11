'use client'

import { useEffect, useState, useMemo } from 'react'
import { api } from '@/lib/api'
import { 
  Boxes, 
  Search, 
  Plus, 
  X, 
  Store, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  AlertOctagon, 
  FileText, 
  Package,
  Loader2,
  ChevronDown
} from 'lucide-react'

type StockMovement = {
  id: string
  storeId: string
  productId: string
  qty: number
  type: 'IN' | 'OUT' | 'DAMAGED'
  note?: string
  createdAt: string
  product: {
    name: string
    sku: string
    stock: number
  }
}

type StoreType = {
  id: string
  name: string
}

type ProductType = {
  id: string
  name: string
  sku: string
  stock: number
}

export default function StockMovementPage() {
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [stores, setStores] = useState<StoreType[]>([])
  const [products, setProducts] = useState<ProductType[]>([])
  
  const [selectedStoreId, setSelectedStoreId] = useState('')
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')

  const [isOpenModal, setIsOpenModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    storeId: '',
    productId: '',
    type: 'IN' as 'IN' | 'OUT' | 'DAMAGED',
    qty: 1,
    note: '',
  })

  useEffect(() => {
    initPage()
  }, [])

  useEffect(() => {
    if (selectedStoreId) {
      loadMovements(selectedStoreId)
      loadProducts(selectedStoreId)
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
      console.error(error)
      setLoading(false)
    }
  }

  async function loadMovements(storeId: string) {
    setLoading(true)
    try {
      const res = await api.get(`/stock-movements/store/${storeId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      })
      setMovements(res.data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  async function loadProducts(storeId: string) {
    try {
      const res = await api.get(`/products/store/${storeId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      })
      setProducts(res.data)
    } catch (error) {
      console.error(error)
    }
  }

  function handleOpenCreate() {
    setFormData({
      storeId: selectedStoreId,
      productId: products[0]?.id || '',
      type: 'IN',
      qty: 1,
      note: '',
    })
    setIsOpenModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.productId) return alert('Silakan pilih produk terlebih dahulu!')
    if (formData.qty <= 0) return alert('Jumlah kuantitas penyesuaian harus lebih dari 0!')

    setIsSubmitting(true)
    const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` }

    const payload = {
      storeId: formData.storeId,
      productId: formData.productId,
      type: formData.type,
      qty: Number(formData.qty),
      note: formData.note.trim() || undefined,
    }

    try {
      await api.post('/stock-movements', payload, { headers })
      setIsOpenModal(false)
      loadMovements(selectedStoreId)
      loadProducts(selectedStoreId)
    } catch (error: any) {
      const serverMessage = error.response?.data?.message
      alert(`Gagal menyesuaikan stok: ${Array.isArray(serverMessage) ? serverMessage.join(', ') : serverMessage}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredMovements = movements.filter((m) => {
    const matchesSearch = m.product?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          m.product?.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (m.note && m.note.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesType = typeFilter === 'ALL' || m.type === typeFilter
    return matchesSearch && matchesType
  })

  const stats = useMemo(() => {
    const totalIn = filteredMovements.filter(m => m.type === 'IN').reduce((acc, curr) => acc + curr.qty, 0)
    const totalOut = filteredMovements.filter(m => m.type === 'OUT').reduce((acc, curr) => acc + curr.qty, 0)
    const totalDamaged = filteredMovements.filter(m => m.type === 'DAMAGED').reduce((acc, curr) => acc + curr.qty, 0)
    return { totalIn, totalOut, totalDamaged }
  }, [filteredMovements])

  function getTypeBadge(type: 'IN' | 'OUT' | 'DAMAGED') {
    switch (type) {
      case 'IN':
        return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-150 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700"><TrendingUp size={11}/>Stok Masuk</span>
      case 'OUT':
        return <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-150 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700"><TrendingDown size={11}/>Stok Keluar</span>
      case 'DAMAGED':
        return <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-150 px-2.5 py-0.5 text-[10px] font-bold text-rose-700"><AlertOctagon size={11}/>Rusak</span>
      default:
        return <span className="inline-flex items-center rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-[10px] font-bold text-slate-700">{type}</span>
    }
  }

  if (loading && stores.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="h-9 w-44 animate-pulse rounded-xl bg-slate-200" />
            <div className="h-4 w-72 animate-pulse rounded-lg bg-slate-100" />
          </div>
          <div className="h-11 w-36 animate-pulse rounded-xl bg-slate-200" />
        </div>
        <div className="h-12 w-full max-w-md animate-pulse rounded-xl bg-slate-100" />
        <div className="h-96 w-full animate-pulse rounded-2xl bg-slate-50 border border-slate-100" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 bg-indigo-50 border border-indigo-100/55 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
            <Boxes size={20} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Mutasi & Log Stok</h1>
            <p className="text-xs font-semibold text-slate-450 mt-0.5">Pantau rekam jejak keluar masuk barang dan koreksi opname internal toko.</p>
          </div>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white transition-all shadow-3xs hover:bg-indigo-700 active:scale-97 cursor-pointer shrink-0"
        >
          <Plus size={14} />
          Penyesuaian Stok
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 flex items-center gap-4 shadow-3xs">
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0 border border-emerald-100/50">
            <TrendingUp size={18} />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Stok Masuk</div>
            <div className="text-xl font-extrabold text-slate-900 mt-0.5">{stats.totalIn} Pcs</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 flex items-center gap-4 shadow-3xs">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0 border border-indigo-100/50">
            <TrendingDown size={18} />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Stok Keluar</div>
            <div className="text-xl font-extrabold text-slate-900 mt-0.5">{stats.totalOut} Pcs</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 flex items-center gap-4 shadow-3xs">
          <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center shrink-0 border border-rose-100/50">
            <AlertOctagon size={18} />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Barang Rusak</div>
            <div className="text-xl font-extrabold text-slate-900 mt-0.5">{stats.totalDamaged} Pcs</div>
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari nama produk, SKU, atau catatan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-250/70 bg-white pl-11 pr-11 py-3.5 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-indigo-550 focus:outline-none focus:ring-4 focus:ring-indigo-550/10 transition-all shadow-3xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="flex border border-slate-200/80 rounded-xl p-1 bg-slate-50/50">
            {['ALL', 'IN', 'OUT', 'DAMAGED'].map((filter) => (
              <button
                key={filter}
                onClick={() => setTypeFilter(filter)}
                className={`px-3 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  typeFilter === filter 
                    ? 'bg-indigo-600 text-white shadow-3xs' 
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {filter === 'ALL' ? 'Semua' : filter === 'IN' ? 'Masuk' : filter === 'OUT' ? 'Keluar' : 'Rusak'}
              </button>
            ))}
          </div>

          <div className="relative shrink-0">
            <select
              value={selectedStoreId}
              onChange={(e) => {
                setSelectedStoreId(e.target.value)
                localStorage.setItem('storeId', e.target.value)
              }}
              className="w-full sm:w-56 appearance-none bg-white border border-slate-250/70 pl-4 pr-10 py-3.5 rounded-xl text-xs font-bold text-slate-800 focus:border-indigo-550 focus:outline-none focus:ring-4 focus:ring-indigo-550/10 cursor-pointer transition-all shadow-3xs"
            >
              {stores.map((store) => (
                <option key={store.id} value={store.id}>{store.name}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-3xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                <th className="p-4 pl-6">Nama Produk / SKU</th>
                <th className="p-4">Waktu Mutasi</th>
                <th className="p-4">Jenis Perubahan</th>
                <th className="p-4">Jumlah Perubahan</th>
                <th className="p-4 pr-6">Keterangan / Memo</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-655 font-semibold">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center">
                    <Loader2 className="w-5 h-5 animate-spin text-slate-400 mx-auto" />
                  </td>
                </tr>
              ) : filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-16 text-center text-slate-450">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="p-3 bg-slate-50 border border-slate-150 rounded-2xl text-slate-400">
                        <Boxes className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-bold text-slate-600">Belum ada aktivitas mutasi stok</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredMovements.map((m) => (
                  <tr key={m.id} className="group hover:bg-slate-50/45 transition-colors">
                    <td className="p-4 pl-6">
                      <div className="font-extrabold text-slate-900 text-xs">{m.product?.name || 'Produk Terhapus'}</div>
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">SKU: {m.product?.sku || '-'}</div>
                    </td>
                    <td className="p-4 whitespace-nowrap text-slate-500 font-medium">
                      {new Date(m.createdAt).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                    </td>
                    <td className="p-4 whitespace-nowrap">{getTypeBadge(m.type)}</td>
                    <td className={`p-4 font-mono font-bold text-xs ${m.type === 'IN' ? 'text-emerald-600' : 'text-slate-900'}`}>
                      {m.type === 'IN' ? `+${m.qty}` : `-${m.qty}`} Pcs
                    </td>
                    <td className="p-4 pr-6 text-slate-500 max-w-xs truncate font-medium">
                      {m.note || <span className="text-slate-300 italic font-normal">Tidak ada catatan</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjust Stock Modal */}
      {isOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-all">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-150 bg-white p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-black text-slate-900">Koreksi Penyesuaian Stok</h3>
                <p className="text-[10px] font-semibold text-slate-450 mt-0.5">Lakukan penyesuaian stock opname manual.</p>
              </div>
              <button onClick={() => setIsOpenModal(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-655">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Pilih Produk Barang</label>
                <div className="relative">
                  <Package className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  <select
                    value={formData.productId}
                    onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                    className="w-full rounded-xl border border-slate-200/80 bg-slate-50/50 pl-10 pr-10 py-3 text-xs font-semibold text-slate-800 outline-none cursor-pointer appearance-none focus:border-indigo-500 focus:bg-white"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} — Sisa: {p.stock} Pcs</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Tipe Penyesuaian</label>
                  <div className="relative">
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as 'IN' | 'OUT' | 'DAMAGED' })}
                      className="w-full rounded-xl border border-slate-200/80 bg-slate-50/50 pl-3 pr-8 py-3 text-xs font-semibold text-slate-800 outline-none cursor-pointer appearance-none focus:border-indigo-500 focus:bg-white"
                    >
                      <option value="IN">Stok Masuk</option>
                      <option value="OUT">Stok Keluar</option>
                      <option value="DAMAGED">Barang Rusak</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Jumlah (Qty)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formData.qty}
                    onChange={(e) => setFormData({ ...formData, qty: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-200/80 bg-slate-50/50 px-3 py-3 text-xs font-semibold outline-none transition-all focus:border-indigo-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Alasan / Memo Catatan</label>
                <div className="relative">
                  <FileText className="absolute left-3.5 top-3.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  <textarea
                    rows={2}
                    required
                    placeholder="Contoh: Audit opname, Rusak di rak display, Bonus supplier."
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    className="w-full rounded-xl border border-slate-200/80 bg-slate-50/50 pl-10 pr-4 py-3 text-xs font-semibold outline-none resize-none focus:bg-white focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4 mt-6">
                <button type="button" disabled={isSubmitting} onClick={() => setIsOpenModal(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-all">Batal</button>
                <button type="submit" disabled={isSubmitting || products.length === 0} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-750 shadow-indigo-500/10 transition-all cursor-pointer">
                  {isSubmitting ? 'Memproses...' : 'Simpan Koreksi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
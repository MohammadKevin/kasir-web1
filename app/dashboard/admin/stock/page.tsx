'use client'

import { useEffect, useState } from 'react'
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
  Package
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

  function getTypeBadge(type: 'IN' | 'OUT' | 'DAMAGED') {
    switch (type) {
      case 'IN':
        return <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700"><TrendingUp size={12}/>Stok Masuk</span>
      case 'OUT':
        return <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 border border-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700"><TrendingDown size={12}/>Stok Keluar</span>
      case 'DAMAGED':
        return <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700"><AlertOctagon size={12}/>Barang Rusak</span>
      default:
        return <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">{type}</span>
    }
  }

  if (loading && stores.length === 0) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-1/4 animate-pulse rounded-lg bg-slate-200" />
        <div className="h-64 w-full animate-pulse rounded-xl bg-slate-50 border" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      
      {/* Header Utama */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Mutasi & Log Stok</h1>
          <p className="text-xs text-slate-500 mt-0.5">Pantau rekam jejak keluar masuk barang dan koreksi opname internal toko</p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-all"
        >
          <Plus size={14} />
          Penyesuaian Stok
        </button>
      </div>

      {/* Kontrol & Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama produk, SKU, atau catatan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-4 py-2 text-xs outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 shadow-3xs"
          />
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          {/* Segmen Tab Tipe */}
          <div className="flex border border-slate-200 rounded-lg p-1 bg-slate-100/70 shadow-3xs">
            {['ALL', 'IN', 'OUT', 'DAMAGED'].map((filter) => (
              <button
                key={filter}
                onClick={() => setTypeFilter(filter)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all ${
                  typeFilter === filter 
                    ? 'bg-white text-slate-950 shadow-xs' 
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {filter === 'ALL' ? 'Semua' : filter === 'IN' ? 'Masuk' : filter === 'OUT' ? 'Keluar' : 'Rusak'}
              </button>
            ))}
          </div>

          {/* Opsi Toko */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-3xs">
            <Store size={13} className="text-slate-400" />
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Toko:</span>
            <select
              value={selectedStoreId}
              onChange={(e) => setSelectedStoreId(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-800 outline-none pr-1 cursor-pointer border-none p-0 focus:ring-0"
            >
              {stores.map((store) => (
                <option key={store.id} value={store.id}>{store.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabel Utama */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-3xs">
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-medium">
              <tr>
                <th scope="col" className="px-6 py-3">Nama Produk / SKU</th>
                <th scope="col" className="px-6 py-3">Waktu Mutasi</th>
                <th scope="col" className="px-6 py-3">Jenis Perubahan</th>
                <th scope="col" className="px-6 py-3">Jumlah Perubahan</th>
                <th scope="col" className="px-6 py-3">Keterangan / Memo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center">
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800" />
                  </td>
                </tr>
              ) : filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-1">
                      <Boxes size={20} className="text-slate-300" />
                      <p className="text-xs font-medium text-slate-500">Belum ada aktivitas mutasi stok</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredMovements.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="px-6 py-3.5">
                      <p className="font-medium text-slate-900">{m.product?.name || 'Produk Terhapus'}</p>
                      <p className="text-[10px] font-mono text-slate-400 mt-0.5">SKU: {m.product?.sku || '-'}</p>
                    </td>
                    <td className="px-6 py-3.5 text-slate-500">
                      <div className="flex items-center gap-1.5 font-medium">
                        <Calendar size={13} className="text-slate-400" />
                        {new Date(m.createdAt).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                      </div>
                    </td>
                    <td className="px-6 py-3.5">{getTypeBadge(m.type)}</td>
                    <td className={`px-6 py-3.5 font-mono font-bold ${m.type === 'IN' ? 'text-emerald-600' : 'text-slate-900'}`}>
                      {m.type === 'IN' ? `+${m.qty}` : `-${m.qty}`} Pcs
                    </td>
                    <td className="px-6 py-3.5 text-slate-500 max-w-xs truncate">
                      {m.note || <span className="text-slate-300 italic font-normal">Tidak ada catatan</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Koreksi Stok */}
      {isOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/20 backdrop-blur-xs">
          <div className="w-full max-w-sm overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Koreksi Penyesuaian Stok</h3>
              </div>
              <button onClick={() => setIsOpenModal(false)} className="rounded p-1 text-slate-400 hover:bg-slate-50">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Pilih Produk Barang</label>
                <div className="relative">
                  <Package className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <select
                    value={formData.productId}
                    onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-9 pr-4 py-2 text-xs font-medium outline-none"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} — Sisa: {p.stock} Pcs</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Tipe Penyesuaian</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as 'IN' | 'OUT' | 'DAMAGED' })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-2 py-2 text-xs font-medium outline-none"
                  >
                    <option value="IN">Stok Masuk</option>
                    <option value="OUT">Stok Keluar</option>
                    <option value="DAMAGED">Barang Rusak</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Jumlah (Qty)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formData.qty}
                    onChange={(e) => setFormData({ ...formData, qty: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-mono font-bold outline-none focus:bg-white focus:border-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Alasan / Memo Catatan</label>
                <div className="relative">
                  <FileText className="absolute left-3 top-2 h-4 w-4 text-slate-400" />
                  <textarea
                    rows={2}
                    required
                    placeholder="Contoh: Audit bulanan, Rusak di gudang, Bonus supplier"
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-9 pr-4 py-2 text-xs outline-none resize-none focus:bg-white focus:border-slate-400"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3 mt-4">
                <button type="button" disabled={isSubmitting} onClick={() => setIsOpenModal(false)} className="rounded-lg border px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50">Batal</button>
                <button type="submit" disabled={isSubmitting || products.length === 0} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800">
                  {isSubmitting ? 'Memproses...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
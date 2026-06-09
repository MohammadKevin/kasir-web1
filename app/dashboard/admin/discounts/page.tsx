'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { 
  Percent, 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  X, 
  Store, 
  Calendar, 
  Tag, 
  CheckCircle2, 
  XCircle,
  Package,
  PlusCircle,
  Sparkles
} from 'lucide-react'

type DiscountProduct = {
  productId: string
  product: {
    name: string
    sku: string
  }
}

type Discount = {
  id: string
  storeId: string
  name: string
  type: 'PERCENTAGE' | 'FIXED'
  value: number
  isActive: boolean
  startDate?: string
  endDate?: string
  products: DiscountProduct[]
}

type StoreType = {
  id: string
  name: string
}

type ProductType = {
  id: string
  name: string
  sku: string
}

export default function DiscountPage() {
  const [discounts, setDiscounts] = useState<Discount[]>([])
  const [stores, setStores] = useState<StoreType[]>([])
  const [products, setProducts] = useState<ProductType[]>([])
  
  const [selectedStoreId, setSelectedStoreId] = useState('')
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const [isOpenModal, setIsOpenModal] = useState(false)
  const [isOpenManageProducts, setIsOpenManageProducts] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedDiscount, setSelectedDiscount] = useState<Discount | null>(null)

  const [formData, setFormData] = useState({
    storeId: '',
    name: '',
    type: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED',
    value: 0,
    startDate: '',
    endDate: '',
  })

  const [assignProductId, setAssignProductId] = useState('')

  useEffect(() => {
    initPage()
  }, [])

  useEffect(() => {
    if (selectedStoreId) {
      loadDiscounts(selectedStoreId)
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

  async function loadDiscounts(storeId: string) {
    setLoading(true)
    try {
      const res = await api.get(`/discounts/store/${storeId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      })
      setDiscounts(res.data)
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
    setEditingId(null)
    setFormData({
      storeId: selectedStoreId,
      name: '',
      type: 'PERCENTAGE',
      value: 0,
      startDate: '',
      endDate: '',
    })
    setIsOpenModal(true)
  }

  function handleOpenEdit(discount: Discount) {
    setEditingId(discount.id)
    setFormData({
      storeId: discount.storeId,
      name: discount.name,
      type: discount.type,
      value: discount.value,
      startDate: discount.startDate ? discount.startDate.substring(0, 10) : '',
      endDate: discount.endDate ? discount.endDate.substring(0, 10) : '',
    })
    setIsOpenModal(true)
  }

  async function handleToggleActive(discount: Discount) {
    const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` }
    try {
      await api.patch(`/discounts/${discount.id}`, { isActive: !discount.isActive }, { headers })
      loadDiscounts(selectedStoreId)
    } catch (error) {
      console.error(error)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)

    const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` }

    const payload = {
      storeId: formData.storeId,
      name: formData.name.trim(),
      type: formData.type,
      value: Number(formData.value),
      startDate: formData.startDate ? new Date(formData.startDate) : undefined,
      endDate: formData.endDate ? new Date(formData.endDate) : undefined,
    }

    try {
      if (editingId) {
        await api.patch(`/discounts/${editingId}`, payload, { headers })
      } else {
        await api.post('/discounts', payload, { headers })
      }
      setIsOpenModal(false)
      loadDiscounts(selectedStoreId)
    } catch (error: any) {
      const serverMessage = error.response?.data?.message
      alert(`Gagal menyimpan diskon: ${Array.isArray(serverMessage) ? serverMessage.join(', ') : serverMessage}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function remove(id: string) {
    if (!confirm('Apakah Anda yakin ingin menghapus konfigurasi diskon ini?')) return

    try {
      await api.delete(`/discounts/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      })
      loadDiscounts(selectedStoreId)
    } catch (error) {
      console.error(error)
    }
  }

  async function handleOpenManageProducts(discount: Discount) {
    setSelectedDiscount(discount)
    setAssignProductId(products[0]?.id || '')
    setIsOpenManageProducts(true)
  }

  // Menghubungkan satu produk
  async function handleAssignProduct(e: React.FormEvent) {
    e.preventDefault()
    if (!assignProductId || !selectedDiscount) return

    const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` }
    try {
      await api.post(`/discounts/${selectedDiscount.id}/products`, { productId: assignProductId }, { headers })
      const updated = await api.get(`/discounts/${selectedDiscount.id}`, { headers })
      setSelectedDiscount(updated.data)
      loadDiscounts(selectedStoreId)
    } catch (error: any) {
      alert(error.response?.data?.message || 'Produk sudah terdaftar pada diskon ini.')
    }
  }

  // Menghubungkan semua produk sekaligus (Massal)
  async function handleAssignAllProducts() {
    if (!selectedDiscount || products.length === 0) return
    if (!confirm(`Apakah Anda yakin ingin menerapkan diskon ini ke seluruh produk (${products.length} item) yang ada di toko?`)) return

    const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` }
    try {
      // Loop untuk mendaftarkan semua produk ke endpoint relasi diskon
      await Promise.all(
        products.map((p) =>
          api.post(`/discounts/${selectedDiscount.id}/products`, { productId: p.id }, { headers }).catch(() => null)
        )
      )
      
      const updated = await api.get(`/discounts/${selectedDiscount.id}`, { headers })
      setSelectedDiscount(updated.data)
      loadDiscounts(selectedStoreId)
    } catch (error) {
      console.error(error)
      alert('Terjadi kendala saat menghubungkan beberapa produk.')
    }
  }

  async function handleRemoveProduct(productId: string) {
    if (!selectedDiscount) return
    const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` }
    try {
      await api.delete(`/discounts/${selectedDiscount.id}/products/${productId}`, { headers })
      const updated = await api.get(`/discounts/${selectedDiscount.id}`, { headers })
      setSelectedDiscount(updated.data)
      loadDiscounts(selectedStoreId)
    } catch (error) {
      console.error(error)
    }
  }

  const filteredDiscounts = discounts.filter((d) =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading && stores.length === 0) {
    return (
      <div className="space-y-6 p-6">
        <div className="h-12 w-1/3 animate-pulse rounded-xl bg-slate-200" />
        <div className="h-96 w-full animate-pulse rounded-2xl bg-slate-50 border" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Program Diskon</h1>
          <p className="text-xs text-slate-500 mt-0.5">Kelola potongan harga promosi penjualan, tipe potongan nominal/persen, serta relasi produk komoditas.</p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-sm shadow-blue-500/10 transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Tambah Program Diskon
        </button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari kampanye program promo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-4 py-2 text-xs outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 shadow-3xs"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-3xs self-start sm:self-auto">
          <Store className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Toko:</span>
          <select
            value={selectedStoreId}
            onChange={(e) => {
              setSelectedStoreId(e.target.value)
              localStorage.setItem('storeId', e.target.value)
            }}
            className="bg-transparent text-xs font-semibold text-slate-800 outline-none pr-1 cursor-pointer border-none p-0 focus:ring-0"
          >
            {stores.map((store) => (
              <option key={store.id} value={store.id}>{store.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-3xs">
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-medium">
              <tr>
                <th scope="col" className="px-6 py-3">Nama Program Promosi</th>
                <th scope="col" className="px-6 py-3">Besar Potongan</th>
                <th scope="col" className="px-6 py-3">Periode Aktif</th>
                <th scope="col" className="px-6 py-3">Produk Terikat</th>
                <th scope="col" className="px-6 py-3">Status</th>
                <th scope="col" className="px-6 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center">
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800" />
                  </td>
                </tr>
              ) : filteredDiscounts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-1">
                      <Percent className="w-5 h-5 text-slate-300" />
                      <p className="text-xs font-medium text-slate-500">Daftar program diskon masih kosong</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredDiscounts.map((discount) => (
                  <tr key={discount.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-3.5 font-medium text-slate-900">{discount.name}</td>
                    <td className="px-6 py-3.5 font-mono">
                      {discount.type === 'PERCENTAGE' ? (
                        <span className="inline-flex items-center rounded-md bg-blue-50 px-1.5 py-0.5 text-[11px] font-bold text-blue-700 border border-blue-100">
                          {discount.value}% OFF
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-100">
                          Rp {discount.value.toLocaleString('id-ID')} OFF
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-slate-500 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {discount.startDate ? new Date(discount.startDate).toLocaleDateString('id-ID', { dateStyle: 'short' }) : '∞'} 
                          {' - '} 
                          {discount.endDate ? new Date(discount.endDate).toLocaleDateString('id-ID', { dateStyle: 'short' }) : '∞'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      <button
                        onClick={() => handleOpenManageProducts(discount)}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 hover:bg-slate-50 transition-all font-medium text-slate-700"
                      >
                        <Package className="w-3.5 h-3.5 text-slate-400" />
                        {discount.products?.length ?? 0} Produk
                      </button>
                    </td>
                    <td className="px-6 py-3.5">
                      <button onClick={() => handleToggleActive(discount)} className="focus:outline-none transition-all">
                        {discount.isActive ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 font-semibold text-emerald-700">
                            <CheckCircle2 className="w-3 h-3" /> Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 font-semibold text-slate-600">
                            <XCircle className="w-3 h-3" /> Off
                          </span>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleOpenEdit(discount)} className="p-1 text-slate-400 hover:text-slate-900 rounded transition-all">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button onClick={() => remove(discount.id)} className="p-1 text-slate-400 hover:text-red-600 rounded transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Buat/Ubah Diskon */}
      {isOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/20 backdrop-blur-xs">
          <div className="w-full max-w-sm overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-semibold text-slate-900">{editingId ? 'Ubah Aturan Diskon' : 'Tambah Aturan Diskon'}</h3>
              <button onClick={() => setIsOpenModal(false)} className="rounded p-1 text-slate-400 hover:bg-slate-50">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Nama Kampanye Diskon</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Diskon Gajian, Promo Member"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs outline-none focus:bg-white focus:border-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Tipe</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as 'PERCENTAGE' | 'FIXED' })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-2 py-2 text-xs outline-none"
                  >
                    <option value="PERCENTAGE">Persen (%)</option>
                    <option value="FIXED">Nominal (Rp)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Nilai</label>
                  <input
                    type="number"
                    required
                    min={1}
                    placeholder="Nilai diskon"
                    value={formData.value || ''}
                    onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs outline-none focus:bg-white focus:border-slate-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Mulai (Opsional)</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs outline-none focus:bg-white focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Selesai (Opsional)</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs outline-none focus:bg-white focus:border-slate-400"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3 mt-4">
                <button type="button" disabled={isSubmitting} onClick={() => setIsOpenModal(false)} className="rounded-lg border px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50">Batal</button>
                <button type="submit" disabled={isSubmitting} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-md shadow-blue-500/10 cursor-pointer">
                  {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Atokasi Hubungan Produk (Satu / Semua) */}
      {isOpenManageProducts && selectedDiscount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/20 backdrop-blur-xs">
          <div className="w-full max-w-sm overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-slate-400" />
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Alokasi Produk Terikat</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Diskon: <span className="font-semibold text-slate-600">{selectedDiscount.name}</span></p>
                </div>
              </div>
              <button onClick={() => setIsOpenManageProducts(false)} className="rounded p-1 text-slate-400 hover:bg-slate-50"><X className="h-4 w-4" /></button>
            </div>

            {/* Opsi Alokasi Massal */}
            <div className="mt-3 p-2.5 border border-slate-200 rounded-lg bg-slate-50/50 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-slate-900">Terapkan Massal</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Hubungkan ke seluruh produk toko sekaligus ({products.length} item)</p>
              </div>
              <button 
                type="button" 
                onClick={handleAssignAllProducts}
                disabled={products.length === 0}
                className="inline-flex items-center gap-1 rounded-md bg-white border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                <Sparkles size={12} className="text-blue-500" /> Semua
              </button>
            </div>

            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink mx-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider">Atau Pilih Satuan</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            {/* Opsi Alokasi Satuan */}
            <form onSubmit={handleAssignProduct} className="flex gap-2">
              <select
                value={assignProductId}
                onChange={(e) => setAssignProductId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-2 py-1.5 text-xs font-medium outline-none"
              >
                {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
              </select>
              <button type="submit" className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-blue-700 shadow-sm shadow-blue-500/10 whitespace-nowrap cursor-pointer">
                <PlusCircle className="w-3.5 h-3.5" /> Ikat
              </button>
            </form>

            {/* Daftar Produk Terhubung */}
            <div className="mt-4 border border-slate-200 rounded-lg max-h-48 overflow-y-auto bg-slate-50/30 p-2 space-y-1.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Daftar Item Saat Ini :</p>
              {selectedDiscount.products?.length === 0 ? (
                <p className="text-xs text-center py-6 text-slate-400 italic bg-white rounded-lg border border-dashed border-slate-200">Belum ada komoditas terikat.</p>
              ) : (
                selectedDiscount.products?.map((dp) => (
                  <div key={dp.productId} className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-200 shadow-3xs">
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="text-xs font-medium text-slate-900 truncate">{dp.product?.name}</p>
                      <p className="text-[10px] font-mono text-slate-400 truncate">SKU: {dp.product?.sku}</p>
                    </div>
                    <button type="button" onClick={() => handleRemoveProduct(dp.productId)} className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setIsOpenManageProducts(false)}
              className="w-full mt-4 rounded-lg border border-slate-200 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
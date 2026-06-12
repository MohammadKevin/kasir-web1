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
  Sparkles,
  Loader2,
  ChevronDown
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

  async function handleAssignAllProducts() {
    if (!selectedDiscount || products.length === 0) return
    if (!confirm(`Apakah Anda yakin ingin menerapkan diskon ini ke seluruh produk (${products.length} item) yang ada di toko?`)) return

    const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` }
    try {
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
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 bg-indigo-50 border border-indigo-100/55 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
            <Percent size={20} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Program Diskon</h1>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">Kelola potongan harga promosi penjualan, tipe potongan nominal/persen, serta relasi produk komoditas.</p>
          </div>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white transition-all shadow-3xs hover:bg-indigo-700 active:scale-97 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          Tambah Program Diskon
        </button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari kampanye program promo..."
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full py-16 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        ) : filteredDiscounts.length === 0 ? (
          <div className="col-span-full border-2 border-dashed border-slate-200 rounded-3xl p-16 text-center text-slate-400 bg-white">
            <div className="w-12 h-12 bg-slate-50 border border-slate-150 rounded-2xl flex items-center justify-center text-slate-400 mx-auto mb-4">
              <Percent className="w-6 h-6" />
            </div>
            <p className="text-xs font-bold text-slate-600">Daftar program diskon masih kosong</p>
            <p className="text-[10px] text-slate-400 mt-1">Silakan tambahkan kampanye potongan diskon promosi toko.</p>
          </div>
        ) : (
          filteredDiscounts.map((discount) => {
            return (
              <div 
                key={discount.id} 
                className="group relative bg-white border border-slate-200/80 rounded-2xl p-5 hover:shadow-sm transition-all hover:border-slate-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    {discount.type === 'PERCENTAGE' ? (
                      <span className="inline-flex items-center rounded-lg bg-indigo-50 border border-indigo-100/60 px-2.5 py-1 text-[11px] font-extrabold text-indigo-700">
                        {discount.value}% OFF
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-lg bg-emerald-50 border border-emerald-100/60 px-2.5 py-1 text-[11px] font-extrabold text-emerald-700">
                        Rp {discount.value.toLocaleString('id-ID')} OFF
                      </span>
                    )}

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(discount)}
                        className="p-1.5 text-slate-400 hover:text-slate-750 hover:bg-slate-100 rounded-lg transition-all"
                        title="Ubah Aturan Diskon"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => remove(discount.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        title="Hapus Diskon"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-sm font-extrabold text-slate-900 mt-4 leading-tight group-hover:text-indigo-600 transition-colors">
                    {discount.name}
                  </h3>

                  <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400 mt-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {discount.startDate ? new Date(discount.startDate).toLocaleDateString('id-ID', { dateStyle: 'short' }) : '∞'} 
                      {' - '} 
                      {discount.endDate ? new Date(discount.endDate).toLocaleDateString('id-ID', { dateStyle: 'short' }) : '∞'}
                    </span>
                  </div>
                </div>

                <div className="border-t border-slate-100/80 pt-4 mt-5 flex items-center justify-between">
                  <button
                    onClick={() => handleOpenManageProducts(discount)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-extrabold text-slate-600 hover:bg-slate-50 transition-all"
                  >
                    <Package className="w-3 h-3 text-slate-400" />
                    <span>{discount.products?.length ?? 0} Produk</span>
                  </button>

                  <button 
                    onClick={() => handleToggleActive(discount)} 
                    className="focus:outline-none transition-all"
                  >
                    {discount.isActive ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        <CheckCircle2 className="w-3 h-3" /> Aktif
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                        <XCircle className="w-3 h-3" /> Off
                      </span>
                    )}
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {isOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-all">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-150 bg-white p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-black text-slate-900">{editingId ? 'Ubah Aturan Diskon' : 'Tambah Aturan Diskon'}</h3>
                <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Atur detail kampanye promosi dan potongan harga POS.</p>
              </div>
              <button onClick={() => setIsOpenModal(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Nama Kampanye Diskon</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Diskon Gajian, Promo Member"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-200/80 bg-slate-50/50 px-3 py-3 text-xs font-semibold outline-none transition-all focus:border-indigo-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Tipe</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as 'PERCENTAGE' | 'FIXED' })}
                    className="w-full rounded-xl border border-slate-200/80 bg-slate-50/50 px-3 py-3 text-xs font-semibold outline-none focus:border-indigo-500 focus:bg-white"
                  >
                    <option value="PERCENTAGE">Persen (%)</option>
                    <option value="FIXED">Nominal (Rp)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Nilai Potongan</label>
                  <input
                    type="number"
                    required
                    min={1}
                    placeholder="Nilai diskon"
                    value={formData.value || ''}
                    onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-200/80 bg-slate-50/50 px-3 py-3 text-xs font-semibold outline-none transition-all focus:border-indigo-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Mulai (Opsional)</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full rounded-xl border border-slate-200/80 bg-slate-50/50 px-3 py-3 text-xs font-semibold outline-none transition-all focus:border-indigo-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Selesai (Opsional)</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full rounded-xl border border-slate-200/80 bg-slate-50/50 px-3 py-3 text-xs font-semibold outline-none transition-all focus:border-indigo-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4 mt-6">
                <button type="button" disabled={isSubmitting} onClick={() => setIsOpenModal(false)} className="rounded-xl border border-slate-250/70 px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-all">Batal</button>
                <button type="submit" disabled={isSubmitting} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 shadow-indigo-500/10 transition-all cursor-pointer">
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Aturan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isOpenManageProducts && selectedDiscount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-all">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-slate-150 bg-white p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-150 max-h-[85vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-slate-400" />
                <div>
                  <h3 className="text-sm font-black text-slate-900">Alokasi Produk Terikat</h3>
                  <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Diskon: <span className="font-bold text-slate-600">{selectedDiscount.name}</span></p>
                </div>
              </div>
              <button onClick={() => setIsOpenManageProducts(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>

            <div className="p-3 border border-slate-200 rounded-xl bg-slate-50/50 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold text-slate-900">Terapkan Massal</p>
                <p className="text-[9.5px] font-semibold text-slate-400 mt-0.5">Hubungkan ke seluruh produk toko ({products.length} item)</p>
              </div>
              <button 
                type="button" 
                onClick={handleAssignAllProducts}
                disabled={products.length === 0}
                className="inline-flex items-center gap-1 rounded-lg bg-white border border-slate-200 px-2.5 py-1.5 text-[10px] font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 shadow-3xs cursor-pointer"
              >
                <Sparkles size={11} className="text-indigo-500" /> Semua
              </button>
            </div>

            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink mx-2 text-[9px] text-slate-400 font-bold uppercase tracking-wider">Atau Pilih Satuan</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            <form onSubmit={handleAssignProduct} className="flex gap-2">
              <div className="relative flex-1">
                <select
                  value={assignProductId}
                  onChange={(e) => setAssignProductId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200/80 bg-slate-50/50 pl-3 pr-8 py-2.5 text-xs font-semibold text-slate-800 outline-none cursor-pointer appearance-none focus:border-indigo-500 focus:bg-white"
                >
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              </div>
              <button type="submit" className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-3.5 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 shadow-3xs active:scale-97 cursor-pointer">
                <PlusCircle className="w-3.5 h-3.5" /> Ikat
              </button>
            </form>

            <div className="border border-slate-200 rounded-xl max-h-48 overflow-y-auto bg-slate-50/30 p-2 space-y-1.5 scrollbar-thin">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider px-1">Daftar Item Saat Ini :</p>
              {selectedDiscount.products?.length === 0 ? (
                <p className="text-[10px] text-center py-6 text-slate-400 italic bg-white rounded-lg border border-dashed border-slate-200">Belum ada komoditas terikat.</p>
              ) : (
                selectedDiscount.products?.map((dp) => (
                  <div key={dp.productId} className="flex justify-between items-center bg-white p-2 rounded-xl border border-slate-150 shadow-3xs">
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="text-xs font-bold text-slate-900 truncate">{dp.product?.name}</p>
                      <p className="text-[9.5px] font-mono text-slate-400 mt-0.5 truncate">SKU: {dp.product?.sku}</p>
                    </div>
                    <button type="button" onClick={() => handleRemoveProduct(dp.productId)} className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition-colors shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setIsOpenManageProducts(false)}
              className="w-full rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50 cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

    </div>
  )
}

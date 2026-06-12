'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import {
  Folder,
  Search,
  Plus,
  Edit3,
  Trash2,
  X,
  Store,
  FileText,
  FolderPlus,
  Layers,
  Package,
  Loader2,
  ChevronDown,
  Info
} from 'lucide-react'

type Category = {
  id: string
  storeId: string
  name: string
  description?: string
  _count?: {
    products: number
  }
}

type StoreType = {
  id: string
  name: string
}

type Product = {
  id: string
  storeId: string
  categoryId: string
  name: string
  image?: string
  sku?: string
  barcode?: string
  sellingPrice: number
  stock: number
  minimumStock: number
  isActive: boolean
}

export default function CategoryPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [stores, setStores] = useState<StoreType[]>([])
  const [selectedStoreId, setSelectedStoreId] = useState('')
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const [isOpenModal, setIsOpenModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    storeId: '',
    name: '',
    description: '',
  })

  const [selectedCategoryForProducts, setSelectedCategoryForProducts] = useState<Category | null>(null)
  const [categoryProducts, setCategoryProducts] = useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)

  useEffect(() => {
    initPage()
  }, [])

  useEffect(() => {
    if (selectedStoreId) {
      loadCategories(selectedStoreId)
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
        setFormData({ storeId: initialStoreId, name: '', description: '' })
      } else {
        setLoading(false)
      }
    } catch (error) {
      console.error('Gagal menginisialisasi halaman:', error)
      setLoading(false)
    }
  }

  async function loadCategories(storeId: string) {
    setLoading(true)
    try {
      const res = await api.get(`/categories/store/${storeId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })
      setCategories(res.data)
    } catch (error) {
      console.error('Gagal memuat kategori:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleOpenCreate() {
    setEditingId(null)
    setFormData({
      storeId: selectedStoreId,
      name: '',
      description: '',
    })
    setIsOpenModal(true)
  }

  function handleOpenEdit(category: Category) {
    setEditingId(category.id)
    setFormData({
      storeId: category.storeId,
      name: category.name,
      description: category.description || '',
    })
    setIsOpenModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)

    const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` }

    const payload = {
      storeId: formData.storeId,
      name: formData.name.trim(),
      description: formData.description?.trim() || undefined
    }

    try {
      if (editingId) {
        await api.patch(`/categories/${editingId}`, payload, { headers })
      } else {
        await api.post('/categories', payload, { headers })
      }
      setIsOpenModal(false)
      loadCategories(selectedStoreId)
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Gagal menyimpan kategori'
      alert(Array.isArray(msg) ? msg.join(', ') : msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function remove(id: string) {
    if (!confirm('Apakah Anda yakin ingin menghapus kategori ini? Produk di dalam kategori ini akan kehilangan relasi kategorinya.')) return

    try {
      await api.delete(`/categories/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })
      loadCategories(selectedStoreId)
    } catch (error) {
      console.error('Gagal menghapus kategori:', error)
    }
  }

  async function handleViewProducts(category: Category) {
    if (!category._count?.products) return

    setSelectedCategoryForProducts(category)
    setLoadingProducts(true)
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` }
      const res = await api.get(`/products/store/${category.storeId}`, { headers })
      const filtered = res.data.filter((p: any) => p.categoryId === category.id)
      setCategoryProducts(filtered)
    } catch (error) {
      console.error('Gagal memuat produk kategori:', error)
    } finally {
      setLoadingProducts(false)
    }
  }

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()))
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
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 bg-indigo-50 border border-indigo-100/55 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
            <Folder size={20} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Kategori Produk</h1>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">Kelola kelompok atau pengelompokan produk komoditas untuk mempermudah navigasi pada kasir POS.</p>
          </div>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white transition-all shadow-3xs hover:bg-indigo-700 active:scale-97 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          Tambah Kategori
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari nama kategori atau deskripsi..."
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
              setFormData({ storeId: e.target.value, name: '', description: '' })
              localStorage.setItem('storeId', e.target.value)
            }}
            className="w-full sm:w-60 appearance-none bg-white border border-slate-250/70 pl-4 pr-10 py-3.5 rounded-xl text-xs font-bold text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 cursor-pointer transition-all shadow-3xs"
          >
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Grid Layout of Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full py-16 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="col-span-full border-2 border-dashed border-slate-200 rounded-3xl p-16 text-center text-slate-400 bg-white">
            <div className="w-12 h-12 bg-slate-50 border border-slate-150 rounded-2xl flex items-center justify-center text-slate-400 mx-auto mb-4">
              <Folder className="w-6 h-6" />
            </div>
            <p className="text-xs font-bold text-slate-600">Kategori produk masih kosong</p>
            <p className="text-[10px] text-slate-400 mt-1">Silakan tambahkan kelompok kategori baru pada cabang toko ini.</p>
          </div>
        ) : (
          filteredCategories.map((category) => {
            const count = category._count?.products ?? 0
            return (
              <div 
                key={category.id} 
                className="group relative bg-white border border-slate-200/80 rounded-2xl p-5 hover:shadow-sm transition-all hover:border-slate-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-9 h-9 bg-indigo-50/70 text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-100/50 group-hover:bg-indigo-600 group-hover:text-white transition-all shrink-0">
                      <Folder className="w-4 h-4" />
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(category)}
                        className="p-1.5 text-slate-400 hover:text-slate-750 hover:bg-slate-100 rounded-lg transition-all"
                        title="Ubah Kategori"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => remove(category.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        title="Hapus Kategori"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-sm font-extrabold text-slate-900 mt-4 leading-tight group-hover:text-indigo-600 transition-colors">
                    {category.name}
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-400 mt-1.5 line-clamp-2 min-h-[2rem]">
                    {category.description || 'Tidak ada deskripsi rincian untuk kategori ini.'}
                  </p>
                </div>

                <div className="border-t border-slate-100/80 pt-4 mt-4 flex items-center justify-between">
                  <div className="text-[10px] font-bold text-slate-400">Total Komoditas</div>
                  {count > 0 ? (
                    <button
                      onClick={() => handleViewProducts(category)}
                      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-extrabold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800 transition-all cursor-pointer"
                    >
                      <Layers className="w-3 h-3" />
                      <span>{count} Produk</span>
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-bold bg-slate-50 text-slate-500 border border-slate-200/50">
                      <Layers className="w-3 h-3 text-slate-400" />
                      <span>{count} Produk</span>
                    </span>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Category Modal (Create / Edit) */}
      {isOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-all">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-150 bg-white p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-black text-slate-900">{editingId ? 'Ubah Rincian Kategori' : 'Tambah Kategori Baru'}</h3>
                <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Atur pengelompokan produk komoditas pada POS.</p>
              </div>
              <button
                onClick={() => setIsOpenModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Penempatan Cabang Toko</label>
                <div className="relative">
                  <Store className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <select
                    required
                    disabled={!!editingId}
                    value={formData.storeId}
                    onChange={(e) => setFormData({ ...formData, storeId: e.target.value })}
                    className="w-full rounded-xl border border-slate-200/80 bg-slate-50/50 pl-10 pr-10 py-3 text-xs font-semibold text-slate-800 outline-none transition-all appearance-none cursor-pointer focus:border-indigo-500 focus:bg-white disabled:opacity-60"
                  >
                    {stores.map((store) => (
                      <option key={store.id} value={store.id}>
                        {store.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Nama Kategori</label>
                <div className="relative">
                  <FolderPlus className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Pakaian Pria, Aksesoris"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-xl border border-slate-200/80 bg-slate-50/50 pl-10 pr-4 py-3 text-xs font-semibold outline-none transition-all focus:border-indigo-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Keterangan / Deskripsi (Opsional)</label>
                <div className="relative">
                  <FileText className="absolute left-3.5 top-3.5 h-3.5 w-3.5 text-slate-400" />
                  <textarea
                    rows={3}
                    placeholder="Deskripsi singkat cakupan produk dalam kategori ini..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full rounded-xl border border-slate-200/80 bg-slate-50/50 pl-10 pr-4 py-3 text-xs font-semibold outline-none transition-all resize-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4 mt-6">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsOpenModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-all disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-755 shadow-indigo-500/10 transition-all disabled:opacity-40 cursor-pointer"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-1.5">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Menyimpan...</span>
                    </div>
                  ) : editingId ? (
                    'Perbarui Kategori'
                  ) : (
                    'Buat Kategori'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Products Modal */}
      {selectedCategoryForProducts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-all">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-150 bg-white p-6 shadow-xl flex flex-col max-h-[85vh] relative animate-in fade-in zoom-in-95 duration-150">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  Produk Kategori: {selectedCategoryForProducts.name}
                </h3>
                <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
                  Daftar produk komoditas yang terdaftar dalam kategori ini.
                </p>
              </div>
              <button
                onClick={() => setSelectedCategoryForProducts(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto mt-4 pr-1 scrollbar-thin">
              {loadingProducts ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                  <p className="text-xs font-bold text-slate-600">Memuat daftar produk...</p>
                </div>
              ) : categoryProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <div className="w-10 h-10 bg-slate-50 border border-slate-150 rounded-xl flex items-center justify-center text-slate-400 mb-2">
                    <Package className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-slate-600">Tidak ada produk aktif</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {categoryProducts.map((product) => (
                    <div key={product.id} className="flex items-center justify-between py-3 gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-11 h-11 rounded-xl object-cover border border-slate-100 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-150 flex items-center justify-center text-slate-400 flex-shrink-0">
                            <Package className="w-5 h-5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-extrabold text-slate-900 text-xs truncate">{product.name}</p>
                          <p className="text-[10px] font-mono text-slate-400 mt-0.5 truncate">
                            {product.sku || 'Tanpa SKU'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right flex-shrink-0">
                        <p className="font-extrabold text-slate-900 text-xs">
                          Rp {product.sellingPrice.toLocaleString('id-ID')}
                        </p>
                        <div className="flex items-center justify-end gap-1.5 mt-0.5">
                          <span className={`text-[10px] font-bold ${product.stock <= product.minimumStock ? 'text-amber-600' : 'text-slate-400'}`}>
                            Stok: {product.stock}
                          </span>
                          <span className={`inline-block w-1.5 h-1.5 rounded-full ${product.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`} title={product.isActive ? 'Aktif' : 'Nonaktif'} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end border-t border-slate-100 pt-4 mt-4">
              <button
                type="button"
                onClick={() => setSelectedCategoryForProducts(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-all cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

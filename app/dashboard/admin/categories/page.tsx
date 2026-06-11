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
  ImageIcon,
  Loader2
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

    // Payload yang disesuaikan dengan CreateCategoryDto
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
      <div className="space-y-6 p-6">
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
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Kategori Produk</h1>
          <p className="text-sm text-slate-500 mt-1">Kelola kelompok atau pengelompokan produk komoditas untuk mempermudah navigasi pada kasir POS.</p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 shadow-blue-500/10 transition-all active:scale-98 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Tambah Kategori
        </button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama kategori atau deskripsi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 py-3 text-sm outline-none transition-all placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-50 shadow-sm"
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
          <Store className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Toko:</span>
          <select
            value={selectedStoreId}
            onChange={(e) => {
              setSelectedStoreId(e.target.value)
              setFormData({ storeId: e.target.value, name: '', description: '' })
              localStorage.setItem('storeId', e.target.value)
            }}
            className="bg-transparent text-sm font-semibold text-slate-800 outline-none pr-2 cursor-pointer"
          >
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm text-slate-600">
            <thead className="bg-slate-50/70 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-100">
              <tr>
                <th scope="col" className="px-6 py-4">Nama Kategori</th>
                <th scope="col" className="px-6 py-4">Deskripsi / Keterangan</th>
                <th scope="col" className="px-6 py-4">Jumlah Produk Terkait</th>
                <th scope="col" className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                    <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800" />
                  </td>
                </tr>
              ) : filteredCategories.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-slate-400">
                        <Folder className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-medium text-slate-600">Kategori produk masih kosong</p>
                      <p className="text-xs text-slate-400">Silakan tambahkan kelompok kategori baru pada cabang toko ini.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCategories.map((category) => (
                  <tr key={category.id} className="transition-colors hover:bg-slate-50/50 group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100/50 group-hover:bg-blue-600 group-hover:text-white transition-all">
                          <Folder className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-slate-900 text-base">{category.name}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-slate-500 max-w-sm truncate font-medium">
                      {category.description || <span className="text-slate-300 italic font-normal">Tidak ada deskripsi</span>}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {((category._count?.products ?? 0) > 0) ? (
                          <button
                            onClick={() => handleViewProducts(category)}
                            className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 transition-all cursor-pointer border-none outline-none"
                            title="Lihat Daftar Produk"
                          >
                            <Layers className="w-3.5 h-3.5" />
                            {category._count?.products ?? 0} Produk
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-semibold bg-slate-50 text-slate-500">
                            <Layers className="w-3.5 h-3.5" />
                            0 Produk
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(category)}
                          className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
                          title="Ubah Rincian Kategori"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => remove(category.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                          title="Hapus Kategori"
                        >
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

      {isOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-xl transition-all">

            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{editingId ? 'Ubah Rincian Kategori' : 'Tambah Kategori Baru'}</h3>
                <p className="text-xs text-slate-500 mt-0.5">Konfigurasi nama pengelompokan komoditas serta deskripsi klasifikasinya.</p>
              </div>
              <button
                onClick={() => setIsOpenModal(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Penempatan Cabang Toko</label>
                <div className="relative">
                  <Store className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <select
                    required
                    disabled={!!editingId}
                    value={formData.storeId}
                    onChange={(e) => setFormData({ ...formData, storeId: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2.5 text-sm font-medium outline-none transition-all appearance-none cursor-pointer focus:border-slate-400 focus:bg-white disabled:opacity-60"
                  >
                    {stores.map((store) => (
                      <option key={store.id} value={store.id}>
                        {store.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3.5 top-3.5 pointer-events-none border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-500" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Nama Kategori</label>
                <div className="relative">
                  <FolderPlus className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Pakaian Pria, Makanan Ringan"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2.5 text-sm outline-none transition-all focus:border-slate-400 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Keterangan / Deskripsi (Opsional)</label>
                <div className="relative">
                  <FileText className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <textarea
                    rows={3}
                    placeholder="Deskripsi singkat cakupan produk dalam kategori ini..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2.5 text-sm outline-none transition-all resize-none focus:border-slate-400 focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4 mt-6">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsOpenModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 shadow-blue-500/10 transition-all disabled:opacity-40 cursor-pointer"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
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

      {selectedCategoryForProducts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-xl transition-all flex flex-col max-h-[85vh]">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Produk Kategori: {selectedCategoryForProducts.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Daftar produk komoditas yang terdaftar dalam kategori ini.
                </p>
              </div>
              <button
                onClick={() => setSelectedCategoryForProducts(null)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto mt-4 pr-1 scrollbar-thin">
              {loadingProducts ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  <p className="text-sm font-medium text-slate-600">Memuat daftar produk...</p>
                </div>
              ) : categoryProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-slate-400 mb-2">
                    <Package className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-medium text-slate-600">Tidak ada produk aktif</p>
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
                          <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 flex-shrink-0">
                            <Package className="w-5 h-5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 text-sm truncate">{product.name}</p>
                          <p className="text-xs font-mono text-slate-400 mt-0.5 truncate">
                            {product.sku || 'Tanpa SKU'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-slate-950 text-sm">
                          Rp {product.sellingPrice.toLocaleString('id-ID')}
                        </p>
                        <div className="flex items-center justify-end gap-1.5 mt-0.5">
                          <span className={`text-xs font-medium ${product.stock <= product.minimumStock ? 'text-amber-600' : 'text-slate-500'}`}>
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
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
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
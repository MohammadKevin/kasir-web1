'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import {
  Package, 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  X, 
  Store, 
  Barcode, 
  Tag,
  Boxes, 
  AlertTriangle, 
  Layers, 
  FileText, 
  Upload, 
  ImageIcon,
  Folder, 
  ChevronDown, 
  ChevronRight, 
  Loader2, 
  ToggleLeft, 
  ToggleRight,
  DollarSign
} from 'lucide-react'

type Product = {
  id: string; storeId: string; categoryId: string;
  name: string; image?: string; sku: string; barcode: string; description?: string;
  discounts?: { discount: { startDate?: string | null; endDate?: string | null; type: 'PERCENTAGE' | 'FIXED'; value: number; isActive: boolean } }[];
  costPrice: number; sellingPrice: number; stock: number; minimumStock: number;
  isActive: boolean; category?: { name: string }
}
type StoreType = { id: string; name: string }
type CategoryType = { id: string; name: string }

const EMPTY_FORM = {
  storeId: '', categoryId: '', name: '', image: '', sku: '', barcode: '',
  description: '', costPrice: 0, sellingPrice: 0, stock: 0, minimumStock: 0, isActive: true,
}

function getMasterDiscount(p: Product) {
  const d = p.discounts?.[0]?.discount
  if (!d) return 0
  return d.type === 'PERCENTAGE' ? Math.floor(p.sellingPrice * d.value / 100) : d.value
}
function getFinalPrice(p: Product) { 
  return Math.max(0, p.sellingPrice - getMasterDiscount(p)) 
}
function fmt(n: number) { 
  return n.toLocaleString('id-ID') 
}

export default function ProductPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [stores, setStores] = useState<StoreType[]>([])
  const [categories, setCategories] = useState<CategoryType[]>([])
  const [selectedStoreId, setSelectedStoreId] = useState('')
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isOpenModal, setIsOpenModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [formData, setFormData] = useState(EMPTY_FORM)

  useEffect(() => { 
    initPage() 
  }, [])
  
  useEffect(() => { 
    if (selectedStoreId) { 
      loadProducts(selectedStoreId)
      loadCategories(selectedStoreId) 
    } 
  }, [selectedStoreId])

  async function initPage() {
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` }
      const { data } = await api.get('/stores', { headers })
      setStores(data)
      const cached = localStorage.getItem('storeId')
      const init = data.find((s: StoreType) => s.id === cached)?.id || data[0]?.id || ''
      if (init) { 
        setSelectedStoreId(init)
        setFormData(p => ({ ...p, storeId: init })) 
      } else {
        setLoading(false) 
      }
    } catch { 
      setLoading(false) 
    }
  }

  async function loadProducts(storeId: string) {
    setLoading(true)
    try {
      const { data } = await api.get(`/products/store/${storeId}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      setProducts(data)
    } catch (err) {
      console.error(err)
    } finally { 
      setLoading(false) 
    }
  }

  async function loadCategories(storeId: string) {
    try {
      const { data } = await api.get(`/categories/store/${storeId}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      setCategories(data)
    } catch { }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => {
      const img = new Image()
      img.src = reader.result as string
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let w = img.width
        let h = img.height
        const max = 150
        if (w > h) { 
          if (w > max) { 
            h *= max / w
            w = max 
          } 
        } else { 
          if (h > max) { 
            w *= max / h
            h = max 
          } 
        }
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (ctx) { 
          ctx.drawImage(img, 0, 0, w, h)
          setFormData(p => ({ ...p, image: canvas.toDataURL('image/jpeg', 0.6) })) 
        }
      }
    }
    reader.readAsDataURL(file)
  }

  function openCreate() {
    setEditingId(null)
    setFormData({ ...EMPTY_FORM, storeId: selectedStoreId, categoryId: categories[0]?.id || '' })
    setIsOpenModal(true)
  }

  function openEdit(p: Product) {
    setEditingId(p.id)
    loadCategories(p.storeId)
    setFormData({ 
      storeId: p.storeId, 
      categoryId: p.categoryId || '', 
      name: p.name, 
      image: p.image || '', 
      sku: p.sku || '', 
      barcode: p.barcode || '', 
      description: p.description || '', 
      costPrice: p.costPrice, 
      sellingPrice: p.sellingPrice, 
      stock: p.stock, 
      minimumStock: p.minimumStock, 
      isActive: p.isActive 
    })
    setIsOpenModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` }
    const payload: any = { 
      storeId: formData.storeId, 
      categoryId: formData.categoryId, 
      name: formData.name, 
      costPrice: Number(formData.costPrice), 
      sellingPrice: Number(formData.sellingPrice), 
      stock: Number(formData.stock), 
      minimumStock: Number(formData.minimumStock), 
      isActive: formData.isActive 
    }
    if (formData.sku?.trim()) payload.sku = formData.sku.trim()
    if (formData.barcode?.trim()) payload.barcode = formData.barcode.trim()
    if (formData.description?.trim()) payload.description = formData.description.trim()
    if (formData.image?.trim()) payload.image = formData.image.trim()
    
    try {
      if (editingId) { 
        const { storeId, ...u } = payload
        await api.patch(`/products/${editingId}`, u, { headers }) 
      } else {
        await api.post('/products', payload, { headers })
      }
      setIsOpenModal(false)
      loadProducts(selectedStoreId)
    } catch (err: any) { 
      alert(err.response?.data?.message || 'Gagal menyimpan') 
    } finally { 
      setIsSubmitting(false) 
    }
  }

  async function remove(id: string) {
    if (!confirm('Hapus produk ini dari katalog?')) return
    setDeletingId(id)
    try { 
      await api.delete(`/products/${id}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      loadProducts(selectedStoreId) 
    } catch (err) {
      console.error(err)
    } finally { 
      setDeletingId(null) 
    }
  }

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.barcode?.includes(searchQuery)
  )

  const lowStockCount = products.filter(p => p.stock <= p.minimumStock && p.isActive).length

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 bg-blue-50 border border-blue-100/50 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
            <Package size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900">Katalog Produk</h1>
              {!loading && (
                <span className="rounded-full bg-blue-50 border border-blue-100 text-blue-600 px-2 py-0.5 text-[10px] font-extrabold tracking-wide">
                  {products.length}
                </span>
              )}
            </div>
            <p className="text-xs font-semibold text-slate-450 mt-0.5">Kelola inventori stok, penentuan harga jual, SKU, barcode, dan limit stok cabang</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 shrink-0">
          {lowStockCount > 0 && (
            <div className="flex items-center gap-1.5 bg-amber-50/50 border border-amber-200/60 rounded-xl px-3 py-2 text-[10px] font-bold text-amber-700">
              <AlertTriangle size={12} />
              <span>{lowStockCount} Stok Menipis</span>
            </div>
          )}
          <button 
            onClick={openCreate}
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-xs font-bold text-white transition-all shadow-3xs active:scale-97 cursor-pointer"
          >
            <Plus size={15} />
            <span>Tambah Produk</span>
          </button>
        </div>
      </div>

      {/* Toolbar / Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        
        {/* Search */}
        <div className="relative flex-1">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input 
            type="text"
            placeholder="Cari produk berdasarkan nama, SKU, atau kode barcode..." 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)} 
            className="w-full rounded-xl border border-slate-200/80 pl-11 pr-11 py-3.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-semibold"
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

        {/* Store Select */}
        <div className="relative shrink-0">
          <select 
            value={selectedStoreId} 
            onChange={e => {
              setSelectedStoreId(e.target.value)
              localStorage.setItem('storeId', e.target.value)
            }}
            className="w-full sm:w-60 appearance-none bg-white border border-slate-200/80 pl-4 pr-10 py-3.5 rounded-xl text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 cursor-pointer transition-all"
          >
            {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        {!loading && filtered.length > 0 && (
          <span className="text-[10.5px] font-bold text-slate-400 shrink-0 sm:ml-auto">
            Menampilkan {filtered.length} dari {products.length} produk
          </span>
        )}
      </div>

      {/* Table List */}
      <div className="rounded-2xl border border-slate-200/70 bg-white shadow-3xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                <th className="p-4 pl-6 w-16"></th>
                <th className="p-4">Nama Produk</th>
                <th className="p-4">Kategori</th>
                <th className="p-4">SKU / Barcode</th>
                <th className="p-4">Harga Modal</th>
                <th className="p-4">Harga Jual</th>
                <th className="p-4">Stok</th>
                <th className="p-4">Status</th>
                <th className="p-4 pr-6 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-655 font-semibold">
              {loading ? (
                [1, 2, 3, 4].map(i => (
                  <tr key={i}>
                    <td colSpan={9} className="p-5 pl-6">
                      <div className="h-4 animate-pulse rounded-lg bg-slate-100" style={{ width: `${50 + i * 8}%` }} />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-16 text-center text-slate-400">
                    <Package size={32} className="mx-auto text-slate-350 opacity-60 mb-3" />
                    <p className="text-xs font-bold text-slate-500">
                      {searchQuery ? 'Tidak ada produk yang cocok' : 'Katalog produk masih kosong'}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {searchQuery ? 'Coba ubah kata kunci pencarian Anda' : 'Klik "Tambah Produk" untuk mendaftarkan barang baru ke cabang ini'}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map(p => {
                  const disc = getMasterDiscount(p)
                  const final = getFinalPrice(p)
                  const lowStock = p.stock <= p.minimumStock
                  const discInfo = p.discounts?.[0]?.discount
                  return (
                    <tr key={p.id} className="group hover:bg-slate-50/45 transition-colors">
                      
                      {/* Image thumbnail */}
                      <td className="p-4 pl-6">
                        {p.image ? (
                          <img src={p.image} alt={p.name} className="w-10 h-10 rounded-lg object-cover border border-slate-200" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                            <ImageIcon size={14} />
                          </div>
                        )}
                      </td>

                      {/* Name */}
                      <td className="p-4 max-w-[200px]">
                        <p className="font-extrabold text-slate-900 text-xs truncate">{p.name}</p>
                        {p.description && (
                          <p className="text-[10px] text-slate-400 font-semibold truncate mt-0.5 max-w-[180px]">{p.description}</p>
                        )}
                      </td>

                      {/* Category */}
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200/60 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-lg">
                          <Folder size={11} className="text-slate-400" />
                          <span>{p.category?.name || 'Umum'}</span>
                        </span>
                      </td>

                      {/* SKU / Barcode */}
                      <td className="p-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono leading-none">
                            <Tag size={10} className="text-slate-400" />
                            <span>{p.sku || '—'}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono leading-none">
                            <Barcode size={10} className="text-slate-400" />
                            <span>{p.barcode || '—'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Cost Price */}
                      <td className="p-4 font-mono text-slate-600">
                        Rp {fmt(p.costPrice)}
                      </td>

                      {/* Selling Price & Discounts */}
                      <td className="p-4 font-mono">
                        <span className={`text-xs font-bold ${disc > 0 ? 'text-emerald-600' : 'text-slate-900'}`}>
                          Rp {fmt(final)}
                        </span>
                        {disc > 0 && (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-slate-350 line-through">Rp {fmt(p.sellingPrice)}</span>
                            <span className="text-[8.5px] font-extrabold bg-rose-50 border border-rose-100 text-rose-600 px-1 rounded">
                              {discInfo?.type === 'PERCENTAGE' ? `${discInfo.value}%` : `−Rp ${fmt(disc)}`}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Stock Status */}
                      <td className="p-4">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-mono text-xs font-extrabold ${lowStock && p.isActive ? 'text-amber-600' : 'text-slate-900'}`}>
                            {p.stock}
                          </span>
                          {lowStock && p.isActive && (
                            <span title="Stok berada di bawah batas minimum" className="text-amber-500">
                              <AlertTriangle size={12} />
                            </span>
                          )}
                        </div>
                        <span className="text-[9.5px] text-slate-350 font-semibold block mt-0.5">min. {p.minimumStock}</span>
                      </td>

                      {/* Status Toggle */}
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-bold border text-[9px] uppercase tracking-wider ${
                          p.isActive ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-400'
                        }`}>
                          <span className={`h-1 w-1 rounded-full ${p.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          {p.isActive ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>

                      {/* Action buttons */}
                      <td className="p-4 pr-6">
                        <div className="flex gap-1.5 opacity-80 md:opacity-0 md:group-hover:opacity-100 justify-end transition-all duration-200">
                          <button 
                            onClick={() => openEdit(p)}
                            className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-slate-50 text-blue-600 hover:text-blue-700 transition-colors"
                            title="Edit Produk"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button 
                            onClick={() => remove(p.id)}
                            disabled={deletingId === p.id}
                            className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-red-50 text-slate-400 hover:text-red-650 transition-colors disabled:opacity-50"
                            title="Hapus Produk"
                          >
                            {deletingId === p.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={14} />}
                          </button>
                        </div>
                      </td>

                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Dialog */}
      {isOpenModal && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={e => { if (e.target === e.currentTarget) setIsOpenModal(false) }}
        >
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200/80 animate-in slide-in-from-bottom-3 duration-250 flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-6 pb-0 flex items-start justify-between shrink-0">
              <div>
                <h3 className="text-base font-black text-slate-950">{editingId ? 'Edit Detail Barang' : 'Daftarkan Barang Baru'}</h3>
                <p className="text-[10.5px] font-semibold text-slate-400 mt-0.5">
                  {editingId ? 'Ubah informasi data persediaan barang toko' : 'Isi formulir berikut untuk menambahkan item baru ke katalog'}
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setIsOpenModal(false)}
                className="h-8 w-8 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-650 hover:bg-slate-100 transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            <div className="h-px bg-slate-100 my-4 mx-6 shrink-0" />

            {/* Modal Body (Scrollable) */}
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4">
                
                {/* Photo Upload */}
                <div className="space-y-2">
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block">Foto Produk</label>
                  <div className="flex items-center gap-4">
                    {formData.image ? (
                      <div className="relative w-16 h-16 shrink-0">
                        <img src={formData.image} alt="Preview" className="w-full h-full object-cover rounded-xl border border-slate-200" />
                        <button 
                          type="button" 
                          onClick={() => setFormData(p => ({ ...p, image: '' }))}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-905 border border-slate-800 text-white flex items-center justify-center cursor-pointer text-[9px] hover:bg-slate-800 transition-colors"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ) : (
                      <label className="w-16 h-16 shrink-0 border-2 border-dashed border-slate-200 bg-slate-50 hover:bg-slate-100 rounded-xl flex flex-col items-center justify-center cursor-pointer gap-1 text-slate-400 hover:text-slate-500 transition-all">
                        <Upload size={16} />
                        <span className="text-[8px] font-extrabold uppercase tracking-wider">Upload</span>
                        <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                      </label>
                    )}
                    <div className="min-w-0 flex-1 leading-relaxed">
                      <p className="text-[10px] font-semibold text-slate-400">JPG, PNG, atau WEBP. Gambar akan dikompresi otomatis ke resolusi optimal 150×150px.</p>
                    </div>
                  </div>
                </div>

                {/* Branch and Category placement */}
                <div className="space-y-2">
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block">Penempatan</label>
                  <div className="grid gap-3 grid-cols-2">
                    <div className="relative">
                      <select 
                        value={formData.storeId} 
                        disabled={!!editingId}
                        onChange={(e) => { 
                          setFormData({ ...formData, storeId: e.target.value, categoryId: '' })
                          loadCategories(e.target.value) 
                        }}
                        className="w-full appearance-none bg-slate-50/50 border border-slate-200/80 px-3 py-3 rounded-xl text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 cursor-pointer transition-all disabled:opacity-50"
                      >
                        {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                      <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>

                    <div className="relative">
                      <select 
                        value={formData.categoryId} 
                        required
                        onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                        className="w-full appearance-none bg-slate-50/50 border border-slate-200/80 px-3 py-3 rounded-xl text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 cursor-pointer transition-all"
                      >
                        <option value="" disabled>Pilih kategori</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Identity Name */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block">Nama Barang *</label>
                  <div className="relative">
                    <Package size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Contoh: Gamis Silk Premium Laila"
                      className="w-full rounded-xl border border-slate-200 pl-11 pr-4 py-3 text-xs text-slate-900 placeholder:text-slate-450 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-semibold"
                    />
                  </div>
                </div>

                {/* SKU & Barcode */}
                <div className="grid gap-3 grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">Kode SKU</label>
                    <div className="relative">
                      <Layers size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        value={formData.sku}
                        onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                        placeholder="Otomatis jika kosong"
                        className="w-full rounded-xl border border-slate-200 pl-10 pr-3 py-3 text-xs text-slate-900 placeholder:text-slate-450 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-mono font-semibold"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">Kode Barcode</label>
                    <div className="relative">
                      <Barcode size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        value={formData.barcode}
                        onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                        placeholder="Otomatis jika kosong"
                        className="w-full rounded-xl border border-slate-200 pl-10 pr-3 py-3 text-xs text-slate-900 placeholder:text-slate-450 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-mono font-semibold"
                      />
                    </div>
                  </div>
                </div>

                {/* Prices */}
                <div className="space-y-2">
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block">Harga Barang</label>
                  <div className="grid gap-3 grid-cols-2">
                    <div className="relative">
                      <DollarSign size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="number"
                        min={0}
                        required
                        value={formData.costPrice || ''}
                        onChange={(e) => setFormData({ ...formData, costPrice: Number(e.target.value) })}
                        placeholder="Harga Modal (Rp)"
                        className="w-full rounded-xl border border-slate-200 pl-10 pr-3 py-3 text-xs text-slate-900 placeholder:text-slate-455 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-semibold"
                      />
                    </div>

                    <div className="relative">
                      <DollarSign size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="number"
                        min={0}
                        required
                        value={formData.sellingPrice || ''}
                        onChange={(e) => setFormData({ ...formData, sellingPrice: Number(e.target.value) })}
                        placeholder="Harga Jual (Rp)"
                        className="w-full rounded-xl border border-slate-200 pl-10 pr-3 py-3 text-xs text-slate-900 placeholder:text-slate-455 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-semibold"
                      />
                    </div>
                  </div>

                  {/* Profit Margin indicator */}
                  {formData.costPrice > 0 && formData.sellingPrice > 0 && (
                    <div className="flex items-center gap-2 bg-emerald-50/60 border border-emerald-200/60 rounded-xl px-4 py-2.5 text-[11px] font-bold text-emerald-700">
                      <span>Estimasi Margin Keuntungan Cabang:</span>
                      <span className="font-mono text-xs font-black">
                        Rp {fmt(formData.sellingPrice - formData.costPrice)} ({((formData.sellingPrice - formData.costPrice) / formData.costPrice * 100).toFixed(1)}%)
                      </span>
                    </div>
                  )}
                </div>

                {/* Stock Controls */}
                <div className="space-y-2">
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block">Inventori Stok</label>
                  <div className="grid gap-3 grid-cols-2">
                    <div className="relative">
                      <Boxes size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="number"
                        min={0}
                        value={formData.stock || ''}
                        onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                        placeholder="Stok Awal Barang"
                        className="w-full rounded-xl border border-slate-200 pl-10 pr-3 py-3 text-xs text-slate-900 placeholder:text-slate-455 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-semibold"
                      />
                    </div>

                    <div className="relative">
                      <AlertTriangle size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="number"
                        min={0}
                        value={formData.minimumStock || ''}
                        onChange={(e) => setFormData({ ...formData, minimumStock: Number(e.target.value) })}
                        placeholder="Limit Minimum Stok"
                        className="w-full rounded-xl border border-slate-200 pl-10 pr-3 py-3 text-xs text-slate-900 placeholder:text-slate-455 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-semibold"
                      />
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block">Deskripsi & Keterangan</label>
                  <div className="relative">
                    <FileText size={14} className="absolute left-4 top-3.5 text-slate-400 pointer-events-none" />
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Masukkan deskripsi varian tunik/gamis, warna, ukuran baju, dll..."
                      rows={3}
                      className="w-full rounded-xl border border-slate-200 pl-11 pr-4 py-3 text-xs text-slate-900 placeholder:text-slate-455 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all resize-none font-semibold"
                    />
                  </div>
                </div>

                {/* Active Toggle Card */}
                <div 
                  onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                  className="flex items-center justify-between p-4 bg-slate-50/60 border border-slate-200 rounded-xl cursor-pointer hover:border-slate-300 transition-colors select-none"
                >
                  <div className="leading-snug pr-4">
                    <p className="text-xs font-bold text-slate-900">Tampilkan di Menu Terminal Kasir</p>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Produk ini dapat dipilih oleh staf kasir saat melayani transaksi penjualan</p>
                  </div>
                  <button type="button" className="shrink-0 text-blue-600">
                    {formData.isActive ? (
                      <ToggleRight size={30} />
                    ) : (
                      <ToggleLeft size={30} className="text-slate-350" />
                    )}
                  </button>
                </div>

              </div>

              {/* Modal Actions Footer */}
              <div className="p-6 border-t border-slate-100 flex gap-3 shrink-0 bg-slate-50/50">
                <button 
                  type="button" 
                  onClick={() => setIsOpenModal(false)} 
                  disabled={isSubmitting}
                  className="flex-1 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 py-3.5 text-xs font-bold text-slate-600 transition-all active:scale-98 cursor-pointer disabled:opacity-50"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting || !formData.categoryId}
                  className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700 py-3.5 text-xs font-bold text-white shadow-md shadow-blue-600/15 transition-all active:scale-98 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <span>{editingId ? 'Simpan Perubahan' : 'Daftarkan Produk'}</span>
                      <ChevronRight size={14} />
                    </>
                  )}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  )
}
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  Package,
  Printer,
  Boxes,
  ArrowLeft,
  Loader2,
  ChevronDown,
  Plus,
  Edit3,
  Trash2,
  X,
  AlertTriangle,
  Folder,
  Tag,
  DollarSign,
  Barcode,
  Layers,
  FileText,
  ToggleLeft,
  ToggleRight,
  ChevronRight
} from 'lucide-react'
import BarcodeRender from 'react-barcode'
import { api } from '@/lib/api'

type Product = {
  id: string
  storeId: string
  categoryId?: string | null
  name: string
  image?: string
  sku: string
  barcode: string | null
  description?: string
  costPrice: number
  sellingPrice: number
  stock: number
  minimumStock: number
  isActive: boolean
  category?: { name: string }
}

type CategoryType = {
  id: string
  name: string
}

export default function ProductsPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<CategoryType[]>([{ id: 'ALL', name: 'Semua produk' }])
  const [selectedCategoryId, setSelectedCategoryId] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isAdminKasir, setIsAdminKasir] = useState(false)
  const [storeId, setStoreId] = useState('')

  // Modal mutation states
  const [isOpenModal, setIsOpenModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const EMPTY_FORM = {
    categoryId: '',
    name: '',
    image: '',
    sku: '',
    barcode: '',
    description: '',
    costPrice: 0,
    sellingPrice: 0,
    stock: 0,
    minimumStock: 0,
    isActive: true,
  }
  const [formData, setFormData] = useState(EMPTY_FORM)

  useEffect(() => {
    const cachedStoreId = localStorage.getItem('storeId') || ''
    setStoreId(cachedStoreId)
    if (cachedStoreId) {
      loadData(cachedStoreId)
    } else {
      setLoading(false)
    }

    const cachedCashier = localStorage.getItem('cashier')
    if (cachedCashier) {
      try {
        const cashierObj = JSON.parse(cachedCashier)
        if (cashierObj?.name && cashierObj.name.toLowerCase().includes('admin')) {
          setIsAdminKasir(true)
        }
      } catch (e) {
        console.error(e)
      }
    }
  }, [])

  async function loadData(id: string) {
    setLoading(true)
    const token = localStorage.getItem('token')
    const headers = { Authorization: `Bearer ${token}` }

    try {
      const [productsRes, categoriesRes] = await Promise.all([
        api.get(`/products/store/${id}`, { headers }),
        api.get(`/categories/store/${id}`, { headers })
      ])

      setProducts(productsRes.data || [])

      if (categoriesRes.data) {
        setCategories([
          { id: 'ALL', name: 'Semua produk' },
          ...categoriesRes.data.map((c: any) => ({ id: c.id, name: c.name }))
        ])
      }
    } catch (error) {
      console.error('Gagal memuat data inventori:', error)
    } finally {
      setLoading(false)
    }
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
    setFormData({ 
      ...EMPTY_FORM, 
      categoryId: categories.find(c => c.id !== 'ALL')?.id || '' 
    })
    setIsOpenModal(true)
  }

  function openEdit(p: Product) {
    setEditingId(p.id)
    setFormData({ 
      categoryId: p.categoryId || '', 
      name: p.name, 
      image: p.image || '', 
      sku: p.sku || '', 
      barcode: p.barcode || '', 
      description: p.description || '', 
      costPrice: p.costPrice || 0, 
      sellingPrice: p.sellingPrice, 
      stock: p.stock, 
      minimumStock: p.minimumStock, 
      isActive: p.isActive !== false 
    })
    setIsOpenModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    const token = localStorage.getItem('token')
    const headers = { Authorization: `Bearer ${token}` }
    const payload: any = { 
      storeId: storeId, 
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
        const targetStock = Number(formData.stock) || 0
        const createPayload = { ...payload, stock: 0 }
        const res = await api.post('/products', createPayload, { headers })
        const newProd = res.data
        if (newProd && newProd.id && targetStock > 0) {
          const movementPayload = {
            storeId: storeId,
            productId: newProd.id,
            type: 'IN',
            qty: targetStock,
            note: 'Stok awal saat pembuatan produk baru',
          }
          await api.post('/stock-movements', movementPayload, { headers })
        }
      }
      setIsOpenModal(false)
      loadData(storeId)
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
      loadData(storeId) 
    } catch (err) {
      console.error(err)
    } finally { 
      setDeletingId(null) 
    }
  }

  function handlePrintSingleBarcode(barcodeData: string, productName: string) {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(`
      <html>
        <head>
          <title>Label - ${productName}</title>
          <style>
            body { display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: sans-serif; margin: 0; padding: 10px; }
            .label { text-align: center; font-size: 10px; font-weight: bold; margin-bottom: 2px; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          </style>
        </head>
        <body>
          <div class="label">${productName}</div>
          <div id="bc"></div>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
          <script>
            const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            document.getElementById("bc").appendChild(svg);
            JsBarcode(svg, "${barcodeData}", { format: "CODE128", width: 1.4, height: 40, displayValue: true, fontSize: 11 });
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  function handlePrintAllBarcodes() {
    const productsWithBarcode = filtered.filter(p => p.barcode);
    if (productsWithBarcode.length === 0) return alert('Tidak ada produk yang memiliki kode barcode.');

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;

    printWindow.document.write(`
    <html>
      <head>
        <style>
          @page { size: auto; margin: 5mm; }
          body { font-family: 'Courier New', monospace; padding: 10px; }
          .label { 
            width: 300px; 
            border: 1px solid #000; 
            padding: 10px; 
            margin-bottom: 10px;
            display: flex; 
            flex-direction: column; 
            align-items: center;
            box-sizing: border-box;
            page-break-inside: avoid;
          }
          .name { font-size: 14px; font-weight: bold; margin-bottom: 8px; text-transform: uppercase; text-align: center; }
          .barcode-container { width: 100%; display: flex; justify-content: center; }
        </style>
      </head>
      <body>
        ${productsWithBarcode.map(i => `
          <div class="label">
            <div class="name">${i.name}</div>
            <div class="barcode-container">
              <svg class="barcode" data-barcode="${i.barcode}"></svg>
            </div>
            <div style="font-size: 10px; margin-top: 5px;">${i.barcode}</div>
          </div>
        `).join('')}
        
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
        <script>
          document.querySelectorAll('.barcode').forEach(svg => {
            JsBarcode(svg, svg.getAttribute('data-barcode'), { 
              format: "CODE128", 
              width: 2, 
              height: 40, 
              displayValue: false, 
              margin: 0 
            });
          });
          
          window.onload = () => {
            window.print();
            window.close();
          };
        </script>
      </body>
    </html>
  `);
    printWindow.document.close();
  }

  const filtered = useMemo(() => {
    return products.filter((x) => {
      const matchesSearch = x.name.toLowerCase().includes(search.toLowerCase()) ||
        x.sku.toLowerCase().includes(search.toLowerCase()) ||
        (x.barcode && x.barcode.includes(search))

      const matchesCategory = selectedCategoryId === 'ALL' || x.categoryId === selectedCategoryId

      return matchesSearch && matchesCategory
    })
  }, [products, search, selectedCategoryId])

  const formatIDR = (num: number) => `Rp ${num.toLocaleString('id-ID')}`
  const lowStockCount = products.filter(p => p.stock <= p.minimumStock && p.isActive).length

  return (
    <div className="space-y-6">

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/dashboard/store')}
            className="p-1.5 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-3xs bg-white cursor-pointer"
            title="Kembali ke Dashboard"
          >
            <ArrowLeft size={14} />
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Katalog Produk</h1>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">Lihat ketersediaan stok aktual gudang, nilai jual, dan manifestasi label barcode.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {lowStockCount > 0 && (
            <div className="flex items-center gap-1.5 bg-amber-50/50 border border-amber-200/60 rounded-xl px-3 py-2 text-[10px] font-bold text-amber-700">
              <AlertTriangle size={12} />
              <span>{lowStockCount} Stok Menipis</span>
            </div>
          )}
          {isAdminKasir && (
            <button 
              onClick={openCreate}
              className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-xs font-bold text-white transition-all shadow-3xs active:scale-97 cursor-pointer"
            >
              <Plus size={15} />
              <span>Tambah Produk</span>
            </button>
          )}
          <button
            onClick={handlePrintAllBarcodes}
            disabled={loading || filtered.length === 0}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-3xs disabled:opacity-40 transition-all cursor-pointer"
          >
            <Printer size={13} className="text-indigo-600" />
            Cetak Semua Barcode ({filtered.filter(p => p.barcode).length})
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari produk berdasarkan nama, SKU, atau kode barcode..."
            className="w-full rounded-xl border border-slate-250/70 bg-white pl-11 pr-4 py-3.5 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-3xs"
          />
        </div>

        <div className="text-[10px] font-bold text-slate-400 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg shrink-0">
          Ditemukan: <span className="font-extrabold text-slate-900 font-mono">{filtered.length}</span> Item
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategoryId(cat.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer active:scale-[0.98] ${selectedCategoryId === cat.id
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-3xs'
                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
              }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-3xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                <th className="p-4 pl-6 w-16"></th>
                <th className="p-4">Nama Barang</th>
                <th className="p-4">Kategori</th>
                <th className="p-4">SKU / Barcode</th>
                <th className="p-4">Harga Modal</th>
                <th className="p-4">Harga Jual</th>
                <th className="p-4">Stok / Min. Stok</th>
                <th className="p-4">Status</th>
                <th className="p-4 pr-6 text-right">Aksi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-600 font-semibold">
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-10 text-center">
                    <Loader2 className="w-5 h-5 animate-spin text-slate-400 mx-auto" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="p-3 bg-slate-50 border border-slate-150 rounded-2xl text-slate-400">
                        <Boxes className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-bold text-slate-650">Produk tidak ditemukan</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((product) => {
                  const isLowStock = product.stock <= product.minimumStock
                  return (
                    <tr key={product.id} className="group hover:bg-slate-50/45 transition-colors">
                      <td className="p-4 pl-6">
                        {product.image ? (
                          <img src={product.image} alt={product.name} className="w-10 h-10 rounded-lg object-cover border border-slate-200" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                            <Package size={14} />
                          </div>
                        )}
                      </td>
                      <td className="p-4 max-w-[200px]">
                        <p className="font-extrabold text-slate-900 text-xs truncate">{product.name}</p>
                        {product.description && (
                          <p className="text-[10px] text-slate-400 font-semibold truncate mt-0.5 max-w-[180px]">{product.description}</p>
                        )}
                      </td>

                      <td className="p-4">
                        <span className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200/60 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-lg">
                          <span>{categories.find(c => c.id === product.categoryId)?.name || 'Umum'}</span>
                        </span>
                      </td>

                      <td className="p-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono leading-none">
                            <Tag size={10} className="text-slate-400" />
                            <span>{product.sku || '—'}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono leading-none">
                            <Barcode size={10} className="text-slate-400" />
                            <span>{product.barcode || '—'}</span>
                          </div>
                        </div>
                      </td>

                      <td className="p-4 font-mono text-slate-600">
                        {formatIDR(product.costPrice || 0)}
                      </td>

                      <td className="p-4 font-mono font-bold text-slate-900">
                        {formatIDR(product.sellingPrice)}
                      </td>

                      <td className="p-4">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-mono text-xs font-extrabold ${isLowStock && product.isActive ? 'text-amber-600' : 'text-slate-900'}`}>
                            {product.stock}
                          </span>
                          {isLowStock && product.isActive && (
                            <span title="Stok berada di bawah batas minimum (Stok Minimum)" className="text-amber-500 inline-flex items-center gap-0.5">
                              <AlertTriangle size={12} />
                              <span className="text-[8px] font-bold bg-amber-50 px-1 py-0.5 rounded border border-amber-100 text-amber-600 scale-90 origin-left">Min</span>
                            </span>
                          )}
                        </div>
                        <span className="text-[9.5px] text-slate-350 font-semibold block mt-0.5">Min. Stok: {product.minimumStock}</span>
                      </td>

                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-bold border text-[9px] uppercase tracking-wider ${
                          product.isActive !== false ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-400'
                        }`}>
                          <span className={`h-1 w-1 rounded-full ${product.isActive !== false ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          {product.isActive !== false ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>

                      <td className="p-4 pr-6 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {product.barcode && (
                            <button
                              type="button"
                              onClick={() => handlePrintSingleBarcode(product.barcode!, product.name)}
                              className="p-1.5 text-slate-405 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                              title="Cetak Label Item Ini"
                            >
                              <Printer size={14} />
                            </button>
                          )}
                          {isAdminKasir && (
                            <>
                              <button 
                                onClick={() => openEdit(product)}
                                className="p-1.5 text-blue-605 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer text-blue-600"
                                title="Edit Produk"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button 
                                onClick={() => remove(product.id)}
                                disabled={deletingId === product.id}
                                className="p-1.5 text-slate-405 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                                title="Hapus Produk"
                              >
                                {deletingId === product.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={14} />}
                              </button>
                            </>
                          )}
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

      {isOpenModal && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={e => { if (e.target === e.currentTarget) setIsOpenModal(false) }}
        >
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200/80 animate-in slide-in-from-bottom-3 duration-250 flex flex-col max-h-[90vh]">
            
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
                className="h-8 w-8 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="h-px bg-slate-100 my-4 mx-6 shrink-0" />

            <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4">
                
                <div className="space-y-2">
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block">Foto Produk</label>
                  <div className="flex items-center gap-4">
                    {formData.image ? (
                      <div className="relative w-16 h-16 shrink-0">
                        <img src={formData.image} alt="Preview" className="w-full h-full object-cover rounded-xl border border-slate-200" />
                        <button 
                          type="button" 
                          onClick={() => setFormData(p => ({ ...p, image: '' }))}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-900 border border-slate-800 text-white flex items-center justify-center cursor-pointer text-[9px] hover:bg-slate-800 transition-colors"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ) : (
                      <label className="w-16 h-16 shrink-0 border-2 border-dashed border-slate-200 bg-slate-50 hover:bg-slate-100 rounded-xl flex flex-col items-center justify-center cursor-pointer gap-1 text-slate-400 hover:text-slate-500 transition-all">
                        <Plus size={16} />
                        <span className="text-[8px] font-extrabold uppercase tracking-wider">Upload</span>
                        <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                      </label>
                    )}
                    <div className="min-w-0 flex-1 leading-relaxed">
                      <p className="text-[10px] font-semibold text-slate-400">JPG, PNG, atau WEBP. Gambar akan dikompresi otomatis ke resolusi optimal 150×150px.</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block">Kategori *</label>
                  <div className="relative">
                    <select 
                      value={formData.categoryId} 
                      required
                      onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                      className="w-full appearance-none bg-slate-50/50 border border-slate-200/80 px-3 py-3 rounded-xl text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 cursor-pointer transition-all"
                    >
                      <option value="" disabled>Pilih kategori</option>
                      {categories.filter(c => c.id !== 'ALL').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

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
                      className="w-full rounded-xl border border-slate-200 pl-11 pr-4 py-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-semibold"
                    />
                  </div>
                </div>

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
                        className="w-full rounded-xl border border-slate-200 pl-10 pr-3 py-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-mono font-semibold"
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
                        className="w-full rounded-xl border border-slate-200 pl-10 pr-3 py-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-mono font-semibold"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block">Harga Barang (Harga Modal & Harga Jual)</label>
                  <div className="grid gap-3 grid-cols-2">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 block">Harga Modal</span>
                      <div className="relative">
                        <DollarSign size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                          type="number"
                          min={0}
                          required
                          value={formData.costPrice ?? ''}
                          onChange={(e) => setFormData({ ...formData, costPrice: Number(e.target.value) })}
                          placeholder="Harga Modal (Rp)"
                          className="w-full rounded-xl border border-slate-200 pl-10 pr-3 py-3 text-xs text-slate-900 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-semibold"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 block">Harga Jual</span>
                      <div className="relative">
                        <DollarSign size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                          type="number"
                          min={0}
                          required
                          value={formData.sellingPrice ?? ''}
                          onChange={(e) => setFormData({ ...formData, sellingPrice: Number(e.target.value) })}
                          placeholder="Harga Jual (Rp)"
                          className="w-full rounded-xl border border-slate-200 pl-10 pr-3 py-3 text-xs text-slate-900 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-semibold"
                        />
                      </div>
                    </div>
                  </div>

                  {formData.costPrice > 0 && formData.sellingPrice > 0 && (
                    <div className="flex items-center gap-2 bg-emerald-50/60 border border-emerald-200/60 rounded-xl px-4 py-2.5 text-[11px] font-bold text-emerald-700">
                      <span>Estimasi Margin Keuntungan Cabang:</span>
                      <span className="font-mono text-xs font-black">
                        Rp {formatIDR(formData.sellingPrice - formData.costPrice)} ({((formData.sellingPrice - formData.costPrice) / formData.costPrice * 100).toFixed(1)}%)
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block">Inventori Stok</label>
                  <div className="grid gap-3 grid-cols-2">
                    <div className="relative">
                      <Boxes size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="number"
                        min={0}
                        value={formData.stock ?? ''}
                        onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                        placeholder="Stok Awal Barang"
                        className="w-full rounded-xl border border-slate-200 pl-10 pr-3 py-3 text-xs text-slate-900 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-semibold"
                      />
                    </div>

                    <div className="relative">
                      <AlertTriangle size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="number"
                        min={0}
                        value={formData.minimumStock ?? ''}
                        onChange={(e) => setFormData({ ...formData, minimumStock: Number(e.target.value) })}
                        placeholder="Limit Minimum Stok"
                        className="w-full rounded-xl border border-slate-200 pl-10 pr-3 py-3 text-xs text-slate-900 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-semibold"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block">Deskripsi & Keterangan</label>
                  <div className="relative">
                    <FileText size={14} className="absolute left-4 top-3.5 text-slate-400 pointer-events-none" />
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Masukkan deskripsi varian tunik/gamis, warna, ukuran baju, dll..."
                      rows={3}
                      className="w-full rounded-xl border border-slate-200 pl-11 pr-4 py-3 text-xs text-slate-900 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all resize-none font-semibold"
                    />
                  </div>
                </div>

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
                      <ToggleRight size={30} className="text-blue-600" />
                    ) : (
                      <ToggleLeft size={30} className="text-slate-350" />
                    )}
                  </button>
                </div>

              </div>

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

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import * as XLSX from 'xlsx'
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
  DollarSign,
  CheckCircle,
  AlertCircle,
  ShoppingCart,
  Sparkles
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
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isOpenModal, setIsOpenModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [importStatus, setImportStatus] = useState<{
    isOpen: boolean;
    total: number;
    current: number;
    currentName: string;
    errors: string[];
    successCount: number;
    isFinished: boolean;
  } | null>(null)

  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false)
  const [bulkProducts, setBulkProducts] = useState<Product[]>([])
  const [bulkSearch, setBulkSearch] = useState('')
  const [bulkChangedIds, setBulkChangedIds] = useState<Set<string>>(new Set())
  const [isSavingBulk, setIsSavingBulk] = useState(false)
  const [bulkSaveProgress, setBulkSaveProgress] = useState({ current: 0, total: 0 })

  // Bundling Features States
  const [bundlingEnabled, setBundlingEnabled] = useState(false)
  const [activeTab, setActiveTab] = useState<'products' | 'bundles'>('products')
  const [bundles, setBundles] = useState<any[]>([])
  const [isOpenBundleModal, setIsOpenBundleModal] = useState(false)
  const [editingBundleId, setEditingBundleId] = useState<string | null>(null)
  const [bundleForm, setBundleForm] = useState({
    name: '', sku: '', barcode: '', sellingPrice: 0, description: '', isActive: true,
    products: [] as { productId: string; qty: number }[]
  })

  useEffect(() => { 
    initPage() 
  }, [])
  
  useEffect(() => { 
    if (selectedStoreId) { 
      loadProducts(selectedStoreId)
      loadCategories(selectedStoreId)
      loadBundles(selectedStoreId)
      setSelectedCategoryId('')
    } 
  }, [selectedStoreId])

  useEffect(() => {
    loadBundlingFeature()
    const handleConfigChange = () => {
      loadBundlingFeature()
    }
    window.addEventListener('feature-config-changed', handleConfigChange)
    return () => {
      window.removeEventListener('feature-config-changed', handleConfigChange)
    }
  }, [])

  function loadBundlingFeature() {
    const isBundling = localStorage.getItem('feature_bundling_enabled') !== 'false'
    setBundlingEnabled(isBundling)
    if (!isBundling) setActiveTab('products')
  }

  function loadBundles(storeId: string) {
    if (!storeId) return
    const stored = localStorage.getItem(`store_product_bundles_${storeId}`)
    if (stored) {
      try {
        setBundles(JSON.parse(stored))
      } catch (e) {
        setBundles([])
      }
    } else {
      setBundles([])
    }
  }

  function handleSaveBundle(e: React.FormEvent) {
    e.preventDefault()
    if (!bundleForm.name.trim()) return alert('Nama bundling wajib diisi!')
    if (bundleForm.products.length === 0) return alert('Pilih minimal satu produk untuk paket bundling!')
    if (bundleForm.products.some(p => !p.productId || p.qty <= 0)) {
      return alert('Pastikan semua produk terpilih dan jumlah kuantitas valid!')
    }

    const newBundle = {
      id: editingBundleId || `bundle_${Date.now()}`,
      storeId: selectedStoreId,
      name: bundleForm.name.trim(),
      sku: bundleForm.sku.trim() || `BND-${Date.now().toString().slice(-6)}`,
      barcode: bundleForm.barcode.trim() || `BND${Date.now().toString().slice(-6)}`,
      sellingPrice: Number(bundleForm.sellingPrice) || 0,
      description: bundleForm.description.trim(),
      isActive: bundleForm.isActive,
      products: bundleForm.products
    }

    let updatedBundles = [...bundles]
    if (editingBundleId) {
      updatedBundles = updatedBundles.map(b => b.id === editingBundleId ? newBundle : b)
    } else {
      updatedBundles.push(newBundle)
    }

    localStorage.setItem(`store_product_bundles_${selectedStoreId}`, JSON.stringify(updatedBundles))
    setBundles(updatedBundles)
    setIsOpenBundleModal(false)
    alert(editingBundleId ? 'Paket Bundling berhasil diupdate!' : 'Paket Bundling baru berhasil dibuat!')
  }

  function deleteBundle(id: string) {
    if (!confirm('Hapus paket bundling ini secara permanen?')) return
    const updated = bundles.filter(b => b.id !== id)
    localStorage.setItem(`store_product_bundles_${selectedStoreId}`, JSON.stringify(updated))
    setBundles(updated)
  }

  function getBundlePartsList(bundle: any) {
    return bundle.products.map((item: any) => {
      const prod = products.find(p => p.id === item.productId)
      return `${item.qty}x ${prod ? prod.name : 'Produk'}`
    }).join(', ')
  }

  function getBundleRetailPriceSum(bundle: any) {
    return bundle.products.reduce((sum: number, item: any) => {
      const prod = products.find(p => p.id === item.productId)
      return sum + ((prod?.sellingPrice || 0) * item.qty)
    }, 0)
  }

  function openEditBundle(b: any) {
    setEditingBundleId(b.id)
    setBundleForm({
      name: b.name,
      sku: b.sku,
      barcode: b.barcode,
      sellingPrice: b.sellingPrice,
      description: b.description || '',
      isActive: b.isActive,
      products: b.products.map((p: any) => ({ ...p }))
    })
    setIsOpenBundleModal(true)
  }

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

  function openBulkEdit() {
    setBulkProducts(products.map(p => ({ ...p })))
    setBulkChangedIds(new Set())
    setBulkSearch('')
    setIsBulkEditOpen(true)
  }

  function handleBulkChange(id: string, field: keyof Product, value: any) {
    setBulkProducts(prev => prev.map(p => {
      if (p.id === id) {
        return { ...p, [field]: value }
      }
      return p
    }))
    setBulkChangedIds(prev => {
      const next = new Set(prev)
      next.add(id)
      return next
    })
  }

  async function handleSaveBulk() {
    if (bulkChangedIds.size === 0) {
      alert('Tidak ada perubahan yang dilakukan.')
      return
    }

    if (!confirm(`Simpan perubahan untuk ${bulkChangedIds.size} produk?`)) return

    setIsSavingBulk(true)
    setBulkSaveProgress({ current: 0, total: bulkChangedIds.size })

    const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` }
    let savedCount = 0
    const changedList = bulkProducts.filter(p => bulkChangedIds.has(p.id))

    for (let i = 0; i < changedList.length; i++) {
      const p = changedList[i]
      try {
        const payload = {
          name: p.name,
          sku: p.sku || '',
          barcode: p.barcode || '',
          description: p.description || '',
          costPrice: Number(p.costPrice) || 0,
          sellingPrice: Number(p.sellingPrice) || 0,
          minimumStock: Number(p.minimumStock) || 0,
          isActive: p.isActive,
          categoryId: p.categoryId,
        }
        await api.patch(`/products/${p.id}`, payload, { headers })
        savedCount++
        setBulkSaveProgress(prev => ({ ...prev, current: i + 1 }))
      } catch (err) {
        console.error(`Failed to save product in bulk: ${p.name}`, err)
      }
    }

    setIsSavingBulk(false)
    setIsBulkEditOpen(false)
    alert(`Berhasil menyimpan ${savedCount} dari ${changedList.length} perubahan produk.`)
    loadProducts(selectedStoreId)
  }

  async function handleImportExcel(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    e.target.value = ''

    if (!selectedStoreId) {
      alert('Silakan pilih toko/cabang terlebih dahulu!')
      return
    }

    const reader = new FileReader()
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result
        const wb = XLSX.read(bstr, { type: 'binary' })
        const wsname = wb.SheetNames[0]
        const ws = wb.Sheets[wsname]
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][]

        let headerRowIdx = -1
        let nameIdx = -1
        let sellingPriceIdx = -1
        let skuIdx = -1
        let costPriceIdx = -1
        let categoryIdx = -1
        let stockIdx = -1

        const namePossibilities = ['nama produk/variant', 'nama produk', 'nama barang', 'nama', 'product name', 'name', 'nama variant', 'nama varian']
        const sellingPricePossibilities = ['harga jual', 'harga jual (rp)', 'selling price', 'harga jual cabang', 'harga jual toko', 'harga']
        const skuPossibilities = ['sku', 'kode sku', 'kode barang', 'kode']
        const costPricePossibilities = ['harga beli', 'harga modal', 'harga modal (rp)', 'cost price', 'harga beli (rp)', 'harga pokok']
        const categoryPossibilities = ['kategori', 'category', 'kelompok', 'golongan', 'grup']
        const stockPossibilities = ['stok', 'stock', 'stok awal', 'stok barang', 'stok akhir', 'jumlah stok']

        for (let r = 0; r < Math.min(data.length, 15); r++) {
          const row = data[r]
          if (!row || !Array.isArray(row)) continue
          
          const rowStr = row.map(cell => String(cell || '').trim().toLowerCase())
          
          const tempNameIdx = rowStr.findIndex(cellVal => 
            namePossibilities.some(p => cellVal === p || cellVal.includes(p))
          )
          const tempSellingPriceIdx = rowStr.findIndex(cellVal => 
            sellingPricePossibilities.some(p => cellVal === p || cellVal.includes(p))
          )

          if (tempNameIdx !== -1 && tempSellingPriceIdx !== -1) {
            headerRowIdx = r
            nameIdx = tempNameIdx
            sellingPriceIdx = tempSellingPriceIdx
            
            skuIdx = rowStr.findIndex(cellVal => skuPossibilities.some(p => cellVal === p || cellVal.includes(p)))
            costPriceIdx = rowStr.findIndex(cellVal => costPricePossibilities.some(p => cellVal === p || cellVal.includes(p)))
            categoryIdx = rowStr.findIndex(cellVal => categoryPossibilities.some(p => cellVal === p || cellVal.includes(p)))
            stockIdx = rowStr.findIndex(cellVal => stockPossibilities.some(p => cellVal === p || cellVal.includes(p)))
            break
          }
        }

        if (headerRowIdx === -1) {
          const firstRow = data[0] && Array.isArray(data[0]) 
            ? data[0].map(h => String(h || '').trim()).join(', ') 
            : 'tidak terdeteksi'
          alert(`Header kolom Excel tidak valid.\n\nBaris pertama file Anda berisi: "${firstRow}"\n\nFile Excel minimal harus memiliki kolom yang mengandung nama "Nama Produk" dan "Harga Jual". Mohon periksa baris header tabel Excel Anda.`);
          return
        }

        const rows = data.slice(headerRowIdx + 1).filter(row => row.length > 0 && row[nameIdx])
        if (rows.length === 0) {
          alert('Tidak ada data produk yang valid untuk di-import setelah baris header.')
          return
        }

        setImportStatus({
          isOpen: true,
          total: rows.length,
          current: 0,
          currentName: '',
          errors: [],
          successCount: 0,
          isFinished: false,
        })

        const headersApi = { Authorization: `Bearer ${localStorage.getItem('token')}` }

        let currentCategories = [...categories]
        try {
          const catRes = await api.get(`/categories/store/${selectedStoreId}`, { headers: headersApi })
          currentCategories = catRes.data || []
          setCategories(currentCategories)
        } catch (catErr) {
          console.error('Failed to reload categories before import', catErr)
        }

        const parseExcelNumber = (val: any): number => {
          if (val === undefined || val === null) return 0
          if (typeof val === 'number') return Math.round(val)
          let str = String(val).trim().replace(/\s/g, '')
          if (!str) return 0
          if (str.includes('.') && str.includes(',')) {
            const dotIdx = str.indexOf('.')
            const commaIdx = str.indexOf(',')
            if (dotIdx < commaIdx) {
              str = str.replace(/\./g, '').replace(/,/g, '.')
            } else {
              str = str.replace(/,/g, '')
            }
          } else if (str.includes(',')) {
            const parts = str.split(',')
            const lastPart = parts[parts.length - 1]
            if (lastPart.length === 3) {
              str = str.replace(/,/g, '')
            } else {
              str = str.replace(/,/g, '.')
            }
          } else if (str.includes('.')) {
            const parts = str.split('.')
            const lastPart = parts[parts.length - 1]
            if (parts.length > 1 && lastPart.length === 3) {
              str = str.replace(/\./g, '')
            }
          }
          const num = Number(str)
          return isNaN(num) ? 0 : Math.round(num)
        }

        let successCount = 0
        const errors: string[] = []

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i]
          const productName = String(row[nameIdx] || '').trim()
          if (!productName || productName.toLowerCase() === 'total' || productName.toLowerCase().startsWith('total') || productName.toLowerCase() === 'jumlah' || productName.toLowerCase().startsWith('jumlah')) continue

          setImportStatus(prev => prev ? { ...prev, current: i + 1, currentName: productName } : null)

          try {
            let catId = ''
            const rawCategory = categoryIdx !== -1 && row[categoryIdx] ? String(row[categoryIdx]).trim() : 'Umum'
            
            const foundCategory = currentCategories.find(c => c.name.toLowerCase() === rawCategory.toLowerCase())
            if (foundCategory) {
              catId = foundCategory.id
            } else {
              const catPayload = {
                storeId: selectedStoreId,
                name: rawCategory,
                description: `Kategori otomatis dari import Excel`
              }
              const newCatRes = await api.post('/categories', catPayload, { headers: headersApi })
              const newCat = newCatRes.data
              if (newCat && newCat.id) {
                catId = newCat.id
                currentCategories.push(newCat)
                setCategories([...currentCategories])
              } else {
                throw new Error(`Gagal membuat kategori baru "${rawCategory}"`)
              }
            }

            const costPrice = costPriceIdx !== -1 && row[costPriceIdx] ? Math.max(0, parseExcelNumber(row[costPriceIdx])) : 0
            const sellingPrice = sellingPriceIdx !== -1 && row[sellingPriceIdx] ? Math.max(0, parseExcelNumber(row[sellingPriceIdx])) : 0
            const stock = stockIdx !== -1 && row[stockIdx] ? Math.max(0, parseExcelNumber(row[stockIdx])) : 0
            const sku = skuIdx !== -1 && row[skuIdx] ? String(row[skuIdx]).trim() : ''

            const productPayload: any = {
              storeId: selectedStoreId,
              categoryId: catId,
              name: productName,
              costPrice,
              sellingPrice,
              stock: 0,
              minimumStock: 0,
              isActive: true,
            }
            if (sku) productPayload.sku = sku

            const prodRes = await api.post('/products', productPayload, { headers: headersApi })
            const newProd = prodRes.data

            if (newProd && newProd.id && stock > 0) {
              const movementPayload = {
                storeId: selectedStoreId,
                productId: newProd.id,
                type: 'IN',
                qty: stock,
                note: 'Stok awal dari import Excel produk',
              }
              await api.post('/stock-movements', movementPayload, { headers: headersApi })
            }
            successCount++
          } catch (err: any) {
            console.error('Import row error', err)
            const errMsg = err.response?.data?.message || err.message || 'Gagal menyimpan produk'
            const formattedError = Array.isArray(errMsg) ? errMsg.join(', ') : errMsg
            errors.push(`Baris ${i + 2} (${productName}): ${formattedError}`)
          }
        }

        setImportStatus(prev => prev ? {
          ...prev,
          current: rows.length,
          currentName: 'Selesai!',
          successCount,
          errors,
          isFinished: true,
        } : null)

        loadProducts(selectedStoreId)
      } catch (excelErr: any) {
        alert('Gagal membaca atau memproses file Excel: ' + (excelErr.message || excelErr))
        setImportStatus(null)
      }
    }
    reader.readAsBinaryString(file)
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
        const targetStock = Number(formData.stock) || 0
        const createPayload = { ...payload, stock: 0 }
        const res = await api.post('/products', createPayload, { headers })
        const newProd = res.data
        if (newProd && newProd.id && targetStock > 0) {
          const movementPayload = {
            storeId: formData.storeId,
            productId: newProd.id,
            type: 'IN',
            qty: targetStock,
            note: 'Stok awal saat pembuatan produk baru',
          }
          await api.post('/stock-movements', movementPayload, { headers })
        }
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

  const filtered = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode?.includes(searchQuery)
    const matchesCategory = selectedCategoryId ? p.categoryId === selectedCategoryId : true
    return matchesSearch && matchesCategory
  })

  const lowStockCount = products.filter(p => p.stock <= p.minimumStock && p.isActive).length

  return (
    <div className="space-y-6">

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
            <p className="text-xs font-semibold text-slate-400 mt-0.5">Kelola inventori stok, penentuan harga jual, SKU, barcode, dan limit stok cabang</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 shrink-0">
          {activeTab === 'products' ? (
            <>
              {lowStockCount > 0 && (
                <div className="flex items-center gap-1.5 bg-amber-50/50 border border-amber-200/60 rounded-xl px-3 py-2 text-[10px] font-bold text-amber-700">
                  <AlertTriangle size={12} />
                  <span>{lowStockCount} Stok Menipis</span>
                </div>
              )}

              <label className={`flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 hover:text-slate-800 transition-all shadow-3xs active:scale-97 cursor-pointer select-none ${
                importStatus && !importStatus.isFinished ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
              }`}>
                {importStatus && !importStatus.isFinished ? (
                  <Loader2 size={15} className="text-blue-500 animate-spin" />
                ) : (
                  <Upload size={15} className="text-slate-500" />
                )}
                <span>Import Excel</span>
                <input 
                  type="file" 
                  accept=".xlsx, .xls" 
                  onChange={handleImportExcel} 
                  className="hidden" 
                  disabled={!!(importStatus && !importStatus.isFinished)}
                />
              </label>

              <button 
                onClick={openBulkEdit}
                className="flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 px-4 py-2.5 text-xs font-bold text-blue-600 transition-all shadow-3xs active:scale-97 cursor-pointer"
                title="Edit nama, harga modal, harga jual, dan stok minimum massal"
              >
                <Edit3 size={14} />
                <span>Edit Massal</span>
              </button>

              <button 
                onClick={openCreate}
                className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-xs font-bold text-white transition-all shadow-3xs active:scale-97 cursor-pointer"
              >
                <Plus size={15} />
                <span>Tambah Produk</span>
              </button>
            </>
          ) : (
            <button 
              onClick={() => {
                setEditingBundleId(null)
                setBundleForm({
                  name: '',
                  sku: '',
                  barcode: '',
                  sellingPrice: 0,
                  description: '',
                  isActive: true,
                  products: [{ productId: '', qty: 1 }]
                })
                setIsOpenBundleModal(true)
              }}
              className="flex items-center justify-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-700 px-4 py-2.5 text-xs font-bold text-white transition-all shadow-3xs active:scale-97 cursor-pointer"
            >
              <Plus size={15} />
              <span>Tambah Paket Bundling</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      {bundlingEnabled && (
        <div className="flex border-b border-slate-200/80">
          <button
            onClick={() => { setActiveTab('products'); setSearchQuery('') }}
            className={`px-5 py-3 text-xs font-bold transition-all border-b-2 -mb-px flex items-center gap-2 cursor-pointer ${
              activeTab === 'products'
                ? 'border-blue-600 text-blue-600 font-black'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Package size={14} />
            <span>Semua Produk Katalog</span>
          </button>
          <button
            onClick={() => { setActiveTab('bundles'); setSearchQuery('') }}
            className={`px-5 py-3 text-xs font-bold transition-all border-b-2 -mb-px flex items-center gap-2 cursor-pointer ${
              activeTab === 'bundles'
                ? 'border-purple-600 text-purple-600 font-black'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Sparkles size={14} className="text-purple-500" />
            <span>Paket Bundling & Combo Varian</span>
          </button>
        </div>
      )}

      {/* Search and filter row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        
        <div className="relative flex-1">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input 
            type="text"
            placeholder={activeTab === 'products' ? "Cari produk berdasarkan nama, SKU, atau kode barcode..." : "Cari paket bundling..."} 
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

        {activeTab === 'products' && (
          <div className="relative shrink-0">
            <select 
              value={selectedCategoryId} 
              onChange={e => setSelectedCategoryId(e.target.value)}
              className="w-full sm:w-48 appearance-none bg-white border border-slate-200/80 pl-4 pr-10 py-3.5 rounded-xl text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 cursor-pointer transition-all"
            >
              <option value="">Semua Kategori</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        )}

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

        {!loading && (
          <span className="text-[10.5px] font-bold text-slate-400 shrink-0 sm:ml-auto">
            {activeTab === 'products' 
              ? `Menampilkan ${filtered.length} dari ${products.length} produk`
              : `Menampilkan ${
                  bundles.filter(b => 
                    b.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                    b.sku.toLowerCase().includes(searchQuery.toLowerCase()) || 
                    b.barcode.includes(searchQuery)
                  ).length
                } paket bundling`
            }
          </span>
        )}
      </div>

      {activeTab === 'products' ? (
        <>
          {/* Smart Restock Advisor Panel */}
          {lowStockCount > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/20 p-5 shadow-3xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-800">
                  <Sparkles size={16} className="text-amber-500 animate-pulse" />
                  <h3 className="text-xs font-black uppercase tracking-wider">Smart Restock Advisor</h3>
                </div>
                <span className="bg-amber-100 border border-amber-200 text-amber-700 px-2 py-0.5 rounded text-[10px] font-black">
                  {lowStockCount} Barang Kritis
                </span>
              </div>
              
              <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {products
                  .filter(p => p.stock <= p.minimumStock && p.isActive)
                  .slice(0, 6)
                  .map(p => {
                    const recommendedQty = Math.max(10, (p.minimumStock * 3) - p.stock)
                    return (
                      <div key={p.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-4 hover:shadow-xs transition-shadow">
                        <div className="min-w-0">
                          <p className="text-xs font-extrabold text-slate-900 truncate">{p.name}</p>
                          <p className="text-[10px] text-slate-450 font-bold mt-0.5">
                            Stok: <span className="font-extrabold text-rose-600">{p.stock}</span> / {p.minimumStock} Pcs
                          </p>
                          <p className="text-[10px] text-emerald-650 font-extrabold mt-1">
                            Saran Restock: +{recommendedQty} Pcs
                          </p>
                        </div>
                        <Link
                          href={`/dashboard/admin/purchases?productId=${p.id}&qty=${recommendedQty}`}
                          className="shrink-0 rounded-lg bg-blue-600 hover:bg-blue-700 px-3 py-2 text-[10.5px] font-extrabold text-white transition-all active:scale-97 flex items-center gap-1 cursor-pointer"
                        >
                          <ShoppingCart size={12} />
                          <span>Buat PO</span>
                        </Link>
                      </div>
                    )
                  })
                }
              </div>
              {lowStockCount > 6 && (
                <p className="text-[10px] text-slate-400 font-semibold italic">
                  * Menampilkan 6 dari {lowStockCount} barang kritis. Silakan buat purchase order secara berkala.
                </p>
              )}
            </div>
          )}

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
                    <th className="p-4">Stok / Min. Stok</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 pr-6 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600 font-semibold">
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
                          
                          <td className="p-4 pl-6">
                            {p.image ? (
                              <img src={p.image} alt={p.name} className="w-10 h-10 rounded-lg object-cover border border-slate-200" />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                                <ImageIcon size={14} />
                              </div>
                            )}
                          </td>

                          <td className="p-4 max-w-[200px]">
                            <p className="font-extrabold text-slate-900 text-xs truncate">{p.name}</p>
                            {p.description && (
                              <p className="text-[10px] text-slate-400 font-semibold truncate mt-0.5 max-w-[180px]">{p.description}</p>
                            )}
                          </td>

                          <td className="p-4">
                            <span className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200/60 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-lg">
                              <Folder size={11} className="text-slate-400" />
                              <span>{p.category?.name || 'Tanpa Kategori'}</span>
                            </span>
                          </td>

                          <td className="p-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono leading-none">
                                <Tag size={10} className="text-slate-400" />
                                <span>{p.sku || '—'}</span>
                              </div>
                              <div className="flex items-center gap-1 text-[10px] text-slate-505 font-mono leading-none">
                                <Barcode size={10} className="text-slate-400" />
                                <span>{p.barcode || '—'}</span>
                              </div>
                            </div>
                          </td>

                          <td className="p-4 font-mono text-slate-605">
                            Rp {fmt(p.costPrice)}
                          </td>

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

                          <td className="p-4">
                            <div className="flex items-center gap-1.5">
                              <span className={`font-mono text-xs font-extrabold ${lowStock && p.isActive ? 'text-amber-600' : 'text-slate-900'}`}>
                                {p.stock}
                              </span>
                              {lowStock && p.isActive && (
                                <span title="Stok berada di bawah batas minimum (Stok Minimum)" className="text-amber-500 inline-flex items-center gap-0.5">
                                  <AlertTriangle size={12} />
                                  <span className="text-[8px] font-bold bg-amber-50 px-1 py-0.5 rounded border border-amber-100 text-amber-600 scale-90 origin-left">Min</span>
                                </span>
                              )}
                            </div>
                            <span className="text-[9.5px] text-slate-355 font-semibold block mt-0.5">Min. Stok: {p.minimumStock}</span>
                          </td>

                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-bold border text-[9px] uppercase tracking-wider ${
                              p.isActive ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-400'
                            }`}>
                              <span className={`h-1 w-1 rounded-full ${p.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                              {p.isActive ? 'Aktif' : 'Nonaktif'}
                            </span>
                          </td>

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
                                className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors disabled:opacity-50"
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
        </>
      ) : (
        /* Bundling Table View */
        <div className="rounded-2xl border border-slate-200/70 bg-white shadow-3xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                  <th className="p-4 pl-6">Nama Paket Combo</th>
                  <th className="p-4">SKU / Barcode</th>
                  <th className="p-4">Daftar Produk Terkait</th>
                  <th className="p-4 text-right">Harga Eceran Normal</th>
                  <th className="p-4 text-right">Harga Promo Bundling</th>
                  <th className="p-4 text-right">Hemat Belanja</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 pr-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600 font-semibold">
                {bundles.filter(b => 
                  b.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                  b.sku.toLowerCase().includes(searchQuery.toLowerCase()) || 
                  b.barcode.includes(searchQuery)
                ).length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-16 text-center text-slate-400">
                      <Sparkles size={32} className="mx-auto text-purple-300 opacity-60 mb-3" />
                      <p className="text-xs font-bold text-slate-500">
                        Belum ada Paket Bundling
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Klik "Tambah Paket Bundling" untuk membuat paket promo combo baru dari produk Anda.
                      </p>
                    </td>
                  </tr>
                ) : (
                  bundles
                    .filter(b => 
                      b.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                      b.sku.toLowerCase().includes(searchQuery.toLowerCase()) || 
                      b.barcode.includes(searchQuery)
                    )
                    .map(b => {
                      const retailSum = getBundleRetailPriceSum(b)
                      const savings = Math.max(0, retailSum - b.sellingPrice)
                      const savingsPct = retailSum > 0 ? Math.round((savings / retailSum) * 100) : 0
                      
                      return (
                        <tr key={b.id} className="group hover:bg-slate-50/45 transition-colors">
                          <td className="p-4 pl-6">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                                <Sparkles size={16} />
                              </div>
                              <div className="min-w-0">
                                <p className="font-extrabold text-slate-900 text-xs truncate">{b.name}</p>
                                {b.description && (
                                  <p className="text-[10px] text-slate-400 font-semibold truncate mt-0.5 max-w-[200px]">{b.description}</p>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="p-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono leading-none">
                                <Tag size={10} className="text-slate-400" />
                                <span>{b.sku}</span>
                              </div>
                              <div className="flex items-center gap-1 text-[10px] text-slate-505 font-mono leading-none">
                                <Barcode size={10} className="text-slate-400" />
                                <span>{b.barcode}</span>
                              </div>
                            </div>
                          </td>

                          <td className="p-4 max-w-[250px] truncate" title={getBundlePartsList(b)}>
                            <span className="text-slate-700 font-semibold">{getBundlePartsList(b)}</span>
                          </td>

                          <td className="p-4 text-right font-mono text-slate-400">
                            Rp {fmt(retailSum)}
                          </td>

                          <td className="p-4 text-right font-mono font-bold text-purple-600 text-xs">
                            Rp {fmt(b.sellingPrice)}
                          </td>

                          <td className="p-4 text-right">
                            {savings > 0 ? (
                              <div className="flex flex-col items-end">
                                <span className="text-xs font-bold text-emerald-600 font-mono">Rp {fmt(savings)}</span>
                                <span className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-[8.5px] font-extrabold px-1 rounded mt-0.5">
                                  Hemat {savingsPct}%
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>

                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-bold border text-[9px] uppercase tracking-wider ${
                              b.isActive ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-slate-50 border-slate-200 text-slate-400'
                            }`}>
                              <span className={`h-1 w-1 rounded-full ${b.isActive ? 'bg-purple-500' : 'bg-slate-400'}`} />
                              {b.isActive ? 'Aktif' : 'Nonaktif'}
                            </span>
                          </td>

                          <td className="p-4 pr-6">
                            <div className="flex gap-1.5 opacity-80 md:opacity-0 md:group-hover:opacity-100 justify-end transition-all duration-200">
                              <button 
                                onClick={() => openEditBundle(b)}
                                className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-slate-50 text-purple-600 hover:text-purple-700 transition-colors"
                                title="Edit Paket"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button 
                                onClick={() => deleteBundle(b.id)}
                                className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                                title="Hapus Paket"
                              >
                                <Trash2 size={14} />
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
      )}

      {isOpenModal && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={e => { if (e.target === e.currentTarget) setIsOpenModal(false) }}
        >
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200/80 animate-in slide-in-from-bottom-3 duration-250 flex flex-col max-h-[90vh]">
            
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 flex items-center justify-between shrink-0 shadow-sm relative">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 bg-white/10 rounded-xl flex items-center justify-center text-white shrink-0 border border-white/10">
                  <Package size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white">{editingId ? 'Edit Detail Barang' : 'Daftarkan Barang Baru'}</h3>
                  <p className="text-[10px] font-medium text-blue-100/90 mt-0.5">
                    {editingId ? 'Ubah informasi data persediaan barang toko' : 'Isi formulir berikut untuk menambahkan item baru ke katalog'}
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setIsOpenModal(false)}
                className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 pb-6 pt-5 space-y-4">
                
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
                        Rp {fmt(formData.sellingPrice - formData.costPrice)} ({((formData.sellingPrice - formData.costPrice) / formData.costPrice * 100).toFixed(1)}%)
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block">Inventori Stok</label>
                  <div className="grid gap-3 grid-cols-2">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 block">Stok Awal</span>
                      <div className="relative">
                        <Boxes size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                          type="number"
                          min={0}
                          value={formData.stock ?? ''}
                          onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                          placeholder="Stok Awal Barang"
                          className="w-full rounded-xl border border-slate-200 pl-10 pr-3 py-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-semibold"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 block">Stok Minimum</span>
                      <div className="relative">
                        <AlertTriangle size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                          type="number"
                          min={0}
                          value={formData.minimumStock ?? ''}
                          onChange={(e) => setFormData({ ...formData, minimumStock: Number(e.target.value) })}
                          placeholder="Limit Minimum Stok"
                          className="w-full rounded-xl border border-slate-200 pl-10 pr-3 py-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-semibold"
                        />
                      </div>
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
                      <ToggleRight size={30} />
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

      {importStatus && (
        <div 
          className="fixed inset-0 z-55 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200/80 animate-in slide-in-from-bottom-3 duration-250 flex flex-col max-h-[85vh]">
            
            
            <div className="p-6 pb-0 flex items-start justify-between shrink-0">
              <div>
                <h3 className="text-base font-black text-slate-950">
                  {importStatus.isFinished ? 'Proses Import Selesai' : 'Sedang Mengimport Produk...'}
                </h3>
                <p className="text-[10.5px] font-semibold text-slate-400 mt-0.5">
                  {importStatus.isFinished 
                    ? 'Proses import massal produk telah rampung dilaksanakan' 
                    : 'Mohon tidak menutup halaman ini hingga proses selesai'}
                </p>
              </div>
              {importStatus.isFinished && (
                <button 
                  type="button" 
                  onClick={() => setImportStatus(null)}
                  className="h-8 w-8 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            <div className="h-px bg-slate-100 my-4 mx-6 shrink-0" />

            
            <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-5">
              
              
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-700">
                  <span>Progres</span>
                  <span className="font-mono">
                    {importStatus.current} / {importStatus.total} ({Math.round((importStatus.current / importStatus.total) * 100)}%)
                  </span>
                </div>
                
                
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                  <div 
                    className="h-full bg-blue-600 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${(importStatus.current / importStatus.total) * 100}%` }}
                  />
                </div>
                
                {!importStatus.isFinished && (
                  <p className="text-[10.5px] text-slate-500 font-semibold truncate animate-pulse">
                    Memproses: <span className="font-bold text-slate-800">{importStatus.currentName}</span>
                  </p>
                )}
              </div>

              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-50/50 border border-emerald-200/50 rounded-xl p-3 flex items-center gap-3">
                  <div className="h-8 w-8 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600 shrink-0">
                    <CheckCircle size={16} />
                  </div>
                  <div>
                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block leading-none">Berhasil</span>
                    <span className="font-mono text-base font-black text-emerald-700">{importStatus.successCount}</span>
                  </div>
                </div>

                <div className="bg-rose-50/50 border border-rose-200/50 rounded-xl p-3 flex items-center gap-3">
                  <div className="h-8 w-8 bg-rose-100 rounded-lg flex items-center justify-center text-rose-600 shrink-0">
                    <AlertCircle size={16} />
                  </div>
                  <div>
                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block leading-none">Gagal</span>
                    <span className="font-mono text-base font-black text-rose-700">{importStatus.errors.length}</span>
                  </div>
                </div>
              </div>

              
              {importStatus.errors.length > 0 && (
                <div className="space-y-2">
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-rose-600 block">Daftar Kesalahan ({importStatus.errors.length})</label>
                  <div className="border border-rose-100 bg-rose-50/20 rounded-xl p-3 max-h-[180px] overflow-y-auto space-y-1.5 text-[10.5px] text-rose-700 font-semibold scrollbar-thin">
                    {importStatus.errors.map((err, idx) => (
                      <div key={idx} className="flex items-start gap-1.5 leading-relaxed">
                        <span className="text-rose-400 mt-0.5 shrink-0">•</span>
                        <span>{err}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            
            {importStatus.isFinished && (
              <div className="p-6 border-t border-slate-100 bg-slate-50/50 shrink-0 flex justify-end">
                <button 
                  type="button" 
                  onClick={() => setImportStatus(null)} 
                  className="w-full sm:w-auto rounded-xl bg-blue-600 hover:bg-blue-700 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-600/10 transition-all active:scale-98 cursor-pointer flex justify-center items-center gap-1.5"
                >
                  <span>Selesai & Tutup</span>
                  <CheckCircle size={14} />
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {isBulkEditOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-6xl h-[85vh] bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200/80 animate-in slide-in-from-bottom-3 duration-250 flex flex-col">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 flex items-center justify-between shrink-0 shadow-sm relative">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 bg-white/10 rounded-xl flex items-center justify-center text-white shrink-0 border border-white/10">
                  <Edit3 size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white">Edit Massal Katalog Barang</h3>
                  <p className="text-[10px] font-medium text-blue-100/90 mt-0.5">
                    Ubah nama, SKU, harga beli, harga jual, dan stok minimal untuk banyak produk sekaligus secara cepat
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => {
                  if (bulkChangedIds.size > 0 && !confirm('Batalkan semua perubahan massal yang belum disimpan?')) return
                  setIsBulkEditOpen(false)
                }}
                className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
                disabled={isSavingBulk}
              >
                <X size={15} />
              </button>
            </div>

            {/* Modal Toolbar */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
              <div className="relative w-full max-w-md">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input 
                  type="text"
                  placeholder="Cari produk di grid..." 
                  value={bulkSearch} 
                  onChange={e => setBulkSearch(e.target.value)} 
                  className="w-full rounded-lg border border-slate-200/85 pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none transition-all font-semibold bg-white"
                  disabled={isSavingBulk}
                />
              </div>
              {bulkChangedIds.size > 0 && (
                <div className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200/50 px-3 py-1.5 rounded-lg flex items-center gap-1.5 animate-pulse">
                  <AlertCircle size={12} />
                  <span>Ada {bulkChangedIds.size} produk yang telah Anda modifikasi</span>
                </div>
              )}
            </div>

            {/* Modal Grid Table */}
            <div className="flex-1 overflow-auto p-4">
              <table className="w-full min-w-[900px] text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                    <th className="p-3 w-10 text-center">No</th>
                    <th className="p-3">Nama Produk</th>
                    <th className="p-3 w-40">SKU</th>
                    <th className="p-3 w-36">Harga Modal (Rp)</th>
                    <th className="p-3 w-36">Harga Jual (Rp)</th>
                    <th className="p-3 w-28 text-center">Min. Stok</th>
                    <th className="p-3 w-20 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {(() => {
                    const filteredBulk = bulkProducts.filter(p => 
                      p.name.toLowerCase().includes(bulkSearch.toLowerCase()) ||
                      (p.sku && p.sku.toLowerCase().includes(bulkSearch.toLowerCase()))
                    )
                    
                    if (filteredBulk.length === 0) {
                      return (
                        <tr>
                          <td colSpan={7} className="p-10 text-center text-slate-400">
                            Produk tidak ditemukan di grid
                          </td>
                        </tr>
                      )
                    }

                    return filteredBulk.map((p, idx) => {
                      const hasChanged = bulkChangedIds.has(p.id)
                      return (
                        <tr key={p.id} className={`hover:bg-slate-50/45 transition-colors \${hasChanged ? 'bg-amber-50/20' : ''}`}>
                          <td className="p-2 text-center text-slate-400 text-[10px]">{idx + 1}</td>
                          <td className="p-2">
                            <input 
                              type="text" 
                              value={p.name}
                              onChange={(e) => handleBulkChange(p.id, 'name', e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 focus:border-blue-500 focus:outline-none transition-colors"
                              disabled={isSavingBulk}
                            />
                          </td>
                          <td className="p-2">
                            <input 
                              type="text" 
                              value={p.sku || ''}
                              placeholder="Otomatis"
                              onChange={(e) => handleBulkChange(p.id, 'sku', e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 font-mono focus:border-blue-500 focus:outline-none transition-colors"
                              disabled={isSavingBulk}
                            />
                          </td>
                          <td className="p-2">
                            <input 
                              type="number" 
                              min={0}
                              value={p.costPrice ?? ''}
                              onChange={(e) => handleBulkChange(p.id, 'costPrice', Number(e.target.value) || 0)}
                              className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 font-mono focus:border-blue-500 focus:outline-none transition-colors"
                              disabled={isSavingBulk}
                            />
                          </td>
                          <td className="p-2">
                            <input 
                              type="number" 
                              min={0}
                              value={p.sellingPrice ?? ''}
                              onChange={(e) => handleBulkChange(p.id, 'sellingPrice', Number(e.target.value) || 0)}
                              className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 font-mono focus:border-blue-500 focus:outline-none transition-colors"
                              disabled={isSavingBulk}
                            />
                          </td>
                          <td className="p-2 text-center">
                            <input 
                              type="number" 
                              min={0}
                              value={p.minimumStock ?? ''}
                              onChange={(e) => handleBulkChange(p.id, 'minimumStock', Number(e.target.value) || 0)}
                              className="w-20 bg-white border border-slate-200 rounded px-2.5 py-1.5 font-mono text-center focus:border-blue-500 focus:outline-none transition-colors"
                              disabled={isSavingBulk}
                            />
                          </td>
                          <td className="p-2 text-center">
                            {hasChanged ? (
                              <span className="text-[9px] font-extrabold uppercase bg-amber-100 border border-amber-200 text-amber-700 px-2 py-0.5 rounded">Diubah</span>
                            ) : (
                              <span className="text-[9px] font-bold uppercase text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Sama</span>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  })()}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
              <button 
                type="button" 
                onClick={() => {
                  if (bulkChangedIds.size > 0 && !confirm('Batalkan semua perubahan massal yang belum disimpan?')) return
                  setIsBulkEditOpen(false)
                }}
                className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-650 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                disabled={isSavingBulk}
              >
                Batal
              </button>

              <div className="flex items-center gap-4">
                {isSavingBulk && (
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-bold">
                    <Loader2 size={14} className="animate-spin text-blue-600" />
                    <span>Menyimpan: {bulkSaveProgress.current} dari {bulkSaveProgress.total} produk</span>
                  </div>
                )}
                
                <button
                  type="button"
                  onClick={handleSaveBulk}
                  disabled={bulkChangedIds.size === 0 || isSavingBulk}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white disabled:text-slate-400 rounded-xl text-xs font-bold shadow-md shadow-blue-600/10 transition-all active:scale-[0.98] disabled:shadow-none flex items-center gap-1.5"
                >
                  <CheckCircle size={14} />
                  <span>Simpan {bulkChangedIds.size} Perubahan</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
      {isOpenBundleModal && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={e => { if (e.target === e.currentTarget) setIsOpenBundleModal(false) }}
        >
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200/80 animate-in slide-in-from-bottom-3 duration-250 flex flex-col max-h-[90vh]">
            
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-5 flex items-center justify-between shrink-0 shadow-sm relative">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 bg-white/10 rounded-xl flex items-center justify-center text-white shrink-0 border border-white/10">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white">{editingBundleId ? 'Edit Paket Bundling' : 'Buat Paket Combo Bundling'}</h3>
                  <p className="text-[10px] font-medium text-purple-100/90 mt-0.5">
                    {editingBundleId ? 'Ubah detail item dan komposisi produk dalam paket bundling' : 'Gabungkan beberapa varian pakaian menjadi satu harga diskon menarik'}
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setIsOpenBundleModal(false)}
                className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSaveBundle} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 pb-6 pt-5 space-y-4">
                
                <div className="grid gap-3 grid-cols-2">
                  <div className="space-y-1.5 col-span-2">
                    <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block">Nama Paket Combo *</label>
                    <input
                      type="text"
                      required
                      value={bundleForm.name}
                      onChange={(e) => setBundleForm({ ...bundleForm, name: e.target.value })}
                      placeholder="Contoh: Paket Hijab & Gamis Lebaran Hemat"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/10 transition-all font-semibold"
                    />
                  </div>
                </div>

                <div className="grid gap-3 grid-cols-3">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">Kode SKU Paket</label>
                    <input
                      type="text"
                      value={bundleForm.sku}
                      onChange={(e) => setBundleForm({ ...bundleForm, sku: e.target.value })}
                      placeholder="Otomatis jika kosong"
                      className="w-full rounded-xl border border-slate-200 px-3 py-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/10 transition-all font-mono font-semibold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">Kode Barcode Paket</label>
                    <input
                      type="text"
                      value={bundleForm.barcode}
                      onChange={(e) => setBundleForm({ ...bundleForm, barcode: e.target.value })}
                      placeholder="Otomatis jika kosong"
                      className="w-full rounded-xl border border-slate-200 px-3 py-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/10 transition-all font-mono font-semibold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">Harga Promo Combo *</label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={bundleForm.sellingPrice || ''}
                      onChange={(e) => setBundleForm({ ...bundleForm, sellingPrice: Number(e.target.value) || 0 })}
                      placeholder="Harga Promo Paket (Rp)"
                      className="w-full rounded-xl border border-slate-200 px-3 py-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/10 transition-all font-mono font-semibold"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block">Deskripsi Promo</label>
                  <textarea
                    value={bundleForm.description}
                    onChange={(e) => setBundleForm({ ...bundleForm, description: e.target.value })}
                    placeholder="Contoh: Beli paket ini hemat Rp 25.000 dibanding beli eceran!"
                    rows={2}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/10 transition-all font-semibold resize-none"
                  />
                </div>

                {/* Bundle composition list */}
                <div className="border border-purple-100 rounded-2xl bg-purple-50/10 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-purple-100/50 pb-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-700">Produk yang Digabungkan</span>
                    <button
                      type="button"
                      onClick={() => setBundleForm({
                        ...bundleForm,
                        products: [...bundleForm.products, { productId: '', qty: 1 }]
                      })}
                      className="text-[10px] font-black text-purple-600 hover:text-purple-800 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={12} />
                      <span>Tambah Item</span>
                    </button>
                  </div>

                  <div className="space-y-2.5 max-h-[200px] overflow-y-auto pr-1">
                    {bundleForm.products.map((item, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <select
                          required
                          value={item.productId}
                          onChange={(e) => {
                            const newProds = [...bundleForm.products]
                            newProds[idx].productId = e.target.value
                            setBundleForm({ ...bundleForm, products: newProds })
                          }}
                          className="flex-1 appearance-none bg-white border border-slate-200/80 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-800 focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/10 cursor-pointer transition-all"
                        >
                          <option value="" disabled>-- Pilih Produk Varian --</option>
                          {products
                            .filter(p => p.isActive)
                            .map(p => (
                              <option key={p.id} value={p.id}>
                                {p.name} (Eceran: Rp {p.sellingPrice.toLocaleString('id-ID')})
                              </option>
                            ))
                          }
                        </select>

                        <input
                          type="number"
                          min={1}
                          required
                          value={item.qty}
                          onChange={(e) => {
                            const newProds = [...bundleForm.products]
                            newProds[idx].qty = Math.max(1, Number(e.target.value) || 1)
                            setBundleForm({ ...bundleForm, products: newProds })
                          }}
                          placeholder="Qty"
                          className="w-16 bg-white border border-slate-200 rounded-xl px-2.5 py-2.5 text-xs text-center font-mono font-bold focus:border-purple-500 focus:outline-none transition-colors"
                        />

                        {bundleForm.products.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const newProds = bundleForm.products.filter((_, i) => i !== idx)
                              setBundleForm({ ...bundleForm, products: newProds })
                            }}
                            className="p-2 bg-rose-50 border border-rose-100 hover:bg-rose-100 text-rose-600 rounded-lg hover:text-rose-700 transition-colors cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Calculations summary */}
                  {(() => {
                    const totalRetail = bundleForm.products.reduce((acc, item) => {
                      const prod = products.find(p => p.id === item.productId)
                      return acc + ((prod?.sellingPrice || 0) * item.qty)
                    }, 0)
                    const totalCost = bundleForm.products.reduce((acc, item) => {
                      const prod = products.find(p => p.id === item.productId)
                      return acc + ((prod?.costPrice || 0) * item.qty)
                    }, 0)
                    const savings = Math.max(0, totalRetail - bundleForm.sellingPrice)
                    const savingsPercent = totalRetail > 0 ? Math.round((savings / totalRetail) * 100) : 0

                    return (
                      <div className="border-t border-purple-100/50 pt-2.5 grid grid-cols-3 gap-2 text-[10px] text-slate-500 font-bold">
                        <div>
                          <span>Harga Eceran Normal:</span>
                          <p className="text-xs font-mono font-black text-slate-800 mt-0.5">Rp {totalRetail.toLocaleString('id-ID')}</p>
                        </div>
                        <div>
                          <span>Modal Paket Komulatif:</span>
                          <p className="text-xs font-mono font-black text-slate-800 mt-0.5" title="Berdasarkan HPP barang penyusun">Rp {totalCost.toLocaleString('id-ID')}</p>
                        </div>
                        <div>
                          <span>Pelanggan Hemat:</span>
                          <p className="text-xs font-mono font-black text-emerald-600 mt-0.5">
                            Rp {savings.toLocaleString('id-ID')} ({savingsPercent}%)
                          </p>
                        </div>
                      </div>
                    )
                  })()}
                </div>

                <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200/60 rounded-xl">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-800">Status Aktif Paket</span>
                    <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                      Aktifkan agar combo ini langsung muncul di layar terminal kasir outlet
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={bundleForm.isActive}
                    onChange={e => setBundleForm({ ...bundleForm, isActive: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-purple-650 focus:ring-purple-500/20 cursor-pointer"
                  />
                </div>

              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
                <button 
                  type="button" 
                  onClick={() => setIsOpenBundleModal(false)}
                  className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-600/10 transition-all active:scale-[0.98] flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle size={14} />
                  <span>{editingBundleId ? 'Simpan Perubahan' : 'Buat Paket Combo'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}

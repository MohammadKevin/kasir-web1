'use client'

import { useEffect, useState, useMemo, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import * as XLSX from 'xlsx'
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
  ChevronDown,
  Upload,
  CheckCircle,
  AlertCircle,
  Info,
  ArrowRightLeft,
  ClipboardList
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
    id: string
    name: string
    sku: string
    stock: number
    category?: {
      name: string
    }
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
  category?: {
    name: string
  }
}

type CategoryType = {
  id: string
  name: string
}

type SupplierType = {
  id: string
  name: string
  phone?: string
}

function StockMovementPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const typeParam = searchParams.get('type') || '' // '', 'IN', 'OUT', 'TRANSFER', 'OPNAME'

  const [movements, setMovements] = useState<StockMovement[]>([])
  const [stores, setStores] = useState<StoreType[]>([])
  const [products, setProducts] = useState<ProductType[]>([])
  const [categories, setCategories] = useState<CategoryType[]>([])
  const [suppliers, setSuppliers] = useState<SupplierType[]>([])
  
  const [selectedStoreId, setSelectedStoreId] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState('ALL')
  const [loading, setLoading] = useState(true)
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  
  const [showEmptyStock, setShowEmptyStock] = useState(false)
  const [showBanner, setShowBanner] = useState(true)

  // Modals
  const [isOpenInModal, setIsOpenInModal] = useState(false)
  const [isOpenOutModal, setIsOpenOutModal] = useState(false)
  const [isOpenTransferModal, setIsOpenTransferModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Modals form states
  const [formIn, setFormIn] = useState({
    productId: '',
    supplierId: '',
    qty: 1,
    note: ''
  })

  const [formOut, setFormOut] = useState({
    productId: '',
    reason: 'Barang Rusak', // 'Barang Rusak', 'Sampel', 'Koreksi Audit', 'Lainnya'
    qty: 1,
    note: ''
  })

  const [formTransfer, setFormTransfer] = useState({
    productId: '',
    destStoreId: '',
    qty: 1,
    note: ''
  })

  // Stock Opname local state
  const [opnameActuals, setOpnameActuals] = useState<{ [productId: string]: string }>({})
  const [opnameNotes, setOpnameNotes] = useState<{ [productId: string]: string }>({})
  const [isSavingOpname, setIsSavingOpname] = useState(false)

  const [importStatus, setImportStatus] = useState<{
    isOpen: boolean;
    total: number;
    current: number;
    currentName: string;
    errors: string[];
    successCount: number;
    isFinished: boolean;
  } | null>(null)

  useEffect(() => {
    initPage()
  }, [])

  useEffect(() => {
    if (selectedStoreId) {
      loadMovements(selectedStoreId)
      loadProducts(selectedStoreId)
      loadCategories(selectedStoreId)
      loadSuppliers(selectedStoreId)
      
      // Clear opname state
      setOpnameActuals({})
      setOpnameNotes({})
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
      setProducts(res.data || [])
    } catch (error) {
      console.error(error)
    }
  }

  async function loadCategories(storeId: string) {
    try {
      const res = await api.get(`/categories/store/${storeId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      })
      setCategories(res.data || [])
    } catch (error) {
      console.error(error)
    }
  }

  async function loadSuppliers(storeId: string) {
    try {
      const res = await api.get(`/suppliers/store/${storeId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      })
      setSuppliers(res.data || [])
    } catch (error) {
      console.error(error)
    }
  }

  // Modals trigger
  function handleOpenIn() {
    setFormIn({
      productId: products[0]?.id || '',
      supplierId: suppliers[0]?.id || '',
      qty: 1,
      note: ''
    })
    setIsOpenInModal(true)
  }

  function handleOpenOut() {
    setFormOut({
      productId: products[0]?.id || '',
      reason: 'Barang Rusak',
      qty: 1,
      note: ''
    })
    setIsOpenOutModal(true)
  }

  function handleOpenTransfer() {
    const otherStore = stores.find(s => s.id !== selectedStoreId)
    setFormTransfer({
      productId: products[0]?.id || '',
      destStoreId: otherStore?.id || '',
      qty: 1,
      note: ''
    })
    setIsOpenTransferModal(true)
  }

  // Post Stock In
  async function handleSubmitIn(e: React.FormEvent) {
    e.preventDefault()
    if (!formIn.productId) return alert('Silakan pilih produk!')
    if (formIn.qty <= 0) return alert('Kuantitas harus lebih dari 0!')

    setIsSubmitting(true)
    const token = localStorage.getItem('token')
    const headers = { Authorization: `Bearer ${token}` }

    const selectedProduct = products.find(p => p.id === formIn.productId)
    const selectedSupplier = suppliers.find(s => s.id === formIn.supplierId)
    
    let noteText = `Stok Masuk`
    if (selectedSupplier) {
      noteText += ` | Supplier: ${selectedSupplier.name}`
    }
    if (formIn.note.trim()) {
      noteText += ` | ${formIn.note.trim()}`
    }

    try {
      await api.post('/stock-movements', {
        storeId: selectedStoreId,
        productId: formIn.productId,
        type: 'IN',
        qty: Number(formIn.qty),
        note: noteText
      }, { headers })

      setIsOpenInModal(false)
      loadMovements(selectedStoreId)
      loadProducts(selectedStoreId)
    } catch (error: any) {
      console.error(error)
      alert(error.response?.data?.message || 'Gagal menyimpan stok masuk')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Post Stock Out
  async function handleSubmitOut(e: React.FormEvent) {
    e.preventDefault()
    if (!formOut.productId) return alert('Silakan pilih produk!')
    if (formOut.qty <= 0) return alert('Kuantitas harus lebih dari 0!')

    const selectedProduct = products.find(p => p.id === formOut.productId)
    if (selectedProduct && selectedProduct.stock < formOut.qty) {
      return alert(`Stok tidak mencukupi! Stok saat ini: ${selectedProduct.stock} Pcs`)
    }

    setIsSubmitting(true)
    const token = localStorage.getItem('token')
    const headers = { Authorization: `Bearer ${token}` }

    const type = formOut.reason === 'Barang Rusak' ? 'DAMAGED' : 'OUT'
    let noteText = `Alasan: ${formOut.reason}`
    if (formOut.note.trim()) {
      noteText += ` | ${formOut.note.trim()}`
    }

    try {
      await api.post('/stock-movements', {
        storeId: selectedStoreId,
        productId: formOut.productId,
        type,
        qty: Number(formOut.qty),
        note: noteText
      }, { headers })

      setIsOpenOutModal(false)
      loadMovements(selectedStoreId)
      loadProducts(selectedStoreId)
    } catch (error: any) {
      console.error(error)
      alert(error.response?.data?.message || 'Gagal menyimpan stok keluar')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Post Transfer Stok
  async function handleSubmitTransfer(e: React.FormEvent) {
    e.preventDefault()
    if (!formTransfer.productId) return alert('Silakan pilih produk!')
    if (!formTransfer.destStoreId) return alert('Silakan pilih outlet tujuan!')
    if (formTransfer.destStoreId === selectedStoreId) return alert('Outlet tujuan tidak boleh sama dengan outlet asal!')
    if (formTransfer.qty <= 0) return alert('Kuantitas harus lebih dari 0!')

    const sourceProduct = products.find(p => p.id === formTransfer.productId)
    if (!sourceProduct) return alert('Produk asal tidak ditemukan!')
    if (sourceProduct.stock < formTransfer.qty) {
      return alert(`Stok di outlet asal tidak mencukupi! Sisa stok: ${sourceProduct.stock} Pcs`)
    }

    setIsSubmitting(true)
    const token = localStorage.getItem('token')
    const headers = { Authorization: `Bearer ${token}` }

    try {
      // 1. Fetch products of the destination store to find matching SKU
      const destStoreName = stores.find(s => s.id === formTransfer.destStoreId)?.name || 'Outlet Tujuan'
      const sourceStoreName = stores.find(s => s.id === selectedStoreId)?.name || 'Outlet Asal'

      const destProductsRes = await api.get(`/products/store/${formTransfer.destStoreId}`, { headers })
      const destProducts: ProductType[] = destProductsRes.data || []
      const destProduct = destProducts.find(p => p.sku === sourceProduct.sku)

      if (!destProduct) {
        throw new Error(`Produk dengan SKU "${sourceProduct.sku}" belum didaftarkan di ${destStoreName}. Daftarkan produk terlebih dahulu di outlet tersebut!`)
      }

      // 2. Reduce stock at source store (type OUT)
      await api.post('/stock-movements', {
        storeId: selectedStoreId,
        productId: sourceProduct.id,
        type: 'OUT',
        qty: Number(formTransfer.qty),
        note: `Transfer ke ${destStoreName} | ${formTransfer.note}`
      }, { headers })

      // 3. Add stock at destination store (type IN)
      await api.post('/stock-movements', {
        storeId: formTransfer.destStoreId,
        productId: destProduct.id,
        type: 'IN',
        qty: Number(formTransfer.qty),
        note: `Transfer dari ${sourceStoreName} | ${formTransfer.note}`
      }, { headers })

      setIsOpenTransferModal(false)
      loadMovements(selectedStoreId)
      loadProducts(selectedStoreId)
      alert(`Transfer stok berhasil dikirim!`)
    } catch (error: any) {
      console.error(error)
      alert(error.message || error.response?.data?.message || 'Gagal mengirim transfer stok')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Save Stock Opname (Reconcile)
  async function handleSaveOpname() {
    // Find all rows where actual value is entered and is different from system stock
    const changes = products.filter(p => {
      const actualVal = opnameActuals[p.id]
      if (actualVal === undefined || actualVal === '') return false
      return Number(actualVal) !== p.stock
    })

    if (changes.length === 0) {
      return alert('Tidak ada penyesuaian stok opname yang perlu disimpan (Stok fisik sama dengan stok sistem atau belum diisi).')
    }

    if (!confirm(`Apakah Anda yakin ingin memproses stock opname untuk ${changes.length} produk?`)) {
      return
    }

    setIsSavingOpname(true)
    const token = localStorage.getItem('token')
    const headers = { Authorization: `Bearer ${token}` }

    let successCount = 0
    let failCount = 0

    for (const p of changes) {
      const systemStock = p.stock
      const actualStock = Number(opnameActuals[p.id])
      const diff = actualStock - systemStock
      const qty = Math.abs(diff)
      const type = diff > 0 ? 'IN' : 'OUT'
      const customNote = opnameNotes[p.id]?.trim()
      const note = `Stock Opname: Fisik=${actualStock}, Sistem=${systemStock} (Selisih=${diff > 0 ? '+' : ''}${diff}) ${customNote ? `| ${customNote}` : ''}`

      try {
        await api.post('/stock-movements', {
          storeId: selectedStoreId,
          productId: p.id,
          type,
          qty,
          note
        }, { headers })
        successCount++
      } catch (err) {
        console.error(`Gagal menyesuaikan produk ${p.name}:`, err)
        failCount++
      }
    }

    setIsSavingOpname(false)
    alert(`Stock opname selesai! Berhasil: ${successCount} produk. Gagal: ${failCount} produk.`)
    
    // Reset inputs
    setOpnameActuals({})
    setOpnameNotes({})
    
    // Reload
    loadMovements(selectedStoreId)
    loadProducts(selectedStoreId)
  }

  // Excel Stock Import
  async function handleImportStockExcel(e: React.ChangeEvent<HTMLInputElement>) {
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

        if (data.length <= 1) {
          alert('File Excel kosong atau tidak memiliki data produk.')
          return
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

        let headerRowIdx = -1
        let nameIdx = -1
        let stockIdx = -1

        const namePossibilities = ['produk', 'nama produk', 'nama barang', 'nama', 'product name', 'name', 'nama variant', 'nama varian']
        const stockPossibilities = ['stok akhir', 'stok', 'stock', 'stok awal', 'stok barang', 'jumlah stok']

        for (let r = 0; r < Math.min(data.length, 15); r++) {
          const row = data[r]
          if (!row || !Array.isArray(row)) continue
          
          const rowStr = row.map(cell => String(cell || '').trim().toLowerCase())
          
          let tempNameIdx = rowStr.indexOf('produk')
          if (tempNameIdx === -1) {
            tempNameIdx = rowStr.findIndex(cellVal => 
              namePossibilities.some(p => cellVal === p)
            )
          }
          if (tempNameIdx === -1) {
            tempNameIdx = rowStr.findIndex(cellVal => 
              namePossibilities.some(p => cellVal.includes(p))
            )
          }

          let tempStockIdx = rowStr.indexOf('stok akhir')
          if (tempStockIdx === -1) {
            tempStockIdx = rowStr.findIndex(cellVal => 
              stockPossibilities.some(p => cellVal === p)
            )
          }
          if (tempStockIdx === -1) {
            tempStockIdx = rowStr.findIndex(cellVal => 
              stockPossibilities.some(p => cellVal.includes(p))
            )
          }

          if (tempNameIdx !== -1 && tempStockIdx !== -1) {
            headerRowIdx = r
            nameIdx = tempNameIdx
            stockIdx = tempStockIdx
            break
          }
        }

        if (headerRowIdx === -1) {
          const firstRow = data[0] && Array.isArray(data[0]) 
            ? data[0].map(h => String(h || '').trim()).join(', ') 
            : 'tidak terdeteksi'
          alert(`Header kolom Excel tidak valid.\n\nBaris pertama file Anda berisi: "${firstRow}"\n\nFile Excel minimal harus memiliki kolom yang mengandung nama "Produk" dan "Stok Akhir".`);
          return
        }

        const rows = data.slice(headerRowIdx + 1).filter(row => row.length > 0 && row[nameIdx])
        if (rows.length === 0) {
          alert('Tidak ada data produk yang valid untuk di-import.')
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

        const token = localStorage.getItem('token')
        const headersApi = { Authorization: `Bearer ${token}` }

        let latestProducts: ProductType[] = []
        try {
          const prodRes = await api.get(`/products/store/${selectedStoreId}`, { headers: headersApi })
          latestProducts = prodRes.data || []
          setProducts(latestProducts)
        } catch (prodErr) {
          console.error('Failed to reload products', prodErr)
          latestProducts = [...products]
        }

        let successCount = 0
        const errors: string[] = []

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i]
          const productName = String(row[nameIdx] || '').trim()
          if (!productName) continue

          setImportStatus(prev => prev ? { ...prev, current: i + 1, currentName: productName } : null)

          let targetStock = 0
          let currentStock = 0
          let type = 'IN'
          let qty = 0
          let dbProduct: ProductType | undefined = undefined

          try {
            dbProduct = latestProducts.find(p => p.name.toLowerCase() === productName.toLowerCase())
            if (!dbProduct) {
              throw new Error(`Produk tidak ditemukan di database cabang ini`)
            }

            targetStock = Math.round(parseExcelNumber(row[stockIdx]))
            currentStock = dbProduct.stock || 0

            const delta = targetStock - currentStock
            qty = Math.round(Math.abs(delta))
            
            if (qty === 0) {
              successCount++
              continue
            }

            type = delta > 0 ? 'IN' : 'OUT'

            const payload = {
              storeId: selectedStoreId,
              productId: dbProduct.id,
              type,
              qty,
              note: `Excel Import: ${targetStock} Pcs`,
            }

            await api.post('/stock-movements', payload, { headers: headersApi })
            successCount++
          } catch (err: any) {
            console.warn('Import error, fallback direct PATCH...', err.message)
            
            try {
              if (dbProduct) {
                await api.patch(`/products/${dbProduct.id}`, { stock: targetStock }, { headers: headersApi })
                successCount++
                continue
              }
            } catch (patchErr: any) {
              console.error('Fallback failed', patchErr)
            }

            const responseData = err.response?.data
            const errMsg = responseData?.message || responseData?.error || err.message || 'Gagal menyimpan penyesuaian stok'
            const formattedError = Array.isArray(errMsg) ? errMsg.join(', ') : errMsg
            errors.push(`Baris ${i + headerRowIdx + 2} (${productName}): Target = ${targetStock}, DB = ${currentStock}. Error: ${formattedError}`)
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

        loadMovements(selectedStoreId)
        loadProducts(selectedStoreId)
      } catch (excelErr: any) {
        alert('Gagal memproses file Excel: ' + (excelErr.message || excelErr))
        setImportStatus(null)
      }
    }
    reader.readAsBinaryString(file)
  }

  // Filtered movements logically mapped to the list
  const filteredMovements = movements.filter((m) => {
    // Search query
    const matchesSearch = 
      m.product?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.product?.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.note && m.note.toLowerCase().includes(searchQuery.toLowerCase()))

    // Category filter
    const matchesCategory = 
      selectedCategoryId === 'ALL' || 
      m.product?.category?.name === selectedCategoryId ||
      (selectedCategoryId === 'Umum' && !m.product?.category)

    // Date range filter
    let matchesDate = true
    if (startDate) {
      matchesDate = matchesDate && new Date(m.createdAt) >= new Date(startDate + 'T00:00:00')
    }
    if (endDate) {
      matchesDate = matchesDate && new Date(m.createdAt) <= new Date(endDate + 'T23:59:59')
    }

    // Type filtering
    if (typeParam === 'IN' && m.type !== 'IN') return false
    if (typeParam === 'OUT' && m.type !== 'OUT' && m.type !== 'DAMAGED') return false
    if (typeParam === 'TRANSFER' && !m.note?.toLowerCase().includes('transfer')) return false

    return matchesSearch && matchesCategory && matchesDate
  })

  // Filtered products list for Stock Opname page
  const filteredProducts = products.filter((p) => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesCategory = 
      selectedCategoryId === 'ALL' || 
      p.category?.name === selectedCategoryId ||
      (selectedCategoryId === 'Umum' && !p.category)

    let matchesToggles = true
    if (showEmptyStock && p.stock > 0) matchesToggles = false

    return matchesSearch && matchesCategory && matchesToggles
  })

  const activeTitle = useMemo(() => {
    if (typeParam === 'IN') return 'Stok Masuk'
    if (typeParam === 'OUT') return 'Stok Keluar'
    if (typeParam === 'TRANSFER') return 'Transfer Stok'
    if (typeParam === 'OPNAME') return 'Stok Opname (Penyesuaian)'
    return 'Kartu Stok'
  }, [typeParam])

  return (
    <div className="space-y-5">
      
      {/* Top Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-3">
        <div>
          <div className="text-xs font-bold text-slate-400">Inventori</div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight mt-1">{activeTitle}</h1>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {typeParam === '' && (
            <label className={`inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 hover:text-slate-800 transition-all shadow-3xs active:scale-97 cursor-pointer select-none shrink-0 ${
              importStatus && !importStatus.isFinished ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
            }`}>
              {importStatus && !importStatus.isFinished ? (
                <Loader2 size={14} className="text-sky-500 animate-spin" />
              ) : (
                <Upload size={14} className="text-slate-500" />
              )}
              <span>Import Excel</span>
              <input 
                type="file" 
                accept=".xlsx, .xls" 
                onChange={handleImportStockExcel} 
                className="hidden" 
                disabled={!!(importStatus && !importStatus.isFinished)}
              />
            </label>
          )}

          {typeParam === 'IN' && (
            <button
              onClick={handleOpenIn}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-xs font-bold text-white transition-all shadow-3xs hover:bg-sky-600 active:scale-97 cursor-pointer shrink-0"
            >
              <Plus size={14} />
              Tambah Stok Masuk
            </button>
          )}

          {typeParam === 'OUT' && (
            <button
              onClick={handleOpenOut}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-xs font-bold text-white transition-all shadow-3xs hover:bg-sky-600 active:scale-97 cursor-pointer shrink-0"
            >
              <Plus size={14} />
              Tambah Stok Keluar
            </button>
          )}

          {typeParam === 'TRANSFER' && (
            <button
              onClick={handleOpenTransfer}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-xs font-bold text-white transition-all shadow-3xs hover:bg-sky-600 active:scale-97 cursor-pointer shrink-0"
            >
              <ArrowRightLeft size={14} />
              Buat Transfer Stok
            </button>
          )}

          {typeParam === 'OPNAME' && (
            <button
              onClick={handleSaveOpname}
              disabled={isSavingOpname}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-bold text-white transition-all shadow-3xs hover:bg-emerald-600 disabled:bg-slate-350 active:scale-97 cursor-pointer shrink-0"
            >
              {isSavingOpname ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Memproses Penyesuaian...
                </>
              ) : (
                <>
                  <ClipboardList size={14} />
                  Simpan Penyesuaian (Opname)
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Top Tabs Switcher */}
      <div className="flex border-b border-slate-200">
        {[
          { label: 'Kartu Stok', type: '' },
          { label: 'Stok Masuk', type: 'IN' },
          { label: 'Stok Keluar', type: 'OUT' },
          { label: 'Transfer Stok', type: 'TRANSFER' },
          { label: 'Stok Opname', type: 'OPNAME' },
        ].map((tab) => {
          const isSelected = typeParam === tab.type
          return (
            <button
              key={tab.type}
              onClick={() => router.push(`/dashboard/admin/stock${tab.type ? `?type=${tab.type}` : ''}`)}
              className={`px-5 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                isSelected
                  ? 'border-sky-500 text-sky-500 font-extrabold'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tahukah Anda Banner */}
      {showBanner && (
        <div className="bg-[#fdf6e2] border border-[#f5e7c4] rounded-lg p-4 flex items-start justify-between text-[#856404]">
          <div className="flex gap-3">
            <Info size={16} className="text-sky-500 stroke-[2.5] mt-0.5" />
            <div className="text-xs">
              <span className="font-extrabold block">Tahukah Anda?</span>
              <span className="mt-1 block leading-normal text-slate-600 font-semibold">
                {typeParam === 'OPNAME' 
                  ? 'Gunakan modul Stok Opname ini untuk mencocokkan stok fisik barang di gudang dengan stok sistem. Ketik stok aktual yang dihitung di kolom stok fisik.' 
                  : typeParam === 'TRANSFER'
                  ? 'Modul Transfer Stok membantu Anda mendistribusikan persediaan baju antarcabang outlet secara cepat. Seluruh data pengurangan & penambahan dilakukan terintegrasi.'
                  : 'Seluruh pergerakan barang (penjualan kasir POS, purchase order, dan koreksi manual) tercatat otomatis di Kartu Stok secara realtime.'}
              </span>
            </div>
          </div>
          <button 
            onClick={() => setShowBanner(false)}
            className="text-slate-400 hover:text-slate-600 rounded p-0.5 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Filter Row Form Controls */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-3xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
          
          {/* Outlet select */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Outlet</label>
            <div className="relative">
              <select
                value={selectedStoreId}
                onChange={(e) => {
                  setSelectedStoreId(e.target.value)
                  localStorage.setItem('storeId', e.target.value)
                }}
                className="w-full appearance-none bg-slate-50 border border-slate-200 pl-3 pr-8 py-2 rounded-lg text-xs font-bold text-slate-700 focus:bg-white focus:border-sky-500 outline-none cursor-pointer transition-all"
              >
                {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Date Range filters (Only for log views) */}
          {typeParam !== 'OPNAME' ? (
            <>
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Tanggal Mulai</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 focus:bg-white focus:border-sky-500 outline-none cursor-pointer transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Tanggal Selesai</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 focus:bg-white focus:border-sky-500 outline-none cursor-pointer transition-all"
                />
              </div>
            </>
          ) : (
            <div className="col-span-2 hidden md:block" />
          )}

          {/* Category filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Kategori</label>
            <div className="relative">
              <select
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="w-full appearance-none bg-slate-50 border border-slate-200 pl-3 pr-8 py-2 rounded-lg text-xs font-bold text-slate-700 focus:bg-white focus:border-sky-500 outline-none cursor-pointer transition-all"
              >
                <option value="ALL">Semua Kategori</option>
                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                <option value="Umum">Umum</option>
              </select>
              <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Search bar */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Cari Produk</label>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama baju / SKU"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 pl-9 pr-3 py-2 rounded-lg text-xs font-semibold text-slate-700 focus:bg-white focus:border-sky-500 outline-none transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

        </div>

        {/* Toggles and Reset Row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-3 border-t border-slate-100 gap-4">
          
          <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-500">
            {typeParam === 'OPNAME' && (
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={showEmptyStock} 
                  onChange={(e) => setShowEmptyStock(e.target.checked)}
                  className="rounded border-slate-300 text-sky-500 focus:ring-sky-500 h-3.5 w-3.5"
                />
                <span>Hanya Stok Kosong</span>
              </label>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <button
              onClick={() => {
                setSearchQuery('')
                setSelectedCategoryId('ALL')
                setStartDate('')
                setEndDate('')
                setShowEmptyStock(false)
              }}
              className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all active:scale-97 cursor-pointer"
            >
              Reset
            </button>
          </div>
        </div>

      </div>

      {/* Main Stock Data Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-3xs overflow-hidden">
        <div className="overflow-x-auto">
          {typeParam !== 'OPNAME' ? (
            /* Table 1: Historical movements log (Kartu Stok, Stok Masuk, Stok Keluar, Transfer) */
            <table className="w-full min-w-[950px] text-left border-collapse text-xs">
              <thead className="bg-[#1a202c] text-white text-[9.5px] font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-3.5 pl-5">Tanggal & Waktu</th>
                  <th className="p-3.5">Nama Produk</th>
                  <th className="p-3.5">SKU</th>
                  <th className="p-3.5">Kategori</th>
                  <th className="p-3.5">Jenis Aliran</th>
                  <th className="p-3.5 text-right">Kuantitas</th>
                  <th className="p-3.5 pr-5">Memo / Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600 font-semibold">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-10 text-center">
                      <Loader2 className="w-5 h-5 animate-spin text-slate-400 mx-auto" />
                    </td>
                  </tr>
                ) : filteredMovements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-16 text-center text-slate-400">
                      <Boxes className="w-7 h-7 mx-auto text-slate-300 mb-2" />
                      <p className="text-xs font-bold text-slate-600">Belum ada catatan mutasi persediaan</p>
                    </td>
                  </tr>
                ) : (
                  filteredMovements.map((m) => {
                    const isIN = m.type === 'IN'
                    const isOUT = m.type === 'OUT'
                    const isDAMAGED = m.type === 'DAMAGED'
                    
                    return (
                      <tr key={m.id} className="hover:bg-slate-50/45 transition-colors">
                        <td className="p-3.5 pl-5 text-slate-500 font-medium whitespace-nowrap">
                          {new Date(m.createdAt).toLocaleString('id-ID')}
                        </td>
                        <td className="p-3.5 font-bold text-slate-900">{m.product?.name}</td>
                        <td className="p-3.5 font-mono text-slate-400">{m.product?.sku || '-'}</td>
                        <td className="p-3.5">
                          <span className="bg-slate-100 border border-slate-200 text-[10px] px-2 py-0.5 rounded-full font-bold text-slate-600">
                            {m.product?.category?.name || 'Umum'}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            isIN 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-250/70' 
                              : isDAMAGED 
                              ? 'bg-rose-50 text-rose-700 border-rose-200' 
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}>
                            {isIN ? 'Stok Masuk' : isDAMAGED ? 'Barang Rusak' : 'Stok Keluar'}
                          </span>
                        </td>
                        <td className={`p-3.5 text-right font-mono font-black ${isIN ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {isIN ? `+${m.qty}` : `-${m.qty}`} Pcs
                        </td>
                        <td className="p-3.5 pr-5 text-slate-500 font-medium max-w-xs truncate">{m.note || '-'}</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          ) : (
            /* Table 2: Stok Opname Reconciler Input Grid */
            <table className="w-full min-w-[950px] text-left border-collapse text-xs">
              <thead className="bg-[#1a202c] text-white text-[9.5px] font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-3.5 pl-5">Produk</th>
                  <th className="p-3.5">SKU</th>
                  <th className="p-3.5">Kategori</th>
                  <th className="p-3.5 text-right">Stok Sistem</th>
                  <th className="p-3.5 text-center w-40">Stok Fisik (Aktual)</th>
                  <th className="p-3.5 text-right w-28">Selisih</th>
                  <th className="p-3.5 pr-5">Catatan Koreksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600 font-semibold">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-10 text-center">
                      <Loader2 className="w-5 h-5 animate-spin text-slate-400 mx-auto" />
                    </td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-16 text-center text-slate-400">
                      <Boxes className="w-7 h-7 mx-auto text-slate-300 mb-2" />
                      <p className="text-xs font-bold text-slate-600">Tidak ada produk ditemukan di outlet ini</p>
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => {
                    const actualVal = opnameActuals[p.id]
                    const diff = (actualVal !== undefined && actualVal !== '') 
                      ? Number(actualVal) - p.stock 
                      : 0

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/45 transition-colors">
                        <td className="p-3.5 pl-5 font-bold text-slate-900">{p.name}</td>
                        <td className="p-3.5 font-mono text-slate-400">{p.sku}</td>
                        <td className="p-3.5">
                          <span className="bg-slate-100 border border-slate-200 text-[10px] px-2 py-0.5 rounded-full font-bold text-slate-600">
                            {p.category?.name || 'Umum'}
                          </span>
                        </td>
                        <td className="p-3.5 text-right font-mono font-bold text-slate-700">{p.stock} Pcs</td>
                        <td className="p-3.5 text-center">
                          <input
                            type="number"
                            placeholder="Ketik stok fisik..."
                            value={actualVal ?? ''}
                            onChange={(e) => {
                              const val = e.target.value
                              setOpnameActuals(prev => ({ ...prev, [p.id]: val }))
                            }}
                            className="w-32 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md text-xs font-bold text-center text-slate-800 focus:bg-white focus:border-sky-500 outline-none transition-all"
                          />
                        </td>
                        <td className={`p-3.5 text-right font-mono font-black ${
                          actualVal === undefined || actualVal === ''
                            ? 'text-slate-400'
                            : diff > 0
                            ? 'text-emerald-600'
                            : diff < 0
                            ? 'text-rose-600'
                            : 'text-slate-500'
                        }`}>
                          {actualVal === undefined || actualVal === ''
                            ? '-'
                            : diff > 0
                            ? `+${diff} Pcs`
                            : `${diff} Pcs`}
                        </td>
                        <td className="p-3.5 pr-5">
                          <input
                            type="text"
                            placeholder="Ketik catatan penyesuaian..."
                            value={opnameNotes[p.id] ?? ''}
                            onChange={(e) => {
                              const val = e.target.value
                              setOpnameNotes(prev => ({ ...prev, [p.id]: val }))
                            }}
                            className="w-full bg-slate-50 border border-slate-200 px-3 py-1 rounded-md text-xs font-semibold text-slate-700 focus:bg-white focus:border-sky-500 outline-none transition-all"
                          />
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal 1: Tambah Stok Masuk */}
      {isOpenInModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs transition-all">
          <div className="w-full max-w-md overflow-hidden rounded-xl border border-slate-150 bg-white p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-black text-slate-900">Tambah Masuk Stok (Inflow)</h3>
                <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Catat penambahan baju dari supplier.</p>
              </div>
              <button onClick={() => setIsOpenInModal(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitIn} className="mt-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 font-sans">Pilih Baju / Produk</label>
                <div className="relative">
                  <select
                    value={formIn.productId}
                    onChange={(e) => setFormIn({ ...formIn, productId: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-3 pr-8 py-3 text-xs font-bold text-slate-800 outline-none cursor-pointer appearance-none focus:border-sky-500 focus:bg-white"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} — SKU: {p.sku} (Stok: {p.stock})</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 font-sans">Supplier</label>
                  <div className="relative">
                    <select
                      value={formIn.supplierId}
                      onChange={(e) => setFormIn({ ...formIn, supplierId: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-3 pr-8 py-3 text-xs font-bold text-slate-800 outline-none cursor-pointer appearance-none focus:border-sky-500 focus:bg-white"
                    >
                      <option value="">Tanpa Supplier</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 font-sans">Jumlah Qty Masuk</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formIn.qty}
                    onChange={(e) => setFormIn({ ...formIn, qty: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-3 text-xs font-bold outline-none focus:bg-white focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 font-sans">Keterangan / Catatan</label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Pengiriman pesanan PO baju muslim"
                  value={formIn.note}
                  onChange={(e) => setFormIn({ ...formIn, note: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-semibold outline-none resize-none focus:bg-white focus:border-sky-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4 mt-6">
                <button type="button" disabled={isSubmitting} onClick={() => setIsOpenInModal(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-all cursor-pointer">Batal</button>
                <button type="submit" disabled={isSubmitting || products.length === 0} className="rounded-xl bg-sky-500 px-4 py-2.5 text-xs font-bold text-white hover:bg-sky-600 transition-all cursor-pointer">
                  {isSubmitting ? 'Memproses...' : 'Simpan Stok Masuk'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Tambah Stok Keluar */}
      {isOpenOutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs transition-all">
          <div className="w-full max-w-md overflow-hidden rounded-xl border border-slate-150 bg-white p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-black text-slate-900">Tambah Keluar Stok (Outflow)</h3>
                <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Catat pengurangan baju dari inventori.</p>
              </div>
              <button onClick={() => setIsOpenOutModal(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitOut} className="mt-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 font-sans">Pilih Baju / Produk</label>
                <div className="relative">
                  <select
                    value={formOut.productId}
                    onChange={(e) => setFormOut({ ...formOut, productId: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-3 pr-8 py-3 text-xs font-bold text-slate-800 outline-none cursor-pointer appearance-none focus:border-sky-500 focus:bg-white"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} — SKU: {p.sku} (Sisa: {p.stock} Pcs)</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 font-sans">Alasan Pengeluaran</label>
                  <div className="relative">
                    <select
                      value={formOut.reason}
                      onChange={(e) => setFormOut({ ...formOut, reason: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-3 pr-8 py-3 text-xs font-bold text-slate-800 outline-none cursor-pointer appearance-none focus:border-sky-500 focus:bg-white"
                    >
                      <option value="Barang Rusak">Barang Rusak</option>
                      <option value="Sampel">Hadiah / Sampel Promo</option>
                      <option value="Koreksi Audit">Koreksi Audit</option>
                      <option value="Lainnya">Lain-lain</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 font-sans">Jumlah Qty Keluar</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formOut.qty}
                    onChange={(e) => setFormOut({ ...formOut, qty: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-3 text-xs font-bold outline-none focus:bg-white focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 font-sans">Keterangan / Catatan</label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Robek pada jahitan display depan"
                  value={formOut.note}
                  onChange={(e) => setFormOut({ ...formOut, note: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-semibold outline-none resize-none focus:bg-white focus:border-sky-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4 mt-6">
                <button type="button" disabled={isSubmitting} onClick={() => setIsOpenOutModal(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-all cursor-pointer">Batal</button>
                <button type="submit" disabled={isSubmitting || products.length === 0} className="rounded-xl bg-sky-500 px-4 py-2.5 text-xs font-bold text-white hover:bg-sky-600 transition-all cursor-pointer">
                  {isSubmitting ? 'Memproses...' : 'Simpan Stok Keluar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Buat Transfer Stok */}
      {isOpenTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs transition-all">
          <div className="w-full max-w-md overflow-hidden rounded-xl border border-slate-150 bg-white p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-black text-slate-900">Kirim Transfer Persediaan Stok</h3>
                <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Kirim stok baju ke cabang outlet lainnya.</p>
              </div>
              <button onClick={() => setIsOpenTransferModal(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitTransfer} className="mt-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 font-sans">Pilih Baju / Produk</label>
                <div className="relative">
                  <select
                    value={formTransfer.productId}
                    onChange={(e) => setFormTransfer({ ...formTransfer, productId: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-3 pr-8 py-3 text-xs font-bold text-slate-800 outline-none cursor-pointer appearance-none focus:border-sky-500 focus:bg-white"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} — SKU: {p.sku} (Sisa: {p.stock} Pcs)</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 font-sans">Outlet Tujuan</label>
                  <div className="relative">
                    <select
                      value={formTransfer.destStoreId}
                      onChange={(e) => setFormTransfer({ ...formTransfer, destStoreId: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-3 pr-8 py-3 text-xs font-bold text-slate-800 outline-none cursor-pointer appearance-none focus:border-sky-500 focus:bg-white"
                    >
                      {stores.filter(s => s.id !== selectedStoreId).map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                      {stores.filter(s => s.id !== selectedStoreId).length === 0 && (
                        <option value="">Tidak ada outlet lain</option>
                      )}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 font-sans">Jumlah Qty Transfer</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formTransfer.qty}
                    onChange={(e) => setFormTransfer({ ...formTransfer, qty: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-3 text-xs font-bold outline-none focus:bg-white focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 font-sans">Memo Catatan Transfer</label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Distribusi untuk cabang Bandung"
                  value={formTransfer.note}
                  onChange={(e) => setFormTransfer({ ...formTransfer, note: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-semibold outline-none resize-none focus:bg-white focus:border-sky-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4 mt-6">
                <button type="button" disabled={isSubmitting} onClick={() => setIsOpenTransferModal(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-all cursor-pointer">Batal</button>
                <button type="submit" disabled={isSubmitting || products.length === 0 || stores.filter(s => s.id !== selectedStoreId).length === 0} className="rounded-xl bg-sky-500 px-4 py-2.5 text-xs font-bold text-white hover:bg-sky-600 transition-all cursor-pointer">
                  {isSubmitting ? 'Memproses...' : 'Kirim Transfer Stok'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Excel Progress Modal */}
      {importStatus && (
        <div className="fixed inset-0 z-55 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl overflow-hidden border border-slate-200/80 animate-in slide-in-from-bottom-3 duration-250 flex flex-col max-h-[85vh]">
            <div className="p-6 pb-0 flex items-start justify-between shrink-0">
              <div>
                <h3 className="text-base font-black text-slate-955">{importStatus.isFinished ? 'Proses Import Selesai' : 'Sedang Mengimport Stok...'}</h3>
                <p className="text-[10.5px] font-semibold text-slate-400 mt-0.5">
                  {importStatus.isFinished ? 'Proses penyesuaian stok massal selesai.' : 'Jangan menutup halaman ini.'}
                </p>
              </div>
              {importStatus.isFinished && (
                <button type="button" onClick={() => setImportStatus(null)} className="h-8 w-8 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
                  <X size={15} />
                </button>
              )}
            </div>

            <div className="h-px bg-slate-100 my-4 mx-6 shrink-0" />

            <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-5">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-700">
                  <span>Progres</span>
                  <span className="font-mono">{importStatus.current} / {importStatus.total} ({Math.round((importStatus.current / importStatus.total) * 100)}%)</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                  <div className="h-full bg-sky-500 rounded-full transition-all duration-300 ease-out" style={{ width: `${(importStatus.current / importStatus.total) * 100}%` }} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-50/55 border border-emerald-200/50 rounded-xl p-3 flex items-center gap-3">
                  <div className="h-8 w-8 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600 shrink-0"><CheckCircle size={16} /></div>
                  <div>
                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block leading-none">Berhasil</span>
                    <span className="font-mono text-sm font-black text-emerald-700">{importStatus.successCount}</span>
                  </div>
                </div>
                <div className="bg-rose-50/55 border border-rose-200/50 rounded-xl p-3 flex items-center gap-3">
                  <div className="h-8 w-8 bg-rose-100 rounded-lg flex items-center justify-center text-rose-600 shrink-0"><AlertCircle size={16} /></div>
                  <div>
                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block leading-none">Gagal</span>
                    <span className="font-mono text-sm font-black text-rose-700">{importStatus.errors.length}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default function StockMovementPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-full items-center justify-center bg-[#f4f6f9]">
        <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
      </div>
    }>
      <StockMovementPageContent />
    </Suspense>
  )
}

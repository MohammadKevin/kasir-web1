'use client'

import { useEffect, useState, useMemo } from 'react'
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
  AlertCircle
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
          alert(`Header kolom Excel tidak valid.\n\nBaris pertama file Anda berisi: "${firstRow}"\n\nFile Excel minimal harus memiliki kolom yang mengandung nama "Produk" dan "Stok Akhir". Mohon periksa baris header tabel Excel Anda.`);
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

        const token = localStorage.getItem('token')
        const headersApi = { Authorization: `Bearer ${token}` }

        let latestProducts: ProductType[] = []
        try {
          const prodRes = await api.get(`/products/store/${selectedStoreId}`, { headers: headersApi })
          latestProducts = prodRes.data || []
          setProducts(latestProducts)
        } catch (prodErr) {
          console.error('Failed to reload products before stock import', prodErr)
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
            console.warn('Import stock row error, trying direct PATCH fallback...', err.message || err)
            
            try {
              if (dbProduct) {
                const patchPayload = { stock: targetStock }
                await api.patch(`/products/${dbProduct.id}`, patchPayload, { headers: headersApi })
                successCount++
                continue
              }
            } catch (patchErr: any) {
              console.error('Direct PATCH fallback also failed', patchErr)
            }

            const responseData = err.response?.data
            const errMsg = responseData?.message || responseData?.error || err.message || 'Gagal menyimpan penyesuaian stok'
            const formattedError = Array.isArray(errMsg) ? errMsg.join(', ') : errMsg
            errors.push(`Baris ${i + headerRowIdx + 2} (${productName}): Excel Target = ${targetStock}, DB Sisa = ${currentStock} (Mutasi: ${type} ${qty} Pcs). Error: ${formattedError}`)
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
        alert('Gagal membaca atau memproses file Excel: ' + (excelErr.message || excelErr))
        setImportStatus(null)
      }
    }
    reader.readAsBinaryString(file)
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
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 bg-indigo-50 border border-indigo-100/55 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
            <Boxes size={20} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Mutasi & Log Stok</h1>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">Pantau rekam jejak keluar masuk barang dan koreksi opname internal toko.</p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <label className={`inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 hover:text-slate-800 transition-all shadow-3xs active:scale-97 cursor-pointer select-none shrink-0 ${
            importStatus && !importStatus.isFinished ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
          }`}>
            {importStatus && !importStatus.isFinished ? (
              <Loader2 size={14} className="text-indigo-600 animate-spin" />
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

          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white transition-all shadow-3xs hover:bg-indigo-700 active:scale-97 cursor-pointer shrink-0"
          >
            <Plus size={14} />
            Penyesuaian Stok
          </button>
        </div>
      </div>

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

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari nama produk, SKU, atau catatan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-250/70 bg-white pl-11 pr-11 py-3.5 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-3xs"
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
              className="w-full sm:w-56 appearance-none bg-white border border-slate-250/70 pl-4 pr-10 py-3.5 rounded-xl text-xs font-bold text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 cursor-pointer transition-all shadow-3xs"
            >
              {stores.map((store) => (
                <option key={store.id} value={store.id}>{store.name}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

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

            <tbody className="divide-y divide-slate-100 text-slate-600 font-semibold">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center">
                    <Loader2 className="w-5 h-5 animate-spin text-slate-400 mx-auto" />
                  </td>
                </tr>
              ) : filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-16 text-center text-slate-400">
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

      {isOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-all">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-150 bg-white p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-black text-slate-900">Koreksi Penyesuaian Stok</h3>
                <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Lakukan penyesuaian stock opname manual.</p>
              </div>
              <button onClick={() => setIsOpenModal(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600">
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
                <button type="submit" disabled={isSubmitting || products.length === 0} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 shadow-indigo-500/10 transition-all cursor-pointer">
                  {isSubmitting ? 'Memproses...' : 'Simpan Koreksi'}
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
            
            {/* Header */}
            <div className="p-6 pb-0 flex items-start justify-between shrink-0">
              <div>
                <h3 className="text-base font-black text-slate-950">
                  {importStatus.isFinished ? 'Proses Import Selesai' : 'Sedang Mengimport Stok...'}
                </h3>
                <p className="text-[10.5px] font-semibold text-slate-400 mt-0.5">
                  {importStatus.isFinished 
                    ? 'Proses penyesuaian stok massal telah rampung dilaksanakan' 
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

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-5">
              
              {/* Progress and status name */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-700">
                  <span>Progres</span>
                  <span className="font-mono">
                    {importStatus.current} / {importStatus.total} ({Math.round((importStatus.current / importStatus.total) * 100)}%)
                  </span>
                </div>
                
                {/* Progress bar container */}
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                  <div 
                    className="h-full bg-indigo-600 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${(importStatus.current / importStatus.total) * 100}%` }}
                  />
                </div>
                
                {!importStatus.isFinished && (
                  <p className="text-[10.5px] text-slate-500 font-semibold truncate animate-pulse">
                    Memproses: <span className="font-bold text-slate-800">{importStatus.currentName}</span>
                  </p>
                )}
              </div>

              {/* Statistics Grid */}
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

              {/* Error list (if any) */}
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

            {/* Footer */}
            {importStatus.isFinished && (
              <div className="p-6 border-t border-slate-100 bg-slate-50/50 shrink-0 flex justify-end">
                <button 
                  type="button" 
                  onClick={() => setImportStatus(null)} 
                  className="w-full sm:w-auto rounded-xl bg-indigo-600 hover:bg-indigo-700 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/10 transition-all active:scale-98 cursor-pointer flex justify-center items-center gap-1.5"
                >
                  <span>Selesai & Tutup</span>
                  <CheckCircle size={14} />
                </button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  )
}

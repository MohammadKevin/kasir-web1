'use client'

import { useEffect, useState, useMemo } from 'react'
import { api } from '@/lib/api'
import * as XLSX from 'xlsx'
import { 
  Plus, 
  Trash2, 
  X, 
  Receipt, 
  Building2, 
  Package, 
  Loader2, 
  Store, 
  Search, 
  Calendar, 
  Eye,
  ChevronDown,
  ShoppingCart,
  PlusCircle,
  Upload,
  CheckCircle,
  AlertCircle
} from 'lucide-react'

type PurchaseItem = {
  id?: string
  productId: string
  quantity: number
  costPrice: number
  product?: {
    name: string
    sku: string
  }
}

type Purchase = {
  id: string
  invoiceNumber: string
  total: number
  createdAt: string
  supplierId: string
  supplier?: {
    name: string
    phone?: string
  }
  items?: PurchaseItem[]
}

type StoreType = {
  id: string
  name: string
}

type CartItem = {
  productId: string
  name: string
  quantity: number
  costPrice: number
}

export default function PurchasePage() {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [stores, setStores] = useState<StoreType[]>([])
  const [selectedStoreId, setSelectedStoreId] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingList, setLoadingList] = useState(false)
  const [open, setOpen] = useState(false)

  const [supplierId, setSupplierId] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedProd, setSelectedProd] = useState('')
  const [qty, setQty] = useState(1)
  const [submitting, setSubmitting] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')

  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null)
  const [isOpenDetail, setIsOpenDetail] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const [isOpenImportModal, setIsOpenImportModal] = useState(false)
  const [importSupplierId, setImportSupplierId] = useState('')
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
      loadData(selectedStoreId)
    }
  }, [selectedStoreId])

  async function initPage() {
    setLoading(true)
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
    } catch (err) {
      console.error("Gagal menginisialisasi halaman:", err)
      setLoading(false)
    }
  }

  async function loadData(storeId: string) {
    setLoadingList(true)
    const token = localStorage.getItem('token')
    const headers = { Authorization: `Bearer ${token}` }

    try {
      const [pRes, sRes, prodRes] = await Promise.all([
        api.get(`/purchases/store/${storeId}`, { headers }),
        api.get(`/suppliers/store/${storeId}`, { headers }),
        api.get(`/products/store/${storeId}`, { headers })
      ])

      setPurchases(pRes.data)
      setSuppliers(sRes.data)
      setProducts(prodRes.data)
    } catch (err) {
      console.error("Error loading data:", err)
    } finally {
      setLoadingList(false)
      setLoading(false)
    }
  }

  async function handleImportPurchasesExcel(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    e.target.value = ''

    if (!selectedStoreId) {
      alert('Silakan pilih toko/cabang terlebih dahulu!')
      return
    }

    const defaultSupplier = suppliers.find(s => s.id === importSupplierId)

    const reader = new FileReader()
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result
        const wb = XLSX.read(bstr, { type: 'binary' })
        const wsname = wb.SheetNames[0]
        const ws = wb.Sheets[wsname]
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][]

        if (data.length <= 1) {
          alert('File Excel kosong atau tidak memiliki data pembelian.')
          return
        }

        const parseExcelNumber = (val: any): number => {
          if (val === undefined || val === null) return 0
          if (typeof val === 'number') return val
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
            if (parts.length === 2 && parts[1].length === 2) {
              str = str.replace(/,/g, '.')
            } else {
              str = str.replace(/,/g, '.')
            }
          }
          const num = Number(str)
          return isNaN(num) ? 0 : num
        }

        const parseExcelDate = (val: any): Date | null => {
          if (!val) return null
          if (val instanceof Date) return val
          if (typeof val === 'number') {
            const excelEpoch = new Date(Date.UTC(1899, 11, 30))
            const msPerDay = 24 * 60 * 60 * 1000
            return new Date(excelEpoch.getTime() + val * msPerDay)
          }
          const str = String(val).trim()
          
          const parts = str.split(/[-/]/)
          if (parts.length === 3) {
            const day = parseInt(parts[0], 10)
            const month = parseInt(parts[1], 10) - 1
            const year = parseInt(parts[2], 10)
            if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
              if (year > 1000) {
                return new Date(year, month, day)
              }
            }
          }
          
          const parsed = new Date(str)
          return isNaN(parsed.getTime()) ? null : parsed
        }

        let headerRowIdx = -1
        let invoiceIdx = -1
        let dateIdx = -1
        let supplierIdx = -1
        let productIdx = -1
        let qtyIdx = -1
        let priceIdx = -1

        const invoicePossibilities = ['no invoice', 'no nota', 'invoice number', 'nomor invoice', 'nomor nota', 'invoice', 'nota', 'faktur', 'no faktur', 'id invoice', 'id pembelian', 'purchase order', 'no po', 'po number']
        const datePossibilities = ['tanggal', 'date', 'waktu', 'time', 'created at', 'tgl', 'tanggal pembelian', 'order date']
        const supplierPossibilities = ['nama supplier', 'supplier', 'vendor', 'nama vendor', 'supplier name', 'perusahaan']
        const namePossibilities = ['produk', 'nama produk', 'nama barang', 'product', 'item', 'nama varian', 'nama variant', 'produk/varian', 'produk nama']
        const qtyPossibilities = ['qty', 'kuantitas', 'jumlah', 'quantity', 'pembelian', 'jumlah barang', 'jumlah beli', 'jumlah pesanan', 'jumlah diterima']
        const pricePossibilities = ['harga beli', 'harga modal', 'cost price', 'harga', 'unit price', 'harga satuan', 'harga beli satuan']

        for (let r = 0; r < Math.min(data.length, 15); r++) {
          const row = data[r]
          if (!row || !Array.isArray(row)) continue
          
          const rowStr = row.map(cell => String(cell || '').trim().toLowerCase())
          
          const tempInvoiceIdx = rowStr.findIndex(cellVal => invoicePossibilities.some(p => cellVal === p || cellVal.includes(p)))
          const tempProductIdx = rowStr.findIndex(cellVal => namePossibilities.some(p => cellVal === p || cellVal.includes(p)))
          const tempQtyIdx = rowStr.findIndex(cellVal => qtyPossibilities.some(p => cellVal === p || cellVal.includes(p)))

          if (tempProductIdx !== -1 && tempQtyIdx !== -1) {
            headerRowIdx = r
            invoiceIdx = tempInvoiceIdx
            productIdx = tempProductIdx
            qtyIdx = tempQtyIdx
            
            dateIdx = rowStr.findIndex(cellVal => datePossibilities.some(p => cellVal === p || cellVal.includes(p)))
            supplierIdx = rowStr.findIndex(cellVal => supplierPossibilities.some(p => cellVal === p || cellVal.includes(p)))
            priceIdx = rowStr.findIndex(cellVal => pricePossibilities.some(p => cellVal === p || cellVal.includes(p)))
            break
          }
        }

        let excelDate: Date | null = null
        for (let r = 0; r < Math.min(data.length, 15); r++) {
          const row = data[r]
          if (!row || !Array.isArray(row)) continue
          const colA = String(row[0] || '').trim().toLowerCase()
          if (colA === 'tanggal' || colA === 'date') {
            excelDate = parseExcelDate(row[1])
          }
        }

        let filenameInvoice = ''
        const filenameMatch = file.name.match(/\(?(PO-\d+)\)?/) || file.name.match(/(PO-[a-zA-Z0-9]+)/)
        if (filenameMatch) {
          filenameInvoice = filenameMatch[1]
        }

        if (headerRowIdx === -1) {
          const firstRow = data[0] && Array.isArray(data[0]) 
            ? data[0].map(h => String(h || '').trim()).join(', ') 
            : 'tidak terdeteksi'
          alert(`Header kolom Excel tidak valid.\n\nBaris pertama file Anda berisi: "${firstRow}"\n\nFile Excel minimal harus memiliki kolom yang mengandung nama "Produk" dan "Qty". Mohon periksa baris header tabel Excel Anda.`);
          return
        }

        const rawRows = data.slice(headerRowIdx + 1).filter(row => row.length > 0 && row[productIdx])
        if (rawRows.length === 0) {
          alert('Tidak ada data pembelian yang valid untuk di-import setelah baris header.')
          return
        }

        const rowHeader = data[headerRowIdx].map(c => String(c || '').trim().toLowerCase())
        const tempDiterimaIdx = rowHeader.findIndex(h => h.includes('jumlah diterima') || h.includes('qty diterima') || h.includes('diterima'))
        const tempPesananIdx = rowHeader.findIndex(h => h.includes('jumlah pesanan') || h.includes('qty pesanan') || h.includes('pesanan'))
        
        interface GroupedPurchase {
          invoiceNumber: string;
          dateStr?: string;
          supplierName: string;
          items: {
            productName: string;
            quantity: number;
            costPrice: number;
          }[];
          origLine: number;
        }

        const groups: GroupedPurchase[] = []
        let lastGroup: GroupedPurchase | null = null

        for (let i = 0; i < rawRows.length; i++) {
          const row = rawRows[i]
          const lineNum = i + headerRowIdx + 2

          const productName = String(row[productIdx] || '').trim()
          
          if (!productName || productName.toLowerCase() === 'total' || productName.toLowerCase().startsWith('total')) {
            continue
          }

          const rawInvoice = invoiceIdx !== -1 && row[invoiceIdx] ? String(row[invoiceIdx]).trim() : ''
          const rawDate = dateIdx !== -1 && row[dateIdx] ? String(row[dateIdx]).trim() : ''
          const rawSupplier = supplierIdx !== -1 && row[supplierIdx] ? String(row[supplierIdx]).trim() : ''
          
          let quantity = 0
          if (tempDiterimaIdx !== -1) {
            quantity = parseExcelNumber(row[tempDiterimaIdx])
          }
          if (quantity <= 0 && tempPesananIdx !== -1) {
            quantity = parseExcelNumber(row[tempPesananIdx])
          }
          if (quantity <= 0) {
            quantity = parseExcelNumber(row[qtyIdx])
          }
          
          const costPrice = parseExcelNumber(priceIdx !== -1 ? row[priceIdx] : 0)

          if (quantity <= 0) continue

          const item = { productName, quantity, costPrice }

          let isSameGroup = false
          if (lastGroup) {
            if (rawInvoice && lastGroup.invoiceNumber && rawInvoice === lastGroup.invoiceNumber) {
              isSameGroup = true
            } else if (!rawInvoice && !lastGroup.invoiceNumber && (!rawSupplier || rawSupplier === lastGroup.supplierName) && (!rawDate || rawDate === lastGroup.dateStr)) {
              isSameGroup = true
            } else if (!rawInvoice && lastGroup.invoiceNumber && !rawSupplier && !rawDate) {
              isSameGroup = true
            }
          }

          if (isSameGroup && lastGroup) {
            lastGroup.items.push(item)
          } else {
            const invoiceNum = rawInvoice || filenameInvoice || `INV-PURCH-${Date.now().toString().slice(-4)}-${groups.length + 1}`
            const supplierName = rawSupplier || (defaultSupplier ? defaultSupplier.name : 'Umum')
            const newGroup: GroupedPurchase = {
              invoiceNumber: invoiceNum,
              dateStr: rawDate || undefined,
              supplierName: supplierName,
              items: [item],
              origLine: lineNum
            }
            groups.push(newGroup)
            lastGroup = newGroup
          }
        }

        if (groups.length === 0) {
          alert('Tidak ada transaksi pembelian yang valid untuk di-import (semua baris kosong atau bernilai total).')
          return
        }

        setImportStatus({
          isOpen: true,
          total: groups.length,
          current: 0,
          currentName: '',
          errors: [],
          successCount: 0,
          isFinished: false,
        })

        setIsOpenImportModal(false)

        const token = localStorage.getItem('token')
        const headersApi = { Authorization: `Bearer ${token}` }

        let latestSuppliers = [...suppliers]
        let latestProducts = [...products]

        try {
          const [sRes, prodRes] = await Promise.all([
            api.get(`/suppliers/store/${selectedStoreId}`, { headers: headersApi }),
            api.get(`/products/store/${selectedStoreId}`, { headers: headersApi })
          ])
          latestSuppliers = sRes.data || []
          latestProducts = prodRes.data || []
          setSuppliers(latestSuppliers)
          setProducts(latestProducts)
        } catch (loadErr) {
          console.warn('Gagal memuat master data', loadErr)
        }

        let successCount = 0
        const errors: string[] = []

        for (let g = 0; g < groups.length; g++) {
          const group = groups[g]
          setImportStatus(prev => prev ? { ...prev, current: g + 1, currentName: group.invoiceNumber } : null)

          try {
            let suppId = ''
            const foundSupplier = latestSuppliers.find(s => s.name.toLowerCase() === group.supplierName.toLowerCase())
            if (foundSupplier) {
              suppId = foundSupplier.id
            } else if (importSupplierId) {
              suppId = importSupplierId
            } else {
              const suppPayload = {
                storeId: selectedStoreId,
                name: group.supplierName,
                phone: ''
              }
              const newSuppRes = await api.post('/suppliers', suppPayload, { headers: headersApi })
              const newSupp = newSuppRes.data
              if (newSupp && newSupp.id) {
                suppId = newSupp.id
                latestSuppliers.push(newSupp)
                setSuppliers([...latestSuppliers])
              } else {
                throw new Error(`Gagal membuat supplier baru "${group.supplierName}"`)
              }
            }

            const purchaseItems: any[] = []
            for (const item of group.items) {
              const dbProduct = latestProducts.find(p => p.name.toLowerCase() === item.productName.toLowerCase())
              if (!dbProduct) {
                throw new Error(`Produk "${item.productName}" tidak ditemukan di katalog cabang ini. Silakan daftarkan produk terlebih dahulu.`)
              }
              purchaseItems.push({
                productId: dbProduct.id,
                quantity: item.quantity,
                costPrice: item.costPrice || dbProduct.costPrice || 0
              })
            }

            if (purchaseItems.length === 0) {
              throw new Error(`Tidak ada item produk valid dalam nota pembelian ini`)
            }

            const payload: any = {
              storeId: selectedStoreId,
              supplierId: suppId,
              invoiceNumber: group.invoiceNumber,
              items: purchaseItems
            }

            await api.post('/purchases', payload, { headers: headersApi })
            successCount++
          } catch (err: any) {
            console.warn('Import purchase error', err)
            const responseData = err.response?.data
            const errMsg = responseData?.message || responseData?.error || err.message || 'Gagal menyimpan pembelian'
            const formattedError = Array.isArray(errMsg) ? errMsg.join(', ') : errMsg
            errors.push(`Baris ${group.origLine} (Nota: ${group.invoiceNumber}): ${formattedError}`)
          }
        }

        setImportStatus(prev => prev ? {
          ...prev,
          current: groups.length,
          currentName: 'Selesai!',
          successCount,
          errors,
          isFinished: true,
        } : null)

        loadData(selectedStoreId)
      } catch (excelErr: any) {
        alert('Gagal membaca atau memproses file Excel: ' + (excelErr.message || excelErr))
        setImportStatus(null)
      }
    }
    reader.readAsBinaryString(file)
  }

  function addToCart() {
    const p = products.find(i => i.id === selectedProd)
    if (!p) return
    
    const existingIndex = cart.findIndex(item => item.productId === p.id)
    if (existingIndex > -1) {
      const newCart = [...cart]
      newCart[existingIndex].quantity += qty
      setCart(newCart)
    } else {
      setCart([...cart, { productId: p.id, name: p.name, quantity: qty, costPrice: p.costPrice }])
    }
    
    setSelectedProd('')
    setQty(1)
  }

  function removeFromCart(productId: string) {
    setCart(cart.filter(item => item.productId !== productId))
  }

  async function submit() {
    if (!supplierId) return alert('Pilih supplier terlebih dahulu!')
    if (cart.length === 0) return alert('Keranjang pembelian masih kosong!')

    setSubmitting(true)
    const token = localStorage.getItem('token')
    const headers = { Authorization: `Bearer ${token}` }
    
    try {
      await api.post('/purchases', {
        storeId: selectedStoreId,
        supplierId,
        invoiceNumber: `INV-PURCH-${Date.now().toString().slice(-6)}`,
        items: cart.map(i => ({ productId: i.productId, quantity: i.quantity, costPrice: i.costPrice }))
      }, { headers })
      
      setOpen(false)
      setCart([])
      setSupplierId('')
      loadData(selectedStoreId)
    } catch (e: any) {
      console.error(e)
      alert(e.response?.data?.message || 'Gagal menyimpan transaksi pembelian')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleOpenDetail(purchase: Purchase) {
    setSelectedPurchase(purchase)
    setIsOpenDetail(true)
    setLoadingDetail(true)
    try {
      const token = localStorage.getItem('token')
      const headers = { Authorization: `Bearer ${token}` }
      const res = await api.get(`/purchases/${purchase.id}`, { headers })
      setSelectedPurchase(res.data)
    } catch (err) {
      console.error("Gagal memuat rincian pembelian dari API:", err)
    } finally {
      setLoadingDetail(false)
    }
  }

  const grandTotal = useMemo(() => cart.reduce((acc, curr) => acc + (curr.quantity * curr.costPrice), 0), [cart])

  const filteredPurchases = useMemo(() => {
    return purchases.filter((p) => {
      const matchesInvoice = p.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesSupplier = p.supplier?.name?.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesInvoice || matchesSupplier
    })
  }, [purchases, searchQuery])

  if (loading && stores.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="h-9 w-56 animate-pulse rounded-xl bg-slate-200" />
            <div className="h-4 w-72 animate-pulse rounded-lg bg-slate-100" />
          </div>
          <div className="h-11 w-44 animate-pulse rounded-xl bg-slate-200" />
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
            <Receipt size={20} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Transaksi Pembelian</h1>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">Catat dan monitoring pasokan stok barang masuk dari vendor supplier cabang toko.</p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => {
              setImportSupplierId('')
              setIsOpenImportModal(true)
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 hover:text-slate-800 transition-all shadow-3xs active:scale-97 cursor-pointer shrink-0"
          >
            <Upload size={14} className="text-slate-500" />
            <span>Import Excel</span>
          </button>

          <button
            onClick={() => {
              setCart([])
              setSupplierId('')
              setOpen(true)
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white transition-all shadow-3xs hover:bg-indigo-700 active:scale-97 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            Transaksi Baru
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari nomor nota invoice atau nama vendor..."
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
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-3xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                <th className="p-4 pl-6">Nomor Invoice</th>
                <th className="p-4">Waktu Masuk</th>
                <th className="p-4">Vendor Supplier</th>
                <th className="p-4">Total Pembayaran</th>
                <th className="p-4 pr-6 text-right">Opsi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-600 font-semibold">
              {loadingList ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center">
                    <Loader2 className="w-5 h-5 animate-spin text-slate-400 mx-auto" />
                  </td>
                </tr>
              ) : filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="p-3 bg-slate-50 border border-slate-150 rounded-2xl text-slate-400">
                        <Receipt className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-bold text-slate-600">Manifes pembelian masih kosong</p>
                      <p className="text-[10px] text-slate-400">Belum ada transaksi kulakan stok barang yang terdaftar.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((purchase) => (
                  <tr 
                    key={purchase.id} 
                    className="group hover:bg-slate-50/45 transition-colors cursor-pointer" 
                    onClick={() => handleOpenDetail(purchase)}
                  >
                    <td className="p-4 pl-6 font-mono font-bold text-slate-900">{purchase.invoiceNumber}</td>
                    <td className="p-4 whitespace-nowrap text-slate-500 font-medium">
                      {new Date(purchase.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-slate-400" />
                        <span className="font-semibold text-slate-800">{purchase.supplier?.name || 'Supplier'}</span>
                      </div>
                    </td>
                    <td className="p-4 whitespace-nowrap font-bold text-slate-900 font-mono">
                      Rp {purchase.total.toLocaleString('id-ID')}
                    </td>
                    <td className="p-4 pr-6 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleOpenDetail(purchase)}
                        className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
                        title="Lihat Rincian Kulakan"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex justify-center items-center p-4 transition-all">
          <div className="bg-white w-full max-w-2xl rounded-2xl p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-150 max-h-[95vh] overflow-y-auto space-y-5">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-sm font-black text-slate-900">Catat Kulakan Baru</h2>
                <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Input stok barang masuk dan hubungkan dengan vendor supplier.</p>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-605">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Vendor Supplier</label>
              <div className="relative">
                <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <select 
                  className="w-full rounded-xl border border-slate-200/80 bg-slate-50/50 pl-10 pr-10 py-3 text-xs font-semibold text-slate-800 outline-none transition-all appearance-none cursor-pointer focus:border-indigo-500 focus:bg-white" 
                  value={supplierId}
                  onChange={e => setSupplierId(e.target.value)}
                >
                  <option value="">Pilih Supplier</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Pilih Barang & Kuantitas</label>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <Package className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <select 
                    className="w-full rounded-xl border border-slate-200/80 bg-slate-50/50 pl-10 pr-10 py-3 text-xs font-semibold text-slate-800 outline-none transition-all appearance-none cursor-pointer focus:border-indigo-500 focus:bg-white" 
                    value={selectedProd} 
                    onChange={e => setSelectedProd(e.target.value)}
                  >
                    <option value="">Pilih Produk</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name} (Modal: Rp {p.costPrice.toLocaleString('id-ID')})</option>)}
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                </div>
                <input 
                  type="number" 
                  min="1"
                  className="w-full sm:w-28 rounded-xl border border-slate-200/80 bg-slate-50/50 px-3 py-3 text-xs font-semibold outline-none transition-all focus:border-indigo-500 focus:bg-white" 
                  value={qty} 
                  onChange={e => setQty(Number(e.target.value))} 
                  placeholder="Qty"
                />
                <button 
                  onClick={addToCart} 
                  className="inline-flex items-center justify-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl font-bold text-xs shadow-3xs active:scale-97 cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Tambah
                </button>
              </div>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/30">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Keranjang Item</span>
                <span className="text-[10px] font-bold text-slate-500">{cart.length} Jenis Barang</span>
              </div>
              
              <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
                {cart.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 italic">Belum ada barang ditambahkan ke keranjang.</div>
                ) : (
                  cart.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-4 hover:bg-slate-50 transition-colors text-xs">
                      <div>
                        <p className="font-extrabold text-slate-900">{item.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {item.quantity} x Rp {item.costPrice.toLocaleString('id-ID')}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-extrabold text-slate-900 font-mono">
                          Rp {(item.quantity * item.costPrice).toLocaleString('id-ID')}
                        </span>
                        <button 
                          onClick={() => removeFromCart(item.productId)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Hapus item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-slate-200 p-4 bg-slate-50/50 flex justify-between items-center font-bold text-slate-800 text-xs">
                <span>Total Pembelian</span>
                <span className="text-sm text-slate-900 font-mono">Rp {grandTotal.toLocaleString('id-ID')}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4 mt-6">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-all disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={submit}
                disabled={submitting || cart.length === 0}
                className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 shadow-indigo-500/10 transition-all disabled:opacity-40 cursor-pointer"
              >
                {submitting ? (
                  <div className="flex items-center gap-1.5">
                    <Loader2 className="h-3 w-3 animate-spin text-white" />
                    <span>Menyimpan...</span>
                  </div>
                ) : (
                  'Selesaikan Pembelian'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {isOpenDetail && selectedPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-all">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-150 bg-white p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-slate-500" />
                <h3 className="text-sm font-black text-slate-900">Rincian Nota Kulakan</h3>
              </div>
              <button onClick={() => setIsOpenDetail(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 font-mono text-xs text-slate-700 space-y-3">
              <div className="text-center border-b border-dashed border-slate-200 pb-2">
                <p className="font-bold text-xs text-slate-900 uppercase">FAKTUR KULAKAN (MASUK)</p>
                <p className="text-[9px] text-slate-400 mt-0.5">ID: {selectedPurchase.invoiceNumber}</p>
              </div>

              <div className="space-y-1 text-slate-500 text-[10px]">
                <p><span className="font-semibold text-slate-700">Waktu Masuk:</span> {new Date(selectedPurchase.createdAt).toLocaleString('id-ID')}</p>
                <p><span className="font-semibold text-slate-750">Supplier   :</span> {selectedPurchase.supplier?.name || 'Supplier'}</p>
                {selectedPurchase.supplier?.phone && (
                  <p><span className="font-semibold text-slate-755">Kontak     :</span> {selectedPurchase.supplier.phone}</p>
                )}
              </div>

              <div className="border-t border-b border-dashed border-slate-200 py-2 space-y-2">
                {loadingDetail ? (
                  <div className="flex justify-center items-center py-4">
                    <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                  </div>
                ) : !selectedPurchase.items || selectedPurchase.items.length === 0 ? (
                  <p className="text-center text-[10px] text-slate-400 italic py-2">Rincian item tidak tersedia</p>
                ) : (
                  selectedPurchase.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-start gap-4 text-[10px]">
                      <div>
                        <p className="font-bold text-slate-900">{item.product?.name || 'Produk'}</p>
                        <p className="text-[9.5px] text-slate-400">{item.quantity} x Rp {item.costPrice.toLocaleString('id-ID')}</p>
                      </div>
                      <p className="font-bold text-slate-900">Rp {(item.quantity * item.costPrice).toLocaleString('id-ID')}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="flex justify-between font-bold text-slate-900 text-xs pt-1.5 border-t border-dashed border-slate-200">
                <span>TOTAL KULAKAN:</span>
                <span>Rp {selectedPurchase.total.toLocaleString('id-ID')}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-5">
              <button 
                onClick={() => setIsOpenDetail(false)}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 shadow-indigo-500/10 transition-all cursor-pointer"
              >
                Tutup Rincian
              </button>
            </div>
          </div>
        </div>
      )}

      {isOpenImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-all">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-150 bg-white p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-black text-slate-900">Import Nota Pembelian Excel</h3>
                <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Unggah log transaksi PO kulakan massal dari Pawoon atau format kustom.</p>
              </div>
              <button 
                onClick={() => setIsOpenImportModal(false)} 
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Supplier Utama (Opsional)</label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  <select
                    value={importSupplierId}
                    onChange={(e) => setImportSupplierId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200/80 bg-slate-50/50 pl-10 pr-10 py-3 text-xs font-semibold text-slate-800 outline-none cursor-pointer appearance-none focus:border-indigo-500 focus:bg-white"
                  >
                    <option value="">Deteksi Otomatis dari Excel / Baru</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                </div>
                <p className="text-[9px] text-slate-400 mt-1">
                  Jika Excel tidak memiliki kolom Supplier, transaksi akan dihubungkan ke supplier yang Anda pilih di atas. Jika dikosongkan, akan dibuat supplier baru bernama &quot;Umum&quot;.
                </p>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Pilih File Excel Pembelian</label>
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 bg-slate-50 hover:bg-slate-100/70 py-6 px-4 rounded-xl cursor-pointer gap-2 text-slate-500 hover:text-indigo-600 transition-all select-none">
                  <Upload size={20} className="text-slate-400" />
                  <span className="text-xs font-bold">Pilih File (.xlsx, .xls)</span>
                  <span className="text-[9px] text-slate-400">Pastikan file memiliki kolom Produk Nama & Jumlah (Qty)</span>
                  <input 
                    type="file" 
                    accept=".xlsx, .xls" 
                    onChange={handleImportPurchasesExcel} 
                    className="hidden" 
                  />
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4 mt-6">
                <button 
                  type="button" 
                  onClick={() => setIsOpenImportModal(false)} 
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-all"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {importStatus && (
        <div className="fixed inset-0 z-55 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200/80 animate-in slide-in-from-bottom-3 duration-250 flex flex-col max-h-[85vh]">
            <div className="p-6 pb-0 flex items-start justify-between shrink-0">
              <div>
                <h3 className="text-base font-black text-slate-950">
                  {importStatus.isFinished ? 'Proses Import Selesai' : 'Sedang Mengimport Pembelian...'}
                </h3>
                <p className="text-[10.5px] font-semibold text-slate-400 mt-0.5">
                  {importStatus.isFinished 
                    ? 'Proses import transaksi pembelian massal telah rampung dilaksanakan' 
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
                    className="h-full bg-indigo-600 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${(importStatus.current / importStatus.total) * 100}%` }}
                  />
                </div>
                
                {!importStatus.isFinished && (
                  <p className="text-[10.5px] text-slate-505 font-semibold truncate animate-pulse">
                    Memproses Nota: <span className="font-bold text-slate-800">{importStatus.currentName}</span>
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

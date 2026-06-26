'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { 
  ArrowLeft, 
  Database, 
  RefreshCw, 
  HelpCircle, 
  Sliders, 
  CheckCircle, 
  AlertCircle, 
  ChevronRight, 
  ChevronDown, 
  Play, 
  X, 
  AlertTriangle,
  Loader2,
  Upload,
  FileSpreadsheet
} from 'lucide-react'
import * as XLSX from 'xlsx'

type StoreType = { id: string; name: string }
type CategoryType = { id: string; name: string }

export default function MajooSyncPage() {
  const router = useRouter()
  const [stores, setStores] = useState<StoreType[]>([])
  const [categories, setCategories] = useState<CategoryType[]>([])
  
  // Data source selector
  const [dataSource, setDataSource] = useState<'api' | 'file'>('api')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  
  // Form values
  const [selectedStoreId, setSelectedStoreId] = useState('')
  const [syncMode, setSyncMode] = useState<'products' | 'stock_update' | 'transactions'>('products')
  const [majooUrl, setMajooUrl] = useState('https://api.majoo.id/v1/products')
  const [authHeader, setAuthHeader] = useState('')
  const [cookieHeader, setCookieHeader] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showInstructions, setShowInstructions] = useState(true)
  
  // Cashiers for transactions sync
  const [cashiers, setCashiers] = useState<any[]>([])
  const [selectedCashierId, setSelectedCashierId] = useState('')
  
  // Fetched data and state
  const [rawData, setRawData] = useState<any>(null)
  const [productsArray, setProductsArray] = useState<any[]>([])
  const [availableKeys, setAvailableKeys] = useState<string[]>([])
  const [availableItemKeys, setAvailableItemKeys] = useState<string[]>([])
  
  // Field Mappings
  const [mappings, setMappings] = useState({
    name: '',
    sku: '',
    barcode: '',
    sellingPrice: '',
    costPrice: '',
    stock: '',
    category: '',
    
    // Transactions mapping fields
    txDate: '',
    txPaymentMethod: '',
    txTotal: '',
    txSubtotal: '',
    txDiscount: '',
    txItems: '',
    itemSku: '',
    itemName: '',
    itemQty: '',
    itemPrice: '',
    itemDiscount: ''
  })
  
  // Sync state
  const [syncStatus, setSyncStatus] = useState<{
    isOpen: boolean
    total: number
    current: number
    currentName: string
    successCount: number
    errors: string[]
    isFinished: boolean
  } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }

    const headers = { Authorization: `Bearer ${token}` }
    
    // Load stores
    api.get('/stores', { headers })
      .then(res => {
        setStores(res.data || [])
        if (res.data && res.data.length > 0) {
          setSelectedStoreId(res.data[0].id)
        }
      })
      .catch(err => console.error('Failed to load stores', err))
  }, [router])

  // Helper to normalize keys and find matches (e.g. handling newlines and extra spaces)
  function findKey(keys: string[], targets: string[], containsTargets: string[] = []): string {
    const cleanKey = (k: string) => k.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase()
    const normalizedKeys = keys.map(k => ({ original: k, clean: cleanKey(k) }))
    
    // 1. Try exact clean match
    for (const target of targets) {
      const found = normalizedKeys.find(nk => nk.clean === target.toLowerCase())
      if (found) return found.original
    }
    
    // 2. Try partial/includes match from containsTargets
    for (const ct of containsTargets) {
      const found = normalizedKeys.find(nk => nk.clean.includes(ct.toLowerCase()))
      if (found) return found.original
    }
    
    // 3. Fallback includes of targets
    for (const target of targets) {
      const found = normalizedKeys.find(nk => nk.clean.includes(target.toLowerCase()))
      if (found) return found.original
    }
    
    return ''
  }

  // Helper to load categories for a store
  async function loadCategories(storeId: string) {
    try {
      const token = localStorage.getItem('token')
      const res = await api.get(`/categories/store/${storeId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setCategories(res.data || [])
      return res.data || []
    } catch (err) {
      console.error('Failed to load categories', err)
      return []
    }
  }

  // Helper to load cashiers for a store
  async function loadCashiers(storeId: string) {
    try {
      const token = localStorage.getItem('token')
      const res = await api.get(`/cashier/store/${storeId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setCashiers(res.data || [])
      if (res.data && res.data.length > 0) {
        setSelectedCashierId(res.data[0].id)
      }
      return res.data || []
    } catch (err) {
      console.error('Failed to load cashiers', err)
      return []
    }
  }

  useEffect(() => {
    if (selectedStoreId) {
      loadCategories(selectedStoreId)
      loadCashiers(selectedStoreId)
    }
  }, [selectedStoreId])

  useEffect(() => {
    if (productsArray.length === 0) return

    const firstItem = productsArray[0]
    const keys = Object.keys(firstItem)
    setAvailableKeys(keys)

    if (syncMode === 'transactions') {
      const hasArrayKey = keys.some(k => Array.isArray(firstItem[k]))
      const productColumnKey = keys.find(k => ['produk', 'product', 'items', 'barang'].includes(k.toLowerCase()))
      const isFlatDetect = !hasArrayKey || keys.some(k => ['product_name', 'product_sku', 'product_qty'].includes(k.toLowerCase()))

      const txItemsKey = productColumnKey || (isFlatDetect ? '_flat' : (keys.find(k => Array.isArray(firstItem[k])) || ''))
      const rawTxItemsVal = txItemsKey && txItemsKey !== '_flat' ? firstItem[txItemsKey] : null
      const firstTxItem = rawTxItemsVal && Array.isArray(rawTxItemsVal) && rawTxItemsVal.length > 0 ? rawTxItemsVal[0] : null
      const itemKeys = txItemsKey === '_flat' ? keys : (firstTxItem && typeof firstTxItem === 'object' ? Object.keys(firstTxItem) : [])
      setAvailableItemKeys(itemKeys)

      setMappings(prev => ({
        ...prev,
        txDate: findKey(keys, ['waktu order', 'waktu bayar', 'waktu_order', 'waktu order', 'tanggal \u0026 waktu', 'tanggal', 'date', 'waktu', 'time', 'created_at', 'created at', 'tgl', 'tanggal transaksi', 'waktu transaksi'], ['waktu', 'tanggal', 'date']),
        txPaymentMethod: findKey(keys, ['payment_method', 'payment', 'metode_pembayaran', 'payment_type', 'metode pembayaran', 'tipe pembayaran', 'cara bayar', 'metode bayar'], ['payment', 'bayar']),
        txTotal: findKey(keys, ['total', 'grand_total', 'total_price', 'amount', 'total_amount', 'total penjualan (rp)', 'total penjualan', 'total (rp)', 'nominal', 'total bayar'], ['total']),
        txSubtotal: findKey(keys, ['subtotal', 'amount', 'sub_total', 'subtotal (rp)', 'sub total'], ['subtotal', 'sub_total']),
        txDiscount: findKey(keys, ['discount', 'total_discount', 'discount_amount', 'diskon', 'potongan', 'diskon transaksi'], ['discount', 'diskon']),
        txItems: txItemsKey,
        
        itemSku: findKey(itemKeys, ['sku', 'product_sku', 'code', 'product_code', 'sku produk', 'kode produk', 'kode barang', 'kode variant', 'sku variant'], ['sku', 'code', 'kode']),
        itemName: findKey(itemKeys, ['name', 'product_name', 'nama', 'nama_produk', 'title', 'nama produk', 'nama barang', 'item', 'produk'], ['name', 'nama', 'item', 'produk']),
        itemQty: findKey(itemKeys, ['qty', 'quantity', 'jumlah', 'count', 'product_qty', 'jumlah produk', 'jumlah barang', 'qty produk', 'kuantitas'], ['qty', 'quantity', 'jumlah', 'count']),
        itemPrice: findKey(itemKeys, ['price', 'selling_price', 'harga', 'rate', 'product_price', 'harga produk', 'harga barang', 'harga satuan', 'harga jual'], ['price', 'harga']),
        itemDiscount: findKey(itemKeys, ['discount', 'discount_amount', 'disc', 'product_discount', 'diskon produk', 'diskon barang', 'potongan harga'], ['discount', 'disc', 'diskon'])
      }))
    } else {
      setMappings(prev => ({
        ...prev,
        name: findKey(keys, ['name', 'product_name', 'nama', 'nama_produk', 'title', 'nama produk', 'nama barang'], ['nama produk', 'nama barang', 'nama']),
        sku: findKey(keys, ['sku satuan #1', 'sku satuan 1', 'sku\nsatuan #1', 'sku\nsatuan 1', 'sku', 'product_code', 'kode', 'kode_produk', 'sku_code', 'sku produk', 'kode produk', 'kode barang'], ['sku', 'code', 'kode']),
        barcode: findKey(keys, ['barcode', 'upc', 'ean', 'kode_barcode', 'kode barcode'], ['barcode']),
        sellingPrice: findKey(keys, ['harga jual satuan #1', 'harga jual satuan 1', 'harga jual\nsatuan #1', 'harga jual\nsatuan 1', 'harga jual', 'price', 'selling_price', 'harga', 'harga_jual', 'retail_price', 'harga jual (rp)'], ['harga jual', 'selling']),
        costPrice: findKey(keys, ['harga beli satuan #1', 'harga beli satuan 1', 'harga beli\nsatuan #1', 'harga beli\nsatuan 1', 'harga modal #1', 'harga modal 1', 'harga modal\n#1', 'harga modal\n1', 'harga beli', 'harga modal', 'cost', 'cost_price', 'harga_beli', 'modal', 'purchase_price', 'harga beli (rp)', 'harga modal'], ['harga beli', 'harga modal', 'cost', 'modal']),
        stock: findKey(keys, ['stok akhir', 'stok_akhir', 'akhir', 'stock', 'qty', 'quantity', 'stok', 'jumlah stok', 'stok awal'], ['stok', 'stock', 'qty', 'quantity', 'akhir']),
        category: findKey(keys, ['category', 'category_name', 'kategori', 'group', 'kelompok', 'kategori produk'], ['kategori', 'category'])
      }))
    }
  }, [syncMode, productsArray])

  // Recursively search for the largest array of objects in response JSON
  function findProductsArray(obj: any): any[] | null {
    if (Array.isArray(obj)) {
      return obj
    }
    if (obj && typeof obj === 'object') {
      // First, check common key names for list arrays (even if empty)
      const commonKeys = ['data', 'list', 'sales', 'transactions', 'items', 'products', 'records', 'results', 'detail_sales', 'detail']
      for (const key of commonKeys) {
        if (key in obj && Array.isArray(obj[key])) {
          return obj[key]
        }
      }

      // Fallback to recursive search for largest array of objects
      let largestArray: any[] | null = null
      let maxLen = -1
      for (const key in obj) {
        const val = obj[key]
        if (Array.isArray(val)) {
          if (val.length > maxLen) {
            largestArray = val
            maxLen = val.length
          }
        } else if (val && typeof val === 'object') {
          const subArr = findProductsArray(val)
          if (subArr && subArr.length > maxLen) {
            largestArray = subArr
            maxLen = subArr.length
          }
        }
      }
      return largestArray
    }
    return null
  }

  // Handle fetching data from Majoo proxy
  async function handleFetchData() {
    if (!majooUrl) {
      alert('Masukkan URL API Majoo target!')
      return
    }
    if (!authHeader) {
      alert('Masukkan Authorization Token Majoo!')
      return
    }

    setIsLoading(true)
    setRawData(null)
    setProductsArray([])
    setAvailableKeys([])

    try {
      const headersPayload: Record<string, string> = {
        'Authorization': authHeader.trim()
      }
      if (cookieHeader.trim()) {
        headersPayload['Cookie'] = cookieHeader.trim()
      }

      let allProducts: any[] = []
      let page = 1
      let hasMore = true
      let lastResponseData = null

      while (hasMore) {
        let targetUrl = majooUrl.trim()
        let currentLimit = 100

        try {
          const urlObj = new URL(targetUrl)
          
          // Detect pagination parameters and override to 100 for maximum throughput
          let limitParamName = 'per_page'
          if (urlObj.searchParams.has('limit')) {
            limitParamName = 'limit'
          } else if (urlObj.searchParams.has('pageSize')) {
            limitParamName = 'pageSize'
          }
          urlObj.searchParams.set(limitParamName, '100')
          currentLimit = 100

          if (urlObj.searchParams.has('offset')) {
            const offsetVal = (page - 1) * currentLimit
            urlObj.searchParams.set('offset', String(offsetVal))
          } else {
            let pageParamName = 'page'
            if (urlObj.searchParams.has('pageIndex')) {
              pageParamName = 'pageIndex'
            }
            urlObj.searchParams.set(pageParamName, String(page))
          }

          targetUrl = urlObj.toString()
        } catch (e) {
          console.warn('Failed to parse URL for pagination, using raw URL', e)
          hasMore = false
        }

        const res = await fetch('/api/majoo-proxy', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            url: targetUrl,
            headers: headersPayload,
            method: 'GET'
          })
        })

        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.error || `Gagal mengambil data halaman ${page}`)
        }

        if (page === 1) {
          lastResponseData = data
        }

        const foundArray = findProductsArray(data)
        if (!foundArray || foundArray.length === 0) {
          hasMore = false
        } else {
          // Detect duplicate pages to prevent infinite loops if pagination params are ignored by API
          const firstNewItem = foundArray[0]
          const isDuplicate = allProducts.some(existingItem => {
            const existingId = existingItem.id || existingItem.invoice_number || existingItem.invoice_no || existingItem.code
            const newId = firstNewItem.id || firstNewItem.invoice_number || firstNewItem.invoice_no || firstNewItem.code
            if (existingId && newId) {
              return existingId === newId
            }
            return JSON.stringify(existingItem) === JSON.stringify(firstNewItem)
          })

          if (isDuplicate) {
            hasMore = false
          } else {
            allProducts = [...allProducts, ...foundArray]
            
            // If the API returned fewer items than requested, we reached the end
            if (foundArray.length < currentLimit) {
              hasMore = false
            } else {
              page++
              if (page > 50) { // Safety break
                hasMore = false
              }
            }
          }
        }
      }

      if (allProducts.length === 0) {
        console.log('API Response (empty array or no array found):', lastResponseData)
        const keysList = lastResponseData && typeof lastResponseData === 'object' 
          ? Object.keys(lastResponseData).join(', ') 
          : typeof lastResponseData
        
        alert(
          `Data berhasil ditarik, tetapi tidak ditemukan data (list array kosong atau tidak terdeteksi).\n\n` +
          `Kunci utama JSON: ${keysList}\n\n` +
          `Pastikan parameter tanggal (start_date & end_date) pada URL yang Anda masukkan memiliki transaksi, ` +
          `atau periksa Console Browser (F12) untuk melihat response detail.`
        )
        setIsLoading(false)
        return
      }

      setRawData(lastResponseData)
      setProductsArray(allProducts)

      // Get available keys from first item
      const firstItem = allProducts[0]
      const keys = Object.keys(firstItem)
      setAvailableKeys(keys)

      // Auto map columns
      if (syncMode === 'transactions') {
        const hasArrayKey = keys.some(k => Array.isArray(firstItem[k]))
        const productColumnKey = keys.find(k => ['produk', 'product', 'items', 'barang'].includes(k.toLowerCase()))
        const isFlatDetect = !hasArrayKey || keys.some(k => ['product_name', 'product_sku', 'product_qty'].includes(k.toLowerCase()))

        const txItemsKey = productColumnKey || (isFlatDetect ? '_flat' : (keys.find(k => Array.isArray(firstItem[k])) || ''))
        const rawTxItemsVal = txItemsKey && txItemsKey !== '_flat' ? firstItem[txItemsKey] : null
        const firstTxItem = rawTxItemsVal && Array.isArray(rawTxItemsVal) && rawTxItemsVal.length > 0 ? rawTxItemsVal[0] : null
        const itemKeys = txItemsKey === '_flat' ? keys : (firstTxItem && typeof firstTxItem === 'object' ? Object.keys(firstTxItem) : [])
        setAvailableItemKeys(itemKeys)

        const autoMappings = {
          ...mappings,
          txDate: findKey(keys, ['waktu order', 'waktu bayar', 'waktu_order', 'waktu order', 'tanggal \u0026 waktu', 'tanggal', 'date', 'waktu', 'time', 'created_at', 'created at', 'tgl', 'tanggal transaksi', 'waktu transaksi'], ['waktu', 'tanggal', 'date']),
          txPaymentMethod: findKey(keys, ['payment_method', 'payment', 'metode_pembayaran', 'payment_type', 'metode pembayaran', 'tipe pembayaran', 'cara bayar', 'metode bayar'], ['payment', 'bayar']),
          txTotal: findKey(keys, ['total', 'grand_total', 'total_price', 'amount', 'total_amount', 'total penjualan (rp)', 'total penjualan', 'total (rp)', 'nominal', 'total bayar'], ['total']),
          txSubtotal: findKey(keys, ['subtotal', 'amount', 'sub_total', 'subtotal (rp)', 'sub total'], ['subtotal', 'sub_total']),
          txDiscount: findKey(keys, ['discount', 'total_discount', 'discount_amount', 'diskon', 'potongan', 'diskon transaksi'], ['discount', 'diskon']),
          txItems: txItemsKey,
          
          itemSku: findKey(itemKeys, ['sku', 'product_sku', 'code', 'product_code', 'sku produk', 'kode produk', 'kode barang', 'kode variant', 'sku variant'], ['sku', 'code', 'kode']),
          itemName: findKey(itemKeys, ['name', 'product_name', 'nama', 'nama_produk', 'title', 'nama produk', 'nama barang', 'item', 'produk'], ['name', 'nama', 'item', 'produk']),
          itemQty: findKey(itemKeys, ['qty', 'quantity', 'jumlah', 'count', 'product_qty', 'jumlah produk', 'jumlah barang', 'qty produk', 'kuantitas'], ['qty', 'quantity', 'jumlah', 'count']),
          itemPrice: findKey(itemKeys, ['price', 'selling_price', 'harga', 'rate', 'product_price', 'harga produk', 'harga barang', 'harga satuan', 'harga jual'], ['price', 'harga']),
          itemDiscount: findKey(itemKeys, ['discount', 'discount_amount', 'disc', 'product_discount', 'diskon produk', 'diskon barang', 'potongan harga'], ['discount', 'disc', 'diskon'])
        }
        setMappings(autoMappings)
      } else {
        const autoMappings = {
          ...mappings,
          name: findKey(keys, ['name', 'product_name', 'nama', 'nama_produk', 'title', 'nama produk', 'nama barang'], ['nama produk', 'nama barang', 'nama']),
          sku: findKey(keys, ['sku satuan #1', 'sku satuan 1', 'sku\nsatuan #1', 'sku\nsatuan 1', 'sku', 'product_code', 'kode', 'kode_produk', 'sku_code', 'sku produk', 'kode produk', 'kode barang'], ['sku', 'code', 'kode']),
          barcode: findKey(keys, ['barcode', 'upc', 'ean', 'kode_barcode', 'kode barcode'], ['barcode']),
          sellingPrice: findKey(keys, ['harga jual satuan #1', 'harga jual satuan 1', 'harga jual\nsatuan #1', 'harga jual\nsatuan 1', 'harga jual', 'price', 'selling_price', 'harga', 'harga_jual', 'retail_price', 'harga jual (rp)'], ['harga jual', 'selling']),
          costPrice: findKey(keys, ['harga beli satuan #1', 'harga beli satuan 1', 'harga beli\nsatuan #1', 'harga beli\nsatuan 1', 'harga modal #1', 'harga modal 1', 'harga modal\n#1', 'harga modal\n1', 'harga beli', 'harga modal', 'cost', 'cost_price', 'harga_beli', 'modal', 'purchase_price', 'harga beli (rp)', 'harga modal'], ['harga beli', 'harga modal', 'cost', 'modal']),
          stock: findKey(keys, ['stok akhir', 'stok_akhir', 'akhir', 'stock', 'qty', 'quantity', 'stok', 'jumlah stok', 'stok awal'], ['stok', 'stock', 'qty', 'quantity', 'akhir']),
          category: findKey(keys, ['category', 'category_name', 'kategori', 'group', 'kelompok', 'kategori produk'], ['kategori', 'category'])
        }
        setMappings(autoMappings)
      }

    } catch (err: any) {
      console.error(err)
      alert(`Terjadi kesalahan: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Helper to parse Excel to JSON objects
  function parseExcelToObjects(rows: any[][]): any[] {
    if (rows.length === 0) return []

    const headerKeywords = [
      'no transaksi', 'no. transaksi', 'nomor transaksi', 'no_transaksi',
      'id struk', 'struk', 'invoice', 'no invoice', 'no. invoice',
      'nama produk', 'nama barang', 'nama_produk', 'product name',
      'sku', 'product_sku', 'kode produk', 'kode_produk', 'kode barang',
      'produk', 'waktu order', 'waktu bayar',
      'stok akhir', 'stok awal', 'awal', 'akhir', 'satuan'
    ]

    let headerRowIdx = -1
    for (let r = 0; r < Math.min(rows.length, 25); r++) {
      const row = rows[r]
      if (!row || !Array.isArray(row)) continue
      
      // A header row must have at least 3 filled cells to avoid matching metadata rows (like "Kategori: Semua")
      const filledCells = row.filter(cell => cell !== null && cell !== undefined && String(cell).trim() !== '').length
      if (filledCells < 3) continue

      const isHeader = row.some(cell => {
        if (cell === null || cell === undefined) return false
        const cellStr = String(cell).toLowerCase().trim()
        return headerKeywords.some(keyword => cellStr.includes(keyword))
      })

      if (isHeader) {
        headerRowIdx = r
        break
      }
    }

    if (headerRowIdx === -1) {
      headerRowIdx = 0
    }

    const rawHeaders = rows[headerRowIdx]
    const headers = rawHeaders.map((h, index) => {
      const cleanH = h !== null && h !== undefined ? String(h).trim() : ''
      return cleanH || `Column_${index + 1}`
    })

    const objects: any[] = []
    for (let r = headerRowIdx + 1; r < rows.length; r++) {
      const row = rows[r]
      if (!row || row.length === 0) continue

      const isEmpty = row.every(cell => cell === null || cell === undefined || String(cell).trim() === '')
      if (isEmpty) continue

      // Skip footer rows (e.g. "Powered by Majoo")
      const isFooter = row.some(cell => cell && String(cell).toLowerCase().includes('powered by'))
      if (isFooter) continue

      const obj: Record<string, any> = {}
      let hasData = false
      headers.forEach((header, colIdx) => {
        const val = row[colIdx]
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          obj[header] = val
          hasData = true
        } else {
          obj[header] = ''
        }
      })

      if (hasData) {
        objects.push(obj)
      }
    }

    return objects
  }

  // Handle uploading and parsing Majoo Excel/CSV files
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadedFile(file)
    setIsLoading(true)
    setRawData(null)
    setProductsArray([])
    setAvailableKeys([])

    const reader = new FileReader()
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result
        const wb = XLSX.read(bstr, { type: 'binary' })
        const wsname = wb.SheetNames[0]
        const ws = wb.Sheets[wsname]

        // Recalculate sheet range if cells exist (handles buggy excel exports with truncated !ref)
        const range = { s: { c: 10000000, r: 10000000 }, e: { c: -1, r: -1 } }
        for (const z in ws) {
          if (z[0] === '!') continue
          const c = XLSX.utils.decode_cell(z)
          if (c.r < range.s.r) range.s.r = c.r
          if (c.r > range.e.r) range.e.r = c.r
          if (c.c < range.s.c) range.s.c = c.c
          if (c.c > range.e.c) range.e.c = c.c
        }
        if (range.s.r <= range.e.r) {
          ws['!ref'] = XLSX.utils.encode_range(range)
        }

        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][]

        const parsedData = parseExcelToObjects(data)
        
        if (parsedData.length === 0) {
          alert('Gagal mendeteksi data atau header kolom pada file Excel/CSV ini.')
          setIsLoading(false)
          return
        }

        setRawData(parsedData[0]) // use first row as raw preview representation
        setProductsArray(parsedData)
      } catch (err: any) {
        console.error('Excel parsing error:', err)
        alert(`Gagal memproses file Excel/CSV: ${err.message}`)
      } finally {
        setIsLoading(false)
      }
    }

    reader.onerror = () => {
      alert('Terjadi kesalahan saat membaca file.')
      setIsLoading(false)
    }

    reader.readAsBinaryString(file)
  }

  // Parse a nested value or simple string/number from object
  function getValueByPath(obj: any, path: string) {
    if (!path) return undefined
    
    // Check if it's direct key or nested object (e.g. category.name)
    if (path.includes('.')) {
      return path.split('.').reduce((acc, part) => acc && acc[part], obj)
    }
    
    const val = obj[path]
    if (typeof val === 'object' && val !== null) {
      // If it's a category object, try to find a name property inside it
      if (val.name) return val.name
      if (val.nama) return val.nama
      return JSON.stringify(val)
    }
    return val
  }

  function mapPaymentMethod(methodStr: string): 'CASH' | 'QRIS' | 'DEBIT' {
    if (!methodStr) return 'CASH'
    const clean = methodStr.toLowerCase().trim()
    if (clean.includes('tunai') || clean.includes('cash')) return 'CASH'
    if (clean.includes('qris') || clean.includes('gopay') || clean.includes('ovo') || clean.includes('dana') || clean.includes('shopee') || clean.includes('linkaja')) return 'QRIS'
    if (clean.includes('debit') || clean.includes('bank') || clean.includes('transfer') || clean.includes('card')) return 'DEBIT'
    return 'CASH'
  }

  const parseExcelNumber = (val: any): number => {
    if (val === undefined || val === null) return 0
    if (typeof val === 'number') return val
    let str = String(val).trim().replace(/\s/g, '')
    if (!str) return 0
    
    // Hapus simbol mata uang seperti Rp
    str = str.replace(/rp/gi, '')
    
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
      if (parts.length > 2 || (parts.length === 2 && lastPart.length === 3)) {
        str = str.replace(/\./g, '')
      }
    }
    const num = Number(str)
    return isNaN(num) ? 0 : num
  }

  const parseExcelDate = (val: any): Date | null => {
    if (!val) return null
    if (val instanceof Date) return val
    
    // Check if it is a number or numeric string (Excel serial date representation)
    const numVal = Number(val)
    if (!isNaN(numVal) && numVal > 30000 && numVal < 60000) {
      const date = new Date(Math.round((numVal - 25569) * 86400 * 1000))
      // Adjust timezone offset to preserve the local naive representation in Date
      const userTimezoneOffset = date.getTimezoneOffset() * 60000
      return new Date(date.getTime() + userTimezoneOffset)
    }

    const str = String(val).trim()
    if (!str) return null

    // Try parsing standard date strings e.g. "26-06-2026 17:40:55" or "26/06/2026 17:40:55" or "2026-06-26 17:40:55"
    const parts = str.split(/\s+/)
    if (parts.length >= 1) {
      const dateStr = parts[0]
      const timeStr = parts.length >= 2 ? parts[1] : ''

      const dateParts = dateStr.split(/[-/.]/)
      if (dateParts.length === 3) {
        let day = 1, month = 0, year = 2026
        
        if (dateParts[0].length === 4) {
          // YYYY-MM-DD
          year = parseInt(dateParts[0], 10)
          month = parseInt(dateParts[1], 10) - 1
          day = parseInt(dateParts[2], 10)
        } else if (dateParts[2].length === 4) {
          // DD-MM-YYYY
          day = parseInt(dateParts[0], 10)
          month = parseInt(dateParts[1], 10) - 1
          year = parseInt(dateParts[2], 10)
        } else {
          day = parseInt(dateParts[0], 10)
          month = parseInt(dateParts[1], 10) - 1
          year = parseInt(dateParts[2], 10)
          if (year < 100) year += 2000
        }

        let hour = 0, minute = 0, second = 0
        if (timeStr) {
          const timeParts = timeStr.split(':')
          if (timeParts.length >= 2) {
            hour = parseInt(timeParts[0], 10)
            minute = parseInt(timeParts[1], 10)
            if (timeParts.length >= 3) {
              second = parseInt(timeParts[2], 10)
            }
          }
        }
        
        const newD = new Date(year, month, day, hour, minute, second)
        if (!isNaN(newD.getTime())) {
          return newD
        }
      }
    }

    // Default JS Date parsing fallback
    const d = new Date(str)
    return isNaN(d.getTime()) ? null : d
  }

  function extractItemDetails(mItem: any) {
    if (mItem && mItem._isStringItem) {
      return {
        name: mItem.name,
        sku: mItem.sku || '',
        qty: mItem.qty || 1,
        price: mItem.price || 0,
        discount: mItem.discount || 0
      }
    }

    let name = mappings.itemName ? String(getValueByPath(mItem, mappings.itemName) || '').trim() : ''
    let sku = mappings.itemSku ? String(getValueByPath(mItem, mappings.itemSku) || '').trim() : ''
    let qty = mappings.itemQty ? parseExcelNumber(getValueByPath(mItem, mappings.itemQty)) : 0
    let price = mappings.itemPrice ? parseExcelNumber(getValueByPath(mItem, mappings.itemPrice)) : 0
    let discount = mappings.itemDiscount ? parseExcelNumber(getValueByPath(mItem, mappings.itemDiscount)) : 0

    // Fallback if fields are empty/null/zero and product_variants array is available
    if (mItem && mItem.product_variants && Array.isArray(mItem.product_variants) && mItem.product_variants.length > 0) {
      const v = mItem.product_variants[0]
      if (!name || name === 'null' || name === 'undefined') {
        name = String(v.name || v.variant_name || v.product_name || '').trim()
      }
      if (!sku || sku === 'null' || sku === 'undefined') {
        sku = String(v.sku || v.variant_sku || v.product_sku || '').trim()
      }
      if (!qty || qty === 0) {
        qty = parseExcelNumber(v.qty || v.quantity || v.product_qty || 0)
      }
      if (!price || price === 0) {
        price = parseExcelNumber(v.price || v.variant_price || v.product_price || 0)
      }
      if (!discount || discount === 0) {
        discount = parseExcelNumber(v.discount || v.variant_discount || v.product_discount || 0)
      }
    }

    return {
      name,
      sku,
      qty: Math.max(1, Math.round(qty || 1)),
      price: Math.max(0, Math.round(price || 0)),
      discount: Math.max(0, Math.round(discount || 0))
    }
  }

  function getMajooItems(item: any): any[] {
    const rawItems = mappings.txItems ? getValueByPath(item, mappings.txItems) : null
    if (mappings.txItems === '_flat') {
      return item._items || []
    }
    if (Array.isArray(rawItems)) {
      return rawItems
    }
    if (typeof rawItems === 'string' && rawItems.trim() !== '') {
      const productNames = rawItems.split(',').map(name => name.trim()).filter(Boolean)
      return productNames.map(name => ({
        _isStringItem: true,
        name: name,
        sku: '',
        qty: 1,
        price: 0,
        discount: 0
      }))
    }
    return []
  }

  // Execute synchronization (importer)
  async function handleStartSync() {
    if (!selectedStoreId) {
      alert('Pilih toko/cabang tujuan terlebih dahulu!')
      return
    }

    if (syncMode === 'products' && !mappings.name) {
      alert('Mapping kolom "Nama Produk" wajib diisi!')
      return
    }

    if (syncMode === 'stock_update' && !mappings.sku && !mappings.name) {
      alert('Mapping kolom "SKU" atau "Nama Produk" wajib diisi untuk mengidentifikasi produk yang akan diupdate stoknya!')
      return
    }

    if (syncMode === 'stock_update' && !mappings.stock) {
      alert('Mapping kolom "Jumlah Stok" wajib diisi!')
      return
    }


    if (syncMode === 'transactions' && !mappings.txTotal) {
      alert('Mapping kolom "Total Transaksi" wajib diisi!')
      return
    }

    if (syncMode === 'transactions' && !mappings.txItems) {
      alert('Mapping kolom "Array Barang/Item" wajib diisi!')
      return
    }

    const isStringItems = syncMode === 'transactions' && 
                         mappings.txItems && 
                         mappings.txItems !== '_flat' && 
                         productsArray.length > 0 && 
                         typeof getValueByPath(productsArray[0], mappings.txItems) === 'string'

    if (syncMode === 'transactions' && !isStringItems && !mappings.itemSku && !mappings.itemName) {
      alert('Mapping kolom SKU atau Nama Produk untuk item transaksi wajib diisi!')
      return
    }

    const confirmMsg = syncMode === 'products' 
      ? `Apakah Anda yakin ingin menyinkronkan ${productsArray.length} produk baru ke toko tujuan?`
      : syncMode === 'stock_update'
      ? `Apakah Anda yakin ingin memperbarui stok ${productsArray.length} produk berdasarkan pencocokan SKU/Nama di toko tujuan?`
      : `Apakah Anda yakin ingin mengimpor ${productsArray.length} transaksi penjualan ke toko tujuan?`

    const confirmSync = confirm(confirmMsg)
    if (!confirmSync) return

    setSyncStatus({
      isOpen: true,
      total: productsArray.length,
      current: 0,
      currentName: '',
      successCount: 0,
      errors: [],
      isFinished: false
    })

    const token = localStorage.getItem('token')
    const headersApi = { Authorization: `Bearer ${token}` }
    let successCount = 0
    const errors: string[] = []

    if (syncMode === 'products') {
      // Fetch latest categories to avoid duplicates
      let currentCategories = await loadCategories(selectedStoreId)

      // Fetch latest products to avoid duplicates
      let localProducts: any[] = []
      try {
        const localProdsRes = await api.get(`/products/store/${selectedStoreId}`, { headers: headersApi })
        localProducts = localProdsRes.data || []
      } catch (errProd) {
        console.error('Failed to load local products for duplicate checking:', errProd)
      }

      for (let i = 0; i < productsArray.length; i++) {
        const item = productsArray[i]
        let productName = String(getValueByPath(item, mappings.name) || '').trim()
        
        let costPrice = 0
        let sellingPrice = 0
        let stock = 0
        let sku = ''
        let barcode = ''

        // Fallback to product_variants if empty
        if ((!productName || productName === 'null' || productName === 'undefined') && item.product_variants && Array.isArray(item.product_variants) && item.product_variants.length > 0) {
          const v = item.product_variants[0]
          productName = String(v.name || v.variant_name || v.product_name || '').trim()
          sku = String(v.sku || v.variant_sku || v.product_sku || '').trim()
          sellingPrice = parseExcelNumber(v.price || v.variant_price || v.product_price || 0)
          stock = parseExcelNumber(v.qty || v.quantity || v.product_qty || 0)
        } else {
          // Parse Prices and stock
          const rawCost = mappings.costPrice ? getValueByPath(item, mappings.costPrice) : 0
          const rawSelling = mappings.sellingPrice ? getValueByPath(item, mappings.sellingPrice) : 0
          const rawStock = mappings.stock ? getValueByPath(item, mappings.stock) : 0
          
          costPrice = Math.max(0, Math.round(parseExcelNumber(rawCost)))
          sellingPrice = Math.max(0, Math.round(parseExcelNumber(rawSelling)))
          stock = Math.max(0, Math.round(parseExcelNumber(rawStock)))
          sku = mappings.sku ? String(getValueByPath(item, mappings.sku) || '').trim() : ''
          barcode = mappings.barcode ? String(getValueByPath(item, mappings.barcode) || '').trim() : ''
        }

        // Apply variant options if they are explicitly present in the item row (Majoo Excel format)
        const itemKeys = Object.keys(item)
        const var1Key = findKey(itemKeys, ['pilihan varian 1', 'pilihan varian\n1', 'pilihan_varian_1'])
        const var2Key = findKey(itemKeys, ['pilihan varian 2', 'pilihan varian\n2', 'pilihan_varian_2'])
        const variant1Opt = var1Key ? String(getValueByPath(item, var1Key) || '').trim() : ''
        const variant2Opt = var2Key ? String(getValueByPath(item, var2Key) || '').trim() : ''
        const variantParts = [variant1Opt, variant2Opt].filter(v => v && v !== '-')
        if (variantParts.length > 0 && productName && productName !== 'null') {
          productName = `${productName} (${variantParts.join(', ')})`
        }

        if (!productName || productName === 'null' || productName === '-') {
          if (!sku) {
            // Skip quietly if both name and SKU are empty
            continue
          }
          errors.push(`Baris ${i + 1}: Nama produk tidak ditemukan`)
          continue
        }

        // Product Duplication Check
        const cleanSku = sku ? sku.trim().toLowerCase() : ''
        const cleanName = productName ? productName.trim().toLowerCase() : ''
        
        let existingProd = null
        if (cleanSku) {
          existingProd = localProducts.find((p: any) => p.sku && p.sku.trim().toLowerCase() === cleanSku)
        }
        if (!existingProd && cleanName) {
          existingProd = localProducts.find((p: any) => p.name && p.name.trim().toLowerCase() === cleanName)
        }

        if (existingProd) {
          // Product already exists, skip to avoid duplicates
          successCount++
          continue
        }

        setSyncStatus(prev => prev ? { ...prev, current: i + 1, currentName: productName } : null)

        let productPayload: any = null

        try {
          // Resolve Category
          let catId = ''
          const rawCategory = mappings.category ? String(getValueByPath(item, mappings.category) || '').trim() : 'Umum'
          
          const foundCategory = currentCategories.find((c: any) => c.name.toLowerCase() === rawCategory.toLowerCase())
          if (foundCategory) {
            catId = foundCategory.id
          } else {
            // Create new category
            const catPayload = {
              storeId: selectedStoreId,
              name: rawCategory,
              description: `Kategori otomatis dari sinkronisasi Majoo`
            }
            const newCatRes = await api.post('/categories', catPayload, { headers: headersApi })
            const newCat = newCatRes.data
            if (newCat && newCat.id) {
              catId = newCat.id
              currentCategories.push(newCat)
              setCategories([...currentCategories])
            } else {
              throw new Error(`Gagal membuat kategori "${rawCategory}"`)
            }
          }

          // Create product
          productPayload = {
            storeId: selectedStoreId,
            categoryId: catId,
            name: productName,
            costPrice,
            sellingPrice,
            stock: 0, // start from 0, then adjust via stock movement
            minimumStock: 0,
            isActive: true,
          }
          if (sku) productPayload.sku = sku
          if (barcode) productPayload.barcode = barcode

          const prodRes = await api.post('/products', productPayload, { headers: headersApi })
          const newProd = prodRes.data

          // Record stock movement if stock > 0
          if (newProd && newProd.id && stock > 0) {
            const movementPayload = {
              storeId: selectedStoreId,
              productId: newProd.id,
              type: 'IN',
              qty: stock,
              note: 'Stok awal sinkronisasi Majoo'
            }
            await api.post('/stock-movements', movementPayload, { headers: headersApi })
          }

          successCount++
        } catch (err: any) {
          console.error('Sync item error:', err)
          const errMsg = err.response?.data?.message || err.message || 'Gagal menyimpan produk'
          const formattedError = Array.isArray(errMsg) ? errMsg.join(', ') : errMsg

          // Fallback if SKU is already used (handles 409 status code as well)
          const isSkuError = err.response?.status === 409 || 
                            formattedError.toLowerCase().includes('sku') || 
                            formattedError.toLowerCase().includes('duplicate')

          if (sku && isSkuError) {
            try {
              const fallbackSku = `${sku}-COPY`
              const retryPayload = {
                ...productPayload,
                sku: fallbackSku
              }
              const prodRes = await api.post('/products', retryPayload, { headers: headersApi })
              const newProd = prodRes.data

              if (newProd && newProd.id && stock > 0) {
                const movementPayload = {
                  storeId: selectedStoreId,
                  productId: newProd.id,
                  type: 'IN',
                  qty: stock,
                  note: 'Stok awal sinkronisasi Majoo (Fallback SKU)'
                }
                await api.post('/stock-movements', movementPayload, { headers: headersApi })
              }
              successCount++
              continue // Proceed to next product item successfully
            } catch (retryErr: any) {
              console.error('Retry failed:', retryErr)
            }
          }

          errors.push(`Produk "${productName}": ${formattedError}`)
        }
      }
    } else if (syncMode === 'stock_update') {
      // Hanya Update Stok (Berdasarkan SKU)
      try {
        const localProdsRes = await api.get(`/products/store/${selectedStoreId}`, { headers: headersApi })
        const localProducts = localProdsRes.data || []

        for (let i = 0; i < productsArray.length; i++) {
          const item = productsArray[i]
          let sku = mappings.sku ? String(getValueByPath(item, mappings.sku) || '').trim() : ''
          let name = mappings.name ? String(getValueByPath(item, mappings.name) || '') : ''
          let rawStock = mappings.stock ? getValueByPath(item, mappings.stock) : 0

          // Fallback to product_variants if empty
          if ((!sku && !name || sku === 'null' || name === 'null' || sku === 'undefined' || name === 'undefined') && item.product_variants && Array.isArray(item.product_variants) && item.product_variants.length > 0) {
            const v = item.product_variants[0]
            sku = String(v.sku || v.variant_sku || v.product_sku || '').trim()
            name = String(v.name || v.variant_name || v.product_name || '').trim()
            rawStock = v.qty || v.quantity || v.product_qty || 0
          }

          const identifier = sku || name || `Baris ${i + 1}`
          setSyncStatus(prev => prev ? { ...prev, current: i + 1, currentName: identifier } : null)

          if (!sku && !name) {
            errors.push(`Baris ${i + 1}: SKU dan Nama kosong, tidak bisa mencocokkan produk`)
            continue
          }

          let localProduct = null
          const cleanSku = sku.trim().toLowerCase()
          const cleanName = name.trim().toLowerCase()

          if (sku) {
            localProduct = localProducts.find((p: any) => p.sku && p.sku.trim().toLowerCase() === cleanSku)
          }
          if (!localProduct && name) {
            localProduct = localProducts.find((p: any) => p.name && p.name.trim().toLowerCase() === cleanName)
          }

          if (!localProduct) {
            const matchCriteria = sku ? `SKU "${sku}"` : `Nama "${name}"`
            errors.push(`${matchCriteria} (${name || 'Nama tidak dikenal'}): Tidak ditemukan di database Kasir Web`)
            continue
          }

          try {
            const targetStock = Math.max(0, Math.round(parseExcelNumber(rawStock)))
            const currentStock = localProduct.stock || 0
            const diff = targetStock - currentStock

            if (diff !== 0) {
              const movementPayload = {
                storeId: selectedStoreId,
                productId: localProduct.id,
                type: diff > 0 ? 'IN' : 'OUT',
                qty: Math.abs(diff),
                note: 'Penyesuaian stok otomatis dari sinkronisasi Majoo'
              }
              await api.post('/stock-movements', movementPayload, { headers: headersApi })
            }
            successCount++
          } catch (err: any) {
            console.error('Update stock error:', err)
            const errMsg = err.response?.data?.message || err.message || 'Gagal memperbarui stok'
            const formattedError = Array.isArray(errMsg) ? errMsg.join(', ') : errMsg
            errors.push(`SKU "${sku}": ${formattedError}`)
          }
        }
      } catch (err: any) {
        console.error('Failed to load local products for stock sync', err)
        alert('Gagal mengambil daftar produk lokal untuk mencocokkan SKU.')
        setSyncStatus(null)
        return
      }
    } else if (syncMode === 'transactions') {
      try {
        const localProdsRes = await api.get(`/products/store/${selectedStoreId}`, { headers: headersApi })
        const localProducts = localProdsRes.data || []

        // Load existing transactions in the system to prevent duplication
        let localTransactions: any[] = []
        try {
          const localTxRes = await api.get(`/transactions/store/${selectedStoreId}`, { headers: headersApi })
          localTransactions = localTxRes.data || []
        } catch (errTx) {
          console.error('Failed to load existing transactions for duplicate detection:', errTx)
        }

        const matchedLocalTxIds = new Set<string>()

        if (localProducts.length === 0) {
          alert("Gagal: Cabang/toko tujuan terpilih tidak memiliki produk terdaftar di database Kasir Web. Silakan sinkronisasikan/impor produk terlebih dahulu dengan mode 'Impor Produk Baru & Stok' ke cabang ini!");
          setSyncStatus(null);
          return;
        }

        // Group flat row records by transaction identifier if txItems is '_flat'
        let targetTransactions = productsArray
        if (mappings.txItems === '_flat' && productsArray.length > 0) {
          const firstRow = productsArray[0]
          const keys = Object.keys(firstRow)
          const groupingKey = findKey(keys, [
            'no transaksi', 'no. transaksi', 'nomor transaksi', 'no_transaksi',
            'no invoice', 'no. invoice', 'nomor invoice', 'invoice no', 'invoice number',
            'invoice_no', 'invoice_number', 'transaction no', 'transaction number',
            'transaction_no', 'transaction_number', 'id struk', 'struk', 'invoice',
            'code', 'id', 'kode transaksi', 'no referensi', 'no. referensi', 'no ref', 'no. ref'
          ]) || keys.find(k => ['transaction_no', 'invoice_no', 'invoice_number', 'id', 'code', 'invoice'].includes(k.toLowerCase())) || 'transaction_no'

          const groupedMap: Record<string, any> = {}
          for (const row of productsArray) {
            const txId = String(getValueByPath(row, groupingKey) || '')
            if (!txId) continue

            if (!groupedMap[txId]) {
              groupedMap[txId] = {
                ...row,
                _items: []
              }
            }
            groupedMap[txId]._items.push(row)
          }
          targetTransactions = Object.values(groupedMap)
        }

        // Update total records in sync status to match the consolidated count
        const totalSyncCount = targetTransactions.length
        setSyncStatus(prev => prev ? { ...prev, total: totalSyncCount } : null)

        for (let i = 0; i < targetTransactions.length; i++) {
          const item = targetTransactions[i]
          const total = Math.max(0, Math.round(parseExcelNumber(getValueByPath(item, mappings.txTotal))))
          const subtotal = Math.max(0, Math.round(parseExcelNumber(getValueByPath(item, mappings.txSubtotal)) || total))
          const discount = Math.max(0, Math.round(parseExcelNumber(getValueByPath(item, mappings.txDiscount))))
          const rawMethod = String(getValueByPath(item, mappings.txPaymentMethod) || 'CASH')
          const paymentMethod = mapPaymentMethod(rawMethod)
          
          const majooItems = getMajooItems(item)

          const firstRow = productsArray[0]
          const keys = firstRow ? Object.keys(firstRow) : []
          const groupingKey = firstRow ? (findKey(keys, [
            'no transaksi', 'no. transaksi', 'nomor transaksi', 'no_transaksi',
            'no invoice', 'no. invoice', 'nomor invoice', 'invoice no', 'invoice number',
            'invoice_no', 'invoice_number', 'transaction no', 'transaction number',
            'transaction_no', 'transaction_number', 'id struk', 'struk', 'invoice',
            'code', 'id', 'kode transaksi', 'no referensi', 'no. referensi', 'no ref', 'no. ref'
          ]) || keys.find(k => ['transaction_no', 'invoice_no', 'invoice_number', 'id', 'code', 'invoice'].includes(k.toLowerCase())) || 'transaction_no') : 'transaction_no'

          const txId = String(getValueByPath(item, groupingKey) || item.id || `Baris ${i + 1}`)
          setSyncStatus(prev => prev ? { ...prev, current: i + 1, currentName: `Transaksi ${txId}` } : null)

          if (majooItems.length === 0) {
            errors.push(`Transaksi "${txId}": Array item produk kosong atau tidak ditemukan`)
            continue
          }

          const stripParentheses = (s: string) => s.replace(/\s*\(.*?\)\s*/g, '').trim().toLowerCase()

          const itemsPayload: any[] = []
          let txHasError = false
          for (const mItem of majooItems) {
            const details = extractItemDetails(mItem)
            
            console.log('Sync item match attempt:', {
              txId,
              mItem,
              details
            })
            
            const cleanSku = details.sku.toLowerCase()
            const cleanName = details.name.toLowerCase()
            const cleanNameNoVar = stripParentheses(details.name)

            let localProduct = null
            if (details.sku) {
              localProduct = localProducts.find((p: any) => p.sku && p.sku.trim().toLowerCase() === cleanSku)
            }
            if (!localProduct && details.name) {
              localProduct = localProducts.find((p: any) => p.name && p.name.trim().toLowerCase() === cleanName)
            }
            if (!localProduct && details.name) {
              localProduct = localProducts.find((p: any) => {
                if (!p.name) return false
                const pClean = p.name.trim().toLowerCase()
                
                // 1. Starts with check (local product starts with tx product name, e.g. "MIDI NAJWA BORDIR" starts with "MIDI NAJWA")
                if (pClean.startsWith(cleanName)) return true
                
                // 2. Starts with check reverse
                if (cleanName.startsWith(pClean)) return true
                
                // 3. Parentheses stripped check
                const pCleanNoVar = stripParentheses(p.name)
                if (pCleanNoVar === cleanNameNoVar) return true
                if (pCleanNoVar.startsWith(cleanNameNoVar) || cleanNameNoVar.startsWith(pCleanNoVar)) return true
                
                return false
              })
            }

            if (!localProduct) {
              // Try to find a fallback product containing "majoo" in the name
              localProduct = localProducts.find((p: any) => p.name && p.name.toLowerCase().includes('majoo'))
            }

            if (!localProduct) {
              // Auto-create "Transaksi Majoo" fallback product
              try {
                const cats = await loadCategories(selectedStoreId)
                let catId = ''
                const targetCatName = 'Umum'
                const matchedCat = cats.find((c: any) => c.name.toLowerCase() === targetCatName.toLowerCase())
                if (matchedCat) {
                  catId = matchedCat.id
                } else {
                  const catPayload = {
                    storeId: selectedStoreId,
                    name: targetCatName,
                    description: 'Kategori default untuk produk penampung'
                  }
                  const newCatRes = await api.post('/categories', catPayload, { headers: headersApi })
                  const newCat = newCatRes.data
                  if (newCat && newCat.id) {
                    catId = newCat.id
                  }
                }

                if (!catId && cats.length > 0) {
                  catId = cats[0].id
                }

                if (catId) {
                  const productPayload = {
                    storeId: selectedStoreId,
                    categoryId: catId,
                    name: 'Transaksi Majoo',
                    costPrice: 0,
                    sellingPrice: 0,
                    stock: 0,
                    minimumStock: 0,
                    isActive: true,
                    sku: 'MAJOO-FALLBACK'
                  }
                  const prodRes = await api.post('/products', productPayload, { headers: headersApi })
                  const newProd = prodRes.data
                  if (newProd && newProd.id) {
                    localProduct = newProd
                    localProducts.push(newProd)
                  }
                }
              } catch (createErr) {
                console.error('Failed to auto-create "Transaksi Majoo" product:', createErr)
              }
            }

            if (!localProduct) {
              const missingName = details.name || '(tanpa nama)'
              const missingSku = details.sku || '(tanpa SKU)'
              errors.push(`Transaksi "${txId}": Produk "${missingName}" [SKU: ${missingSku}] tidak ditemukan di database Kasir Web. Silakan buat satu produk penampung bernama "Transaksi Majoo" di menu Daftar Produk agar transaksi tanpa produk ini bisa diimpor.`)
              txHasError = true
              break
            }

            itemsPayload.push({
              productId: localProduct.id,
              quantity: details.qty,
              cashierDiscount: details.discount
            })
          }

          if (txHasError) {
            continue
          }

          if (itemsPayload.length === 0) {
            errors.push(`Transaksi "${txId}": Gagal mencocokkan produk item transaksi ke database Kasir Web`)
            continue
          }

          // Group duplicate products to prevent multiple items of the same product ID (which triggers backend duplicate validation error)
          const groupedItemsMap: Record<string, { quantity: number; totalDiscount: number }> = {}
          itemsPayload.forEach(itemPayload => {
            const pId = itemPayload.productId
            if (!groupedItemsMap[pId]) {
              groupedItemsMap[pId] = { quantity: 0, totalDiscount: 0 }
            }
            groupedItemsMap[pId].quantity += itemPayload.quantity
            groupedItemsMap[pId].totalDiscount += (itemPayload.cashierDiscount || 0) * itemPayload.quantity
          })

          const mergedItemsPayload = Object.entries(groupedItemsMap).map(([productId, data]) => {
            const unitDiscount = data.quantity > 0 ? Math.round(data.totalDiscount / data.quantity) : 0
            return {
              productId,
              quantity: data.quantity,
              cashierDiscount: unitDiscount
            }
          })

          // AUTO-ADJUST STOCK FOR GROUPED ITEMS
          for (const mergedItem of mergedItemsPayload) {
            const localProd = localProducts.find((p: any) => p.id === mergedItem.productId)
            if (localProd) {
              const currentStock = localProd.stock || 0
              if (currentStock < mergedItem.quantity) {
                try {
                  const diff = mergedItem.quantity - currentStock
                  const movementPayload = {
                    storeId: selectedStoreId,
                    productId: localProd.id,
                    type: 'IN',
                    qty: diff,
                    note: 'Penyesuaian stok otomatis untuk impor transaksi Majoo'
                  }
                  await api.post('/stock-movements', movementPayload, { headers: headersApi })
                  localProd.stock = mergedItem.quantity
                } catch (stockErr: any) {
                  console.error('Failed to auto-adjust stock before transaction:', stockErr)
                  const apiErrorMsg = stockErr.response?.data?.message || stockErr.message || '';
                  const formattedError = Array.isArray(apiErrorMsg) ? apiErrorMsg.join(', ') : apiErrorMsg;
                  errors.push(`Transaksi "${txId}": Gagal menyesuaikan stok untuk "${localProd.name}" (${formattedError})`)
                  txHasError = true
                  break
                }
              }
            }
          }

          if (txHasError) {
            continue
          }

          // Automatic Cashier Identification & Auto-creation
          let finalCashierId = ''
          const rawCashierVal = 
            getValueByPath(item, 'cashier_name') || 
            getValueByPath(item, 'created_by') || 
            getValueByPath(item, 'employee') || 
            getValueByPath(item, 'operator') || 
            getValueByPath(item, 'user_name') ||
            getValueByPath(item, 'Bayar') ||
            getValueByPath(item, 'bayar') ||
            getValueByPath(item, 'Order') ||
            getValueByPath(item, 'order') ||
            ''
          const majooCashierName = String(rawCashierVal).trim()

          if (majooCashierName) {
            const matched = cashiers.find(c => c.name.toLowerCase() === majooCashierName.toLowerCase())
            if (matched) {
              finalCashierId = matched.id
            } else {
              try {
                // Auto create cashier on the fly if not exists
                const randomDigits = Math.floor(10000000 + Math.random() * 90000000)
                const newCashierPayload = {
                  name: majooCashierName,
                  phone: `0812${randomDigits}`,
                  pin: '123456',
                  isStoreAdmin: false,
                  storeId: selectedStoreId
                }
                const newCashierRes = await api.post('/cashier', newCashierPayload, { headers: headersApi })
                const newCashier = newCashierRes.data
                if (newCashier && newCashier.id) {
                  finalCashierId = newCashier.id
                  cashiers.push(newCashier)
                  setCashiers([...cashiers])
                }
              } catch (createErr) {
                console.error(`Failed to auto-create cashier "${majooCashierName}":`, createErr)
              }
            }
          }

          // Fallback to first cashier or active logged-in user
          if (!finalCashierId) {
            if (cashiers.length > 0) {
              finalCashierId = cashiers[0].id
            } else {
              try {
                const userStr = localStorage.getItem('user')
                if (userStr) {
                  finalCashierId = JSON.parse(userStr).id || ''
                }
              } catch (e) {}
            }
          }

          // Parse Waktu Order for createdAt timestamp
          const rawWaktuOrder = (mappings.txDate ? getValueByPath(item, mappings.txDate) : null) || 
                                getValueByPath(item, 'Waktu Order') || 
                                getValueByPath(item, 'waktu_order') || 
                                getValueByPath(item, 'waktu order') || 
                                getValueByPath(item, 'Waktu Bayar') || 
                                getValueByPath(item, 'waktu_bayar') || 
                                getValueByPath(item, 'waktu bayar') ||
                                getValueByPath(item, 'Tanggal') ||
                                getValueByPath(item, 'tanggal')
          const txCreatedAt: Date | null = parseExcelDate(rawWaktuOrder)

          // Check if this transaction already exists in the backend
          const isAlreadyImported = localTransactions.some((t: any) => {
            // Strict ID match: check if Majoo ID matches invoiceNumber
            if (t.invoiceNumber === txId) {
              matchedLocalTxIds.add(t.id)
              return true
            }

            // Heuristic match for previously imported transactions (run today / last 24 hours):
            const txCreatedAtTime = txCreatedAt ? txCreatedAt.getTime() : 0
            if (txCreatedAtTime) {
              const localTxTime = new Date(t.createdAt).getTime()
              if (Math.abs(localTxTime - txCreatedAtTime) < 5000 && // Within 5 seconds difference
                  Math.round(t.total) === Math.round(total) &&
                  t.paymentMethod === paymentMethod) {
                matchedLocalTxIds.add(t.id)
                return true
              }
            }
            return false
          })

          if (isAlreadyImported) {
            successCount++
            continue
          }

          try {
            const payload: any = {
              storeId: selectedStoreId,
              cashierId: finalCashierId || undefined,
              invoiceNumber: txId,
              paymentMethod,
              paidAmount: total,
              subtotal,
              totalDiscount: discount,
              total,
              orderType: 'TAKEAWAY',
              items: mergedItemsPayload
            }

            if (txCreatedAt) {
              payload.createdAt = txCreatedAt
            }

            try {
              await api.post('/transactions', payload, { headers: headersApi })
            } catch (postErr: any) {
              const apiErrorMsg = postErr.response?.data?.message || postErr.message || '';
              const formattedError = Array.isArray(apiErrorMsg) ? apiErrorMsg.join(', ') : apiErrorMsg;
              
              // Fallback to retry without custom createdAt and invoiceNumber if it failed with 400 Bad Request
              if (postErr.response?.status === 400 && (payload.createdAt || payload.invoiceNumber)) {
                console.warn('API post failed with 400, retrying without createdAt/invoiceNumber:', formattedError)
                errors.push(`Transaksi "${txId}": Gagal dengan tanggal/invoice asli (${formattedError}). Mengimpor dengan tanggal hari ini...`)
                
                const fallbackPayload = { ...payload }
                delete fallbackPayload.createdAt
                delete fallbackPayload.invoiceNumber
                await api.post('/transactions', fallbackPayload, { headers: headersApi })
              } else {
                throw postErr
              }
            }

            // Successfully posted transaction, so decrement the stock in memory
            for (const itemPayload of mergedItemsPayload) {
              const localProd = localProducts.find((p: any) => p.id === itemPayload.productId)
              if (localProd) {
                localProd.stock = Math.max(0, (localProd.stock || 0) - itemPayload.quantity)
              }
            }

            successCount++
          } catch (txErr: any) {
            console.error('Import transaction error:', txErr)
            const errMsg = txErr.response?.data?.message || txErr.message || 'Gagal menyimpan transaksi'
            errors.push(`Transaksi "${txId}": ${errMsg}`)
          }
        }
      } catch (err: any) {
        console.error('Failed to load local products for transactions import', err)
        alert('Gagal mengambil daftar produk lokal untuk pencocokan transaksi.')
        setSyncStatus(null)
        return
      }
    }

    setSyncStatus(prev => prev ? {
      ...prev,
      current: prev.total,
      currentName: 'Selesai!',
      successCount,
      errors,
      isFinished: true
    } : null)
  }

  async function deleteTodayTransactions() {
    const confirmDelete = confirm('Apakah Anda yakin ingin menghapus/membatalkan semua transaksi impor baru hari ini? Ini berguna untuk membersihkan data impor yang salah tanggal agar dashboard kembali normal.')
    if (!confirmDelete) return

    setIsDeleting(true)
    try {
      const token = localStorage.getItem('token')
      const headers = { Authorization: `Bearer ${token}` }

      // 1. Fetch transactions for selected store
      const res = await api.get(`/transactions/store/${selectedStoreId}`, { headers })
      const txs = res.data || []

      // 2. We want to delete transactions created today (since midnight 00:00 AM)
      const importStartTime = new Date().setHours(0, 0, 0, 0)
      const toDelete = txs.filter((t: any) => {
        const tTime = new Date(t.createdAt).getTime()
        return tTime >= importStartTime
      })

      if (toDelete.length === 0) {
        alert('Tidak ditemukan transaksi impor baru hari ini untuk dibersihkan.')
        setIsDeleting(false)
        return
      }

      const confirmProcess = confirm(`Ditemukan ${toDelete.length} transaksi impor hari ini yang akan dihapus/dibatalkan. Mulai proses pembersihan?`)
      if (!confirmProcess) {
        setIsDeleting(false)
        return
      }

      let successCount = 0
      let failCount = 0
      let methodUsed = 'DELETE'
      const errorMsgs: string[] = []

      for (const tx of toDelete) {
        try {
          if (methodUsed === 'DELETE') {
            try {
              await api.delete(`/transactions/${tx.id}`, { headers })
              successCount++
              continue
            } catch (delErr: any) {
              const errMsg = delErr.response?.data?.message || delErr.message || ''
              console.warn(`DELETE failed for transaction ${tx.id}, falling back to VOID...`, errMsg)
              if (errorMsgs.length < 5 && !errorMsgs.includes(errMsg)) {
                errorMsgs.push(`DELETE: ${errMsg}`)
              }
            }
          }
          
          // Fallback/direct attempt to VOID the transaction
          try {
            await api.patch(`/transactions/${tx.id}/void`, { reason: 'Reset impor salah tanggal' }, { headers })
            successCount++
          } catch (voidErr: any) {
            const errMsg = voidErr.response?.data?.message || voidErr.message || ''
            console.error(`Failed to VOID transaction ${tx.id}:`, errMsg)
            if (errorMsgs.length < 5 && !errorMsgs.includes(errMsg)) {
              errorMsgs.push(`VOID: ${errMsg}`)
            }
            failCount++
          }
        } catch (err) {
          console.error(`Unexpected loop error for transaction ${tx.id}:`, err)
          failCount++
        }
      }

      let resultMsg = `Proses selesai!\n- Sukses dibersihkan: ${successCount}\n- Gagal: ${failCount}`
      if (errorMsgs.length > 0) {
        resultMsg += `\n\nDetail Eror Server:\n` + errorMsgs.map(m => `- ${m}`).join('\n')
      }
      alert(resultMsg)
      window.location.reload()
    } catch (err: any) {
      console.error('deleteTodayTransactions failed:', err)
      const serverMsg = err.response?.data?.message || err.message || '';
      const formattedServerMsg = Array.isArray(serverMsg) ? serverMsg.join(', ') : serverMsg;
      alert(`Gagal memuat atau memproses daftar transaksi: ${formattedServerMsg}`)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link 
            href="/dashboard/admin/settings"
            className="h-9 w-9 bg-white border border-slate-200 text-slate-600 rounded-xl flex items-center justify-center hover:bg-slate-50 active:scale-95 transition-all shadow-3xs cursor-pointer"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <span>Sinkronisasi Majoo (Metode 2)</span>
              <span className="bg-sky-50 border border-sky-200 text-sky-700 text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md tracking-wide">Beta</span>
            </h1>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">Tarik data produk dan stok secara instan dari dashboard.majoo.id menggunakan session token</p>
          </div>
        </div>
      </div>

      {/* Instructions Accordion */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-3xs">
        <button 
          onClick={() => setShowInstructions(!showInstructions)}
          className="w-full flex items-center justify-between p-4 bg-slate-50 border-b border-slate-100 hover:bg-slate-100/50 transition-colors"
        >
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <HelpCircle size={15} className="text-slate-500" />
            <span>Cara Mendapatkan URL & Token Majoo di Browser</span>
          </div>
          <ChevronDown size={16} className={`text-slate-500 transition-transform ${showInstructions ? 'rotate-180' : ''}`} />
        </button>
        
        {showInstructions && (
          <div className="p-5 text-xs text-slate-600 leading-relaxed space-y-3.5 bg-white">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="font-bold text-slate-800">Langkah 1: Temukan Request API</p>
                <ul className="list-decimal pl-4 space-y-1 text-slate-500">
                  <li>Login ke <a href="https://dashboard.majoo.id" target="_blank" className="text-sky-600 font-bold hover:underline">dashboard.majoo.id</a> di tab baru.</li>
                  <li>Buka menu <b>Produk dan Inventori</b> -&gt; <b>Daftar Produk</b>.</li>
                  <li>Buka <b>Developer Tools</b> browser (tekan <b>F12</b> atau klik kanan &gt; <b>Inspect</b>).</li>
                  <li>Buka tab <b>Network</b> dan klik filter <b>Fetch/XHR</b>.</li>
                  <li>Refresh halaman dashboard Majoo Anda.</li>
                  <li>Cari request dengan nama <code className="bg-slate-100 px-1 py-0.5 rounded text-rose-600">products</code> atau sejenisnya.</li>
                </ul>
              </div>
              <div className="space-y-2">
                <p className="font-bold text-slate-800">Langkah 2: Salin URL & Authorization</p>
                <ul className="list-decimal pl-4 space-y-1 text-slate-500">
                  <li>Klik request tersebut, lihat bagian <b>Headers</b>.</li>
                  <li>Salin **Request URL** dan tempel di form <i>URL Target API Majoo</i> di bawah.</li>
                  <li>Scroll ke bawah ke **Request Headers**, temukan baris **`Authorization`** (biasanya diawali dengan kata <code className="bg-slate-100 px-1 py-0.5 rounded text-rose-600">Bearer ...</code>).</li>
                  <li>Salin seluruh nilai token tersebut dan tempel ke form <i>Authorization Token</i>.</li>
                  <li><i>(Opsional)</i> Jika server Majoo memerlukan Cookie, salin header **`Cookie`** dan tempel ke form <i>Cookie Header</i>.</li>
                </ul>
              </div>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl flex items-start gap-2">
              <AlertCircle size={15} className="shrink-0 mt-0.5 text-amber-600" />
              <p className="text-[11px] font-semibold">
                <b>Catatan:</b> Token ini bersifat sementara (session-based) dan akan kadaluarsa jika Anda logout dari Majoo. Gunakan segera setelah disalin.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Main configuration Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Form Card */}
        <div className="lg:col-span-1 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-3xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Sliders size={16} className="text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-800">Konfigurasi Pengambilan</h2>
          </div>

          {/* Store Selector */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Toko/Cabang Tujuan</label>
            <select 
              value={selectedStoreId}
              onChange={(e) => setSelectedStoreId(e.target.value)}
              className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all cursor-pointer"
            >
              {stores.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <p className="text-[9px] text-slate-400 font-semibold">Data yang ditarik akan disimpan ke cabang terpilih ini</p>
          </div>

          {/* Sync Mode Selector */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Mode Sinkronisasi</label>
            <select 
              value={syncMode}
              onChange={(e) => {
                const newMode = e.target.value as any
                setSyncMode(newMode)
                if (newMode === 'transactions') {
                  if (majooUrl === 'https://api.majoo.id/v1/products') {
                    setMajooUrl('https://api.majoo.id/v1/transactions')
                  }
                } else {
                  if (majooUrl === 'https://api.majoo.id/v1/transactions') {
                    setMajooUrl('https://api.majoo.id/v1/products')
                  }
                }
              }}
              className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all cursor-pointer"
            >
              <option value="products">Impor Produk Baru & Stok</option>
              <option value="stock_update">Hanya Update Stok (Berdasarkan SKU)</option>
              <option value="transactions">Impor Transaksi Penjualan</option>
            </select>
            <p className="text-[9px] text-slate-400 font-semibold">Pilih apakah ingin menambah produk baru, mencocokkan stok saja, atau mengimpor transaksi penjualan</p>
          </div>

          {/* Data Source Selector */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Sumber Data</label>
            <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setDataSource('api')
                  setProductsArray([])
                  setRawData(null)
                  setUploadedFile(null)
                }}
                className={`py-1.5 text-[10px] sm:text-[11px] font-extrabold rounded-lg transition-all cursor-pointer ${
                  dataSource === 'api'
                    ? 'bg-white text-slate-900 shadow-3xs'
                    : 'text-slate-450 hover:text-slate-700'
                }`}
              >
                Tarik via API
              </button>
              <button
                type="button"
                onClick={() => {
                  setDataSource('file')
                  setProductsArray([])
                  setRawData(null)
                  setUploadedFile(null)
                }}
                className={`py-1.5 text-[10px] sm:text-[11px] font-extrabold rounded-lg transition-all cursor-pointer ${
                  dataSource === 'file'
                    ? 'bg-white text-slate-900 shadow-3xs'
                    : 'text-slate-450 hover:text-slate-700'
                }`}
              >
                Unggah File (Excel/CSV)
              </button>
            </div>
          </div>

          {dataSource === 'api' ? (
            <div className="space-y-4 pt-1">
              {/* Majoo Target URL */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">URL Target API Majoo</label>
                <input 
                  type="text"
                  value={majooUrl}
                  onChange={(e) => setMajooUrl(e.target.value)}
                  placeholder="https://api.majoo.id/v1/products..."
                  className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                />
              </div>

              {/* Authorization Token */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Authorization Token</label>
                <textarea 
                  rows={4}
                  value={authHeader}
                  onChange={(e) => setAuthHeader(e.target.value)}
                  placeholder="Bearer eyJhbGciOi..."
                  className="w-full text-xs font-mono text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                />
              </div>

              {/* Cookie (Optional) */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Cookie Header (Opsional)</label>
                <textarea 
                  rows={2}
                  value={cookieHeader}
                  onChange={(e) => setCookieHeader(e.target.value)}
                  placeholder="PHPSESSID=...; _ga=..."
                  className="w-full text-xs font-mono text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                />
              </div>

              <button
                onClick={handleFetchData}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-extrabold text-xs py-3 px-4 rounded-xl shadow-xs transition-all cursor-pointer active:scale-98"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Menarik data...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw size={14} />
                    <span>Tarik Data & Preview</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-4 pt-1">
              {/* File Upload Drop Zone */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Pilih File Ekspor Majoo</label>
                <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-2xl p-5 transition-all text-center relative group cursor-pointer bg-slate-50/50 hover:bg-slate-50">
                  <input 
                    type="file" 
                    accept=".xlsx, .xls, .csv"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="h-10 w-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Upload size={18} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] font-extrabold text-slate-700">
                        {uploadedFile ? uploadedFile.name : 'Pilih file Excel / CSV'}
                      </p>
                      <p className="text-[9px] font-medium text-slate-400">
                        {uploadedFile ? `${(uploadedFile.size / 1024).toFixed(1)} KB` : 'Seret & taruh file di sini atau klik untuk mencari'}
                      </p>
                    </div>
                  </div>
                </div>
                {uploadedFile && (
                  <div className="flex items-center justify-between bg-emerald-50 border border-emerald-150 rounded-xl p-2.5 text-[10px] text-emerald-800 font-bold animate-in fade-in duration-200 font-sans">
                    <div className="flex items-center gap-1.5 max-w-[80%]">
                      <FileSpreadsheet size={14} className="text-emerald-600 shrink-0" />
                      <span className="truncate">{uploadedFile.name}</span>
                    </div>
                    <button 
                      type="button"
                      onClick={() => {
                        setUploadedFile(null)
                        setProductsArray([])
                        setRawData(null)
                      }}
                      className="text-emerald-700 hover:text-emerald-950 hover:bg-emerald-100/50 p-1 rounded-md transition-colors cursor-pointer"
                    >
                      Hapus
                    </button>
                  </div>
                )}
                <p className="text-[9.5px] text-slate-450 font-semibold leading-relaxed">
                  Ekspor laporan <b>Detail Penjualan</b> (mode CSV/Excel) dari dashboard Majoo Anda, kemudian unggah file tersebut di sini.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Preview and Mapping Card */}
        <div className="lg:col-span-2 space-y-6">
          {productsArray.length === 0 ? (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-10 shadow-3xs flex flex-col items-center justify-center text-center space-y-3 min-h-[300px]">
              <div className="h-12 w-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center">
                <Database size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-800">Belum Ada Data</h3>
                <p className="text-xs text-slate-400 max-w-sm font-medium leading-relaxed">
                  Isi formulir konfigurasi di sebelah kiri dan klik <b>Tarik Data</b> untuk memuat daftar produk dari dashboard Majoo Anda.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-3xs space-y-6">
              
              {/* Alert Data Found */}
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center justify-between text-xs font-bold">
                <div className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-emerald-600" />
                  <span>
                    {syncMode === 'transactions' 
                      ? `Berhasil memuat ${productsArray.length} transaksi/baris dari Majoo!` 
                      : `Berhasil memuat ${productsArray.length} produk dari Majoo!`}
                  </span>
                </div>
              </div>

              {/* Diagnostics Summary */}
              {(() => {
                const total = productsArray.length
                const withName = productsArray.filter(item => item.product_name !== null && item.product_name !== undefined && item.product_name !== '').length
                const withSku = productsArray.filter(item => item.product_sku !== null && item.product_sku !== undefined && item.product_sku !== '').length
                
                // Find all keys that are arrays in any item
                const arrayKeysMap: Record<string, number> = {}
                productsArray.forEach(item => {
                  Object.entries(item).forEach(([k, v]) => {
                    if (Array.isArray(v) && v.length > 0) {
                      arrayKeysMap[k] = (arrayKeysMap[k] || 0) + 1
                    }
                  })
                })
                
                return (
                  <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl space-y-2 text-xs">
                    <p className="font-bold uppercase tracking-wider text-amber-700">
                      Diagnostik Struktur Data (Analisis {total} baris):
                    </p>
                    <ul className="list-disc pl-4 space-y-1">
                      <li>Total baris: <b>{total}</b></li>
                      <li>Baris dengan `product_name` terisi: <b>{withName}</b></li>
                      <li>Baris dengan `product_sku` terisi: <b>{withSku}</b></li>
                      <li>Kunci Array yang memiliki isi (length &gt; 0) beserta jumlah barisnya:
                        {Object.keys(arrayKeysMap).length === 0 ? (
                          <span className="text-rose-600 font-bold ml-1">Tidak ditemukan array dengan isi!</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {Object.entries(arrayKeysMap).map(([k, count]) => (
                              <span key={k} className="inline-block bg-white border border-amber-300 px-2 py-0.5 rounded-md font-mono text-[10px]">
                                {k}: <b>{count} baris</b>
                              </span>
                            ))}
                          </div>
                        )}
                      </li>
                    </ul>
                  </div>
                )
              })()}

              {/* Debug Raw JSON */}
              {(() => {
                const targetRecord = productsArray.find(item => 
                  item.product_name || 
                  item.product_sku || 
                  (item.product_variants && Array.isArray(item.product_variants) && item.product_variants.length > 0)
                ) || productsArray[0]
                const nonNullKeys = targetRecord ? Object.entries(targetRecord).filter(([k, v]) => v !== null && v !== undefined && v !== '') : []
                return (
                  <div className="space-y-3 bg-slate-50 border border-slate-200 p-4 rounded-xl">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                      Data Mentah Majoo (Menampilkan baris pertama yang berisi produk):
                    </label>
                    
                    <div className="p-3 bg-indigo-50 border border-indigo-150 text-indigo-900 rounded-xl space-y-2">
                      <p className="text-[11px] font-black uppercase tracking-wider text-indigo-700">
                        Kunci (Key) yang memiliki nilai data (tidak kosong/null):
                      </p>
                      <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                        {nonNullKeys.map(([k, v]) => (
                          <span key={k} className="inline-block bg-white border border-indigo-100 text-[10px] px-2 py-0.5 rounded-md font-bold text-slate-700 shadow-3xs" title={typeof v === 'object' ? JSON.stringify(v) : String(v)}>
                            {k}: <span className="text-indigo-600">{typeof v === 'object' ? 'Object (Array/JSON)' : String(v)}</span>
                          </span>
                        ))}
                      </div>
                      
                      {targetRecord && targetRecord.product_variants && Array.isArray(targetRecord.product_variants) && targetRecord.product_variants.length > 0 && (
                        <div className="mt-2.5 p-2.5 bg-white border border-indigo-100 rounded-lg">
                          <p className="text-[10px] font-black uppercase tracking-wider text-indigo-600 mb-1">
                            Isi detail varian produk pertama (product_variants[0]):
                          </p>
                          <pre className="text-[10px] font-mono text-slate-600 whitespace-pre-wrap select-all">
                            {JSON.stringify(targetRecord.product_variants[0], null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>

                    <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-64 overflow-y-auto bg-white">
                      <table className="w-full text-left border-collapse text-[11px] font-mono">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-200 text-slate-500 font-bold">
                            <th className="p-2 border-r border-slate-200">Nama Kunci (Key)</th>
                            <th className="p-2">Nilai (Value)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-150 text-slate-700">
                          {targetRecord && Object.entries(targetRecord).map(([k, v]) => (
                            <tr key={k} className="hover:bg-slate-50">
                              <td className="p-2 font-bold border-r border-slate-200 bg-slate-50/50">{k}</td>
                              <td className="p-2 break-all">{typeof v === 'object' ? JSON.stringify(v) : String(v ?? '')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              })()}

              {/* Mappings */}
              <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders size={13} className="text-indigo-600" />
                  <span>Mapping Kolom Data Majoo</span>
                </h3>
                <p className="text-[11px] font-semibold text-slate-400">
                  Tentukan kunci JSON mana dari API Majoo yang sesuai dengan kolom data di aplikasi Kasir Web ini.
                </p>

                {syncMode === 'transactions' ? (
                  <div className="space-y-5">
                    <div>
                      <h4 className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider mb-2">Data Utama Transaksi</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {/* Waktu/Tanggal Transaksi Mapping */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500">Tanggal & Waktu Transaksi</label>
                          <select
                            value={mappings.txDate}
                            onChange={(e) => setMappings({ ...mappings, txDate: e.target.value })}
                            className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 focus:bg-white"
                          >
                            <option value="">-- Auto-deteksi --</option>
                            {availableKeys.map(k => <option key={k} value={k}>{k}</option>)}
                          </select>
                        </div>

                        {/* Payment Method Mapping */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500">Metode Pembayaran</label>
                          <select
                            value={mappings.txPaymentMethod}
                            onChange={(e) => setMappings({ ...mappings, txPaymentMethod: e.target.value })}
                            className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 focus:bg-white"
                          >
                            <option value="">-- Pilih --</option>
                            {availableKeys.map(k => <option key={k} value={k}>{k}</option>)}
                          </select>
                        </div>

                        {/* Total Mapping */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500">Total Transaksi *</label>
                          <select
                            value={mappings.txTotal}
                            onChange={(e) => setMappings({ ...mappings, txTotal: e.target.value })}
                            className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 focus:bg-white"
                          >
                            <option value="">-- Pilih --</option>
                            {availableKeys.map(k => <option key={k} value={k}>{k}</option>)}
                          </select>
                        </div>

                        {/* Subtotal Mapping */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500">Subtotal Transaksi</label>
                          <select
                            value={mappings.txSubtotal}
                            onChange={(e) => setMappings({ ...mappings, txSubtotal: e.target.value })}
                            className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 focus:bg-white"
                          >
                            <option value="">-- Lewati (Gunakan Total) --</option>
                            {availableKeys.map(k => <option key={k} value={k}>{k}</option>)}
                          </select>
                        </div>

                        {/* Discount Mapping */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500">Total Diskon Transaksi</label>
                          <select
                            value={mappings.txDiscount}
                            onChange={(e) => setMappings({ ...mappings, txDiscount: e.target.value })}
                            className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 focus:bg-white"
                          >
                            <option value="">-- Lewati (0) --</option>
                            {availableKeys.map(k => <option key={k} value={k}>{k}</option>)}
                          </select>
                        </div>

                        {/* Items Array Mapping */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500">Array Barang/Items *</label>
                          <select
                            value={mappings.txItems}
                            onChange={(e) => {
                              const selectedVal = e.target.value
                              setMappings(prev => {
                                const newMappings = { ...prev, txItems: selectedVal }
                                if (selectedVal && selectedVal !== '_flat' && productsArray.length > 0) {
                                  const firstItem = productsArray[0]
                                  const arrayVal = firstItem[selectedVal]
                                  const firstItemInArray = Array.isArray(arrayVal) && arrayVal.length > 0 ? arrayVal[0] : null
                                  const itemKeys = firstItemInArray && typeof firstItemInArray === 'object' ? Object.keys(firstItemInArray) : []
                                  setAvailableItemKeys(itemKeys)
                                } else if (selectedVal === '_flat' && productsArray.length > 0) {
                                  setAvailableItemKeys(availableKeys)
                                } else {
                                  setAvailableItemKeys([])
                                }
                                return newMappings
                              })
                            }}
                            className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 focus:bg-white"
                          >
                            <option value="">-- Pilih --</option>
                            <option value="_flat">-- Flat (Satu baris per item, gabungkan berdasarkan ID) --</option>
                            {availableKeys.map(k => <option key={k} value={k}>{k}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100">
                      <h4 className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider mb-2">Detail Item Barang (Dalam Array)</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {/* Item SKU Mapping */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500">SKU Barang *</label>
                          <select
                            value={mappings.itemSku}
                            onChange={(e) => setMappings({ ...mappings, itemSku: e.target.value })}
                            className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 focus:bg-white"
                          >
                            <option value="">-- Pilih/Kosong --</option>
                            {availableItemKeys.map(k => <option key={k} value={k}>{k}</option>)}
                          </select>
                        </div>

                        {/* Item Name Mapping */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500">Nama Barang *</label>
                          <select
                            value={mappings.itemName}
                            onChange={(e) => setMappings({ ...mappings, itemName: e.target.value })}
                            className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 focus:bg-white"
                          >
                            <option value="">-- Pilih/Kosong --</option>
                            {availableItemKeys.map(k => <option key={k} value={k}>{k}</option>)}
                          </select>
                        </div>

                        {/* Item Qty Mapping */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500">Jumlah / Qty *</label>
                          <select
                            value={mappings.itemQty}
                            onChange={(e) => setMappings({ ...mappings, itemQty: e.target.value })}
                            className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 focus:bg-white"
                          >
                            <option value="">-- Pilih/Default (1) --</option>
                            {availableItemKeys.map(k => <option key={k} value={k}>{k}</option>)}
                          </select>
                        </div>

                        {/* Item Price Mapping */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500">Harga Satuan</label>
                          <select
                            value={mappings.itemPrice}
                            onChange={(e) => setMappings({ ...mappings, itemPrice: e.target.value })}
                            className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 focus:bg-white"
                          >
                            <option value="">-- Pilih/Default (0) --</option>
                            {availableItemKeys.map(k => <option key={k} value={k}>{k}</option>)}
                          </select>
                        </div>

                        {/* Item Discount Mapping */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500">Diskon per Item</label>
                          <select
                            value={mappings.itemDiscount}
                            onChange={(e) => setMappings({ ...mappings, itemDiscount: e.target.value })}
                            className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 focus:bg-white"
                          >
                            <option value="">-- Lewati (0) --</option>
                            {availableItemKeys.map(k => <option key={k} value={k}>{k}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {/* Name Mapping */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500">Nama Produk *</label>
                      <select
                        value={mappings.name}
                        onChange={(e) => setMappings({ ...mappings, name: e.target.value })}
                        className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 focus:bg-white"
                      >
                        <option value="">-- Pilih --</option>
                        {availableKeys.map(k => <option key={k} value={k}>{k}</option>)}
                      </select>
                    </div>

                    {/* SKU Mapping */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500">SKU</label>
                      <select
                        value={mappings.sku}
                        onChange={(e) => setMappings({ ...mappings, sku: e.target.value })}
                        className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 focus:bg-white"
                      >
                        <option value="">-- Lewati / Kosong --</option>
                        {availableKeys.map(k => <option key={k} value={k}>{k}</option>)}
                      </select>
                    </div>

                    {/* Barcode Mapping */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500">Barcode</label>
                      <select
                        value={mappings.barcode}
                        onChange={(e) => setMappings({ ...mappings, barcode: e.target.value })}
                        className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 focus:bg-white"
                      >
                        <option value="">-- Lewati / Kosong --</option>
                        {availableKeys.map(k => <option key={k} value={k}>{k}</option>)}
                      </select>
                    </div>

                    {/* Selling Price Mapping */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500">Harga Jual</label>
                      <select
                        value={mappings.sellingPrice}
                        onChange={(e) => setMappings({ ...mappings, sellingPrice: e.target.value })}
                        className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 focus:bg-white"
                      >
                        <option value="">-- Lewati (0) --</option>
                        {availableKeys.map(k => <option key={k} value={k}>{k}</option>)}
                      </select>
                    </div>

                    {/* Cost Price Mapping */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500">Harga Beli / Modal</label>
                      <select
                        value={mappings.costPrice}
                        onChange={(e) => setMappings({ ...mappings, costPrice: e.target.value })}
                        className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 focus:bg-white"
                      >
                        <option value="">-- Lewati (0) --</option>
                        {availableKeys.map(k => <option key={k} value={k}>{k}</option>)}
                      </select>
                    </div>

                    {/* Stock Mapping */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500">Jumlah Stok</label>
                      <select
                        value={mappings.stock}
                        onChange={(e) => setMappings({ ...mappings, stock: e.target.value })}
                        className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 focus:bg-white"
                      >
                        <option value="">-- Lewati (0) --</option>
                        {availableKeys.map(k => <option key={k} value={k}>{k}</option>)}
                      </select>
                    </div>

                    {/* Category Mapping */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500">Kategori</label>
                      <select
                        value={mappings.category}
                        onChange={(e) => setMappings({ ...mappings, category: e.target.value })}
                        className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 focus:bg-white"
                      >
                        <option value="">-- Default ("Umum") --</option>
                        {availableKeys.map(k => <option key={k} value={k}>{k}</option>)}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Data Preview Table */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-800">Preview Data yang Dipetakan (5 baris pertama):</h3>
                <div className="overflow-x-auto border border-slate-100 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold">
                        {syncMode === 'transactions' ? (
                          <>
                            <th className="p-3">ID Transaksi</th>
                            <th className="p-3">Metode Bayar</th>
                            <th className="p-3 text-right">Total (Rp)</th>
                            <th className="p-3 text-right">Diskon (Rp)</th>
                            <th className="p-3">Daftar Barang</th>
                          </>
                        ) : (
                          <>
                            <th className="p-3">Nama Produk</th>
                            <th className="p-3">SKU / Barcode</th>
                            <th className="p-3 text-right">Harga Jual (Rp)</th>
                            <th className="p-3 text-right">Harga Beli (Rp)</th>
                            <th className="p-3 text-center">Stok</th>
                            <th className="p-3">Kategori</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-600 font-semibold">
                      {(() => {
                        let previewList = productsArray
                        if (syncMode === 'transactions' && mappings.txItems === '_flat' && productsArray.length > 0) {
                          const firstRow = productsArray[0]
                          const possibleIdKeys = ['transaction_no', 'invoice_no', 'invoice_number', 'id', 'code', 'invoice']
                          const groupingKey = Object.keys(firstRow).find(k => possibleIdKeys.includes(k.toLowerCase())) || 'transaction_no'

                          const grouped: Record<string, any> = {}
                          for (const row of productsArray) {
                            const txId = String(getValueByPath(row, groupingKey) || '')
                            if (!txId) continue
                            if (!grouped[txId]) {
                              grouped[txId] = { ...row, _items: [] }
                            }
                            grouped[txId]._items.push(row)
                          }
                          previewList = Object.values(grouped)
                        } else if (syncMode === 'products' || syncMode === 'stock_update') {
                          previewList = productsArray.filter(item => 
                            item.product_name || 
                            item.product_sku || 
                            (item.product_variants && Array.isArray(item.product_variants) && item.product_variants.length > 0)
                          )
                        }

                        return previewList.slice(0, 5).map((item, idx) => {
                          if (syncMode === 'transactions') {
                            const firstRow = productsArray[0]
                            const possibleIdKeys = firstRow ? ['transaction_no', 'invoice_no', 'invoice_number', 'id', 'code', 'invoice'] : []
                            const groupingKey = firstRow ? (Object.keys(firstRow).find(k => possibleIdKeys.includes(k.toLowerCase())) || 'transaction_no') : 'transaction_no'
                            
                            const txId = String(getValueByPath(item, groupingKey) || item.id || `Baris ${idx + 1}`)
                            const method = String(getValueByPath(item, mappings.txPaymentMethod) || 'CASH')
                            const total = Math.max(0, parseExcelNumber(getValueByPath(item, mappings.txTotal)))
                            const discount = Math.max(0, parseExcelNumber(getValueByPath(item, mappings.txDiscount)))
                            
                            const majooItems = getMajooItems(item)
                            const itemsSummary = majooItems.map((mItem: any) => {
                               const details = extractItemDetails(mItem)
                               const nameToShow = details.name || 'Penjualan Manual Majoo'
                               return `${nameToShow} (${details.qty}x)`
                             }).join(', ')

                            return (
                              <tr key={idx} className="hover:bg-slate-50/50">
                                <td className="p-3 font-bold text-slate-800">{txId}</td>
                                <td className="p-3">
                                  <span className="inline-block bg-indigo-50 border border-indigo-150 text-indigo-700 px-2 py-0.5 rounded-full font-bold">
                                    {method}
                                  </span>
                                </td>
                                <td className="p-3 text-right text-emerald-600 font-bold">{total.toLocaleString('id-ID')}</td>
                                <td className="p-3 text-right text-slate-400">{discount.toLocaleString('id-ID')}</td>
                                <td className="p-3 text-slate-600 max-w-[250px] truncate" title={itemsSummary}>{itemsSummary || '-'}</td>
                              </tr>
                            )
                          }

                        let name = String(getValueByPath(item, mappings.name) || '-')
                        let sku = String(getValueByPath(item, mappings.sku) || '')
                        let barcode = String(getValueByPath(item, mappings.barcode) || '')
                        let costPrice = Math.max(0, parseExcelNumber(getValueByPath(item, mappings.costPrice)))
                        let sellingPrice = Math.max(0, parseExcelNumber(getValueByPath(item, mappings.sellingPrice)))
                        let stock = Math.max(0, parseExcelNumber(getValueByPath(item, mappings.stock)))
                        let category = String(getValueByPath(item, mappings.category) || 'Umum')

                        // Fallback to product_variants if empty
                        if ((name === '-' || name === 'null' || name === 'undefined') && item.product_variants && Array.isArray(item.product_variants) && item.product_variants.length > 0) {
                          const v = item.product_variants[0]
                          name = String(v.name || v.variant_name || v.product_name || '-')
                          sku = String(v.sku || v.variant_sku || v.product_sku || '')
                          sellingPrice = Math.max(0, parseExcelNumber(v.price || v.variant_price || v.product_price) || 0)
                          stock = Math.max(0, parseExcelNumber(v.qty || v.quantity || v.product_qty) || 0)
                        }

                        // Apply variant options if they are explicitly present in the item row (Majoo Excel format)
                        const itemKeys = Object.keys(item)
                        const var1Key = findKey(itemKeys, ['pilihan varian 1', 'pilihan varian\n1', 'pilihan_varian_1'])
                        const var2Key = findKey(itemKeys, ['pilihan varian 2', 'pilihan varian\n2', 'pilihan_varian_2'])
                        const variant1Opt = var1Key ? String(getValueByPath(item, var1Key) || '').trim() : ''
                        const variant2Opt = var2Key ? String(getValueByPath(item, var2Key) || '').trim() : ''
                        const variantParts = [variant1Opt, variant2Opt].filter(v => v && v !== '-')
                        if (variantParts.length > 0 && name && name !== 'null' && name !== '-') {
                          name = `${name} (${variantParts.join(', ')})`
                        }

                        return (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="p-3 font-bold text-slate-800 max-w-[200px] truncate" title={name}>{name}</td>
                            <td className="p-3 font-mono text-[10px] text-slate-400">
                              {sku && <div>SKU: {sku}</div>}
                              {barcode && <div>BC: {barcode}</div>}
                              {!sku && !barcode && '-'}
                            </td>
                            <td className="p-3 text-right text-indigo-600 font-bold">{sellingPrice.toLocaleString('id-ID')}</td>
                            <td className="p-3 text-right text-slate-400">{costPrice.toLocaleString('id-ID')}</td>
                            <td className="p-3 text-center font-bold text-emerald-600">{stock}</td>
                            <td className="p-3 text-xs">
                              <span className="inline-block bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                                {category}
                              </span>
                            </td>
                          </tr>
                        )
                      })})()}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action Button */}
              <div className="border-t border-slate-100 pt-5 flex justify-between items-center">
                {syncMode === 'transactions' ? (
                  <button
                    type="button"
                    onClick={deleteTodayTransactions}
                    disabled={isDeleting}
                    className="bg-rose-600 hover:bg-rose-700 disabled:bg-slate-200 text-white font-extrabold text-xs py-3 px-5 rounded-xl shadow-xs transition-all active:scale-97 cursor-pointer animate-pulse"
                  >
                    {isDeleting ? 'Membatalkan...' : 'Hapus Impor Salah Tanggal (Hari Ini)'}
                  </button>
                ) : (
                  <div></div>
                )}
                <button
                  type="button"
                  onClick={handleStartSync}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-3 px-6 rounded-xl shadow-xs transition-all active:scale-97 cursor-pointer"
                >
                  <Play size={14} fill="white" />
                  <span>
                    {syncMode === 'products' 
                      ? `Mulai Impor ${productsArray.length} Produk ke Database` 
                      : syncMode === 'stock_update'
                      ? `Mulai Sinkronisasi ${productsArray.length} Stok ke Database`
                      : `Mulai Impor ${productsArray.length} Transaksi ke Database`}
                  </span>
                </button>
              </div>

            </div>
          )}
        </div>
      </div>

      {/* Sync Status Modal/Overlay */}
      {syncStatus && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl max-w-lg w-full space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Database className="text-indigo-600" size={18} />
                <h3 className="font-black text-slate-900 text-sm">Proses Sinkronisasi Data</h3>
              </div>
              {syncStatus.isFinished && (
                <button 
                  onClick={() => setSyncStatus(null)}
                  className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                <span>
                  {syncMode === 'products' 
                    ? `Mengimpor produk: ${syncStatus.current} dari ${syncStatus.total}` 
                    : syncMode === 'stock_update'
                    ? `Memproses stok produk: ${syncStatus.current} dari ${syncStatus.total}`
                    : `Mengimpor transaksi: ${syncStatus.current} dari ${syncStatus.total}`}
                </span>
                <span>{Math.round((syncStatus.current / syncStatus.total) * 100)}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${(syncStatus.current / syncStatus.total) * 100}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400 font-semibold italic truncate">
                {syncStatus.currentName || 'Memulai...'}
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Sukses</div>
                <div className="text-base font-black text-slate-800">{syncStatus.successCount}</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Gagal</div>
                <div className="text-base font-black text-rose-600">{syncStatus.errors.length}</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Total</div>
                <div className="text-base font-black text-slate-800">{syncStatus.total}</div>
              </div>
            </div>

            {/* Errors List */}
            {syncStatus.errors.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[10px] font-black text-rose-500 uppercase tracking-wider flex items-center gap-1">
                  <AlertTriangle size={12} />
                  <span>Log Error ({syncStatus.errors.length})</span>
                </div>
                <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-3 max-h-36 overflow-y-auto font-mono text-[9.5px] text-rose-700 leading-relaxed space-y-1 scrollbar-thin">
                  {syncStatus.errors.map((err, idx) => (
                    <div key={idx}>{err}</div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            {syncStatus.isFinished && (
              <div className="flex flex-col gap-2 pt-2">
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-2xl text-[11px] font-bold">
                  <CheckCircle size={15} className="text-emerald-600 shrink-0" />
                  <span>
                    {syncMode === 'products' 
                      ? `Proses impor data selesai! ${syncStatus.successCount} produk berhasil masuk ke sistem.`
                      : syncMode === 'stock_update'
                      ? `Proses pembaruan stok selesai! ${syncStatus.successCount} data stok produk berhasil disinkronkan.`
                      : `Proses impor transaksi selesai! ${syncStatus.successCount} transaksi penjualan berhasil diimpor.`}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setSyncStatus(null)
                    if (syncMode === 'products') {
                      router.push('/dashboard/admin/products')
                    } else if (syncMode === 'stock_update') {
                      router.push('/dashboard/admin/stock')
                    } else {
                      router.push('/dashboard/admin/transactions')
                    }
                  }}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs py-3 px-4 rounded-xl transition-all cursor-pointer text-center"
                >
                  {syncMode === 'products' 
                    ? 'Lihat Daftar Produk' 
                    : syncMode === 'stock_update' 
                    ? 'Lihat Kartu Stok' 
                    : 'Lihat Daftar Transaksi'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

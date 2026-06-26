'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { 
  ArrowLeft, 
  Database, 
  HelpCircle, 
  Sliders, 
  CheckCircle, 
  AlertCircle, 
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

export default function PawoonSyncPage() {
  const router = useRouter()
  const [stores, setStores] = useState<StoreType[]>([])
  const [categories, setCategories] = useState<CategoryType[]>([])
  
  // Data source selector
  const [dataSource, setDataSource] = useState<'api' | 'file'>('file')
  
  // Form values
  const [selectedStoreId, setSelectedStoreId] = useState('')
  const [syncMode, setSyncMode] = useState<'products' | 'stock_update' | 'transactions'>('products')
  const [pawoonUrl, setPawoonUrl] = useState('https://dashboard.pawoon.com/product')
  const [authHeader, setAuthHeader] = useState('')
  const [cookieHeader, setCookieHeader] = useState('')
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
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
      const isFlatDetect = !hasArrayKey || keys.some(k => ['product_name', 'product_sku', 'product_qty', 'nama produk', 'jumlah produk', 'sku'].includes(k.toLowerCase()))

      const txItemsKey = isFlatDetect ? '_flat' : (keys.find(k => Array.isArray(firstItem[k])) || '')
      const firstTxItem = txItemsKey && txItemsKey !== '_flat' && firstItem[txItemsKey]?.length > 0 ? firstItem[txItemsKey][0] : null
      const itemKeys = txItemsKey === '_flat' ? keys : (firstTxItem && typeof firstTxItem === 'object' ? Object.keys(firstTxItem) : [])
      setAvailableItemKeys(itemKeys)

      setMappings(prev => ({
        ...prev,
        txPaymentMethod: keys.find(k => ['payment_method', 'payment', 'metode_pembayaran', 'payment_type', 'metode pembayaran', 'cara bayar', 'metode bayar'].includes(k.toLowerCase())) || '',
        txTotal: keys.find(k => ['total', 'grand_total', 'total_price', 'amount', 'total_amount', 'total penjualan (rp)', 'total penjualan', 'total (rp)', 'nominal', 'total bayar', 'total'].includes(k.toLowerCase())) || '',
        txSubtotal: keys.find(k => ['subtotal', 'amount', 'sub_total', 'subtotal (rp)', 'sub total'].includes(k.toLowerCase())) || '',
        txDiscount: keys.find(k => ['discount', 'total_discount', 'discount_amount', 'diskon', 'potongan', 'diskon transaksi'].includes(k.toLowerCase())) || '',
        txItems: txItemsKey,
        
        itemSku: itemKeys.find(k => ['sku', 'product_sku', 'code', 'product_code', 'sku produk', 'kode produk', 'kode barang', 'kode variant', 'sku variant'].includes(k.toLowerCase())) || '',
        itemName: itemKeys.find(k => ['name', 'product_name', 'nama', 'nama_produk', 'title', 'nama produk', 'nama barang', 'item', 'produk'].includes(k.toLowerCase())) || '',
        itemQty: itemKeys.find(k => ['qty', 'quantity', 'jumlah', 'count', 'product_qty', 'jumlah produk', 'jumlah barang', 'qty produk', 'kuantitas'].includes(k.toLowerCase())) || '',
        itemPrice: itemKeys.find(k => ['price', 'selling_price', 'harga', 'rate', 'product_price', 'harga produk', 'harga barang', 'harga satuan', 'harga jual'].includes(k.toLowerCase())) || '',
        itemDiscount: itemKeys.find(k => ['discount', 'discount_amount', 'disc', 'product_discount', 'diskon produk', 'diskon barang', 'potongan harga'].includes(k.toLowerCase())) || ''
      }))
    } else {
      setMappings(prev => ({
        ...prev,
        name: keys.find(k => ['name', 'product_name', 'nama', 'nama_produk', 'title', 'nama produk', 'nama barang'].includes(k.toLowerCase())) || '',
        sku: keys.find(k => ['sku', 'product_code', 'kode', 'kode_produk', 'sku_code', 'sku produk', 'kode produk', 'kode barang'].includes(k.toLowerCase())) || '',
        barcode: keys.find(k => ['barcode', 'upc', 'ean', 'kode_barcode', 'kode barcode'].includes(k.toLowerCase())) || '',
        sellingPrice: keys.find(k => ['price', 'selling_price', 'harga', 'harga_jual', 'retail_price', 'harga jual', 'harga jual (rp)', 'harga produk'].includes(k.toLowerCase())) || '',
        costPrice: keys.find(k => ['cost', 'cost_price', 'harga_beli', 'modal', 'purchase_price', 'harga beli', 'harga beli (rp)', 'harga modal', 'harga per unit (sistem)'].includes(k.toLowerCase())) || '',
        stock: keys.find(k => ['stok akhir', 'stok_akhir', 'stock', 'qty', 'quantity', 'stok', 'jumlah stok', 'stok awal', 'jumlah_barang_aktual', 'jumlah'].includes(k.toLowerCase())) || '',
        category: keys.find(k => ['category', 'category_name', 'kategori', 'group', 'kelompok', 'kategori produk'].includes(k.toLowerCase())) || ''
      }))
    }
  }, [syncMode, productsArray])

  // Helper to parse Excel to JSON objects with smart header finder
  function parseExcelToObjects(rows: any[][]): any[] {
    if (rows.length === 0) return []

    // Keywords to identify header row of Pawoon reports
    const headerKeywords = [
      'id struk', 'tanggal & waktu', 'status pembayaran', 'sku', 'nama produk', 
      'jumlah produk', 'harga produk', 'metode pembayaran', 'pembayaran',
      'jumlah_barang_aktual', 'selisih jumlah barang', 'jumlah barang sistem',
      'kode barang', 'nama barang', 'stok awal', 'harga beli'
    ]

    let headerRowIdx = -1
    for (let r = 0; r < Math.min(rows.length, 25); r++) {
      const row = rows[r]
      if (!row || !Array.isArray(row)) continue
      
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

  // Helper to parse Pawoon date format "DD-MM-YYYY HH:mm:ss" or "YYYY-MM-DD HH:mm:ss" or similar to timestamp
  function parsePawoonDate(dateStr: string): number {
    if (!dateStr) return 0
    
    const str = String(dateStr).trim()
    
    // 1. If it looks like an ISO date (has 'T' or ends with 'Z'), use standard Date.parse
    if (str.includes('T') || str.endsWith('Z')) {
      const directParse = Date.parse(str)
      if (!isNaN(directParse)) return directParse
    }

    // 2. Check for DD/MM/YYYY or DD-MM-YYYY (Indonesian format)
    // Matches: "12/06/2026 19:44:53" or "12/06/2026, 19.44.53"
    const dmyRegex = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:[\s,]+(\d{1,2})[:.](\d{1,2})(?:[:.](\d{1,2}))?)?/
    const dmyMatch = str.match(dmyRegex)
    if (dmyMatch) {
      const day = parseInt(dmyMatch[1], 10)
      const month = parseInt(dmyMatch[2], 10) - 1 // 0-indexed
      const year = parseInt(dmyMatch[3], 10)
      
      const hours = dmyMatch[4] ? parseInt(dmyMatch[4], 10) : 0
      const minutes = dmyMatch[5] ? parseInt(dmyMatch[5], 10) : 0
      const seconds = dmyMatch[6] ? parseInt(dmyMatch[6], 10) : 0
      
      const d = new Date(year, month, day, hours, minutes, seconds)
      if (!isNaN(d.getTime())) return d.getTime()
    }
    
    // 3. Check for YYYY-MM-DD or YYYY/MM/DD (ISO/Standard format)
    // Matches: "2026-06-12 19:44:53"
    const ymdRegex = /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})(?:[\s,]+(\d{1,2})[:.](\d{1,2})(?:[:.](\d{1,2}))?)?/
    const ymdMatch = str.match(ymdRegex)
    if (ymdMatch) {
      const year = parseInt(ymdMatch[1], 10)
      const month = parseInt(ymdMatch[2], 10) - 1 // 0-indexed
      const day = parseInt(ymdMatch[3], 10)
      
      const hours = ymdMatch[4] ? parseInt(ymdMatch[4], 10) : 0
      const minutes = ymdMatch[5] ? parseInt(ymdMatch[5], 10) : 0
      const seconds = ymdMatch[6] ? parseInt(ymdMatch[6], 10) : 0
      
      const d = new Date(year, month, day, hours, minutes, seconds)
      if (!isNaN(d.getTime())) return d.getTime()
    }
    
    // 4. Fallback to standard JS Date.parse (e.g. for month name strings)
    const directParse = Date.parse(str)
    return isNaN(directParse) ? 0 : directParse
  }


  // Handle uploading and parsing multiple Pawoon Excel/CSV files
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files ? Array.from(e.target.files) : []
    if (files.length === 0) return

    setUploadedFiles(files)
    setIsLoading(true)
    setRawData(null)
    setProductsArray([])
    setAvailableKeys([])

    const allParsedData: any[] = []
    
    try {
      for (const file of files) {
        const fileData = await new Promise<any[]>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = (evt) => {
            try {
              const bstr = evt.target?.result
              const wb = XLSX.read(bstr, { type: 'binary' })
              const wsname = wb.SheetNames[0]
              const ws = wb.Sheets[wsname]
              const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][]
              const parsed = parseExcelToObjects(rawRows)
              resolve(parsed)
            } catch (err) {
              reject(err)
            }
          }
          reader.onerror = () => reject(new Error(`Gagal membaca file ${file.name}`))
          reader.readAsBinaryString(file)
        })
        
        allParsedData.push(...fileData)
      }

      if (allParsedData.length === 0) {
        alert('Gagal mendeteksi data atau header kolom pada file Excel/CSV yang diunggah.')
        setIsLoading(false)
        return
      }

      // Sort combined data chronologically (oldest to newest)
      const dateKey = allParsedData[0] ? Object.keys(allParsedData[0]).find(k => k.toLowerCase() === 'tanggal & waktu' || k.toLowerCase() === 'tanggal') : null
      
      if (dateKey) {
        allParsedData.sort((a, b) => {
          const dateA = parsePawoonDate(String(a[dateKey] || ''))
          const dateB = parsePawoonDate(String(b[dateKey] || ''))
          return dateA - dateB
        })
      }

      setRawData(allParsedData[0]) // Use first row as raw preview representation
      setProductsArray(allParsedData)
    } catch (err: any) {
      console.error('Excel parsing error:', err)
      alert(`Gagal memproses file Excel/CSV: ${err.message}`)
      setUploadedFiles([])
    } finally {
      setIsLoading(false)
    }
  }

  // Helper to parse HTML tbody content into structured objects
  function parseHtmlTable(html: string): any[] {
    const rows: any[] = []
    const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi
    const dataIdRegex = /data-id="([^"]+)"/i
    
    let matchTr
    trRegex.lastIndex = 0
    
    while ((matchTr = trRegex.exec(html)) !== null) {
      const trContent = matchTr[1]
      const tds: string[] = []
      let matchTd
      tdRegex.lastIndex = 0
      
      while ((matchTd = tdRegex.exec(trContent)) !== null) {
        const cleanText = matchTd[1]
          .replace(/<[^>]*>/g, '') // remove inner HTML tags
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/\s+/g, ' ')
          .trim()
        tds.push(cleanText)
      }
      
      if (tds.length > 0) {
        const idMatch = trContent.match(dataIdRegex)
        const rowId = idMatch ? idMatch[1] : ''
        
        const rowObj: Record<string, any> = {
          id: rowId,
        }
        
        tds.forEach((tdText, idx) => {
          rowObj[`Kolom_${idx + 1}`] = tdText
        })
        
        // Auto-assign names for visual convenience
        if (tds.length === 4) {
          rowObj['Tanggal & Waktu'] = tds[0]
          rowObj['Kode Transaksi'] = tds[1]
          rowObj['Outlet/Supplier/Catatan'] = tds[2]
          rowObj['Tanggal Masuk'] = tds[3]
          // Fallbacks for mapping compatibility
          rowObj['sku'] = tds[1]
          rowObj['name'] = tds[2]
        } else if (tds.length >= 5) {
          rowObj['name'] = tds[0]
          rowObj['sku'] = tds[1]
          rowObj['category'] = tds[2]
          rowObj['sellingPrice'] = tds[3]
          rowObj['stock'] = tds[4]
          
          rowObj['Nama Produk'] = tds[0]
          rowObj['Kode/SKU'] = tds[1]
          rowObj['Kategori'] = tds[2]
          rowObj['Harga'] = tds[3]
          rowObj['Stok'] = tds[4]
        }
        
        rows.push(rowObj)
      }
    }
    
    return rows
  }

  // Recursively search for the largest array of objects in response JSON
  function findProductsArray(obj: any): any[] | null {
    if (obj && typeof obj === 'object') {
      if ('tbody' in obj && typeof obj.tbody === 'string') {
        const parsed = parseHtmlTable(obj.tbody)
        if (parsed.length > 0) return parsed
      }
    }

    if (Array.isArray(obj)) {
      return obj
    }
    if (obj && typeof obj === 'object') {
      const commonKeys = ['data', 'list', 'sales', 'transactions', 'items', 'products', 'records', 'results', 'detail_sales', 'detail']
      for (const key of commonKeys) {
        if (key in obj && Array.isArray(obj[key])) {
          return obj[key]
        }
      }

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

  // Handle fetching data from Pawoon proxy
  async function handleFetchData() {
    if (!pawoonUrl) {
      alert('Masukkan URL API Pawoon target!')
      return
    }
    if (!authHeader) {
      alert('Masukkan Authorization Token Pawoon!')
      return
    }

    setIsLoading(true)
    setRawData(null)
    setProductsArray([])
    setAvailableKeys([])
    setAvailableItemKeys([])

    try {
      const headers: Record<string, string> = {
        'X-Requested-With': 'XMLHttpRequest'
      }

      if (authHeader.trim()) {
        if (authHeader.trim().length < 80) {
          headers['X-CSRF-TOKEN'] = authHeader.trim()
        } else {
          headers['Authorization'] = authHeader.trim().startsWith('Bearer ') ? authHeader.trim() : `Bearer ${authHeader.trim()}`
        }
      }

      if (cookieHeader.trim()) {
        headers['Cookie'] = cookieHeader.trim()
      }

      let allItems: any[] = []
      let page = 1
      let hasMore = true
      let lastResponseData = null
      const baseTargetUrl = pawoonUrl.trim()

      while (hasMore) {
        let pageUrl = baseTargetUrl
        try {
          const urlObj = new URL(baseTargetUrl)
          urlObj.searchParams.set('page', String(page))
          pageUrl = urlObj.toString()
        } catch (e) {
          if (pageUrl.includes('page=')) {
            pageUrl = pageUrl.replace(/page=\d+/, `page=${page}`)
          } else {
            const separator = pageUrl.includes('?') ? '&' : '?'
            pageUrl = `${pageUrl}${separator}page=${page}`
          }
        }

        const res = await fetch('/api/pawoon-proxy', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            url: pageUrl,
            headers,
            method: 'GET'
          })
        })

        const data = await res.json()
        if (page === 1) {
          console.log('Pawoon API page 1 raw response:', data)
          lastResponseData = data
        }

        if (!res.ok) {
          throw new Error(data.error || `Error ${res.status} pada halaman ${page}: ${res.statusText}`)
        }

        const listData = findProductsArray(data)
        if (!listData || listData.length === 0) {
          hasMore = false
        } else {
          // Detect duplicates to prevent infinite loops
          const firstNewItem = listData[0]
          const isDuplicate = allItems.some(existingItem => {
            const existingId = existingItem.id || existingItem.sku || existingItem['Kode Transaksi']
            const newId = firstNewItem.id || firstNewItem.sku || firstNewItem['Kode Transaksi']
            if (existingId && newId) {
              return existingId === newId
            }
            return JSON.stringify(existingItem) === JSON.stringify(firstNewItem)
          })

          if (isDuplicate) {
            hasMore = false
          } else {
            allItems = [...allItems, ...listData]
            
            // If page returns less than 15 items, we assume it's the last page.
            if (listData.length < 15) {
              hasMore = false
            } else {
              page++
            }
          }
        }

        // Safety break to prevent infinite loops (max 40 pages)
        if (page > 40) {
          hasMore = false
        }
      }

      if (allItems.length === 0) {
        console.warn('Could not find listData array in:', lastResponseData)
        alert('API berhasil dipanggil, namun tidak menemukan daftar array data produk/transaksi di dalam response JSON.')
        setRawData(lastResponseData)
        setIsLoading(false)
        return
      }

      // Sort combined data chronologically (oldest to newest)
      const dateKey = allItems[0] ? Object.keys(allItems[0]).find(k => k.toLowerCase() === 'tanggal & waktu' || k.toLowerCase() === 'tanggal') : null
      if (dateKey) {
        allItems.sort((a, b) => {
          const dateA = parsePawoonDate(String(a[dateKey] || ''))
          const dateB = parsePawoonDate(String(b[dateKey] || ''))
          return dateA - dateB
        })
      }

      setRawData(allItems[0])
      setProductsArray(allItems)
    } catch (err: any) {
      console.error('Fetch Pawoon API error:', err)
      alert(`Gagal menarik data dari API Pawoon: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Parse a nested value or simple string/number from object
  function getValueByPath(obj: any, path: string) {
    if (!path) return undefined
    
    if (path.includes('.')) {
      return path.split('.').reduce((acc, part) => acc && acc[part], obj)
    }
    
    const val = obj[path]
    if (typeof val === 'object' && val !== null) {
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
    if (clean.includes('debit') || clean.includes('bank') || clean.includes('transfer') || clean.includes('card') || clean.includes('kartu')) return 'DEBIT'
    return 'CASH'
  }

  const parseExcelNumber = (val: any): number => {
    if (val === undefined || val === null) return 0
    if (typeof val === 'number') return val
    let str = String(val).trim().replace(/\s/g, '')
    if (!str) return 0
    
    // Hapus simbol non-angka/koma/titik (misal huruf "Rp", "Tunai", dll)
    str = str.replace(/[^0-9.,-]/g, '')
    if (str.startsWith('.')) {
      str = str.substring(1)
    }
    
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

  function extractItemDetails(mItem: any) {
    let name = mappings.itemName ? String(getValueByPath(mItem, mappings.itemName) || '').trim() : ''
    let sku = mappings.itemSku ? String(getValueByPath(mItem, mappings.itemSku) || '').trim() : ''
    let qty = mappings.itemQty ? parseExcelNumber(getValueByPath(mItem, mappings.itemQty)) : 0
    let price = mappings.itemPrice ? parseExcelNumber(getValueByPath(mItem, mappings.itemPrice)) : 0
    let discount = mappings.itemDiscount ? parseExcelNumber(getValueByPath(mItem, mappings.itemDiscount)) : 0

    return {
      name,
      sku,
      qty: Math.max(1, Math.round(qty || 1)),
      price: Math.max(0, Math.round(price || 0)),
      discount: Math.max(0, Math.round(discount || 0))
    }
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

    if (syncMode === 'transactions' && !mappings.itemSku && !mappings.itemName) {
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
      let currentCategories = await loadCategories(selectedStoreId)

      for (let i = 0; i < productsArray.length; i++) {
        const item = productsArray[i]
        let productName = String(getValueByPath(item, mappings.name) || '').trim()
        
        let costPrice = 0
        let sellingPrice = 0
        let stock = 0
        let sku = ''
        let barcode = ''

        const rawCost = mappings.costPrice ? getValueByPath(item, mappings.costPrice) : 0
        const rawSelling = mappings.sellingPrice ? getValueByPath(item, mappings.sellingPrice) : 0
        const rawStock = mappings.stock ? getValueByPath(item, mappings.stock) : 0
        
        costPrice = Math.max(0, Math.round(parseExcelNumber(rawCost)))
        sellingPrice = Math.max(0, Math.round(parseExcelNumber(rawSelling)))
        stock = Math.max(0, Math.round(parseExcelNumber(rawStock)))
        sku = mappings.sku ? String(getValueByPath(item, mappings.sku) || '').trim() : ''
        barcode = mappings.barcode ? String(getValueByPath(item, mappings.barcode) || '').trim() : ''

        if (!productName || productName === 'null') {
          errors.push(`Baris ${i + 1}: Nama produk tidak ditemukan`)
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
              description: `Kategori otomatis dari sinkronisasi Pawoon`
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
            stock: 0,
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
              note: 'Stok awal sinkronisasi Pawoon'
            }
            await api.post('/stock-movements', movementPayload, { headers: headersApi })
          }

          successCount++
        } catch (err: any) {
          console.error('Sync item error:', err)
          const errMsg = err.response?.data?.message || err.message || 'Gagal menyimpan produk'
          const formattedError = Array.isArray(errMsg) ? errMsg.join(', ') : errMsg

          // Fallback if SKU is already used
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
                  note: 'Stok awal sinkronisasi Pawoon (Fallback SKU)'
                }
                await api.post('/stock-movements', movementPayload, { headers: headersApi })
              }
              successCount++
              continue
            } catch (retryErr: any) {
              console.error('Retry failed:', retryErr)
            }
          }

          errors.push(`Produk "${productName}": ${formattedError}`)
        }
      }
    } else if (syncMode === 'stock_update') {
      try {
        const localProdsRes = await api.get(`/products/store/${selectedStoreId}`, { headers: headersApi })
        const localProducts = localProdsRes.data || []

        for (let i = 0; i < productsArray.length; i++) {
          const item = productsArray[i]
          let sku = mappings.sku ? String(getValueByPath(item, mappings.sku) || '').trim() : ''
          let name = mappings.name ? String(getValueByPath(item, mappings.name) || '') : ''
          let rawStock = mappings.stock ? getValueByPath(item, mappings.stock) : 0

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
                note: 'Penyesuaian stok otomatis dari sinkronisasi Pawoon'
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

        let currentCategories = [...categories]
        if (currentCategories.length === 0) {
          try {
            currentCategories = await loadCategories(selectedStoreId)
          } catch (e) {
            console.error('Failed to load categories', e)
          }
        }

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

        let targetTransactions = productsArray
        if (mappings.txItems === '_flat' && productsArray.length > 0) {
          const firstRow = productsArray[0]
          const possibleIdKeys = ['id struk', 'struk', 'invoice_no', 'invoice_number', 'id', 'transaction_no']
          const groupingKey = Object.keys(firstRow).find(k => possibleIdKeys.includes(k.toLowerCase())) || 'ID Struk'

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

        const totalSyncCount = targetTransactions.length
        setSyncStatus(prev => prev ? { ...prev, total: totalSyncCount } : null)

        const currentCashiers = [...cashiers]

        for (let i = 0; i < targetTransactions.length; i++) {
          const item = targetTransactions[i]
          const total = Math.max(0, Math.round(parseExcelNumber(getValueByPath(item, mappings.txTotal))))
          const subtotal = Math.max(0, Math.round(parseExcelNumber(getValueByPath(item, mappings.txSubtotal)) || total))
          const discount = Math.max(0, Math.round(parseExcelNumber(getValueByPath(item, mappings.txDiscount))))
          const rawMethod = String(getValueByPath(item, mappings.txPaymentMethod) || 'CASH')
          const paymentMethod = mapPaymentMethod(rawMethod)
          
          const rawItems = mappings.txItems ? getValueByPath(item, mappings.txItems) : null
          const pawoonItems = mappings.txItems === '_flat' ? item._items : (Array.isArray(rawItems) ? rawItems : [])

          const firstRow = productsArray[0]
          const possibleIdKeys = firstRow ? ['id struk', 'struk', 'invoice_no', 'invoice_number', 'id', 'transaction_no'] : []
          const groupingKey = firstRow ? (Object.keys(firstRow).find(k => possibleIdKeys.includes(k.toLowerCase())) || 'ID Struk') : 'ID Struk'

          const txId = String(getValueByPath(item, groupingKey) || item.id || `Baris ${i + 1}`)
          setSyncStatus(prev => prev ? { ...prev, current: i + 1, currentName: `Transaksi ${txId}` } : null)

          // Parse historical date from Pawoon
          const dateKey = Object.keys(item).find(k => k.toLowerCase() === 'tanggal & waktu' || k.toLowerCase() === 'tanggal')
          const rawDateStr = dateKey ? String(getValueByPath(item, dateKey) || '') : ''
          const txTimestamp = rawDateStr ? parsePawoonDate(rawDateStr) : 0
          const txCreatedAt = txTimestamp > 0 ? new Date(txTimestamp).toISOString() : undefined

          if (pawoonItems.length === 0) {
            errors.push(`Transaksi "${txId}": Array item produk kosong atau tidak ditemukan`)
            continue
          }

          const itemsPayload: any[] = []
          for (const mItem of pawoonItems) {
            const details = extractItemDetails(mItem)
            
            const cleanSku = details.sku.toLowerCase()
            const cleanName = details.name.toLowerCase()

            let localProduct = null
            if (details.sku) {
              localProduct = localProducts.find((p: any) => p.sku && p.sku.trim().toLowerCase() === cleanSku)
            }
            if (!localProduct && details.name) {
              localProduct = localProducts.find((p: any) => p.name && p.name.trim().toLowerCase() === cleanName)
            }

            if (!localProduct) {
              // Auto-create missing product on the fly to preserve analytics
              try {
                let catId = ''
                // Find category 'Umum' or the first category or create 'Umum'
                const foundCategory = currentCategories.find((c: any) => c.name.toLowerCase() === 'umum')
                if (foundCategory) {
                  catId = foundCategory.id
                } else if (currentCategories.length > 0) {
                  catId = currentCategories[0].id
                } else {
                  // Create category 'Umum'
                  const catPayload = {
                    storeId: selectedStoreId,
                    name: 'Umum',
                    description: `Kategori otomatis untuk produk transaksi Pawoon`
                  }
                  const newCatRes = await api.post('/categories', catPayload, { headers: headersApi })
                  const newCat = newCatRes.data
                  if (newCat && newCat.id) {
                    catId = newCat.id
                    currentCategories.push(newCat)
                    setCategories([...currentCategories])
                  }
                }

                const productPayload: any = {
                  storeId: selectedStoreId,
                  categoryId: catId || undefined,
                  name: details.name || 'Produk Pawoon',
                  costPrice: 0,
                  sellingPrice: details.price || 0,
                  stock: 0,
                  minimumStock: 0,
                  isActive: false,
                }
                if (details.sku) {
                  productPayload.sku = details.sku
                }

                const prodRes = await api.post('/products', productPayload, { headers: headersApi })
                const newProd = prodRes.data
                if (newProd && newProd.id) {
                  localProduct = newProd
                  localProducts.push(newProd) // Cache locally to prevent re-creation
                }
              } catch (createProdErr) {
                console.error('Failed to auto-create missing product:', createProdErr)
              }
            }

            if (!localProduct) {
              localProduct = localProducts.find((p: any) => p.name && p.name.toLowerCase().includes('pawoon'))
            }

            if (!localProduct) {
              const missingName = details.name || '(tanpa nama)'
              const missingSku = details.sku || '(tanpa SKU)'
              errors.push(`Transaksi "${txId}": Produk "${missingName}" [SKU: ${missingSku}] tidak ditemukan di database Kasir Web. Silakan buat satu produk penampung bernama "Transaksi Pawoon" di menu Daftar Produk agar transaksi tanpa produk ini bisa diimpor.`)
              continue
            }

            itemsPayload.push({
              productId: localProduct.id,
              quantity: details.qty,
              cashierDiscount: details.discount
            })
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

          const cashierKey = Object.keys(item).find(k => k.toLowerCase() === 'kasir') || 'Kasir'
          const cashierName = String(item[cashierKey] || '').trim()

          // Check if this transaction already exists in the backend
          const isAlreadyImported = localTransactions.some((t: any) => {
            // Strict ID match: check if Pawoon ID matches invoiceNumber or customerName
            if (t.invoiceNumber === txId || (t.customer?.name && t.customer.name.trim() === `Pawoon - ${txId}`)) {
              matchedLocalTxIds.add(t.id)
              return true
            }

            // Heuristic match for previously imported transactions (run today / last 24 hours):
            const txCreatedAt = new Date(t.createdAt).getTime()
            const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
            const isImportedRecently = txCreatedAt > oneDayAgo

            if (!matchedLocalTxIds.has(t.id) &&
                isImportedRecently &&
                Math.round(t.total) === Math.round(total) &&
                t.paymentMethod === paymentMethod) {
              
              // If cashier name is specified, verify it matches
              if (cashierName && t.cashier?.name) {
                if (t.cashier.name.toLowerCase() !== cashierName.toLowerCase()) {
                  return false
                }
              }

              // Match by item details if possible
              if (t.items && t.items.length === mergedItemsPayload.length) {
                const allItemsMatch = mergedItemsPayload.every((itemPayload: any) => {
                  return t.items.some((localItem: any) => {
                    return localItem.productId === itemPayload.productId &&
                           Math.round(localItem.quantity) === Math.round(itemPayload.quantity)
                  })
                })
                if (allItemsMatch) {
                  matchedLocalTxIds.add(t.id)
                  return true
                }
              } else if (!t.items || t.items.length === 0) {
                // If local tx does not have items (list API doesn't populate it), match by total & cashier
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

          let finalCashierId = ''

          if (cashierName) {
            let matchedCashier = currentCashiers.find(c => c.name.toLowerCase() === cashierName.toLowerCase())
            if (matchedCashier) {
              finalCashierId = matchedCashier.id
            } else {
              try {
                // Auto create cashier on the fly if not exists
                // Generate a random unique phone number to prevent unique constraint conflict (409)
                const randomDigits = Math.floor(10000000 + Math.random() * 90000000)
                const newCashierPayload = {
                  name: cashierName,
                  phone: `0812${randomDigits}`,
                  pin: '123456',
                  isStoreAdmin: false,
                  storeId: selectedStoreId
                }
                const newCashierRes = await api.post('/cashier', newCashierPayload, { headers: headersApi })
                const newCashier = newCashierRes.data
                if (newCashier && newCashier.id) {
                  finalCashierId = newCashier.id
                  currentCashiers.push(newCashier)
                  setCashiers([...currentCashiers])
                }
              } catch (createErr) {
                console.error(`Failed to auto-create cashier "${cashierName}":`, createErr)
              }
            }
          }

          if (!finalCashierId) {
            if (currentCashiers.length > 0) {
              finalCashierId = currentCashiers[0].id
            } else {
              try {
                const userStr = localStorage.getItem('user')
                if (userStr) {
                  finalCashierId = JSON.parse(userStr).id || ''
                }
              } catch (e) {}
            }
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
                      note: 'Penyesuaian stok otomatis untuk impor transaksi Pawoon'
                    }
                    await api.post('/stock-movements', movementPayload, { headers: headersApi })
                    localProd.stock = mergedItem.quantity
                  } catch (stockErr) {
                    console.error('Failed to auto-adjust stock before transaction:', stockErr)
                  }
                }
              }
            }

            try {
              await api.post('/transactions', payload, { headers: headersApi })
            } catch (postErr: any) {
              // Fallback to retry without custom createdAt and invoiceNumber if it failed with 400 Bad Request
              if (postErr.response?.status === 400 && (payload.createdAt || payload.invoiceNumber)) {
                console.warn('API post failed with 400 (possibly due to custom createdAt or invoiceNumber), retrying without them...')
                const fallbackPayload = { ...payload }
                delete fallbackPayload.createdAt
                delete fallbackPayload.invoiceNumber
                await api.post('/transactions', fallbackPayload, { headers: headersApi })
              } else {
                throw postErr
              }
            }

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
      console.error(err)
      alert(`Gagal memuat daftar transaksi: ${err.message}`)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl font-sans">
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
              <span>Sinkronisasi Pawoon</span>
              <span className="bg-orange-50 border border-orange-200 text-orange-700 text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md tracking-wide">
                {dataSource === 'api' ? 'API URL' : 'File Ekspor'}
              </span>
            </h1>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">
              {dataSource === 'api' 
                ? 'Tarik data produk dan stok secara instan dari dashboard.pawoon.com menggunakan session token'
                : 'Unggah file laporan ekspor Excel atau CSV dari dashboard Pawoon untuk menyinkronkan data secara instan'}
            </p>
          </div>
        </div>
      </div>

      {/* Instructions Accordion */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-3xs">
        <button 
          type="button"
          onClick={() => setShowInstructions(!showInstructions)}
          className="w-full flex items-center justify-between p-4 bg-slate-50 border-b border-slate-100 hover:bg-slate-100/50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <HelpCircle size={15} className="text-slate-500" />
            <span>
              {dataSource === 'api' 
                ? 'Cara Mendapatkan URL & Token Pawoon di Browser' 
                : 'Cara Mendapatkan File Laporan Ekspor Pawoon'}
            </span>
          </div>
          <ChevronDown size={16} className={`text-slate-500 transition-transform ${showInstructions ? 'rotate-180' : ''}`} />
        </button>
        
        {showInstructions && (
          dataSource === 'api' ? (
            <div className="p-5 text-xs text-slate-600 leading-relaxed bg-white font-medium space-y-3">
              <p className="font-bold text-slate-800">Langkah-langkah menyalin URL & Token Otorisasi dari dashboard Pawoon:</p>
              <ol className="list-decimal pl-5 space-y-1.5 text-slate-500">
                <li>Login ke <a href="https://dashboard.pawoon.com" target="_blank" className="text-orange-600 font-bold hover:underline">dashboard.pawoon.com</a> di tab browser baru.</li>
                <li>Tekan tombol <b>F12</b> pada keyboard Anda (atau Klik Kanan -&gt; Inspect Element) untuk membuka Developer Tools, lalu pilih tab <b>Network</b>.</li>
                <li>Refresh halaman dashboard Pawoon Anda atau buka menu yang ingin Anda sinkronisasikan (seperti menu Produk atau Laporan Stok).</li>
                <li>Cari nama request API di bawah kolom *Name* (biasanya memanggil host `api.pawoon.com` atau endpoint seperti `products`, `sales`, `stock`).</li>
                <li>Klik pada request tersebut, buka tab <b>Headers</b>, lalu lihat di bagian <b>Request Headers</b>:
                  <ul className="list-disc pl-5 mt-1.5 space-y-1">
                    <li>Cari baris header **`Authorization`** dan salin seluruh nilainya (biasanya diawali kata `Bearer ...`). Tempel ke form <i>Token Otorisasi Pawoon</i> di bawah.</li>
                    <li>Salin **Request URL** (misal: `https://api.pawoon.com/v1/products?limit=100`) dan tempel ke form <i>URL Target API Pawoon</i> di bawah.</li>
                    <li><i>(Opsional)</i> Jika server Pawoon memerlukan Cookie, salin header **`Cookie`** dan tempel ke form <i>Cookie Header</i>.</li>
                  </ul>
                </li>
              </ol>
              <div className="p-3.5 bg-orange-50 border border-orange-100 text-orange-900 rounded-xl">
                <b>Catatan:</b> Token ini bersifat sementara (session-based) dan akan kadaluarsa jika Anda logout dari Pawoon. Gunakan segera setelah disalin.
              </div>
            </div>
          ) : (
            <div className="p-5 text-xs text-slate-600 leading-relaxed space-y-3.5 bg-white font-medium">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="font-bold text-slate-800">1. Laporan Transaksi Penjualan</p>
                  <ul className="list-decimal pl-4 space-y-1 text-slate-500">
                    <li>Login ke dashboard Pawoon Anda di tab browser baru.</li>
                    <li>Masuk ke menu <b>Laporan</b> -&gt; <b>Laporan Penjualan</b> -&gt; <b>Laporan Detail Penjualan</b>.</li>
                    <li>Pilih rentang tanggal yang ingin diimpor, lalu klik tombol <b>Ekspor</b>.</li>
                    <li>Pilih format **Excel** atau **CSV** dan unduh file hasil ekspor tersebut.</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <p className="font-bold text-slate-800">2. Laporan Produk & Stok / Opname</p>
                  <ul className="list-decimal pl-4 space-y-1 text-slate-500">
                    <li>Buka menu <b>Produk</b> -&gt; <b>Daftar Produk</b> dan klik <b>Ekspor</b> untuk mengunduh daftar produk.</li>
                    <li>Atau buka <b>Laporan</b> -&gt; <b>Laporan Stok</b> -&gt; <b>Stok Opname</b> untuk mengunduh daftar penyesuaian stok terbaru.</li>
                    <li>Unduh file tersebut, lalu unggah ke form di bawah sesuai dengan cabangnya.</li>
                  </ul>
                </div>
              </div>
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl flex items-start gap-2">
                <AlertCircle size={15} className="shrink-0 mt-0.5 text-amber-600" />
                <p className="text-[11px] font-semibold">
                  <b>Catatan Kolom:</b> Kami secara otomatis mendeteksi baris tabel dan nama kolom Pawoon. Anda tidak perlu mengubah format file hasil ekspor tersebut sebelum mengunggahnya.
                </p>
              </div>
            </div>
          )
        )}
      </div>

      {/* Main configuration Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Form Card */}
        <div className="lg:col-span-1 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-3xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Sliders size={16} className="text-orange-600" />
            <h2 className="text-sm font-bold text-slate-800">Konfigurasi Pengambilan</h2>
          </div>

          {/* Store Selector */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Toko/Cabang Tujuan</label>
            <select 
              value={selectedStoreId}
              onChange={(e) => setSelectedStoreId(e.target.value)}
              className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:bg-white focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition-all cursor-pointer"
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
                setUploadedFiles([])
                setProductsArray([])
                setRawData(null)
                if (newMode === 'transactions') {
                  if (pawoonUrl === 'https://dashboard.pawoon.com/product' || pawoonUrl === 'https://dashboard.pawoon.com/inventory/stockcard') {
                    setPawoonUrl('https://dashboard.pawoon.com/sales/detail')
                  }
                } else if (newMode === 'stock_update') {
                  if (pawoonUrl === 'https://dashboard.pawoon.com/product' || pawoonUrl === 'https://dashboard.pawoon.com/sales/detail') {
                    setPawoonUrl('https://dashboard.pawoon.com/inventory/stockcard')
                  }
                } else {
                  if (pawoonUrl === 'https://dashboard.pawoon.com/inventory/stockcard' || pawoonUrl === 'https://dashboard.pawoon.com/sales/detail') {
                    setPawoonUrl('https://dashboard.pawoon.com/product')
                  }
                }
              }}
              className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:bg-white focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition-all cursor-pointer"
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
                  setUploadedFiles([])
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
                  setUploadedFiles([])
                }}
                className={`py-1.5 text-[10px] sm:text-[11px] font-extrabold rounded-lg transition-all cursor-pointer ${
                  dataSource === 'file'
                    ? 'bg-white text-slate-900 shadow-3xs'
                    : 'text-slate-450 hover:text-slate-700'
                }`}
              >
                Unggah File
              </button>
            </div>
          </div>

          {dataSource === 'api' ? (
            <div className="space-y-4 pt-1">
              {/* Pawoon Target URL */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">URL Target API Pawoon</label>
                <input 
                  type="text"
                  value={pawoonUrl}
                  onChange={(e) => setPawoonUrl(e.target.value)}
                  placeholder="https://api.pawoon.com/v1/products..."
                  className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:bg-white focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition-all"
                />
              </div>

              {/* Authorization Token */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Token Otorisasi Pawoon *</label>
                <textarea 
                  value={authHeader}
                  onChange={(e) => setAuthHeader(e.target.value)}
                  placeholder="Bearer eyJhbGciOi..."
                  rows={3}
                  className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:bg-white focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition-all resize-none font-mono"
                />
              </div>

              {/* Cookie Header */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Cookie Header (Opsional)</label>
                <textarea 
                  value={cookieHeader}
                  onChange={(e) => setCookieHeader(e.target.value)}
                  placeholder="session_id=... (jika diperlukan)"
                  rows={2}
                  className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:bg-white focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition-all resize-none font-mono"
                />
              </div>

              {/* Fetch Action Button */}
              <button
                type="button"
                onClick={handleFetchData}
                disabled={isLoading}
                className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-slate-200 text-white font-extrabold text-xs py-3 px-4 rounded-xl shadow-xs transition-all active:scale-97 cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Menarik Data...</span>
                  </>
                ) : (
                  <>
                    <Database size={14} />
                    <span>Tarik Data dari Pawoon</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            /* File Upload Drop Zone */
            <div className="space-y-2 pt-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Pilih File Ekspor Pawoon</label>
              <div className="border-2 border-dashed border-slate-200 hover:border-orange-400 rounded-2xl p-5 transition-all text-center relative group cursor-pointer bg-slate-50/50 hover:bg-slate-50">
                <input 
                  type="file" 
                  accept=".xlsx, .xls, .csv"
                  multiple
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="h-10 w-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Upload size={18} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-extrabold text-slate-700">
                      {uploadedFiles.length > 0 ? `${uploadedFiles.length} File Terpilih` : 'Pilih file Excel / CSV'}
                    </p>
                    <p className="text-[9px] font-medium text-slate-400">
                      {uploadedFiles.length > 0 
                        ? `${uploadedFiles.map(f => f.name).slice(0, 2).join(', ')}${uploadedFiles.length > 2 ? '...' : ''}`
                        : 'Seret & taruh file di sini atau klik untuk mencari (bisa pilih banyak file sekaligus)'}
                    </p>
                  </div>
                </div>
              </div>
              
              {uploadedFiles.length > 0 && (
                <div className="space-y-1.5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between text-[9px] font-bold text-slate-450 uppercase tracking-wide px-1">
                    <span>File Terunggah ({uploadedFiles.length})</span>
                    <button
                      type="button"
                      onClick={() => {
                        setUploadedFiles([])
                        setProductsArray([])
                        setRawData(null)
                      }}
                      className="text-orange-600 hover:text-orange-800 font-extrabold cursor-pointer"
                    >
                      Hapus Semua
                    </button>
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1 pr-1 border border-slate-150 rounded-xl p-1.5 bg-slate-50/50">
                    {uploadedFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-emerald-50 border border-emerald-150 rounded-lg p-2 text-[9.5px] text-emerald-800 font-bold font-sans">
                        <div className="flex items-center gap-1.5 max-w-[80%]">
                          <FileSpreadsheet size={12} className="text-emerald-600 shrink-0" />
                          <span className="truncate">{file.name}</span>
                        </div>
                        <span className="text-[8.5px] text-slate-400 font-semibold shrink-0">
                          {(file.size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-[9.5px] text-slate-450 font-semibold leading-relaxed">
                Unggah satu atau beberapa file laporan Pawoon yang sesuai dengan mode di atas untuk memulai pemetaan data gabungan.
              </p>
            </div>
          )}
        </div>

        {/* Preview and Mapping Card */}
        <div className="lg:col-span-2 space-y-6">
          {productsArray.length === 0 ? (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200/80 rounded-2xl p-10 shadow-3xs flex flex-col items-center justify-center text-center space-y-3 min-h-[300px]">
                <div className="h-12 w-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center">
                  <Database size={24} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-800">Belum Ada Data</h3>
                  <p className="text-xs text-slate-400 max-w-sm font-medium leading-relaxed">
                    {dataSource === 'api'
                      ? 'Isi formulir konfigurasi di sebelah kiri dan klik Tarik Data untuk memuat daftar produk/transaksi dari dashboard Pawoon Anda.'
                      : 'Unggah file laporan ekspor Pawoon di sebelah kiri untuk memproses pratinjau dan pemetaan data.'}
                  </p>
                </div>
              </div>

              {rawData && (
                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-3xs space-y-3 animate-in fade-in duration-300">
                  <h3 className="text-xs font-bold text-red-650 flex items-center gap-1.5">
                    <AlertCircle size={15} className="text-red-500" />
                    <span>Raw Response JSON (Gagal Menemukan Array Data):</span>
                  </h3>
                  <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                    Berikut adalah data mentah yang dikembalikan oleh API Pawoon. Kita bisa menganalisis struktur JSON ini untuk menemukan nama key yang tepat.
                  </p>
                  <pre className="p-3 bg-slate-950 text-slate-200 text-[10.5px] rounded-xl font-mono overflow-auto max-h-96 whitespace-pre-wrap break-all">
                    {JSON.stringify(rawData, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-3xs space-y-6 animate-in fade-in duration-300">
              
              {/* Alert Data Found */}
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center justify-between text-xs font-bold font-sans">
                <div className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-emerald-600" />
                  <span>
                    {syncMode === 'transactions' 
                      ? `Berhasil memuat ${productsArray.length} baris transaksi Pawoon dari ${dataSource === 'api' ? 'API' : 'file'}!` 
                      : `Berhasil memuat ${productsArray.length} baris produk Pawoon dari ${dataSource === 'api' ? 'API' : 'file'}!`}
                  </span>
                </div>
              </div>

              {/* Debug Raw JSON */}
              {(() => {
                const targetRecord = productsArray[0]
                const nonNullKeys = targetRecord ? Object.entries(targetRecord).filter(([k, v]) => v !== null && v !== undefined && v !== '') : []
                return (
                  <div className="space-y-3 bg-slate-50 border border-slate-200 p-4 rounded-xl">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                      Struktur Kolom File (Menampilkan baris data pertama):
                    </label>
                    
                    <div className="p-3 bg-orange-50 border border-orange-100 text-orange-900 rounded-xl space-y-2">
                      <p className="text-[11px] font-black uppercase tracking-wider text-orange-700">
                        Kolom-kolom yang Terdeteksi:
                      </p>
                      <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                        {nonNullKeys.map(([k, v]) => (
                          <span key={k} className="inline-block bg-white border border-orange-100 text-[10px] px-2 py-0.5 rounded-md font-bold text-slate-700 shadow-3xs" title={String(v)}>
                            {k}: <span className="text-orange-600">{typeof v === 'object' ? 'Object/JSON' : String(v)}</span>
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-48 overflow-y-auto bg-white">
                      <table className="w-full text-left border-collapse text-[11px] font-mono">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-200 text-slate-500 font-bold">
                            <th className="p-2 border-r border-slate-200">Nama Kolom File</th>
                            <th className="p-2">Nilai Contoh</th>
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
                  <Sliders size={13} className="text-orange-600" />
                  <span>Pemetaan Kolom Data Pawoon</span>
                </h3>
                <p className="text-[11px] font-semibold text-slate-400">
                  Tentukan kolom dari file Pawoon yang sesuai dengan kolom data di database Kasir Web ini.
                </p>

                {syncMode === 'transactions' ? (
                  <div className="space-y-5">
                    <div>
                      <h4 className="text-[11px] font-bold text-orange-600 uppercase tracking-wider mb-2">Data Utama Transaksi</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {/* Payment Method Mapping */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500">Metode Pembayaran</label>
                          <select
                            value={mappings.txPaymentMethod}
                            onChange={(e) => setMappings({ ...mappings, txPaymentMethod: e.target.value })}
                            className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 focus:bg-white focus:outline-none"
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
                            className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 focus:bg-white focus:outline-none"
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
                            className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 focus:bg-white focus:outline-none"
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
                            className="w-full text-xs font-bold text-slate-700 bg-slate-55 border border-slate-200 rounded-xl px-2 py-1.5 focus:bg-white focus:outline-none"
                          >
                            <option value="">-- Lewati (0) --</option>
                            {availableKeys.map(k => <option key={k} value={k}>{k}</option>)}
                          </select>
                        </div>

                        {/* Items Array Mapping */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500">Struktur Item Barang *</label>
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
                            className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 focus:bg-white focus:outline-none"
                          >
                            <option value="_flat">-- Flat (Satu baris per item, gabungkan berdasarkan ID) --</option>
                            {availableKeys.map(k => <option key={k} value={k}>{k}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100">
                      <h4 className="text-[11px] font-bold text-orange-600 uppercase tracking-wider mb-2">Detail Item Barang (Dalam Baris/Array)</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {/* Item SKU Mapping */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500">SKU Barang *</label>
                          <select
                            value={mappings.itemSku}
                            onChange={(e) => setMappings({ ...mappings, itemSku: e.target.value })}
                            className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 focus:bg-white focus:outline-none"
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
                            className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 focus:bg-white focus:outline-none"
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
                            className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 focus:bg-white focus:outline-none"
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
                            className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 focus:bg-white focus:outline-none"
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
                            className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 focus:bg-white focus:outline-none"
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
                        className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 focus:bg-white focus:outline-none"
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
                        className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 focus:bg-white focus:outline-none"
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
                        className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 focus:bg-white focus:outline-none"
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
                        className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 focus:bg-white focus:outline-none"
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
                        className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 focus:bg-white focus:outline-none"
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
                        className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 focus:bg-white focus:outline-none"
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
                        className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 focus:bg-white focus:outline-none"
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
                <h3 className="text-xs font-bold text-slate-800">Preview Data Terpetakan (5 baris pertama):</h3>
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
                          const possibleIdKeys = ['id struk', 'struk', 'invoice_no', 'invoice_number', 'id', 'transaction_no']
                          const groupingKey = Object.keys(firstRow).find(k => possibleIdKeys.includes(k.toLowerCase())) || 'ID Struk'

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
                        }

                        return previewList.slice(0, 5).map((item, idx) => {
                          if (syncMode === 'transactions') {
                            const firstRow = productsArray[0]
                            const possibleIdKeys = firstRow ? ['id struk', 'struk', 'invoice_no', 'invoice_number', 'id', 'transaction_no'] : []
                            const groupingKey = firstRow ? (Object.keys(firstRow).find(k => possibleIdKeys.includes(k.toLowerCase())) || 'ID Struk') : 'ID Struk'

                            const txId = String(getValueByPath(item, groupingKey) || item.id || `Baris ${idx + 1}`)
                            const total = Math.max(0, parseExcelNumber(getValueByPath(item, mappings.txTotal)))
                            const discount = Math.max(0, parseExcelNumber(getValueByPath(item, mappings.txDiscount)))
                            const method = mapPaymentMethod(String(getValueByPath(item, mappings.txPaymentMethod) || 'CASH'))
                            
                            const rawItems = mappings.txItems ? getValueByPath(item, mappings.txItems) : null
                            const pawoonItems = mappings.txItems === '_flat' ? item._items : (Array.isArray(rawItems) ? rawItems : [])

                            const itemsSummary = pawoonItems.map((mItem: any) => {
                              const details = extractItemDetails(mItem)
                              const nameToShow = details.name || 'Penjualan Pawoon'
                              return `${nameToShow} (${details.qty}x)`
                            }).join(', ')

                            return (
                              <tr key={idx} className="hover:bg-slate-50/50">
                                <td className="p-3 font-bold text-slate-800">{txId}</td>
                                <td className="p-3">
                                  <span className="inline-block bg-orange-50 border border-orange-150 text-orange-700 px-2 py-0.5 rounded-full font-bold">
                                    {method}
                                  </span>
                                </td>
                                <td className="p-3 text-right text-emerald-600 font-bold">{total.toLocaleString('id-ID')}</td>
                                <td className="p-3 text-right text-slate-400">{discount.toLocaleString('id-ID')}</td>
                                <td className="p-3 text-slate-600 max-w-[200px] truncate" title={itemsSummary}>{itemsSummary || '-'}</td>
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

                          return (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="p-3 font-bold text-slate-800 max-w-[200px] truncate" title={name}>{name}</td>
                              <td className="p-3 font-mono text-[10px] text-slate-400">
                                {sku && <div>SKU: {sku}</div>}
                                {barcode && <div>BC: {barcode}</div>}
                                {!sku && !barcode && '-'}
                              </td>
                              <td className="p-3 text-right text-orange-600 font-bold">{sellingPrice.toLocaleString('id-ID')}</td>
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
                <Database className="text-orange-600" size={18} />
                <h3 className="font-black text-slate-900 text-sm font-sans">Proses Sinkronisasi Pawoon</h3>
              </div>
              {syncStatus.isFinished && (
                <button 
                  type="button"
                  onClick={() => setSyncStatus(null)}
                  className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-650 rounded-lg transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 font-sans">
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
                  className="bg-orange-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${(syncStatus.current / syncStatus.total) * 100}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400 font-semibold italic truncate font-sans">
                {syncStatus.currentName || 'Memulai...'}
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 text-center font-sans">
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
              <div className="space-y-1.5 font-sans">
                <div className="text-[10px] font-black text-rose-500 uppercase tracking-wider flex items-center gap-1">
                  <AlertTriangle size={12} />
                  <span>Log Error ({syncStatus.errors.length})</span>
                </div>
                <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-3 max-h-36 overflow-y-auto font-mono text-[9.5px] text-rose-755 leading-relaxed space-y-1 scrollbar-thin">
                  {syncStatus.errors.map((err, idx) => (
                    <div key={idx}>{err}</div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            {syncStatus.isFinished && (
              <div className="flex flex-col gap-2 pt-2 font-sans">
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
                  type="button"
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

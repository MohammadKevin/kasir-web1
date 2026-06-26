'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import {
  Search,
  ScanLine,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Wallet,
  QrCode,
  UserPlus,
  Loader2,
  Printer,
  X,
  Package,
  ArrowRight,
  ShoppingCart,
  CheckCircle2,
  ArrowLeft,
  ChevronDown,
  Layers,
  Sparkles,
  FolderOpen,
  Tag
} from 'lucide-react'
import { api } from '@/lib/api'
import { toast } from 'sonner'

type Product = {
  categoryId: string
  id: string
  name: string
  image?: string
  barcode: string
  sellingPrice: number
  stock: number
  sku: string
  isActive?: boolean
  discounts?: {
    discount: {
      type: 'PERCENTAGE' | 'FIXED'
      value: number
      isActive: boolean
      startDate?: string | null
      endDate?: string | null
    }
  }[]
  discountProduct?: {
    discount: {
      type: 'PERCENTAGE' | 'FIXED'
      value: number
      isActive: boolean
      startDate?: string | null
      endDate?: string | null
    }
  }[]
}

type Category = {
  id: string
  name: string
}

type CartItem = Product & {
  qty: number
  cashierDiscount: number
}

type PaymentMethod = 'CASH' | 'QRIS' | 'DEBIT' | 'SPLIT'

const PAYMENT_METHOD_MAP: Record<string, string> = {
  CASH: 'Tunai',
  QRIS: 'QRIS',
  DEBIT: 'Debit',
  SPLIT: 'Split'
}

const formatDate = (dateInput: string | Date) => {
  const d = new Date(dateInput)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const formatTime = (dateInput: string | Date) => {
  const d = new Date(dateInput)
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${hh}:${min}:${ss}`
}

const getReceiptUniqueCode = (invoice: string, createdAt: string | Date) => {
  const d = new Date(createdAt)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  
  let hash = 0
  if (invoice) {
    for (let i = 0; i < invoice.length; i++) {
      hash = (hash << 5) - hash + invoice.charCodeAt(i)
      hash |= 0
    }
  }
  const prefix = Math.abs(hash).toString().slice(0, 6).padEnd(6, '0')
  return `${prefix}${yyyy}${mm}${dd}${hh}${min}${ss}`
}

const getCategoryStyles = (name: string, index: number) => {
  const lowercaseName = name.toLowerCase()
  let bg = 'bg-indigo-50 text-indigo-600 border-indigo-100/80'
  let gradient = 'from-indigo-500 to-purple-600'
  let hoverRing = 'focus-within:ring-indigo-500 group-hover:border-indigo-400'
  let glow = 'glow-violet hover:border-indigo-450'
  
  if (lowercaseName.includes('atasan') || lowercaseName.includes('baju')) {
    bg = 'bg-sky-50 text-sky-600 border-sky-100/80'
    gradient = 'from-sky-400 to-blue-500'
    hoverRing = 'focus-within:ring-sky-500 group-hover:border-sky-400'
    glow = 'glow-blue hover:border-sky-450'
  } else if (lowercaseName.includes('celana') || lowercaseName.includes('bawahan')) {
    bg = 'bg-amber-50 text-amber-600 border-amber-100/80'
    gradient = 'from-amber-400 to-orange-500'
    hoverRing = 'focus-within:ring-amber-500 group-hover:border-amber-400'
    glow = 'glow-amber hover:border-amber-450'
  } else if (lowercaseName.includes('aksesoris')) {
    bg = 'bg-emerald-50 text-emerald-600 border-emerald-100/80'
    gradient = 'from-emerald-400 to-teal-500'
    hoverRing = 'focus-within:ring-emerald-500 group-hover:border-emerald-400'
    glow = 'glow-emerald hover:border-emerald-450'
  } else if (
    lowercaseName.includes('bergo') || 
    lowercaseName.includes('khimar') || 
    lowercaseName.includes('mukena') || 
    lowercaseName.includes('gamis')
  ) {
    bg = 'bg-rose-50 text-rose-600 border-rose-100/80'
    gradient = 'from-rose-400 to-pink-500'
    hoverRing = 'focus-within:ring-rose-500 group-hover:border-rose-400'
    glow = 'glow-violet hover:border-rose-450'
  } else {
    const presets = [
      { bg: 'bg-violet-50 text-violet-600 border-violet-100/80', gradient: 'from-violet-400 to-fuchsia-500', hoverRing: 'focus-within:ring-violet-500 group-hover:border-violet-400', glow: 'glow-violet hover:border-violet-450' },
      { bg: 'bg-teal-50 text-teal-600 border-teal-100/80', gradient: 'from-teal-400 to-emerald-500', hoverRing: 'focus-within:ring-teal-500 group-hover:border-teal-400', glow: 'glow-emerald hover:border-teal-450' },
      { bg: 'bg-cyan-50 text-cyan-600 border-cyan-100/80', gradient: 'from-cyan-400 to-blue-500', hoverRing: 'focus-within:ring-cyan-500 group-hover:border-cyan-400', glow: 'glow-blue hover:border-cyan-450' },
      { bg: 'bg-fuchsia-50 text-fuchsia-600 border-fuchsia-100/80', gradient: 'from-fuchsia-400 to-pink-500', hoverRing: 'focus-within:ring-fuchsia-500 group-hover:border-fuchsia-400', glow: 'glow-violet hover:border-fuchsia-450' },
    ]
    const preset = presets[index % presets.length]
    bg = preset.bg
    gradient = preset.gradient
    hoverRing = preset.hoverRing
    glow = preset.glow
  }
  return { bg, gradient, hoverRing, glow }
}

const getCategoryIcon = (name: string) => {
  const lowercaseName = name.toLowerCase()
  if (lowercaseName.includes('atasan') || lowercaseName.includes('baju')) {
    return Layers
  } else if (lowercaseName.includes('celana') || lowercaseName.includes('bawahan')) {
    return Layers
  } else if (lowercaseName.includes('aksesoris')) {
    return Tag
  } else if (
    lowercaseName.includes('bergo') || 
    lowercaseName.includes('khimar') || 
    lowercaseName.includes('mukena') || 
    lowercaseName.includes('gamis')
  ) {
    return FolderOpen
  }
  return FolderOpen
}

export default function PosPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [payment, setPayment] = useState<PaymentMethod>('CASH')
  const [paid, setPaid] = useState<number | ''>('')
  const [cashier, setCashier] = useState<any>(null)

  const [isPPN, setIsPPN] = useState(false)
  const [globalDiscountType, setGlobalDiscountType] = useState<'PERCENT' | 'FIXED'>('PERCENT')
  const [globalDiscountValue, setGlobalDiscountValue] = useState(0)

  
  const [orderType, setOrderType] = useState<'TAKEAWAY' | 'DINEIN'>('TAKEAWAY')
  const [tables, setTables] = useState<any[]>([])
  const [selectedTableId, setSelectedTableId] = useState<string>('')
  const [customerPoints, setCustomerPoints] = useState<number>(0)
  const [customerTier, setCustomerTier] = useState<string>('BRONZE')
  const [isRedeemingPoints, setIsRedeemingPoints] = useState(false)
  const [isSplitPaymentModalOpen, setIsSplitPaymentModalOpen] = useState(false)
  const [splitAmounts, setSplitAmounts] = useState<Record<string, number>>({ CASH: 0, QRIS: 0, DEBIT: 0 })

  const [isCustomerMode, setIsCustomerMode] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [saveCustomer, setSaveCustomer] = useState(false)
  const [searchingCustomer, setSearchingCustomer] = useState(false)

  const [receiptData, setReceiptData] = useState<any>(null)
  const [isOpenReceipt, setIsOpenReceipt] = useState(false)
  const [currentStore, setCurrentStore] = useState<any>(null)
  const [mobileView, setMobileView] = useState<'catalog' | 'cart'>('catalog')
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'payment'>('cart')

  const barcodeBuffer = useRef<string>('')
  const lastKeyTime = useRef<number>(0)
  
  const searchInputRef = useRef<HTMLInputElement>(null)
  const discountInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('cashier')
      if (cached) setCashier(JSON.parse(cached))
    }
    loadData()
    checkStoreOpenStatus()
  }, [])

  async function checkStoreOpenStatus() {
    try {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return
      }
      const token = localStorage.getItem('token')
      const headers = { Authorization: `Bearer ${token}` }
      const res = await api.get('/attendance/store/status', { headers })
      if (res.data && res.data.isOpen === false) {
        alert('Akses POS Terkunci! Operasional Toko belum dibuka,Silahkan buka operasional toko terlebih dahulu!')
        window.location.href = '/dashboard/store'
      }
    } catch (err: any) {
      console.warn('Gagal mengecek status operasional toko:', err?.message || err)
      if (err.response && err.response.status === 403) {
        window.location.href = '/dashboard/store'
      }
    }
  }

  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'F9') { 
        e.preventDefault() 
        if (checkoutStep === 'cart') {
          if (cart.length > 0) setCheckoutStep('payment')
        } else {
          checkout()
        }
      } else if (e.key === 'F2') {
        e.preventDefault()
        searchInputRef.current?.focus()
      } else if (e.key === 'F7') {
        e.preventDefault()
        discountInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [cart, payment, paid, submitting, checkoutStep])

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const currentTime = Date.now()
      if (currentTime - lastKeyTime.current > 50) barcodeBuffer.current = ''
      lastKeyTime.current = currentTime

      if (e.key === 'Enter') {
        if (barcodeBuffer.current.trim().length > 2) {
          const target = products.find(
            p => (p.barcode === barcodeBuffer.current.trim() || p.sku === barcodeBuffer.current.trim()) && p.isActive !== false
          )
          if (target) addToCart(target)
          barcodeBuffer.current = ''
          e.preventDefault()
        }
      } else if (e.key !== 'Shift') {
        barcodeBuffer.current += e.key
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [products])

  const [bundlingEnabled, setBundlingEnabled] = useState(false)

  function getBundleCalculatedStock(bundle: any, productsList: any[]) {
    let minStock = 9999
    bundle.products.forEach((part: any) => {
      const prod = productsList.find(p => p.id === part.productId)
      if (prod) {
        const stockAvailable = Math.floor(prod.stock / part.qty)
        if (stockAvailable < minStock) minStock = stockAvailable
      } else {
        minStock = 0
      }
    })
    return minStock === 9999 ? 0 : minStock
  }

  async function loadData() {
    try {
      setLoading(true)
      const storeId = localStorage.getItem('storeId')
      const token = localStorage.getItem('token')
      const headers = { Authorization: `Bearer ${token}` }
      
      const isBundling = localStorage.getItem('feature_bundling_enabled') !== 'false'
      setBundlingEnabled(isBundling)

      const [productsRes, categoriesRes, storeRes, tablesRes] = await Promise.all([
        api.get(`/products/store/${storeId}`, { headers }),
        api.get(`/categories/store/${storeId}`, { headers }),
        api.get(`/stores/${storeId}`, { headers }),
        api.get(`/tables/store/${storeId}`, { headers }).catch(() => ({ data: [] }))
      ])

      const productsData = productsRes.data || []
      const categoriesData = categoriesRes.data || []
      const storeData = storeRes.data || null
      const tablesData = tablesRes.data || []

      let finalProducts = [...productsData]
      const finalCategories = [...categoriesData]

      if (isBundling) {
        const storedBundlesStr = localStorage.getItem(`store_product_bundles_${storeId}`)
        if (storedBundlesStr) {
          try {
            const storedBundles = JSON.parse(storedBundlesStr)
            const formattedBundles = storedBundles.filter((b: any) => {
              if (!b.isActive) return false;
              if (b.startDate || b.endDate) {
                const now = new Date();
                if (b.startDate && new Date(b.startDate) > now) return false;
                if (b.endDate) {
                  const end = new Date(b.endDate);
                  if (b.endDate.length === 10) {
                    end.setHours(23, 59, 59, 999);
                  }
                  if (end < now) return false;
                }
              }
              return true;
            }).map((b: any) => ({
              id: b.id,
              categoryId: 'bundle_cat',
              name: b.name,
              barcode: b.barcode,
              sku: b.sku,
              sellingPrice: b.sellingPrice,
              stock: getBundleCalculatedStock(b, productsData),
              isBundle: true,
              products: b.products,
              description: b.description || 'Paket Hemat Combo',
              startDate: b.startDate,
              endDate: b.endDate
            }))
            finalProducts = [...finalProducts, ...formattedBundles]
            
            finalCategories.push({
              id: 'bundle_cat',
              name: '🎁 Paket Bundling'
            })
          } catch (e) {
            console.error('Error parsing bundles for POS catalog', e)
          }
        }
      }

      setProducts(finalProducts)
      setCategories(finalCategories)
      setCurrentStore(storeData)
      setTables(tablesData)

      localStorage.setItem('cached_products', JSON.stringify(productsData))
      localStorage.setItem('cached_categories', JSON.stringify(categoriesData))
      localStorage.setItem('cached_store', JSON.stringify(storeData))
      localStorage.setItem('cached_tables', JSON.stringify(tablesData))
    } catch (err: any) {
      console.warn('Gagal memuat data POS:', err?.message || err)

      const cachedProducts = localStorage.getItem('cached_products')
      const cachedCategories = localStorage.getItem('cached_categories')
      const cachedStore = localStorage.getItem('cached_store')
      const cachedTables = localStorage.getItem('cached_tables')

      if (cachedProducts || cachedCategories || cachedStore || cachedTables) {
        const productsData = cachedProducts ? JSON.parse(cachedProducts) : []
        const categoriesData = cachedCategories ? JSON.parse(cachedCategories) : []
        const storeData = cachedStore ? JSON.parse(cachedStore) : null
        const tablesData = cachedTables ? JSON.parse(cachedTables) : []

        let finalProducts = [...productsData]
        const finalCategories = [...categoriesData]

        const storeId = localStorage.getItem('storeId')
        const isBundling = localStorage.getItem('feature_bundling_enabled') !== 'false'
        if (isBundling && storeId) {
          const storedBundlesStr = localStorage.getItem(`store_product_bundles_${storeId}`)
          if (storedBundlesStr) {
            try {
              const storedBundles = JSON.parse(storedBundlesStr)
              const formattedBundles = storedBundles.filter((b: any) => {
                if (!b.isActive) return false;
                if (b.startDate || b.endDate) {
                  const now = new Date();
                  if (b.startDate && new Date(b.startDate) > now) return false;
                  if (b.endDate) {
                    const end = new Date(b.endDate);
                    if (b.endDate.length === 10) {
                      end.setHours(23, 59, 59, 999);
                    }
                    if (end < now) return false;
                  }
                }
                return true;
              }).map((b: any) => ({
                id: b.id,
                categoryId: 'bundle_cat',
                name: b.name,
                barcode: b.barcode,
                sku: b.sku,
                sellingPrice: b.sellingPrice,
                stock: getBundleCalculatedStock(b, productsData),
                isBundle: true,
                products: b.products,
                description: b.description || 'Paket Hemat Combo',
                startDate: b.startDate,
                endDate: b.endDate
              }))
              finalProducts = [...finalProducts, ...formattedBundles]
              finalCategories.push({
                id: 'bundle_cat',
                name: '🎁 Paket Bundling'
              })
            } catch (e) {
              console.error('Error parsing bundles for offline POS catalog', e)
            }
          }
        }

        setProducts(finalProducts)
        setCategories(finalCategories)
        if (storeData) setCurrentStore(storeData)
        setTables(tablesData)
        
        toast.warning('Gagal terhubung ke server. Menggunakan data cache lokal.', {
          description: 'Anda sedang berada dalam Mode Offline.',
          duration: 5000,
        })
      } else {
        toast.error('Gagal memuat data POS dan tidak ada cache lokal tersedia.', {
          description: 'Periksa koneksi internet Anda.',
          duration: 5000,
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const isSyncingRef = useRef(false)

  async function syncOfflineTransactions() {
    if (isSyncingRef.current) return
    if (typeof navigator !== 'undefined' && !navigator.onLine) return

    const offlineTxStr = localStorage.getItem('offlineTransactions')
    if (!offlineTxStr) return
    
    let txs = []
    try {
      txs = JSON.parse(offlineTxStr)
      if (!Array.isArray(txs) || txs.length === 0) return
    } catch {
      return
    }

    isSyncingRef.current = true
    
    toast.info(`Menyinkronkan ${txs.length} transaksi offline...`, {
      id: 'sync-status',
      duration: 0
    })

    const token = localStorage.getItem('token')
    const headers = { Authorization: `Bearer ${token}` }
    const successfulInvoices: string[] = []
    let failedCount = 0

    for (const tx of txs) {
      try {
        await api.post('/transactions', tx.payload, { headers })
        successfulInvoices.push(tx.id)
      } catch (err: any) {
        console.warn(`Gagal sinkronisasi transaksi ${tx.id}:`, err?.message || err)
        failedCount++
        if (err.response?.status === 401 || err.response?.status === 403) {
          toast.error('Gagal sinkronisasi: Sesi login berakhir. Silakan login kembali.', {
            id: 'sync-status',
            duration: 5000
          })
          isSyncingRef.current = false
          return
        }
      }
    }

    const updatedTxs = txs.filter(tx => !successfulInvoices.includes(tx.id))
    localStorage.setItem('offlineTransactions', JSON.stringify(updatedTxs))

    if (successfulInvoices.length > 0) {
      toast.success(`Berhasil menyinkronkan ${successfulInvoices.length} transaksi ke server!`, {
        id: 'sync-status',
        description: failedCount > 0 ? `${failedCount} transaksi masih tertunda.` : undefined,
        duration: 5000
      })
      loadData()
    } else {
      toast.dismiss('sync-status')
    }
    
    isSyncingRef.current = false
  }

  useEffect(() => {
    syncOfflineTransactions()

    const handleOnlineEvent = () => {
      syncOfflineTransactions()
    }
    window.addEventListener('network-online', handleOnlineEvent)

    const interval = setInterval(syncOfflineTransactions, 20000)

    return () => {
      window.removeEventListener('network-online', handleOnlineEvent)
      clearInterval(interval)
    }
  }, [])

  async function searchCustomerByPhone(phone: string) {
    try {
      setSearchingCustomer(true)
      const token = localStorage.getItem('token')
      const res = await api.get(`/customers/phone/${phone}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.data) {
        setCustomerName(res.data.name)
        setCustomerPoints(res.data.points || 0)
        setCustomerTier(res.data.memberTier || 'BRONZE')
        setSaveCustomer(false)
      }
    } catch { }
    finally { setSearchingCustomer(false) }
  }

  useEffect(() => {
    const t = setTimeout(() => {
      if (customerPhone.trim().length >= 10) searchCustomerByPhone(customerPhone.trim())
    }, 800)
    return () => clearTimeout(t)
  }, [customerPhone])

  function getProductMasterDiscount(p: Product): number {
    const discountsList = p.discounts || p.discountProduct;
    if (!discountsList || !discountsList.length) return 0;
    
    const activeObj = discountsList.find(d => {
      const disc = d.discount;
      if (!disc) return false;
      if (!disc.isActive) return false;
      
      if (disc.startDate || disc.endDate) {
        const now = new Date();
        if (disc.startDate && new Date(disc.startDate) > now) return false;
        if (disc.endDate && new Date(disc.endDate) < now) return false;
      }
      return true;
    });
    
    const active = activeObj?.discount;
    if (!active) return 0;
    
    return active.type === 'PERCENTAGE'
      ? Math.floor((p.sellingPrice * active.value) / 100)
      : active.value;
  }

  function addToCart(p: Product) {
    if (p.stock <= 0) return alert('Stok produk habis')
    setCart(prev => {
      const exist = prev.find(x => x.id === p.id)
      if (exist) return prev.map(x => x.id === p.id ? { ...x, qty: Math.min(x.qty + 1, p.stock) } : x)
      return [...prev, { ...p, qty: 1, cashierDiscount: 0 }]
    })
  }

  function updateQty(id: string, delta: number) {
    setCart(old =>
      old.map(x => {
        if (x.id !== id) return x
        const newQty = x.qty + delta
        if (newQty <= 0) return null
        return { ...x, qty: Math.min(newQty, x.stock) }
      }).filter(Boolean) as CartItem[]
    )
  }

  function updateCashierDiscount(id: string, value: number) {
    setCart(old =>
      old.map(x => {
        if (x.id !== id) return x
        const masterDiscount = getProductMasterDiscount(x)
        const max = x.sellingPrice - masterDiscount
        return { ...x, cashierDiscount: Math.min(Math.max(0, value), max) }
      })
    )
  }

  function removeFromCart(id: string) {
    setCart(prev => prev.filter(x => x.id !== id))
  }

  const rawSubtotal = useMemo(() =>
    cart.reduce((sum, item) => {
      const masterDiscount = getProductMasterDiscount(item)
      const finalItemPrice = Math.max(0, item.sellingPrice - masterDiscount - item.cashierDiscount)
      return sum + (item.qty * finalItemPrice)
    }, 0),
  [cart])

  const globalCalculatedDiscount = useMemo(() =>
    globalDiscountType === 'PERCENT'
      ? Math.floor((rawSubtotal * globalDiscountValue) / 100)
      : globalDiscountValue,
  [rawSubtotal, globalDiscountType, globalDiscountValue])

  const pointsToRedeem = useMemo(() => {
    if (!isRedeemingPoints || currentStore?.pointsEnabled === false) return 0
    const pointVal = currentStore?.pointValue || 1000
    const billAfterDiscount = rawSubtotal - globalCalculatedDiscount
    return Math.min(customerPoints, Math.ceil(billAfterDiscount / pointVal))
  }, [isRedeemingPoints, customerPoints, rawSubtotal, globalCalculatedDiscount, currentStore])

  const pointsDiscount = useMemo(() => {
    const pointVal = currentStore?.pointValue || 1000
    return pointsToRedeem * pointVal
  }, [pointsToRedeem, currentStore])

  const discountTotal = useMemo(() =>
    globalCalculatedDiscount + pointsDiscount,
  [globalCalculatedDiscount, pointsDiscount])

  const servicePercent = currentStore?.serviceRate || 0
  const taxPercent = currentStore?.taxRate || 0

  const serviceAmount = useMemo(() =>
    orderType === 'DINEIN' ? Math.floor((rawSubtotal - discountTotal) * (servicePercent / 100)) : 0,
  [orderType, rawSubtotal, discountTotal, servicePercent])

  const ppnAmount = useMemo(() =>
    isPPN ? Math.floor((rawSubtotal - discountTotal + serviceAmount) * (taxPercent / 100)) : 0,
  [isPPN, rawSubtotal, discountTotal, serviceAmount, taxPercent])

  const finalTotal = useMemo(() =>
    Math.max(0, rawSubtotal - discountTotal + serviceAmount + ppnAmount),
  [rawSubtotal, discountTotal, serviceAmount, ppnAmount])

  useEffect(() => {
    if (payment !== 'CASH') setPaid(finalTotal)
    else setPaid('')
  }, [payment, finalTotal])

  const change = useMemo(() => {
    if (payment === 'CASH') {
      return Math.max(0, Number(paid || 0) - finalTotal)
    }
    if (payment === 'SPLIT') {
      const splitSum = Object.values(splitAmounts).reduce((a, b) => a + b, 0)
      return Math.max(0, splitSum - finalTotal)
    }
    return 0
  }, [paid, finalTotal, payment, splitAmounts])

  const shortage = useMemo(() => {
    if (payment === 'CASH' && paid !== '') {
      const diff = finalTotal - Number(paid || 0)
      return diff > 0 ? diff : 0
    }
    return 0
  }, [paid, finalTotal, payment])

  function autoPrintReceipt(data: any, paymentMethod: PaymentMethod) {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    const totalQty = data.items.reduce((s: number, i: any) => s + i.quantity, 0)
    const uniqueCode = getReceiptUniqueCode(data.invoice, data.createdAt)
    const branchAddress = currentStore?.address?.split(',').slice(-1)[0]?.trim() || 'Sby'
    
    
    let parsedSplit: any = null
    if (data.splitPayments) {
      try {
        parsedSplit = typeof data.splitPayments === 'string' ? JSON.parse(data.splitPayments) : data.splitPayments
      } catch (e) {
        console.error('Gagal memproses split payments:', e)
      }
    }

    printWindow.document.write(`
      <html>
      <head>
      <title>Nota #${data.invoice}</title>
      <style>
      @media print { @page { margin: 0; size: ${currentStore?.receiptSize || '58mm'} auto; } body { margin: 0; padding: 4px 6px; } }
      body { font-family: 'Courier New', Courier, monospace; font-size: 10px; max-width: ${currentStore?.receiptSize === '80mm' ? '290px' : '210px'}; margin: 0 auto; padding: 4px 6px; color: #000; background: #fff; line-height: 1.3; }
      .tc { text-align: center; }
      .tl { text-align: left; }
      .tr { text-align: right; }
      .b { font-weight: bold; }
      .hr-dotted { border: none; border-top: 1px dotted #000; margin: 6px 0; }
      .hr-dashed { border: none; border-top: 1px dashed #000; margin: 6px 0; }
      .flex-row { display: flex; justify-content: space-between; }
      .store-icon { width: 36px; height: 36px; margin: 0 auto 6px; display: block; }
      .brand { font-size: 12px; font-weight: bold; text-transform: uppercase; margin: 0 0 2px; }
      .store-detail { font-size: 8.5px; margin-bottom: 2px; }
      .unique-code { font-size: 8.5px; margin: 4px 0; font-weight: bold; }
      .meta-block { font-size: 8.5px; margin: 4px 0; line-height: 1.25; }
      .meta-row { display: flex; justify-content: space-between; align-items: flex-start; }
      .meta-right { text-align: right; }
      .items-block { font-size: 9.5px; }
      .item-row { margin-bottom: 5px; }
      .item-name { font-weight: bold; }
      .item-details { display: flex; justify-content: space-between; font-size: 9px; padding-left: 10px; }
      .summary-block { font-size: 9px; margin-top: 4px; line-height: 1.35; }
      .total-row { font-size: 11px; font-weight: bold; }
      .footer-block { margin-top: 12px; font-size: 8px; line-height: 1.3; }
      </style>
      </head>
      <body>
      <svg class="store-icon" viewBox="0 0 24 24" fill="currentColor">
        <path d="M21.9 8.89l-1.05-4.37c-.22-.9-1-1.52-1.91-1.52H5.05c-.9 0-1.69.63-1.9 1.52L2.1 8.89c-.24.97.26 1.96 1.2 2.32c.12.04.24.07.37.08v7.71c0 .99.81 1.8 1.8 1.8h13c.99 0 1.8-.81 1.8-1.8v-7.71c.13-.01.25-.04.37-.08c.95-.36 1.45-1.35 1.21-2.32zM13 18H8v-4h5v4z"/>
      </svg>
      <div class="tc">
        <div class="brand">${data.store}</div>
        <div class="store-detail">${currentStore?.address || 'Jl. Dr. Ir. H. Soekarno No.19, Medokan Semampir Surabaya'}</div>
        <div class="store-detail">No. Telp ${currentStore?.phone || '0812345678'}</div>
        ${currentStore?.receiptHeader ? `<div class="store-detail b" style="margin-top: 4px; font-style: italic;">${currentStore.receiptHeader}</div>` : ''}
        <div class="unique-code">${uniqueCode}</div>
      </div>
      <div class="hr-dotted"></div>
      <div class="meta-block">
        <div class="meta-row">
          <div>
            <div>${formatDate(data.createdAt)}</div>
            <div>${formatTime(data.createdAt)}</div>
            <div class="b">No. ${data.invoice}</div>
            <div class="b">Penjualan Retail</div>
          </div>
          <div class="meta-right">
            ${currentStore?.receiptShowCustomer !== false ? `<div>${data.customer || '-'}</div>` : ''}
            <div>${data.cashier}</div>
            <div>${branchAddress}</div>
          </div>
        </div>
      </div>
      <div class="hr-dashed"></div>
      <div class="items-block">
        ${data.items.map((item: any, i: number) => {
          const itemDiscount = (item.discount || 0) * item.quantity;
          const itemTotal = (item.originalPrice * item.quantity);
          return `
            <div class="item-row">
              <div class="item-name">${i + 1}. ${item.product}</div>
              <div class="item-details">
                <span>${item.quantity} x ${item.originalPrice.toLocaleString('id-ID')}</span>
                <span>Rp ${itemTotal.toLocaleString('id-ID')}</span>
              </div>
              ${itemDiscount > 0 ? `
                <div class="item-details" style="color: #000; font-style: italic;">
                  <span>Diskon Item</span>
                  <span>-Rp ${itemDiscount.toLocaleString('id-ID')}</span>
                </div>
                <div class="item-details" style="color: #666; font-size: 8px; padding-left: 10px;">
                  <span>(Rp ${item.originalPrice.toLocaleString('id-ID')} - Rp ${(item.discount || 0).toLocaleString('id-ID')} = Rp ${(item.originalPrice - (item.discount || 0)).toLocaleString('id-ID')})</span>
                </div>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>
      <div class="hr-dotted"></div>
      <div class="summary-block">
        <div class="flex-row"><span>Total QTY : ${totalQty}</span></div>
        <div class="flex-row"><span>Sub Total</span><span>Rp ${data.subtotal.toLocaleString('id-ID')}</span></div>
        <div class="flex-row"><span>Diskon</span><span>Rp ${data.discount.toLocaleString('id-ID')}</span></div>
        ${data.serviceAmount > 0 ? `<div class="flex-row"><span>Service Charge</span><span>Rp ${data.serviceAmount.toLocaleString('id-ID')}</span></div>` : ''}
        ${data.taxAmount > 0 ? `<div class="flex-row"><span>Pajak</span><span>Rp ${data.taxAmount.toLocaleString('id-ID')}</span></div>` : ''}
        <div class="flex-row total-row"><span>Total</span><span>Rp ${data.total.toLocaleString('id-ID')}</span></div>
        
        ${parsedSplit ? `
          <div class="flex-row b" style="margin-top: 4px;"><span>Pembayaran Terpisah:</span></div>
          ${Object.entries(parsedSplit).filter(([_, val]) => Number(val) > 0).map(([method, val]) => `
            <div class="flex-row" style="padding-left: 10px;"><span>- ${PAYMENT_METHOD_MAP[method] || method}</span><span>Rp ${Number(val).toLocaleString('id-ID')}</span></div>
          `).join('')}
        ` : `
          <div class="flex-row"><span>Bayar (${PAYMENT_METHOD_MAP[paymentMethod] || paymentMethod})</span><span>Rp ${data.paidAmount.toLocaleString('id-ID')}</span></div>
        `}
        
        <div class="flex-row"><span>Kembali</span><span>Rp ${data.changeAmount.toLocaleString('id-ID')}</span></div>
      </div>
      
      ${data.pointsEarned > 0 || data.pointsRedeemed > 0 ? `
        <div class="hr-dotted"></div>
        <div class="tc font-bold" style="font-size: 8.5px;">
          ${data.pointsEarned > 0 ? `<div>Loyalti: +${data.pointsEarned} Poin</div>` : ''}
          ${data.pointsRedeemed > 0 ? `<div>Ditukar: -${data.pointsRedeemed} Poin</div>` : ''}
        </div>
      ` : ''}
 
      <div class="hr-dotted"></div>
      <div class="tc footer-block b">
        <div>${currentStore?.receiptFooter || 'Terimakasih Telah Berbelanja'}</div>
        
        ${currentStore?.receiptShowBarcode !== false ? `
          <div style="display: flex; flex-direction: column; align-items: center; gap: 2px; margin-top: 8px; opacity: 0.85;">
            <div style="height: 20px; width: 120px; background: repeating-linear-gradient(90deg, #000, #000 1px, transparent 1px, transparent 3px, #000 3px, #000 4px); margin: 0 auto;"></div>
            <span style="font-size: 7.5px; letter-spacing: 0.15em; font-weight: bold;">${data.invoice}</span>
          </div>
        ` : ''}
      </div>
      <script>
      window.onload = function() {
        window.print();
        setTimeout(function() { window.close(); }, 600);
      }
      </script>
      </body>
      </html>
    `)
    printWindow.document.close()
  }

  async function checkout() {
    if (cart.length === 0) return alert('Keranjang kosong')
    
    if (payment === 'CASH' && Number(paid || 0) < finalTotal) return alert('Uang yang dibayarkan kurang')
    if (payment === 'SPLIT') {
      const splitSum = Object.values(splitAmounts).reduce((a, b) => a + b, 0)
      if (splitSum < finalTotal) return alert('Jumlah pembayaran terbagi kurang dari total belanja')
    }
    if (orderType === 'DINEIN' && !selectedTableId) return alert('Silakan pilih meja untuk Dine In')
    if (submitting) return

    const storeId = localStorage.getItem('storeId')
    const token = localStorage.getItem('token')
    const cachedUser = JSON.parse(localStorage.getItem('user') || '{}')
    const finalStoreId = storeId || cashier?.storeId || cachedUser?.storeId
    const finalCashierId = cashier?.id || cachedUser?.id

    if (!finalStoreId || !finalCashierId)
      return alert('Autentikasi gagal. Silakan login kembali.')

    // Explode bundles inside checkout cart items payload
    const finalItemsPayload: any[] = []
    cart.forEach(item => {
      if ((item as any).isBundle) {
        const bundle = item as any
        const storedBundlesStr = localStorage.getItem(`store_product_bundles_${finalStoreId}`)
        let storedBundle = null
        if (storedBundlesStr) {
          try {
            const storedBundles = JSON.parse(storedBundlesStr)
            storedBundle = storedBundles.find((b: any) => b.id === bundle.id)
          } catch (e) {}
        }
        
        const productsListStr = localStorage.getItem('cached_products') || '[]'
        let productsList: any[] = []
        try { productsList = JSON.parse(productsListStr) } catch(e) {}

        const innerProducts = storedBundle?.products || bundle.products || []
        
        let retailSum = 0
        innerProducts.forEach((part: any) => {
          const prod = productsList.find(p => p.id === part.productId)
          retailSum += ((prod?.sellingPrice || 0) * part.qty)
        })
        
        const discountRatio = retailSum > 0 ? (bundle.sellingPrice / retailSum) : 1
        
        innerProducts.forEach((part: any) => {
          const originalProd = productsList.find(p => p.id === part.productId)
          if (originalProd) {
            const partQty = part.qty * bundle.qty
            const unitPrice = originalProd.sellingPrice
            const discountedUnitPrice = Math.round(unitPrice * discountRatio)
            const cashierDiscountPerUnit = Math.max(0, unitPrice - discountedUnitPrice)
            
            finalItemsPayload.push({
              productId: originalProd.id,
              quantity: partQty,
              cashierDiscount: cashierDiscountPerUnit,
              originalPrice: unitPrice
            })
          }
        })
      } else {
        finalItemsPayload.push({
          productId: item.id,
          quantity: Math.round(Number(item.qty)),
          cashierDiscount: Math.round(Number(item.cashierDiscount)),
          originalPrice: item.sellingPrice
        })
      }
    })

    // Group items by productId to merge duplicates
    const groupedItems: Record<string, { quantity: number; totalDiscount: number; originalPrice: number }> = {}
    finalItemsPayload.forEach(item => {
      if (!groupedItems[item.productId]) {
        groupedItems[item.productId] = { quantity: 0, totalDiscount: 0, originalPrice: item.originalPrice }
      }
      groupedItems[item.productId].quantity += item.quantity
      groupedItems[item.productId].totalDiscount += item.cashierDiscount * item.quantity
    })
    
    const itemsPayload = Object.entries(groupedItems).map(([productId, data]) => {
      const unitDiscount = Math.round(data.totalDiscount / data.quantity)
      return {
        productId,
        quantity: data.quantity,
        cashierDiscount: unitDiscount
      }
    })

    const originalSubtotal = Object.values(groupedItems).reduce((sum, item) => sum + (item.originalPrice * item.quantity), 0)
    const itemDiscountsSum = Object.values(groupedItems).reduce((sum, item) => sum + (item.totalDiscount), 0)
    const computedTotalDiscount = itemDiscountsSum + globalCalculatedDiscount

    const payload = {
      storeId: String(finalStoreId),
      cashierId: String(finalCashierId),
      paymentMethod: payment,
      paidAmount: payment === 'CASH' ? Math.round(Number(paid)) : (payment === 'SPLIT' ? Math.round(Object.values(splitAmounts).reduce((a, b) => a + b, 0)) : Math.round(finalTotal)),
      subtotal: Math.round(originalSubtotal),
      totalDiscount: Math.round(computedTotalDiscount),
      total: Math.round(finalTotal),
      phone: isCustomerMode && customerPhone.trim() ? customerPhone.trim() : undefined,
      customerName: isCustomerMode && customerName.trim() ? customerName.trim() : undefined,
      saveCustomer: isCustomerMode ? saveCustomer : false,
      orderType,
      tableId: orderType === 'DINEIN' ? selectedTableId : undefined,
      taxAmount: Math.round(ppnAmount),
      serviceAmount: Math.round(serviceAmount),
      splitPayments: payment === 'SPLIT' ? splitAmounts : undefined,
      pointsRedeemed: isRedeemingPoints ? pointsToRedeem : undefined,
      items: itemsPayload
    }

    const isOffline = typeof navigator !== 'undefined' ? !navigator.onLine : false

    const processOfflineCheckout = () => {
      const timestamp = Date.now()
      const invoice = `INV-OFFLINE-${timestamp}`
      
      const mockReceipt = {
        invoice,
        createdAt: new Date().toISOString(),
        store: currentStore?.name || 'Outlet Utama',
        customer: isCustomerMode && customerName.trim() ? customerName.trim() : '-',
        cashier: cashier?.name || 'Kasir',
        subtotal: Math.round(originalSubtotal),
        discount: Math.round(computedTotalDiscount),
        serviceAmount: Math.round(serviceAmount),
        taxAmount: Math.round(ppnAmount),
        total: Math.round(finalTotal),
        paidAmount: payload.paidAmount,
        changeAmount: Math.max(0, payload.paidAmount - Math.round(finalTotal)),
        pointsEarned: 0,
        pointsRedeemed: isRedeemingPoints ? pointsToRedeem : 0,
        splitPayments: payment === 'SPLIT' ? splitAmounts : undefined,
        items: Object.entries(groupedItems).map(([productId, data]) => {
          const prodObj = products.find(p => p.id === productId)
          return {
            product: prodObj ? prodObj.name : 'Produk Tidak Dikenal',
            quantity: data.quantity,
            originalPrice: data.originalPrice,
            discount: Math.round(data.totalDiscount / data.quantity)
          }
        })
      }

      const existingTxStr = localStorage.getItem('offlineTransactions') || '[]'
      let existingTx = []
      try {
        existingTx = JSON.parse(existingTxStr)
        if (!Array.isArray(existingTx)) existingTx = []
      } catch {
        existingTx = []
      }
      
      existingTx.push({
        id: invoice,
        payload,
        receipt: mockReceipt
      })
      localStorage.setItem('offlineTransactions', JSON.stringify(existingTx))

      setReceiptData(mockReceipt)
      setIsOpenReceipt(true)
      autoPrintReceipt(mockReceipt, payment)

      toast.warning('Transaksi Berhasil Disimpan Offline', {
        description: `Invoice: ${invoice}. Data akan disinkronisasikan otomatis saat jaringan aktif.`,
        duration: 5000
      })
    }

    if (isOffline) {
      processOfflineCheckout()
      return
    }

    try {
      setSubmitting(true)
      const res = await api.post('/transactions', payload, {
        headers: { Authorization: `Bearer ${token}` }
      })

      const receiptRes = await api.get(`/transactions/${res.data.id}/receipt`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      const data = receiptRes.data
      setReceiptData(data)
      setIsOpenReceipt(true)
      autoPrintReceipt(data, payment)

    } catch (err: any) {
      console.warn('Checkout error:', err?.message || err)
      const isNetworkError = !err.response || err.message === 'Network Error' || err.code === 'ERR_NETWORK'
      if (isNetworkError) {
        processOfflineCheckout()
      } else {
        alert(err.response?.data?.message || 'Transaksi gagal')
      }
    } finally {
      setSubmitting(false)
    }
  }

  function handleResetPos() {
    setCart([])
    setPaid('')
    setGlobalDiscountValue(0)
    setIsPPN(false)
    setIsCustomerMode(false)
    setCustomerName('')
    setCustomerPhone('')
    setSaveCustomer(false)
    setIsOpenReceipt(false)
    setReceiptData(null)
    setMobileView('catalog')
    setCategoryFilter(null)
    setSearch('')
    setCheckoutStep('cart')
    
    
    setOrderType('TAKEAWAY')
    setSelectedTableId('')
    setCustomerPoints(0)
    setCustomerTier('BRONZE')
    setIsRedeemingPoints(false)
    setSplitAmounts({ CASH: 0, QRIS: 0, DEBIT: 0 })
    
    loadData()
  }

  function handlePrintReceipt() {
    if (receiptData) autoPrintReceipt(receiptData, payment)
  }

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    products.forEach(p => {
      if (p.isActive === false) return
      if (p.categoryId) {
        counts[p.categoryId] = (counts[p.categoryId] || 0) + 1
      }
    })
    return counts
  }, [products])

  const filtered = products.filter(x => {
    if (x.isActive === false) return false
    const matchSearch = x.name.toLowerCase().includes(search.toLowerCase()) ||
      (x.barcode && x.barcode.includes(search)) || 
      (x.sku && x.sku.toLowerCase().includes(search.toLowerCase()))
    const matchCat = categoryFilter
      ? (categoryFilter === 'all' || x.categoryId === categoryFilter)
      : true
    return matchSearch && matchCat
  })

  const getCategoryName = (catId: string) => {
    const cat = categories.find(c => c.id === catId)
    return cat ? cat.name : 'Lainnya'
  }

  const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`

  const paymentMethods = [
    { id: 'CASH', icon: Wallet, label: 'Tunai' },
    { id: 'QRIS', icon: QrCode, label: 'QRIS' },
    { id: 'DEBIT', icon: CreditCard, label: 'Debit' },
    { id: 'SPLIT', icon: Layers, label: 'Split' },
  ]

  return (
    <div className="grid gap-3 sm:gap-6 lg:grid-cols-[1fr_390px] flex-1 min-h-0 overflow-hidden relative">

      <div className={`flex flex-col h-full overflow-hidden space-y-3 sm:space-y-4 ${mobileView === 'catalog' ? 'flex' : 'hidden lg:flex'}`}>

        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex-1 flex items-center gap-3 bg-white border border-slate-200/80 px-4 py-3 rounded-2xl shadow-3xs relative overflow-hidden group transition-all duration-200 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100/50">
            <div className="laser-beam opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
            <Search size={15} className="text-slate-400 shrink-0 group-focus-within:text-indigo-600 transition-colors" />
            <input
              ref={searchInputRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari nama produk, SKU, atau scan... (F2)"
              className="w-full text-xs outline-none bg-transparent text-slate-800 placeholder:text-slate-400 font-semibold z-10"
            />
            <ScanLine size={15} className="text-rose-500 shrink-0 animate-pulse z-10" />
          </div>

          <button
            type="button"
            onClick={() => setMobileView('cart')}
            className="lg:hidden flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 shadow-3xs shrink-0 cursor-pointer relative"
          >
            <ShoppingCart size={16} className="text-slate-500" />
            {cart.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[9px] font-black h-5 w-5 rounded-full flex items-center justify-center border-2 border-white">
                {cart.reduce((sum, item) => sum + item.qty, 0)}
              </span>
            )}
          </button>
        </div>

        {(categoryFilter !== null || search.trim() !== '') && (
          <div className="flex flex-nowrap gap-1.5 flex-shrink-0 overflow-x-auto pb-1.5 scrollbar-none">
            <button
              onClick={() => {
                setCategoryFilter(null)
                setSearch('')
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-extrabold border bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 shadow-3xs"
            >
              <ArrowLeft size={13} className="shrink-0" />
              <span>Kategori</span>
            </button>
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all whitespace-nowrap cursor-pointer ${
                categoryFilter === 'all'
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-3xs'
                  : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}
            >
              Semua produk
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all whitespace-nowrap cursor-pointer ${
                  categoryFilter === cat.id
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-3xs'
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 content-start pb-24 sm:pb-6 scrollbar-thin auto-rows-max">
          {loading ? (
            Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="bg-white border border-slate-200/80 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-3xs flex flex-col gap-3 animate-pulse">
                <div className="w-full aspect-square rounded-lg sm:rounded-xl bg-slate-100 shrink-0" />
                <div className="space-y-2 flex-grow">
                  <div className="h-3 w-1/3 bg-slate-100 rounded-md" />
                  <div className="h-4 w-3/4 bg-slate-200 rounded-md" />
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3 w-1/2 bg-slate-200 rounded-md" />
                    <div className="h-3 w-1/3 bg-slate-100 rounded-md" />
                  </div>
                  <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg sm:rounded-xl bg-slate-200 shrink-0" />
                </div>
              </div>
            ))
          ) : categoryFilter === null && search.trim() === '' ? (
            <>
              
              <button
                type="button"
                onClick={() => setCategoryFilter('all')}
                className="group relative overflow-hidden bg-white border border-slate-200/80 rounded-2xl h-28 sm:h-32 p-4 sm:p-5 shadow-3xs flex flex-col justify-between items-start text-left hover:scale-[1.02] hover:-translate-y-0.5 hover:border-indigo-400 glow-violet transition-all duration-300 cursor-pointer active:scale-[0.98]"
              >
                <div className="absolute -right-6 -bottom-6 w-20 h-20 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500 opacity-20 bg-gradient-to-br from-indigo-500 to-purple-600"></div>
                <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl sm:rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform relative z-10">
                  <Sparkles size={18} className="shrink-0" />
                </div>
                <div className="relative z-10">
                  <h3 className="font-extrabold text-slate-800 text-xs sm:text-sm group-hover:text-indigo-600 transition-colors">Semua Produk</h3>
                  <p className="text-[10px] sm:text-xs text-slate-400 font-bold mt-1">{products.filter(p => p.isActive !== false).length} Produk</p>
                </div>
              </button>

              
              {categories.map((cat, idx) => {
                const { bg, hoverRing, glow, gradient } = getCategoryStyles(cat.name, idx)
                const Icon = getCategoryIcon(cat.name)
                const count = categoryCounts[cat.id] || 0
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryFilter(cat.id)}
                    className={`group relative overflow-hidden bg-white border border-slate-200/80 rounded-2xl h-28 sm:h-32 p-4 sm:p-5 shadow-3xs flex flex-col justify-between items-start text-left hover:scale-[1.02] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer active:scale-[0.98] ${hoverRing} ${glow}`}
                  >
                    <div className={`absolute -right-6 -bottom-6 w-20 h-20 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500 opacity-20 bg-gradient-to-br ${gradient}`}></div>
                    <div className={`h-10 w-10 sm:h-11 sm:w-11 rounded-xl sm:rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform relative z-10 ${bg}`}>
                      <Icon size={18} className="shrink-0" />
                    </div>
                    <div className="relative z-10">
                      <h3 className="font-extrabold text-slate-800 text-xs sm:text-sm group-hover:text-indigo-600 transition-colors line-clamp-1">{cat.name}</h3>
                      <p className="text-[10px] sm:text-xs text-slate-400 font-bold mt-1">{count} Produk</p>
                    </div>
                  </button>
                )
              })}
            </>
          ) : filtered.length === 0 ? (
            <div className="col-span-full py-24 text-center text-slate-500 border border-dashed border-slate-200 bg-white rounded-2xl text-xs font-bold">
              Produk tidak ditemukan
            </div>
          ) : (
            filtered.map(p => {
              const masterDiscount = getProductMasterDiscount(p)
              const discountedPrice = p.sellingPrice - masterDiscount
              const hasDiscount = masterDiscount > 0
              const outOfStock = p.stock <= 0
              const isLowStock = !outOfStock && p.stock <= 5

              return (
                <div
                  key={p.id}
                  onClick={() => { if (!outOfStock) addToCart(p) }}
                  className={`group bg-white border rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-3xs flex flex-col justify-between relative overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5 hover:shadow-sm cursor-pointer select-none ${
                    outOfStock 
                      ? 'opacity-60 border-slate-200 cursor-not-allowed' 
                      : 'border-slate-200/80 hover:border-indigo-400'
                  }`}
                >
                  <div className="w-full aspect-square relative overflow-hidden rounded-lg sm:rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                    {p.image ? (
                      <img src={p.image} alt={p.name} className="w-full h-full object-cover transition-transform duration-350 group-hover:scale-105" />
                    ) : (
                      <Package size={20} className="text-slate-350" />
                    )}
                    
                    <span className="absolute top-1.5 right-1.5 bg-indigo-50/90 text-indigo-700 text-[8px] sm:text-[8.5px] font-black px-1.5 sm:px-2 py-0.5 rounded-lg border border-indigo-150 leading-none backdrop-blur-xs">
                      {getCategoryName(p.categoryId || '')}
                    </span>

                    {hasDiscount && (
                      <span className="absolute top-1.5 left-1.5 bg-gradient-to-r from-rose-500 to-rose-600 text-white text-[8px] sm:text-[8.5px] font-black px-1.5 sm:px-2 py-0.5 rounded-lg shadow-3xs leading-none border border-rose-400/20">
                        PROMO
                      </span>
                    )}

                    {outOfStock && (
                      <div className="absolute inset-0 bg-white/70 flex items-center justify-center backdrop-blur-[1px]">
                        <span className="text-[10px] font-black text-rose-700 bg-white border border-rose-200 px-2.5 py-1 rounded-xl shadow-3xs">Habis</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-2.5 shrink-0">
                    <p className="text-[8px] sm:text-[8.5px] font-mono text-slate-500 uppercase tracking-widest font-semibold">{p.sku || '–'}</p>
                    <div className="h-8 sm:h-9 overflow-hidden mt-0.5">
                      <h3 className="font-extrabold text-slate-905 text-[11px] sm:text-xs line-clamp-2 leading-snug group-hover:text-indigo-650 transition-colors" title={p.name}>{p.name}</h3>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-end justify-between gap-1.5 shrink-0">
                    <div className="min-w-0 flex-1">
                      <span className="text-[11px] sm:text-xs font-black font-mono text-indigo-600 block truncate">{fmt(discountedPrice)}</span>
                      {hasDiscount ? (
                        <span className="block text-[8px] sm:text-[8.5px] text-slate-400 font-mono line-through mt-0.5 truncate">{fmt(p.sellingPrice)}</span>
                      ) : (
                        <span className="block text-[8px] sm:text-[8.5px] text-transparent font-mono mt-0.5 select-none">&nbsp;</span>
                      )}
                      <span className={`block text-[8.5px] sm:text-[9px] mt-1 sm:mt-1.5 font-bold truncate ${isLowStock ? 'text-rose-600' : 'text-slate-500'}`}>
                        Stok: {p.stock}
                      </span>
                    </div>
                    <div
                      className={`h-7 w-7 sm:h-8 sm:w-8 rounded-lg sm:rounded-xl flex items-center justify-center shadow-3xs transition-all shrink-0 ${
                        outOfStock
                          ? 'bg-slate-100 text-slate-400'
                          : 'bg-indigo-605 group-hover:bg-indigo-700 text-white group-hover:scale-105 active:scale-95'
                      }`}
                    >
                      <Plus size={13} />
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      <div className={`bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-3xs flex flex-col h-full overflow-hidden ${mobileView === 'cart' ? 'flex' : 'hidden lg:flex'}`}>

        <div className="border-b border-slate-100 pb-3 flex items-center justify-between flex-shrink-0 mb-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileView('catalog')}
              className="lg:hidden p-1.5 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors bg-white shrink-0 cursor-pointer"
            >
              <ArrowLeft size={14} />
            </button>
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ringkasan Pembayaran</h2>
          </div>
          <span className="text-[10px] font-bold text-slate-700 ">{cashier?.name || 'Kasir'}</span>
        </div>        
        <div className="flex-1 overflow-y-auto pr-0.5 space-y-3 mb-4 scrollbar-thin">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Item Dipilih</p>
          
          {cart.length === 0 ? (
            <div className="flex-1 min-h-[150px] border border-dashed border-slate-200 bg-slate-50/50 rounded-2xl flex flex-col items-center justify-center text-slate-400 text-xs gap-2 mt-1">
              <ShoppingCart size={22} className="text-slate-350" />
              <span className="font-bold">Keranjang masih kosong</span>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map(item => {
                const md = getProductMasterDiscount(item)
                const finalItemPrice = item.sellingPrice - md - item.cashierDiscount
                return (
                  <div key={item.id} className="border border-slate-150 bg-slate-50/40 p-3.5 rounded-xl space-y-2.5">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 truncate">{item.name}</p>
                        <p className="text-[10px] font-mono font-semibold text-slate-500 mt-1">{fmt(finalItemPrice)} / pcs</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="flex items-center border border-slate-200 rounded-lg bg-white p-0.5 shadow-3xs">
                          <button onClick={() => updateQty(item.id, -1)} className="p-1 bg-white border border-slate-200 rounded-md text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 cursor-pointer"><Minus size={10} /></button>
                          <span className="px-2 font-extrabold text-slate-800 text-xs w-6 text-center">{item.qty}</span>
                          <button onClick={() => updateQty(item.id, 1)} className="p-1 bg-white border border-slate-200 rounded-md text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-250/50 cursor-pointer"><Plus size={10} /></button>
                        </div>
                        <button onClick={() => removeFromCart(item.id)} className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3 bg-white border border-slate-100 px-2.5 py-1 rounded-lg">
                      <span className="text-[9.5px] font-bold text-slate-400">Diskon kasir (Rp)</span>
                      <input
                        type="number"
                        min={0}
                        placeholder="0"
                        value={item.cashierDiscount || ''}
                        onChange={e => updateCashierDiscount(item.id, Number(e.target.value))}
                        className="w-24 bg-slate-50/50 border border-slate-200 rounded-lg px-2 py-0.5 text-right text-[10.5px] font-mono font-bold text-slate-800 outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex-shrink-0 space-y-4 border-t border-slate-200 pt-4 bg-white">
          
          <div>
            {!isCustomerMode ? (
              <button type="button" onClick={() => setIsCustomerMode(true)} className="inline-flex items-center gap-1.5 text-[10px] text-slate-400 hover:text-slate-700 transition-colors cursor-pointer font-bold">
                <UserPlus size={12} /> Tambah data pelanggan
              </button>
            ) : (
              <div className="space-y-2.5 bg-slate-50/50 border border-slate-200 rounded-2xl p-3.5 animate-in slide-in-from-bottom-2 duration-150">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Member Pelanggan</span>
                  <button type="button" onClick={() => setIsCustomerMode(false)} className="cursor-pointer text-slate-400 hover:text-slate-600"><X size={13} /></button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <input type="text" placeholder="No. HP" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono outline-none focus:border-indigo-500 text-slate-800 font-semibold" />
                    {searchingCustomer && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-slate-400" />}
                  </div>
                  <input type="text" placeholder="Nama" value={customerName} onChange={e => setCustomerName(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-indigo-500 text-slate-800 font-semibold" />
                </div>
                <label className="flex items-center gap-1.5 text-[10px] text-slate-500 cursor-pointer font-semibold">
                  <input type="checkbox" checked={saveCustomer} onChange={e => setSaveCustomer(e.target.checked)}
                    className="rounded border-slate-300 h-3.5 w-3.5 text-indigo-600 cursor-pointer" />
                  Daftarkan sebagai member baru
                </label>

                {!saveCustomer && customerPhone.trim().length >= 10 && currentStore?.pointsEnabled !== false && (
                  <div className="text-[10px] font-bold text-slate-650 flex flex-col gap-1 border-t border-slate-200/60 pt-2 mt-1">
                    <div className="flex justify-between">
                      <span>Tier Member: <span className="text-indigo-600 font-black">{customerTier}</span></span>
                      <span>Poin Aktif: <span className="text-indigo-600 font-black">{customerPoints}</span></span>
                    </div>
                    {customerPoints > 0 && (
                      <label className="flex items-center gap-1.5 text-slate-650 cursor-pointer mt-1">
                        <input
                          type="checkbox"
                          checked={isRedeemingPoints}
                          onChange={e => {
                            setIsRedeemingPoints(e.target.checked)
                          }}
                          className="rounded border-slate-300 h-3.5 w-3.5 text-indigo-600 cursor-pointer"
                        />
                        <span>Tukarkan Poin (Potongan {fmt(Math.min(customerPoints * (currentStore?.pointValue || 1000), rawSubtotal - globalCalculatedDiscount))})</span>
                      </label>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-3">

            <div className="flex justify-between text-xs text-slate-500 font-bold">
              <span>Sub total</span>
              <span className="font-mono text-slate-900">{fmt(rawSubtotal)}</span>
            </div>

            {pointsDiscount > 0 && (
              <div className="flex justify-between text-xs text-rose-500 font-bold">
                <span>Loyalti Poin</span>
                <span className="font-mono">-{fmt(pointsDiscount)}</span>
              </div>
            )}

            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Diskon Transaksi (F7)</span>
              <div className="flex rounded-xl border border-slate-200 overflow-hidden bg-white">
                <select
                  value={globalDiscountType}
                  onChange={e => setGlobalDiscountType(e.target.value as 'PERCENT' | 'FIXED')}
                  className="bg-slate-50 border-r border-slate-200 px-2.5 py-2 text-xs font-bold outline-none text-slate-700 cursor-pointer"
                >
                  <option value="PERCENT">%</option>
                  <option value="FIXED">Rp</option>
                </select>
                <input
                  ref={discountInputRef}
                  type="number" min={0} placeholder="0"
                  value={globalDiscountValue || ''}
                  onChange={e => setGlobalDiscountValue(Number(e.target.value))}
                  className="flex-1 px-3 py-2 text-xs font-mono font-bold outline-none text-right text-slate-800"
                />
              </div>
            </div>
            {globalCalculatedDiscount > 0 && (
              <div className="flex justify-between text-xs text-rose-500 font-bold pt-1.5">
                <span>Diskon Transaksi</span>
                <span className="font-mono">-{fmt(globalCalculatedDiscount)}</span>
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 pt-3 space-y-3">
            <div className="flex justify-between items-center px-1">
              <span className="text-xs text-slate-400 font-extrabold uppercase tracking-wide">Estimasi Total</span>
              <span className="text-base font-black font-mono text-indigo-600">{fmt(finalTotal)}</span>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  if (cart.length === 0) return alert('Keranjang kosong')
                  setCheckoutStep('payment')
                }}
                className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 text-xs font-bold flex items-center justify-center gap-2 shadow-indigo-500/10 transition-all cursor-pointer"
              >
                <span>Lanjutkan ke Pembayaran</span>
                <ArrowRight size={13} />
              </button>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={() => { if (confirm('Hapus semua item dari keranjang?')) { setCart([]); setPaid(''); setCheckoutStep('cart') } }}
                  className="w-full rounded-xl border border-slate-200 text-slate-400 hover:text-slate-600 py-2 text-xs hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Hapus keranjang
                </button>
              )}
            </div>
          </div>

        </div>
      </div>

      {isOpenReceipt && receiptData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-all animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl border border-slate-150 bg-white p-6 shadow-xl space-y-4 animate-in zoom-in-95 duration-150 relative overflow-hidden">
            
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="h-11 w-11 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 border border-emerald-200 shadow-3xs animate-bounce">
                <CheckCircle2 size={22} />
              </div>
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Transaksi Berhasil</h3>
              <p className="text-xs font-black text-slate-800 font-mono tracking-tight">{receiptData.invoice}</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 font-mono text-[10px] text-slate-800 space-y-3 shadow-3xs max-h-[280px] overflow-y-auto scrollbar-thin">
              <svg className="w-9 h-9 mx-auto text-slate-800" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21.9 8.89l-1.05-4.37c-.22-.9-1-1.52-1.91-1.52H5.05c-.9 0-1.69.63-1.9 1.52L2.1 8.89c-.24.97.26 1.96 1.2 2.32c.12.04.24.07.37.08v7.71c0 .99.81 1.8 1.8 1.8h13c.99 0 1.8-.81 1.8-1.8v-7.71c.13-.01.25-.04.37-.08c.95-.36 1.45-1.35 1.21-2.32zM13 18H8v-4h5v4z"/>
              </svg>

              <div className="text-center space-y-0.5">
                <p className="font-bold text-xs text-slate-900 uppercase">{receiptData.store}</p>
                <p className="text-[8.5px] leading-snug">{currentStore?.address || 'Jl. Dr. Ir. H. Soekarno No.19, Medokan Semampir Surabaya'}</p>
                <p className="text-[8.5px]">No. Telp {currentStore?.phone || '0812345678'}</p>
                <p className="text-[8.5px] font-bold mt-1.5">{getReceiptUniqueCode(receiptData.invoice, receiptData.createdAt)}</p>
              </div>

              <div className="border-t border-dotted border-slate-400 my-1"></div>

              <div className="text-[8.5px] leading-tight flex justify-between">
                <div>
                  <p>{formatDate(receiptData.createdAt)}</p>
                  <p>{formatTime(receiptData.createdAt)}</p>
                  <p className="font-bold">No. {receiptData.invoice}</p>
                </div>
                <div className="text-right">
                  <p>{receiptData.customer || '-'}</p>
                  <p>{receiptData.cashier}</p>
                  <p>{currentStore?.address?.split(',').slice(-1)[0]?.trim() || 'Sby'}</p>
                </div>
              </div>

              <div className="border-t border-dashed border-slate-400 my-1"></div>

              <div className="space-y-2">
                {receiptData.items.map((item: any, idx: number) => {
                  const itemDiscount = (item.discount || 0) * item.quantity
                  const itemTotal = item.originalPrice * item.quantity
                  return (
                    <div key={idx} className="space-y-0.5 text-[9.5px]">
                      <p className="font-bold text-slate-900">{idx + 1}. {item.product}</p>
                      <div className="flex justify-between pl-2.5 text-slate-600">
                        <span>{item.quantity} x {item.originalPrice.toLocaleString('id-ID')}</span>
                        <span className="font-semibold text-slate-800">Rp {itemTotal.toLocaleString('id-ID')}</span>
                      </div>
                      {itemDiscount > 0 && (
                        <>
                          <div className="flex justify-between pl-2.5 text-rose-500 italic">
                            <span>Diskon Item</span>
                            <span>-Rp {itemDiscount.toLocaleString('id-ID')}</span>
                          </div>
                          <div className="pl-2.5 text-[8.5px] text-slate-400 font-medium font-sans">
                            (Rp {item.originalPrice.toLocaleString('id-ID')} - Rp {(item.discount || 0).toLocaleString('id-ID')} = Rp {(item.originalPrice - (item.discount || 0)).toLocaleString('id-ID')})
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="border-t border-dotted border-slate-400 my-1"></div>

              <div className="space-y-1 text-[9px] text-slate-600 border-t border-dashed border-slate-200 pt-2">
                <div className="flex justify-between"><span>Total QTY : {receiptData.items.reduce((s: number, i: any) => s + i.quantity, 0)}</span></div>
                <div className="flex justify-between"><span>Sub Total</span><span>Rp {receiptData.subtotal.toLocaleString('id-ID')}</span></div>
                <div className="flex justify-between"><span>Diskon</span><span>Rp {receiptData.discount.toLocaleString('id-ID')}</span></div>
                {receiptData.serviceAmount > 0 && (
                  <div className="flex justify-between"><span>Service Charge</span><span>Rp {receiptData.serviceAmount.toLocaleString('id-ID')}</span></div>
                )}
                {receiptData.taxAmount > 0 && (
                  <div className="flex justify-between"><span>Pajak PPN</span><span>Rp {receiptData.taxAmount.toLocaleString('id-ID')}</span></div>
                )}
                <div className="flex justify-between font-bold text-slate-950 text-xs border-t border-dashed border-slate-300 pt-1.5">
                  <span>Total</span><span>Rp {receiptData.total.toLocaleString('id-ID')}</span>
                </div>
                {receiptData.splitPayments ? (
                  <>
                    <div className="flex justify-between font-bold text-slate-800 mt-1"><span>Pembayaran:</span></div>
                    {Object.entries(receiptData.splitPayments).filter(([_, val]) => Number(val) > 0).map(([method, val]) => (
                      <div key={method} className="flex justify-between pl-2.5">
                        <span>- {PAYMENT_METHOD_MAP[method] || method}</span>
                        <span>Rp {Number(val).toLocaleString('id-ID')}</span>
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="flex justify-between"><span>Bayar ({PAYMENT_METHOD_MAP[payment] || payment})</span><span>Rp {receiptData.paidAmount.toLocaleString('id-ID')}</span></div>
                )}
                <div className="flex justify-between font-bold text-slate-950"><span>Kembali</span><span>Rp {receiptData.changeAmount.toLocaleString('id-ID')}</span></div>
              </div>

              <div className="border-t border-dotted border-slate-400 my-1"></div>

              <div className="text-center space-y-0.5 text-[8px] font-bold text-slate-900 pt-1">
                <p>{currentStore?.receiptFooter || 'Terimakasih Telah Berbelanja'}</p>
                <div className="w-24 h-4 bg-slate-200 mx-auto mt-2"></div>
              </div>
            </div>

            <div className="text-[9px] text-slate-400 text-center font-bold tracking-wide">
              Struk dicetak otomatis melalui printer thermal
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={handlePrintReceipt}
                className="rounded-xl border border-indigo-600 hover:bg-indigo-50/50 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-indigo-600"
              >
                <Printer size={13} />
                Cetak Ulang
              </button>
              <button
                type="button"
                onClick={handleResetPos}
                className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-indigo-500/10 active:scale-97"
              >
                Order Baru
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>
      )}

      {cart.length > 0 && mobileView === 'catalog' && (
        <div className="lg:hidden fixed bottom-6 left-6 right-6 z-30 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <button
            onClick={() => setMobileView('cart')}
            className="w-full bg-indigo-600 text-white rounded-xl py-3.5 px-4 shadow-lg shadow-indigo-500/30 flex items-center justify-between font-bold text-xs hover:bg-indigo-700 transition-colors cursor-pointer active:scale-[0.99]"
          >
            <span className="flex items-center gap-2">
              <ShoppingCart size={15} />
              <span>{cart.reduce((sum, item) => sum + item.qty, 0)} item</span>
            </span>
            <span className="flex items-center gap-1">
              <span>{fmt(finalTotal)}</span>
              <ArrowRight size={13} />
            </span>
          </button>
        </div>
      )}

      {checkoutStep === 'payment' && (
        <div className="fixed inset-0 z-45 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200 select-none">
          <div className="w-full max-w-4xl h-[90vh] bg-white rounded-3xl border border-slate-200/80 shadow-2xl flex flex-col md:flex-row overflow-hidden animate-in zoom-in-95 duration-250">
            
            
            <div className="flex-1 p-6 flex flex-col overflow-hidden bg-slate-50/50">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <div>
                  <h3 className="text-sm font-black text-slate-950 uppercase tracking-wider">Rincian Belanja Nota</h3>
                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">Daftar item belanjaan yang akan dibayar</p>
                </div>
                <span className="text-[10px] font-extrabold bg-indigo-50 border border-indigo-150 text-indigo-750 px-2.5 py-1 rounded-lg">
                  {cart.reduce((sum, item) => sum + item.qty, 0)} Item
                </span>
              </div>

              <div className="flex-grow overflow-y-auto mt-4 pr-1 scrollbar-thin">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[9px] pb-2">
                      <th className="pb-2">Produk</th>
                      <th className="pb-2 text-center">Qty</th>
                      <th className="pb-2 text-right">Harga Satuan</th>
                      <th className="pb-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-600">
                    {cart.map((item, idx) => {
                      const md = getProductMasterDiscount(item)
                      const finalItemPrice = Math.max(0, item.sellingPrice - md - item.cashierDiscount)
                      const itemDiscount = (md + item.cashierDiscount) * item.qty
                      const itemTotal = item.sellingPrice * item.qty
                      return (
                        <tr key={item.id} className="align-middle">
                          <td className="py-3">
                            <div className="font-extrabold text-slate-900">{idx + 1}. {item.name}</div>
                            {itemDiscount > 0 && (
                              <div className="text-[9px] text-rose-500 italic mt-0.5">Promo/Diskon: -{fmt(itemDiscount)}</div>
                            )}
                          </td>
                          <td className="py-3 text-center font-mono font-bold text-slate-800">{item.qty} Pcs</td>
                          <td className="py-3 text-right font-mono text-slate-500">{fmt(item.sellingPrice)}</td>
                          <td className="py-3 text-right font-mono font-black text-slate-900">{fmt(finalItemPrice * item.qty)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              
              <div className="bg-indigo-50/30 border border-indigo-100/50 rounded-xl p-3.5 mt-4 text-[10px] text-indigo-700 font-bold flex items-start gap-2 shrink-0">
                <Sparkles size={14} className="shrink-0 mt-0.5" />
                <span>Pastikan semua kuantitas barang sesuai sebelum menekan tombol Bayar. Gunakan tombol &quot;Kembali &amp; Edit&quot; jika ada revisi belanja.</span>
              </div>
            </div>

            
            <div className="w-full md:w-[380px] border-t md:border-t-0 md:border-l border-slate-200 p-6 flex flex-col justify-between overflow-y-auto scrollbar-thin bg-white">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Detail Pembayaran</span>
                  <button 
                    type="button" 
                    onClick={() => setCheckoutStep('cart')}
                    className="text-[10px] font-extrabold text-indigo-650 hover:underline cursor-pointer"
                  >
                    &larr; Kembali & Edit
                  </button>
                </div>

                
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between font-bold text-slate-500">
                    <span>Sub total</span>
                    <span className="font-mono text-slate-900">{fmt(rawSubtotal)}</span>
                  </div>
                  {discountTotal > 0 && (
                    <div className="flex justify-between font-bold text-rose-500">
                      <span>Total Diskon</span>
                      <span className="font-mono">-{fmt(discountTotal)}</span>
                    </div>
                  )}
                  {orderType === 'DINEIN' && serviceAmount > 0 && (
                    <div className="flex justify-between font-bold text-slate-500">
                      <span>Service Charge ({servicePercent}%)</span>
                      <span className="font-mono text-slate-950">{fmt(serviceAmount)}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between font-bold text-slate-500">
                    <span>Pajak PPN ({taxPercent}%)</span>
                    <div className="flex items-center gap-3">
                      {isPPN && <span className="font-mono text-slate-700 text-xs">{fmt(ppnAmount)}</span>}
                      <button
                        type="button"
                        onClick={() => setIsPPN(!isPPN)}
                        className={`relative inline-flex h-5 w-9 cursor-pointer rounded-full transition-colors duration-200 ${
                          isPPN ? 'bg-indigo-600' : 'bg-slate-200'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 mt-0.5 transform rounded-full bg-white transition duration-200 shadow-xs ${
                          isPPN ? 'translate-x-4.5' : 'translate-x-0.5'
                        }`} />
                      </button>
                    </div>
                  </div>

                  {customerName && (
                    <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-150 text-[10px] font-bold text-slate-500 flex justify-between">
                      <span>Pelanggan: <span className="text-slate-800 font-extrabold">{customerName}</span></span>
                      <span>Tier: <span className="text-indigo-600 font-extrabold">{customerTier}</span></span>
                    </div>
                  )}
                </div>

                <div className="h-px bg-slate-100" />

                
                <div className="space-y-1.5">
                  <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-widest block">Metode Pembayaran</span>
                  <div className="grid grid-cols-3 gap-2">
                    {paymentMethods.map(m => {
                      const Icon = m.icon
                      const active = payment === m.id
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setPayment(m.id as PaymentMethod)}
                          className={`flex flex-col items-center justify-center gap-1.5 py-2 border rounded-xl text-[10.5px] font-extrabold transition-all cursor-pointer ${
                            active
                              ? 'border-indigo-500 bg-indigo-50/40 text-indigo-650 shadow-3xs'
                              : 'border-slate-200 bg-white text-slate-500 hover:border-slate-350'
                          }`}
                        >
                          <Icon size={14} className="shrink-0" />
                          <span>{m.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                
                {payment === 'CASH' && (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-3xs space-y-2.5 font-mono text-xs animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <span className="font-sans font-bold text-slate-500 text-xs">Uang Diterima</span>
                      <div className="relative w-1/2 flex items-center justify-end">
                        <input
                          type="number"
                          placeholder="0"
                          value={paid}
                          onChange={e => setPaid(e.target.value === '' ? '' : Number(e.target.value))}
                          className="bg-transparent font-bold text-slate-900 outline-none text-right w-full border-b border-slate-200 focus:border-indigo-500 pb-0.5 text-sm"
                          autoFocus
                        />
                      </div>
                    </div>
                    {shortage > 0 ? (
                      <div className="flex justify-between items-center border-t border-slate-100 pt-2 text-rose-600">
                        <span className="font-sans font-bold text-[9px] uppercase">Uang Kurang</span>
                        <span className="font-bold text-sm">{fmt(shortage)}</span>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center border-t border-slate-100 pt-2">
                        <span className="font-sans font-bold text-slate-400 text-[9px] uppercase">Kembalian</span>
                        <span className={`font-bold text-sm ${change > 0 ? 'text-emerald-600' : 'text-slate-650'}`}>{fmt(change)}</span>
                      </div>
                    )}
                  </div>
                )}

                {payment === 'SPLIT' && (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-3xs space-y-2.5 font-mono text-xs animate-in fade-in duration-150">
                    <span className="font-sans font-bold text-slate-500 text-[9px] uppercase block mb-1">Rincian Split Payment</span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[8px] font-sans font-extrabold uppercase text-slate-400 mb-0.5">Tunai (Rp)</label>
                        <input
                          type="number"
                          placeholder="0"
                          value={splitAmounts.CASH || ''}
                          onChange={e => setSplitAmounts({ ...splitAmounts, CASH: Number(e.target.value) })}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[10px] outline-none text-right font-bold text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[8px] font-sans font-extrabold uppercase text-slate-400 mb-0.5">QRIS (Rp)</label>
                        <input
                          type="number"
                          placeholder="0"
                          value={splitAmounts.QRIS || ''}
                          onChange={e => setSplitAmounts({ ...splitAmounts, QRIS: Number(e.target.value) })}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[10px] outline-none text-right font-bold text-slate-800"
                        />
                      </div>
                    </div>
                    <div className="flex justify-between items-center border-t border-slate-100 pt-2">
                      <span className="font-sans font-bold text-slate-455 text-[9px] uppercase">Total Dibayar</span>
                      <span className="font-bold text-xs text-slate-850">
                        {fmt(Object.values(splitAmounts).reduce((a, b) => a + b, 0))}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[9px]">
                      <span className="font-sans font-bold text-slate-455 uppercase">Sisa Tagihan</span>
                      <span className={`font-bold ${
                        Object.values(splitAmounts).reduce((a, b) => a + b, 0) >= finalTotal ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {fmt(Math.max(0, finalTotal - Object.values(splitAmounts).reduce((a, b) => a + b, 0)))}
                      </span>
                    </div>
                  </div>
                )}

                {(payment === 'QRIS' || payment === 'DEBIT') && (
                  <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-150 rounded-xl px-3.5 py-2.5 text-[10px] text-emerald-750 font-bold shadow-3xs leading-none animate-in fade-in duration-150">
                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                    <span>Pembayaran pas &mdash; tidak ada kembalian</span>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex justify-between items-center px-1">
                  <span className="text-xs text-slate-400 font-extrabold uppercase tracking-wide">Total Pembayaran</span>
                  <span className="text-xl font-black font-mono text-indigo-600">{fmt(finalTotal)}</span>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCheckoutStep('cart')}
                    className="flex-1 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 py-3.5 text-xs font-bold transition-all cursor-pointer active:scale-97"
                  >
                    Batal
                  </button>
                  <button
                    onClick={checkout}
                    disabled={submitting}
                    className="flex-[2.5] rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-40 shadow-indigo-500/10 transition-all cursor-pointer active:scale-97"
                  >
                    {submitting ? (
                      <Loader2 className="animate-spin text-white" size={14} />
                    ) : (
                      <><span>Bayar Sekarang</span><ArrowRight size={13} /></>
                    )}
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}

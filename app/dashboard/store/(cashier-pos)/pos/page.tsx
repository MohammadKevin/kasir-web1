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
  CheckCircle2
} from 'lucide-react'
import { api } from '@/lib/api'

type Product = {
  categoryId: string
  id: string
  name: string
  image?: string
  barcode: string
  sellingPrice: number
  stock: number
  sku: string
  discountProduct?: {
    discount: {
      type: 'PERCENTAGE' | 'FIXED'
      value: number
      isActive: boolean
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

type PaymentMethod = 'CASH' | 'QRIS' | 'DEBIT' | 'TRANSFER' | 'CREDIT'

export default function PosPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [payment, setPayment] = useState<PaymentMethod>('CASH')
  const [paid, setPaid] = useState<number | ''>('')
  const [cashier, setCashier] = useState<any>(null)

  const [isPPN, setIsPPN] = useState(false)
  const [globalDiscountType, setGlobalDiscountType] = useState<'PERCENT' | 'FIXED'>('PERCENT')
  const [globalDiscountValue, setGlobalDiscountValue] = useState(0)

  const [isCustomerMode, setIsCustomerMode] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [saveCustomer, setSaveCustomer] = useState(false)
  const [searchingCustomer, setSearchingCustomer] = useState(false)

  const [receiptData, setReceiptData] = useState<any>(null)
  const [isOpenReceipt, setIsOpenReceipt] = useState(false)

  const barcodeBuffer = useRef<string>('')
  const lastKeyTime = useRef<number>(0)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('cashier')
      if (cached) setCashier(JSON.parse(cached))
    }
    loadData()
  }, [])

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const currentTime = Date.now()
      if (currentTime - lastKeyTime.current > 50) {
        barcodeBuffer.current = ''
      }
      lastKeyTime.current = currentTime

      if (e.key === 'Enter') {
        if (barcodeBuffer.current.trim().length > 2) {
          const target = products.find(p => p.barcode === barcodeBuffer.current.trim() || p.sku === barcodeBuffer.current.trim())
          if (target) {
            addToCart(target)
          }
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

  async function loadData() {
    try {
      setLoading(true)
      const storeId = localStorage.getItem('storeId')
      const token = localStorage.getItem('token')
      const headers = { Authorization: `Bearer ${token}` }

      // Fetch produk & kategori secara paralel dari backend
      const [productsRes, categoriesRes] = await Promise.all([
        api.get(`/products/store/${storeId}`, { headers }),
        api.get(`/categories/store/${storeId}`, { headers })
      ])

      setProducts(productsRes.data || [])
      setCategories(categoriesRes.data || [])
    } catch (err) {
      console.error('Gagal memuat data master POS:', err)
    } finally {
      setLoading(false)
    }
  }

  async function searchCustomerByPhone(phone: string) {
    try {
      setSearchingCustomer(true)
      const token = localStorage.getItem('token')
      const res = await api.get(`/customers/phone/${phone}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.data) {
        setCustomerName(res.data.name)
        setSaveCustomer(false)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSearchingCustomer(false)
    }
  }

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (customerPhone.trim().length >= 10) {
        searchCustomerByPhone(customerPhone.trim())
      }
    }, 800)
    return () => clearTimeout(delayDebounce)
  }, [customerPhone])

  function getProductMasterDiscount(p: Product): number {
    if (!p.discountProduct || p.discountProduct.length === 0) return 0
    const activeDiscount = p.discountProduct.find(d => d.discount?.isActive)
    if (!activeDiscount) return 0

    if (activeDiscount.discount.type === 'PERCENTAGE') {
      return Math.floor((p.sellingPrice * activeDiscount.discount.value) / 100)
    }
    return activeDiscount.discount.value
  }

  function addToCart(p: Product) {
    if (p.stock <= 0) return alert('Stok item produk habis')
    setCart(prev => {
      const exist = prev.find(x => x.id === p.id)
      if (exist) {
        return prev.map(x =>
          x.id === p.id ? { ...x, qty: Math.min(x.qty + 1, p.stock) } : x
        )
      }
      return [...prev, { ...p, qty: 1, cashierDiscount: 0 }]
    })
  }

  function updateQty(id: string, delta: number) {
    setCart(old =>
      old.map(x => {
        if (x.id === id) {
          const newQty = x.qty + delta
          if (newQty <= 0) return null
          return { ...x, qty: Math.min(newQty, x.stock) }
        }
        return x
      }).filter(Boolean) as CartItem[]
    )
  }

  function updateCashierDiscount(id: string, value: number) {
    setCart(old =>
      old.map(x => {
        if (x.id === id) {
          const masterDiscount = getProductMasterDiscount(x)
          const maxAllowedDiscount = x.sellingPrice - masterDiscount
          const finalDiscount = Math.min(Math.max(0, value), maxAllowedDiscount)
          return { ...x, cashierDiscount: finalDiscount }
        }
        return x
      })
    )
  }

  function removeFromCart(id: string) {
    setCart(prev => prev.filter(x => x.id !== id))
  }

  const rawSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      const masterDiscount = getProductMasterDiscount(item)
      const finalPrice = item.sellingPrice - masterDiscount - item.cashierDiscount
      return sum + (item.qty * finalPrice)
    }, 0)
  }, [cart])

  const globalCalculatedDiscount = useMemo(() => {
    return globalDiscountType === 'PERCENT' 
      ? Math.floor((rawSubtotal * globalDiscountValue) / 100) 
      : globalDiscountValue
  }, [rawSubtotal, globalDiscountType, globalDiscountValue])

  const ppnAmount = useMemo(() => {
    return isPPN ? Math.floor((rawSubtotal - globalCalculatedDiscount) * 0.11) : 0
  }, [isPPN, rawSubtotal, globalCalculatedDiscount])

  const finalTotal = useMemo(() => {
    return Math.max(0, rawSubtotal - globalCalculatedDiscount + ppnAmount)
  }, [rawSubtotal, globalCalculatedDiscount, ppnAmount])

  useEffect(() => {
    if (payment !== 'CASH') {
      setPaid(finalTotal)
    } else {
      setPaid('')
    }
  }, [payment, finalTotal])

  // PERBAIKAN: Jika bayar pakai QRIS/DEBIT, maka dipastikan tidak ada uang kembalian (0)
  const change = useMemo(() => {
    return payment === 'CASH' ? Math.max(0, Number(paid || 0) - finalTotal) : 0
  }, [paid, finalTotal, payment])

  async function checkout() {
    if (cart.length === 0) return alert('Keranjang belanja kosong')
    if (payment === 'CASH' && Number(paid || 0) < finalTotal) return alert('Uang yang dibayarkan kurang')

    const storeId = localStorage.getItem('storeId')
    const token = localStorage.getItem('token')
    const cachedUser = JSON.parse(localStorage.getItem('user') || '{}')
    
    const finalStoreId = storeId || cashier?.storeId || cachedUser?.storeId
    const finalCashierId = cashier?.id || cachedUser?.id

    if (!finalStoreId || !finalCashierId) {
      return alert('Otentikasi Toko/Kasir gagal. Sila muat ulang halaman POS atau login kembali.')
    }

    try {
      setSubmitting(true)

      const payload = {
        storeId: String(finalStoreId),
        cashierId: String(finalCashierId),
        paymentMethod: payment,
        paidAmount: Math.round(Number(paid)),
        phone: isCustomerMode && customerPhone.trim() ? customerPhone.trim() : undefined,
        customerName: isCustomerMode && customerName.trim() ? customerName.trim() : undefined,
        saveCustomer: isCustomerMode ? saveCustomer : false,
        items: cart.map(x => ({
          productId: x.id,
          quantity: Math.round(Number(x.qty)),
          cashierDiscount: Math.round(Number(x.cashierDiscount))
        }))
      }

      const res = await api.post('/transactions', payload, {
        headers: { Authorization: `Bearer ${token}` }
      })

      const receiptRes = await api.get(`/transactions/${res.data.id}/receipt`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      setReceiptData(receiptRes.data)
      setIsOpenReceipt(true)
    } catch (err: any) {
      alert(err.response?.data?.message || 'Proses pembuatan transaksi gagal')
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
    loadData()
  }

  function handlePrintReceipt() {
    if (!receiptData) return
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const totalQty = receiptData.items.reduce((sum: number, item: any) => sum + item.quantity, 0)

    printWindow.document.write(`
      <html>
        <head>
          <title>Nota #${receiptData.invoice}</title>
          <style>
            @media print { @page { margin: 0; } body { margin: 0; padding: 10px; } }
            body { font-family: 'Courier New', Courier, monospace; font-size: 12px; max-width: 260px; margin: 0 auto; padding: 10px; color: #000; background: #fff; }
            .text-center { text-align: center; }
            .font-bold { font-weight: bold; }
            .brand-title { font-size: 16px; font-weight: bold; text-transform: uppercase; margin: 0 0 4px 0; letter-spacing: 1px; }
            .metadata { font-size: 11px; margin-bottom: 2px; color: #333; }
            .dashed-line { border-top: 1px dashed #000; margin: 8px 0; }
            .flex-space { display: flex; justify-content: space-between; align-items: flex-start; }
            .item-container { margin-bottom: 6px; }
            .item-details { display: flex; justify-content: space-between; font-size: 11px; padding-left: 10px; margin-top: 1px; }
            .totals-section div { margin-bottom: 3px; }
            .footer-msg { margin-top: 15px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
          </style>
        </head>
        <body>
          <div class="text-center">
            <h3 class="brand-title">${receiptData.store}</h3>
            <div class="metadata">Sistem Kasir Pintar Digital</div>
          </div>
          <div class="dashed-line"></div>
          <div class="metadata">
            <div class="flex-space"><span>Waktu:</span><span>${new Date(receiptData.createdAt).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</span></div>
            <div class="flex-space"><span>No.Nota:</span><span class="font-bold">${receiptData.invoice}</span></div>
            <div class="flex-space"><span>Kasir:</span><span>${receiptData.cashier}</span></div>
            <div class="flex-space"><span>Pelanggan:</span><span>${receiptData.customer || '-'}</span></div>
          </div>
          <div class="dashed-line"></div>
          <div style="margin: 4px 0;">
            ${receiptData.items.map((item: any, idx: number) => `
              <div class="item-container">
                <div class="font-bold">${idx + 1}. ${item.product}</div>
                <div class="item-details">
                  <span>${item.quantity} Pcs x Rp ${item.price.toLocaleString('id-ID')}</span>
                  <span class="font-bold">Rp ${item.subtotal.toLocaleString('id-ID')}</span>
                </div>
              </div>
            `).join('')}
          </div>
          <div class="dashed-line"></div>
          <div class="totals-section">
            <div class="flex-space"><span>Total QTY:</span><span class="font-bold">${totalQty} Item</span></div>
            <div class="flex-space"><span>Sub Total:</span><span>Rp ${receiptData.subtotal.toLocaleString('id-ID')}</span></div>
            <div class="flex-space"><span>Diskon:</span><span>Rp ${receiptData.discount.toLocaleString('id-ID')}</span></div>
            <div class="flex-space font-bold" style="font-size: 13px;"><span>TOTAL NET:</span><span>Rp ${receiptData.total.toLocaleString('id-ID')}</span></div>
            <div class="dashed-line" style="margin: 4px 0;"></div>
            <div class="flex-space"><span>Bayar (${payment}):</span><span>Rp ${receiptData.paidAmount.toLocaleString('id-ID')}</span></div>
            <div class="flex-space font-bold"><span>Kembalian:</span><span>Rp ${receiptData.changeAmount.toLocaleString('id-ID')}</span></div>
          </div>
          <div class="dashed-line"></div>
          <div class="text-center footer-msg font-bold">
            <div>Terima Kasih Atas Kunjungan Anda</div>
          </div>
          <script>
            window.onload = function() { window.print(); setTimeout(function() { window.close(); }, 500); }
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  const filtered = products.filter(x => {
    const matchesSearch = x.name.toLowerCase().includes(search.toLowerCase()) || x.barcode.includes(search) || x.sku.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || x.categoryId === categoryFilter
    return matchesSearch && matchesCategory
  })

  const formatIDR = (num: number) => `Rp ${num.toLocaleString('id-ID')}`

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_390px] h-[calc(100vh-80px)] overflow-hidden">
      
      {/* SEKSI KATALOG (KIRI) */}
      <div className="flex flex-col h-full overflow-hidden space-y-4">
        <div className="flex items-center gap-3 bg-white border border-slate-200 px-4 py-2.5 rounded-xl shadow-3xs flex-shrink-0">
          <Search size={16} className="text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama produk atau scan barcode di sini..."
            className="w-full text-xs outline-none bg-transparent text-slate-800 placeholder:text-slate-400"
          />
          <ScanLine size={16} className="text-slate-400 shrink-0" />
        </div>

        {/* PERBAIKAN: List Kategori Diambil Dinamis Dari Database Backend */}
        <div className="flex flex-wrap gap-2 flex-shrink-0 overflow-x-auto pb-1 max-w-full">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium border transition-all whitespace-nowrap ${
              categoryFilter === 'all'
                ? 'bg-blue-600 text-white border-blue-600 font-semibold shadow-2xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Semua Produk
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium border transition-all whitespace-nowrap ${
                categoryFilter === cat.id
                  ? 'bg-blue-600 text-white border-blue-600 font-semibold shadow-2xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-2 md:grid-cols-3 gap-3 content-start pb-4">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-56 rounded-xl bg-slate-100 animate-pulse border border-slate-200" />
            ))
          ) : filtered.length === 0 ? (
            <div className="col-span-full py-16 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl bg-white text-xs">
              Item produk kosong atau tidak ditemukan
            </div>
          ) : (
            filtered.map(p => {
              const masterDiscount = getProductMasterDiscount(p)
              const hasDiscount = masterDiscount > 0
              return (
                <div
                  key={p.id}
                  className="group bg-white border border-slate-200 rounded-xl p-3 shadow-3xs flex flex-col justify-between relative overflow-hidden"
                >
                  <div>
                    <div className="aspect-video w-full overflow-hidden rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 relative">
                      {p.image ? (
                        <img src={p.image} alt={p.name} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                      ) : (
                        <Package size={24} />
                      )}
                      {hasDiscount && (
                        <span className="absolute top-2 right-2 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm animate-pulse">
                          PROMO
                        </span>
                      )}
                    </div>
                    <div className="mt-3">
                      <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">{p.sku || 'No SKU'}</p>
                      <h3 className="font-semibold text-slate-900 text-xs mt-0.5 line-clamp-1 h-4">{p.name}</h3>
                    </div>
                  </div>

                  {/* Ganti blok tampilan harga dengan logika ini */}
<div className="mt-3 pt-2 border-t border-slate-100 flex items-end justify-between">
  <div>
    <span className="block text-[10px] text-slate-400 font-mono">Stok: {p.stock}</span>
    {/* TAMPILKAN HANYA HARGA FINAL */}
    <span className="text-xs font-bold font-mono text-slate-900 mt-0.5">
      {formatIDR(p.sellingPrice - masterDiscount)}
    </span>
    
    {/* Jika ingin tetap memberi tahu ada diskon, gunakan badge kecil, bukan harga coret */}
    {hasDiscount && (
      <span className="block text-[9px] font-bold text-red-500 italic">
        (Termasuk diskon)
      </span>
    )}
  </div>
  
  <button
    onClick={() => addToCart(p)}
    disabled={p.stock <= 0}
    className="h-7 w-7 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-3xs transition-colors disabled:bg-slate-100 disabled:text-slate-400"
  >
    <Plus size={14} />
  </button>
</div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* SEKSI CHECKOUT / RINGKASAN BILLING (KANAN) */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-3xs flex flex-col h-full overflow-hidden justify-between">
        
        <div className="space-y-4 flex flex-col flex-1 overflow-hidden">
          <div className="border-b border-slate-100 pb-2.5 flex items-center justify-between flex-shrink-0">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ringkasan Pembayaran</h2>
            <div className="flex items-center gap-1.5 text-slate-500">
              <span className="text-[11px] font-medium text-slate-700">{cashier?.name || 'Kasir'}</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 pr-1 space-y-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex-shrink-0">Item Dipilih</p>
            {cart.length === 0 ? (
              <div className="h-32 border border-dashed border-slate-200 bg-slate-50/50 rounded-xl flex flex-col items-center justify-center text-slate-400 text-xs italic gap-1.5">
                <ShoppingCart size={18} className="text-slate-300" />
                <span>Keranjang masih kosong</span>
              </div>
            ) : (
              cart.map(item => {
                const masterDiscount = getProductMasterDiscount(item)
                return (
                  <div key={item.id} className="pt-2 first:pt-0 animate-in fade-in duration-100 space-y-1.5">
                    <div className="flex justify-between items-start">
                      <div className="min-w-0 flex-1 pr-2">
                        <p className="text-xs font-semibold text-slate-900 truncate">{item.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 font-mono text-[10px]">
                          <span className="text-slate-400">{formatIDR(item.sellingPrice)}</span>
                          {formatIDR(item.sellingPrice - masterDiscount - item.cashierDiscount)}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="flex items-center border border-slate-200 rounded-md bg-slate-50 p-0.5 font-mono text-xs">
                          <button onClick={() => updateQty(item.id, -1)} className="p-0.5 border border-slate-200 bg-white rounded text-slate-600 hover:bg-slate-50"><Minus size={10} /></button>
                          <span className="px-1.5 font-bold text-slate-800 w-5 text-center">{item.qty}</span>
                          <button onClick={() => updateQty(item.id, 1)} className="p-0.5 border border-slate-200 bg-white rounded text-slate-600 hover:bg-slate-50"><Plus size={10} /></button>
                        </div>
                        <button onClick={() => removeFromCart(item.id)} className="p-1 text-slate-400 hover:text-rose-600"><Trash2 size={13} /></button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 bg-slate-50 border border-slate-200/60 p-1.5 rounded-lg text-[11px]">
                      <span className="text-slate-500 font-medium shrink-0">Diskon Tambahan Kasir (Rp):</span>
                      <input 
                        type="number"
                        min={0}
                        placeholder="0"
                        value={item.cashierDiscount || ''}
                        onChange={(e) => updateCashierDiscount(item.id, Number(e.target.value))}
                        className="w-24 bg-white border border-slate-200 rounded px-1.5 py-0.5 text-right font-mono font-bold text-slate-800 outline-none focus:border-slate-400"
                      />
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <div className="border-t border-slate-100 pt-2 flex-shrink-0">
            {!isCustomerMode ? (
              <button type="button" onClick={() => setIsCustomerMode(true)} className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-900">
                <UserPlus size={12} /> Hubungkan Data Pelanggan / Member
              </button>
            ) : (
              <div className="space-y-2 bg-slate-50 border border-slate-200 rounded-lg p-2">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase">
                  <span>Data Member</span>
                  <button type="button" onClick={() => setIsCustomerMode(false)}><X size={12}/></button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative flex items-center">
                    <input 
                      type="text" 
                      placeholder="No HP Pelanggan" 
                      value={customerPhone} 
                      onChange={e => setCustomerPhone(e.target.value)} 
                      className="w-full bg-white border rounded px-2 py-1 text-xs font-mono outline-none focus:border-slate-400"
                    />
                    {searchingCustomer && <Loader2 className="absolute right-2 h-3 w-3 animate-spin text-slate-400" />}
                  </div>
                  <input 
                    type="text" 
                    placeholder="Nama Pelanggan" 
                    value={customerName} 
                    onChange={e => setCustomerName(e.target.value)} 
                    className="bg-white border rounded px-2 py-1 text-xs outline-none focus:border-slate-400"
                  />
                </div>
                <label className="flex items-center gap-1.5 text-[10px] text-slate-500 cursor-pointer w-fit mt-1">
                  <input 
                    type="checkbox" 
                    checked={saveCustomer} 
                    onChange={e => setSaveCustomer(e.target.checked)} 
                    className="rounded border-slate-300 text-blue-600 focus:ring-0 h-3 w-3" 
                  />
                  <span>Daftarkan sebagai member baru jika belum ada</span>
                </label>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-slate-100 pt-3 space-y-3 flex-shrink-0">
          <div className="flex justify-between items-baseline text-xs">
            <span className="text-slate-500">Sub total</span>
            <span className="font-mono font-medium text-slate-900">{formatIDR(rawSubtotal)}</span>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-500">Diskon Global Transaksi (F7)</span>
            <div className="flex rounded-lg border border-slate-200 overflow-hidden bg-white">
              <select
                value={globalDiscountType}
                onChange={e => setGlobalDiscountType(e.target.value as 'PERCENT' | 'FIXED')}
                className="bg-slate-50 border-r border-slate-200 px-2 py-1 text-xs font-medium outline-none text-slate-700"
              >
                <option value="PERCENT">%</option>
                <option value="FIXED">Rp</option>
              </select>
              <input
                type="number"
                min={0}
                value={globalDiscountValue || ''}
                onChange={e => setGlobalDiscountValue(Number(e.target.value))}
                placeholder="0"
                className="w-full px-2 py-1 text-xs font-mono font-bold outline-none text-right text-slate-800"
              />
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-xs">
            <span className="font-medium text-slate-600">PPN 11%</span>
            <button
              type="button"
              onClick={() => setIsPPN(!isPPN)}
              className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer rounded-full border transition-colors ${
                isPPN ? 'bg-blue-600 border-blue-600' : 'bg-slate-200 border-transparent'
              }`}
            >
              <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition duration-200 ${
                isPPN ? 'translate-x-3.5' : 'translate-x-0.5'
              }`} />
            </button>
          </div>

          <div className="border-t border-slate-100 pt-2 flex justify-between items-baseline">
            <span className="text-xs font-medium text-slate-400">Total pembayaran</span>
            <span className="text-xl font-black font-mono text-blue-600">{formatIDR(finalTotal)}</span>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Metode Pembayaran</span>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'CASH', icon: Wallet, label: 'Tunai' },
                { id: 'QRIS', icon: QrCode, label: 'QRIS' },
                { id: 'DEBIT', icon: CreditCard, label: 'Debit' }
              ].map(m => {
                const Icon = m.icon
                const isSelected = payment === m.id
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPayment(m.id as PaymentMethod)}
                    className={`flex items-center justify-center p-2 border rounded-lg gap-1.5 text-xs font-medium transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    <Icon size={13} />
                    <span>{m.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {payment === 'CASH' && (
            <div className="space-y-1.5 bg-slate-50 border border-slate-200 rounded-lg p-2.5 animate-in fade-in duration-100 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-sans">UANG DITERIMA</span>
                <input
                  type="number"
                  placeholder="0"
                  value={paid}
                  onChange={e => setPaid(e.target.value === '' ? '' : Number(e.target.value))}
                  className="bg-transparent font-bold text-slate-900 outline-none text-right w-1/2 border-b border-slate-200 focus:border-slate-400"
                />
              </div>
              <div className="flex justify-between items-center border-t border-slate-200/60 pt-1.5 text-[11px]">
                <span className="text-slate-400 font-sans">Kembalian</span>
                <span className="font-bold text-slate-800">{formatIDR(change)}</span>
              </div>
            </div>
          )}

          {/* NOTIFIKASI INFORMASI JIKA QRIS/DEBIT */}
          {payment !== 'CASH' && (
            <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-medium flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
              <span>Pembayaran Digital: Jumlah disesuaikan pas (Kembalian: Rp 0)</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-1.5 pt-1">
            <button
              onClick={checkout}
              disabled={cart.length === 0 || submitting}
              className="w-full rounded-lg bg-blue-600 text-white py-2.5 text-xs font-semibold flex justify-center items-center gap-1.5 hover:bg-blue-700 disabled:opacity-40 transition-all shadow-3xs"
            >
              {submitting ? (
                <Loader2 className="animate-spin" size={14} />
              ) : (
                <>
                  <span>Bayar (F9)</span>
                  <ArrowRight size={13} />
                </>
              )}
            </button>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={() => { if (confirm('Kosongkan isi daftar keranjang?')) { setCart([]); setPaid(''); } }}
                className="w-full rounded-lg border border-slate-200 text-slate-400 py-1.5 text-xs font-medium hover:bg-slate-50 hover:text-slate-600 transition-colors"
              >
                Hapus keranjang
              </button>
            )}
          </div>

        </div>
      </div>

      {/* DIALOG NOTA THERMAL SUCCESS */}
      {isOpenReceipt && receiptData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs">
          <div className="w-full max-w-sm overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex flex-col items-center text-center space-y-1.5">
              <CheckCircle2 size={36} className="text-emerald-500" />
              <h3 className="text-sm font-bold text-slate-900">Transaksi Berhasil</h3>
              <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">{receiptData.invoice}</p>
            </div>

            <div className="border border-slate-100 rounded-xl p-3.5 bg-slate-50/70 font-mono text-xs text-slate-700 space-y-2">
              <div className="flex justify-between">
                <span className="font-sans text-slate-400 text-[11px]">Total Tagihan</span>
                <span className="font-bold text-slate-900">{formatIDR(receiptData.total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-sans text-slate-400 text-[11px]">Uang Diterima</span>
                <span className="text-slate-700">{formatIDR(receiptData.paidAmount)}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200/60 pt-2 text-sm">
                <span className="font-sans text-slate-500 text-xs">Uang Kembalian</span>
                <span className="text-emerald-600">{formatIDR(receiptData.changeAmount)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handlePrintReceipt}
                className="rounded-lg border-2 border-blue-600 bg-white text-blue-600 py-2 text-xs font-bold hover:bg-blue-50 flex items-center justify-center gap-1.5 transition-colors shadow-3xs"
              >
                <Printer size={13} /> 
                <span>Cetak Struk</span>
              </button>
              <button
                type="button"
                onClick={handleResetPos}
                className="rounded-lg bg-blue-600 text-white py-2 text-xs font-bold hover:bg-blue-700 flex items-center justify-center gap-1 transition-colors shadow-3xs"
              >
                <span>Order Baru</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
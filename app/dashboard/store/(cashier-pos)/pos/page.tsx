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
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'F9') { e.preventDefault(); checkout() }
    }
    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [cart, payment, paid, submitting])

  // Barcode scanner global handler
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const currentTime = Date.now()
      if (currentTime - lastKeyTime.current > 50) barcodeBuffer.current = ''
      lastKeyTime.current = currentTime

      if (e.key === 'Enter') {
        if (barcodeBuffer.current.trim().length > 2) {
          const target = products.find(
            p => p.barcode === barcodeBuffer.current.trim() || p.sku === barcodeBuffer.current.trim()
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

  async function loadData() {
    try {
      setLoading(true)
      const storeId = localStorage.getItem('storeId')
      const token = localStorage.getItem('token')
      const headers = { Authorization: `Bearer ${token}` }
      const [productsRes, categoriesRes] = await Promise.all([
        api.get(`/products/store/${storeId}`, { headers }),
        api.get(`/categories/store/${storeId}`, { headers })
      ])
      setProducts(productsRes.data || [])
      setCategories(categoriesRes.data || [])
    } catch (err) {
      console.error('Gagal memuat data POS:', err)
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
    if (!p.discountProduct?.length) return 0
    const active = p.discountProduct.find(d => d.discount?.isActive)
    if (!active) return 0
    return active.discount.type === 'PERCENTAGE'
      ? Math.floor((p.sellingPrice * active.discount.value) / 100)
      : active.discount.value
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

  const ppnAmount = useMemo(() =>
    isPPN ? Math.floor((rawSubtotal - globalCalculatedDiscount) * 0.11) : 0,
    [isPPN, rawSubtotal, globalCalculatedDiscount])

  const finalTotal = useMemo(() =>
    Math.max(0, rawSubtotal - globalCalculatedDiscount + ppnAmount),
    [rawSubtotal, globalCalculatedDiscount, ppnAmount])

  useEffect(() => {
    if (payment !== 'CASH') setPaid(finalTotal)
    else setPaid('')
  }, [payment, finalTotal])

  const change = useMemo(() =>
    payment === 'CASH' ? Math.max(0, Number(paid || 0) - finalTotal) : 0,
    [paid, finalTotal, payment])

  // Auto print receipt using thermal-style window
  function autoPrintReceipt(data: any, paymentMethod: PaymentMethod) {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    const totalQty = data.items.reduce((s: number, i: any) => s + i.quantity, 0)
    printWindow.document.write(`
      <html>
        <head>
          <title>Nota #${data.invoice}</title>
          <style>
            @media print { @page { margin: 0; size: 58mm auto; } body { margin: 0; padding: 8px; } }
            body { font-family: 'Courier New', Courier, monospace; font-size: 11px; max-width: 260px; margin: 0 auto; padding: 8px; color: #000; background: #fff; }
            .tc { text-align: center; }
            .b { font-weight: bold; }
            .brand { font-size: 15px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 3px; }
            .meta { font-size: 10px; margin-bottom: 2px; }
            .hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }
            .row { display: flex; justify-content: space-between; margin-bottom: 2px; }
            .item { margin-bottom: 5px; }
            .item-sub { display: flex; justify-content: space-between; font-size: 10px; padding-left: 8px; margin-top: 1px; }
            .total-row { display: flex; justify-content: space-between; font-size: 13px; font-weight: bold; }
            .footer { margin-top: 12px; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; }
          </style>
        </head>
        <body>
          <div class="tc">
            <p class="brand">${data.store}</p>
            <p class="meta">Kasir Digital</p>
          </div>
          <div class="hr"></div>
          <div class="meta">
            <div class="row"><span>Waktu</span><span>${new Date(data.createdAt).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</span></div>
            <div class="row"><span>No.Nota</span><span class="b">${data.invoice}</span></div>
            <div class="row"><span>Kasir</span><span>${data.cashier}</span></div>
            <div class="row"><span>Pelanggan</span><span>${data.customer || '-'}</span></div>
          </div>
          <div class="hr"></div>
          ${data.items.map((item: any, i: number) => `
            <div class="item">
              <div class="b">${i + 1}. ${item.product}</div>
              <div class="item-sub">
                <span>${item.quantity} pcs &times; Rp ${item.price.toLocaleString('id-ID')}</span>
                <span class="b">Rp ${item.subtotal.toLocaleString('id-ID')}</span>
              </div>
            </div>
          `).join('')}
          <div class="hr"></div>
          <div class="meta">
            <div class="row"><span>Total QTY</span><span class="b">${totalQty} item</span></div>
            <div class="row"><span>Sub Total</span><span>Rp ${data.subtotal.toLocaleString('id-ID')}</span></div>
            <div class="row"><span>Diskon</span><span>Rp ${data.discount.toLocaleString('id-ID')}</span></div>
          </div>
          <div class="hr"></div>
          <div class="total-row"><span>TOTAL</span><span>Rp ${data.total.toLocaleString('id-ID')}</span></div>
          <div class="hr"></div>
          <div class="meta">
            <div class="row"><span>Bayar (${paymentMethod})</span><span>Rp ${data.paidAmount.toLocaleString('id-ID')}</span></div>
            <div class="row b"><span>Kembalian</span><span>Rp ${data.changeAmount.toLocaleString('id-ID')}</span></div>
          </div>
          <div class="hr"></div>
          <div class="tc footer b">Terima Kasih</div>
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
    if (submitting) return

    const storeId = localStorage.getItem('storeId')
    const token = localStorage.getItem('token')
    const cachedUser = JSON.parse(localStorage.getItem('user') || '{}')
    const finalStoreId = storeId || cashier?.storeId || cachedUser?.storeId
    const finalCashierId = cashier?.id || cachedUser?.id

    if (!finalStoreId || !finalCashierId)
      return alert('Autentikasi gagal. Silakan login kembali.')

    try {
      setSubmitting(true)
      const payload = {
        storeId: String(finalStoreId),
        cashierId: String(finalCashierId),
        paymentMethod: payment,
        paidAmount: payment === 'CASH' ? Math.round(Number(paid)) : Math.round(finalTotal),
        phone: isCustomerMode && customerPhone.trim() ? customerPhone.trim() : undefined,
        customerName: isCustomerMode && customerName.trim() ? customerName.trim() : undefined,
        saveCustomer: isCustomerMode ? saveCustomer : false,
        items: cart.map(x => {
          const md = getProductMasterDiscount(x)
          const finalPrice = Math.max(0, x.sellingPrice - md - x.cashierDiscount)
          return {
            productId: x.id,
            quantity: Math.round(Number(x.qty)),
            price: finalPrice,
            cashierDiscount: Math.round(Number(x.cashierDiscount))
          }
        })
      }

      const res = await api.post('/transactions', payload, {
        headers: { Authorization: `Bearer ${token}` }
      })

      const receiptRes = await api.get(`/transactions/${res.data.id}/receipt`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      const data = receiptRes.data
      setReceiptData(data)
      setIsOpenReceipt(true)

      // Auto print immediately after successful checkout
      autoPrintReceipt(data, payment)

    } catch (err: any) {
      alert(err.response?.data?.message || 'Transaksi gagal')
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
    if (receiptData) autoPrintReceipt(receiptData, payment)
  }

  const filtered = products.filter(x => {
    const matchSearch = x.name.toLowerCase().includes(search.toLowerCase()) ||
      x.barcode.includes(search) || x.sku.toLowerCase().includes(search.toLowerCase())
    const matchCat = categoryFilter === 'all' || x.categoryId === categoryFilter
    return matchSearch && matchCat
  })

  const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`

  const paymentMethods = [
    { id: 'CASH', icon: Wallet, label: 'Tunai' },
    { id: 'QRIS', icon: QrCode, label: 'QRIS' },
    { id: 'DEBIT', icon: CreditCard, label: 'Debit' },
  ]

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_390px] h-[calc(100vh-80px)] overflow-hidden">

      {/* ─── LEFT: Product Catalog ─── */}
      <div className="flex flex-col h-full overflow-hidden space-y-4">

        {/* Search bar */}
        <div className="flex items-center gap-3 bg-white border border-slate-200 px-4 py-2.5 rounded-xl shadow-sm flex-shrink-0">
          <Search size={15} className="text-slate-400 shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama, SKU atau scan barcode..."
            className="w-full text-xs outline-none bg-transparent text-slate-800 placeholder:text-slate-400"
          />
          <ScanLine size={15} className="text-slate-400 shrink-0" />
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2 flex-shrink-0 overflow-x-auto pb-1">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium border transition-all whitespace-nowrap ${categoryFilter === 'all'
              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
          >
            Semua
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium border transition-all whitespace-nowrap ${categoryFilter === cat.id
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-2 md:grid-cols-3 gap-3 content-start pb-4">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-52 rounded-xl bg-slate-100 animate-pulse" />
            ))
            : filtered.length === 0
              ? (
                <div className="col-span-full py-16 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl bg-white text-xs">
                  Produk tidak ditemukan
                </div>
              )
              : filtered.map(p => {
                const masterDiscount = getProductMasterDiscount(p)
                const discountedPrice = p.sellingPrice - masterDiscount
                const hasDiscount = masterDiscount > 0
                const outOfStock = p.stock <= 0

                return (
                  <div
                    key={p.id}
                    className={`group bg-white border rounded-xl p-3 shadow-sm flex flex-col justify-between relative overflow-hidden transition-all ${outOfStock ? 'opacity-50 border-slate-200' : 'border-slate-200 hover:border-blue-200 hover:shadow-md'
                      }`}
                  >
                    {/* Product image */}
                    <div className="aspect-video w-full overflow-hidden rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 relative">
                      {p.image
                        ? <img src={p.image} alt={p.name} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                        : <Package size={22} />
                      }
                      {hasDiscount && (
                        <span className="absolute top-1.5 right-1.5 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                          PROMO
                        </span>
                      )}
                      {outOfStock && (
                        <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                          <span className="text-[10px] font-bold text-red-500 bg-white border border-red-200 px-2 py-0.5 rounded">Habis</span>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="mt-2.5">
                      <p className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">{p.sku || '–'}</p>
                      <h3 className="font-semibold text-slate-900 text-xs mt-0.5 line-clamp-1">{p.name}</h3>
                    </div>

                    {/* Price row */}
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-end justify-between gap-2">
                      <div>
                        {/* Only show discounted price */}
                        <span className="text-xs font-bold font-mono text-slate-900">{fmt(discountedPrice)}</span>
                        {hasDiscount && (
                          <span className="block text-[9px] text-slate-400 font-mono line-through">{fmt(p.sellingPrice)}</span>
                        )}
                        <span className="block text-[9px] text-slate-400 mt-0.5">Stok: {p.stock}</span>
                      </div>
                      <button
                        onClick={() => addToCart(p)}
                        disabled={outOfStock}
                        className="h-7 w-7 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-sm transition-colors disabled:bg-slate-100 disabled:text-slate-400 shrink-0"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                )
              })
          }
        </div>
      </div>

      {/* ─── RIGHT: Checkout Panel ─── */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col h-full overflow-hidden">

        {/* Header */}
        <div className="border-b border-slate-100 pb-2.5 flex items-center justify-between flex-shrink-0 mb-3">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ringkasan Pembayaran</h2>
          <span className="text-[11px] font-medium text-slate-600">{cashier?.name || 'Kasir'}</span>
        </div>

        {/* Cart items – scrollable */}
        <div className="flex-1 overflow-y-auto pr-0.5 space-y-0 divide-y divide-slate-100 mb-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-2">Item Dipilih</p>
          {cart.length === 0 ? (
            <div className="h-28 border border-dashed border-slate-200 bg-slate-50 rounded-xl flex flex-col items-center justify-center text-slate-400 text-xs gap-1.5 mt-1">
              <ShoppingCart size={17} className="text-slate-300" />
              <span>Keranjang kosong</span>
            </div>
          ) : (
            cart.map(item => {
              const md = getProductMasterDiscount(item)
              const finalItemPrice = item.sellingPrice - md - item.cashierDiscount
              return (
                <div key={item.id} className="py-2 space-y-1.5">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-900 truncate">{item.name}</p>
                      <p className="text-[10px] font-mono text-slate-500 mt-0.5">{fmt(finalItemPrice)} / pcs</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="flex items-center border border-slate-200 rounded-md bg-slate-50 p-0.5">
                        <button onClick={() => updateQty(item.id, -1)} className="p-0.5 bg-white border border-slate-200 rounded text-slate-600 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors"><Minus size={9} /></button>
                        <span className="px-1.5 font-bold text-slate-800 text-xs w-6 text-center">{item.qty}</span>
                        <button onClick={() => updateQty(item.id, 1)} className="p-0.5 bg-white border border-slate-200 rounded text-slate-600 hover:bg-green-50 hover:text-green-600 hover:border-green-200 transition-colors"><Plus size={9} /></button>
                      </div>
                      <button onClick={() => removeFromCart(item.id)} className="p-1 text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={12} /></button>
                    </div>
                  </div>
                  {/* Per-item cashier discount */}
                  <div className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg">
                    <span className="text-[10px] text-slate-400 shrink-0">Diskon kasir (Rp)</span>
                    <input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={item.cashierDiscount || ''}
                      onChange={e => updateCashierDiscount(item.id, Number(e.target.value))}
                      className="w-24 bg-white border border-slate-200 rounded px-1.5 py-0.5 text-right text-[11px] font-mono font-bold text-slate-800 outline-none focus:border-blue-400"
                    />
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Customer section */}
        <div className="mb-3 flex-shrink-0">
          {!isCustomerMode ? (
            <button type="button" onClick={() => setIsCustomerMode(true)} className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-slate-700 transition-colors">
              <UserPlus size={11} /> Tambah data pelanggan
            </button>
          ) : (
            <div className="space-y-2 bg-slate-50 border border-slate-200 rounded-lg p-2.5">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Member</span>
                <button type="button" onClick={() => setIsCustomerMode(false)}><X size={12} className="text-slate-400" /></button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <input type="text" placeholder="No. HP" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs font-mono outline-none focus:border-blue-400" />
                  {searchingCustomer && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin text-slate-400" />}
                </div>
                <input type="text" placeholder="Nama" value={customerName} onChange={e => setCustomerName(e.target.value)}
                  className="bg-white border border-slate-200 rounded px-2 py-1 text-xs outline-none focus:border-blue-400" />
              </div>
              <label className="flex items-center gap-1.5 text-[10px] text-slate-500 cursor-pointer">
                <input type="checkbox" checked={saveCustomer} onChange={e => setSaveCustomer(e.target.checked)}
                  className="rounded border-slate-300 h-3 w-3" />
                Daftarkan sebagai member baru
              </label>
            </div>
          )}
        </div>

        {/* ─── Totals & payment ─── */}
        <div className="border-t border-slate-100 pt-3 space-y-2.5 flex-shrink-0">

          <div className="flex justify-between text-xs text-slate-500">
            <span>Sub Total</span>
            <span className="font-mono font-medium text-slate-900">{fmt(rawSubtotal)}</span>
          </div>

          {/* Global discount */}
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Diskon Transaksi</span>
            <div className="flex rounded-lg border border-slate-200 overflow-hidden">
              <select
                value={globalDiscountType}
                onChange={e => setGlobalDiscountType(e.target.value as 'PERCENT' | 'FIXED')}
                className="bg-slate-50 border-r border-slate-200 px-2 py-1.5 text-xs font-medium outline-none text-slate-700"
              >
                <option value="PERCENT">%</option>
                <option value="FIXED">Rp</option>
              </select>
              <input
                type="number" min={0} placeholder="0"
                value={globalDiscountValue || ''}
                onChange={e => setGlobalDiscountValue(Number(e.target.value))}
                className="flex-1 px-2 py-1.5 text-xs font-mono font-bold outline-none text-right text-slate-800"
              />
            </div>
          </div>

          {/* PPN toggle */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">PPN 11%</span>
            <button
              type="button"
              onClick={() => setIsPPN(!isPPN)}
              className={`relative inline-flex h-4 w-8 cursor-pointer rounded-full border transition-colors ${isPPN ? 'bg-blue-600 border-blue-600' : 'bg-slate-200 border-transparent'
                }`}
            >
              <span className={`inline-block h-3 w-3 mt-0.5 transform rounded-full bg-white transition duration-200 ${isPPN ? 'translate-x-3.5' : 'translate-x-0.5'
                }`} />
            </button>
          </div>

          {/* Final total */}
          <div className="flex justify-between items-baseline border-t border-slate-100 pt-2">
            <span className="text-xs text-slate-400 font-medium">Total Pembayaran</span>
            <span className="text-xl font-black font-mono text-blue-600">{fmt(finalTotal)}</span>
          </div>

          {/* Payment method */}
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Metode Bayar</span>
            <div className="grid grid-cols-3 gap-1.5">
              {paymentMethods.map(m => {
                const Icon = m.icon
                const active = payment === m.id
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPayment(m.id as PaymentMethod)}
                    className={`flex items-center justify-center gap-1.5 p-2 border rounded-lg text-xs font-medium transition-all ${active
                      ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold shadow-sm'
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

          {/* Cash input */}
          {payment === 'CASH' && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 space-y-1.5 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="font-sans text-slate-500 text-xs">Uang Diterima</span>
                <input
                  type="number"
                  placeholder="0"
                  value={paid}
                  onChange={e => setPaid(e.target.value === '' ? '' : Number(e.target.value))}
                  className="bg-transparent font-bold text-slate-900 outline-none text-right w-1/2 border-b border-slate-200 focus:border-blue-400"
                  autoFocus
                />
              </div>
              <div className="flex justify-between items-center border-t border-slate-100 pt-1.5">
                <span className="font-sans text-slate-400 text-[11px]">Kembalian</span>
                <span className={`font-bold text-sm ${change > 0 ? 'text-emerald-600' : 'text-slate-700'}`}>{fmt(change)}</span>
              </div>
            </div>
          )}

          {/* Digital payment info - no change */}
          {payment !== 'CASH' && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-2 text-[11px] text-emerald-700 font-medium">
              <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
              <span>Pembayaran pas — tidak ada kembalian</span>
            </div>
          )}

          {/* Checkout button */}
          <div className="space-y-1.5 pt-1">
            <button
              onClick={checkout}
              disabled={cart.length === 0 || submitting}
              className="w-full rounded-lg bg-blue-600 text-white py-2.5 text-xs font-bold flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-40 transition-all shadow-sm"
            >
              {submitting
                ? <Loader2 className="animate-spin" size={14} />
                : <><span>Bayar Sekarang (F9)</span><ArrowRight size={13} /></>
              }
            </button>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={() => { if (confirm('Hapus semua item dari keranjang?')) { setCart([]); setPaid('') } }}
                className="w-full rounded-lg border border-slate-200 text-slate-400 py-1.5 text-xs hover:bg-slate-50 hover:text-slate-600 transition-colors"
              >
                Hapus keranjang
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── Receipt Success Dialog ─── */}
      {isOpenReceipt && receiptData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-2xl space-y-4">

            <div className="flex flex-col items-center text-center space-y-1.5">
              <CheckCircle2 size={36} className="text-emerald-500" />
              <h3 className="text-sm font-bold text-slate-900">Transaksi Berhasil</h3>
              <p className="text-[10px] text-slate-400 font-mono">{receiptData.invoice}</p>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 font-mono text-xs space-y-2">
              <div className="flex justify-between text-slate-600">
                <span className="font-sans text-[11px] text-slate-400">Total Tagihan</span>
                <span className="font-bold text-slate-900">{fmt(receiptData.total)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span className="font-sans text-[11px] text-slate-400">Uang Diterima</span>
                <span>{fmt(receiptData.paidAmount)}</span>
              </div>
              <div className="flex justify-between font-bold border-t border-slate-200 pt-2 text-sm">
                <span className="font-sans text-xs text-slate-500">Kembalian</span>
                <span className="text-emerald-600">{fmt(receiptData.changeAmount)}</span>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 text-center">
              Struk sudah dicetak otomatis
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handlePrintReceipt}
                className="rounded-lg border-2 border-blue-600 bg-white text-blue-600 py-2 text-xs font-bold hover:bg-blue-50 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Printer size={13} />
                Cetak Ulang
              </button>
              <button
                type="button"
                onClick={handleResetPos}
                className="rounded-lg bg-blue-600 text-white py-2 text-xs font-bold hover:bg-blue-700 flex items-center justify-center gap-1.5 transition-colors"
              >
                Order Baru
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
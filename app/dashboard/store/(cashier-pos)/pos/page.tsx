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
 ArrowLeft
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
 const [mobileView, setMobileView] = useState<'catalog' | 'cart'>('catalog')

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
 }, [])

 useEffect(() => {
 const handleKeydown = (e: KeyboardEvent) => {
 if (e.key === 'F9') { 
 e.preventDefault() 
 checkout() 
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
 @media print { @page { margin: 0; size: 58mm auto; } body { margin: 0; padding: 4px 8px; } }
 body { font-family: 'Courier New', Courier, monospace; font-size: 10px; max-width: 210px; margin: 0 auto; padding: 4px 8px; color: #000; background: #fff; line-height: 1.35; }
 .tc { text-align: center; }
 .b { font-weight: bold; }
 .brand { font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 2px; }
 .subtitle { font-size: 9px; font-weight: bold; color: #333; margin-bottom: 2px; text-transform: uppercase; }
 .meta { font-size: 9px; margin-bottom: 2px; color: #222; }
 .hr { border: none; border-top: 1px dashed #000; margin: 5px 0; }
 .row { display: flex; justify-content: space-between; margin-bottom: 2px; }
 .item { margin-bottom: 4px; }
 .item-sub { display: flex; justify-content: space-between; font-size: 9px; padding-left: 6px; margin-top: 1px; }
 .discount-row { display: flex; justify-content: space-between; font-size: 8.5px; padding-left: 12px; font-style: italic; color: #333; }
 .total-row { display: flex; justify-content: space-between; font-size: 11px; font-weight: bold; }
 .footer { margin-top: 10px; font-size: 8px; }
 </style>
 </head>
 <body>
 <div class="tc">
 <p class="brand">${data.store}</p>
 <p class="subtitle">LAILA COLLECTIONS</p>
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
 ${data.items.map((item: any, i: number) => {
 const itemDiscount = (item.discount || 0) * item.quantity;
 return `
 <div class="item">
 <div class="b">${i + 1}. ${item.product}</div>
 <div class="item-sub">
 <span>${item.quantity} pcs &times; Rp ${item.originalPrice.toLocaleString('id-ID')}</span>
 <span class="b">Rp ${(item.originalPrice * item.quantity).toLocaleString('id-ID')}</span>
 </div>
 ${itemDiscount > 0 ? `
 <div class="discount-row">
 <span>Diskon Item</span>
 <span>-Rp ${itemDiscount.toLocaleString('id-ID')}</span>
 </div>
 ` : ''}
 </div>
 `;
 }).join('')}
 <div class="hr"></div>
 <div class="meta">
 <div class="row"><span>Total QTY</span><span class="b">${totalQty} item</span></div>
 <div class="row"><span>Sub Total</span><span>Rp ${data.subtotal.toLocaleString('id-ID')}</span></div>
 <div class="row"><span>Diskon</span><span>-Rp ${data.discount.toLocaleString('id-ID')}</span></div>
 </div>
 <div class="hr"></div>
 <div class="total-row"><span>TOTAL</span><span>Rp ${data.total.toLocaleString('id-ID')}</span></div>
 <div class="hr"></div>
 <div class="meta">
 <div class="row"><span>Bayar (${paymentMethod})</span><span>Rp ${data.paidAmount.toLocaleString('id-ID')}</span></div>
 <div class="row b"><span>Kembalian</span><span>Rp ${data.changeAmount.toLocaleString('id-ID')}</span></div>
 </div>
 <div class="hr"></div>
 <div class="tc footer b">
 TERIMA KASIH ATAS KUNJUNGAN ANDA
 <div style="font-size: 7px; font-weight: normal; margin-top: 3px; color: #555;">Laila Collections POS v2.0</div>
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
 const originalSubtotal = cart.reduce((sum, item) => sum + (item.sellingPrice * item.qty), 0)
 const itemDiscountsSum = cart.reduce((sum, item) => sum + ((getProductMasterDiscount(item) + item.cashierDiscount) * item.qty), 0)
 const computedTotalDiscount = itemDiscountsSum + globalCalculatedDiscount

 const payload = {
 storeId: String(finalStoreId),
 cashierId: String(finalCashierId),
 paymentMethod: payment,
 paidAmount: payment === 'CASH' ? Math.round(Number(paid)) : Math.round(finalTotal),
 subtotal: Math.round(originalSubtotal),
 totalDiscount: Math.round(computedTotalDiscount),
 total: Math.round(finalTotal),
 phone: isCustomerMode && customerPhone.trim() ? customerPhone.trim() : undefined,
 customerName: isCustomerMode && customerName.trim() ? customerName.trim() : undefined,
 saveCustomer: isCustomerMode ? saveCustomer : false,
 items: cart.map(x => {
 const md = getProductMasterDiscount(x)
 return {
 productId: x.id,
 quantity: Math.round(Number(x.qty)),
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
 setMobileView('catalog')
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

 const getCategoryName = (catId: string) => {
 const cat = categories.find(c => c.id === catId)
 return cat ? cat.name : 'Lainnya'
 }

 const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`

 const paymentMethods = [
 { id: 'CASH', icon: Wallet, label: 'Tunai' },
 { id: 'QRIS', icon: QrCode, label: 'QRIS' },
 { id: 'DEBIT', icon: CreditCard, label: 'Debit' },
 ]

 return (
 <div className="grid gap-6 lg:grid-cols-[1fr_390px] h-full overflow-hidden relative">

 {/* ─── LEFT: Product Catalog ─── */}
 <div className={`flex flex-col h-full overflow-hidden space-y-4 ${mobileView === 'catalog' ? 'flex' : 'hidden lg:flex'}`}>

 {/* Search bar */}
 <div className="flex items-center gap-3 bg-white border border-slate-200 px-4 py-3 rounded-2xl shadow-xs flex-shrink-0">
 <Search size={16} className="text-slate-400 shrink-0" />
 <input
 ref={searchInputRef}
 value={search}
 onChange={e => setSearch(e.target.value)}
 placeholder="Cari produk (F2)"
 className="w-full text-xs outline-none bg-transparent text-slate-850 placeholder:text-slate-450 font-semibold"
 />
 <ScanLine size={16} className="text-slate-400 shrink-0" />
 </div>

 {/* Category filter */}
 <div className="flex flex-wrap gap-2 flex-shrink-0 overflow-x-auto pb-1">
 <button
 onClick={() => setCategoryFilter('all')}
 className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all whitespace-nowrap cursor-pointer ${
 categoryFilter === 'all'
 ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
 : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 '
 }`}
 >
 Semua produk
 </button>
 {categories.map(cat => (
 <button
 key={cat.id}
 onClick={() => setCategoryFilter(cat.id)}
 className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all whitespace-nowrap cursor-pointer ${
 categoryFilter === cat.id
 ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
 : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 '
 }`}
 >
 {cat.name}
 </button>
 ))}
 </div>

 {/* Product grid */}
 <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-2 md:grid-cols-2 xl:grid-cols-4 gap-4 content-start pb-6">
 {loading
 ? Array.from({ length: 8 }).map((_, i) => (
 <div key={i} className="h-56 rounded-2xl bg-slate-100 animate-pulse border border-slate-200 " />
 ))
 : filtered.length === 0
 ? (
 <div className="col-span-full py-24 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl bg-white text-xs">
 Produk tidak ditemukan
 </div>
 )
 : filtered.map(p => {
 const masterDiscount = getProductMasterDiscount(p)
 const discountedPrice = p.sellingPrice - masterDiscount
 const hasDiscount = masterDiscount > 0
 const outOfStock = p.stock <= 0
 const isLowStock = !outOfStock && p.stock <= 5

 return (
 <div
 key={p.id}
 className={`group bg-white border rounded-2xl p-3.5 shadow-xs flex flex-col justify-between relative overflow-hidden transition-all duration-200 ${
 outOfStock 
 ? 'opacity-50 border-slate-200 ' 
 : 'border-slate-150 hover:border-blue-400 hover:shadow-md'
 }`}
 >
 {/* Product image */}
 <div className="aspect-video w-full overflow-hidden rounded-xl bg-slate-50 border border-slate-105 flex items-center justify-center text-slate-300 relative">
 {p.image ? (
 <img src={p.image} alt={p.name} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
 ) : (
 <Package size={24} className="text-slate-300 " />
 )}
 
 {/* Category Badge overlay */}
 <span className="absolute top-2 right-2 bg-blue-50 text-blue-600 text-[9px] font-extrabold px-2 py-0.5 rounded-lg border border-blue-100 leading-none">
 {getCategoryName(p.categoryId)}
 </span>

 {hasDiscount && (
 <span className="absolute top-2 left-2 bg-red-500 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-lg shadow-xs leading-none">
 PROMO
 </span>
 )}

 {outOfStock && (
 <div className="absolute inset-0 bg-white/70 flex items-center justify-center backdrop-blur-[1px]">
 <span className="text-[10px] font-extrabold text-red-650 bg-white border border-red-200 px-2.5 py-1 rounded-lg">Habis</span>
 </div>
 )}
 </div>

 {/* Info */}
 <div className="mt-3">
 <p className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">{p.sku || '–'}</p>
 <h3 className="font-extrabold text-slate-900 text-xs mt-1 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors" title={p.name}>{p.name}</h3>
 </div>

 {/* Price & Stock row */}
 <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-end justify-between gap-2">
 <div>
 <span className="text-xs font-black font-mono text-blue-600 ">{fmt(discountedPrice)}</span>
 {hasDiscount && (
 <span className="block text-[9px] text-slate-400 font-mono line-through mt-0.5">{fmt(p.sellingPrice)}</span>
 )}
 <span className={`block text-[9px] mt-1 font-semibold ${isLowStock ? 'text-red-550' : 'text-slate-450 '}`}>
 Stok: {p.stock}
 </span>
 </div>
 <button
 onClick={() => addToCart(p)}
 disabled={outOfStock}
 className="h-8 w-8 rounded-lg bg-blue-600 hover:bg-blue-750 text-white flex items-center justify-center shadow-xs transition-colors disabled:bg-slate-100 disabled:text-slate-400 cursor-pointer shrink-0"
 >
 <Plus size={16} />
 </button>
 </div>
 </div>
 )
 })
 }
 </div>
 </div>

 {/* ─── RIGHT: Checkout Panel ─── */}
 <div className={`bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col h-full overflow-hidden ${mobileView === 'cart' ? 'flex' : 'hidden lg:flex'}`}>

 {/* Header */}
 <div className="border-b border-slate-100 pb-3 flex items-center justify-between flex-shrink-0 mb-4">
 <div className="flex items-center gap-2">
 <button
 type="button"
 onClick={() => setMobileView('catalog')}
 className="lg:hidden p-1.5 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors bg-white shrink-0 cursor-pointer"
 >
 <ArrowLeft size={14} />
 </button>
 <h2 className="text-xs font-extrabold text-slate-450 uppercase tracking-widest">Ringkasan Pembayaran</h2>
 </div>
 <span className="text-[11px] font-bold text-slate-700 ">{cashier?.name || 'Kasir'}</span>
 </div>

 {/* Cart items – scrollable */}
 <div className="flex-1 overflow-y-auto pr-0.5 space-y-3 mb-4 flex flex-col">
 <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Item Dipilih</p>
 
 {cart.length === 0 ? (
 <div className="flex-1 min-h-[150px] border border-dashed border-slate-200 bg-slate-50/50 rounded-2xl flex flex-col items-center justify-center text-slate-400 text-xs gap-2 mt-1">
 <ShoppingCart size={22} className="text-slate-300 " />
 <span className="font-semibold">Keranjang masih kosong</span>
 </div>
 ) : (
 <div className="space-y-3">
 {cart.map(item => {
 const md = getProductMasterDiscount(item)
 const finalItemPrice = item.sellingPrice - md - item.cashierDiscount
 return (
 <div key={item.id} className="border border-slate-100 bg-slate-50/50 p-3 rounded-xl space-y-2.5">
 <div className="flex justify-between items-start gap-2">
 <div className="min-w-0 flex-1">
 <p className="text-xs font-bold text-slate-900 truncate">{item.name}</p>
 <p className="text-[10px] font-mono text-slate-500 mt-1">{fmt(finalItemPrice)} / pcs</p>
 </div>
 <div className="flex items-center gap-1.5 shrink-0">
 <div className="flex items-center border border-slate-200 rounded-lg bg-white p-0.5 shadow-3xs">
 <button onClick={() => updateQty(item.id, -1)} className="p-1 bg-white border border-slate-200 rounded-md text-slate-600 hover:bg-red-50 hover:text-red-500 hover:border-red-200 cursor-pointer"><Minus size={10} /></button>
 <span className="px-2.5 font-extrabold text-slate-800 text-xs w-6 text-center">{item.qty}</span>
 <button onClick={() => updateQty(item.id, 1)} className="p-1 bg-white border border-slate-200 rounded-md text-slate-600 hover:bg-green-50 hover:text-green-600 hover:border-green-200 cursor-pointer"><Plus size={10} /></button>
 </div>
 <button onClick={() => removeFromCart(item.id)} className="p-1 text-slate-350 hover:text-rose-500 cursor-pointer transition-colors"><Trash2 size={14} /></button>
 </div>
 </div>
 {/* Per-item cashier discount */}
 <div className="flex items-center justify-between gap-3 bg-white border border-slate-100 px-2.5 py-1 rounded-lg">
 <span className="text-[10px] font-semibold text-slate-400 ">Diskon kasir (Rp)</span>
 <input
 type="number"
 min={0}
 placeholder="0"
 value={item.cashierDiscount || ''}
 onChange={e => updateCashierDiscount(item.id, Number(e.target.value))}
 className="w-24 bg-slate-50/50 border border-slate-200 rounded px-1.5 py-0.5 text-right text-[11px] font-mono font-bold text-slate-850 outline-none focus:border-blue-500"
 />
 </div>
 </div>
 )
 })}
 </div>
 )}
 </div>

 {/* Customer section */}
 <div className="mb-4 flex-shrink-0">
 {!isCustomerMode ? (
 <button type="button" onClick={() => setIsCustomerMode(true)} className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-slate-700 transition-colors cursor-pointer font-bold">
 <UserPlus size={12} /> Tambah data pelanggan
 </button>
 ) : (
 <div className="space-y-2.5 bg-slate-50/70 border border-slate-200 rounded-2xl p-3">
 <div className="flex justify-between items-center">
 <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Member Pelanggan</span>
 <button type="button" onClick={() => setIsCustomerMode(false)} className="cursor-pointer text-slate-400 hover:text-slate-650"><X size={13} /></button>
 </div>
 <div className="grid grid-cols-2 gap-2">
 <div className="relative">
 <input type="text" placeholder="No. HP" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
 className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono outline-none focus:border-blue-500 text-slate-800 " />
 {searchingCustomer && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-slate-400" />}
 </div>
 <input type="text" placeholder="Nama" value={customerName} onChange={e => setCustomerName(e.target.value)}
 className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-blue-500 text-slate-800 " />
 </div>
 <label className="flex items-center gap-1.5 text-[10px] text-slate-500 cursor-pointer">
 <input type="checkbox" checked={saveCustomer} onChange={e => setSaveCustomer(e.target.checked)}
 className="rounded border-slate-300 h-3.5 w-3.5 text-blue-600 cursor-pointer" />
 Daftarkan sebagai member baru
 </label>
 </div>
 )}
 </div>

 {/* ─── Totals & payment ─── */}
 <div className="border-t border-slate-100 pt-4 space-y-3.5 flex-shrink-0">

 <div className="flex justify-between text-xs text-slate-500 font-bold">
 <span>Sub total</span>
 <span className="font-mono text-slate-900 ">{fmt(rawSubtotal)}</span>
 </div>

 {/* Global discount */}
 <div>
 <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1.5">Diskon Transaksi (F7)</span>
 <div className="flex rounded-xl border border-slate-200 overflow-hidden bg-white ">
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
 className="flex-1 px-3 py-2 text-xs font-mono font-bold outline-none text-right text-slate-850 "
 />
 </div>
 </div>

 {/* PPN toggle */}
 <div className="flex items-center justify-between text-xs font-bold text-slate-500 ">
 <span>PPN 11%</span>
 <div className="flex items-center gap-3">
 {isPPN && <span className="font-mono text-slate-700 text-xs">{fmt(ppnAmount)}</span>}
 <button
 type="button"
 onClick={() => setIsPPN(!isPPN)}
 className={`relative inline-flex h-5 w-9 cursor-pointer rounded-full transition-colors duration-200 ${
 isPPN ? 'bg-blue-600' : 'bg-slate-200 '
 }`}
 >
 <span className={`inline-block h-4 w-4 mt-0.5 transform rounded-full bg-white transition duration-200 shadow-xs ${
 isPPN ? 'translate-x-4.5' : 'translate-x-0.5'
 }`} />
 </button>
 </div>
 </div>

 {/* Final total */}
 <div className="flex justify-between items-center border-t border-slate-100 pt-3">
 <span className="text-xs text-slate-400 font-extrabold uppercase tracking-wide">Total Pembayaran</span>
 <span className="text-2xl font-black font-mono text-blue-600 ">{fmt(finalTotal)}</span>
 </div>

 {/* Payment method */}
 <div>
 <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-2">Metode Bayar</span>
 <div className="grid grid-cols-3 gap-2">
 {paymentMethods.map(m => {
 const Icon = m.icon
 const active = payment === m.id
 return (
 <button
 key={m.id}
 type="button"
 onClick={() => setPayment(m.id as PaymentMethod)}
 className={`flex items-center justify-center gap-1.5 py-2.5 border rounded-xl text-xs font-bold transition-all cursor-pointer ${
 active
 ? 'border-blue-500 bg-blue-50 text-blue-600 font-bold shadow-xs'
 : 'border-slate-200 bg-white text-slate-500 hover:border-slate-350 '
 }`}
 >
 <Icon size={14} className="shrink-0" />
 <span>{m.label}</span>
 </button>
 )
 })}
 </div>
 </div>

 {/* Cash input */}
 {payment === 'CASH' && (
 <div className="bg-slate-50 border border-slate-205 rounded-xl p-3 space-y-2 font-mono text-xs">
 <div className="flex items-center justify-between">
 <span className="font-sans font-bold text-slate-550 text-xs">Uang Diterima</span>
 <div className="relative w-1/2 flex items-center justify-end">
 <input
 type="number"
 placeholder="0"
 value={paid}
 onChange={e => setPaid(e.target.value === '' ? '' : Number(e.target.value))}
 className="bg-transparent font-bold text-slate-900 outline-none text-right w-full border-b border-slate-200 focus:border-blue-500 pb-0.5"
 autoFocus
 />
 </div>
 </div>
 <div className="flex justify-between items-center border-t border-slate-100 pt-2">
 <span className="font-sans font-semibold text-slate-400 text-[10px] uppercase">Kembalian</span>
 <span className={`font-bold text-sm ${change > 0 ? 'text-emerald-600 ' : 'text-slate-705 '}`}>{fmt(change)}</span>
 </div>
 </div>
 )}

 {/* Digital payment info */}
 {payment !== 'CASH' && (
 <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5 text-[11px] text-emerald-700 font-bold shadow-3xs">
 <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
 <span>Pembayaran pas — tidak ada kembalian</span>
 </div>
 )}

 {/* Checkout button */}
 <div className="space-y-2 pt-1.5">
 <button
 onClick={checkout}
 disabled={cart.length === 0 || submitting}
 className="w-full rounded-xl bg-blue-600 text-white py-3 text-xs font-bold flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-40 shadow-md shadow-blue-500/10 transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
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
 className="w-full rounded-xl border border-slate-200 text-slate-400 hover:text-slate-600 py-2 text-xs hover:bg-slate-50 transition-colors cursor-pointer"
 >
 Hapus keranjang
 </button>
 )}
 </div>
 </div>
 </div>

 {/* ─── Receipt Success Dialog ─── */}
 {isOpenReceipt && receiptData && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
 <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">

 <div className="flex flex-col items-center text-center space-y-2">
 <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 ">
 <CheckCircle2 size={24} />
 </div>
 <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Transaksi Berhasil</h3>
 <p className="text-sm font-black text-slate-800 font-mono">{receiptData.invoice}</p>
 </div>

 {/* Virtual Receipt Paper Mockup */}
 <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 font-mono text-xs space-y-3 shadow-inner max-h-[300px] overflow-y-auto">
 <div className="text-center border-b border-dashed border-slate-300 pb-2">
 <p className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">{receiptData.store}</p>
 <p className="text-[10px] text-slate-500 mt-0.5">Nota Digital POS</p>
 </div>

 <div className="space-y-1 text-slate-600 text-[10px]">
 <div className="flex justify-between"><span>Waktu:</span><span>{new Date(receiptData.createdAt).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</span></div>
 <div className="flex justify-between"><span>Kasir:</span><span className="truncate max-w-[150px]">{receiptData.cashier}</span></div>
 <div className="flex justify-between"><span>Pelanggan:</span><span>{receiptData.customer || '-'}</span></div>
 </div>

 <div className="border-t border-b border-dashed border-slate-300 py-2.5 space-y-2.5 max-h-[140px] overflow-y-auto pr-1">
 {receiptData.items.map((item: any, idx: number) => {
 const itemDiscount = (item.discount || 0) * item.quantity
 return (
 <div key={idx} className="space-y-0.5">
 <div className="flex justify-between items-start gap-4">
 <span className="font-bold text-slate-800 text-[11px]">{idx + 1}. {item.product}</span>
 <span className="font-bold text-slate-800 shrink-0">{fmt(item.originalPrice * item.quantity)}</span>
 </div>
 <div className="flex justify-between text-[10px] text-slate-500 pl-3">
 <span>{item.quantity} x {fmt(item.originalPrice)}</span>
 {itemDiscount > 0 && <span className="text-rose-500 font-medium">- {fmt(itemDiscount)}</span>}
 </div>
 </div>
 )
 })}
 </div>

 <div className="space-y-1.5 text-[11px] text-slate-600 ">
 <div className="flex justify-between"><span>Subtotal:</span><span>{fmt(receiptData.subtotal)}</span></div>
 <div className="flex justify-between text-rose-500 font-semibold"><span>Diskon:</span><span>- {fmt(receiptData.discount)}</span></div>
 <div className="flex justify-between font-bold text-slate-900 text-xs border-t border-dashed border-slate-300 pt-2">
 <span>GRAND TOTAL:</span><span>{fmt(receiptData.total)}</span>
 </div>
 <div className="flex justify-between text-slate-600 text-[10px] pt-1"><span>Bayar ({payment}):</span><span>{fmt(receiptData.paidAmount)}</span></div>
 <div className="flex justify-between font-bold text-emerald-600 "><span>Kembalian:</span><span>{fmt(receiptData.changeAmount)}</span></div>
 </div>
 </div>

 <div className="text-[10px] text-slate-500 text-center font-medium">
 Struk dicetak otomatis melalui printer thermal
 </div>

 <div className="grid grid-cols-2 gap-3">
 <button
 type="button"
 onClick={handlePrintReceipt}
 className="rounded-xl border border-blue-600 text-blue-600 hover:bg-blue-50 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
 >
 <Printer size={13} />
 Cetak Ulang
 </button>
 <button
 type="button"
 onClick={handleResetPos}
 className="rounded-xl bg-blue-600 text-white py-2.5 text-xs font-bold hover:bg-blue-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-blue-500/10"
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
       className="w-full bg-blue-600 text-white rounded-xl py-3 px-4 shadow-lg shadow-blue-500/30 flex items-center justify-between font-bold text-xs hover:bg-blue-700 transition-colors cursor-pointer"
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
 </div>
 )
}
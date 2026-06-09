'use client'

import { useEffect, useState, useMemo } from 'react'
import { api } from '@/lib/api'
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
  Eye 
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

  // Form State
  const [supplierId, setSupplierId] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedProd, setSelectedProd] = useState('')
  const [qty, setQty] = useState(1)
  const [submitting, setSubmitting] = useState(false)

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('')

  // Detail View State
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null)
  const [isOpenDetail, setIsOpenDetail] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)

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
      <div className="space-y-6 p-6">
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
    <div className="space-y-6 p-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Transaksi Pembelian</h1>
          <p className="text-sm text-slate-500 mt-1">Catat dan monitoring pasokan stok barang masuk dari vendor supplier cabang toko.</p>
        </div>

        <button
          onClick={() => {
            setCart([])
            setSupplierId('')
            setOpen(true)
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 shadow-blue-500/10 transition-all active:scale-98 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Transaksi Baru
        </button>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nomor nota invoice atau nama vendor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 py-3 text-sm outline-none transition-all placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-50 shadow-sm"
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
          <Store className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Toko:</span>
          <select
            value={selectedStoreId}
            onChange={(e) => {
              setSelectedStoreId(e.target.value)
              localStorage.setItem('storeId', e.target.value)
            }}
            className="bg-transparent text-sm font-semibold text-slate-800 outline-none pr-2 cursor-pointer border-none p-0 focus:ring-0"
          >
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm text-slate-600">
            <thead className="bg-slate-50/70 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-100">
              <tr>
                <th scope="col" className="px-6 py-4">Nomor Invoice</th>
                <th scope="col" className="px-6 py-4">Waktu Masuk</th>
                <th scope="col" className="px-6 py-4">Vendor Supplier</th>
                <th scope="col" className="px-6 py-4">Total Pembayaran</th>
                <th scope="col" className="px-6 py-4 text-right">Opsi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loadingList ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800" />
                  </td>
                </tr>
              ) : filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-slate-400">
                        <Receipt className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-medium text-slate-600">Manifes pembelian masih kosong</p>
                      <p className="text-xs text-slate-400">Belum ada transaksi kulakan stok barang yang terdaftar.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((purchase) => (
                  <tr 
                    key={purchase.id} 
                    className="transition-colors hover:bg-slate-50/50 group cursor-pointer" 
                    onClick={() => handleOpenDetail(purchase)}
                  >
                    <td className="px-6 py-4 font-mono font-bold text-slate-900">{purchase.invoiceNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-500">
                      <div className="flex items-center gap-1.5 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(purchase.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-slate-400" />
                        <span className="font-semibold text-slate-800">{purchase.supplier?.name || 'Supplier'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-900 font-mono">
                      Rp {purchase.total.toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleOpenDetail(purchase)}
                        className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
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

      {/* Entry Modal */}
      {open && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl p-6 shadow-2xl space-y-6 max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Catat Kulakan Baru</h2>
                <p className="text-xs text-slate-500 mt-0.5">Input stok barang masuk dan hubungkan dengan vendor supplier.</p>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Supplier Selection */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Vendor Supplier</label>
              <div className="relative">
                <Building2 className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <select 
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2.5 text-sm outline-none transition-all appearance-none cursor-pointer focus:border-slate-400 focus:bg-white" 
                  value={supplierId}
                  onChange={e => setSupplierId(e.target.value)}
                >
                  <option value="">Pilih Supplier</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <div className="absolute right-3.5 top-3.5 pointer-events-none border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-500" />
              </div>
            </div>

            {/* Product Selector */}
            <div className="border-t border-slate-100 pt-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Pilih Barang & Kuantitas</label>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <Package className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <select 
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2.5 text-sm outline-none transition-all appearance-none cursor-pointer focus:border-slate-400 focus:bg-white" 
                    value={selectedProd} 
                    onChange={e => setSelectedProd(e.target.value)}
                  >
                    <option value="">Pilih Produk</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name} (Modal: Rp {p.costPrice.toLocaleString('id-ID')})</option>)}
                  </select>
                  <div className="absolute right-3.5 top-3.5 pointer-events-none border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-500" />
                </div>
                <input 
                  type="number" 
                  min="1"
                  className="w-full sm:w-28 rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm outline-none transition-all focus:border-slate-400 focus:bg-white" 
                  value={qty} 
                  onChange={e => setQty(Number(e.target.value))} 
                  placeholder="Qty"
                />
                <button 
                  onClick={addToCart} 
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 font-bold text-sm shadow-sm shadow-blue-500/10 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>
            </div>

            {/* Cart Items List */}
            <div className="border border-slate-150 rounded-2xl overflow-hidden bg-slate-50/30">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Keranjang Item</span>
                <span className="text-xs font-bold text-slate-500">{cart.length} Jenis Barang</span>
              </div>
              
              <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
                {cart.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 italic">Belum ada barang ditambahkan ke keranjang.</div>
                ) : (
                  cart.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-4 hover:bg-slate-50 transition-colors">
                      <div className="space-y-1">
                        <p className="font-bold text-sm text-slate-800">{item.name}</p>
                        <p className="text-xs text-slate-400 font-mono">
                          {item.quantity} x Rp {item.costPrice.toLocaleString('id-ID')}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-sm text-slate-900 font-mono">
                          Rp {(item.quantity * item.costPrice).toLocaleString('id-ID')}
                        </span>
                        <button 
                          onClick={() => removeFromCart(item.productId)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Hapus item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-slate-150 p-4 bg-slate-50/50 flex justify-between items-center font-bold text-slate-800">
                <span className="text-sm">Total Keseluruhan</span>
                <span className="text-base text-slate-900 font-mono">Rp {grandTotal.toLocaleString('id-ID')}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4 mt-6">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={submit}
                disabled={submitting || cart.length === 0}
                className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 shadow-md shadow-blue-500/10 transition-all disabled:opacity-40 cursor-pointer"
              >
                {submitting ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
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

      {/* Detail Modal */}
      {isOpenDetail && selectedPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-100 bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-slate-500" />
                <h3 className="text-base font-bold text-slate-900">Rincian Nota Kulakan</h3>
              </div>
              <button onClick={() => setIsOpenDetail(false)} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 p-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 font-mono text-xs text-slate-700 space-y-3">
              <div className="text-center border-b border-dashed border-slate-200 pb-2">
                <p className="font-bold text-sm text-slate-900 uppercase">FAKTUR KULAKAN (MASUK)</p>
                <p className="text-[10px] text-slate-400 mt-0.5">ID: {selectedPurchase.invoiceNumber}</p>
              </div>

              <div className="space-y-1 text-slate-500">
                <p><span className="font-semibold text-slate-700">Waktu Masuk:</span> {new Date(selectedPurchase.createdAt).toLocaleString('id-ID')}</p>
                <p><span className="font-semibold text-slate-700">Supplier   :</span> {selectedPurchase.supplier?.name || 'Supplier'}</p>
                {selectedPurchase.supplier?.phone && (
                  <p><span className="font-semibold text-slate-700">Kontak     :</span> {selectedPurchase.supplier.phone}</p>
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
                    <div key={item.id} className="flex justify-between items-start gap-4">
                      <div>
                        <p className="font-bold text-slate-900">{item.product?.name || 'Produk'}</p>
                        <p className="text-[10px] text-slate-400">{item.quantity} x Rp {item.costPrice.toLocaleString('id-ID')}</p>
                      </div>
                      <p className="font-bold text-slate-900">Rp {(item.quantity * item.costPrice).toLocaleString('id-ID')}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="flex justify-between font-bold text-slate-900 text-sm pt-1.5">
                <span>TOTAL KULAKAN:</span>
                <span>Rp {selectedPurchase.total.toLocaleString('id-ID')}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-5">
              <button 
                onClick={() => setIsOpenDetail(false)}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 shadow-md shadow-blue-500/10 transition-all cursor-pointer"
              >
                Tutup Rincian
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
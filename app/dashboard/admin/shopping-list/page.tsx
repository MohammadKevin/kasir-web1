'use client'

import { useEffect, useState, useMemo } from 'react'
import { api } from '@/lib/api'
import {
  ShoppingCart,
  Search,
  Plus,
  Trash2,
  X,
  ChevronDown,
  Loader2,
  Building2,
  Tag,
  Boxes,
  Store,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  HelpCircle
} from 'lucide-react'

type ShoppingItem = {
  id: string
  productName: string
  brand: string
  supplierName: string
  quantity: number
  unit: string
  price: number
}

type StoreType = {
  id: string
  name: string
}

type ProductType = {
  id: string
  name: string
  costPrice: number
  category?: { name: string }
}

type SupplierType = {
  id: string
  name: string
}

export default function ShoppingListPage() {
  // Master Store Data
  const [stores, setStores] = useState<StoreType[]>([])
  const [selectedStoreId, setSelectedStoreId] = useState<string>('')
  
  // API Autosuggest data
  const [products, setProducts] = useState<ProductType[]>([])
  const [suppliers, setSuppliers] = useState<SupplierType[]>([])
  
  // UI states
  const [loading, setLoading] = useState<boolean>(true)
  const [loadingData, setLoadingData] = useState<boolean>(false)
  
  // Table Items
  const [items, setItems] = useState<ShoppingItem[]>([])
  
  // Search Filters
  const [searchProduct, setSearchProduct] = useState<string>('')
  const [searchBrand, setSearchBrand] = useState<string>('')
  const [searchSupplier, setSearchSupplier] = useState<string>('')
  
  // Management Modal
  const [isOpenModal, setIsOpenModal] = useState<boolean>(false)
  const [modalItems, setModalItems] = useState<ShoppingItem[]>([])
  
  // Autocomplete positioning tracker
  const [focusedRowIdx, setFocusedRowIdx] = useState<number | null>(null)
  const [focusedField, setFocusedField] = useState<'product' | 'supplier' | null>(null)

  useEffect(() => {
    initPage()
  }, [])

  useEffect(() => {
    if (selectedStoreId) {
      loadStoreData(selectedStoreId)
      loadShoppingList(selectedStoreId)
    }
  }, [selectedStoreId])

  async function initPage() {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const headers = { Authorization: `Bearer ${token}` }
      const res = await api.get('/stores', { headers })
      setStores(res.data)

      const cachedStoreId = localStorage.getItem('storeId')
      const initialStoreId = res.data.find((s: StoreType) => s.id === cachedStoreId)?.id || res.data[0]?.id || ''
      if (initialStoreId) {
        setSelectedStoreId(initialStoreId)
      } else {
        setLoading(false)
      }
    } catch (err) {
      console.error('Gagal menginisialisasi Toko:', err)
      setLoading(false)
    }
  }

  async function loadStoreData(storeId: string) {
    setLoadingData(true)
    try {
      const token = localStorage.getItem('token')
      const headers = { Authorization: `Bearer ${token}` }
      const [prodRes, suppRes] = await Promise.all([
        api.get(`/products/store/${storeId}`, { headers }),
        api.get(`/suppliers/store/${storeId}`, { headers })
      ])
      setProducts(prodRes.data || [])
      setSuppliers(suppRes.data || [])
    } catch (err) {
      console.error('Gagal memuat katalog produk/supplier:', err)
    } finally {
      setLoadingData(false)
      setLoading(false)
    }
  }

  function loadShoppingList(storeId: string) {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`shopping_list_items_${storeId}`)
      if (saved) {
        try {
          setItems(JSON.parse(saved))
        } catch (e) {
          console.error('Error parsing shopping list localstorage', e)
          setItems([])
        }
      } else {
        setItems([])
      }
    }
  }

  function saveShoppingList(storeId: string, newList: ShoppingItem[]) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`shopping_list_items_${storeId}`, JSON.stringify(newList))
      setItems(newList)
    }
  }

  // Filtered shopping list items based on 3 criteria
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchProd = item.productName.toLowerCase().includes(searchProduct.toLowerCase())
      const matchBrand = item.brand.toLowerCase().includes(searchBrand.toLowerCase())
      const matchSupp = item.supplierName.toLowerCase().includes(searchSupplier.toLowerCase())
      return matchProd && matchBrand && matchSupp
    })
  }, [items, searchProduct, searchBrand, searchSupplier])

  // Open modal and load existing list items for editing
  function handleOpenManageModal() {
    setFocusedRowIdx(null)
    setFocusedField(null)
    if (items.length > 0) {
      setModalItems(JSON.parse(JSON.stringify(items))) // deep copy
    } else {
      // Start with 1 empty row
      setModalItems([{
        id: crypto.randomUUID(),
        productName: '',
        brand: '',
        supplierName: '',
        quantity: 1,
        unit: 'Pcs',
        price: 0
      }])
    }
    setIsOpenModal(true)
  }

  // Add row to modal
  function handleAddModalRow() {
    setModalItems(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        productName: '',
        brand: '',
        supplierName: '',
        quantity: 1,
        unit: 'Pcs',
        price: 0
      }
    ])
  }

  // Delete row in modal
  function handleDeleteModalRow(id: string) {
    setModalItems(prev => prev.filter(item => item.id !== id))
  }

  // Modify field in modal items
  function handleUpdateModalItem(idx: number, field: keyof ShoppingItem, val: any) {
    setModalItems(prev => {
      const copy = [...prev]
      copy[idx] = {
        ...copy[idx],
        [field]: val
      }
      return copy
    })
  }

  // Autocomplete select hooks
  function handleSelectProductSuggestion(idx: number, prod: ProductType) {
    setModalItems(prev => {
      const copy = [...prev]
      copy[idx] = {
        ...copy[idx],
        productName: prod.name,
        brand: prod.category?.name || 'Umum',
        price: prod.costPrice || 0
      }
      return copy
    })
    setFocusedRowIdx(null)
    setFocusedField(null)
  }

  function handleSelectSupplierSuggestion(idx: number, supp: SupplierType) {
    setModalItems(prev => {
      const copy = [...prev]
      copy[idx] = {
        ...copy[idx],
        supplierName: supp.name
      }
      return copy
    })
    setFocusedRowIdx(null)
    setFocusedField(null)
  }

  // Autocomplete lists
  const getProductSuggestions = (val: string) => {
    if (!val) return []
    return products.filter(p => p.name.toLowerCase().includes(val.toLowerCase())).slice(0, 5)
  }

  const getSupplierSuggestions = (val: string) => {
    if (!val) return []
    return suppliers.filter(s => s.name.toLowerCase().includes(val.toLowerCase())).slice(0, 5)
  }

  // Save Modal changes
  function handleSaveModal() {
    // Validate required fields (Nama Produk, Brand, Jumlah, Satuan)
    const invalidItem = modalItems.find(
      item => !item.productName.trim() || !item.brand.trim() || !item.quantity || !item.unit.trim()
    )

    if (invalidItem) {
      alert('Mohon isi semua kolom yang bertanda bintang (*) wajib diisi!')
      return
    }

    // Sanitize values
    const sanitized = modalItems.map(item => ({
      ...item,
      productName: item.productName.trim(),
      brand: item.brand.trim(),
      supplierName: item.supplierName.trim(),
      quantity: Number(item.quantity) || 0,
      unit: item.unit.trim(),
      price: Number(item.price) || 0
    }))

    saveShoppingList(selectedStoreId, sanitized)
    setIsOpenModal(false)
  }

  // Format currency
  const fmt = (n: number) => n.toLocaleString('id-ID')

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
        <div className="h-96 w-full animate-pulse rounded-2xl bg-slate-50 border border-slate-150" />
      </div>
    )
  }

  if (!loading && stores.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50/70 text-amber-600 border border-amber-200/50 shadow-sm mb-4">
          <Store className="w-8 h-8" />
        </div>
        <h3 className="text-sm font-black text-slate-900 mb-2">Belum Ada Toko Terdaftar</h3>
        <p className="text-xs text-slate-400 max-w-sm mb-6">
          Anda perlu mendaftarkan setidaknya satu cabang toko terlebih dahulu sebelum dapat mengelola daftar belanja.
        </p>
        <a
          href="/dashboard/admin/stores"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-xs font-bold text-white shadow-3xs hover:bg-indigo-700 transition-all cursor-pointer"
        >
          Kelola Toko Sekarang
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 bg-cyan-50 border border-cyan-100/55 rounded-xl flex items-center justify-center text-cyan-600 shrink-0">
            <ShoppingCart size={20} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Daftar Belanja</h1>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">Kelola daftar produk belanja yang perlu dibeli dari supplier.</p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="relative">
            <select
              value={selectedStoreId}
              onChange={(e) => {
                setSelectedStoreId(e.target.value)
                localStorage.setItem('storeId', e.target.value)
              }}
              className="appearance-none bg-white border border-slate-250/70 pl-4 pr-10 py-2.5 rounded-full text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none focus:ring-4 focus:ring-cyan-500/10 cursor-pointer transition-all shadow-3xs"
            >
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          <button
            onClick={handleOpenManageModal}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#00aec5] hover:bg-[#0092a5] px-5 py-2.5 text-xs font-bold text-white transition-all shadow-3xs hover:shadow-sm active:scale-97 cursor-pointer shrink-0"
          >
            Kelola Daftar Belanja
          </button>
        </div>
      </div>

      {/* Real-time Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Produk Search */}
        <div className="relative">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari Produk..."
            value={searchProduct}
            onChange={(e) => setSearchProduct(e.target.value)}
            className="w-full rounded-xl border border-slate-200/80 bg-white pl-11 pr-11 py-3 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-4 focus:ring-cyan-500/10 transition-all shadow-3xs"
          />
          {searchProduct && (
            <button
              onClick={() => setSearchProduct('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Brand Search */}
        <div className="relative">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari Brand..."
            value={searchBrand}
            onChange={(e) => setSearchBrand(e.target.value)}
            className="w-full rounded-xl border border-slate-200/80 bg-white pl-11 pr-11 py-3 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-4 focus:ring-cyan-500/10 transition-all shadow-3xs"
          />
          {searchBrand && (
            <button
              onClick={() => setSearchBrand('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Supplier Search */}
        <div className="relative">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari Supplier..."
            value={searchSupplier}
            onChange={(e) => setSearchSupplier(e.target.value)}
            className="w-full rounded-xl border border-slate-200/80 bg-white pl-11 pr-11 py-3 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-4 focus:ring-cyan-500/10 transition-all shadow-3xs"
          />
          {searchSupplier && (
            <button
              onClick={() => setSearchSupplier('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Main Table Grid */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-3xs overflow-hidden">
        {loadingData ? (
          <div className="p-16 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-cyan-600 mx-auto" />
            <p className="text-xs font-semibold text-slate-400 mt-2">Sinkronisasi data katalog...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          /* Empty State matches design exactly */
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-slate-50 border border-slate-100 text-slate-350">
              <ShoppingCart size={38} className="stroke-[1.25]" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 mb-2">Daftar Belanja</h3>
            <p className="text-xs text-slate-400 max-w-lg mb-6 leading-relaxed font-semibold">
              Dengan mengisi daftar belanja yang biasanya menjadi keperluan bisnis Anda, kami dapat membantu Anda dengan memberikan penawaran harga dan produk menarik dari Foodia.
            </p>
            <button
              onClick={handleOpenManageModal}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#00aec5] hover:bg-[#0092a5] px-6 py-2.5 text-xs font-bold text-white shadow-3xs hover:shadow-md active:scale-97 transition-all cursor-pointer"
            >
              Kelola Daftar Belanja
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-900 text-white font-bold uppercase tracking-wider text-[9px]">
                  <th className="p-4 pl-6">Produk</th>
                  <th className="p-4">Brand</th>
                  <th className="p-4">Supplier</th>
                  <th className="p-4">Jumlah</th>
                  <th className="p-4">Satuan</th>
                  <th className="p-4 pr-6">Harga Satuan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600 font-semibold">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 pl-6 whitespace-nowrap">
                      <span className="font-extrabold text-slate-900">{item.productName}</span>
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200/60 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-lg">
                        {item.brand}
                      </span>
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      {item.supplierName ? (
                        <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-50 border border-slate-200 px-2.5 py-1 text-[10px] font-extrabold text-slate-700">
                          {item.supplierName}
                        </span>
                      ) : (
                        <span className="text-slate-350 font-normal italic">Tidak ada supplier</span>
                      )}
                    </td>
                    <td className="p-4 font-mono text-slate-900 whitespace-nowrap">
                      {item.quantity}
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <span className="text-slate-500">{item.unit}</span>
                    </td>
                    <td className="p-4 pr-6 font-mono text-slate-600 whitespace-nowrap">
                      Rp {fmt(item.price)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer Total Product stats */}
      <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl p-4 shadow-3xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">Total Produk</span>
          <span className="rounded-full bg-cyan-50 border border-cyan-100 text-cyan-600 px-2.5 py-0.5 text-xs font-black">
            {filteredItems.length}
          </span>
        </div>
      </div>

      {/* Kelola Daftar Belanja Modal */}
      {isOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs transition-all animate-in fade-in duration-200">
          <div className="w-full max-w-5xl bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200/80 flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-6 pb-4 flex items-start justify-between border-b border-slate-100 shrink-0">
              <div>
                <h3 className="text-sm font-black text-slate-900">Kelola Daftar Belanja</h3>
                <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Kelola item daftar belanjaan Anda. Gunakan autosuggest produk untuk melengkapi baris secara otomatis.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpenModal(false)}
                className="h-8 w-8 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {/* Modal Scrollable Content Container */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-3xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-white font-bold uppercase tracking-wider text-[9px]">
                      <th className="p-3 w-1/4">Nama Produk *</th>
                      <th className="p-3 w-1/6">Brand *</th>
                      <th className="p-3 w-1/6">Supplier</th>
                      <th className="p-3 w-[10%]">Jumlah *</th>
                      <th className="p-3 w-[10%]">Satuan *</th>
                      <th className="p-3 w-1/6">Harga Satuan</th>
                      <th className="p-3 w-12 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {modalItems.map((item, idx) => {
                      const showProductSuggestions =
                        focusedRowIdx === idx && focusedField === 'product'
                      const showSupplierSuggestions =
                        focusedRowIdx === idx && focusedField === 'supplier'
                      
                      const filteredProds = getProductSuggestions(item.productName)
                      const filteredSupps = getSupplierSuggestions(item.supplierName)

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/30 transition-colors">
                          {/* Nama Produk with Suggestion */}
                          <td className="p-2 relative align-middle">
                            <input
                              type="text"
                              value={item.productName}
                              onChange={(e) => {
                                handleUpdateModalItem(idx, 'productName', e.target.value)
                                setFocusedRowIdx(idx)
                                setFocusedField('product')
                              }}
                              onFocus={() => {
                                setFocusedRowIdx(idx)
                                setFocusedField('product')
                              }}
                              onBlur={() => {
                                // Delayed to let mouse click click the suggestions list
                                setTimeout(() => {
                                  if (focusedRowIdx === idx && focusedField === 'product') {
                                    setFocusedRowIdx(null)
                                    setFocusedField(null)
                                  }
                                }, 200)
                              }}
                              placeholder="Ketik nama produk..."
                              className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-cyan-500 bg-slate-50/50 focus:bg-white transition-all placeholder:text-slate-400"
                            />
                            {showProductSuggestions && filteredProds.length > 0 && (
                              <div className="absolute left-2 right-2 top-[90%] mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1 scrollbar-thin">
                                {filteredProds.map(p => (
                                  <button
                                    key={p.id}
                                    type="button"
                                    onMouseDown={() => handleSelectProductSuggestion(idx, p)}
                                    className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-[11px] font-semibold text-slate-700 flex flex-col gap-0.5"
                                  >
                                    <span className="font-extrabold text-slate-900">{p.name}</span>
                                    <span className="text-[9px] text-slate-400 font-semibold">{p.category?.name || 'Katalog'} • Rp {fmt(p.costPrice)}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </td>

                          {/* Brand */}
                          <td className="p-2 align-middle">
                            <input
                              type="text"
                              value={item.brand}
                              onChange={(e) => handleUpdateModalItem(idx, 'brand', e.target.value)}
                              placeholder="Brand (wajib)"
                              className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-cyan-500 bg-slate-50/50 focus:bg-white transition-all placeholder:text-slate-400"
                            />
                          </td>

                          {/* Supplier with Suggestion */}
                          <td className="p-2 relative align-middle">
                            <input
                              type="text"
                              value={item.supplierName}
                              onChange={(e) => {
                                handleUpdateModalItem(idx, 'supplierName', e.target.value)
                                setFocusedRowIdx(idx)
                                setFocusedField('supplier')
                              }}
                              onFocus={() => {
                                setFocusedRowIdx(idx)
                                setFocusedField('supplier')
                              }}
                              onBlur={() => {
                                setTimeout(() => {
                                  if (focusedRowIdx === idx && focusedField === 'supplier') {
                                    setFocusedRowIdx(null)
                                    setFocusedField(null)
                                  }
                                }, 200)
                              }}
                              placeholder="Ketik supplier..."
                              className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-cyan-500 bg-slate-50/50 focus:bg-white transition-all placeholder:text-slate-400"
                            />
                            {showSupplierSuggestions && filteredSupps.length > 0 && (
                              <div className="absolute left-2 right-2 top-[90%] mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1 scrollbar-thin">
                                {filteredSupps.map(s => (
                                  <button
                                    key={s.id}
                                    type="button"
                                    onMouseDown={() => handleSelectSupplierSuggestion(idx, s)}
                                    className="w-full text-left px-3 py-2 hover:bg-slate-50 text-[11px] font-extrabold text-slate-800"
                                  >
                                    {s.name}
                                  </button>
                                ))}
                              </div>
                            )}
                          </td>

                          {/* Jumlah */}
                          <td className="p-2 align-middle">
                            <input
                              type="number"
                              min="0.01"
                              step="any"
                              value={item.quantity || ''}
                              onChange={(e) => handleUpdateModalItem(idx, 'quantity', e.target.value === '' ? '' : Number(e.target.value))}
                              placeholder="0"
                              className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-cyan-500 bg-slate-50/50 focus:bg-white transition-all placeholder:text-slate-400 font-mono"
                            />
                          </td>

                          {/* Satuan */}
                          <td className="p-2 align-middle">
                            <input
                              type="text"
                              value={item.unit}
                              onChange={(e) => handleUpdateModalItem(idx, 'unit', e.target.value)}
                              placeholder="Pcs"
                              className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-cyan-500 bg-slate-50/50 focus:bg-white transition-all placeholder:text-slate-400"
                            />
                          </td>

                          {/* Harga Satuan */}
                          <td className="p-2 align-middle">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={item.price || ''}
                              onChange={(e) => handleUpdateModalItem(idx, 'price', e.target.value === '' ? '' : Number(e.target.value))}
                              placeholder="0"
                              className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-cyan-500 bg-slate-50/50 focus:bg-white transition-all placeholder:text-slate-400 font-mono"
                            />
                          </td>

                          {/* Delete row */}
                          <td className="p-2 text-center align-middle">
                            <button
                              type="button"
                              onClick={() => handleDeleteModalRow(item.id)}
                              disabled={modalItems.length <= 1}
                              className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Add row under table */}
              <button
                type="button"
                onClick={handleAddModalRow}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-600 hover:text-cyan-700 transition-colors select-none cursor-pointer pl-1"
              >
                <Plus size={14} />
                <span>Tambah Produk</span>
              </button>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-100 bg-slate-50/50 shrink-0 flex items-center justify-between">
              <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
                <span className="font-bold text-slate-700">{modalItems.length} Produk</span>
                <span className="w-px h-4 bg-slate-200" />
                <div className="flex items-center gap-1 text-slate-400">
                  <span className="text-red-500 font-bold">*</span>
                  <span>Kolom wajib diisi</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddModalRow}
                  className="rounded-full border border-slate-200 bg-white hover:bg-slate-50 px-5 py-2.5 text-xs font-bold text-slate-700 transition-all active:scale-97 cursor-pointer"
                >
                  Tambah Produk
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpenModal(false)}
                  className="rounded-full border border-slate-200 bg-white hover:bg-slate-50 px-5 py-2.5 text-xs font-bold text-slate-600 transition-all active:scale-97 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveModal}
                  className="rounded-full bg-[#00aec5] hover:bg-[#0092a5] px-6 py-2.5 text-xs font-bold text-white transition-all shadow-3xs active:scale-97 cursor-pointer"
                >
                  Simpan
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}

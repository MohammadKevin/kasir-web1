'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import {
  FileText,
  Search,
  Plus,
  Edit3,
  Trash2,
  X,
  Store,
  Layers,
  Package,
  Loader2,
  ChevronDown,
  Scale,
  Sparkles,
  ClipboardList,
  Check
} from 'lucide-react'

type Ingredient = {
  id: string
  storeId: string
  name: string
  stock: number
  unit: string
}

type StoreType = {
  id: string
  name: string
}

type Product = {
  id: string
  storeId: string
  name: string
  sku?: string
  sellingPrice: number
  stock: number
}

type RecipeItem = {
  id: string
  productId: string
  ingredientId: string
  quantity: number
  ingredient: Ingredient
}

export default function RecipePage() {
  const [stores, setStores] = useState<StoreType[]>([])
  const [selectedStoreId, setSelectedStoreId] = useState('')
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'ingredients' | 'recipes'>('ingredients')

  // Ingredient management state
  const [isOpenIngredModal, setIsOpenIngredModal] = useState(false)
  const [isSubmittingIngred, setIsSubmittingIngred] = useState(false)
  const [editingIngredId, setEditingIngredId] = useState<string | null>(null)
  const [ingredSearchQuery, setIngredSearchQuery] = useState('')
  const [ingredForm, setIngredForm] = useState({
    name: '',
    stock: 0,
    unit: 'gr'
  })

  // Recipe management state
  const [selectedProductId, setSelectedProductId] = useState('')
  const [currentRecipe, setCurrentRecipe] = useState<any[]>([])
  const [loadingRecipe, setLoadingRecipe] = useState(false)
  const [savingRecipe, setSavingRecipe] = useState(false)
  const [recipeSearchQuery, setRecipeSearchQuery] = useState('')

  useEffect(() => {
    initPage()
  }, [])

  useEffect(() => {
    if (selectedStoreId) {
      loadData(selectedStoreId)
    }
  }, [selectedStoreId])

  useEffect(() => {
    if (selectedProductId) {
      loadRecipe(selectedProductId)
    } else {
      setCurrentRecipe([])
    }
  }, [selectedProductId])

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
      console.error('Gagal menginisialisasi halaman resep:', error)
      setLoading(false)
    }
  }

  async function loadData(storeId: string) {
    setLoading(true)
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` }
      const [ingredsRes, productsRes] = await Promise.all([
        api.get(`/ingredients/store/${storeId}`, { headers }),
        api.get(`/products/store/${storeId}`, { headers })
      ])
      setIngredients(ingredsRes.data || [])
      setProducts(productsRes.data || [])
      if (productsRes.data.length > 0) {
        setSelectedProductId(productsRes.data[0].id)
      } else {
        setSelectedProductId('')
      }
    } catch (error) {
      console.error('Gagal memuat data resep/bahan baku:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadRecipe(productId: string) {
    setLoadingRecipe(true)
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` }
      const res = await api.get(`/ingredients/recipe/${productId}`, { headers })
      setCurrentRecipe(res.data || [])
    } catch (error) {
      console.error('Gagal memuat resep produk:', error)
    } finally {
      setLoadingRecipe(false)
    }
  }

  // Ingredient actions
  function handleOpenCreateIngred() {
    setEditingIngredId(null)
    setIngredForm({ name: '', stock: 0, unit: 'gr' })
    setIsOpenIngredModal(true)
  }

  function handleOpenEditIngred(item: Ingredient) {
    setEditingIngredId(item.id)
    setIngredForm({ name: item.name, stock: item.stock, unit: item.unit })
    setIsOpenIngredModal(true)
  }

  async function handleSubmitIngred(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmittingIngred(true)

    const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` }
    const payload = {
      storeId: selectedStoreId,
      name: ingredForm.name.trim(),
      stock: Number(ingredForm.stock),
      unit: ingredForm.unit.trim()
    }

    try {
      if (editingIngredId) {
        await api.patch(`/ingredients/${editingIngredId}`, payload, { headers })
      } else {
        await api.post('/ingredients', payload, { headers })
      }
      setIsOpenIngredModal(false)
      loadData(selectedStoreId)
    } catch (error: any) {
      alert(error.response?.data?.message || 'Gagal menyimpan bahan baku')
    } finally {
      setIsSubmittingIngred(false)
    }
  }

  async function handleRemoveIngred(id: string) {
    if (!confirm('Apakah Anda yakin ingin menghapus bahan baku ini? Hubungan resep yang menggunakannya juga akan terhapus.')) return

    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` }
      await api.delete(`/ingredients/${id}`, { headers })
      loadData(selectedStoreId)
    } catch (error) {
      console.error('Gagal menghapus bahan baku:', error)
    }
  }

  // Recipe actions
  function handleAddIngredientToRecipe(ingred: Ingredient) {
    const exist = currentRecipe.find(r => r.ingredientId === ingred.id)
    if (exist) return

    setCurrentRecipe(prev => [
      ...prev,
      {
        ingredientId: ingred.id,
        quantity: 0,
        ingredient: ingred
      }
    ])
  }

  function handleRemoveIngredientFromRecipe(ingredId: string) {
    setCurrentRecipe(prev => prev.filter(r => r.ingredientId !== ingredId))
  }

  function handleUpdateRecipeQuantity(ingredId: string, quantity: number) {
    setCurrentRecipe(prev =>
      prev.map(r => (r.ingredientId === ingredId ? { ...r, quantity: Math.max(0, quantity) } : r))
    )
  }

  async function handleSaveRecipe() {
    if (!selectedProductId) return
    setSavingRecipe(true)

    const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` }
    const payload = {
      items: currentRecipe.map(r => ({
        ingredientId: r.ingredientId,
        quantity: Number(r.quantity)
      }))
    }

    try {
      await api.post(`/ingredients/recipe/${selectedProductId}`, payload, { headers })
      alert('Resep produk berhasil disimpan!')
      loadRecipe(selectedProductId)
    } catch (error: any) {
      alert(error.response?.data?.message || 'Gagal menyimpan resep')
    } finally {
      setSavingRecipe(false)
    }
  }

  const filteredIngredients = ingredients.filter(i =>
    i.name.toLowerCase().includes(ingredSearchQuery.toLowerCase())
  )

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(recipeSearchQuery.toLowerCase())
  )

  if (loading && stores.length === 0) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 animate-pulse rounded-xl bg-slate-200" />
        <div className="h-96 w-full animate-pulse rounded-2xl bg-slate-100" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 bg-indigo-50 border border-indigo-100/55 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
            <Scale size={20} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Manajemen Resep & Bahan Baku (BOM)</h1>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">Kelola stok bahan mentah (ingredien) dan formulasikan resep pembuatan produk makanan, minuman, atau eceran.</p>
          </div>
        </div>

        <div className="relative shrink-0">
          <select
            value={selectedStoreId}
            onChange={(e) => {
              setSelectedStoreId(e.target.value)
              localStorage.setItem('storeId', e.target.value)
            }}
            className="w-full sm:w-60 appearance-none bg-white border border-slate-250/70 pl-4 pr-10 py-3 rounded-xl text-xs font-bold text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 cursor-pointer shadow-3xs"
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

      <div className="flex gap-2 border-b border-slate-200 pb-px">
        <button
          onClick={() => setActiveTab('ingredients')}
          className={`px-4 py-2 text-xs font-extrabold border-b-2 cursor-pointer transition-all ${
            activeTab === 'ingredients'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          Daftar Bahan Baku
        </button>
        <button
          onClick={() => setActiveTab('recipes')}
          className={`px-4 py-2 text-xs font-extrabold border-b-2 cursor-pointer transition-all ${
            activeTab === 'recipes'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          Formulasi Resep (BOM)
        </button>
      </div>

      {activeTab === 'ingredients' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative flex-1 w-full max-w-md">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari bahan baku..."
                value={ingredSearchQuery}
                onChange={e => setIngredSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs outline-none bg-white focus:border-indigo-500"
              />
            </div>
            <button
              onClick={handleOpenCreateIngred}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-755 transition-all shadow-3xs cursor-pointer active:scale-97"
            >
              <Plus size={14} />
              Tambah Bahan Baku
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-3xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider text-[10px]">
                  <th className="px-6 py-4">Nama Bahan</th>
                  <th className="px-6 py-4">Stok Saat Ini</th>
                  <th className="px-6 py-4">Satuan</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-bold text-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" />
                    </td>
                  </tr>
                ) : filteredIngredients.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-slate-400">
                      Bahan baku kosong. Klik tombol di kanan atas untuk menambahkan.
                    </td>
                  </tr>
                ) : (
                  filteredIngredients.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">{item.name}</td>
                      <td className={`px-6 py-4 font-mono ${item.stock <= 10 ? 'text-rose-600' : 'text-slate-800'}`}>
                        {item.stock}
                      </td>
                      <td className="px-6 py-4">{item.unit}</td>
                      <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEditIngred(item)}
                          className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => handleRemoveIngred(item.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'recipes' && (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 items-start">
          {/* Left Panel: Products List */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-3xs max-h-[70vh] flex flex-col">
            <h3 className="text-xs font-black text-slate-900">1. Pilih Produk</h3>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari produk..."
                value={recipeSearchQuery}
                onChange={e => setRecipeSearchQuery(e.target.value)}
                className="w-full pl-8 pr-4 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-500 font-semibold"
              />
            </div>
            <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 scrollbar-thin">
              {filteredProducts.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedProductId(p.id)}
                  className={`w-full text-left p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                    selectedProductId === p.id
                      ? 'bg-indigo-50 border-indigo-250 text-indigo-700 shadow-3xs'
                      : 'border-slate-100 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span className="truncate">{p.name}</span>
                  {selectedProductId === p.id && <Check size={12} className="shrink-0 text-indigo-600" />}
                </button>
              ))}
            </div>
          </div>

          {/* Right Panel: Recipe Builder */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-3xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  {selectedProductId 
                    ? `2. Formulasi Resep: ${products.find(p => p.id === selectedProductId)?.name}` 
                    : '2. Formulasi Resep'
                  }
                </h3>
                <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Tentukan bahan baku beserta takaran yang berkurang setiap kali produk ini terjual.</p>
              </div>

              {selectedProductId && (
                <button
                  onClick={handleSaveRecipe}
                  disabled={savingRecipe}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 transition-all shadow-3xs cursor-pointer active:scale-97 disabled:opacity-50 shrink-0"
                >
                  {savingRecipe ? <Loader2 size={13} className="animate-spin" /> : <ClipboardList size={13} />}
                  <span>Simpan Resep</span>
                </button>
              )}
            </div>

            {selectedProductId ? (
              <div className="grid grid-cols-1 xl:grid-cols-[1fr_260px] gap-6">
                {/* Recipe Ingredients Table */}
                <div className="space-y-4">
                  <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Bahan Formulasi Aktif</h4>
                  {loadingRecipe ? (
                    <div className="py-12 flex justify-center">
                      <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                    </div>
                  ) : currentRecipe.length === 0 ? (
                    <div className="border border-dashed border-slate-200 rounded-2xl p-12 text-center text-slate-400 text-xs font-semibold">
                      Belum ada bahan baku di resep ini. Pilih dari daftar di sebelah kanan untuk menambahkan.
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-3xs">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider text-[9px]">
                            <th className="px-4 py-3">Nama Bahan</th>
                            <th className="px-4 py-3">Takaran / Kebutuhan</th>
                            <th className="px-4 py-3">Satuan</th>
                            <th className="px-4 py-3 text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-bold text-slate-800">
                          {currentRecipe.map(r => (
                            <tr key={r.ingredientId}>
                              <td className="px-4 py-3">{r.ingredient.name}</td>
                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  step="any"
                                  value={r.quantity || ''}
                                  onChange={e => handleUpdateRecipeQuantity(r.ingredientId, Number(e.target.value))}
                                  placeholder="0.0"
                                  className="w-20 px-2 py-1 border border-slate-200 rounded text-xs outline-none bg-slate-50/50 focus:bg-white"
                                />
                              </td>
                              <td className="px-4 py-3 text-slate-500 font-normal">{r.ingredient.unit}</td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  onClick={() => handleRemoveIngredientFromRecipe(r.ingredientId)}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Available Ingredients Picker */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3 max-h-[50vh] flex flex-col">
                  <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <Sparkles size={13} className="text-indigo-600 animate-pulse" />
                    <span>Pilih Bahan Baku</span>
                  </h4>
                  <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 scrollbar-thin">
                    {ingredients.map(ing => {
                      const inRecipe = currentRecipe.some(r => r.ingredientId === ing.id)
                      return (
                        <button
                          key={ing.id}
                          disabled={inRecipe}
                          onClick={() => handleAddIngredientToRecipe(ing)}
                          className={`w-full text-left p-2 rounded-xl border text-xs font-semibold flex items-center justify-between cursor-pointer transition-all ${
                            inRecipe
                              ? 'bg-slate-100 border-slate-200/50 text-slate-400 opacity-60'
                              : 'bg-white border-slate-150 hover:border-indigo-400 text-slate-700 hover:-translate-y-px shadow-3xs'
                          }`}
                        >
                          <span>{ing.name}</span>
                          <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-50 border px-1.5 py-0.5 rounded leading-none">
                            {ing.unit}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-24 text-center text-slate-400 text-xs font-semibold">
                Silakan buat produk terlebih dahulu untuk memformulasikan resep.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Ingredient Create/Edit Modal */}
      {isOpenIngredModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-sm font-black text-slate-900">
                {editingIngredId ? 'Ubah Bahan Baku' : 'Tambah Bahan Baku Baru'}
              </h3>
              <button onClick={() => setIsOpenIngredModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSubmitIngred} className="mt-4 space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Nama Bahan</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Kopi Bubuk, Susu UHT"
                  value={ingredForm.name}
                  onChange={e => setIngredForm({ ...ingredForm, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 pl-3.5 pr-4 py-2.5 text-xs outline-none bg-slate-50/50 focus:bg-white focus:border-indigo-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Stok Awal</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={ingredForm.stock}
                    onChange={e => setIngredForm({ ...ingredForm, stock: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs outline-none bg-slate-50/50 focus:bg-white focus:border-indigo-500 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Satuan</label>
                  <select
                    value={ingredForm.unit}
                    onChange={e => setIngredForm({ ...ingredForm, unit: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs outline-none bg-slate-50/50 focus:bg-white focus:border-indigo-500 font-bold"
                  >
                    <option value="gr">Gram (gr)</option>
                    <option value="ml">Mililiter (ml)</option>
                    <option value="pcs">Pieces (pcs)</option>
                    <option value="kg">Kilogram (kg)</option>
                    <option value="liter">Liter (liter)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsOpenIngredModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingIngred}
                  className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-755 shadow-3xs cursor-pointer active:scale-97 disabled:opacity-40"
                >
                  {isSubmittingIngred ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

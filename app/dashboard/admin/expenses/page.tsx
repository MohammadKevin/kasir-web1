'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { 
  Wallet, Search, Plus, Edit3, Trash2, X, Store, Calendar, 
  FileText, Tag, ArrowDownCircle, Loader2
} from 'lucide-react'

type Expense = {
  id: string
  storeId: string
  title: string
  amount: number
  category: 'OPERATIONAL' | 'SALARY' | 'ELECTRICITY' | 'INTERNET' | 'RENT' | 'TRANSPORT' | 'OTHER'
  createdAt: string
}

type StoreType = {
  id: string
  name: string
}

function getCategoryBadgeClass(category: string) {
  switch (category) {
    case 'OPERATIONAL': return 'bg-blue-50 text-blue-600 border border-blue-100/50'
    case 'SALARY': return 'bg-indigo-50 text-indigo-600 border border-indigo-100/50'
    case 'ELECTRICITY': return 'bg-amber-50 text-amber-600 border border-amber-100/50'
    case 'INTERNET': return 'bg-sky-50 text-sky-600 border border-sky-100/50'
    case 'RENT': return 'bg-rose-50 text-rose-600 border border-rose-100/50'
    case 'TRANSPORT': return 'bg-emerald-50 text-emerald-600 border border-emerald-100/50'
    case 'OTHER': return 'bg-slate-100 text-slate-700 border border-slate-200'
    default: return 'bg-slate-100 text-slate-700 border border-slate-200'
  }
}

export default function ExpensePage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [stores, setStores] = useState<StoreType[]>([])
  const [selectedStoreId, setSelectedStoreId] = useState('')
  const [totalExpense, setTotalExpense] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('ALL')

  const [isOpenModal, setIsOpenModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    storeId: '',
    title: '',
    amount: 0,
    category: 'OPERATIONAL' as Expense['category'],
  })

  useEffect(() => {
    initPage()
  }, [])

  useEffect(() => {
    if (selectedStoreId) {
      loadExpenses(selectedStoreId)
      loadSummary(selectedStoreId)
    }
  }, [selectedStoreId])

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
      console.error(error)
      setLoading(false)
    }
  }

  async function loadExpenses(storeId: string) {
    if (!storeId) return
    setLoading(true)
    try {
      const res = await api.get(`/expenses/store/${storeId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      })
      setExpenses(res.data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  async function loadSummary(storeId: string) {
    if (!storeId) return
    try {
      const res = await api.get(`/expenses/summary/${storeId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      })
      setTotalExpense(res.data.totalExpense)
    } catch (error) {
      console.error(error)
    }
  }

  function handleOpenCreate() {
    setEditingId(null)
    setFormData({
      storeId: selectedStoreId,
      title: '',
      amount: 0,
      category: 'OPERATIONAL',
    })
    setIsOpenModal(true)
  }

  function handleOpenEdit(expense: Expense) {
    setEditingId(expense.id)
    setFormData({
      storeId: expense.storeId,
      title: expense.title,
      amount: expense.amount,
      category: expense.category,
    })
    setIsOpenModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` }

    try {
      if (editingId) {
        await api.patch(`/expenses/${editingId}`, {
          title: formData.title.trim(),
          amount: Number(formData.amount),
          category: formData.category,
        }, { headers })
      } else {
        await api.post('/expenses', {
          storeId: formData.storeId,
          title: formData.title.trim(),
          amount: Number(formData.amount),
          category: formData.category,
        }, { headers })
      }
      setIsOpenModal(false)
      loadExpenses(selectedStoreId)
      loadSummary(selectedStoreId)
    } catch (error: any) {
      const serverMessage = error.response?.data?.message
      alert(`Gagal menyimpan: ${Array.isArray(serverMessage) ? serverMessage.join(', ') : serverMessage}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function remove(id: string) {
    if (!confirm('Hapus catatan pengeluaran ini?')) return
    try {
      await api.delete(`/expenses/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      })
      loadExpenses(selectedStoreId)
      loadSummary(selectedStoreId)
    } catch (error: any) {
      console.error(error)
      const serverMessage = error.response?.data?.message
      alert(`Gagal menghapus pengeluaran: ${Array.isArray(serverMessage) ? serverMessage.join(', ') : serverMessage || error.message}`)
    }
  }

  const filteredExpenses = expenses.filter((e) => {
    const matchesSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = categoryFilter === 'ALL' || e.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  function getCategoryLabel(category: string) {
    switch (category) {
      case 'OPERATIONAL': return 'Operasional'
      case 'SALARY': return 'Gaji Karyawan'
      case 'ELECTRICITY': return 'Listrik'
      case 'INTERNET': return 'Internet'
      case 'RENT': return 'Sewa Tempat'
      case 'TRANSPORT': return 'Transportasi'
      case 'OTHER': return 'Lainnya'
      default: return category
    }
  }

  if (loading && stores.length === 0) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="h-9 w-44 animate-pulse rounded-xl bg-slate-200" />
            <div className="h-4 w-72 animate-pulse rounded-lg bg-slate-100" />
          </div>
          <div className="h-11 w-36 animate-pulse rounded-xl bg-slate-200" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-24 w-full animate-pulse rounded-2xl bg-slate-100 border border-slate-50" />
        </div>
        <div className="h-12 w-full max-w-md animate-pulse rounded-xl bg-slate-100" />
        <div className="h-96 w-full animate-pulse rounded-2xl bg-slate-50 border border-slate-100" />
      </div>
    )
  }

  if (!loading && stores.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 shadow-sm mb-4">
          <Store className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">Belum Ada Toko Terdaftar</h3>
        <p className="text-sm text-slate-500 max-w-sm mb-6">
          Anda perlu mendaftarkan setidaknya satu cabang toko terlebih dahulu sebelum dapat mencatat pengeluaran di halaman ini.
        </p>
        <a
          href="/dashboard/admin/stores"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-md hover:bg-blue-700 shadow-blue-500/10 transition-all active:scale-98 cursor-pointer"
        >
          Kelola Toko Sekarang
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Pengeluaran Toko</h1>
          <p className="text-sm text-slate-500 mt-1">Pencatatan biaya operasional dan cashflow keluar.</p>
        </div>
        <button onClick={handleOpenCreate} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 shadow-sm shadow-blue-500/10 transition-all cursor-pointer">
          <Plus className="w-4 h-4" /> Catat Pengeluaran
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border border-slate-100 rounded-2xl p-5 bg-white shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-red-50 rounded-2xl border border-red-100 text-red-600">
            <ArrowDownCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Pengeluaran</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5 font-mono">Rp {totalExpense.toLocaleString('id-ID')}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari deskripsi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-50 shadow-sm"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
            <Tag className="w-4 h-4 text-slate-400" />
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="bg-transparent text-sm font-semibold text-slate-800 outline-none pr-2 cursor-pointer border-none p-0">
              <option value="ALL">Semua Kategori</option>
              <option value="OPERATIONAL">Operasional</option>
              <option value="SALARY">Gaji</option>
              <option value="ELECTRICITY">Listrik</option>
              <option value="INTERNET">Internet</option>
              <option value="RENT">Sewa</option>
              <option value="TRANSPORT">Transport</option>
              <option value="OTHER">Lainnya</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
            <Store className="w-4 h-4 text-slate-400" />
            <select
              value={selectedStoreId}
              onChange={(e) => {
                setSelectedStoreId(e.target.value)
                localStorage.setItem('storeId', e.target.value)
              }}
              className="bg-transparent text-sm font-semibold text-slate-800 outline-none pr-2 cursor-pointer border-none p-0 focus:ring-0"
            >
              {stores.map((store) => (
                <option key={store.id} value={store.id}>{store.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm text-slate-600">
            <thead className="bg-slate-50/70 text-xs font-semibold uppercase text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Deskripsi</th>
                <th className="px-6 py-4">Kategori</th>
                <th className="px-6 py-4">Waktu</th>
                <th className="px-6 py-4">Biaya</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-6 py-4">
                      <div className="h-4 w-40 rounded bg-slate-200" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-6 w-20 rounded-full bg-slate-100" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-32 rounded bg-slate-100" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-24 rounded bg-slate-200" />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <div className="h-8 w-8 rounded bg-slate-100" />
                        <div className="h-8 w-8 rounded bg-slate-100" />
                      </div>
                    </td>
                  </tr>
                ))
              ) : filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-slate-450">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-slate-400">
                        <Wallet className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-medium text-slate-600">Belum ada catatan biaya</p>
                      <p className="text-xs text-slate-400">Catatan pengeluaran operasional outlet toko Anda akan tampil di sini.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-slate-50/50 group">
                    <td className="px-6 py-4 font-bold text-slate-900">{expense.title}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-xl text-xs font-semibold ${getCategoryBadgeClass(expense.category)}`}>
                        {getCategoryLabel(expense.category)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                      {new Date(expense.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-slate-950 whitespace-nowrap">
                      Rp {expense.amount.toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button 
                          onClick={() => handleOpenEdit(expense)} 
                          className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
                          title="Ubah Catatan Pengeluaran"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => remove(expense.id)} 
                          className="p-2 text-slate-400 hover:text-red-650 hover:bg-red-50 rounded-xl transition-all"
                          title="Hapus Catatan Pengeluaran"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-xl space-y-4 animate-in zoom-in-95 duration-150">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{editingId ? 'Ubah Rincian Biaya' : 'Catat Biaya Operasional'}</h3>
                <p className="text-xs text-slate-500 mt-0.5">Pencatatan pengeluaran dana kas keluar operasional outlet toko.</p>
              </div>
              <button 
                onClick={() => setIsOpenModal(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Penempatan Cabang Toko</label>
                <div className="relative">
                  <Store className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <select
                    required
                    disabled={!!editingId}
                    value={formData.storeId}
                    onChange={(e) => setFormData({ ...formData, storeId: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2.5 text-sm font-medium outline-none transition-all appearance-none cursor-pointer focus:border-slate-400 focus:bg-white disabled:opacity-60"
                  >
                    {stores.map((store) => (
                      <option key={store.id} value={store.id}>
                        {store.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3.5 top-3.5 pointer-events-none border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-500" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Deskripsi / Keperluan Biaya</label>
                <div className="relative">
                  <FileText className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Bayar tagihan listrik bulanan, sewa gedung"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2.5 text-sm outline-none transition-all focus:border-slate-400 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Kategori Pengeluaran</label>
                <div className="relative">
                  <Tag className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as Expense['category'] })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2.5 text-sm font-medium outline-none transition-all appearance-none cursor-pointer focus:border-slate-400 focus:bg-white"
                  >
                    <option value="OPERATIONAL">Operasional</option>
                    <option value="SALARY">Gaji Karyawan</option>
                    <option value="ELECTRICITY">Listrik</option>
                    <option value="INTERNET">Internet</option>
                    <option value="RENT">Sewa Tempat</option>
                    <option value="TRANSPORT">Transportasi</option>
                    <option value="OTHER">Lainnya</option>
                  </select>
                  <div className="absolute right-3.5 top-3.5 pointer-events-none border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-500" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Nominal Pengeluaran (Rp)</label>
                <div className="relative">
                  <Wallet className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="number"
                    required
                    min={1}
                    placeholder="Masukkan jumlah biaya pengeluaran..."
                    value={formData.amount || ''}
                    onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2.5 text-sm font-mono font-bold outline-none transition-all focus:border-slate-400 focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4 mt-6">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsOpenModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 shadow-blue-500/10 transition-all disabled:opacity-40 cursor-pointer"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Menyimpan...</span>
                    </div>
                  ) : editingId ? (
                    'Perbarui Catatan'
                  ) : (
                    'Simpan Catatan'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
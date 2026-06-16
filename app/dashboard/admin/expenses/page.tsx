'use client'

import { useEffect, useState, useMemo } from 'react'
import { api } from '@/lib/api'
import { 
  Wallet, Search, Plus, Edit3, Trash2, X, Store, Calendar, 
  FileText, Tag, ArrowDownCircle, Loader2, ChevronDown
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
    case 'OPERATIONAL': return 'bg-indigo-50 border border-indigo-150 text-indigo-700'
    case 'SALARY': return 'bg-emerald-50 border border-emerald-150 text-emerald-700'
    case 'ELECTRICITY': return 'bg-amber-50 border border-amber-150 text-amber-700'
    case 'INTERNET': return 'bg-sky-50 border border-sky-150 text-sky-700'
    case 'RENT': return 'bg-rose-50 border border-rose-150 text-rose-700'
    case 'TRANSPORT': return 'bg-violet-50 border border-violet-150 text-violet-700'
    case 'OTHER': return 'bg-slate-50 border border-slate-200 text-slate-600'
    default: return 'bg-slate-50 border border-slate-200 text-slate-600'
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
    createdAt: '',
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
      createdAt: '',
    })
    setIsOpenModal(true)
  }

  function handleOpenEdit(expense: Expense) {
    setEditingId(expense.id)
    
    // Format the expense.createdAt to yyyy-mm-dd for input type="date"
    const d = new Date(expense.createdAt)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const dateStr = `${yyyy}-${mm}-${dd}`

    setFormData({
      storeId: expense.storeId,
      title: expense.title,
      amount: expense.amount,
      category: expense.category,
      createdAt: dateStr,
    })
    setIsOpenModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.createdAt) return alert('Silakan pilih tanggal terlebih dahulu!')

    setIsSubmitting(true)
    const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` }

    try {
      if (editingId) {
        await api.patch(`/expenses/${editingId}`, {
          title: formData.title.trim(),
          amount: Number(formData.amount),
          category: formData.category,
          createdAt: new Date(formData.createdAt).toISOString(),
        }, { headers })
      } else {
        await api.post('/expenses', {
          storeId: formData.storeId,
          title: formData.title.trim(),
          amount: Number(formData.amount),
          category: formData.category,
          createdAt: new Date(formData.createdAt).toISOString(),
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

  const calculatedTotal = useMemo(() => {
    return filteredExpenses.reduce((sum, item) => sum + item.amount, 0)
  }, [filteredExpenses])

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
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="h-9 w-44 animate-pulse rounded-xl bg-slate-200" />
            <div className="h-4 w-72 animate-pulse rounded-lg bg-slate-100" />
          </div>
          <div className="h-11 w-36 animate-pulse rounded-xl bg-slate-200" />
        </div>
        <div className="h-24 w-full animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-96 w-full animate-pulse rounded-2xl bg-slate-50 border border-slate-100" />
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
          Anda perlu mendaftarkan setidaknya satu cabang toko terlebih dahulu sebelum dapat mencatat pengeluaran di halaman ini.
        </p>
        <a
          href="/dashboard/admin/stores"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-xs font-bold text-white shadow-3xs hover:bg-indigo-700 transition-all active:scale-98 cursor-pointer"
        >
          Kelola Toko Sekarang
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 bg-indigo-50 border border-indigo-100/55 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
            <Wallet size={20} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Pengeluaran Toko</h1>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">Pencatatan biaya pengeluaran operasional cabang toko dan audit cashflow keuangan keluar.</p>
          </div>
        </div>

        <button 
          onClick={handleOpenCreate} 
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white transition-all shadow-3xs hover:bg-indigo-700 active:scale-97 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" /> Catat Pengeluaran
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="border border-slate-200 rounded-2xl p-5 bg-white shadow-3xs flex items-center gap-4">
          <div className="p-3 bg-rose-50 rounded-xl border border-rose-100/50 text-rose-600 shrink-0">
            <ArrowDownCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Pengeluaran Cabang</p>
            <p className="text-xl font-black text-slate-900 mt-0.5 font-mono">Rp {totalExpense.toLocaleString('id-ID')}</p>
          </div>
        </div>

        <div className="border border-slate-200 rounded-2xl p-5 bg-white shadow-3xs flex items-center gap-4">
          <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100/50 text-indigo-600 shrink-0">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Jumlah Tersaring (Filter)</p>
            <p className="text-xl font-black text-slate-900 mt-0.5 font-mono">Rp {calculatedTotal.toLocaleString('id-ID')}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari deskripsi pengeluaran..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-250/70 bg-white pl-11 pr-11 py-3.5 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-3xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="relative shrink-0">
            <select 
              value={categoryFilter} 
              onChange={(e) => setCategoryFilter(e.target.value)} 
              className="w-full sm:w-48 appearance-none bg-white border border-slate-250/70 pl-4 pr-10 py-3.5 rounded-xl text-xs font-bold text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 cursor-pointer transition-all shadow-3xs"
            >
              <option value="ALL">Semua Kategori</option>
              <option value="OPERATIONAL">Operasional</option>
              <option value="SALARY">Gaji</option>
              <option value="ELECTRICITY">Listrik</option>
              <option value="INTERNET">Internet</option>
              <option value="RENT">Sewa</option>
              <option value="TRANSPORT">Transport</option>
              <option value="OTHER">Lainnya</option>
            </select>
            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          <div className="relative shrink-0">
            <select
              value={selectedStoreId}
              onChange={(e) => {
                setSelectedStoreId(e.target.value)
                localStorage.setItem('storeId', e.target.value)
              }}
              className="w-full sm:w-56 appearance-none bg-white border border-slate-250/70 pl-4 pr-10 py-3.5 rounded-xl text-xs font-bold text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 cursor-pointer transition-all shadow-3xs"
            >
              {stores.map((store) => (
                <option key={store.id} value={store.id}>{store.name}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-3xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                <th className="p-4 pl-6">Deskripsi Pengeluaran</th>
                <th className="p-4">Kategori</th>
                <th className="p-4">Waktu Transaksi</th>
                <th className="p-4">Biaya Keluar</th>
                <th className="p-4 pr-6 text-right">Aksi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-600 font-semibold">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center">
                    <Loader2 className="w-5 h-5 animate-spin text-slate-400 mx-auto" />
                  </td>
                </tr>
              ) : filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="p-3 bg-slate-50 border border-slate-150 rounded-2xl text-slate-400">
                        <Wallet className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-bold text-slate-600">Belum ada catatan biaya</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((expense) => (
                  <tr key={expense.id} className="group hover:bg-slate-50/45 transition-colors">
                    <td className="p-4 pl-6 font-extrabold text-slate-900 text-xs sm:text-sm">{expense.title}</td>
                    <td className="p-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${getCategoryBadgeClass(expense.category)}`}>
                        {getCategoryLabel(expense.category)}
                      </span>
                    </td>
                    <td className="p-4 whitespace-nowrap text-slate-500 font-medium">
                      {new Date(expense.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                    </td>
                    <td className="p-4 font-mono font-bold text-slate-950 whitespace-nowrap">
                      Rp {expense.amount.toLocaleString('id-ID')}
                    </td>
                    <td className="p-4 pr-6 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => handleOpenEdit(expense)} 
                          className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
                          title="Ubah Catatan Pengeluaran"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => remove(expense.id)} 
                          className="p-1.5 text-slate-400 hover:text-rose-605 hover:bg-rose-50 rounded-lg transition-all"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-all animate-in fade-in duration-200">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-150 bg-white p-6 shadow-xl relative animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-black text-slate-900">{editingId ? 'Ubah Rincian Biaya' : 'Catat Biaya Operasional'}</h3>
                <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Pencatatan pengeluaran dana kas keluar operasional outlet toko.</p>
              </div>
              <button 
                onClick={() => setIsOpenModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Penempatan Cabang Toko</label>
                <div className="relative">
                  <Store className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  <select
                    required
                    disabled={!!editingId}
                    value={formData.storeId}
                    onChange={(e) => setFormData({ ...formData, storeId: e.target.value })}
                    className="w-full rounded-xl border border-slate-200/80 bg-slate-50/50 pl-10 pr-10 py-3 text-xs font-semibold text-slate-800 outline-none transition-all appearance-none cursor-pointer focus:border-indigo-500 focus:bg-white disabled:opacity-60"
                  >
                    {stores.map((store) => (
                      <option key={store.id} value={store.id}>
                        {store.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Tanggal Pengeluaran</label>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="date"
                    required
                    value={formData.createdAt}
                    onChange={(e) => setFormData({ ...formData, createdAt: e.target.value })}
                    className="w-full rounded-xl border border-slate-200/80 bg-slate-50/50 pl-10 pr-4 py-3 text-xs font-semibold outline-none transition-all focus:border-indigo-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Deskripsi / Keperluan Biaya</label>
                <div className="relative">
                  <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Pembelian alat tulis kantor, air mineral galon"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full rounded-xl border border-slate-200/80 bg-slate-50/50 pl-10 pr-4 py-3 text-xs font-semibold outline-none transition-all focus:border-indigo-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Kategori Pengeluaran</label>
                <div className="relative">
                  <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as Expense['category'] })}
                    className="w-full rounded-xl border border-slate-200/80 bg-slate-50/50 pl-10 pr-10 py-3 text-xs font-semibold text-slate-800 outline-none transition-all appearance-none cursor-pointer focus:border-indigo-500 focus:bg-white"
                  >
                    <option value="OPERATIONAL">Operasional</option>
                    <option value="SALARY">Gaji Karyawan</option>
                    <option value="ELECTRICITY">Listrik</option>
                    <option value="INTERNET">Internet</option>
                    <option value="RENT">Sewa Tempat</option>
                    <option value="TRANSPORT">Transportasi</option>
                    <option value="OTHER">Lainnya</option>
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Nominal Pengeluaran (Rp)</label>
                <div className="relative">
                  <Wallet className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="number"
                    required
                    min={1}
                    placeholder="Masukkan jumlah pengeluaran..."
                    value={formData.amount || ''}
                    onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-200/80 bg-slate-50/50 pl-10 pr-4 py-3 text-xs font-mono font-bold outline-none transition-all focus:border-indigo-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4 mt-6">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsOpenModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 shadow-indigo-500/10 transition-all cursor-pointer"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-1.5">
                      <Loader2 className="h-3 w-3 animate-spin text-white" />
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

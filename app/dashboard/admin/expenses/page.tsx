'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { 
  Wallet, Search, Plus, Edit3, Trash2, X, Store, Calendar, 
  FileText, Tag, ArrowDownCircle 
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
    } catch (error) {
      console.error(error)
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
              {filteredExpenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4 font-bold text-slate-900">{expense.title}</td>
                  <td className="px-6 py-4"><span className="px-2.5 py-1 rounded-xl bg-slate-100 text-xs font-semibold text-slate-700">{getCategoryLabel(expense.category)}</span></td>
                  <td className="px-6 py-4">{new Date(expense.createdAt).toLocaleString('id-ID')}</td>
                  <td className="px-6 py-4 font-mono font-bold text-slate-950">Rp {expense.amount.toLocaleString('id-ID')}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleOpenEdit(expense)} className="p-2 hover:bg-slate-100 rounded-xl"><Edit3 className="w-4 h-4" /></button>
                    <button onClick={() => remove(expense.id)} className="p-2 hover:bg-red-50 text-red-500 rounded-xl"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">{editingId ? 'Edit Biaya' : 'Catat Biaya'}</h3>
              <button onClick={() => setIsOpenModal(false)}><X size={20}/></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input type="text" required placeholder="Deskripsi" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full border rounded-xl p-2.5" />
              <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as Expense['category']})} className="w-full border rounded-xl p-2.5">
                <option value="OPERATIONAL">Operasional</option>
                <option value="SALARY">Gaji</option>
                <option value="ELECTRICITY">Listrik</option>
                <option value="INTERNET">Internet</option>
                <option value="RENT">Sewa</option>
                <option value="TRANSPORT">Transport</option>
                <option value="OTHER">Lainnya</option>
              </select>
              <input type="number" required placeholder="Nominal" value={formData.amount || ''} onChange={e => setFormData({...formData, amount: Number(e.target.value)})} className="w-full border rounded-xl p-2.5" />
              <button type="submit" className="w-full bg-blue-600 text-white rounded-xl py-2.5 font-bold hover:bg-blue-700 shadow-md shadow-blue-500/15 transition-all cursor-pointer">Simpan</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
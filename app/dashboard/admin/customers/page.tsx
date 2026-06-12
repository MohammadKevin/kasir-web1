'use client'

import { useEffect, useState, useMemo } from 'react'
import { api } from '@/lib/api'
import { 
  Users, 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  X, 
  Store, 
  Phone, 
  User, 
  Award,
  Receipt,
  Loader2,
  ChevronDown,
  Gift
} from 'lucide-react'

type Customer = {
  id: string
  storeId: string
  name: string
  phone?: string
  points: number
  transactions?: any[]
}

type StoreType = {
  id: string
  name: string
}

export default function CustomerPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [stores, setStores] = useState<StoreType[]>([])
  const [selectedStoreId, setSelectedStoreId] = useState('')
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const [isOpenModal, setIsOpenModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    storeId: '',
    name: '',
    phone: '',
  })

  useEffect(() => {
    initPage()
  }, [])

  useEffect(() => {
    if (selectedStoreId) {
      loadCustomers(selectedStoreId)
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
        setFormData((prev) => ({ ...prev, storeId: initialStoreId }))
      } else {
        setLoading(false)
      }
    } catch (error) {
      console.error('Gagal menginisialisasi halaman:', error)
      setLoading(false)
    }
  }

  async function loadCustomers(storeId: string) {
    setLoading(true)
    try {
      const res = await api.get(`/customers/store/${storeId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })
      setCustomers(res.data)
    } catch (error) {
      console.error('Gagal memuat data pelanggan:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleOpenCreate() {
    setEditingId(null)
    setFormData({
      storeId: selectedStoreId,
      name: '',
      phone: '',
    })
    setIsOpenModal(true)
  }

  function handleOpenEdit(customer: Customer) {
    setEditingId(customer.id)
    setFormData({
      storeId: customer.storeId,
      name: customer.name,
      phone: customer.phone || '',
    })
    setIsOpenModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)

    const headers = {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    }

    try {
      if (editingId) {
        const updatePayload: { name: string; phone?: string } = {
          name: formData.name.trim(),
        }
        if (formData.phone && formData.phone.trim() !== '') {
          updatePayload.phone = formData.phone.trim()
        }

        await api.patch(`/customers/${editingId}`, updatePayload, { headers })
      } else {
        const createPayload: { storeId: string; name: string; phone?: string } = {
          storeId: formData.storeId,
          name: formData.name.trim(),
        }
        if (formData.phone && formData.phone.trim() !== '') {
          createPayload.phone = formData.phone.trim()
        }

        await api.post('/customers', createPayload, { headers })
      }

      setIsOpenModal(false)
      loadCustomers(selectedStoreId)
    } catch (error: any) {
      if (error.response && error.response.data) {
        const serverMessage = error.response.data.message
        alert(`Gagal menyimpan data pelanggan: ${Array.isArray(serverMessage) ? serverMessage.join(', ') : serverMessage}`)
      } else {
        console.error('Gagal menyimpan pelanggan:', error)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  async function remove(id: string) {
    if (!confirm('Apakah Anda yakin ingin menghapus data pelanggan ini? Seluruh riwayat poin dan transaksi terkait tidak lagi terelasi.')) return

    try {
      await api.delete(`/customers/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })
      loadCustomers(selectedStoreId)
    } catch (error) {
      console.error('Gagal menghapus pelanggan:', error)
    }
  }

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.phone && c.phone.includes(searchQuery))
  )

  const stats = useMemo(() => {
    const totalMembers = filteredCustomers.length
    const totalPoints = filteredCustomers.reduce((acc, c) => acc + c.points, 0)
    const totalTransactions = filteredCustomers.reduce((acc, c) => acc + (c.transactions?.length || 0), 0)
    return { totalMembers, totalPoints, totalTransactions }
  }, [filteredCustomers])

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="h-24 rounded-2xl animate-pulse bg-slate-100" />
          <div className="h-24 rounded-2xl animate-pulse bg-slate-100" />
          <div className="h-24 rounded-2xl animate-pulse bg-slate-100" />
        </div>
        <div className="h-96 w-full animate-pulse rounded-2xl bg-slate-50 border border-slate-100" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 bg-indigo-50 border border-indigo-100/50 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
            <Users size={20} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Manajemen Pelanggan</h1>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">Kelola data keanggotaan pelanggan, monitoring akumulasi loyalty points, serta pelacakan riwayat transaksi belanja.</p>
          </div>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white transition-all shadow-3xs hover:bg-indigo-700 active:scale-97 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          Registrasi Pelanggan
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0 border border-indigo-100/50">
            <Users size={18} />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Member</div>
            <div className="text-xl font-extrabold text-slate-900 mt-0.5">{stats.totalMembers} Member</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0 border border-amber-100/50">
            <Award size={18} />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Akumulasi Poin</div>
            <div className="text-xl font-extrabold text-slate-900 mt-0.5">{stats.totalPoints.toLocaleString('id-ID')} Poin</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0 border border-emerald-100/50">
            <Receipt size={18} />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Transaksi Member</div>
            <div className="text-xl font-extrabold text-slate-900 mt-0.5">{stats.totalTransactions} Invoice</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari nama pelanggan atau nomor handphone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-250/70 bg-white pl-11 pr-11 py-3.5 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-3xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={15} />
            </button>
          )}
        </div>

        <div className="relative shrink-0">
          <select
            value={selectedStoreId}
            onChange={(e) => {
              setSelectedStoreId(e.target.value)
              setFormData((prev) => ({ ...prev, storeId: e.target.value }))
              localStorage.setItem('storeId', e.target.value)
            }}
            className="w-full sm:w-60 appearance-none bg-white border border-slate-250/70 pl-4 pr-10 py-3.5 rounded-xl text-xs font-bold text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 cursor-pointer transition-all shadow-3xs"
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

      {/* Main Table */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-3xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                <th className="p-4 pl-6">Data Member</th>
                <th className="p-4">Nomor Kontak</th>
                <th className="p-4">Loyalty Points</th>
                <th className="p-4">Total Belanja</th>
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
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-slate-400">
                        <Users className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-bold text-slate-500">Database member masih kosong</p>
                      <p className="text-[10px] text-slate-400">Belum ada profil pelanggan yang terdaftar pada cabang toko ini.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="group hover:bg-slate-50/45 transition-colors">
                    <td className="p-4 pl-6 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100/50 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                          <User className="w-4 h-4" />
                        </div>
                        <span className="font-extrabold text-slate-900 text-xs sm:text-sm">{customer.name}</span>
                      </div>
                    </td>

                    <td className="p-4 font-mono text-slate-600 whitespace-nowrap">
                      {customer.phone ? (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{customer.phone}</span>
                        </div>
                      ) : (
                        <span className="text-slate-300 italic font-normal">Tidak ada nomor</span>
                      )}
                    </td>

                    <td className="p-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50 border border-amber-200/60 px-2.5 py-1 text-[10px] font-extrabold text-amber-700">
                        <Award className="w-3.5 h-3.5 text-amber-500" />
                        {customer.points.toLocaleString('id-ID')} Poin
                      </span>
                    </td>

                    <td className="p-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-50 border border-slate-200 px-2.5 py-1 text-[10px] font-extrabold text-slate-700">
                        <Receipt className="w-3.5 h-3.5 text-slate-400" />
                        {customer.transactions?.length ?? 0} Transaksi
                      </span>
                    </td>

                    <td className="p-4 pr-6 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(customer)}
                          className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
                          title="Ubah Profil Pelanggan"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => remove(customer.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                          title="Hapus Data Pelanggan"
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

      {/* Register / Edit Modal */}
      {isOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-all">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-150 bg-white p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-150">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-black text-slate-900">{editingId ? 'Ubah Rincian Member' : 'Registrasi Member Baru'}</h3>
                <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Konfigurasi nama lengkap serta nomor kontak identifikasi pelanggan.</p>
              </div>
              <button 
                onClick={() => setIsOpenModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Penempatan Cabang Toko</label>
                <div className="relative">
                  <Store className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
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
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Nama Lengkap Pelanggan</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Laila Collections Member"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-xl border border-slate-200/80 bg-slate-50/50 pl-10 pr-4 py-3 text-xs font-semibold outline-none transition-all focus:border-indigo-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Nomor Handphone (Opsional)</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="tel"
                    placeholder="Contoh: 081234567890"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full rounded-xl border border-slate-200/80 bg-slate-50/50 pl-10 pr-4 py-3 text-xs font-semibold outline-none transition-all focus:border-indigo-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4 mt-6">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsOpenModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-all disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 shadow-indigo-500/10 transition-all disabled:opacity-40 cursor-pointer"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-1.5">
                      <Loader2 className="h-3 w-3 animate-spin text-white" />
                      <span>Menyimpan...</span>
                    </div>
                  ) : editingId ? (
                    'Perbarui Data'
                  ) : (
                    'Registrasi Member'
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

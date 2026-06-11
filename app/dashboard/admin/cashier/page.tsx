'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import {
  Users, 
  Phone, 
  ShieldCheck, 
  ShieldAlert, 
  Trash2, 
  UserPlus,
  Search, 
  X, 
  Lock, 
  Edit3, 
  Loader2, 
  User, 
  Smartphone, 
  ChevronRight, 
  ChevronDown
} from 'lucide-react'

type Cashier = { id: string; name: string; phone: string; isActive: boolean }
type StoreType = { id: string; name: string }

const EMPTY_FORM = { name: '', phone: '', pin: '' }

export default function CashierPage() {
  const [cashiers, setCashiers] = useState<Cashier[]>([])
  const [stores, setStores] = useState<StoreType[]>([])
  const [selectedStoreId, setSelectedStoreId] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [isOpenModal, setIsOpenModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(true)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => { 
    initPage() 
  }, [])

  async function initPage() {
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` }
      const { data } = await api.get('/stores', { headers })
      setStores(data)
      
      const cachedStoreId = localStorage.getItem('storeId')
      const initialStoreId = data.find((s: StoreType) => s.id === cachedStoreId)?.id || data[0]?.id || ''
      if (initialStoreId) {
        setSelectedStoreId(initialStoreId)
      }
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => { 
    if (selectedStoreId) loadCashiers() 
  }, [selectedStoreId])

  async function loadCashiers() {
    setLoading(true)
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` }
      const { data } = await api.get(`/cashier/store/${selectedStoreId}`, { headers })
      setCashiers(data)
    } catch (err) {
      console.error(err)
    } finally { 
      setLoading(false) 
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` }
    try {
      if (editingId) {
        await api.patch(`/cashier/${editingId}`, formData, { headers })
      } else {
        await api.post('/cashier', { ...formData, storeId: selectedStoreId }, { headers })
      }
      setIsOpenModal(false)
      loadCashiers()
    } catch (e: any) { 
      alert(e.response?.data?.message || 'Gagal menyimpan') 
    } finally { 
      setIsSubmitting(false) 
    }
  }

  async function toggleStatus(cashier: Cashier) {
    setTogglingId(cashier.id)
    try {
      await api.patch(`/cashier/${cashier.id}`, { isActive: !cashier.isActive }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      loadCashiers()
    } catch (err) {
      console.error(err)
    } finally { 
      setTogglingId(null) 
    }
  }

  async function remove(id: string) {
    if (!confirm('Hapus staf kasir ini secara permanen?')) return
    setDeletingId(id)
    try {
      await api.delete(`/cashier/${id}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      loadCashiers()
    } catch (err) {
      console.error(err)
    } finally { 
      setDeletingId(null) 
    }
  }

  const filtered = cashiers.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
  const activeCount = cashiers.filter(c => c.isActive).length

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 bg-blue-50 border border-blue-100/50 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
            <Users size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900">Manajemen Staf Kasir</h1>
              {!loading && (
                <span className="rounded-full bg-blue-50 border border-blue-100 text-blue-600 px-2 py-0.5 text-[10px] font-extrabold tracking-wide">
                  {cashiers.length}
                </span>
              )}
            </div>
            <p className="text-xs font-semibold text-slate-450 mt-0.5">Kelola akses kredensial login, PIN, dan status operasional staf kasir</p>
          </div>
        </div>

        <button 
          onClick={() => { setEditingId(null); setFormData(EMPTY_FORM); setIsOpenModal(true) }}
          className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-xs font-bold text-white transition-all shadow-3xs active:scale-97 cursor-pointer"
        >
          <UserPlus size={15} />
          <span>Tambah Kasir</span>
        </button>
      </div>

      {/* Toolbar / Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        
        {/* Search */}
        <div className="relative flex-1">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari nama kasir..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200/80 pl-11 pr-11 py-3.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-semibold"
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

        {/* Store selector */}
        <div className="relative shrink-0">
          <select 
            value={selectedStoreId} 
            onChange={e => {
              setSelectedStoreId(e.target.value)
              localStorage.setItem('storeId', e.target.value)
            }}
            className="w-full sm:w-60 appearance-none bg-white border border-slate-200/80 pl-4 pr-10 py-3.5 rounded-xl text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 cursor-pointer transition-all"
          >
            {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        {/* Status Counter overview */}
        {!loading && cashiers.length > 0 && (
          <div className="flex gap-2 shrink-0 sm:ml-auto">
            <div className="flex items-center gap-1.5 bg-emerald-50/50 border border-emerald-200/60 rounded-xl px-3 py-2 text-[10px] font-bold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>{activeCount} Aktif</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-100/60 border border-slate-200/60 rounded-xl px-3 py-2 text-[10px] font-bold text-slate-500">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
              <span>{cashiers.length - activeCount} Nonaktif</span>
            </div>
          </div>
        )}
      </div>

      {/* Table Data */}
      <div className="rounded-2xl border border-slate-200/70 bg-white shadow-3xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                <th className="p-4 pl-6">Nama Staf</th>
                <th className="p-4">Nomor Telepon</th>
                <th className="p-4">Status</th>
                <th className="p-4 pr-6 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-655 font-semibold">
              {loading ? (
                [1, 2, 3].map(i => (
                  <tr key={i}>
                    <td colSpan={4} className="p-5 pl-6">
                      <div className="h-4 animate-pulse rounded-lg bg-slate-100" style={{ width: `${60 + i * 10}%` }} />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-16 text-center text-slate-400">
                    <Users size={32} className="mx-auto text-slate-350 opacity-60 mb-3" />
                    <p className="text-xs font-bold text-slate-500">
                      {searchQuery ? 'Tidak ada staf kasir yang cocok' : 'Belum ada staf kasir terdaftar'}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {searchQuery ? 'Coba ubah filter atau kata kunci pencarian Anda' : 'Klik "Tambah Kasir" untuk mendaftarkan staf kasir baru di cabang ini'}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map(c => (
                  <tr key={c.id} className="group hover:bg-slate-50/45 transition-colors">
                    <td className="p-4 pl-6">
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center border shrink-0 ${
                          c.isActive ? 'bg-blue-50 border-blue-100 text-blue-600' : 'bg-slate-50 border-slate-200 text-slate-400'
                        }`}>
                          <User size={14} />
                        </div>
                        <span className="font-extrabold text-slate-900 text-xs">{c.name}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-slate-500">
                        <Smartphone size={12} className="text-slate-400" />
                        <span>{c.phone || '—'}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-bold border text-[9px] uppercase tracking-wider ${
                        c.isActive ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-400'
                      }`}>
                        <span className={`h-1 w-1 rounded-full ${c.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        {c.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="p-4 pr-6">
                      <div className="flex gap-1.5 opacity-80 md:opacity-0 md:group-hover:opacity-100 justify-end transition-all duration-200">
                        <button 
                          onClick={() => { setEditingId(c.id); setFormData({ name: c.name, phone: c.phone, pin: '' }); setIsOpenModal(true) }}
                          className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-slate-50 text-blue-600 hover:text-blue-700 transition-colors"
                          title="Edit Kasir"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button 
                          onClick={() => toggleStatus(c)}
                          disabled={togglingId === c.id}
                          className={`h-8 w-8 rounded-lg flex items-center justify-center hover:bg-slate-50 transition-colors disabled:opacity-50 ${c.isActive ? 'text-slate-400 hover:text-slate-650' : 'text-emerald-600 hover:text-emerald-700'}`}
                          title={c.isActive ? 'Nonaktifkan Kasir' : 'Aktifkan Kasir'}
                        >
                          {togglingId === c.id ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : c.isActive ? (
                            <ShieldAlert size={14} />
                          ) : (
                            <ShieldCheck size={14} />
                          )}
                        </button>
                        <button 
                          onClick={() => remove(c.id)}
                          disabled={deletingId === c.id}
                          className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-red-50 text-slate-400 hover:text-red-650 transition-colors disabled:opacity-50"
                          title="Hapus Kasir"
                        >
                          {deletingId === c.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={14} />}
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

      {/* Footer statistics label */}
      {!loading && filtered.length > 0 && (
        <p className="text-[10.5px] font-bold text-slate-400 text-right mt-2">
          Menampilkan {filtered.length} dari {cashiers.length} staf kasir cabang
        </p>
      )}

      {/* Modal Form */}
      {isOpenModal && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={e => { if (e.target === e.currentTarget) setIsOpenModal(false) }}
        >
          <form 
            className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200/80 animate-in slide-in-from-bottom-3 duration-250 flex flex-col"
            onSubmit={handleSubmit}
          >
            <div className="p-6 pb-0 flex items-start justify-between">
              <div>
                <h3 className="text-base font-black text-slate-950">{editingId ? 'Edit Akun Kasir' : 'Daftarkan Staf Kasir Baru'}</h3>
                <p className="text-[10.5px] font-semibold text-slate-400 mt-0.5">
                  {editingId ? 'Perbarui informasi profil dan pin login kasir' : 'Lengkapi kredensial masuk staf kasir baru Anda'}
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setIsOpenModal(false)}
                className="h-8 w-8 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-650 hover:bg-slate-100 transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            <div className="h-px bg-slate-100 my-4 mx-6" />

            <div className="p-6 pt-0 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Nama Lengkap Kasir *</label>
                <div className="relative">
                  <User size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Contoh: Siti Rahmawati"
                    className="w-full rounded-xl border border-slate-200 pl-11 pr-4 py-3 text-xs text-slate-900 placeholder:text-slate-450 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-50 transition-all font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Nomor Telepon Staf</label>
                <div className="relative">
                  <Smartphone size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Contoh: 08123456789"
                    className="w-full rounded-xl border border-slate-200 pl-11 pr-4 py-3 text-xs text-slate-900 placeholder:text-slate-455 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-50 transition-all font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                  {editingId ? 'PIN Login Baru (opsional)' : 'PIN Kredensial Login *'}
                </label>
                <div className="relative">
                  <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="password"
                    required={!editingId}
                    maxLength={6}
                    value={formData.pin}
                    onChange={e => setFormData({ ...formData, pin: e.target.value })}
                    placeholder="Masukkan 4-6 digit angka pin"
                    className="w-full rounded-xl border border-slate-200 pl-11 pr-4 py-3 text-xs text-slate-900 placeholder:text-slate-455 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-50 transition-all font-semibold"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 py-3.5 px-4 text-xs font-bold text-white shadow-md shadow-blue-600/15 transition-all active:scale-98 disabled:pointer-events-none disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer mt-6"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <span>{editingId ? 'Simpan Perubahan' : 'Daftarkan Kasir'}</span>
                    <ChevronRight size={14} />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  )
}
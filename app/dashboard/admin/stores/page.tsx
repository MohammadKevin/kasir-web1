'use client'

import { useEffect, useState, useMemo } from 'react'
import { api } from '@/lib/api'
import {
  Mail, 
  Phone, 
  MapPin, 
  Plus, 
  Search, 
  X, 
  Loader2, 
  Trash2, 
  Edit3, 
  Building2, 
  ChevronRight
} from 'lucide-react'

type StoreData = {
  id: string
  name: string
  email: string
  phone: string
  address: string
  createdAt: string
}

const EMPTY = { name: '', email: '', password: '', phone: '', address: '' }

export default function StorePage() {
  const [stores, setStores] = useState<StoreData[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState(EMPTY)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await api.get('/stores')
      setStores(res.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...form }
      if (!payload.password) delete (payload as any).password
      if (editingId) {
        await api.patch(`/stores/${editingId}`, payload)
      } else {
        await api.post('/stores', payload)
      }
      setOpen(false)
      load()
    } catch (e: any) {
      alert(e.response?.data?.message || 'Gagal menyimpan')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus cabang toko ini?')) return
    setDeletingId(id)
    try {
      await api.delete(`/stores/${id}`)
      load()
    } catch (err: any) {
      console.error(err)
      alert(err.response?.data?.message || 'Gagal menghapus cabang toko')
    } finally {
      setDeletingId(null)
    }
  }

  const filtered = useMemo(() => {
    return stores.filter(s =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase())
    )
  }, [stores, search])

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 bg-blue-50 border border-blue-100/50 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
            <Building2 size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900">Manajemen Cabang Toko</h1>
              {!loading && (
                <span className="rounded-full bg-blue-50 border border-blue-100 text-blue-600 px-2 py-0.5 text-[10px] font-extrabold tracking-wide">
                  {stores.length}
                </span>
              )}
            </div>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">Kelola seluruh cabang outlet aktif dan kredensial aksesnya</p>
          </div>
        </div>

        <button 
          onClick={() => { setEditingId(null); setForm(EMPTY); setOpen(true) }}
          className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-xs font-bold text-white transition-all shadow-3xs active:scale-97 cursor-pointer"
        >
          <Plus size={15} />
          <span>Tambah Cabang</span>
        </button>
      </div>

      <div className="relative">
        <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cari cabang toko berdasarkan nama atau email..."
          className="w-full rounded-xl border border-slate-200/80 pl-11 pr-11 py-3.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-semibold"
        />
        {search && (
          <button 
            onClick={() => setSearch('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X size={15} />
          </button>
        )}
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="h-52 animate-pulse rounded-2xl border border-slate-200/60 bg-white" />
          ))
        ) : filtered.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
            <Building2 size={36} className="text-slate-350 opacity-60 mb-3" />
            <p className="text-xs font-bold text-slate-500">
              {search ? 'Tidak ada cabang toko yang cocok' : 'Belum ada cabang toko terdaftar'}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">
              {search ? 'Coba ubah kata kunci pencarian Anda' : 'Klik "Tambah Cabang" untuk mendaftarkan toko baru'}
            </p>
          </div>
        ) : (
          filtered.map(s => (
            <div 
              key={s.id} 
              className="group relative bg-white border border-slate-200/70 rounded-2xl p-5 hover:border-blue-350 hover:shadow-md hover:shadow-blue-500/5 transition-all duration-300 flex flex-col justify-between min-h-[200px]"
            >
              <div>
                <div className="flex justify-between items-start">
                  <div className="h-10 w-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-sm shadow-blue-500/10">
                    <Building2 size={18} />
                  </div>
                  
                  <div className="flex gap-1.5 opacity-80 md:opacity-0 md:group-hover:opacity-100 transition-all duration-200">
                    <button 
                      onClick={() => { setEditingId(s.id); setForm({ ...s, password: '' }); setOpen(true) }}
                      className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-slate-50 text-blue-600 hover:text-blue-700 transition-colors"
                      title="Edit Cabang"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button 
                      onClick={() => handleDelete(s.id)}
                      disabled={deletingId === s.id}
                      className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors disabled:opacity-50"
                      title="Hapus Cabang"
                    >
                      {deletingId === s.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                  </div>
                </div>

                <div className="mt-4 mb-4">
                  <h3 className="text-sm font-extrabold text-slate-900 leading-snug">{s.name}</h3>
                  <p className="text-[9.5px] font-bold text-slate-400 font-mono mt-0.5 uppercase tracking-wider">ID: {s.id.slice(0, 8)}...</p>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-7 w-7 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 shrink-0 border border-slate-100">
                    <Mail size={12} className="text-blue-500" />
                  </div>
                  <span className="text-xs font-semibold text-slate-600 truncate">{s.email}</span>
                </div>
                
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-7 w-7 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 shrink-0 border border-slate-100">
                    <Phone size={12} className="text-blue-500" />
                  </div>
                  <span className={`text-xs font-semibold ${s.phone ? 'text-slate-600' : 'text-slate-350 italic'}`}>
                    {s.phone || 'Telepon belum diatur'}
                  </span>
                </div>

                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="h-7 w-7 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 shrink-0 border border-slate-100 mt-0.5">
                    <MapPin size={12} className="text-blue-500" />
                  </div>
                  <span className={`text-xs font-semibold leading-relaxed line-clamp-2 ${s.address ? 'text-slate-600' : 'text-slate-350 italic'}`}>
                    {s.address || 'Alamat belum diatur'}
                  </span>
                </div>
              </div>

            </div>
          ))
        )}
      </div>

      {open && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <form 
            className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200/80 animate-in slide-in-from-bottom-3 duration-250 flex flex-col"
            onSubmit={submit}
          >
            <div className="p-6 pb-0 flex items-start justify-between">
              <div>
                <h3 className="text-base font-black text-slate-950">{editingId ? 'Edit Detail Cabang' : 'Daftarkan Cabang Baru'}</h3>
                <p className="text-[10.5px] font-semibold text-slate-400 mt-0.5">
                  {editingId ? 'Perbarui informasi operasional toko terpilih' : 'Lengkapi detail berikut untuk mendaftarkan outlet baru'}
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setOpen(false)}
                className="h-8 w-8 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            <div className="h-px bg-slate-100 my-4 mx-6" />

            <div className="p-6 pt-0 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Nama Cabang Toko *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Contoh: Cabang Jakarta Pusat"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-50 transition-all font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Email Login Cabang *</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="nama.cabang@lailacollections.com"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-xs text-slate-900 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-50 transition-all font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                  {editingId ? 'Password Baru (opsional)' : 'Password Kredensial *'}
                </label>
                <input
                  type="password"
                  required={!editingId}
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder="Min. 8 karakter"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-xs text-slate-900 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-50 transition-all font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Nomor Telepon</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  placeholder="Contoh: 081234567890"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-xs text-slate-900 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-50 transition-all font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Alamat Lengkap</label>
                <textarea
                  value={form.address}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                  placeholder="Alamat lengkap outlet cabang..."
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-xs text-slate-900 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-50 transition-all resize-none font-semibold"
                />
              </div>

              <button 
                type="submit" 
                disabled={saving}
                className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 py-3.5 px-4 text-xs font-bold text-white shadow-md shadow-blue-600/15 transition-all active:scale-98 disabled:pointer-events-none disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer mt-6"
              >
                {saving ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <span>{editingId ? 'Simpan Perubahan' : 'Daftarkan Toko'}</span>
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

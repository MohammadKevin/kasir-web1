'use client'

import { useEffect, useState, useMemo } from 'react'
import { api } from '@/lib/api'
import {
  Shield,
  Trash2,
  UserPlus,
  Search,
  X,
  Lock,
  Loader2,
  User,
  Mail,
  ChevronRight
} from 'lucide-react'

type AdminUser = {
  id: string
  name: string
  email: string
  createdAt: string
}

const EMPTY_FORM = { name: '', email: '', password: '' }

export default function AdminsPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isOpenModal, setIsOpenModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    // Dapatkan ID user yang sedang login saat ini
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser)
        setCurrentUserId(parsed.id)
      } catch (err) {
        console.error(err)
      }
    }
    loadAdmins()
  }, [])

  async function loadAdmins() {
    setLoading(true)
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` }
      const { data } = await api.get('/admins', { headers })
      setAdmins(data)
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
      await api.post('/admins', formData, { headers })
      setIsOpenModal(false)
      setFormData(EMPTY_FORM)
      loadAdmins()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal menambahkan admin')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function remove(admin: AdminUser) {
    const isSelf = admin.id === currentUserId
    const confirmMessage = isSelf
      ? 'PERINGATAN: Anda sedang menghapus akun Anda sendiri yang sedang aktif digunakan. Seluruh kepemilikan outlet/kasir Anda akan ditransfer ke admin lain, dan Anda akan otomatis keluar dari sistem. Lanjutkan?'
      : `Apakah Anda yakin ingin menghapus akun admin "${admin.name}" secara permanen? Seluruh outlet/kasirnya akan dialihkan ke admin lain.`

    if (!confirm(confirmMessage)) return

    setDeletingId(admin.id)
    const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` }
    try {
      const { data } = await api.delete(`/admins/${admin.id}`, { headers })
      alert(data.message || 'Admin berhasil dihapus')

      if (isSelf) {
        // Logout otomatis jika menghapus akun sendiri
        localStorage.clear()
        document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
        document.cookie = 'userRole=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
        document.cookie = 'user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
        window.location.href = '/login'
      } else {
        loadAdmins()
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal menghapus admin')
    } finally {
      setDeletingId(null)
    }
  }

  const filtered = useMemo(() => {
    return admins.filter(
      a =>
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.email.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [admins, searchQuery])

  return (
    <div className="space-y-6">
      
      
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 bg-blue-50 border border-blue-100/50 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
            <Shield size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900">Kelola Akun Admin</h1>
              {!loading && (
                <span className="rounded-full bg-blue-50 border border-blue-100 text-blue-600 px-2 py-0.5 text-[10px] font-extrabold tracking-wide">
                  {admins.length}
                </span>
              )}
            </div>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">
              Tambah kredensial admin baru untuk serah terima atau hapus admin lama secara aman tanpa menghilangkan data outlet
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setFormData(EMPTY_FORM)
            setIsOpenModal(true)
          }}
          className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-xs font-bold text-white transition-all shadow-3xs active:scale-97 cursor-pointer"
        >
          <UserPlus size={15} />
          <span>Tambah Admin</span>
        </button>
      </div>

      
      <div className="relative">
        <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Cari nama atau email admin..."
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

      
      <div className="rounded-2xl border border-slate-200/70 bg-white shadow-3xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                <th className="p-4 pl-6">Nama Admin</th>
                <th className="p-4">Alamat Email</th>
                <th className="p-4">Tanggal Dibuat</th>
                <th className="p-4 pr-6 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600 font-semibold">
              {loading ? (
                [1, 2].map(i => (
                  <tr key={i}>
                    <td colSpan={4} className="p-5 pl-6">
                      <div className="h-4 animate-pulse rounded-lg bg-slate-100" style={{ width: `${65 + i * 5}%` }} />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-16 text-center text-slate-400">
                    <Shield size={32} className="mx-auto text-slate-350 opacity-60 mb-3" />
                    <p className="text-xs font-bold text-slate-500">
                      {searchQuery ? 'Tidak ada admin yang cocok' : 'Belum ada admin terdaftar'}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map(admin => (
                  <tr key={admin.id} className="group hover:bg-slate-50/45 transition-colors">
                    <td className="p-4 pl-6">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full flex items-center justify-center border shrink-0 bg-blue-50 border-blue-100 text-blue-600">
                          <User size={14} />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-extrabold text-slate-900 text-xs">{admin.name}</span>
                          {admin.id === currentUserId && (
                            <span className="text-[8.5px] font-extrabold text-blue-600 bg-blue-50 border border-blue-200/50 rounded px-1.5 py-0.5 mt-0.5 w-max">
                              Sesi Anda Saat Ini
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-slate-500">
                        <Mail size={12} className="text-slate-400" />
                        <span>{admin.email}</span>
                      </div>
                    </td>
                    <td className="p-4 text-slate-500 font-medium">
                      {new Date(admin.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="p-4 pr-6">
                      <div className="flex gap-1.5 justify-end">
                        {admins.length > 1 ? (
                          <button
                            onClick={() => remove(admin)}
                            disabled={deletingId === admin.id}
                            className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors disabled:opacity-50"
                            title="Hapus Admin"
                          >
                            {deletingId === admin.id ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <Trash2 size={14} />
                            )}
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-bold italic">Admin Tunggal</span>
                        )}
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
        <div
          className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={e => {
            if (e.target === e.currentTarget) setIsOpenModal(false)
          }}
        >
          <form
            className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200/80 animate-in slide-in-from-bottom-3 duration-250 flex flex-col"
            onSubmit={handleSubmit}
          >
            <div className="p-6 pb-0 flex items-start justify-between">
              <div>
                <h3 className="text-base font-black text-slate-950">Daftarkan Admin Baru</h3>
                <p className="text-[10.5px] font-semibold text-slate-400 mt-0.5">
                  Lengkapi kredensial masuk admin baru untuk serah terima sistem
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpenModal(false)}
                className="h-8 w-8 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            <div className="h-px bg-slate-100 my-4 mx-6" />

            <div className="p-6 pt-0 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                  Nama Lengkap Admin *
                </label>
                <div className="relative">
                  <User size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Contoh: Pemilik Toko"
                    className="w-full rounded-xl border border-slate-200 pl-11 pr-4 py-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                  Alamat Email Admin *
                </label>
                <div className="relative">
                  <Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Contoh: owner@lailacollections.com"
                    className="w-full rounded-xl border border-slate-200 pl-11 pr-4 py-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                  Password Baru *
                </label>
                <div className="relative">
                  <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Minimal 6 karakter"
                    className="w-full rounded-xl border border-slate-200 pl-11 pr-4 py-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-semibold"
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
                    <span>Daftarkan Admin</span>
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

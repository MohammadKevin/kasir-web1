'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { 
  Truck, 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  X, 
  Store, 
  Phone, 
  Building2,
  PackageCheck
} from 'lucide-react'

type Supplier = {
  id: string
  storeId: string
  name: string
  phone?: string
  purchases?: any[]
}

type StoreType = {
  id: string
  name: string
}

export default function SupplierPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
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
      loadSuppliers(selectedStoreId)
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

  async function loadSuppliers(storeId: string) {
    setLoading(true)
    try {
      const res = await api.get(`/suppliers/store/${storeId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })
      setSuppliers(res.data)
    } catch (error) {
      console.error('Gagal memuat data supplier:', error)
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

  function handleOpenEdit(supplier: Supplier) {
    setEditingId(supplier.id)
    setFormData({
      storeId: supplier.storeId,
      name: supplier.name,
      phone: supplier.phone || '',
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
        // Logika PATCH: Hanya kirim property modifikasi (Dilarang membawa storeId)
        const updatePayload: { name: string; phone?: string } = {
          name: formData.name.trim(),
        }
        if (formData.phone && formData.phone.trim() !== '') {
          updatePayload.phone = formData.phone.trim()
        }

        await api.patch(`/suppliers/${editingId}`, updatePayload, { headers })
      } else {
        // Logika POST: Sesuai struktur CreateSupplierDto
        const createPayload: { storeId: string; name: string; phone?: string } = {
          storeId: formData.storeId,
          name: formData.name.trim(),
        }
        if (formData.phone && formData.phone.trim() !== '') {
          createPayload.phone = formData.phone.trim()
        }

        await api.post('/suppliers', createPayload, { headers })
      }

      setIsOpenModal(false)
      loadSuppliers(selectedStoreId)
    } catch (error: any) {
      if (error.response && error.response.data) {
        const serverMessage = error.response.data.message
        alert(`Gagal menyimpan data supplier: ${Array.isArray(serverMessage) ? serverMessage.join(', ') : serverMessage}`)
      } else {
        console.error('Gagal menyimpan supplier:', error)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  async function remove(id: string) {
    if (!confirm('Apakah Anda yakin ingin menghapus vendor supplier ini? Seluruh riwayat purchases (kulakan) terkait akan kehilangan relasi datanya.')) return

    try {
      await api.delete(`/suppliers/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })
      loadSuppliers(selectedStoreId)
    } catch (error) {
      console.error('Gagal menghapus supplier:', error)
    }
  }

  const filteredSuppliers = suppliers.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.phone && s.phone.includes(searchQuery))
  )

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
        <div className="h-12 w-full max-w-md animate-pulse rounded-xl bg-slate-100" />
        <div className="h-96 w-full animate-pulse rounded-2xl bg-slate-50 border border-slate-100" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Manajemen Supplier</h1>
          <p className="text-sm text-slate-500 mt-1">Kelola direktori mitra vendor pasokan barang dagangan, kontak operasional, serta monitoring pasokan stok.</p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition-all active:scale-98 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Tambahkan Supplier
        </button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama vendor supplier atau nomor kontak..."
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
              setFormData((prev) => ({ ...prev, storeId: e.target.value }))
            }}
            className="bg-transparent text-sm font-semibold text-slate-800 outline-none pr-2 cursor-pointer"
          >
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm text-slate-600">
            <thead className="bg-slate-50/70 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-100">
              <tr>
                <th scope="col" className="px-6 py-4">Nama Vendor / Perusahaan</th>
                <th scope="col" className="px-6 py-4">Nomor Kontak Hubung</th>
                <th scope="col" className="px-6 py-4">Riwayat Pasokan</th>
                <th scope="col" className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                    <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800" />
                  </td>
                </tr>
              ) : filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-slate-400">
                        <Truck className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-medium text-slate-600">Database supplier masih kosong</p>
                      <p className="text-xs text-slate-400">Belum ada mitra suplai barang yang terdaftar pada cabang toko ini.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((supplier) => (
                  <tr key={supplier.id} className="transition-colors hover:bg-slate-50/50 group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 border border-slate-200/50 group-hover:bg-slate-950 group-hover:text-white transition-all">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-slate-900 text-base">{supplier.name}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4 font-mono text-sm text-slate-600 whitespace-nowrap">
                      {supplier.phone ? (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{supplier.phone}</span>
                        </div>
                      ) : (
                        <span className="text-slate-300 italic font-normal">Tidak ada nomor</span>
                      )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-50 border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        <PackageCheck className="w-3.5 h-3.5 text-slate-400" />
                        {supplier.purchases?.length ?? 0} Kali Suplai (Kulakan)
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(supplier)}
                          className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
                          title="Ubah Informasi Supplier"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => remove(supplier.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                          title="Hapus Data Supplier"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-xl transition-all">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{editingId ? 'Ubah Rincian Supplier' : 'Daftarkan Vendor Supplier'}</h3>
                <p className="text-xs text-slate-500 mt-0.5">Konfigurasi nama entitas perusahaan penyalur pasokan serta kontak penghubung.</p>
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
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Nama Vendor / Perusahaan Supplier</label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="Contoh: PT. Sumber Makmur Sejahtera"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2.5 text-sm outline-none transition-all focus:border-slate-400 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Nomor Telepon Kontak Kantor</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="tel"
                    placeholder="Contoh: 0217654321 atau 0812xxxxxxxx"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2.5 text-sm outline-none transition-all focus:border-slate-400 focus:bg-white"
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
                  className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition-all disabled:opacity-40"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Menyimpan...</span>
                    </div>
                  ) : editingId ? (
                    'Perbarui Data'
                  ) : (
                    'Daftarkan Supplier'
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
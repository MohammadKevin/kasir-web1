'use client'

import { useEffect, useState, useMemo } from 'react'
import { api } from '@/lib/api'
import {
  Mail, Phone, MapPin, Plus, Search, X, Loader2, Trash2, Edit3, Building2, ChevronRight
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

function FloatingInput({
  label, type = 'text', value, onChange, required, placeholder
}: {
  label: string; type?: string; value: string; onChange: (v: string) => void;
  required?: boolean; placeholder?: string
}) {
  const [focused, setFocused] = useState(false)
  const active = focused || value.length > 0
  return (
    <div className="relative">
      <label
        style={{
          position: 'absolute',
          left: '14px',
          top: active ? '7px' : '50%',
          transform: active ? 'none' : 'translateY(-50%)',
          fontSize: active ? '10px' : '14px',
          fontWeight: active ? '600' : '400',
          color: focused ? '#2563EB' : active ? '#8B87A8' : '#9CA3AF',
          transition: 'all 0.18s ease',
          pointerEvents: 'none',
          letterSpacing: active ? '0.05em' : '0',
          textTransform: active ? 'uppercase' : 'none',
          zIndex: 1,
        }}
      >
        {label}{required && ' *'}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        required={required}
        placeholder={focused ? placeholder : ''}
        style={{
          width: '100%',
          padding: active ? '22px 14px 8px' : '14px',
          border: `1.5px solid ${focused ? '#2563EB' : '#E5E3EF'}`,
          borderRadius: '12px',
          fontSize: '14px',
          color: '#1A1A2E',
          background: focused ? '#FDFCFF' : '#F9F8FC',
          outline: 'none',
          transition: 'all 0.18s ease',
          boxShadow: focused ? '0 0 0 3px rgba(37,99,235,0.08)' : 'none',
        }}
      />
    </div>
  )
}

function FloatingTextarea({
  label, value, onChange
}: {
  label: string; value: string; onChange: (v: string) => void
}) {
  const [focused, setFocused] = useState(false)
  const active = focused || value.length > 0
  return (
    <div className="relative">
      <label
        style={{
          position: 'absolute',
          left: '14px',
          top: active ? '10px' : '14px',
          fontSize: active ? '10px' : '14px',
          fontWeight: active ? '600' : '400',
          color: focused ? '#2563EB' : active ? '#8B87A8' : '#9CA3AF',
          transition: 'all 0.18s ease',
          pointerEvents: 'none',
          letterSpacing: active ? '0.05em' : '0',
          textTransform: active ? 'uppercase' : 'none',
          zIndex: 1,
        }}
      >
        {label}
      </label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        rows={3}
        style={{
          width: '100%',
          padding: active ? '26px 14px 10px' : '14px',
          border: `1.5px solid ${focused ? '#2563EB' : '#E5E3EF'}`,
          borderRadius: '12px',
          fontSize: '14px',
          color: '#1A1A2E',
          background: focused ? '#FDFCFF' : '#F9F8FC',
          outline: 'none',
          resize: 'none',
          transition: 'all 0.18s ease',
          boxShadow: focused ? '0 0 0 3px rgba(37,99,235,0.08)' : 'none',
        }}
      />
    </div>
  )
}

export default function StorePage() {
  const [stores, setStores] = useState<StoreData[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState(EMPTY)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await api.get('/stores')
      setStores(res.data || [])
    } finally { setLoading(false) }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...form }
      if (!payload.password) delete (payload as any).password
      if (editingId) await api.patch(`/stores/${editingId}`, payload)
      else await api.post('/stores', payload)
      setOpen(false)
      load()
    } catch (e: any) { alert(e.response?.data?.message || 'Gagal menyimpan') }
    finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus toko ini?')) return
    setDeletingId(id)
    try {
      await api.delete(`/stores/${id}`)
      load()
    } finally { setDeletingId(null) }
  }

  const filtered = useMemo(() => stores.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  ), [stores, search])

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        .store-root * { font-family: 'Inter', sans-serif; box-sizing: border-box; }
        .store-card {
          background: #fff;
          border: 1.5px solid #EEEDF5;
          border-radius: 20px;
          padding: 24px;
          transition: all 0.22s ease;
          position: relative;
          overflow: hidden;
          cursor: default;
        }
        .store-card::before {
          content: '';
          position: absolute;
          left: 0; top: 0; bottom: 0;
          width: 3px;
          background: #2563EB;
          transform: scaleY(0);
          transform-origin: bottom;
          transition: transform 0.25s ease;
          border-radius: 0 2px 2px 0;
        }
        .store-card:hover {
          border-color: #93C5FD;
          box-shadow: 0 8px 32px rgba(37,99,235,0.08);
          transform: translateY(-2px);
        }
        .store-card:hover::before { transform: scaleY(1); }
        .store-card:hover .card-actions { opacity: 1; transform: translateY(0); }
        .card-actions {
          opacity: 0;
          transform: translateY(4px);
          transition: all 0.18s ease;
          display: flex;
          gap: 4px;
        }
        .btn-icon {
          width: 32px; height: 32px;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.15s;
          background: transparent;
        }
        .btn-icon:hover { background: #F3F2FA; }
        .btn-icon.danger:hover { background: #FFF0F0; color: #E53E3E; }
        .search-wrap {
          position: relative;
        }
        .search-wrap input {
          width: 100%;
          padding: 13px 16px 13px 46px;
          border: 1.5px solid #EEEDF5;
          border-radius: 14px;
          font-size: 14px;
          background: #fff;
          color: #1A1A2E;
          outline: none;
          transition: border-color 0.18s, box-shadow 0.18s;
        }
        .search-wrap input:focus {
          border-color: #2563EB;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.08);
        }
        .search-wrap input::placeholder { color: #B0AECB; }
        .modal-overlay {
          position: fixed; inset: 0;
          background: rgba(26,26,46,0.45);
          backdrop-filter: blur(6px);
          display: flex; align-items: center; justify-content: center;
          z-index: 50; padding: 16px;
          animation: fadeIn 0.2s ease;
        }
        .modal-box {
          width: 100%; max-width: 460px;
          background: #fff;
          border-radius: 24px;
          box-shadow: 0 32px 80px rgba(26,26,46,0.18);
          animation: slideUp 0.25s ease;
          overflow: hidden;
        }
        .modal-header {
          padding: 28px 28px 0;
          display: flex; align-items: flex-start; justify-content: space-between;
        }
        .modal-body {
          padding: 24px 28px 28px;
          display: flex; flex-direction: column; gap: 14px;
        }
        .modal-title {
          font-size: 20px; font-weight: 700;
          color: #1A1A2E; line-height: 1.2;
        }
        .modal-sub {
          font-size: 13px; color: #9C99B8; margin-top: 3px;
        }
        .btn-close {
          width: 34px; height: 34px; border-radius: 10px;
          border: 1.5px solid #EEEDF5; background: #F9F8FC;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; transition: background 0.15s;
        }
        .btn-close:hover { background: #EEEDF5; }
        .btn-save {
          width: 100%; padding: 14px;
          background: #2563EB;
          color: #fff; border: none; border-radius: 12px;
          font-size: 14px; font-weight: 600; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: background 0.18s, transform 0.1s;
          margin-top: 4px;
        }
        .btn-save:hover:not(:disabled) { background: #1D4ED8; }
        .btn-save:active:not(:disabled) { transform: scale(0.99); }
        .btn-save:disabled { opacity: 0.6; cursor: not-allowed; }
        .divider {
          height: 1px; background: #F0EFF7;
          margin: 0 28px;
        }
        .skeleton {
          background: linear-gradient(90deg, #F3F2FA 25%, #EEEDF5 50%, #F3F2FA 75%);
          background-size: 200% 100%;
          animation: shimmer 1.4s infinite;
          border-radius: 20px;
        }
        .add-btn {
          background: #2563EB; color: #fff;
          border: none; border-radius: 12px;
          padding: 11px 20px;
          font-size: 14px; font-weight: 600;
          display: flex; align-items: center; gap: 8px;
          cursor: pointer; transition: background 0.18s, transform 0.1s;
          white-space: nowrap;
        }
        .add-btn:hover { background: #1D4ED8; }
        .add-btn:active { transform: scale(0.98); }
        .empty-state {
          grid-column: 1 / -1;
          text-align: center; padding: 64px 24px;
          color: #B0AECB;
        }
        .badge-count {
          display: inline-flex; align-items: center;
          background: #E0F2FE; color: #0284C7;
          font-size: 12px; font-weight: 600;
          padding: 2px 10px; border-radius: 20px;
          margin-left: 8px; vertical-align: middle;
        }
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }

        @media (max-width: 640px) {
          .store-root-container { padding: 16px 12px !important; }
          .store-header-row { flex-direction: column; align-items: stretch !important; gap: 16px !important; }
          .store-header-row button { width: 100%; justify-content: center; }
          .card-actions { opacity: 1 !important; transform: none !important; }
        }
      `}</style>

      <div className="store-root store-root-container" style={{ padding: '32px 24px', maxWidth: '1100px', margin: '0 auto' }}>

        <div className="store-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '32px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <div style={{ width: '32px', height: '32px', background: '#E0F2FE', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Building2 size={16} color="#0284C7" />
              </div>
              <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#1A1A2E', margin: 0 }}>
                Manajemen Store
                {!loading && <span className="badge-count">{stores.length}</span>}
              </h1>
            </div>
            <p style={{ fontSize: '13px', color: '#9C99B8', margin: 0 }}>Kelola seluruh cabang operasional toko Anda</p>
          </div>
          <button className="add-btn" onClick={() => { setEditingId(null); setForm(EMPTY); setOpen(true) }}>
            <Plus size={16} />
            Tambah Store
          </button>
        </div>

        <div className="search-wrap" style={{ marginBottom: '24px' }}>
          <Search size={16} color="#B0AECB" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama toko atau email…"
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#B0AECB', display: 'flex' }}>
              <X size={16} />
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {loading ? (
            [1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: '200px' }} />)
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <Building2 size={36} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              <p style={{ fontSize: '15px', fontWeight: '500', color: '#9C99B8', margin: '0 0 6px' }}>
                {search ? 'Tidak ada toko yang cocok' : 'Belum ada toko'}
              </p>
              <p style={{ fontSize: '13px', margin: 0 }}>
                {search ? 'Coba kata kunci lain' : 'Klik "Tambah Store" untuk memulai'}
              </p>
            </div>
          ) : (
            filtered.map(s => (
              <div key={s.id} className="store-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Building2 size={20} color="#fff" />
                  </div>
                  <div className="card-actions">
                    <button className="btn-icon" title="Edit" onClick={() => { setEditingId(s.id); setForm({ ...s, password: '' }); setOpen(true) }}>
                      <Edit3 size={14} color="#2563EB" />
                    </button>
                    <button className="btn-icon danger" title="Hapus" onClick={() => handleDelete(s.id)} disabled={deletingId === s.id}>
                      {deletingId === s.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: '16px', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1A1A2E', margin: '0 0 2px' }}>{s.name}</h3>
                  <p style={{ fontSize: '12px', color: '#B0AECB', margin: 0 }}>ID: {s.id.slice(0, 8)}…</p>
                </div>

                <div style={{ height: '1px', background: '#F3F2FA', marginBottom: '14px' }} />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '28px', height: '28px', background: '#F3F2FA', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Mail size={13} color="#2563EB" />
                    </div>
                    <span style={{ fontSize: '13px', color: '#5A5880', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.email}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '28px', height: '28px', background: '#F3F2FA', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Phone size={13} color="#2563EB" />
                    </div>
                    <span style={{ fontSize: '13px', color: s.phone ? '#5A5880' : '#C5C3DC' }}>{s.phone || 'Belum diisi'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <div style={{ width: '28px', height: '28px', background: '#F3F2FA', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                      <MapPin size={13} color="#2563EB" />
                    </div>
                    <span style={{ fontSize: '13px', color: s.address ? '#5A5880' : '#C5C3DC', lineHeight: '1.4' }}>{s.address || 'Belum diisi'}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {open && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}>
          <form className="modal-box" onSubmit={submit}>
            <div className="modal-header">
              <div>
                <p className="modal-title">{editingId ? 'Edit Toko' : 'Tambah Toko Baru'}</p>
                <p className="modal-sub">{editingId ? 'Perbarui informasi cabang' : 'Isi detail cabang baru Anda'}</p>
              </div>
              <button type="button" className="btn-close" onClick={() => setOpen(false)}>
                <X size={16} color="#9C99B8" />
              </button>
            </div>

            <div className="divider" style={{ marginTop: '20px' }} />

            <div className="modal-body">
              <FloatingInput
                label="Nama Toko"
                value={form.name}
                onChange={v => setForm({ ...form, name: v })}
                required
                placeholder="Contoh: Cabang Jakarta Pusat"
              />
              <FloatingInput
                label="Email"
                type="email"
                value={form.email}
                onChange={v => setForm({ ...form, email: v })}
                required
                placeholder="email@toko.com"
              />
              <FloatingInput
                label={editingId ? 'Password Baru (opsional)' : 'Password'}
                type="password"
                value={form.password}
                onChange={v => setForm({ ...form, password: v })}
                required={!editingId}
                placeholder="Min. 8 karakter"
              />
              <FloatingInput
                label="Nomor Telepon"
                type="tel"
                value={form.phone}
                onChange={v => setForm({ ...form, phone: v })}
                placeholder="+62 812 0000 0000"
              />
              <FloatingTextarea
                label="Alamat Lengkap"
                value={form.address}
                onChange={v => setForm({ ...form, address: v })}
              />

              <button type="submit" className="btn-save" disabled={saving}>
                {saving ? (
                  <><Loader2 size={16} className="animate-spin" /> Menyimpan…</>
                ) : (
                  <>{editingId ? 'Simpan Perubahan' : 'Tambah Toko'} <ChevronRight size={16} /></>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
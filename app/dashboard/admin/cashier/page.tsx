'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import {
  Users, Phone, ShieldCheck, ShieldAlert, Trash2, UserPlus,
  Search, X, Lock, Edit3, Loader2, User, Smartphone, ChevronRight, ChevronDown
} from 'lucide-react'

type Cashier = { id: string; name: string; phone: string; isActive: boolean }
type StoreType = { id: string; name: string }

const EMPTY_FORM = { name: '', phone: '', pin: '' }

function FloatingInput({
  label, type = 'text', value, onChange, required, placeholder, maxLength, icon: Icon
}: {
  label: string; type?: string; value: string; onChange: (v: string) => void;
  required?: boolean; placeholder?: string; maxLength?: number; icon?: any
}) {
  const [focused, setFocused] = useState(false)
  const active = focused || value.length > 0
  return (
    <div style={{ position: 'relative' }}>
      <label style={{
        position: 'absolute',
        left: Icon ? '44px' : '14px',
        top: active ? '7px' : '50%',
        transform: active ? 'none' : 'translateY(-50%)',
        fontSize: active ? '10px' : '14px',
        fontWeight: active ? '600' : '400',
        color: focused ? '#2d3544' : active ? '#8B87A8' : '#9CA3AF',
        transition: 'all 0.18s ease',
        pointerEvents: 'none',
        letterSpacing: active ? '0.05em' : '0',
        textTransform: active ? 'uppercase' : 'none',
        zIndex: 1,
      }}>
        {label}{required && ' *'}
      </label>
      {Icon && (
        <div style={{
          position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
          color: focused ? '#6C63FF' : '#B0AECB', transition: 'color 0.18s', pointerEvents: 'none', zIndex: 1,
        }}>
          <Icon size={16} />
        </div>
      )}
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        required={required}
        maxLength={maxLength}
        placeholder={focused ? placeholder : ''}
        style={{
          width: '100%',
          padding: active ? `22px ${Icon ? '14px' : '14px'} 8px ${Icon ? '44px' : '14px'}` : `14px 14px 14px ${Icon ? '44px' : '14px'}`,
          border: `1.5px solid ${focused ? '#6C63FF' : '#E5E3EF'}`,
          borderRadius: '12px',
          fontSize: '14px',
          color: '#1A1A2E',
          background: focused ? '#FDFCFF' : '#F9F8FC',
          outline: 'none',
          transition: 'all 0.18s ease',
          boxShadow: focused ? '0 0 0 3px rgba(108,99,255,0.08)' : 'none',
          fontFamily: 'Inter, sans-serif',
        }}
      />
    </div>
  )
}

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

  useEffect(() => { initPage() }, [])

  async function initPage() {
    const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` }
    const { data } = await api.get('/stores', { headers })
    setStores(data)
    if (data.length > 0) setSelectedStoreId(data[0].id)
  }

  useEffect(() => { if (selectedStoreId) loadCashiers() }, [selectedStoreId])

  async function loadCashiers() {
    setLoading(true)
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` }
      const { data } = await api.get(`/cashier/store/${selectedStoreId}`, { headers })
      setCashiers(data)
    } finally { setLoading(false) }
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
    } catch (e: any) { alert(e.response?.data?.message || 'Gagal menyimpan') }
    finally { setIsSubmitting(false) }
  }

  async function toggleStatus(cashier: Cashier) {
    setTogglingId(cashier.id)
    try {
      await api.patch(`/cashier/${cashier.id}`, { isActive: !cashier.isActive }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      loadCashiers()
    } finally { setTogglingId(null) }
  }

  async function remove(id: string) {
    if (!confirm('Hapus staf kasir ini permanen?')) return
    setDeletingId(id)
    try {
      await api.delete(`/cashier/${id}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      loadCashiers()
    } finally { setDeletingId(null) }
  }

  const filtered = cashiers.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
  const activeCount = cashiers.filter(c => c.isActive).length

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        .cashier-root * { font-family: 'Inter', sans-serif; box-sizing: border-box; }

        .cashier-table-row {
          transition: background 0.15s;
          border-bottom: 1px solid #F0EFF7;
        }
        .cashier-table-row:last-child { border-bottom: none; }
        .cashier-table-row:hover { background: #FDFCFF; }
        .cashier-table-row:hover .row-actions { opacity: 1; }

        .row-actions {
          opacity: 0;
          transition: opacity 0.18s;
          display: flex; gap: 4px; justify-content: flex-end;
        }

        .btn-icon {
          width: 32px; height: 32px; border-radius: 8px;
          border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.15s, color 0.15s;
          background: transparent;
          color: #9C99B8;
        }
        .btn-icon:hover { background: #F3F2FA; color: #2d3544; }
        .btn-icon.danger:hover { background: #FFF0F0; color: #E53E3E; }

        .store-select-wrapper {
          position: relative;
          display: inline-flex; align-items: center;
        }
        .store-select {
          appearance: none;
          background: #fff;
          border: 1.5px solid #EEEDF5;
          padding: 11px 40px 11px 14px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 500;
          color: #1A1A2E;
          cursor: pointer;
          outline: none;
          transition: border-color 0.18s, box-shadow 0.18s;
          font-family: 'Inter', sans-serif;
        }
        .store-select:focus {
          border-color: #2d3544;
          box-shadow: 0 0 0 3px rgba(45, 53, 68, 0.08);
        }

        .search-wrap { position: relative; }
        .search-wrap input {
          width: 100%; padding: 11px 16px 11px 42px;
          border: 1.5px solid #EEEDF5; border-radius: 12px;
          font-size: 13px; background: #fff; color: #1A1A2E; outline: none;
          transition: border-color 0.18s, box-shadow 0.18s;
          font-family: 'Inter', sans-serif;
        }
        .search-wrap input:focus {
          border-color: #2d3544;
          box-shadow: 0 0 0 3px rgba(45, 53, 68, 0.08);
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
          width: 100%; max-width: 420px;
          background: #fff;
          border-radius: 24px;
          box-shadow: 0 32px 80px rgba(26,26,46,0.18);
          animation: slideUp 0.25s ease;
          overflow: hidden;
        }
        .modal-header { padding: 28px 28px 0; display: flex; align-items: flex-start; justify-content: space-between; }
        .modal-body { padding: 24px 28px 28px; display: flex; flex-direction: column; gap: 14px; }
        .modal-title { font-size: 20px; font-weight: 700; color: #1A1A2E; margin: 0; }
        .modal-sub { font-size: 13px; color: #9C99B8; margin: 3px 0 0; }
        .divider { height: 1px; background: #F0EFF7; margin: 20px 28px 0; }
        .btn-close {
          width: 34px; height: 34px; border-radius: 10px;
          border: 1.5px solid #EEEDF5; background: #F9F8FC;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; transition: background 0.15s;
        }
        .btn-close:hover { background: #EEEDF5; }
        .btn-save {
          width: 100%; padding: 14px; background: #1A1A2E;
          color: #fff; border: none; border-radius: 12px;
          font-size: 14px; font-weight: 600; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: background 0.18s, transform 0.1s; margin-top: 4px;
          font-family: 'Inter', sans-serif;
        }
        .btn-save:hover:not(:disabled) { background: #2D2D52; }
        .btn-save:active:not(:disabled) { transform: scale(0.99); }
        .btn-save:disabled { opacity: 0.6; cursor: not-allowed; }
        .add-btn {
          background: #1A1A2E; color: #fff; border: none; border-radius: 12px;
          padding: 11px 20px; font-size: 14px; font-weight: 600;
          display: flex; align-items: center; gap: 8px;
          cursor: pointer; transition: background 0.18s, transform 0.1s;
          white-space: nowrap; font-family: 'Inter', sans-serif;
        }
        .add-btn:hover { background: #2D2D52; }
        .add-btn:active { transform: scale(0.98); }

        .skeleton {
          background: linear-gradient(90deg, #F3F2FA 25%, #EEEDF5 50%, #F3F2FA 75%);
          background-size: 200% 100%;
          animation: shimmer 1.4s infinite;
          border-radius: 8px;
        }

        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }
      `}</style>

      <div className="cashier-root" style={{ padding: '32px 24px', maxWidth: '1000px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '32px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <div style={{ width: '32px', height: '32px', background: '#F3F2FA', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={16} color="#2d3544" />
              </div>
              <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#1A1A2E', margin: 0 }}>
                Staf Kasir
                {!loading && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', background: '#F3F2FA', color: '#2d3544', fontSize: '12px', fontWeight: '600', padding: '2px 10px', borderRadius: '20px', marginLeft: '8px', verticalAlign: 'middle' }}>
                    {cashiers.length}
                  </span>
                )}
              </h1>
            </div>
            <p style={{ fontSize: '13px', color: '#9C99B8', margin: 0 }}>Kelola akses dan otoritas staf kasir Anda</p>
          </div>
          <button className="add-btn" onClick={() => { setEditingId(null); setFormData(EMPTY_FORM); setIsOpenModal(true) }}>
            <UserPlus size={16} />
            Tambah Kasir
          </button>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px', alignItems: 'center' }}>
          <div className="search-wrap" style={{ flex: '1', minWidth: '200px', maxWidth: '320px' }}>
            <Search size={15} color="#B0AECB" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input
              placeholder="Cari nama kasir…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#B0AECB', display: 'flex' }}>
                <X size={14} />
              </button>
            )}
          </div>

          <div className="store-select-wrapper">
            <select className="store-select" value={selectedStoreId} onChange={e => setSelectedStoreId(e.target.value)}>
              {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <ChevronDown size={14} color="#9C99B8" style={{ position: 'absolute', right: '14px', pointerEvents: 'none' }} />
          </div>

          {!loading && cashiers.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', padding: '5px 12px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22C55E' }} />
                <span style={{ fontSize: '12px', fontWeight: '600', color: '#16A34A' }}>{activeCount} aktif</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#F9F8FC', border: '1px solid #E5E3EF', borderRadius: '8px', padding: '5px 12px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#C5C3DC' }} />
                <span style={{ fontSize: '12px', fontWeight: '600', color: '#9C99B8' }}>{cashiers.length - activeCount} nonaktif</span>
              </div>
            </div>
          )}
        </div>

        <div style={{ background: '#fff', border: '1.5px solid #EEEDF5', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(26,26,46,0.04)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F9F8FC' }}>
                {['Nama Staf', 'Nomor Telepon', 'Status', ''].map((h, i) => (
                  <th key={i} style={{
                    padding: '12px 16px',
                    textAlign: i === 3 ? 'right' : 'left',
                    fontSize: '11px',
                    fontWeight: '600',
                    color: '#9C99B8',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    borderBottom: '1.5px solid #EEEDF5',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [1, 2, 3].map(i => (
                  <tr key={i}>
                    <td colSpan={4} style={{ padding: '12px 16px' }}>
                      <div className="skeleton" style={{ height: '20px', width: `${60 + i * 10}%` }} />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '52px 16px', textAlign: 'center' }}>
                    <Users size={28} style={{ margin: '0 auto 10px', color: '#C5C3DC' }} />
                    <p style={{ fontSize: '14px', fontWeight: '500', color: '#9C99B8', margin: '0 0 4px' }}>
                      {searchQuery ? 'Tidak ada kasir yang cocok' : 'Belum ada staf kasir'}
                    </p>
                    <p style={{ fontSize: '12px', color: '#C5C3DC', margin: 0 }}>
                      {searchQuery ? 'Coba kata kunci lain' : 'Klik "Tambah Kasir" untuk memulai'}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map(c => (
                  <tr key={c.id} className="cashier-table-row">
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '32px', height: '32px', borderRadius: '50%',
                          background: c.isActive ? 'linear-gradient(135deg, #1A1A2E, #2D2D52)' : '#F3F2FA',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                          <User size={14} color={c.isActive ? '#fff' : '#C5C3DC'} />
                        </div>
                        <span style={{ fontSize: '14px', fontWeight: '600', color: '#1A1A2E' }}>{c.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Phone size={13} color="#C5C3DC" />
                        <span style={{ fontSize: '13px', color: c.phone ? '#5A5880' : '#C5C3DC' }}>{c.phone || '—'}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '5px',
                        padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600',
                        background: c.isActive ? '#F0FDF4' : '#F9F8FC',
                        color: c.isActive ? '#16A34A' : '#9C99B8',
                        border: `1px solid ${c.isActive ? '#BBF7D0' : '#E5E3EF'}`,
                      }}>
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: c.isActive ? '#22C55E' : '#C5C3DC', display: 'inline-block' }} />
                        {c.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div className="row-actions">
                        <button
                          className="btn-icon"
                          title="Edit"
                          onClick={() => { setEditingId(c.id); setFormData({ name: c.name, phone: c.phone, pin: '' }); setIsOpenModal(true) }}
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          className={`btn-icon ${c.isActive ? '' : ''}`}
                          title={c.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                          onClick={() => toggleStatus(c)}
                          disabled={togglingId === c.id}
                          style={{ color: c.isActive ? '#9C99B8' : '#22C55E' }}
                        >
                          {togglingId === c.id
                            ? <Loader2 size={14} className="animate-spin" />
                            : c.isActive ? <ShieldAlert size={14} /> : <ShieldCheck size={14} />
                          }
                        </button>
                        <button
                          className="btn-icon danger"
                          title="Hapus"
                          onClick={() => remove(c.id)}
                          disabled={deletingId === c.id}
                        >
                          {deletingId === c.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer count */}
        {!loading && filtered.length > 0 && (
          <p style={{ fontSize: '12px', color: '#C5C3DC', marginTop: '12px', textAlign: 'right' }}>
            Menampilkan {filtered.length} dari {cashiers.length} staf
          </p>
        )}
      </div>

      {/* Modal */}
      {isOpenModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setIsOpenModal(false) }}>
          <form className="modal-box" onSubmit={handleSubmit}>
            <div className="modal-header">
              <div>
                <p className="modal-title">{editingId ? 'Edit Data Kasir' : 'Tambah Kasir Baru'}</p>
                <p className="modal-sub">{editingId ? 'Perbarui informasi staf' : 'Isi detail staf kasir baru'}</p>
              </div>
              <button type="button" className="btn-close" onClick={() => setIsOpenModal(false)}>
                <X size={16} color="#9C99B8" />
              </button>
            </div>

            <div className="divider" />

            <div className="modal-body">
              <FloatingInput
                label="Nama Lengkap"
                icon={User}
                value={formData.name}
                onChange={v => setFormData({ ...formData, name: v })}
                required
                placeholder="Nama staf kasir"
              />
              <FloatingInput
                label="Nomor Telepon"
                icon={Smartphone}
                type="tel"
                value={formData.phone}
                onChange={v => setFormData({ ...formData, phone: v })}
                placeholder="+62 812 0000 0000"
              />
              <FloatingInput
                label={editingId ? 'PIN Baru (opsional)' : 'PIN (4–6 Digit)'}
                icon={Lock}
                type="password"
                value={formData.pin}
                onChange={v => setFormData({ ...formData, pin: v })}
                required={!editingId}
                maxLength={6}
                placeholder="••••••"
              />

              <button type="submit" className="btn-save" disabled={isSubmitting}>
                {isSubmitting
                  ? <><Loader2 size={16} className="animate-spin" /> Menyimpan…</>
                  : <>{editingId ? 'Simpan Perubahan' : 'Tambah Kasir'} <ChevronRight size={16} /></>
                }
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
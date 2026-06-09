'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import {
  Package, Search, Plus, Edit3, Trash2, X, Store, Barcode, Tag,
  Boxes, AlertTriangle, Layers, FileText, Upload, ImageIcon,
  Folder, ChevronDown, ChevronRight, Loader2, ToggleLeft, ToggleRight
} from 'lucide-react'

type Product = {
  id: string; storeId: string; categoryId: string;
  name: string; image?: string; sku: string; barcode: string; description?: string;
  discounts?: { discount: { startDate?: string | null; endDate?: string | null; type: 'PERCENTAGE' | 'FIXED'; value: number; isActive: boolean } }[];
  costPrice: number; sellingPrice: number; stock: number; minimumStock: number;
  isActive: boolean; category?: { name: string }
}
type StoreType = { id: string; name: string }
type CategoryType = { id: string; name: string }

const EMPTY_FORM = {
  storeId: '', categoryId: '', name: '', image: '', sku: '', barcode: '',
  description: '', costPrice: 0, sellingPrice: 0, stock: 0, minimumStock: 0, isActive: true,
}

function FInput({ label, type = 'text', value, onChange, required, placeholder, min, icon: Icon }: any) {
  const [focused, setFocused] = useState(false)
  const active = focused || String(value).length > 0
  const pl = Icon ? '44px' : '14px'
  return (
    <div style={{ position: 'relative' }}>
      {Icon && (
        <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: focused ? '#2d3544' : '#C5C3DC', transition: 'color 0.18s', pointerEvents: 'none', zIndex: 1 }}>
          <Icon size={15} />
        </div>
      )}
      <label style={{
        position: 'absolute', left: pl, top: active ? '7px' : '50%',
        transform: active ? 'none' : 'translateY(-50%)',
        fontSize: active ? '10px' : '13px', fontWeight: active ? '600' : '400',
        color: focused ? '#2d3544' : active ? '#8B87A8' : '#B0AECB',
        transition: 'all 0.18s ease', pointerEvents: 'none',
        letterSpacing: active ? '0.05em' : '0', textTransform: active ? 'uppercase' : 'none', zIndex: 1,
      }}>
        {label}{required && ' *'}
      </label>
      <input type={type} value={value} min={min}
        onChange={e => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        required={required} placeholder={focused ? placeholder : ''}
        style={{
          width: '100%',
          padding: active ? `22px ${pl} 8px` : `14px 14px 14px ${pl}`,
          border: `1.5px solid ${focused ? '#2d3544' : '#E5E3EF'}`,
          borderRadius: '12px', fontSize: '13px', color: '#1A1A2E',
          background: focused ? '#FDFCFF' : '#F9F8FC', outline: 'none',
          transition: 'all 0.18s ease',
          boxShadow: focused ? '0 0 0 3px rgba(45, 53, 68, 0.08)' : 'none',
          fontFamily: 'Inter, sans-serif',
        }}
      />
    </div>
  )
}

function FTextarea({ label, value, onChange, placeholder, icon: Icon }: any) {
  const [focused, setFocused] = useState(false)
  const active = focused || String(value).length > 0
  return (
    <div style={{ position: 'relative' }}>
      {Icon && (
        <div style={{ position: 'absolute', left: '14px', top: '16px', color: focused ? '#2d3544' : '#C5C3DC', transition: 'color 0.18s', pointerEvents: 'none', zIndex: 1 }}>
          <Icon size={15} />
        </div>
      )}
      <label style={{
        position: 'absolute', left: Icon ? '44px' : '14px', top: active ? '8px' : '15px',
        fontSize: active ? '10px' : '13px', fontWeight: active ? '600' : '400',
        color: focused ? '#2d3544' : active ? '#8B87A8' : '#B0AECB',
        transition: 'all 0.18s ease', pointerEvents: 'none',
        letterSpacing: active ? '0.05em' : '0', textTransform: active ? 'uppercase' : 'none', zIndex: 1,
      }}>
        {label}
      </label>
      <textarea value={value} rows={3}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        placeholder={focused ? placeholder : ''}
        style={{
          width: '100%',
          padding: active ? `24px ${Icon ? '14px' : '14px'} 10px ${Icon ? '44px' : '14px'}` : `14px 14px 14px ${Icon ? '44px' : '14px'}`,
          border: `1.5px solid ${focused ? '#2d3544' : '#E5E3EF'}`,
          borderRadius: '12px', fontSize: '13px', color: '#1A1A2E',
          background: focused ? '#FDFCFF' : '#F9F8FC', outline: 'none', resize: 'none',
          transition: 'all 0.18s ease',
          boxShadow: focused ? '0 0 0 3px rgba(45, 53, 68, 0.08)' : 'none',
          fontFamily: 'Inter, sans-serif',
        }}
      />
    </div>
  )
}

function FSelect({ label, value, onChange, required, disabled, children, icon: Icon }: any) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      {Icon && (
        <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: focused ? '#2d3544' : '#C5C3DC', transition: 'color 0.18s', pointerEvents: 'none', zIndex: 2 }}>
          <Icon size={15} />
        </div>
      )}
      <label style={{
        position: 'absolute', left: Icon ? '44px' : '14px', top: '7px',
        fontSize: '10px', fontWeight: '600', color: focused ? '#2d3544' : '#8B87A8',
        letterSpacing: '0.05em', textTransform: 'uppercase', pointerEvents: 'none', zIndex: 2,
      }}>
        {label}{required && ' *'}
      </label>
      <select value={value} onChange={onChange} required={required} disabled={disabled}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{
          width: '100%', appearance: 'none',
          padding: `22px ${Icon ? '14px' : '14px'} 8px ${Icon ? '44px' : '14px'}`,
          border: `1.5px solid ${focused ? '#2d3544' : '#E5E3EF'}`,
          borderRadius: '12px', fontSize: '13px', color: '#1A1A2E',
          background: focused ? '#FDFCFF' : '#F9F8FC', outline: 'none', cursor: 'pointer',
          transition: 'all 0.18s ease',
          boxShadow: focused ? '0 0 0 3px rgba(45, 53, 68, 0.08)' : 'none',
          fontFamily: 'Inter, sans-serif',
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {children}
      </select>
      <ChevronDown size={13} color="#C5C3DC" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
    </div>
  )
}

function getMasterDiscount(p: Product) {
  const d = p.discounts?.[0]?.discount
  if (!d) return 0
  return d.type === 'PERCENTAGE' ? Math.floor(p.sellingPrice * d.value / 100) : d.value
}
function getFinalPrice(p: Product) { return Math.max(0, p.sellingPrice - getMasterDiscount(p)) }
function fmt(n: number) { return n.toLocaleString('id-ID') }

export default function ProductPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [stores, setStores] = useState<StoreType[]>([])
  const [categories, setCategories] = useState<CategoryType[]>([])
  const [selectedStoreId, setSelectedStoreId] = useState('')
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isOpenModal, setIsOpenModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [formData, setFormData] = useState(EMPTY_FORM)

  useEffect(() => { initPage() }, [])
  useEffect(() => { if (selectedStoreId) { loadProducts(selectedStoreId); loadCategories(selectedStoreId) } }, [selectedStoreId])

  async function initPage() {
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` }
      const { data } = await api.get('/stores', { headers })
      setStores(data)
      const cached = localStorage.getItem('storeId')
      const init = data.find((s: StoreType) => s.id === cached)?.id || data[0]?.id || ''
      if (init) { setSelectedStoreId(init); setFormData(p => ({ ...p, storeId: init })) }
      else setLoading(false)
    } catch { setLoading(false) }
  }

  async function loadProducts(storeId: string) {
    setLoading(true)
    try {
      const { data } = await api.get(`/products/store/${storeId}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      setProducts(data)
    } finally { setLoading(false) }
  }

  async function loadCategories(storeId: string) {
    try {
      const { data } = await api.get(`/categories/store/${storeId}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      setCategories(data)
    } catch { }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => {
      const img = new Image(); img.src = reader.result as string
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let w = img.width, h = img.height, max = 150
        if (w > h) { if (w > max) { h *= max / w; w = max } } else { if (h > max) { w *= max / h; h = max } }
        canvas.width = w; canvas.height = h
        const ctx = canvas.getContext('2d')
        if (ctx) { ctx.drawImage(img, 0, 0, w, h); setFormData(p => ({ ...p, image: canvas.toDataURL('image/jpeg', 0.6) })) }
      }
    }
    reader.readAsDataURL(file)
  }

  function openCreate() {
    setEditingId(null)
    setFormData({ ...EMPTY_FORM, storeId: selectedStoreId, categoryId: categories[0]?.id || '' })
    setIsOpenModal(true)
  }

  function openEdit(p: Product) {
    setEditingId(p.id)
    loadCategories(p.storeId)
    setFormData({ storeId: p.storeId, categoryId: p.categoryId || '', name: p.name, image: p.image || '', sku: p.sku || '', barcode: p.barcode || '', description: p.description || '', costPrice: p.costPrice, sellingPrice: p.sellingPrice, stock: p.stock, minimumStock: p.minimumStock, isActive: p.isActive })
    setIsOpenModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setIsSubmitting(true)
    const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` }
    const payload: any = { storeId: formData.storeId, categoryId: formData.categoryId, name: formData.name, costPrice: Number(formData.costPrice), sellingPrice: Number(formData.sellingPrice), stock: Number(formData.stock), minimumStock: Number(formData.minimumStock), isActive: formData.isActive }
    if (formData.sku?.trim()) payload.sku = formData.sku.trim()
    if (formData.barcode?.trim()) payload.barcode = formData.barcode.trim()
    if (formData.description?.trim()) payload.description = formData.description.trim()
    if (formData.image?.trim()) payload.image = formData.image.trim()
    try {
      if (editingId) { const { storeId, ...u } = payload; await api.patch(`/products/${editingId}`, u, { headers }) }
      else await api.post('/products', payload, { headers })
      setIsOpenModal(false); loadProducts(selectedStoreId)
    } catch (err: any) { alert(err.response?.data?.message || 'Gagal menyimpan') }
    finally { setIsSubmitting(false) }
  }

  async function remove(id: string) {
    if (!confirm('Hapus produk ini?')) return
    setDeletingId(id)
    try { await api.delete(`/products/${id}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }); loadProducts(selectedStoreId) }
    finally { setDeletingId(null) }
  }

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.barcode?.includes(searchQuery)
  )

  const lowStockCount = products.filter(p => p.stock <= p.minimumStock && p.isActive).length

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        .prod-root * { font-family: 'Inter', sans-serif; box-sizing: border-box; }
        .prod-row { border-bottom: 1px solid #F0EFF7; transition: background 0.15s; }
        .prod-row:last-child { border-bottom: none; }
        .prod-row:hover { background: #FDFCFF; }
        .prod-row:hover .row-act { opacity: 1; transform: translateX(0); }
        .row-act { opacity: 0; transform: translateX(4px); transition: all 0.18s; display: flex; gap: 4px; justify-content: flex-end; }
        .btn-icon { width: 30px; height: 30px; border-radius: 8px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; background: transparent; color: #9C99B8; transition: background 0.15s, color 0.15s; }
        .btn-icon:hover { background: #F3F2FA; color: #2d3544; }
        .btn-icon.danger:hover { background: #FFF0F0; color: #E53E3E; }
        .search-wrap { position: relative; }
        .search-wrap input { width: 100%; padding: 11px 16px 11px 42px; border: 1.5px solid #EEEDF5; border-radius: 12px; font-size: 13px; background: #fff; color: #1A1A2E; outline: none; transition: border-color 0.18s, box-shadow 0.18s; font-family: 'Inter', sans-serif; }
        .search-wrap input:focus { border-color: #2d3544; box-shadow: 0 0 0 3px rgba(45, 53, 68, 0.08); }
        .search-wrap input::placeholder { color: #B0AECB; }
        .store-sel { appearance: none; background: #fff; border: 1.5px solid #EEEDF5; padding: 10px 36px 10px 14px; border-radius: 12px; font-size: 13px; font-weight: 500; color: #1A1A2E; cursor: pointer; outline: none; transition: border-color 0.18s; font-family: 'Inter', sans-serif; }
        .store-sel:focus { border-color: #2d3544; box-shadow: 0 0 0 3px rgba(45, 53, 68, 0.08); }
        .modal-overlay { position: fixed; inset: 0; background: rgba(26,26,46,0.45); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; z-index: 50; padding: 16px; animation: fadeIn 0.2s ease; }
        .modal-box { width: 100%; max-width: 560px; max-height: 90vh; background: #fff; border-radius: 24px; box-shadow: 0 32px 80px rgba(26,26,46,0.18); animation: slideUp 0.25s ease; display: flex; flex-direction: column; overflow: hidden; }
        .modal-header { padding: 24px 28px 0; display: flex; align-items: flex-start; justify-content: space-between; flex-shrink: 0; }
        .modal-scroll { padding: 20px 28px 28px; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; }
        .modal-scroll::-webkit-scrollbar { width: 4px; }
        .modal-scroll::-webkit-scrollbar-track { background: transparent; }
        .modal-scroll::-webkit-scrollbar-thumb { background: #E5E3EF; border-radius: 4px; }
        .divider { height: 1px; background: #F0EFF7; margin: 16px 28px 0; flex-shrink: 0; }
        .section-label { font-size: 11px; font-weight: 700; color: #C5C3DC; letter-spacing: 0.08em; text-transform: uppercase; padding: 4px 0 2px; }
        .add-btn { background: #2563EB; color: #fff; border: none; border-radius: 12px; padding: 11px 20px; font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 8px; cursor: pointer; transition: background 0.18s, transform 0.1s; white-space: nowrap; font-family: 'Inter', sans-serif; box-shadow: 0 4px 12px rgba(37,99,235,0.15); }
        .add-btn:hover { background: #1D4ED8; }
        .add-btn:active { transform: scale(0.98); }
        .btn-save { width: 100%; padding: 14px; background: #2563EB; color: #fff; border: none; border-radius: 12px; font-size: 14px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: background 0.18s; font-family: 'Inter', sans-serif; box-shadow: 0 4px 12px rgba(37,99,235,0.15); }
        .btn-save:hover:not(:disabled) { background: #1D4ED8; }
        .btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-cancel { padding: 13px 20px; background: #F3F2FA; color: #5A5880; border: none; border-radius: 12px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.15s; font-family: 'Inter', sans-serif; }
        .btn-cancel:hover { background: #EEEDF5; }
        .skeleton { background: linear-gradient(90deg, #F3F2FA 25%, #EEEDF5 50%, #F3F2FA 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; border-radius: 8px; }
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes slideUp { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
        @keyframes shimmer { 0% { background-position:200% 0 } 100% { background-position:-200% 0 } }
      `}</style>

      <div className="prod-root" style={{ padding: '32px 24px', maxWidth: '1200px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '28px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <div style={{ width: '32px', height: '32px', background: '#F3F2FA', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Package size={16} color="#2d3544" />
              </div>
              <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#1A1A2E', margin: 0 }}>
                Katalog Produk
                {!loading && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', background: '#F3F2FA', color: '#2d3544', fontSize: '12px', fontWeight: '600', padding: '2px 10px', borderRadius: '20px', marginLeft: '8px', verticalAlign: 'middle' }}>
                    {products.length}
                  </span>
                )}
              </h1>
            </div>
            <p style={{ fontSize: '13px', color: '#9C99B8', margin: 0 }}>Kelola inventori, harga jual, SKU, barcode, dan stok minimum</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            {lowStockCount > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '10px', padding: '7px 12px' }}>
                <AlertTriangle size={13} color="#D97706" />
                <span style={{ fontSize: '12px', fontWeight: '600', color: '#B45309' }}>{lowStockCount} stok menipis</span>
              </div>
            )}
            <button className="add-btn" onClick={openCreate}>
              <Plus size={16} /> Tambah Produk
            </button>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-wrap" style={{ flex: '1', minWidth: '200px', maxWidth: '380px' }}>
            <Search size={15} color="#B0AECB" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input placeholder="Cari nama, SKU, atau barcode…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#B0AECB', display: 'flex' }}>
                <X size={14} />
              </button>
            )}
          </div>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Store size={14} color="#B0AECB" style={{ position: 'absolute', left: '12px', pointerEvents: 'none' }} />
            <select 
              className="store-sel" 
              style={{ paddingLeft: '34px' }} 
              value={selectedStoreId} 
              onChange={e => {
                setSelectedStoreId(e.target.value)
                localStorage.setItem('storeId', e.target.value)
              }}
            >
              {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <ChevronDown size={13} color="#C5C3DC" style={{ position: 'absolute', right: '12px', pointerEvents: 'none' }} />
          </div>
          {!loading && filtered.length > 0 && (
            <span style={{ fontSize: '12px', color: '#C5C3DC', marginLeft: 'auto' }}>
              {filtered.length} dari {products.length} produk
            </span>
          )}
        </div>

        {/* Table */}
        <div style={{ background: '#fff', border: '1.5px solid #EEEDF5', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(26,26,46,0.04)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
              <thead>
                <tr style={{ background: '#F9F8FC' }}>
                  {['', 'Produk', 'Kategori', 'SKU / Barcode', 'Modal', 'Harga Jual', 'Stok', 'Status', ''].map((h, i) => (
                    <th key={i} style={{
                      padding: i === 0 ? '12px 8px 12px 20px' : '12px 14px',
                      textAlign: i === 8 ? 'right' : 'left',
                      fontSize: '11px', fontWeight: '600', color: '#9C99B8',
                      letterSpacing: '0.06em', textTransform: 'uppercase',
                      borderBottom: '1.5px solid #EEEDF5', whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [1, 2, 3, 4].map(i => (
                    <tr key={i} className="prod-row">
                      <td colSpan={9} style={{ padding: '14px 20px' }}>
                        <div className="skeleton" style={{ height: '18px', width: `${50 + i * 8}%` }} />
                      </td>
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '60px 20px', textAlign: 'center' }}>
                      <Package size={28} style={{ margin: '0 auto 10px', color: '#C5C3DC' }} />
                      <p style={{ fontSize: '14px', fontWeight: '500', color: '#9C99B8', margin: '0 0 4px' }}>
                        {searchQuery ? 'Tidak ada produk yang cocok' : 'Katalog masih kosong'}
                      </p>
                      <p style={{ fontSize: '12px', color: '#C5C3DC', margin: 0 }}>
                        {searchQuery ? 'Coba kata kunci lain' : 'Klik "Tambah Produk" untuk memulai'}
                      </p>
                    </td>
                  </tr>
                ) : filtered.map(p => {
                  const disc = getMasterDiscount(p)
                  const final = getFinalPrice(p)
                  const lowStock = p.stock <= p.minimumStock
                  const discInfo = p.discounts?.[0]?.discount
                  return (
                    <tr key={p.id} className="prod-row">
                      {/* Image */}
                      <td style={{ padding: '12px 8px 12px 20px', width: '56px' }}>
                        {p.image ? (
                          <img src={p.image} alt={p.name} style={{ width: '44px', height: '44px', borderRadius: '10px', objectFit: 'cover', border: '1px solid #EEEDF5' }} />
                        ) : (
                          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#F3F2FA', border: '1px solid #EEEDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <ImageIcon size={16} color="#C5C3DC" />
                          </div>
                        )}
                      </td>

                      {/* Name */}
                      <td style={{ padding: '12px 14px', maxWidth: '180px' }}>
                        <p style={{ fontSize: '13px', fontWeight: '600', color: '#1A1A2E', margin: '0 0 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</p>
                        {p.description && <p style={{ fontSize: '11px', color: '#B0AECB', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '160px' }}>{p.description}</p>}
                      </td>

                      {/* Category */}
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#F3F2FA', color: '#5A5880', fontSize: '11px', fontWeight: '600', padding: '3px 8px', borderRadius: '6px' }}>
                          <Folder size={11} color="#B0AECB" />
                          {p.category?.name || 'Umum'}
                        </span>
                      </td>

                      {/* SKU / Barcode */}
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '3px' }}>
                          <Tag size={11} color="#C5C3DC" />
                          <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#8B87A8' }}>{p.sku || '—'}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Barcode size={11} color="#C5C3DC" />
                          <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#8B87A8' }}>{p.barcode || '—'}</span>
                        </div>
                      </td>

                      {/* Cost */}
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: '13px', color: '#5A5880', fontWeight: '500' }}>Rp {fmt(p.costPrice)}</span>
                      </td>

                      {/* Selling price */}
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: disc > 0 ? '#16A34A' : '#1A1A2E', display: 'block' }}>
                          Rp {fmt(final)}
                        </span>
                        {disc > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                            <span style={{ fontSize: '11px', color: '#C5C3DC', textDecoration: 'line-through' }}>Rp {fmt(p.sellingPrice)}</span>
                            <span style={{ fontSize: '10px', fontWeight: '700', background: '#FFF1F2', color: '#E53E3E', padding: '1px 5px', borderRadius: '4px' }}>
                              {discInfo?.type === 'PERCENTAGE' ? `${discInfo.value}%` : `−Rp ${fmt(disc)}`}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Stock */}
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{ fontSize: '13px', fontWeight: '700', color: lowStock && p.isActive ? '#D97706' : '#1A1A2E' }}>
                            {p.stock}
                          </span>
                          {lowStock && p.isActive && (
                            <span title="Stok menipis" style={{ display: 'flex', alignItems: 'center' }}>
                              <AlertTriangle size={12} color="#D97706" />
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: '11px', color: '#C5C3DC' }}>min. {p.minimumStock}</span>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '5px',
                          padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600',
                          background: p.isActive ? '#F0FDF4' : '#F9F8FC',
                          color: p.isActive ? '#16A34A' : '#9C99B8',
                          border: `1px solid ${p.isActive ? '#BBF7D0' : '#E5E3EF'}`,
                        }}>
                          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: p.isActive ? '#22C55E' : '#C5C3DC', display: 'inline-block' }} />
                          {p.isActive ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '12px 20px 12px 14px' }}>
                        <div className="row-act">
                          <button className="btn-icon" title="Edit" onClick={() => openEdit(p)}>
                            <Edit3 size={14} />
                          </button>
                          <button className="btn-icon danger" title="Hapus" onClick={() => remove(p.id)} disabled={deletingId === p.id}>
                            {deletingId === p.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ─── Modal ─── */}
      {isOpenModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setIsOpenModal(false) }}>
          <div className="modal-box">
            <div className="modal-header">
              <div>
                <p style={{ fontSize: '20px', fontWeight: '700', color: '#1A1A2E', margin: 0 }}>
                  {editingId ? 'Edit Produk' : 'Tambah Produk Baru'}
                </p>
                <p style={{ fontSize: '13px', color: '#9C99B8', margin: '3px 0 0' }}>
                  {editingId ? 'Perbarui informasi barang dagangan' : 'Isi detail item baru untuk katalog'}
                </p>
              </div>
              <button style={{ width: '34px', height: '34px', borderRadius: '10px', border: '1.5px solid #EEEDF5', background: '#F9F8FC', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                onClick={() => setIsOpenModal(false)}>
                <X size={16} color="#9C99B8" />
              </button>
            </div>
            <div className="divider" />

            <form onSubmit={handleSubmit} style={{ display: 'contents' }}>
              <div className="modal-scroll">

                {/* Photo */}
                <div>
                  <p className="section-label">Foto Produk</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {formData.image ? (
                      <div style={{ position: 'relative', width: '72px', height: '72px', flexShrink: 0 }}>
                        <img src={formData.image} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px', border: '1.5px solid #EEEDF5' }} />
                        <button type="button" onClick={() => setFormData(p => ({ ...p, image: '' }))}
                          style={{ position: 'absolute', top: '-6px', right: '-6px', width: '20px', height: '20px', borderRadius: '50%', background: '#1A1A2E', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <X size={10} color="#fff" />
                        </button>
                      </div>
                    ) : (
                      <label style={{ width: '72px', height: '72px', flexShrink: 0, border: '2px dashed #E5E3EF', borderRadius: '12px', background: '#F9F8FC', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', gap: '4px', transition: 'background 0.15s' }}>
                        <Upload size={18} color="#C5C3DC" />
                        <span style={{ fontSize: '10px', fontWeight: '600', color: '#C5C3DC' }}>Upload</span>
                        <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                      </label>
                    )}
                    <p style={{ fontSize: '12px', color: '#B0AECB', lineHeight: '1.5', margin: 0 }}>
                      JPG, PNG, atau WEBP. Gambar akan dikompres otomatis ke 150×150px.
                    </p>
                  </div>
                </div>

                {/* Store & Category */}
                <div>
                  <p className="section-label">Penempatan</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <FSelect label="Cabang Toko" icon={Store} value={formData.storeId} required disabled={!!editingId}
                      onChange={(e: any) => { setFormData({ ...formData, storeId: e.target.value, categoryId: '' }); loadCategories(e.target.value) }}>
                      {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </FSelect>
                    <FSelect label="Kategori" icon={Folder} value={formData.categoryId} required
                      onChange={(e: any) => setFormData({ ...formData, categoryId: e.target.value })}>
                      <option value="" disabled>Pilih kategori</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </FSelect>
                  </div>
                </div>

                {/* Name */}
                <div>
                  <p className="section-label">Identitas Produk</p>
                  <FInput label="Nama Produk" value={formData.name} onChange={(v: string) => setFormData({ ...formData, name: v })} required placeholder="Contoh: Kemeja Flanel Slimfit" />
                </div>

                {/* SKU & Barcode */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <FInput label="Kode SKU" icon={Layers} value={formData.sku} onChange={(v: string) => setFormData({ ...formData, sku: v })} placeholder="Otomatis jika kosong" />
                  <FInput label="Barcode" icon={Barcode} value={formData.barcode} onChange={(v: string) => setFormData({ ...formData, barcode: v })} placeholder="Otomatis jika kosong" />
                </div>

                <div>
                  <p className="section-label">Harga</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <FInput label="Harga Modal (Rp)" type="number" min={0} value={formData.costPrice || ''} onChange={(v: number) => setFormData({ ...formData, costPrice: v })} required placeholder="0" />
                    <FInput label="Harga Jual (Rp)" type="number" min={0} value={formData.sellingPrice || ''} onChange={(v: number) => setFormData({ ...formData, sellingPrice: v })} required placeholder="0" />
                  </div>
                  {formData.costPrice > 0 && formData.sellingPrice > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', padding: '8px 12px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '10px' }}>
                      <span style={{ fontSize: '12px', color: '#5A5880' }}>Margin:</span>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: formData.sellingPrice > formData.costPrice ? '#16A34A' : '#E53E3E' }}>
                        Rp {fmt(formData.sellingPrice - formData.costPrice)}
                        {' '}({((formData.sellingPrice - formData.costPrice) / formData.costPrice * 100).toFixed(1)}%)
                      </span>
                    </div>
                  )}
                </div>

                {/* Stock */}
                <div>
                  <p className="section-label">Inventori</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <FInput label="Stok Awal" icon={Boxes} type="number" min={0} value={formData.stock || ''} onChange={(v: number) => setFormData({ ...formData, stock: v })} placeholder="0" />
                    <FInput label="Batas Minimum" icon={AlertTriangle} type="number" min={0} value={formData.minimumStock || ''} onChange={(v: number) => setFormData({ ...formData, minimumStock: v })} placeholder="0" />
                  </div>
                </div>

                {/* Description */}
                <FTextarea label="Deskripsi" icon={FileText} value={formData.description} onChange={(v: string) => setFormData({ ...formData, description: v })} placeholder="Varian, ukuran, warna, dll." />

                {/* Active toggle */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: '#F9F8FC', borderRadius: '12px', border: '1.5px solid #EEEDF5', cursor: 'pointer' }}
                  onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: '600', color: '#1A1A2E', margin: '0 0 1px' }}>Tampil di katalog POS</p>
                    <p style={{ fontSize: '12px', color: '#9C99B8', margin: 0 }}>Produk bisa dipilih oleh kasir saat transaksi</p>
                  </div>
                  {formData.isActive
                    ? <ToggleRight size={28} color="#6C63FF" />
                    : <ToggleLeft size={28} color="#C5C3DC" />
                  }
                </div>

                {/* Footer buttons */}
                <div style={{ display: 'flex', gap: '10px', paddingTop: '4px' }}>
                  <button type="button" className="btn-cancel" onClick={() => setIsOpenModal(false)} disabled={isSubmitting}>
                    Batal
                  </button>
                  <button type="submit" className="btn-save" disabled={isSubmitting || !formData.categoryId}>
                    {isSubmitting
                      ? <><Loader2 size={16} className="animate-spin" /> Menyimpan…</>
                      : <>{editingId ? 'Simpan Perubahan' : 'Daftarkan Produk'} <ChevronRight size={16} /></>
                    }
                  </button>
                </div>

              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
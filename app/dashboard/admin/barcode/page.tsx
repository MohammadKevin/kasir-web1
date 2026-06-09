'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import {
  Barcode, Search, Sparkles, Printer, Store,
  AlertCircle, Loader2, CheckSquare, Square, Box
} from 'lucide-react'
import BarcodeRender from 'react-barcode'

type Product = { id: string; name: string; sku: string; barcode: string | null; stock: number }
type StoreType = { id: string; name: string }

export default function BarcodePage() {
  const [products, setProducts] = useState<Product[]>([])
  const [stores, setStores] = useState<StoreType[]>([])
  const [selectedStoreId, setSelectedStoreId] = useState('')
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  useEffect(() => { initStores() }, [])
  useEffect(() => { if (selectedStoreId) loadProducts(selectedStoreId) }, [selectedStoreId])

  async function initStores() {
    const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` }
    const res = await api.get('/stores', { headers })
    setStores(res.data)
    if (res.data.length > 0) setSelectedStoreId(res.data[0].id)
  }

  async function loadProducts(id: string) {
    setLoading(true)
    try {
      const res = await api.get(`/products/store/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      })
      setProducts(res.data)
    } finally { setLoading(false) }
  }

  async function handleGenerateSingle(id: string) {
    setIsProcessing(true)
    try {
      await api.post(`/products/${id}/generate-barcode`, {}, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      loadProducts(selectedStoreId)
    } finally { setIsProcessing(false) }
  }

  async function handleGenerateAll() {
    if (!confirm('Generate barcode untuk semua produk yang belum memiliki barcode?')) return
    setIsProcessing(true)
    try {
      await api.post(`/products/store/${selectedStoreId}/generate-barcodes`, {}, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      loadProducts(selectedStoreId)
    } finally { setIsProcessing(false) }
  }

  function printLabels(items: { barcode: string; name: string }[]) {
    if (items.length === 0) return;

    const win = window.open('', '_blank', 'width=800,height=600');
    if (!win) return;

    win.document.write(`
    <html>
      <head>
        <style>
          @page { size: auto; margin: 5mm; }
          body { font-family: 'Courier New', monospace; }
          .label { 
            width: 300px; /* Lebar fisik label */
            border: 1px solid #000; 
            padding: 10px; 
            margin-bottom: 10px;
            display: flex; 
            flex-direction: column; 
            align-items: center;
            box-sizing: border-box; /* PENTING: Agar padding tidak menambah lebar */
            overflow: hidden; /* Memastikan isi tidak keluar kotak */
          }
          .name { font-size: 14px; font-weight: bold; margin-bottom: 8px; text-transform: uppercase; }
          .barcode-container { 
            width: 100%; /* Mengikuti lebar parent */
            display: flex;
            justify-content: center;
            overflow: hidden;
          }
          .barcode-container svg {
            max-width: 100%; /* Memaksa SVG tidak lebih lebar dari kotak */
            height: auto;
          }
          .code-text { font-size: 10px; margin-top: 5px; word-break: break-all; }
        </style>
      </head>
      <body>
        ${items.map(i => `
          <div class="label">
            <div class="name">${i.name}</div>
            <div class="barcode-container">
              <svg class="barcode" data-barcode="${i.barcode}"></svg>
            </div>
            <div class="code-text">${i.barcode}</div>
          </div>
        `).join('')}
      </body>
    </html>
  `);

    const script = win.document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js';
    script.onload = () => {
      win.document.querySelectorAll('.barcode').forEach((el) => {
        const barcodeValue = el.getAttribute('data-barcode')!;
        (win as any).JsBarcode(el, barcodeValue, {
          format: "CODE128",
          width: 1.5, // Sedikit diperkecil agar muat
          height: 40,
          displayValue: false,
          margin: 0,
          // Properti krusial agar barcode tidak meluber:
          fitContent: true
        });
      });

      setTimeout(() => {
        win.print();
        win.close();
      }, 300);
    };

    win.document.head.appendChild(script);
    win.document.close();
  }

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const isAllSelected = selectedIds.length > 0 && selectedIds.length === filtered.length

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manajemen Barcode</h1>
          <p className="text-slate-500">Generate dan cetak label untuk inventaris produk.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-3 py-2 border rounded-xl shadow-sm">
            <Store size={18} className="text-slate-400" />
            <select value={selectedStoreId} onChange={e => setSelectedStoreId(e.target.value)} className="text-sm outline-none bg-transparent font-medium">
              {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <button onClick={handleGenerateAll} disabled={isProcessing} className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-sm">
            {isProcessing ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />} Auto-Generate
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b flex flex-wrap gap-4 items-center justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3.5 top-3 text-slate-400" size={18} />
            <input className="w-full border border-slate-200 p-2.5 pl-10 rounded-xl text-sm outline-none focus:border-slate-400" placeholder="Cari nama atau SKU produk..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
          <button
            onClick={() => printLabels(products.filter(p => selectedIds.includes(p.id) && p.barcode).map(p => ({ barcode: p.barcode!, name: p.name })))}
            disabled={selectedIds.length === 0}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all"
          >
            <Printer size={16} /> Cetak Terpilih ({selectedIds.length})
          </button>
        </div>

        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
            <tr>
              <th className="p-4 w-10">
                <button onClick={() => setSelectedIds(isAllSelected ? [] : filtered.map(p => p.id))}>
                  {isAllSelected ? <CheckSquare size={18} className="text-blue-600" /> : <Square size={18} />}
                </button>
              </th>
              <th className="p-4 text-left">Produk</th>
              <th className="p-4 text-left">Status Barcode</th>
              <th className="p-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={4} className="text-center py-10 text-slate-400"><Loader2 className="animate-spin inline mr-2" /> Memuat data...</td></tr>
            ) : filtered.map(p => (
              <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-4">
                  <button onClick={() => setSelectedIds(prev => prev.includes(p.id) ? prev.filter(i => i !== p.id) : [...prev, p.id])}>
                    {selectedIds.includes(p.id) ? <CheckSquare size={18} className="text-blue-600" /> : <Square size={18} className="text-slate-300" />}
                  </button>
                </td>
                <td className="p-4">
                  <div className="font-semibold text-slate-900">{p.name}</div>
                  <div className="text-xs text-slate-500">SKU: {p.sku}</div>
                </td>
                <td className="p-4">
                  {p.barcode ? (
                    <div className="bg-white border rounded p-1 inline-block"><BarcodeRender value={p.barcode} height={20} width={1.2} fontSize={9} /></div>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded-full w-fit">
                      <AlertCircle size={12} /> Belum ada
                    </span>
                  )}
                </td>
                <td className="p-4 text-right">
                  {p.barcode ? (
                    <button onClick={() => printLabels([{ barcode: p.barcode!, name: p.name }])} className="text-blue-600 hover:text-blue-800 font-bold text-xs underline">Cetak Satuan</button>
                  ) : (
                    <button onClick={() => handleGenerateSingle(p.id)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-semibold text-xs">Generate</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
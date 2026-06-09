'use client'

import { useEffect, useState, useMemo } from 'react'
import { api } from '@/lib/api'
import {
  Barcode, Search, Sparkles, Printer, Store,
  AlertCircle, Loader2, CheckSquare, Square
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
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` }
      const res = await api.get('/stores', { headers })
      setStores(res.data)
      
      const cachedStoreId = localStorage.getItem('storeId')
      const initialStoreId = res.data.find((s: StoreType) => s.id === cachedStoreId)?.id || res.data[0]?.id || ''
      if (initialStoreId) {
        setSelectedStoreId(initialStoreId)
      }
    } catch (err) {
      console.error(err)
    }
  }

  async function loadProducts(id: string) {
    setLoading(true)
    try {
      const res = await api.get(`/products/store/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      })
      setProducts(res.data)
    } catch (err) {
      console.error(err)
    } finally { setLoading(false) }
  }

  async function handleGenerateSingle(id: string) {
    setIsProcessing(true)
    try {
      await api.post(`/products/${id}/generate-barcode`, {}, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      loadProducts(selectedStoreId)
    } catch (err) {
      console.error(err)
    } finally { setIsProcessing(false) }
  }

  async function handleGenerateAll() {
    if (!confirm('Generate barcode untuk semua produk yang belum memiliki barcode?')) return
    setIsProcessing(true)
    try {
      await api.post(`/products/store/${selectedStoreId}/generate-barcodes`, {}, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      loadProducts(selectedStoreId)
    } catch (err) {
      console.error(err)
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
            width: 300px; 
            border: 1px solid #000; 
            padding: 10px; 
            margin-bottom: 10px;
            display: flex; 
            flex-direction: column; 
            align-items: center;
            box-sizing: border-box;
            overflow: hidden;
          }
          .name { font-size: 14px; font-weight: bold; margin-bottom: 8px; text-transform: uppercase; }
          .barcode-container { 
            width: 100%;
            display: flex;
            justify-content: center;
            overflow: hidden;
          }
          .barcode-container svg {
            max-width: 100%;
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
          width: 1.5,
          height: 40,
          displayValue: false,
          margin: 0,
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

  const filtered = useMemo(() => {
    return products.filter(p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [products, searchQuery])

  const isAllSelected = selectedIds.length > 0 && selectedIds.length === filtered.length

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
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Manajemen Barcode</h1>
          <p className="text-sm text-slate-500 mt-1">Generate dan cetak label barcode untuk inventaris produk cabang toko.</p>
        </div>

        <button
          onClick={handleGenerateAll}
          disabled={isProcessing}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 shadow-blue-500/10 transition-all active:scale-98 self-start sm:self-auto disabled:opacity-40 cursor-pointer"
        >
          {isProcessing ? (
            <Loader2 className="w-4 h-4 animate-spin text-white" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          Generate Barcode Kosong
        </button>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama produk atau SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 py-3 text-sm outline-none transition-all placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-50 shadow-sm"
          />
        </div>

        <div className="flex items-center gap-4 self-start sm:self-auto">
          {selectedIds.length > 0 && (
            <button
              onClick={() => printLabels(products.filter(p => selectedIds.includes(p.id) && p.barcode).map(p => ({ barcode: p.barcode!, name: p.name })))}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 shadow-sm transition-all"
            >
              <Printer className="w-4 h-4" /> Cetak Terpilih ({selectedIds.length})
            </button>
          )}

          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
            <Store className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Toko:</span>
            <select
              value={selectedStoreId}
              onChange={(e) => {
                setSelectedStoreId(e.target.value)
                localStorage.setItem('storeId', e.target.value)
              }}
              className="bg-transparent text-sm font-semibold text-slate-800 outline-none pr-2 cursor-pointer border-none p-0 focus:ring-0"
            >
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm text-slate-600">
            <thead className="bg-slate-50/70 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 w-12 text-center">
                  <button 
                    onClick={() => setSelectedIds(isAllSelected ? [] : filtered.map(p => p.id))}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {isAllSelected ? <CheckSquare className="w-5 h-5 text-blue-600" /> : <Square className="w-5 h-5" />}
                  </button>
                </th>
                <th scope="col" className="px-6 py-4">Nama Produk / SKU</th>
                <th scope="col" className="px-6 py-4">Status Barcode</th>
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
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-slate-400">
                        <Barcode className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-medium text-slate-600">Produk tidak ditemukan</p>
                      <p className="text-xs text-slate-400">Belum ada produk terdaftar untuk toko ini atau filter pencarian tidak cocok.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="transition-colors hover:bg-slate-50/50 group">
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => setSelectedIds(prev => prev.includes(p.id) ? prev.filter(i => i !== p.id) : [...prev, p.id])}
                        className="text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {selectedIds.includes(p.id) ? <CheckSquare className="w-5 h-5 text-blue-600" /> : <Square className="w-5 h-5" />}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900 text-base">{p.name}</div>
                      <div className="text-xs font-mono text-slate-400 mt-0.5">SKU: {p.sku}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {p.barcode ? (
                        <div className="bg-white border rounded p-1.5 inline-block shadow-2xs">
                          <BarcodeRender value={p.barcode} height={25} width={1.3} fontSize={9} displayValue={false} />
                          <div className="text-[10px] text-center font-mono font-bold text-slate-500 mt-1">{p.barcode}</div>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                          <AlertCircle className="w-3 h-3" />
                          Belum ada barcode
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      {p.barcode ? (
                        <button 
                          onClick={() => printLabels([{ barcode: p.barcode!, name: p.name }])} 
                          className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors hover:underline"
                        >
                          <Printer className="w-3 h-3" /> Cetak Label
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleGenerateSingle(p.id)} 
                          disabled={isProcessing}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-xl font-bold text-xs shadow-sm shadow-blue-500/10 transition-all disabled:opacity-40 cursor-pointer"
                        >
                          Generate
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
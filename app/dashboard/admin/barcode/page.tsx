'use client'

import { useEffect, useState, useMemo } from 'react'
import { api } from '@/lib/api'
import {
  Barcode, 
  Search, 
  Sparkles, 
  Printer, 
  Store,
  AlertCircle, 
  Loader2, 
  CheckSquare, 
  Square,
  X,
  ChevronDown
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

  useEffect(() => { 
    initStores() 
  }, [])
  
  useEffect(() => { 
    if (selectedStoreId) loadProducts(selectedStoreId) 
  }, [selectedStoreId])

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
    } finally { 
      setLoading(false) 
    }
  }

  async function handleGenerateSingle(id: string) {
    setIsProcessing(true)
    try {
      await api.post(`/products/${id}/generate-barcode`, {}, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      loadProducts(selectedStoreId)
    } catch (err) {
      console.error(err)
    } finally { 
      setIsProcessing(false) 
    }
  }

  async function handleGenerateAll() {
    if (!confirm('Generate barcode untuk semua produk yang belum memiliki barcode?')) return
    setIsProcessing(true)
    try {
      await api.post(`/products/store/${selectedStoreId}/generate-barcodes`, {}, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      loadProducts(selectedStoreId)
    } catch (err) {
      console.error(err)
    } finally { 
      setIsProcessing(false) 
    }
  }

  function printLabels(items: { barcode: string; name: string }[]) {
    if (items.length === 0) return

    const win = window.open('', '_blank', 'width=800,height=600')
    if (!win) return

    win.document.write(`
    <html>
      <head>
        <style>
          @page { size: auto; margin: 5mm; }
          body { font-family: 'Courier New', monospace; margin: 0; padding: 10px; }
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
          .name { font-size: 14px; font-weight: bold; margin-bottom: 8px; text-transform: uppercase; text-align: center; }
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
          .code-text { font-size: 10px; margin-top: 5px; word-break: break-all; font-weight: bold; }
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
  `)

    const script = win.document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js'
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
        })
      })

      setTimeout(() => {
        win.print()
        win.close()
      }, 300)
    }

    win.document.head.appendChild(script)
    win.document.close()
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
      <div className="space-y-6">
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
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 bg-blue-50 border border-blue-100/50 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
            <Barcode size={20} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">Manajemen Barcode SKU</h1>
            <p className="text-xs font-semibold text-slate-450 mt-0.5">Generate kode barcode baru untuk produk dan cetak tag label thermal</p>
          </div>
        </div>

        <button
          onClick={handleGenerateAll}
          disabled={isProcessing}
          className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-xs font-bold text-white transition-all shadow-3xs active:scale-97 cursor-pointer disabled:opacity-40"
        >
          {isProcessing ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
          ) : (
            <Sparkles className="w-3.5 h-3.5" />
          )}
          <span>Generate Barcode Kosong</span>
        </button>
      </div>

      {/* Toolbar / Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        
        {/* Search */}
        <div className="relative flex-1">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari produk berdasarkan nama atau SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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

        <div className="flex flex-wrap items-center gap-3 shrink-0 sm:ml-auto">
          {selectedIds.length > 0 && (
            <button
              onClick={() => printLabels(products.filter(p => selectedIds.includes(p.id) && p.barcode).map(p => ({ barcode: p.barcode!, name: p.name })))}
              className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-xs font-bold text-white transition-all shadow-3xs active:scale-97 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Terpilih ({selectedIds.length})</span>
            </button>
          )}

          {/* Store select */}
          <div className="relative shrink-0">
            <select
              value={selectedStoreId}
              onChange={(e) => {
                setSelectedStoreId(e.target.value)
                localStorage.setItem('storeId', e.target.value)
              }}
              className="w-full sm:w-60 appearance-none bg-white border border-slate-200/80 pl-4 pr-10 py-3.5 rounded-xl text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 cursor-pointer transition-all"
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

      </div>

      {/* Main Table */}
      <div className="rounded-2xl border border-slate-200/70 bg-white shadow-3xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                <th className="p-4 pl-6 w-12 text-center">
                  <button 
                    onClick={() => setSelectedIds(isAllSelected ? [] : filtered.map(p => p.id))}
                    className="text-slate-400 hover:text-slate-655 transition-colors flex items-center justify-center mx-auto"
                  >
                    {isAllSelected ? <CheckSquare className="w-5 h-5 text-blue-650" /> : <Square className="w-5 h-5" />}
                  </button>
                </th>
                <th className="p-4">Nama Produk / SKU</th>
                <th className="p-4">Status & Render Barcode</th>
                <th className="p-4 pr-6 text-right">Aksi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-655 font-semibold">
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-10 text-center">
                    <Loader2 className="w-5 h-5 animate-spin text-slate-400 mx-auto" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-16 text-center text-slate-400">
                    <Barcode className="w-8 h-8 mx-auto text-slate-350 opacity-60 mb-3" />
                    <p className="text-xs font-bold text-slate-500">Produk tidak ditemukan</p>
                    <p className="text-[10px] text-slate-400 mt-1">Belum ada produk terdaftar untuk cabang ini atau filter tidak cocok.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="group hover:bg-slate-50/45 transition-colors">
                    <td className="p-4 pl-6 text-center">
                      <button 
                        onClick={() => setSelectedIds(prev => prev.includes(p.id) ? prev.filter(i => i !== p.id) : [...prev, p.id])}
                        className="text-slate-400 hover:text-slate-655 transition-colors flex items-center justify-center mx-auto"
                      >
                        {selectedIds.includes(p.id) ? <CheckSquare className="w-5 h-5 text-blue-600" /> : <Square className="w-5 h-5" />}
                      </button>
                    </td>
                    <td className="p-4">
                      <div className="font-extrabold text-slate-900 text-xs">{p.name}</div>
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">SKU: {p.sku || '—'}</div>
                    </td>
                    <td className="p-4">
                      {p.barcode ? (
                        <div className="bg-white border border-slate-200 rounded-lg p-2 inline-flex flex-col items-center shadow-3xs max-w-fit">
                          <BarcodeRender value={p.barcode} height={20} width={1.2} fontSize={9} displayValue={false} margin={0} />
                          <div className="text-[8.5px] font-mono font-extrabold text-slate-500 mt-1.5 leading-none">{p.barcode}</div>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-55/40 border border-amber-150 px-2.5 py-0.5 text-[9px] font-bold text-amber-700">
                          <AlertCircle className="w-3 h-3" />
                          <span>Belum ada barcode</span>
                        </span>
                      )}
                    </td>
                    <td className="p-4 pr-6 text-right">
                      {p.barcode ? (
                        <button 
                          onClick={() => printLabels([{ barcode: p.barcode!, name: p.name }])} 
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-750 transition-colors"
                        >
                          <Printer className="w-3.5 h-3.5" /> 
                          <span>Cetak Label</span>
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleGenerateSingle(p.id)} 
                          disabled={isProcessing}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-xl font-bold text-xs shadow-3xs active:scale-97 transition-all disabled:opacity-40 cursor-pointer"
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
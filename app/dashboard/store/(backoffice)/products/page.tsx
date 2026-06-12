'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  Package,
  Printer,
  Boxes,
  ArrowLeft,
  Loader2,
  ChevronDown
} from 'lucide-react'
import BarcodeRender from 'react-barcode'
import { api } from '@/lib/api'

type Product = {
  id: string
  name: string
  image?: string
  sku: string
  barcode: string | null
  sellingPrice: number
  stock: number
  minimumStock: number
  categoryId?: string | null
}

type CategoryType = {
  id: string
  name: string
}

export default function ProductsPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<CategoryType[]>([{ id: 'ALL', name: 'Semua produk' }])
  const [selectedCategoryId, setSelectedCategoryId] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const storeId = localStorage.getItem('storeId')
    if (storeId) {
      loadData(storeId)
    } else {
      setLoading(false)
    }
  }, [])

  async function loadData(id: string) {
    setLoading(true)
    const token = localStorage.getItem('token')
    const headers = { Authorization: `Bearer ${token}` }

    try {
      const [productsRes, categoriesRes] = await Promise.all([
        api.get(`/products/store/${id}`, { headers }),
        api.get(`/categories/store/${id}`, { headers })
      ])

      setProducts(productsRes.data || [])

      if (categoriesRes.data) {
        setCategories([
          { id: 'ALL', name: 'Semua produk' },
          ...categoriesRes.data.map((c: any) => ({ id: c.id, name: c.name }))
        ])
      }
    } catch (error) {
      console.error('Gagal memuat data inventori:', error)
    } finally {
      setLoading(false)
    }
  }

  function handlePrintSingleBarcode(barcodeData: string, productName: string) {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(`
      <html>
        <head>
          <title>Label - ${productName}</title>
          <style>
            body { display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: sans-serif; margin: 0; padding: 10px; }
            .label { text-align: center; font-size: 10px; font-weight: bold; margin-bottom: 2px; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          </style>
        </head>
        <body>
          <div class="label">${productName}</div>
          <div id="bc"></div>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
          <script>
            const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            document.getElementById("bc").appendChild(svg);
            JsBarcode(svg, "${barcodeData}", { format: "CODE128", width: 1.4, height: 40, displayValue: true, fontSize: 11 });
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  function handlePrintAllBarcodes() {
    const productsWithBarcode = filtered.filter(p => p.barcode);
    if (productsWithBarcode.length === 0) return alert('Tidak ada produk yang memiliki kode barcode.');

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;

    printWindow.document.write(`
    <html>
      <head>
        <style>
          @page { size: auto; margin: 5mm; }
          body { font-family: 'Courier New', monospace; padding: 10px; }
          .label { 
            width: 300px; 
            border: 1px solid #000; 
            padding: 10px; 
            margin-bottom: 10px;
            display: flex; 
            flex-direction: column; 
            align-items: center;
            box-sizing: border-box;
            page-break-inside: avoid;
          }
          .name { font-size: 14px; font-weight: bold; margin-bottom: 8px; text-transform: uppercase; text-align: center; }
          .barcode-container { width: 100%; display: flex; justify-content: center; }
        </style>
      </head>
      <body>
        ${productsWithBarcode.map(i => `
          <div class="label">
            <div class="name">${i.name}</div>
            <div class="barcode-container">
              <svg class="barcode" data-barcode="${i.barcode}"></svg>
            </div>
            <div style="font-size: 10px; margin-top: 5px;">${i.barcode}</div>
          </div>
        `).join('')}
        
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
        <script>
          document.querySelectorAll('.barcode').forEach(svg => {
            JsBarcode(svg, svg.getAttribute('data-barcode'), { 
              format: "CODE128", 
              width: 2, 
              height: 40, 
              displayValue: false, 
              margin: 0 
            });
          });
          
          window.onload = () => {
            window.print();
            window.close();
          };
        </script>
      </body>
    </html>
  `);
    printWindow.document.close();
  }

  const filtered = useMemo(() => {
    return products.filter((x) => {
      const matchesSearch = x.name.toLowerCase().includes(search.toLowerCase()) ||
        x.sku.toLowerCase().includes(search.toLowerCase()) ||
        (x.barcode && x.barcode.includes(search))

      const matchesCategory = selectedCategoryId === 'ALL' || x.categoryId === selectedCategoryId

      return matchesSearch && matchesCategory
    })
  }, [products, search, selectedCategoryId])

  const formatIDR = (num: number) => `Rp ${num.toLocaleString('id-ID')}`

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/dashboard/store')}
            className="p-1.5 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-3xs bg-white cursor-pointer"
            title="Kembali ke Dashboard"
          >
            <ArrowLeft size={14} />
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Katalog Produk</h1>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">Lihat ketersediaan stok aktual gudang, nilai jual, dan manifestasi label barcode.</p>
          </div>
        </div>

        <button
          onClick={handlePrintAllBarcodes}
          disabled={loading || filtered.length === 0}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-3xs disabled:opacity-40 transition-all cursor-pointer"
        >
          <Printer size={13} className="text-indigo-600" />
          Cetak Semua Barcode ({filtered.filter(p => p.barcode).length})
        </button>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari produk berdasarkan nama, SKU, atau kode barcode..."
            className="w-full rounded-xl border border-slate-250/70 bg-white pl-11 pr-4 py-3.5 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-3xs"
          />
        </div>

        <div className="text-[10px] font-bold text-slate-400 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg shrink-0">
          Ditemukan: <span className="font-extrabold text-slate-900 font-mono">{filtered.length}</span> Item
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-1.5">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategoryId(cat.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer active:scale-[0.98] ${selectedCategoryId === cat.id
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-3xs'
                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
              }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Main Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-3xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                <th className="p-4 pl-6">Nama Barang / SKU</th>
                <th className="p-4">Stok Aktual</th>
                <th className="p-4">Harga Jual</th>
                <th className="p-4">Kode Barcode</th>
                <th className="p-4 pr-6 text-right">Aksi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-600 font-semibold">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center">
                    <Loader2 className="w-5 h-5 animate-spin text-slate-400 mx-auto" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="p-3 bg-slate-50 border border-slate-150 rounded-2xl text-slate-400">
                        <Boxes className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-bold text-slate-600">Produk tidak ditemukan</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((product) => {
                  const isLowStock = product.stock <= product.minimumStock
                  return (
                    <tr key={product.id} className="group hover:bg-slate-50/45 transition-colors">
                      <td className="p-4 pl-6">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl border border-slate-150 bg-slate-50 overflow-hidden flex items-center justify-center shrink-0 text-slate-400">
                            {product.image ? (
                              <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
                            ) : (
                              <Package size={15} />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-extrabold text-slate-900 truncate max-w-[200px]">{product.name}</p>
                            <p className="text-[10px] font-mono text-slate-400 mt-0.5">SKU: {product.sku || '-'}</p>
                          </div>
                        </div>
                      </td>

                      <td className="p-4 font-mono">
                        <span className={`font-black text-sm ${isLowStock ? 'text-rose-600' : 'text-slate-900'}`}>
                          {product.stock}
                        </span>
                        <span className="text-slate-400 text-[10px] ml-1 font-semibold">Pcs</span>
                      </td>

                      <td className="p-4 font-mono font-bold text-slate-900">
                        {formatIDR(product.sellingPrice)}
                      </td>

                      <td className="p-4">
                        {product.barcode ? (
                          <div className="flex flex-col gap-1 max-w-[100px] overflow-hidden opacity-90 bg-white border border-slate-150 rounded-lg p-1.5 items-center">
                            <BarcodeRender value={product.barcode} height={15} width={1.1} displayValue={false} margin={0} />
                            <span className="text-[8.5px] font-mono text-slate-400 truncate mt-0.5">{product.barcode}</span>
                          </div>
                        ) : (
                          <span className="text-slate-300 italic text-[10px] font-semibold">Belum diatur</span>
                        )}
                      </td>

                      <td className="p-4 pr-6 text-right" onClick={(e) => e.stopPropagation()}>
                        {product.barcode ? (
                          <button
                            type="button"
                            onClick={() => handlePrintSingleBarcode(product.barcode!, product.name)}
                            className="p-1.5 text-slate-405 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                            title="Cetak Label Item Ini"
                          >
                            <Printer size={14} />
                          </button>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}

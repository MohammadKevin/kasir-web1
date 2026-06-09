'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { 
  BarChart3, 
  Store, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingCart, 
  Package, 
  UserCheck, 
  Download, 
  FileSpreadsheet, 
  FileText,
  Loader2
} from 'lucide-react'

type StoreType = {
  id: string
  name: string
}

type ProfitData = {
  totalSales: number
  totalExpense: number
  estimatedProfit: number
}

type TabType = 'sales' | 'expenses' | 'products' | 'shifts' | 'purchases' | 'stock'

export default function ReportPage() {
  const [stores, setStores] = useState<StoreType[]>([])
  const [selectedStoreId, setSelectedStoreId] = useState('')
  const [activeTab, setActiveTab] = useState<TabType>('sales')
  const [loadingSummary, setLoadingSummary] = useState(true)
  const [loadingTable, setLoadingTable] = useState(true)
  const [downloading, setDownloading] = useState<string | null>(null)

  const [profit, setProfit] = useState<ProfitData>({ totalSales: 0, totalExpense: 0, estimatedProfit: 0 })
  const [tableData, setTableData] = useState<any[]>([])

  useEffect(() => {
    initPage()
  }, [])

  useEffect(() => {
    if (selectedStoreId) {
      loadSummaryData(selectedStoreId)
      loadTabTableData(selectedStoreId, activeTab)
    }
  }, [selectedStoreId, activeTab])

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
      } else {
        setLoadingSummary(false)
        setLoadingTable(false)
      }
    } catch (error) {
      console.error(error)
      setLoadingSummary(false)
      setLoadingTable(false)
    }
  }

  async function loadSummaryData(storeId: string) {
    setLoadingSummary(true)
    try {
      const res = await api.get(`/reports/profit/${storeId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      })
      setProfit(res.data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoadingSummary(false)
    }
  }

  async function loadTabTableData(storeId: string, tab: TabType) {
    setLoadingTable(true)
    setTableData([])
    try {
      let endpoint = `/reports/sales/${storeId}`
      if (tab === 'expenses') endpoint = `/reports/expenses/${storeId}`
      if (tab === 'products') endpoint = `/reports/products/${storeId}`
      if (tab === 'shifts') endpoint = `/reports/shifts/${storeId}`
      if (tab === 'purchases') endpoint = `/reports/purchases/${storeId}`
      if (tab === 'stock') endpoint = `/reports/stock-movements/${storeId}`

      const res = await api.get(endpoint, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      })

      if (tab === 'sales' || tab === 'expenses') {
        setTableData(res.data.data || [])
      } else {
        setTableData(res.data || [])
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoadingTable(false)
    }
  }

  async function handleExport(type: 'excel' | 'pdf') {
    setDownloading(type)
    try {
      const response = await api.get(`/reports/sales/${selectedStoreId}/${type}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        responseType: 'blob'
      })
      
      const blob = new Blob([response.data], { 
        type: type === 'excel' 
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
          : 'application/pdf' 
      })
      
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `laporan_penjualan_${selectedStoreId}.${type === 'excel' ? 'xlsx' : 'pdf'}`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      console.error(error)
      alert('Gagal mengunduh dokumen laporan.')
    } finally {
      setDownloading(null)
    }
  }

  if (loadingSummary && stores.length === 0) {
    return (
      <div className="space-y-6 p-6">
        <div className="h-12 w-1/3 animate-pulse rounded-xl bg-slate-200" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Manajemen Laporan</h1>
          <p className="text-sm text-slate-500 mt-1">Audit finansial komprehensif, tracking performa inventori gudang, log shift, serta download berkas pembukuan kasir.</p>
        </div>

        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm self-start sm:self-auto">
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
              <option key={store.id} value={store.id}>{store.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border border-slate-100 rounded-2xl p-5 bg-white shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100 text-emerald-600">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Omset Penjualan</p>
            <p className="text-2xl font-black text-slate-900 font-mono mt-0.5">Rp {profit.totalSales.toLocaleString('id-ID')}</p>
          </div>
        </div>

        <div className="border border-slate-100 rounded-2xl p-5 bg-white shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-50 rounded-2xl border border-red-100 text-red-600">
            <TrendingDown className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Biaya Pengeluaran</p>
            <p className="text-2xl font-black text-slate-900 font-mono mt-0.5">Rp {profit.totalExpense.toLocaleString('id-ID')}</p>
          </div>
        </div>

        <div className="border border-slate-100 rounded-2xl p-5 bg-white shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-2xl border border-blue-100 text-blue-600">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Estimasi Laba Bersih</p>
            <p className={`text-2xl font-black font-mono mt-0.5 ${profit.estimatedProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              Rp {profit.estimatedProfit.toLocaleString('id-ID')}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-slate-200 pb-2">
        <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl self-start">
          <button onClick={() => setActiveTab('sales')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'sales' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}>Penjualan</button>
        </div>

        {activeTab === 'sales' && (
          <div className="flex items-center gap-2 self-start lg:self-auto">
            <button
              onClick={() => handleExport('excel')}
              disabled={downloading !== null}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition-all disabled:opacity-50"
            >
              {downloading === 'excel' ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />}
              Excel Report
            </button>
            <button
              onClick={() => handleExport('pdf')}
              disabled={downloading !== null}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition-all disabled:opacity-50"
            >
              {downloading === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <FileText className="w-3.5 h-3.5 text-red-600" />}
              PDF Document
            </button>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="w-full overflow-x-auto">
          {loadingTable ? (
            <div className="flex justify-center items-center py-24">
              <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
            </div>
          ) : tableData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-2 text-slate-400">
              <BarChart3 className="w-8 h-8 stroke-[1.5]" />
              <p className="text-sm font-medium text-slate-600">Manifes data pembukuan masih kosong</p>
            </div>
          ) : (
            <table className="w-full border-collapse text-left text-sm text-slate-600">
              {activeTab === 'sales' && (
                <>
                  <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4">Invoice</th>
                      <th className="px-6 py-4">Waktu Transaksi</th>
                      <th className="px-6 py-4">Operator Kasir</th>
                      <th className="px-6 py-4">Customer Member</th>
                      <th className="px-6 py-4">Total Jual</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {tableData.map((tx: any) => (
                      <tr key={tx.id} className="hover:bg-slate-50/40">
                        <td className="px-6 py-4 font-mono font-bold text-slate-900">{tx.invoiceNumber}</td>
                        <td className="px-6 py-4 text-slate-500">{new Date(tx.createdAt).toLocaleString('id-ID')}</td>
                        <td className="px-6 py-4 text-slate-800">{tx.cashier?.name}</td>
                        <td className="px-6 py-4 text-slate-500">{tx.customer?.name || '-'}</td>
                        <td className="px-6 py-4 font-bold text-slate-950 font-mono">Rp {tx.total.toLocaleString('id-ID')}</td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              {activeTab === 'expenses' && (
                <>
                  <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4">Deskripsi / Judul</th>
                      <th className="px-6 py-4">Kategori Pengeluaran</th>
                      <th className="px-6 py-4">Waktu Catat</th>
                      <th className="px-6 py-4">Biaya Dana Keluar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {tableData.map((ex: any) => (
                      <tr key={ex.id} className="hover:bg-slate-50/40">
                        <td className="px-6 py-4 font-bold text-slate-900">{ex.title}</td>
                        <td className="px-6 py-4"><span className="bg-slate-100 rounded-lg text-[11px] px-2 py-0.5 text-slate-700">{ex.category}</span></td>
                        <td className="px-6 py-4 text-slate-500">{new Date(ex.createdAt).toLocaleString('id-ID')}</td>
                        <td className="px-6 py-4 font-bold text-red-600 font-mono">Rp {ex.amount.toLocaleString('id-ID')}</td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              {activeTab === 'products' && (
                <>
                  <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4">Komoditas / Nama Barang</th>
                      <th className="px-6 py-4">SKU Code</th>
                      <th className="px-6 py-4">Harga Pokok (Modal)</th>
                      <th className="px-6 py-4">Sisa Stok Fisik</th>
                      <th className="px-6 py-4">Kondisi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {tableData.map((p: any) => (
                      <tr key={p.id} className="hover:bg-slate-50/40">
                        <td className="px-6 py-4 font-bold text-slate-900">{p.name}</td>
                        <td className="px-6 py-4 font-mono text-slate-400">{p.sku || '-'}</td>
                        <td className="px-6 py-4 font-mono">Rp {p.costPrice.toLocaleString('id-ID')}</td>
                        <td className="px-6 py-4 font-bold font-mono text-slate-950">{p.stock} Item</td>
                        <td className="px-6 py-4">
                          {p.stock <= p.minimumStock ? (
                            <span className="bg-red-50 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-lg border border-red-200">Menipis / Amang Kritis</span>
                          ) : (
                            <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-lg border border-emerald-200">Aman</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              {activeTab === 'purchases' && (
                <>
                  <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4">No Nota Kulakan</th>
                      <th className="px-6 py-4">Waktu Masuk</th>
                      <th className="px-6 py-4">Vendor Supplier</th>
                      <th className="px-6 py-4">Total Pembayaran</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {tableData.map((pu: any) => (
                      <tr key={pu.id} className="hover:bg-slate-50/40">
                        <td className="px-6 py-4 font-mono font-bold text-slate-900">{pu.invoiceNumber}</td>
                        <td className="px-6 py-4 text-slate-500">{new Date(pu.createdAt).toLocaleString('id-ID')}</td>
                        <td className="px-6 py-4 text-slate-800">{pu.supplier?.name}</td>
                        <td className="px-6 py-4 font-bold font-mono text-slate-950">Rp {pu.total.toLocaleString('id-ID')}</td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              {activeTab === 'stock' && (
                <>
                  <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4">Barang / SKU</th>
                      <th className="px-6 py-4">Waktu Koreksi</th>
                      <th className="px-6 py-4">Jenis Perubahan</th>
                      <th className="px-6 py-4">Kuantitas</th>
                      <th className="px-6 py-4">Memo / Catatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {tableData.map((st: any) => (
                      <tr key={st.id} className="hover:bg-slate-50/40">
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-900">{st.product?.name}</p>
                          <p className="text-[11px] font-mono text-slate-400">SKU: {st.product?.sku}</p>
                        </td>
                        <td className="px-6 py-4 text-slate-500">{new Date(st.createdAt).toLocaleString('id-ID')}</td>
                        <td className="px-6 py-4">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${st.type === 'IN' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : st.type === 'OUT' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                            {st.type}
                          </span>
                        </td>
                        <td className={`px-6 py-4 font-black font-mono ${st.type === 'IN' ? 'text-emerald-600' : 'text-slate-900'}`}>{st.type === 'IN' ? `+${st.qty}` : `-${st.qty}`} Pcs</td>
                        <td className="px-6 py-4 text-slate-500 text-xs truncate max-w-xs">{st.note || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              {activeTab === 'shifts' && (
                <>
                  <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4">Nama Personil</th>
                      <th className="px-6 py-4">Waktu Buka Shift</th>
                      <th className="px-6 py-4">Modal Awal Kas</th>
                      <th className="px-6 py-4">Kas Akhir Aktual</th>
                      <th className="px-6 py-4">Selisih Fisik Kas</th>
                      <th className="px-6 py-4">Status Sesi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {tableData.map((sh: any) => (
                      <tr key={sh.id} className="hover:bg-slate-50/40">
                        <td className="px-6 py-4 font-bold text-slate-900">{sh.user?.name}</td>
                        <td className="px-6 py-4 text-slate-500">{new Date(sh.createdAt).toLocaleString('id-ID')}</td>
                        <td className="px-6 py-4 font-mono">Rp {sh.openingCash.toLocaleString('id-ID')}</td>
                        <td className="px-6 py-4 font-mono">{sh.closingCash ? `Rp ${sh.closingCash.toLocaleString('id-ID')}` : '-'}</td>
                        <td className={`px-6 py-4 font-bold font-mono ${sh.difference < 0 ? 'text-red-600' : sh.difference > 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
                          Rp {sh.difference?.toLocaleString('id-ID') ?? 0}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${sh.status === 'OPEN' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-700 border border-slate-200'}`}>
                            {sh.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
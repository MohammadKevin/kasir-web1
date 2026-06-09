'use client'

import { useEffect, useState, useMemo } from 'react'
import { api } from '@/lib/api'
import { Plus, Trash2, X, Receipt, Building2, Package, Loader2, ArrowRight } from 'lucide-react'

type CartItem = { productId: string; name: string; quantity: number; costPrice: number }

export default function PurchasePage() {
  const [purchases, setPurchases] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  // Form State
  const [supplierId, setSupplierId] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedProd, setSelectedProd] = useState('')
  const [qty, setQty] = useState(1)

  useEffect(() => { load() }, [])

  // Ganti bagian useEffect initPage atau load Anda menjadi:
  async function load() {
    setLoading(true)
    const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` }

    try {
      // 1. Ambil dulu toko yang aktif
      const storesRes = await api.get('/stores', { headers })
      const activeStore = storesRes.data[0] // Ambil toko pertama atau sesuaikan logika Anda

      if (activeStore) {
        const storeId = activeStore.id
        console.log("Loading data for StoreID:", storeId)

        // 2. Fetch data supplier menggunakan ID dari API, bukan localStorage
        const [sRes, prodRes] = await Promise.all([
          api.get(`/suppliers/store/${storeId}`, { headers }),
          api.get(`/products/store/${storeId}`, { headers })
        ])

        setSuppliers(sRes.data)
        setProducts(prodRes.data)
      }
    } catch (err) {
      console.error("Error loading data:", err)
    } finally {
      setLoading(false)
    }
  }

  function addToCart() {
    const p = products.find(i => i.id === selectedProd)
    if (!p) return
    setCart([...cart, { productId: p.id, name: p.name, quantity: qty, costPrice: p.costPrice }])
    setSelectedProd('')
    setQty(1)
  }

  async function submit() {
    const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` }
    try {
      await api.post('/purchases', {
        storeId: localStorage.getItem('storeId'),
        supplierId,
        invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
        items: cart.map(i => ({ productId: i.productId, quantity: i.quantity, costPrice: i.costPrice }))
      }, { headers })
      setOpen(false)
      setCart([])
      load()
    } catch (e: any) { alert(e.response?.data?.message || 'Gagal menyimpan') }
  }

  const grandTotal = useMemo(() => cart.reduce((acc, curr) => acc + (curr.quantity * curr.costPrice), 0), [cart])

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-blue-600 p-8 rounded-3xl text-white shadow-xl">
        <div>
          <h1 className="text-3xl font-extrabold">Transaksi Pembelian</h1>
          <p className="text-blue-100">Catat stok masuk dari supplier Anda.</p>
        </div>
        <button onClick={() => setOpen(true)} className="bg-white text-blue-700 px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-50 transition">
          <Plus size={20} /> Transaksi Baru
        </button>
      </div>

      <div className="bg-white border rounded-3xl overflow-hidden shadow-sm">
        <table className="w-full">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold">
            <tr>
              <th className="p-5 text-left">Invoice</th>
              <th className="p-5 text-left">Supplier</th>
              <th className="p-5 text-right">Total</th>
              <th className="p-5 text-center">Tanggal</th>
            </tr>
          </thead>
          <tbody className="divide-y text-sm">
            {purchases.map(p => (
              <tr key={p.id} className="hover:bg-blue-50/30 transition">
                <td className="p-5 font-mono font-bold text-blue-600">{p.invoiceNumber}</td>
                <td className="p-5">{p.supplier?.name}</td>
                <td className="p-5 text-right font-bold">Rp {p.total.toLocaleString()}</td>
                <td className="p-5 text-center text-slate-500">{new Date(p.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 bg-blue-950/30 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl p-8 shadow-2xl space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Entry Pembelian</h2>
              <button onClick={() => setOpen(false)}><X className="text-slate-400" /></button>
            </div>

            <select className="w-full border-b py-3 outline-none" onChange={e => setSupplierId(e.target.value)}>
              <option value="">Pilih Supplier</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>

            <div className="flex gap-2">
              <select className="flex-1 border-b py-3 outline-none" value={selectedProd} onChange={e => setSelectedProd(e.target.value)}>
                <option value="">Pilih Produk</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} (Modal: Rp {p.costPrice})</option>)}
              </select>
              <input type="number" className="w-24 border-b py-3 outline-none" value={qty} onChange={e => setQty(Number(e.target.value))} />
              <button onClick={addToCart} className="bg-blue-600 text-white px-4 rounded-xl font-bold">Add</button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {cart.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center bg-blue-50 p-3 rounded-xl text-sm">
                  <span>{item.quantity}x {item.name}</span>
                  <span className="font-bold">Rp {(item.quantity * item.costPrice).toLocaleString()}</span>
                </div>
              ))}
            </div>

            <div className="border-t pt-4 flex justify-between items-center text-lg font-bold">
              <span>Grand Total</span>
              <span>Rp {grandTotal.toLocaleString()}</span>
            </div>

            <button onClick={submit} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition">
              Selesaikan Pembelian
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
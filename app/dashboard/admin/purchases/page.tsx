'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Plus, Trash2, X, Eye, Truck, Receipt, Package, ChevronDown } from 'lucide-react'

type PurchaseItem = {
  productId: string
  productName: string
  quantity: number
  costPrice: number
  subtotal: number
}

type Purchase = {
  id: string
  invoiceNumber: string
  total: number
  createdAt: string
  supplier: { name: string }
}

export default function PurchasePage() {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([])
  const [products, setProducts] = useState<{ id: string; name: string; costPrice: number }[]>([])
  const [isOpenModal, setIsOpenModal] = useState(false)
  
  const [selectedStoreId, setSelectedStoreId] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [cart, setCart] = useState<PurchaseItem[]>([])
  const [currentProductId, setCurrentProductId] = useState('')
  const [currentQty, setCurrentQty] = useState(1)

  useEffect(() => {
    const storeId = localStorage.getItem('storeId') || ''
    setSelectedStoreId(storeId)
    loadData(storeId)
  }, [])

  async function loadData(storeId: string) {
    const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` }
    const [pRes, sRes, prodRes] = await Promise.all([
      api.get(`/purchases/store/${storeId}`, { headers }),
      api.get(`/suppliers/store/${storeId}`, { headers }),
      api.get(`/products/store/${storeId}`, { headers })
    ])
    setPurchases(pRes.data)
    setSuppliers(sRes.data)
    setProducts(prodRes.data)
  }

  function handleAddItem() {
    const prod = products.find(p => p.id === currentProductId)
    if (!prod) return alert('Pilih produk!')
    
    setCart([...cart, { 
      productId: prod.id, 
      productName: prod.name, 
      quantity: currentQty, 
      costPrice: prod.costPrice, 
      subtotal: currentQty * prod.costPrice 
    }])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      await api.post('/purchases', {
        storeId: selectedStoreId,
        supplierId,
        invoiceNumber,
        items: cart.map(i => ({ productId: i.productId, quantity: i.quantity, costPrice: i.costPrice }))
      }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      
      setIsOpenModal(false)
      setCart([])
      loadData(selectedStoreId)
    } catch (e) { alert('Gagal menyimpan transaksi') }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Pembelian (Kulakan)</h1>
        <button onClick={() => setIsOpenModal(true)} className="bg-black text-white px-4 py-2 rounded-xl flex items-center gap-2">
          <Plus size={16} /> Catat Kulakan
        </button>
      </div>

      <div className="bg-white border rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 text-xs uppercase">
            <tr>
              <th className="p-4 text-left">Invoice</th>
              <th className="p-4 text-left">Supplier</th>
              <th className="p-4 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {purchases.map(p => (
              <tr key={p.id}>
                <td className="p-4 font-mono font-bold">{p.invoiceNumber}</td>
                <td className="p-4">{p.supplier.name}</td>
                <td className="p-4 text-right">Rp {p.total.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isOpenModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
          <form onSubmit={handleSubmit} className="bg-white w-full max-w-lg p-6 rounded-3xl space-y-4">
            <h2 className="font-bold text-lg">Catat Kulakan Baru</h2>
            <input placeholder="Invoice Number" className="w-full border p-3 rounded-xl" onChange={e => setInvoiceNumber(e.target.value)} />
            <select className="w-full border p-3 rounded-xl" onChange={e => setSupplierId(e.target.value)}>
              <option value="">Pilih Supplier</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            
            <div className="flex gap-2">
              <select className="flex-1 border p-3 rounded-xl" onChange={e => setCurrentProductId(e.target.value)}>
                <option value="">Produk</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input type="number" className="w-20 border p-3 rounded-xl" value={currentQty} onChange={e => setCurrentQty(Number(e.target.value))} />
              <button type="button" onClick={handleAddItem} className="bg-slate-900 text-white px-4 rounded-xl">Add</button>
            </div>
            
            <button type="submit" className="w-full bg-black text-white py-3 rounded-xl font-bold">Simpan Transaksi</button>
          </form>
        </div>
      )}
    </div>
  )
}
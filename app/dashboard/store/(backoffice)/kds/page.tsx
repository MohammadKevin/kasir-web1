'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import {
  ChefHat,
  Clock,
  Check,
  RotateCcw,
  Loader2,
  Utensils,
  RefreshCw,
  Bell
} from 'lucide-react'

type TransactionItem = {
  id: string
  quantity: number
  product: {
    name: string
  }
}

type Order = {
  id: string
  invoiceNumber: string
  orderType: string
  table?: {
    number: string
  }
  createdAt: string
  status: string
  items: TransactionItem[]
}

export default function KdsPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [completedOrderIds, setCompletedOrderIds] = useState<string[]>([])
  const [checkedItemIds, setCheckedItemIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending')
  const [soundEnabled, setSoundEnabled] = useState(true)

  useEffect(() => {
    loadOrders()
    const interval = setInterval(() => {
      loadOrders(true) 
    }, 15000) 

    return () => clearInterval(interval)
  }, [])

  async function loadOrders(silent = false) {
    if (!silent) setLoading(true)
    try {
      const storeId = localStorage.getItem('storeId')
      const token = localStorage.getItem('token')
      const headers = { Authorization: `Bearer ${token}` }
      const res = await api.get(`/transactions/store/${storeId}`, { headers })
      
      
      const todayStr = new Date().toDateString()
      const rawOrders = (res.data || []).filter((tx: any) => 
        new Date(tx.createdAt).toDateString() === todayStr && tx.status !== 'CANCELLED'
      )

      
      const detailedOrders = await Promise.all(
        rawOrders.slice(0, 15).map(async (o: any) => {
          const detailRes = await api.get(`/transactions/${o.id}`, { headers })
          return detailRes.data
        })
      )
      
      setOrders(detailedOrders)
    } catch (error) {
      console.error('Gagal memuat pesanan KDS:', error)
    } finally {
      if (!silent) setLoading(false)
    }
  }

  function toggleItemCheck(itemId: string) {
    setCheckedItemIds(prev => 
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    )
  }

  function handleCompleteOrder(orderId: string) {
    setCompletedOrderIds(prev => [...prev, orderId])
    
    if (soundEnabled && typeof window !== 'undefined') {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioCtx.createOscillator()
      const gainNode = audioCtx.createGain()
      oscillator.connect(gainNode)
      gainNode.connect(audioCtx.destination)
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime) 
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime)
      oscillator.start()
      oscillator.stop(audioCtx.currentTime + 0.15)
    }
  }

  function handleResetOrder(orderId: string) {
    setCompletedOrderIds(prev => prev.filter(id => id !== orderId))
  }

  const getElapsedTime = (createdAtStr: string) => {
    const created = new Date(createdAtStr).getTime()
    const now = new Date().getTime()
    const diffMins = Math.floor((now - created) / 60000)
    return diffMins
  }

  const getCardColor = (createdAtStr: string) => {
    const elapsed = getElapsedTime(createdAtStr)
    if (elapsed > 15) return 'border-rose-400 bg-rose-50/10'
    if (elapsed > 7) return 'border-amber-400 bg-amber-50/10'
    return 'border-slate-200 bg-white'
  }

  const pendingOrders = orders.filter(o => !completedOrderIds.includes(o.id))
  const completedOrders = orders.filter(o => completedOrderIds.includes(o.id))

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-2">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-xs font-bold text-slate-650">Memuat antrean dapur KDS...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 bg-indigo-50 border border-indigo-100/55 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
            <ChefHat size={20} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Kitchen Display System (KDS)</h1>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">Antrean pesanan aktif di dapur untuk mempermudah koordinasi koki dan barista.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
              soundEnabled
                ? 'border-indigo-200 bg-indigo-50 text-indigo-600'
                : 'border-slate-200 bg-white text-slate-400'
            }`}
            title="Toggle Bunyi Notifikasi KDS"
          >
            <Bell size={15} />
          </button>
          <button
            onClick={() => loadOrders()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
          >
            <RefreshCw size={13} />
            <span>Segarkan</span>
          </button>
        </div>
      </div>

      <div className="flex gap-2 border-b border-slate-200 pb-px">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 text-xs font-extrabold border-b-2 cursor-pointer transition-all ${
            activeTab === 'pending'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          Antrean Masak ({pendingOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`px-4 py-2 text-xs font-extrabold border-b-2 cursor-pointer transition-all ${
            activeTab === 'completed'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          Selesai Masak ({completedOrders.length})
        </button>
      </div>

      {activeTab === 'pending' ? (
        pendingOrders.length === 0 ? (
          <div className="border-2 border-dashed border-slate-200 rounded-3xl p-16 text-center text-slate-400 bg-white">
            <div className="w-12 h-12 bg-slate-50 border border-slate-150 rounded-2xl flex items-center justify-center text-slate-400 mx-auto mb-4">
              <Utensils className="w-6 h-6" />
            </div>
            <p className="text-xs font-bold text-slate-650">Tidak ada antrean pesanan di dapur</p>
            <p className="text-[10px] text-slate-400 mt-1">Setiap pesanan POS baru hari ini akan muncul di sini secara real-time.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
            {pendingOrders.map(order => {
              const elapsed = getElapsedTime(order.createdAt)
              return (
                <div
                  key={order.id}
                  className={`border rounded-2xl p-4 space-y-4 shadow-3xs flex flex-col justify-between min-h-[260px] transition-all hover:shadow-xs relative overflow-hidden ${getCardColor(
                    order.createdAt
                  )}`}
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className={`inline-flex rounded-lg px-2 py-0.5 text-[9px] font-black uppercase ${
                          order.orderType === 'DINEIN' 
                            ? 'bg-amber-100 text-amber-800' 
                            : 'bg-indigo-100 text-indigo-800'
                        }`}>
                          {order.orderType === 'DINEIN' ? `Dine In` : 'Take Away'}
                        </span>
                        {order.orderType === 'DINEIN' && order.table && (
                          <h3 className="text-base font-black text-slate-800 mt-1">Meja {order.table.number}</h3>
                        )}
                        <p className="text-[9px] font-mono text-slate-400 mt-0.5">INV: {order.invoiceNumber}</p>
                      </div>
                      
                      <div className="flex items-center gap-1 font-mono text-[10px] font-bold text-slate-500 bg-slate-100/60 border px-2 py-0.5 rounded-lg">
                        <Clock size={11} className="text-slate-400 animate-pulse" />
                        <span>{elapsed}m lalu</span>
                      </div>
                    </div>

                    <div className="border-t border-slate-100/80 pt-3 space-y-2.5">
                      {order.items.map(item => {
                        const isChecked = checkedItemIds.includes(item.id)
                        return (
                          <button
                            key={item.id}
                            onClick={() => toggleItemCheck(item.id)}
                            className="w-full text-left flex items-start gap-2.5 cursor-pointer group"
                          >
                            <div className={`h-4.5 w-4.5 rounded-md border flex items-center justify-center transition-all shrink-0 mt-0.5 ${
                              isChecked
                                ? 'bg-indigo-600 border-indigo-600 text-white'
                                : 'border-slate-300 bg-white group-hover:border-indigo-400'
                            }`}>
                              {isChecked && <Check size={11} />}
                            </div>
                            <span className={`text-xs font-bold ${
                              isChecked 
                                ? 'text-slate-450 line-through' 
                                : 'text-slate-850'
                            }`}>
                              {item.quantity}x {item.product?.name}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="border-t border-slate-100/85 pt-3">
                    <button
                      onClick={() => handleCompleteOrder(order.id)}
                      className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white py-2 text-xs font-bold transition-all shadow-3xs cursor-pointer active:scale-97"
                    >
                      <Check size={13} />
                      <span>Selesai Disajikan</span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )
      ) : completedOrders.length === 0 ? (
        <div className="border-2 border-dashed border-slate-200 rounded-3xl p-16 text-center text-slate-400 bg-white">
          <p className="text-xs font-bold text-slate-600">Belum ada pesanan diselesaikan hari ini</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
          {completedOrders.map(order => (
            <div
              key={order.id}
              className="border border-slate-200 bg-slate-50/50 rounded-2xl p-4 space-y-4 shadow-3xs flex flex-col justify-between min-h-[220px]"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="inline-flex rounded-lg bg-slate-200 text-slate-700 px-2 py-0.5 text-[9px] font-black uppercase">
                      Selesai
                    </span>
                    <h3 className="text-sm font-black text-slate-700 mt-1">
                      {order.orderType === 'DINEIN' && order.table ? `Meja ${order.table.number}` : 'Take Away'}
                    </h3>
                  </div>
                </div>

                <div className="border-t border-slate-200/50 pt-3 space-y-1.5 text-xs text-slate-500 font-bold">
                  {order.items.map(item => (
                    <div key={item.id}>
                      {item.quantity}x {item.product?.name}
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-200/50 pt-3">
                <button
                  onClick={() => handleResetOrder(order.id)}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 py-2 text-xs font-bold transition-all cursor-pointer"
                >
                  <RotateCcw size={12} />
                  <span>Kembalikan ke Antrean</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

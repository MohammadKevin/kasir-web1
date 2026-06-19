'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import {
  Printer,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  AlignLeft,
  Settings,
  Eye,
  Percent,
  Building2,
  ChevronDown
} from 'lucide-react'
import { toast } from 'sonner'

type Store = {
  id: string
  name: string
  email: string
  phone: string | null
  address: string | null
  logo: string | null
  taxRate: number
  serviceRate: number
  receiptHeader: string | null
  receiptFooter: string | null
  receiptShowBarcode: boolean
  receiptShowCustomer: boolean
  receiptSize: string
  pointsEnabled: boolean
  pointValue: number
}

export default function AdminReceiptDesignPage() {
  const [stores, setStores] = useState<Store[]>([])
  const [selectedStoreId, setSelectedStoreId] = useState('')
  const [loadingStores, setLoadingStores] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [saving, setSaving] = useState(false)

  
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [taxRate, setTaxRate] = useState(0)
  const [serviceRate, setServiceRate] = useState(0)
  const [receiptHeader, setReceiptHeader] = useState('')
  const [receiptFooter, setReceiptFooter] = useState('')
  const [receiptShowBarcode, setReceiptShowBarcode] = useState(true)
  const [receiptShowCustomer, setReceiptShowCustomer] = useState(true)
  const [receiptSize, setReceiptSize] = useState('58mm')
  const [pointsEnabled, setPointsEnabled] = useState(true)
  const [pointValue, setPointValue] = useState(1000)

  useEffect(() => {
    loadStores()
  }, [])

  async function loadStores() {
    setLoadingStores(true)
    try {
      const res = await api.get('/stores')
      setStores(res.data || [])
      if (res.data && res.data.length > 0) {
        setSelectedStoreId(res.data[0].id)
        loadStoreDetail(res.data[0].id)
      }
    } catch (err) {
      console.error('Gagal mengambil daftar cabang:', err)
      toast.error('Gagal memuat daftar cabang toko')
    } finally {
      setLoadingStores(false)
    }
  }

  async function loadStoreDetail(storeId: string) {
    if (!storeId) return
    setLoadingDetail(true)
    try {
      const res = await api.get(`/stores/${storeId}`)
      const data: Store = res.data

      setName(data.name || '')
      setPhone(data.phone || '')
      setAddress(data.address || '')
      setTaxRate(data.taxRate || 0)
      setServiceRate(data.serviceRate || 0)
      setReceiptHeader(data.receiptHeader || '')
      setReceiptFooter(data.receiptFooter || '')
      setReceiptShowBarcode(data.receiptShowBarcode !== false)
      setReceiptShowCustomer(data.receiptShowCustomer !== false)
      setReceiptSize(data.receiptSize || '58mm')
      setPointsEnabled(data.pointsEnabled !== false)
      setPointValue(data.pointValue ?? 1000)
    } catch (err) {
      console.error('Gagal mengambil detail cabang:', err)
      toast.error('Gagal memuat rincian cabang')
    } finally {
      setLoadingDetail(false)
    }
  }

  function handleStoreChange(storeId: string) {
    setSelectedStoreId(storeId)
    loadStoreDetail(storeId)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedStoreId) return
    setSaving(true)
    try {
      const payload = {
        name,
        phone,
        address,
        taxRate,
        serviceRate,
        receiptHeader,
        receiptFooter,
        receiptShowBarcode,
        receiptShowCustomer,
        receiptSize,
        pointsEnabled,
        pointValue
      }

      await api.patch(`/stores/${selectedStoreId}`, payload)
      toast.success('Desain struk belanja berhasil disimpan!')
    } catch (err: any) {
      console.error(err)
      toast.error(err.response?.data?.message || 'Gagal menyimpan perubahan desain')
    } finally {
      setSaving(false)
    }
  }

  if (loadingStores) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-2">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-xs font-bold text-slate-500">Memuat data cabang outlet...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 bg-blue-50 border border-blue-100/50 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
            <Printer size={20} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Kustomisasi Struk Nota Belanja</h1>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">Atur tampilan cetak thermal struk belanja, header/footer text, dan logo untuk setiap cabang.</p>
          </div>
        </div>

        
        <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-3xs max-w-xs w-full sm:w-auto">
          <Building2 size={13} className="text-blue-500 shrink-0" />
          <select
            value={selectedStoreId}
            onChange={e => handleStoreChange(e.target.value)}
            className="w-full text-xs font-bold text-slate-800 bg-transparent border-none outline-none cursor-pointer pr-4"
          >
            {stores.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {!selectedStoreId ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-slate-200 rounded-3xl bg-white">
          <Building2 size={36} className="text-slate-350 opacity-60 mb-3" />
          <p className="text-xs font-bold text-slate-500">Pilih cabang toko terlebih dahulu</p>
        </div>
      ) : loadingDetail ? (
        <div className="py-24 flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-xs font-bold text-slate-500">Memuat rincian desain struk...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6 items-start animate-in fade-in duration-200">
          
          
          <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Settings size={15} className="text-blue-600" />
              <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">Konfigurasi Desain Cetak</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Nama Toko / Outlet *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-950 font-semibold focus:border-blue-500 focus:outline-none"
                />
              </div>
              
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">No. Telepon Toko</label>
                <input
                  type="text"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-950 font-semibold focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5 col-span-2">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Alamat Lengkap Toko</label>
                <textarea
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-950 font-semibold focus:border-blue-500 focus:outline-none resize-none"
                />
              </div>

              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Tarif Pajak PPN (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={taxRate}
                    onChange={e => setTaxRate(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 pl-3.5 pr-8 py-2.5 text-xs text-slate-950 font-mono font-bold focus:border-blue-500 focus:outline-none"
                  />
                  <Percent size={13} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Service Charge (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={serviceRate}
                    onChange={e => setServiceRate(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 pl-3.5 pr-8 py-2.5 text-xs text-slate-950 font-mono font-bold focus:border-blue-500 focus:outline-none"
                  />
                  <Percent size={13} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                  <AlignLeft size={11} className="text-slate-400" />
                  <span>Pesan Header Struk (Pembuka)</span>
                </label>
                <input
                  type="text"
                  value={receiptHeader}
                  onChange={e => setReceiptHeader(e.target.value)}
                  placeholder="Contoh: Selamat Datang! Terima Kasih."
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-950 font-semibold focus:border-blue-500 focus:outline-none"
                />
                <span className="text-[9px] font-bold text-slate-400 italic">Pesan pembuka yang terletak di bawah alamat toko.</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                  <AlignLeft size={11} className="text-slate-400" />
                  <span>Pesan Footer Struk (Penutup)</span>
                </label>
                <textarea
                  value={receiptFooter}
                  onChange={e => setReceiptFooter(e.target.value)}
                  placeholder="Contoh: Barang yang sudah dibeli tidak dapat ditukar atau dikembalikan."
                  rows={2}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-950 font-semibold focus:border-blue-500 focus:outline-none resize-none"
                />
                <span className="text-[9px] font-bold text-slate-400 italic">Pesan penutup di akhir nota belanja (e.g. info garansi, refund policy).</span>
              </div>
            </div>

            <hr className="border-slate-100" />

            
            <div className="space-y-4">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">Visibilitas Elemen</span>
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-800">Cetak Barcode Transaksi</h3>
                  <p className="text-[9.5px] font-semibold text-slate-400">Mencetak barcode serial nota di bagian paling bawah struk.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setReceiptShowBarcode(!receiptShowBarcode)}
                  className={`relative inline-flex h-5.5 w-10.5 cursor-pointer rounded-full transition-colors duration-200 ${
                    receiptShowBarcode ? 'bg-blue-600' : 'bg-slate-200'
                  }`}
                >
                  <span className={`inline-block h-4.5 w-4.5 mt-0.5 transform rounded-full bg-white transition duration-200 shadow-xs ${
                    receiptShowBarcode ? 'translate-x-5.5' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-800">Tampilkan Nama Pelanggan</h3>
                  <p className="text-[9.5px] font-semibold text-slate-400">Mencetak detail nama member / pelanggan pada invoice.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setReceiptShowCustomer(!receiptShowCustomer)}
                  className={`relative inline-flex h-5.5 w-10.5 cursor-pointer rounded-full transition-colors duration-200 ${
                    receiptShowCustomer ? 'bg-blue-600' : 'bg-slate-200'
                  }`}
                >
                  <span className={`inline-block h-4.5 w-4.5 mt-0.5 transform rounded-full bg-white transition duration-200 shadow-xs ${
                    receiptShowCustomer ? 'translate-x-5.5' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
            </div>

            <hr className="border-slate-100" />

            
            <div className="space-y-4">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">Sistem Loyalti Poin Member</span>
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-800">Aktifkan Loyalti Poin</h3>
                  <p className="text-[9.5px] font-semibold text-slate-400">Izinkan pelanggan mengumpulkan dan menukarkan poin belanja.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPointsEnabled(!pointsEnabled)}
                  className={`relative inline-flex h-5.5 w-10.5 cursor-pointer rounded-full transition-colors duration-200 ${
                    pointsEnabled ? 'bg-blue-600' : 'bg-slate-200'
                  }`}
                >
                  <span className={`inline-block h-4.5 w-4.5 mt-0.5 transform rounded-full bg-white transition duration-200 shadow-xs ${
                    pointsEnabled ? 'translate-x-5.5' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>

              {pointsEnabled && (
                <div className="space-y-1.5 animate-in slide-in-from-top-1 duration-150">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">Nilai Tukar 1 Poin (Rupiah)</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rp</span>
                    <input
                      type="number"
                      min={1}
                      value={pointValue}
                      onChange={e => setPointValue(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-200 pl-9 pr-3.5 py-2.5 text-xs text-slate-950 font-mono font-bold focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <span className="text-[9px] font-bold text-slate-400 italic">Nilai potongan belanja untuk setiap 1 poin yang ditukarkan (contoh: 1000 = Rp1.000).</span>
                </div>
              )}
            </div>

            <hr className="border-slate-100" />

            
            <div className="space-y-3">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">Ukuran Lebar Kertas Struk</span>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setReceiptSize('58mm')}
                  className={`flex flex-col items-center justify-center p-3 border rounded-2xl gap-1 text-center transition-all cursor-pointer ${
                    receiptSize === '58mm'
                      ? 'border-blue-600 bg-blue-50/20 text-blue-700 shadow-3xs ring-1 ring-blue-500/10'
                      : 'border-slate-200 bg-white text-slate-500 hover:border-slate-350'
                  }`}
                >
                  <span className="text-xs font-extrabold">Lebar Kertas 58mm</span>
                  <span className="text-[9px] font-semibold opacity-75">Format Standar (Mobile Printer)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setReceiptSize('80mm')}
                  className={`flex flex-col items-center justify-center p-3 border rounded-2xl gap-1 text-center transition-all cursor-pointer ${
                    receiptSize === '80mm'
                      ? 'border-blue-600 bg-blue-50/20 text-blue-700 shadow-3xs ring-1 ring-blue-500/10'
                      : 'border-slate-200 bg-white text-slate-500 hover:border-slate-350'
                  }`}
                >
                  <span className="text-xs font-extrabold">Lebar Kertas 80mm</span>
                  <span className="text-[9px] font-semibold opacity-75">Format Lebar (Desktop Printer)</span>
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-700 py-3.5 px-4 text-xs font-bold text-white shadow-md shadow-blue-600/10 active:scale-97 cursor-pointer transition-all disabled:opacity-50"
              >
                {saving ? <Loader2 className="animate-spin w-4 h-4" /> : <Save size={14} />}
                <span>Simpan Desain Struk Belanja</span>
              </button>
            </div>
          </form>

          
          <div className="space-y-4 sticky top-6">
            <div className="flex items-center gap-2 text-slate-400">
              <Eye size={14} className="text-blue-600" />
              <span className="text-[10px] font-black uppercase tracking-wider">Live Preview Simulator ({receiptSize})</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex items-center justify-center min-h-[500px]">
              
              <div 
                style={{ width: receiptSize === '58mm' ? '280px' : '340px' }}
                className="bg-white text-slate-900 border border-slate-300 shadow-lg p-5 font-mono text-[10.5px] leading-relaxed transition-all duration-300 flex flex-col relative select-none rounded-[4px] min-h-[420px]"
              >
                
                <div className="absolute top-[-3px] inset-x-0 h-1 bg-[radial-gradient(circle_at_center,transparent_2px,white_2.5px)] bg-[length:6px_6px]" />

                <div className="text-center space-y-1 mt-2 mb-4">
                  <h3 className="text-xs font-black uppercase tracking-wide leading-tight">{name || 'NAMA OUTLET'}</h3>
                  {phone && <p className="text-[9px] font-semibold text-slate-500">Telp: {phone}</p>}
                  {address && <p className="text-[8px] font-semibold text-slate-500 leading-tight whitespace-pre-wrap">{address}</p>}
                  
                  {receiptHeader && (
                    <p className="text-[8px] border-t border-dashed border-slate-200 pt-1.5 mt-1 text-slate-600 italic">
                      {receiptHeader}
                    </p>
                  )}
                </div>

                <div className="border-b border-dashed border-slate-200 pb-2 mb-2 space-y-0.5 text-[8.5px] font-semibold text-slate-500">
                  <div className="flex justify-between">
                    <span>Nota: INV-LC-14062026</span>
                    <span>14/06/2026 21:04</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Kasir: Budi Kasir</span>
                    {receiptShowCustomer && <span>Cust: Kevin Member (SILVER)</span>}
                  </div>
                </div>

                
                <div className="space-y-2 mb-3 border-b border-dashed border-slate-200 pb-2">
                  <div className="flex justify-between text-[8px] font-bold text-slate-400 uppercase">
                    <span>Item</span>
                    <span>Total</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <div>
                        <div>Kemeja Linen Premium</div>
                        <div className="text-[8.5px] font-semibold text-slate-500">1 x Rp 185.000</div>
                      </div>
                      <span>Rp 185.000</span>
                    </div>
                    <div className="flex justify-between">
                      <div>
                        <div>Hijab Voal Square</div>
                        <div className="text-[8.5px] font-semibold text-slate-500">2 x Rp 65.000</div>
                      </div>
                      <span>Rp 130.000</span>
                    </div>
                  </div>
                </div>

                
                <div className="space-y-1 mb-4 text-[9.5px]">
                  <div className="flex justify-between font-semibold">
                    <span>Subtotal</span>
                    <span>Rp 315.000</span>
                  </div>
                  <div className="flex justify-between text-rose-600">
                    <span>Diskon Member</span>
                    <span>-Rp 10.000</span>
                  </div>
                  
                  {serviceRate > 0 && (
                    <div className="flex justify-between">
                      <span>Service Charge ({serviceRate}%)</span>
                      <span>Rp 15.250</span>
                    </div>
                  )}
                  
                  {taxRate > 0 && (
                    <div className="flex justify-between">
                      <span>Pajak PPN ({taxRate}%)</span>
                      <span>Rp 32.025</span>
                    </div>
                  )}

                  <div className="flex justify-between font-black border-t border-slate-200 pt-1 text-[11px]">
                    <span>TOTAL</span>
                    <span>Rp 352.275</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Tunai (Cash)</span>
                    <span>Rp 360.000</span>
                  </div>
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>Kembalian</span>
                    <span>Rp 7.725</span>
                  </div>
                </div>

                
                <div className="text-center space-y-3 mt-auto mb-2">
                  {receiptShowBarcode && (
                    <div className="flex flex-col items-center justify-center gap-1 opacity-70">
                      
                      <div className="h-6 w-36 bg-[repeating-linear-gradient(90deg,black_0px,black_1px,transparent_1px,transparent_3px,black_3px,black_5px)]" />
                      <span className="text-[7.5px] tracking-[0.25em] font-bold">INV14062026</span>
                    </div>
                  )}

                  {receiptFooter ? (
                    <p className="text-[8.5px] text-slate-500 whitespace-pre-wrap italic leading-snug border-t border-dashed border-slate-200 pt-2 font-semibold">
                      {receiptFooter}
                    </p>
                  ) : (
                    <p className="text-[8px] text-slate-400 italic leading-snug border-t border-dashed border-slate-200 pt-2 font-semibold">
                      Terima kasih atas kunjungan Anda
                    </p>
                  )}
                </div>

                
                <div className="absolute bottom-[-3px] inset-x-0 h-1 bg-[radial-gradient(circle_at_center,transparent_2px,white_2.5px)] bg-[length:6px_6px] rotate-180" />
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Settings, Sparkles, Gift, Sliders, CheckCircle, AlertCircle, ArrowRight, Database } from 'lucide-react'

export default function SettingsPage() {
  const [bundlingEnabled, setBundlingEnabled] = useState(false)
  const [savedMessage, setSavedMessage] = useState('')

  useEffect(() => {
    // Load config from localStorage, defaulting to false or true
    const bundles = localStorage.getItem('feature_bundling_enabled')

    // Default to true if not set (or false if preferred)
    setBundlingEnabled(bundles !== 'false')
  }, [])

  function handleSave(bundling: boolean) {
    localStorage.setItem('feature_bundling_enabled', bundling ? 'true' : 'false')
    
    // Dispatch custom event to notify other parts of the app instantly
    window.dispatchEvent(new Event('feature-config-changed'))

    setSavedMessage('Konfigurasi berhasil disimpan!')
    setTimeout(() => setSavedMessage(''), 3000)
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 bg-indigo-50 border border-indigo-100/50 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
          <Settings size={20} />
        </div>
        <div>
          <h1 className="text-xl font-black text-slate-900">Konfigurasi Fitur Premium</h1>
          <p className="text-xs font-semibold text-slate-400 mt-0.5">Aktifkan atau nonaktifkan modul add-on premium sesuai dengan kebutuhan operasional toko Anda</p>
        </div>
      </div>

      {/* Message */}
      {savedMessage && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-xs font-bold transition-all animate-in fade-in slide-in-from-top-1">
          <CheckCircle size={15} />
          <span>{savedMessage}</span>
        </div>
      )}

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Toggle 1: Product Bundling */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-3xs hover:shadow-2xs transition-all duration-200 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 bg-purple-50 border border-purple-100 text-purple-600 rounded-xl flex items-center justify-center">
                <Sparkles size={20} />
              </div>
              <button
                 onClick={() => {
                  const nextVal = !bundlingEnabled
                  setBundlingEnabled(nextVal)
                  handleSave(nextVal)
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  bundlingEnabled ? 'bg-purple-600' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    bundlingEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">1. Paket Bundling / Combo Produk</h3>
              <p className="text-xs text-slate-500 font-semibold mt-1 leading-relaxed">
                Gabungkan beberapa varian produk (misal: Baju + Rok + Aksesoris) menjadi satu paket combo dengan harga promo hemat. Mempermudah promosi bundling di halaman kasir.
              </p>
            </div>
          </div>
          <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Status Modul</span>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider border ${
              bundlingEnabled ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}>
              <span className={`h-1 w-1 rounded-full ${bundlingEnabled ? 'bg-purple-500' : 'bg-slate-400'}`} />
              {bundlingEnabled ? 'Aktif' : 'Nonaktif'}
            </span>
          </div>
        </div>

        {/* Toggle 2: Loyalty Points (Database Configured) */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-3xs hover:shadow-2xs transition-all duration-200 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 bg-pink-50 border border-pink-100 text-pink-600 rounded-xl flex items-center justify-center">
                <Gift size={20} />
              </div>
              <Link
                href="/dashboard/admin/receipt-design"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-pink-50 hover:bg-pink-100 border border-pink-200 text-pink-700 hover:text-pink-850 rounded-xl text-[10.5px] font-extrabold transition-all active:scale-97 cursor-pointer"
              >
                <span>Atur di Perangkat</span>
                <ArrowRight size={12} />
              </Link>
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">2. Loyalty Points & Membership</h3>
              <p className="text-xs text-slate-500 font-semibold mt-1 leading-relaxed">
                Terapkan sistem koin reward bagi pelanggan terdaftar. Setiap transaksi nominal tertentu menghasilkan poin potongan belanja pada checkout berikutnya.
              </p>
              <p className="text-[10px] text-slate-400 font-medium mt-1 leading-relaxed">
                Modul ini dikonfigurasi dan diaktifkan secara terpusat di database melalui halaman pengaturan cetak nota/perangkat agar tersinkronisasi di semua kasir.
              </p>
            </div>
          </div>
          <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Status Modul</span>
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider border bg-pink-50 border-pink-200 text-pink-700">
              <span className="h-1 w-1 rounded-full bg-pink-500" />
              Tersinkron Database
            </span>
          </div>
        </div>

        {/* Toggle 3: Majoo Integration (Metode 2) - DISABLED */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-3xs flex flex-col justify-between space-y-4 opacity-85">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 bg-slate-100 border border-slate-200 text-slate-400 rounded-xl flex items-center justify-center">
                <Database size={20} />
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 border border-slate-200 text-slate-400 rounded-xl text-[10.5px] font-extrabold cursor-not-allowed">
                <span>Terkunci</span>
              </span>
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-400">3. Integrasi Data Majoo (Metode 2)</h3>
              <p className="text-xs text-slate-400 font-semibold mt-1 leading-relaxed">
                Tarik data produk, kategori, dan stok secara langsung dari dashboard.majoo.id dengan menyalin token otorisasi dari browser Developer Tools Anda.
              </p>
              <div className="mt-3.5 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl flex items-start gap-2 text-[10px] font-bold leading-normal">
                <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                <span>Hubungi developer jika ingin mengaktifkan fitur sinkronisasi ini.</span>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-150 pt-3 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Status Modul</span>
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider border bg-slate-100 border-slate-200 text-slate-400">
              <span className="h-1 w-1 rounded-full bg-slate-400" />
              Nonaktif (Terkunci)
            </span>
          </div>
        </div>

        {/* Toggle 4: Pawoon Integration (Excel/CSV) - DISABLED */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-3xs flex flex-col justify-between space-y-4 opacity-85">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 bg-slate-100 border border-slate-200 text-slate-400 rounded-xl flex items-center justify-center">
                <Database size={20} />
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 border border-slate-200 text-slate-400 rounded-xl text-[10.5px] font-extrabold cursor-not-allowed">
                <span>Terkunci</span>
              </span>
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-400">4. Integrasi Data Pawoon (Excel/CSV)</h3>
              <p className="text-xs text-slate-400 font-semibold mt-1 leading-relaxed">
                Migrasi data produk, kategori, penyesuaian stok, dan transaksi penjualan historis secara instan dengan mengunggah file laporan hasil ekspor dari dashboard Pawoon Anda.
              </p>
              <div className="mt-3.5 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl flex items-start gap-2 text-[10px] font-bold leading-normal">
                <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                <span>Hubungi developer jika ingin mengaktifkan fitur sinkronisasi ini.</span>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-150 pt-3 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Status Modul</span>
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider border bg-slate-100 border-slate-200 text-slate-400">
              <span className="h-1 w-1 rounded-full bg-slate-400" />
              Nonaktif (Terkunci)
            </span>
          </div>
        </div>
      </div>

      {/* Info Warning */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200/70 p-4 rounded-2xl text-amber-800">
        <AlertCircle size={18} className="shrink-0 mt-0.5 text-amber-600" />
        <div className="space-y-1">
          <p className="text-xs font-bold">Catatan Sinkronisasi Aplikasi:</p>
          <p className="text-[10.5px] leading-relaxed font-semibold text-amber-700">
            Pengaktifan fitur bundling dan poin loyalty akan segera memengaruhi fungsionalitas form katalog dan checkout kasir di browser ini. Perubahan bersifat lokal dan aman tanpa mengganggu basis data utama API.
          </p>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import {
  Monitor,
  Package,
  TrendingUp,
  Users,
  ChevronDown,
  KeyRound,
  Search,
  Laptop,
  LogOut
} from 'lucide-react'

interface FAQItem {
  question: string
  answer: string
}

export default function Home() {
  const router = useRouter()
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)

  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasCookieToken = document.cookie.split('; ').some((row) => row.startsWith('token='))
      if (!hasCookieToken) {
        localStorage.clear()
      }
      const token = localStorage.getItem('token')
      setIsLoggedIn(!!token)
    }
  }, [])

  function handleLogout() {
    localStorage.clear()
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    document.cookie = 'userRole=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    document.cookie = 'user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    setIsLoggedIn(false)
    router.replace('/login')
  }

  const systemGuides: FAQItem[] = [
    {
      question: 'Bagaimana cara kasir memulai shift baru?',
      answer: 'Untuk memulai transaksi, kasir wajib login menggunakan akun bertipe STORE, masuk ke menu "Terminal Kasir", lalu masukkan nominal Uang Modal Awal Laci. Setelah shift terbuka, transaksi belanja dapat dilayani.'
    },
    {
      question: 'Di mana admin dapat mencetak label barcode untuk baju/gamis baru?',
      answer: 'Admin dapat mencetak barcode dengan masuk ke dashboard admin, pilih menu "Barcode" di panel samping kiri, lalu cari produk yang diinginkan, tentukan jumlah cetakan, dan klik tombol "Cetak". Sistem akan menghasilkan barcode sesuai format kertas thermal.'
    },
    {
      question: 'Bagaimana prosedur penutupan shift dan pencocokan uang fisik?',
      answer: 'Di akhir jam kerja, kasir harus memilih tombol "Tutup Shift", menghitung jumlah uang kertas & koin fisik di dalam laci, lalu menginput nominal aktual tersebut ke sistem. Sistem akan otomatis menghitung ekspektasi nominal penjualan dan menampilkan selisih (jika ada) dalam nota rekapitulasi shift.'
    },
    {
      question: 'Bagaimana cara menambahkan cabang toko / outlet baru?',
      answer: 'Hak akses pendaftaran outlet baru hanya dimiliki oleh Owner / Super Admin. Masuk ke dashboard admin, pilih menu "Cabang Toko", kemudian klik "Tambah Toko" dan lengkapi detail alamat serta nomor telepon outlet.'
    }
  ]

  return (
    <main className="min-h-screen bg-slate-50/70 text-slate-900 selection:bg-blue-600 selection:text-white relative overflow-hidden font-sans">

      <div className="absolute top-[-10%] left-[-5%] -z-10 h-[500px] w-[500px] rounded-full bg-blue-400/10 blur-3xl" />
      <div className="absolute top-[40%] right-[-10%] -z-10 h-[500px] w-[500px] rounded-full bg-sky-400/10 blur-3xl" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:5rem_5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] -z-20 opacity-35" />

      <nav className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/80 backdrop-blur-md transition-all duration-200 shadow-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">

          <div className="flex items-center gap-2">
            <div className="h-6.5 w-6.5 rounded-lg bg-gradient-to-tr from-blue-600 to-sky-500 flex items-center justify-center text-white font-black text-sm shadow-md shadow-blue-500/20">
              L
            </div>
            <h1 className="text-xl font-black tracking-tight text-slate-900">
              laila<span className="text-blue-600 font-extrabold">collections</span>
              <span className="ml-2.5 text-[8.5px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md leading-none">INTERNAL</span>
            </h1>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
            <a href="#portal" className="hover:text-blue-600 transition-colors">Akses Portal</a>
            <a href="#fitur" className="hover:text-blue-600 transition-colors">Fitur Sistem</a>
            <a href="#faq" className="hover:text-blue-600 transition-colors">Panduan</a>
          </div>

          <div>
            {isLoggedIn ? (
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 rounded-xl bg-red-50 hover:bg-red-105 border border-red-200 px-4 py-2.5 text-xs font-bold text-red-600 transition-all cursor-pointer shadow-3xs"
              >
                <LogOut size={13} />
                <span>Keluar Sesi</span>
              </button>
            ) : (
              <Link
                href="/login"
                className="rounded-xl bg-blue-600 hover:bg-blue-705 px-5 py-2.5 text-xs font-bold text-white shadow-xs shadow-blue-500/20 transition-all hover:shadow-md hover:shadow-blue-500/30 active:scale-97 cursor-pointer"
              >
                Log In
              </Link>
            )}
          </div>

        </div>
      </nav>

      <section className="relative mx-auto max-w-7xl px-6 pt-12 pb-20 lg:px-8 lg:pt-20 flex flex-col lg:grid lg:grid-cols-12 gap-12 items-center">

        <div className="lg:col-span-6 text-center lg:text-left space-y-6">

          <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200/80 bg-blue-50/70 px-4 py-1.5 text-xs font-extrabold tracking-wide text-blue-700 shadow-3xs">
            <Laptop size={12} className="animate-pulse" />
            <span>Sistem Informasi Manajemen Ritel Terintegrasi</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 leading-tight">
            Portal Gateway Internal <br />
            <span className="bg-gradient-to-r from-blue-600 to-sky-500 bg-clip-text text-transparent">Laila Collections</span>
          </h1>

          <p className="max-w-xl mx-auto lg:mx-0 text-slate-500 text-sm font-medium leading-relaxed">
            Selamat datang di sistem manajemen internal Laila Collections. Portal ini digunakan oleh owner, kasir, dan staff backoffice untuk melayani transaksi kasir, mengelola persediaan stok butik, mencetak barcode barang, serta memantau laporan keuangan secara real-time.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
            {isLoggedIn ? (
              <Link
                href="/dashboard/admin"
                className="w-full sm:w-auto text-center rounded-xl bg-blue-600 hover:bg-blue-750 px-8 py-4 text-xs font-bold text-white shadow-lg shadow-blue-500/20 hover:scale-[1.02] active:scale-98 transition-all cursor-pointer"
              >
                Masuk ke Dashboard Admin
              </Link>
            ) : (
              <Link
                href="/login"
                className="w-full sm:w-auto text-center rounded-xl bg-blue-600 hover:bg-blue-750 px-8 py-4 text-xs font-bold text-white shadow-lg shadow-blue-500/20 hover:scale-[1.02] active:scale-98 transition-all cursor-pointer"
              >
                Masuk ke Sistem Utama
              </Link>
            )}
            <a
              href="#portal"
              className="w-full sm:w-auto text-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-8 py-4 text-xs font-bold text-slate-600 hover:text-slate-900 transition-all cursor-pointer shadow-3xs"
            >
              Pilih Akses Menu
            </a>
          </div>

        </div>

        <div className="lg:col-span-6 w-full max-w-lg lg:max-w-none flex justify-center">

          <div className="w-full bg-slate-900 rounded-3xl p-3 shadow-2xl border border-slate-800 relative overflow-hidden group hover:border-blue-500/40 transition-colors duration-300">
            <div className="absolute top-2 left-1/2 -translate-x-1/2 h-3.5 w-20 rounded-full bg-slate-800" />

            <div className="bg-slate-100 rounded-2xl overflow-hidden aspect-[4/3] w-full text-slate-800 text-[9px] flex flex-col font-sans select-none">

              <div className="h-7 bg-white border-b border-slate-200 px-2.5 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-red-400" />
                  <div className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
                  <div className="h-1.5 w-1.5 rounded-full bg-green-400" />
                  <span className="font-extrabold text-slate-555 ml-1.5 uppercase tracking-wider text-[7px]">Terminal POS - Laila Collections</span>
                </div>
                <div className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded font-bold text-[6px]">KASIR AKTIF</div>
              </div>

              <div className="flex-1 flex overflow-hidden">

                <div className="flex-1 p-2 space-y-2 flex flex-col justify-between overflow-hidden">
                  <div className="flex items-center bg-white border border-slate-200 px-2 py-1.5 rounded-lg text-slate-400 gap-1.5">
                    <Search size={8} />
                    <span>Cari gamis silk, hijab voal...</span>
                  </div>

                  <div className="flex-1 grid grid-cols-3 gap-1.5 overflow-y-auto">
                    {[
                      { name: 'Gamis Silk Premium', price: 'Rp 245.000', stock: 12 },
                      { name: 'Hijab Voal Square', price: 'Rp 65.000', stock: 48 },
                      { name: 'Tunik Floral Soft', price: 'Rp 175.000', stock: 9 },
                    ].map((item, index) => (
                      <div key={index} className="bg-white border border-slate-200/80 rounded-lg p-1.5 flex flex-col justify-between">
                        <div className="h-9 bg-slate-50 rounded flex items-center justify-center font-bold text-slate-400 text-[10px]">👗</div>
                        <div className="mt-1">
                          <p className="font-extrabold text-slate-800 leading-normal truncate">{item.name}</p>
                          <p className="font-bold text-blue-600 mt-0.5 font-mono text-[7px]">{item.price}</p>
                        </div>
                        <div className="mt-1 flex items-center justify-between border-t border-slate-100 pt-1 text-[6px] text-slate-400 font-bold">
                          <span>Stok: {item.stock}</span>
                          <span className="h-3 w-3 bg-blue-50 text-blue-600 rounded flex items-center justify-center font-black cursor-pointer">+</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="w-40 bg-white border-l border-slate-200 p-2 flex flex-col justify-between flex-shrink-0">
                  <div className="space-y-1.5 flex-1 overflow-y-auto">
                    <p className="font-extrabold text-slate-400 uppercase tracking-widest text-[6px] border-b border-slate-100 pb-1">Detail Nota</p>
                    <div className="flex justify-between text-[7px]">
                      <span className="font-bold">Gamis Silk Premium</span>
                      <span className="font-mono">Rp 245.000</span>
                    </div>
                  </div>

                  <div className="border-t border-slate-150 pt-2 space-y-1.5">
                    <div className="flex justify-between items-center text-slate-900">
                      <span className="font-bold text-[7.5px]">TOTAL</span>
                      <span className="font-black font-mono text-blue-600 text-[9px]">Rp 245.000</span>
                    </div>
                    <button className="w-full py-1.5 bg-blue-600 text-white font-extrabold rounded-lg text-[7px] tracking-wide mt-1">
                      BAYAR TUNAI (F9)
                    </button>
                  </div>
                </div>

              </div>

            </div>

          </div>

        </div>

      </section>

      <section id="portal" className="bg-white border-y border-slate-200/50 py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">

          <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-600">Pintu Akses Portal</span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Pilih Akses Sesuai Wewenang</h2>
            <div className="h-1 w-12 bg-blue-600 rounded-full mx-auto" />
            <p className="text-slate-500 text-xs font-semibold">Gunakan wewenang akun Anda untuk mengakses fitur sistem.</p>
          </div>

          <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto items-stretch">

            <div className="bg-slate-50/80 rounded-2xl border border-slate-200 p-6.5 flex flex-col justify-between shadow-xs">
              <div className="space-y-4">
                <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-150 text-blue-600 flex items-center justify-center">
                  <Laptop size={18} />
                </div>
                <h3 className="font-extrabold text-slate-950 text-sm">Owner & Admin Dashboard</h3>
                <p className="text-slate-555 text-xs leading-relaxed font-medium">
                  Akses wewenang penuh untuk memantau data keuangan cabang, laporan stok barang, kulakan supplier, kelola data kasir, dan pengaturan promo/diskon produk butik.
                </p>
              </div>
              <Link
                href="/dashboard/admin"
                className="w-full text-center py-3 bg-blue-600 hover:bg-blue-750 text-white font-bold text-xs rounded-xl shadow-xs active:scale-97 transition-all mt-6 block cursor-pointer"
              >
                Masuk Admin Dashboard
              </Link>
            </div>

            <div className="bg-slate-50/80 rounded-2xl border border-slate-200 p-6.5 flex flex-col justify-between shadow-xs">
              <div className="space-y-4">
                <div className="h-10 w-10 rounded-xl bg-sky-50 border border-sky-150 text-sky-600 flex items-center justify-center">
                  <Monitor size={18} />
                </div>
                <h3 className="font-extrabold text-slate-950 text-sm">Terminal POS Kasir</h3>
                <p className="text-slate-555 text-xs leading-relaxed font-medium">
                  Layar antarmuka kasir toko untuk melakukan scanning belanjaan, menerima pembayaran tunai/QRIS/debit, input member pelanggan, serta mencetak struk thermal nota penjualan.
                </p>
              </div>
              <Link
                href="/dashboard/store/cashier"
                className="w-full text-center py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs active:scale-97 transition-all mt-6 block cursor-pointer"
              >
                Buka Terminal Kasir
              </Link>
            </div>

            <div className="bg-slate-50/80 rounded-2xl border border-slate-200 p-6.5 flex flex-col justify-between shadow-xs">
              <div className="space-y-4">
                <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-150 text-indigo-600 flex items-center justify-center">
                  <KeyRound size={18} />
                </div>
                <h3 className="font-extrabold text-slate-950 text-sm">Store Backoffice Outlet</h3>
                <p className="text-slate-555 text-xs leading-relaxed font-medium">
                  Akses pengelola cabang untuk mengedit data stok lokal toko, melakukan cash opname laci kasir, memantau riwayat pembukaan shift kasir harian, dan mutasi barang masuk.
                </p>
              </div>
              <Link
                href="/dashboard/store"
                className="w-full text-center py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs active:scale-97 transition-all mt-6 block cursor-pointer"
              >
                Masuk Store Backoffice
              </Link>
            </div>

          </div>

        </div>
      </section>

      <section id="fitur" className="py-20 mx-auto max-w-7xl px-6 lg:px-8">

        <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-600">Spesifikasi Sistem</span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Kelola Seluruh Operasional Butik</h2>
          <div className="h-1 w-12 bg-blue-600 rounded-full mx-auto" />
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">

          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-3xs hover:border-blue-200 transition-all">
            <span className="text-2xl">📦</span>
            <h3 className="font-extrabold text-slate-950 text-sm mt-4">Stok Multi-Outlet</h3>
            <p className="text-slate-500 text-xs leading-relaxed mt-2 font-medium">Sinkronisasi sisa stok baju dan gamis secara otomatis antar cabang toko saat transaksi diselesaikan.</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-3xs hover:border-blue-200 transition-all">
            <span className="text-2xl">🏷️</span>
            <h3 className="font-extrabold text-slate-950 text-sm mt-4">Barcode SKU Generator</h3>
            <p className="text-slate-500 text-xs leading-relaxed mt-2 font-medium">Buat kode barcode unik dan langsung cetak label stiker tag harga baju langsung melalui printer thermal.</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-3xs hover:border-blue-200 transition-all">
            <span className="text-2xl">👥</span>
            <h3 className="font-extrabold text-slate-950 text-sm mt-4">Loyalitas Member</h3>
            <p className="text-slate-555 text-xs leading-relaxed mt-2 font-medium">Simpan riwayat total belanja pelanggan butik Laila Collections untuk memicu diskon member otomatis.</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-3xs hover:border-blue-200 transition-all">
            <span className="text-2xl">📈</span>
            <h3 className="font-extrabold text-slate-950 text-sm mt-4">Laporan Laba Bersih</h3>
            <p className="text-slate-500 text-xs leading-relaxed mt-2 font-medium">Kalkulasi omset kotor dikurangi biaya pengeluaran operasional outlet untuk menyajikan laba bersih riil.</p>
          </div>

        </div>

      </section>

      <section id="faq" className="py-20 mx-auto max-w-4xl px-6 lg:px-8 space-y-12">

        <div className="text-center space-y-3">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-600">Panduan Operasional</span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Pusat Bantuan & Panduan Sistem</h2>
          <div className="h-1 w-12 bg-blue-600 rounded-full mx-auto" />
        </div>

        <div className="border border-slate-200 bg-slate-50/30 rounded-2xl overflow-hidden divide-y divide-slate-200 font-sans">
          {systemGuides.map((faq, index) => {
            const isOpen = expandedFaq === index
            return (
              <div key={index} className="transition-colors hover:bg-slate-50/50">
                <button
                  onClick={() => setExpandedFaq(isOpen ? null : index)}
                  className="w-full flex items-center justify-between px-5 py-4.5 text-left font-bold text-xs text-slate-900 cursor-pointer"
                >
                  <span>{faq.question}</span>
                  <ChevronDown
                    size={15}
                    className={`text-slate-400 transition-transform duration-250 ${isOpen ? 'rotate-180 text-blue-600' : ''}`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-xs text-slate-500 leading-relaxed font-semibold animate-in slide-in-from-top-1 duration-150">
                    {faq.answer}
                  </div>
                )}
              </div>
            )
          })}
        </div>

      </section>

      <footer className="bg-slate-950 py-12 text-xs text-slate-400 border-t border-slate-900 relative">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">

          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-blue-600 flex items-center justify-center text-white font-black text-xs shadow-sm">L</div>
            <h2 className="text-sm font-extrabold text-white tracking-tight">laila<span className="text-blue-500 font-extrabold">collections</span></h2>
            <span className="ml-2 text-[8px] font-black uppercase text-slate-555 border border-slate-800 px-1.5 py-0.5 rounded leading-none">Internal Portal v.1.0</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-[10px] font-bold uppercase tracking-wider">
            <a href="#portal" className="hover:text-white transition-colors">Akses Portal</a>
            <a href="#fitur" className="hover:text-white transition-colors">Fitur Sistem</a>
            <a href="#faq" className="hover:text-white transition-colors">Panduan Sistem</a>
          </div>

          <p className="text-[10px] text-slate-555 font-semibold">© {new Date().getFullYear()} Laila Collections. Hak Cipta Dilindungi.</p>

        </div>
      </footer>

    </main>
  )
}

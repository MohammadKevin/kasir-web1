import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-600 selection:text-white">

      <nav className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-8">
          
          <h1 className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-xl font-extrabold tracking-tight text-transparent sm:text-2xl">
            Laila <span className="text-slate-900">collections</span>
          </h1>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 transition-all hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
            >
              Login
            </Link>

            <Link
              href="/dashboard"
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/20"
            >
              Dashboard
            </Link>
          </div>

        </div>
      </nav>


      <section className="relative mx-auto flex min-h-[85vh] max-w-7xl flex-col justify-center px-6 py-20 md:px-8">
        
        <div className="absolute top-1/4 left-1/4 -z-10 h-72 w-72 rounded-full bg-blue-100/60 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 -z-10 h-72 w-72 rounded-full bg-cyan-100/50 blur-3xl" />
        
        <div className="mx-auto max-w-4xl text-center">
          
          <div className="mb-6 inline-flex items-center rounded-full border border-blue-100 bg-blue-50/60 px-4 py-1.5 text-xs font-semibold tracking-wide text-blue-700 shadow-sm">
            🚀 Sistem POS Modern & Terintegrasi
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl md:text-6xl md:leading-[1.15]">
            Kelola toko, transaksi, stok, <br className="hidden md:inline" />
            dan laporan dalam <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 bg-clip-text text-transparent">satu flow terpadu.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base text-slate-500 sm:text-lg md:text-xl">
            lailacollections dirancang untuk mempermudah bisnis memantau penjualan, barcode, pembelian, pelanggan, serta laporan otomatis secara real-time.
          </p>

          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              href="/login"
              className="group rounded-xl bg-blue-600 px-8 py-4 text-center font-medium text-white transition-all hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/20"
            >
              Mulai Sekarang <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
            </Link>

            <Link
              href="/dashboard"
              className="rounded-xl border border-slate-200 bg-white px-8 py-4 text-center font-medium text-slate-600 transition-all hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200"
            >
              Buka Dashboard
            </Link>
          </div>

        </div>

      </section>


      <section className="border-y border-slate-200 bg-white py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-6 md:px-8">

          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Fitur Utama lailacollections
            </h2>
            <p className="mt-4 text-slate-500">
              Segala yang Anda butuhkan untuk mempercepat kelancaran operasional bisnis ritel Anda.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Card
              icon="💳"
              title="Transaksi"
              desc="Proses pembayaran cepat dengan integrasi kelancaran scanner barcode."
            />
            <Card
              icon="📦"
              title="Stok Barang"
              desc="Pantau stok masuk dan keluar secara otomatis tanpa selisih."
            />
            <Card
              icon="📈"
              title="Laporan"
              desc="Export laporan keuangan ke PDF dan Excel dalam satu klik."
            />
            <Card
              icon="👥"
              title="Customer"
              desc="Simpan histori transaksi dan kelola program loyalitas pelanggan."
            />
            <Card
              icon="🏷️"
              title="Diskon"
              desc="Atur skema promo otomatis untuk tiap produk pilihan Anda."
            />
            <Card
              icon="✨"
              title="Multi Payment"
              desc="Terima pembayaran lewat Cash, Transfer Bank, hingga QRIS."
            />
          </div>

        </div>
      </section>


      <section className="relative overflow-hidden bg-slate-950 py-24 text-white">
        
        <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-blue-600/15 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-indigo-600/10 blur-3xl" />
        
        <div className="relative mx-auto max-w-3xl px-6 text-center md:px-8">
          
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Siap untuk meningkatkan efisiensi toko Anda?
          </h2>

          <p className="mx-auto mt-6 max-w-xl text-slate-400 sm:text-lg">
            Gabung dengan ribuan merchant lainnya. Login dan mulai gunakan lailacollections sekarang juga tanpa biaya tersembunyi.
          </p>

          <Link
            href="/login"
            className="mt-10 inline-block rounded-xl bg-blue-600 px-8 py-4 font-semibold text-white transition-all hover:bg-blue-500 hover:scale-[1.02] active:scale-[0.98] hover:shadow-xl hover:shadow-blue-600/30"
          >
            Login Sekarang
          </Link>

        </div>
      </section>


      <footer className="bg-white py-12 border-t border-slate-100">
        <div className="mx-auto max-w-7xl px-6 text-center text-sm text-slate-400 md:px-8">
          © {new Date().getFullYear()} lailacollections . Hak Cipta Dilindungi.
        </div>
      </footer>

    </main>
  )
}

function Card({
  icon,
  title,
  desc,
}: {
  icon: string
  title: string
  desc: string
}) {
  return (
    <div className="group rounded-2xl border border-slate-100 bg-slate-50/50 p-8 transition-all duration-300 hover:border-blue-100 hover:bg-white hover:shadow-xl hover:shadow-blue-600/5">
      
      <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white text-2xl shadow-sm border border-slate-100 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
        {icon}
      </div>

      <h3 className="text-lg font-bold text-slate-900 transition-colors group-hover:text-blue-600">
        {title}
      </h3>

      <p className="mt-2.5 text-sm leading-relaxed text-slate-500">
        {desc}
      </p>

    </div>
  )
}

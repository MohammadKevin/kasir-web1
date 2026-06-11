import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-650 selection:text-white relative overflow-hidden">
      
      {/* Decorative Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] -z-20 opacity-60" />
      
      {/* Animated Glowing Orbs */}
      <div className="absolute top-[-10%] left-[-10%] -z-10 h-[500px] w-[500px] rounded-full bg-blue-400/20 blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
      <div className="absolute top-[20%] right-[-10%] -z-10 h-[500px] w-[500px] rounded-full bg-indigo-400/20 blur-3xl animate-pulse" style={{ animationDuration: '12s' }} />
      <div className="absolute bottom-[-10%] left-[20%] -z-10 h-[500px] w-[500px] rounded-full bg-cyan-400/15 blur-3xl animate-pulse" style={{ animationDuration: '10s' }} />

      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-slate-200/50 bg-white/70 backdrop-blur-md transition-all duration-200">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-8">
          
          <Link href="/" className="flex items-center gap-2 group">
            <span className="h-5 w-5 rounded-md bg-gradient-to-tr from-blue-600 to-indigo-650 shadow-md shadow-blue-500/20 transition-transform group-hover:scale-110" />
            <h1 className="text-xl font-black tracking-tight text-slate-900">
              Laila <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">collections</span>
            </h1>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-xl border border-slate-200/80 bg-white/40 px-5 py-2 text-sm font-semibold text-slate-650 transition-all hover:bg-slate-50 hover:text-blue-600 hover:border-blue-300 active:scale-95"
            >
              Login
            </Link>

            <Link
              href="/login"
              className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-blue-500/10 transition-all hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg hover:shadow-blue-550/20 active:scale-95"
            >
              Dashboard
            </Link>
          </div>

        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative mx-auto flex min-h-[80vh] max-w-7xl flex-col justify-center px-6 py-24 md:px-8">
        
        <div className="mx-auto max-w-4xl text-center">
          
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-blue-50/60 px-4 py-1.5 text-xs font-bold tracking-wide text-blue-700 shadow-sm backdrop-blur-xs animate-float">
            <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-ping" />
            🚀 Sistem POS Modern & Terintegrasi
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl md:text-6xl md:leading-[1.15]">
            Kelola toko, transaksi, stok, <br className="hidden md:inline" />
            dan laporan dalam <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 bg-clip-text text-transparent font-black">satu flow terpadu.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base text-slate-500 sm:text-lg md:text-xl leading-relaxed">
            Laila Collections dirancang khusus untuk mempermudah bisnis ritel memantau penjualan secara real-time, cetak barcode otomatis, kelola member, dan kelola laporan keuangan secara akurat.
          </p>

          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row items-center">
            <Link
              href="/login"
              className="group rounded-xl bg-gradient-to-r from-blue-600 to-indigo-650 px-8 py-4 text-center font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.03] hover:shadow-xl hover:shadow-blue-600/30 active:scale-[0.98] w-full sm:w-auto"
            >
              Mulai Sekarang <span className="inline-block transition-transform group-hover:translate-x-1.5">→</span>
            </Link>

            <Link
              href="/login"
              className="rounded-xl border border-slate-200 bg-white/80 px-8 py-4 text-center font-bold text-slate-650 transition-all hover:bg-slate-50 hover:text-blue-650 hover:border-blue-200 hover:shadow-md active:scale-[0.98] w-full sm:w-auto"
            >
              Buka Dashboard
            </Link>
          </div>

        </div>

      </section>

      {/* Features Section */}
      <section className="border-t border-slate-200/60 bg-white/50 backdrop-blur-xs py-24 md:py-32 relative">
        <div className="mx-auto max-w-7xl px-6 md:px-8">

          <div className="mx-auto max-w-2xl text-center mb-20">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Fitur Utama Laila Collections
            </h2>
            <div className="h-1.5 w-16 bg-blue-600 mx-auto mt-4 rounded-full" />
            <p className="mt-5 text-slate-500 font-medium">
              Segala yang Anda butuhkan untuk mempercepat kelancaran operasional bisnis ritel Anda.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Card
              icon="💳"
              title="Transaksi Instan"
              desc="Proses pembayaran cepat dengan integrasi pemindai barcode secara langsung."
              colorClass="hover:border-blue-300 hover:shadow-blue-500/5 hover:bg-blue-50/10"
            />
            <Card
              icon="📦"
              title="Stok Barang Akurat"
              desc="Pantau stok masuk dan keluar secara otomatis tanpa selisih atau kerugian."
              colorClass="hover:border-emerald-300 hover:shadow-emerald-500/5 hover:bg-emerald-50/10"
            />
            <Card
              icon="📈"
              title="Laporan Otomatis"
              desc="Ekspor laporan laba bersih dan pengeluaran ke PDF & Excel dalam satu klik."
              colorClass="hover:border-violet-300 hover:shadow-violet-500/5 hover:bg-violet-50/10"
            />
            <Card
              icon="👥"
              title="Member & Pelanggan"
              desc="Simpan histori transaksi dan kelola program loyalitas member pelanggan Anda."
              colorClass="hover:border-amber-300 hover:shadow-amber-500/5 hover:bg-amber-50/10"
            />
            <Card
              icon="🏷️"
              title="Diskon & Promo"
              desc="Atur skema potongan harga otomatis berdasarkan barang pilihan."
              colorClass="hover:border-rose-300 hover:shadow-rose-500/5 hover:bg-rose-50/10"
            />
            <Card
              icon="✨"
              title="Multi Pembayaran"
              desc="Terima pembayaran lewat Cash/Tunai, Transfer Bank, hingga QRIS otomatis."
              colorClass="hover:border-cyan-300 hover:shadow-cyan-500/5 hover:bg-cyan-50/10"
            />
          </div>

        </div>
      </section>

      {/* CTA Section */}
      <section className="relative overflow-hidden bg-slate-950 py-28 text-white">
        
        {/* Glow behind CTA */}
        <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-blue-600/20 blur-[100px] animate-pulse" />
        <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-indigo-600/15 blur-[100px] animate-pulse" />
        
        <div className="relative mx-auto max-w-3xl px-6 text-center md:px-8">
          
          <h2 className="text-3xl font-black tracking-tight sm:text-4xl md:text-5xl">
            Siap Meningkatkan Efisiensi Bisnis Anda?
          </h2>

          <p className="mx-auto mt-6 max-w-xl text-slate-400 text-base sm:text-lg">
            Gabung dengan merchant lainnya. Gunakan Laila Collections sekarang juga untuk operasional kasir yang cerdas tanpa ribet.
          </p>

          <Link
            href="/login"
            className="mt-10 inline-block rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-8 py-4 font-bold text-white transition-all hover:scale-[1.04] active:scale-[0.97] hover:shadow-xl hover:shadow-blue-500/20"
          >
            Login Sekarang
          </Link>

        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-12 border-t border-slate-200/50">
        <div className="mx-auto max-w-7xl px-6 text-center text-sm font-medium text-slate-400 md:px-8">
          © {new Date().getFullYear()} Laila Collections. Hak Cipta Dilindungi.
        </div>
      </footer>

    </main>
  )
}

function Card({
  icon,
  title,
  desc,
  colorClass,
}: {
  icon: string
  title: string
  desc: string
  colorClass: string
}) {
  return (
    <div className={`group rounded-2xl border border-slate-200/80 bg-white p-8 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl ${colorClass}`}>
      
      <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 text-2xl shadow-sm border border-slate-100 group-hover:bg-slate-900 group-hover:text-white transition-all duration-300">
        {icon}
      </div>

      <h3 className="text-lg font-bold text-slate-900 transition-colors duration-200">
        {title}
      </h3>

      <p className="mt-3 text-sm leading-relaxed text-slate-500">
        {desc}
      </p>

    </div>
  )
}



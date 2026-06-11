'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'

const managementMenus = [
  { name: 'Cabang Toko', path: '/dashboard/admin/stores' },
  { name: 'Kasir', path: '/dashboard/admin/cashier' },
  { name: 'Produk', path: '/dashboard/admin/products' },
  { name: 'Barcode', path: '/dashboard/admin/barcode' },
  { name: 'Kategori', path: '/dashboard/admin/categories' },
  { name: 'Pelanggan', path: '/dashboard/admin/customers' },
  { name: 'Supplier', path: '/dashboard/admin/suppliers' },
]

const menus = [
  {
    title: 'Penjualan',
    items: [
      { name: 'Riwayat Transaksi', path: '/dashboard/admin/transactions' },
      { name: 'Kulakan / Pembelian', path: '/dashboard/admin/purchases' },
      { name: 'Diskon / Promo', path: '/dashboard/admin/discounts' },
      { name: 'Stok Barang', path: '/dashboard/admin/stock' },
    ],
  },
  {
    title: 'Keuangan',
    items: [
      { name: 'Pengeluaran', path: '/dashboard/admin/expenses' },
      { name: 'Laporan', path: '/dashboard/admin/reports' },
    ],
  },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [open, setOpen] = useState<string[]>([])
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  useEffect(() => {
    const active = menus.find((section) =>
      section.items.some((item) => item.path === pathname)
    )
    if (active && !open.includes(active.title)) {
      setOpen((prev) => [...prev, active.title])
    }
    setIsSidebarOpen(false)
  }, [pathname])

  function toggle(section: string) {
    if (open.includes(section)) {
      setOpen(open.filter((x) => x !== section))
      return
    }
    setOpen([...open, section])
  }

  function logout() {
    localStorage.clear()
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    window.location.href = '/login'
  }

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800 antialiased">
      
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-xs md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 flex h-full w-64 flex-col border-r border-slate-200 bg-white px-5 py-6 justify-between transition-transform duration-300 md:sticky md:top-0 md:h-screen md:translate-x-0 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        
        <div className="flex flex-col flex-1 overflow-y-auto pr-1">
          
          <div className="mb-8 px-2 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="h-5 w-5 rounded bg-blue-600 block flex-shrink-0 shadow-sm shadow-blue-500/20" />
              <h1 className="text-lg font-bold tracking-tight text-slate-900">
                laila<span className="text-blue-600">collections</span>
              </h1>
            </div>
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 md:hidden"
            >
              <X size={18} />
            </button>
          </div>

          <div className="space-y-6">
            
            <div>
              <Link
                href="/dashboard/admin"
                className={`flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  pathname === '/dashboard/admin'
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                Ringkasan Dashboard
              </Link>
            </div>

            <div>
              <div className="mb-2 px-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                Manajemen
              </div>
              <div className="space-y-0.5">
                {managementMenus.map((item) => {
                  const isActive = pathname === item.path
                  return (
                    <Link
                      key={item.path}
                      href={item.path}
                      className={`block rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-50 text-blue-600 font-semibold'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      {item.name}
                    </Link>
                  )
                })}
              </div>
            </div>

            <div className="space-y-3">
              {menus.map((section) => {
                const isSectionOpen = open.includes(section.title)
                
                return (
                  <div key={section.title} className="space-y-1">
                    <button
                      onClick={() => toggle(section.title)}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 transition-colors hover:text-slate-600"
                    >
                      <span>{section.title}</span>
                      
                      <svg 
                        className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${isSectionOpen ? 'rotate-180' : ''}`} 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    <div 
                      className={`grid transition-all duration-200 ease-in-out ${
                        isSectionOpen ? 'grid-rows-[1fr] opacity-100 mt-1' : 'grid-rows-[0fr] opacity-0 pointer-events-none'
                      }`}
                    >
                      <div className="overflow-hidden space-y-0.5 pl-1 border-l border-slate-100 ml-1">
                        {section.items.map((item) => {
                          const isActive = pathname === item.path
                          return (
                            <Link
                              key={item.path}
                              href={item.path}
                              className={`block rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                                isActive
                                  ? 'bg-blue-50 text-blue-600 font-semibold'
                                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                              }`}
                            >
                              {item.name}
                            </Link>
                          )
                        })}
                      </div>
                    </div>

                  </div>
                )
              })}
            </div>

          </div>
        </div>

        <div className="pt-4 border-t border-slate-100">
          <button
            onClick={logout}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600 hover:border-red-200 active:bg-red-100"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout Akun
          </button>
        </div>

      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex h-16 items-center border-b border-slate-200 bg-white px-6 md:hidden flex-shrink-0">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100"
          >
            <Menu size={22} />
          </button>
          <span className="ml-3 text-sm font-bold tracking-tight text-slate-900">
            laila<span className="text-blue-600">collections</span> Admin
          </span>
        </header>

        <main className="flex-1 p-6 md:p-10 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl">
            {children}
          </div>
        </main>
      </div>

    </div>
  )
}
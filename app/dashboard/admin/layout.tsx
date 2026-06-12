'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Building2,
  Users,
  Package,
  Barcode as BarcodeIcon,
  Tag,
  UserCheck,
  Truck,
  Receipt,
  ShoppingCart,
  Percent,
  Boxes,
  CreditCard,
  BarChart3,
  Menu,
  X,
  ChevronDown,
  LogOut
} from 'lucide-react'

const managementMenus = [
  { name: 'Cabang Toko', path: '/dashboard/admin/stores', icon: Building2 },
  { name: 'Kasir', path: '/dashboard/admin/cashier', icon: Users },
  { name: 'Produk', path: '/dashboard/admin/products', icon: Package },
  { name: 'Barcode', path: '/dashboard/admin/barcode', icon: BarcodeIcon },
  { name: 'Kategori', path: '/dashboard/admin/categories', icon: Tag },
  { name: 'Pelanggan', path: '/dashboard/admin/customers', icon: UserCheck },
  { name: 'Supplier', path: '/dashboard/admin/suppliers', icon: Truck },
]

const menus = [
  {
    title: 'Penjualan',
    items: [
      { name: 'Riwayat Transaksi', path: '/dashboard/admin/transactions', icon: Receipt },
      { name: 'Kulakan / Pembelian', path: '/dashboard/admin/purchases', icon: ShoppingCart },
      { name: 'Diskon / Promo', path: '/dashboard/admin/discounts', icon: Percent },
      { name: 'Stok Barang', path: '/dashboard/admin/stock', icon: Boxes },
    ],
  },
  {
    title: 'Keuangan',
    items: [
      { name: 'Pengeluaran', path: '/dashboard/admin/expenses', icon: CreditCard },
      { name: 'Laporan', path: '/dashboard/admin/reports', icon: BarChart3 },
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
  const [user, setUser] = useState<{ name: string; type: string } | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasCookieToken = document.cookie.split('; ').some((row) => row.startsWith('token='))
      const storedToken = localStorage.getItem('token')
      const storedUser = localStorage.getItem('user')

      if (!hasCookieToken || !storedToken || !storedUser) {
        localStorage.clear()
        document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
        document.cookie = 'userRole=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
        document.cookie = 'user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
        window.location.href = '/login'
        return
      }

      try {
        const parsedUser = JSON.parse(storedUser)
        if (parsedUser.type !== 'ADMIN') {
          localStorage.clear()
          document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
          document.cookie = 'userRole=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
          document.cookie = 'user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
          window.location.href = '/login'
          return
        }
        setUser(parsedUser)
      } catch (e) {
        console.error(e)
        localStorage.clear()
        document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
        document.cookie = 'userRole=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
        document.cookie = 'user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
        window.location.href = '/login'
      }
    }
  }, [])

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
    document.cookie = 'userRole=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    document.cookie = 'user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    window.location.href = '/login'
  }

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800 antialiased font-sans">
      
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-xs md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar navigation */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex h-full w-64 flex-col border-r border-slate-200/80 bg-white px-5 py-6 justify-between transition-transform duration-300 md:sticky md:top-0 md:h-screen md:translate-x-0 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        
        <div className="flex flex-col flex-1 overflow-y-auto pr-1">
          
          {/* Sidebar Header Brand */}
          <div className="mb-8 px-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-md bg-gradient-to-tr from-blue-600 to-indigo-650 flex items-center justify-center text-white font-black text-xs shadow-md shadow-blue-500/20">
                L
              </div>
              <div>
                <h1 className="text-sm font-black tracking-tight text-slate-900 leading-none">
                  laila<span className="text-blue-600 font-extrabold">collections</span>
                </h1>
                <p className="text-[9px] font-bold text-slate-400 mt-1">v.1.0</p>
              </div>
            </div>
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 md:hidden"
            >
              <X size={18} />
            </button>
          </div>

          {/* Menus */}
          <div className="space-y-6">
            
            {/* Dashboard Overview */}
            <div>
              <Link
                href="/dashboard/admin"
                className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-xs font-bold transition-all duration-200 ${
                  pathname === '/dashboard/admin'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-650 text-white shadow-md shadow-blue-500/20 scale-[1.01]'
                    : 'text-slate-655 hover:bg-slate-55/70 hover:text-slate-900 hover:translate-x-1'
                }`}
              >
                <LayoutDashboard size={15} />
                <span>Ringkasan Dashboard</span>
              </Link>
            </div>

            {/* Management Section */}
            <div>
              <div className="mb-2.5 px-4 text-[9px] font-extrabold uppercase tracking-widest text-slate-400">
                Manajemen
              </div>
              <div className="space-y-1">
                {managementMenus.map((item) => {
                  const isActive = pathname === item.path
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.path}
                      href={item.path}
                      className={`flex items-center gap-3 px-4 py-2 text-xs font-bold transition-all duration-205 ${
                        isActive
                          ? 'bg-blue-50/80 text-blue-600 border-l-4 border-blue-600 pl-3 rounded-r-xl rounded-l-none'
                          : 'text-slate-600 hover:bg-slate-55/70 hover:text-slate-955 hover:translate-x-1 rounded-xl'
                      }`}
                    >
                      <Icon size={14} className={isActive ? 'text-blue-600' : 'text-slate-400'} />
                      <span>{item.name}</span>
                    </Link>
                  )
                })}
              </div>
            </div>

            {/* Dynamic Dropdown sections */}
            <div className="space-y-4">
              {menus.map((section) => {
                const isSectionOpen = open.includes(section.title)
                
                return (
                  <div key={section.title} className="space-y-1.5">
                    <button
                      onClick={() => toggle(section.title)}
                      className="flex w-full items-center justify-between px-4 py-2 text-[9px] font-extrabold uppercase tracking-widest text-slate-400 transition-colors hover:text-slate-650 cursor-pointer"
                    >
                      <span>{section.title}</span>
                      <ChevronDown 
                        size={12} 
                        className={`text-slate-400 transition-transform duration-200 ${isSectionOpen ? 'rotate-180' : ''}`} 
                      />
                    </button>

                    <div 
                      className={`grid transition-all duration-250 ease-in-out ${
                        isSectionOpen ? 'grid-rows-[1fr] opacity-100 mt-1' : 'grid-rows-[0fr] opacity-0 pointer-events-none'
                      }`}
                    >
                      <div className="overflow-hidden space-y-1 pl-1 border-l border-slate-100 ml-3">
                        {section.items.map((item) => {
                          const isActive = pathname === item.path
                          const Icon = item.icon
                          return (
                            <Link
                              key={item.path}
                              href={item.path}
                              className={`flex items-center gap-3 px-4 py-2 text-xs font-bold transition-all duration-205 ${
                                isActive
                                  ? 'bg-blue-50/80 text-blue-600 border-l-4 border-blue-600 pl-3 rounded-r-xl rounded-l-none'
                                  : 'text-slate-600 hover:bg-slate-55/70 hover:text-slate-955 hover:translate-x-1 rounded-xl'
                              }`}
                            >
                              <Icon size={13} className={isActive ? 'text-blue-600' : 'text-slate-400'} />
                              <span>{item.name}</span>
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

        {/* User profile & Logout footer */}
        <div className="pt-4 border-t border-slate-100 space-y-4">
          {user && (
            <div className="flex items-center gap-3 px-2 py-1">
              <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-blue-100 to-indigo-55 bg-blue-50 text-blue-600 border border-blue-200/50 flex items-center justify-center font-black text-xs">
                {user.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-extrabold text-slate-900 truncate leading-tight">{user.name}</p>
                <p className="text-[8.5px] font-black uppercase text-slate-400 tracking-wider mt-0.5 leading-none">{user.type}</p>
              </div>
            </div>
          )}
          
          <button
            onClick={logout}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-655 transition-all hover:bg-red-50 hover:text-red-650 hover:border-red-200 active:scale-97 cursor-pointer"
          >
            <LogOut size={13} />
            <span>Keluar Sesi</span>
          </button>
          
          <div className="text-center text-[10px] text-slate-400 font-bold tracking-wider pt-1">
            Laila Collections v.1.0
          </div>
        </div>

      </aside>

      {/* Main Frame content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex h-16 items-center border-b border-slate-200/80 bg-white px-6 md:hidden flex-shrink-0 justify-between">
          <div className="flex items-center">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
            >
              <Menu size={22} />
            </button>
            <span className="ml-3 text-xs font-black tracking-tight text-slate-900">
              laila<span className="text-blue-600 font-extrabold">collections</span>
            </span>
          </div>
          <span className="text-[8px] font-black bg-blue-50 text-blue-600 border border-blue-150 rounded px-2 py-0.5 uppercase tracking-widest">ADMIN</span>
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
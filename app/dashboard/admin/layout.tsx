'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { api } from '@/lib/api'
import NotificationDropdown from '@/app/components/NotificationDropdown'
import ChatWidget from '@/app/components/ChatWidget'

import {
  LayoutDashboard,
  Building2,
  Users,
  Package,
  Barcode as BarcodeIcon,
  Tag,
  UserCheck,
  ShoppingCart,
  Percent,
  Boxes,
  BarChart3,
  Menu,
  X,
  ChevronDown,
  LogOut,
  Printer,
  Coins,
  Star,
  ChevronLeft,
  Loader2,
  Shield,
  KeyRound,
  Settings
} from 'lucide-react'

function AdminLayoutContent({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false) 
  const [user, setUser] = useState<{ name: string; type: string } | null>(null)

  
  const [isLaporanOpen, setIsLaporanOpen] = useState(false)
  const [isInventoriOpen, setIsInventoriOpen] = useState(false)
  const [isPembelianOpen, setIsPembelianOpen] = useState(false)

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
    if (pathname.includes('/reports')) {
      setIsLaporanOpen(true)
    }
    if (pathname.includes('/stock')) {
      setIsInventoriOpen(true)
    }
    if (
      pathname.includes('/suppliers') ||
      pathname.includes('/purchases') ||
      pathname.includes('/expenses') ||
      pathname.includes('/shopping-list')
    ) {
      setIsPembelianOpen(true)
    }
    setIsSidebarOpen(false)
  }, [pathname])

  async function logout() {
    try {
      await api.post('/auth/logout')
    } catch (e) {
      console.error('Gagal memproses logout di server:', e)
    } finally {
      localStorage.clear()
      document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      document.cookie = 'userRole=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      document.cookie = 'user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      window.location.href = '/login'
    }
  }

  
  const getBreadcrumbs = () => {
    const parts = []
    if (pathname === '/dashboard/admin') {
      parts.push('Dashboard')
    } else if (pathname.includes('/reports')) {
      parts.push('Laporan')
      const menuParam = searchParams.get('menu')
      if (menuParam === 'sales-menu') parts.push('Laporan Penjualan')
      else if (menuParam === 'operational-menu') parts.push('Laporan Operasional')
      else if (menuParam === 'profit-menu') parts.push('Laporan Laba & Rugi')
      else parts.push('Laporan Penjualan')
    } else if (pathname.includes('/products')) {
      parts.push('Produk')
      parts.push('Daftar Produk')
    } else if (pathname.includes('/categories')) {
      parts.push('Produk')
      parts.push('Kategori')
    } else if (pathname.includes('/discounts')) {
      parts.push('Produk')
      parts.push('Diskon & Promo')
    } else if (pathname.includes('/barcode')) {
      parts.push('Produk')
      parts.push('Cetak Barcode')
    } else if (pathname.includes('/salaries')) {
      parts.push('Bisnis')
      parts.push('Gaji Staf')
    } else if (pathname.includes('/stock')) {
      parts.push('Inventori')
      parts.push('Kartu Stok')
    } else if (pathname.includes('/suppliers')) {
      parts.push('Pembelian')
      parts.push('Supplier')
    } else if (pathname.includes('/purchases')) {
      parts.push('Pembelian')
      parts.push('Purchase Order')
    } else if (pathname.includes('/shopping-list')) {
      parts.push('Pembelian')
      parts.push('Daftar Belanja')
    } else if (pathname.includes('/expenses')) {
      parts.push('Pembelian')
      parts.push('Daftar Pengeluaran')
    } else if (pathname.includes('/stores')) {
      parts.push('Bisnis')
      parts.push('Outlet')
    } else if (pathname.includes('/cashier')) {
      parts.push('Bisnis')
      parts.push('Karyawan')
    } else if (pathname.includes('/shifts')) {
      parts.push('Bisnis')
      parts.push('Shift Kasir')
    } else if (pathname.includes('/customers')) {
      parts.push('Bisnis')
      parts.push('Pelanggan')
    } else if (pathname.includes('/receipt-design')) {
      parts.push('Bisnis')
      parts.push('Perangkat')
    } else if (pathname.includes('/settings')) {
      parts.push('Bisnis')
      parts.push('Konfigurasi Fitur')
    } else if (pathname.includes('/admins')) {
      parts.push('Bisnis')
      parts.push('Kelola Admin')
    } else {
      parts.push('Backoffice')
    }

    return (
      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
        {parts.map((part, index) => (
          <span key={part} className="flex items-center gap-1.5">
            {index > 0 && <span className="text-[10px] text-slate-300">/</span>}
            <span className={index === parts.length - 1 ? 'text-slate-700 font-bold' : ''}>
              {part}
            </span>
          </span>
        ))}
      </div>
    )
  }

  const isLaporanActive = pathname.includes('/reports')
  const activeMenu = searchParams.get('menu')

  return (
    <div className="flex min-h-screen bg-[#f4f6f9] text-slate-800 antialiased font-sans">
      
      
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      
      <aside className={`fixed inset-y-0 left-0 z-50 flex h-full flex-col bg-[#1a202c] justify-between transition-all duration-300 md:sticky md:top-0 md:h-screen md:translate-x-0 ${
        isSidebarCollapsed ? 'w-20 px-2' : 'w-64 px-4'
      } ${
        isSidebarOpen ? 'translate-x-0 w-64 px-4' : '-translate-x-full'
      } py-5 border-r border-[#262f3f] shadow-xl`}>
        
        <div className="flex flex-col flex-1 overflow-y-auto pr-0.5 scrollbar-thin">
          
          
          <div className={`mb-6 flex items-center justify-between ${isSidebarCollapsed ? 'px-2 justify-center' : 'px-3'}`}>
            <div className="flex items-center gap-2">
              {!isSidebarCollapsed && (
                <div className="flex items-baseline gap-1">
                  <h1 className="text-xl font-light tracking-tight text-sky-400 font-sans">
                    laila<span className="text-sky-400 font-bold">collections</span>
                  </h1>
                </div>
              )}
              {isSidebarCollapsed && (
                <div className="h-8 w-8 rounded-full bg-sky-500 flex items-center justify-center text-white font-extrabold text-sm">
                  L
                </div>
              )}
            </div>
            
            
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="rounded-lg p-1 text-slate-400 hover:bg-[#2b3546] hover:text-white md:hidden"
            >
              <X size={18} />
            </button>
          </div>

          
          <div className="space-y-4">
            
            
            <div>
              <Link
                href="/dashboard/admin"
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-bold transition-all duration-200 ${
                  pathname === '/dashboard/admin'
                    ? 'bg-[#2b3546] text-sky-400 shadow-inner'
                    : 'text-slate-400 hover:bg-[#202836] hover:text-white'
                } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                title="Dashboard"
              >
                <LayoutDashboard size={16} className={pathname === '/dashboard/admin' ? 'text-sky-400' : 'text-slate-400'} />
                {!isSidebarCollapsed && <span>Dashboard</span>}
              </Link>
            </div>

            
            <div className="space-y-1">
              <button
                onClick={() => setIsLaporanOpen(!isLaporanOpen)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-xs font-bold text-slate-400 hover:bg-[#202836] hover:text-white transition-all cursor-pointer ${
                  isLaporanActive ? 'text-white' : ''
                } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                title="Laporan"
              >
                <div className="flex items-center gap-3">
                  <BarChart3 size={16} className={isLaporanActive ? 'text-sky-400' : 'text-slate-400'} />
                  {!isSidebarCollapsed && <span>Laporan</span>}
                </div>
                {!isSidebarCollapsed && (
                  <ChevronDown 
                    size={13} 
                    className={`text-slate-400 transition-transform duration-200 ${isLaporanOpen ? 'rotate-180' : ''}`} 
                  />
                )}
              </button>

              {isLaporanOpen && !isSidebarCollapsed && (
                <div className="space-y-1 pl-4 ml-3 border-l border-slate-700">
                  <Link
                    href="/dashboard/admin/reports?menu=sales-menu"
                    className={`flex items-center gap-3 px-3 py-1.5 text-[11px] font-bold rounded-md transition-all ${
                      isLaporanActive && (activeMenu === 'sales-menu' || !activeMenu)
                        ? 'text-sky-400 font-extrabold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>Laporan Penjualan</span>
                  </Link>
                  <Link
                    href="/dashboard/admin/reports?menu=operational-menu"
                    className={`flex items-center gap-3 px-3 py-1.5 text-[11px] font-bold rounded-md transition-all ${
                      isLaporanActive && activeMenu === 'operational-menu'
                        ? 'text-sky-400 font-extrabold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>Laporan Operasional</span>
                  </Link>
                  <Link
                    href="/dashboard/admin/reports?menu=profit-menu"
                    className={`flex items-center gap-3 px-3 py-1.5 text-[11px] font-bold rounded-md transition-all ${
                      isLaporanActive && activeMenu === 'profit-menu'
                        ? 'text-sky-400 font-extrabold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>Laporan Laba & Rugi</span>
                  </Link>
                </div>
              )}
            </div>

            
            <div>
              {!isSidebarCollapsed ? (
                <div className="mb-2 px-3 text-[9px] font-extrabold uppercase tracking-wider text-slate-500">
                  Produk
                </div>
              ) : (
                <div className="h-px bg-slate-800 my-3" />
              )}
              
              <div className="space-y-1">
                
                <Link
                  href="/dashboard/admin/products"
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-bold transition-all duration-200 ${
                    pathname === '/dashboard/admin/products'
                      ? 'bg-[#2b3546] text-sky-400 shadow-inner'
                      : 'text-slate-400 hover:bg-[#202836] hover:text-white'
                  } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                  title="Daftar Produk"
                >
                  <Package size={16} className={pathname === '/dashboard/admin/products' ? 'text-sky-400' : 'text-slate-400'} />
                  {!isSidebarCollapsed && <span>Daftar Produk</span>}
                </Link>

                
                <Link
                  href="/dashboard/admin/categories"
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-bold transition-all duration-200 ${
                    pathname === '/dashboard/admin/categories'
                      ? 'bg-[#2b3546] text-sky-400 shadow-inner'
                      : 'text-slate-400 hover:bg-[#202836] hover:text-white'
                  } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                  title="Kategori"
                >
                  <Tag size={16} className={pathname === '/dashboard/admin/categories' ? 'text-sky-400' : 'text-slate-400'} />
                  {!isSidebarCollapsed && <span>Kategori</span>}
                </Link>

                
                <Link
                  href="/dashboard/admin/discounts"
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-bold transition-all duration-200 ${
                    pathname === '/dashboard/admin/discounts'
                      ? 'bg-[#2b3546] text-sky-400 shadow-inner'
                      : 'text-slate-400 hover:bg-[#202836] hover:text-white'
                  } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                  title="Diskon & Promo"
                >
                  <Percent size={16} className={pathname === '/dashboard/admin/discounts' ? 'text-sky-400' : 'text-slate-400'} />
                  {!isSidebarCollapsed && <span>Diskon & Promo</span>}
                </Link>

                
                <Link
                  href="/dashboard/admin/barcode"
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-bold transition-all duration-200 ${
                    pathname === '/dashboard/admin/barcode'
                      ? 'bg-[#2b3546] text-sky-400 shadow-inner'
                      : 'text-slate-400 hover:bg-[#202836] hover:text-white'
                  } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                  title="Cetak Barcode"
                >
                  <BarcodeIcon size={16} className={pathname === '/dashboard/admin/barcode' ? 'text-sky-400' : 'text-slate-400'} />
                  {!isSidebarCollapsed && <span>Cetak Barcode</span>}
                </Link>

                
                <div className="space-y-1">
                  <button
                    onClick={() => setIsInventoriOpen(!isInventoriOpen)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-xs font-bold text-slate-400 hover:bg-[#202836] hover:text-white transition-all cursor-pointer ${
                      pathname.includes('/stock') ? 'text-white' : ''
                    } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                    title="Inventori"
                  >
                    <div className="flex items-center gap-3">
                      <Boxes size={16} className={pathname.includes('/stock') ? 'text-sky-400' : 'text-slate-400'} />
                      {!isSidebarCollapsed && <span>Inventori</span>}
                    </div>
                    {!isSidebarCollapsed && (
                      <ChevronDown 
                        size={13} 
                        className={`text-slate-400 transition-transform duration-200 ${isInventoriOpen ? 'rotate-180' : ''}`} 
                      />
                    )}
                  </button>

                  {isInventoriOpen && !isSidebarCollapsed && (
                    <div className="space-y-1 pl-4 ml-3 border-l border-slate-700">
                      <Link
                        href="/dashboard/admin/stock"
                        className={`flex items-center gap-3 px-3 py-1.5 text-[11px] font-bold rounded-md transition-all ${
                          pathname === '/dashboard/admin/stock' && !searchParams.get('type')
                            ? 'text-sky-400 font-extrabold'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <span>Kartu Stok</span>
                      </Link>
                      <Link
                        href="/dashboard/admin/stock?type=IN"
                        className={`flex items-center gap-3 px-3 py-1.5 text-[11px] font-bold rounded-md transition-all ${
                          pathname === '/dashboard/admin/stock' && searchParams.get('type') === 'IN'
                            ? 'text-sky-400 font-extrabold'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <span>Stok Masuk</span>
                      </Link>
                      <Link
                        href="/dashboard/admin/stock?type=OUT"
                        className={`flex items-center gap-3 px-3 py-1.5 text-[11px] font-bold rounded-md transition-all ${
                          pathname === '/dashboard/admin/stock' && searchParams.get('type') === 'OUT'
                            ? 'text-sky-400 font-extrabold'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <span>Stok Keluar</span>
                      </Link>
                      <Link
                        href="/dashboard/admin/stock?type=TRANSFER"
                        className={`flex items-center gap-3 px-3 py-1.5 text-[11px] font-bold rounded-md transition-all ${
                          pathname === '/dashboard/admin/stock' && searchParams.get('type') === 'TRANSFER'
                            ? 'text-sky-400 font-extrabold'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <span>Transfer Stok</span>
                      </Link>
                      <Link
                        href="/dashboard/admin/stock?type=OPNAME"
                        className={`flex items-center gap-3 px-3 py-1.5 text-[11px] font-bold rounded-md transition-all ${
                          pathname === '/dashboard/admin/stock' && searchParams.get('type') === 'OPNAME'
                            ? 'text-sky-400 font-extrabold'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <span>Stok Opname</span>
                      </Link>
                    </div>
                  )}
                </div>

                
                <div className="space-y-1">
                  <button
                    onClick={() => setIsPembelianOpen(!isPembelianOpen)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-xs font-bold text-slate-400 hover:bg-[#202836] hover:text-white transition-all cursor-pointer ${
                      pathname.includes('/suppliers') || pathname.includes('/purchases') || pathname.includes('/expenses')
                        ? 'text-white'
                        : ''
                    } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                    title="Pembelian"
                  >
                    <div className="flex items-center gap-3">
                      <ShoppingCart size={16} className={
                        pathname.includes('/suppliers') || pathname.includes('/purchases') || pathname.includes('/expenses')
                          ? 'text-sky-400'
                          : 'text-slate-400'
                      } />
                      {!isSidebarCollapsed && <span>Pembelian</span>}
                    </div>
                    {!isSidebarCollapsed && (
                      <ChevronDown 
                        size={13} 
                        className={`text-slate-400 transition-transform duration-200 ${isPembelianOpen ? 'rotate-180' : ''}`} 
                      />
                    )}
                  </button>

                  {isPembelianOpen && !isSidebarCollapsed && (
                    <div className="space-y-1 pl-4 ml-3 border-l border-slate-700">
                      <Link
                        href="/dashboard/admin/suppliers"
                        className={`flex items-center gap-3 px-3 py-1.5 text-[11px] font-bold rounded-md transition-all ${
                          pathname === '/dashboard/admin/suppliers'
                            ? 'text-sky-400 font-extrabold'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <span>Supplier</span>
                      </Link>
                      <Link
                        href="/dashboard/admin/purchases"
                        className={`flex items-center gap-3 px-3 py-1.5 text-[11px] font-bold rounded-md transition-all ${
                          pathname === '/dashboard/admin/purchases'
                            ? 'text-sky-400 font-extrabold'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <span>Purchase Order</span>
                      </Link>
                      <Link
                        href="/dashboard/admin/shopping-list"
                        className={`flex items-center gap-3 px-3 py-1.5 text-[11px] font-bold rounded-md transition-all ${
                          pathname === '/dashboard/admin/shopping-list'
                            ? 'text-sky-400 font-extrabold'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <span>Daftar Belanja</span>
                      </Link>
                      <Link
                        href="/dashboard/admin/expenses"
                        className={`flex items-center gap-3 px-3 py-1.5 text-[11px] font-bold rounded-md transition-all ${
                          pathname === '/dashboard/admin/expenses'
                            ? 'text-sky-400 font-extrabold'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <span>Daftar Pengeluaran</span>
                      </Link>
                    </div>
                  )}
                </div>

              </div>
            </div>

            
            <div>
              {!isSidebarCollapsed ? (
                <div className="mb-2 px-3 text-[9px] font-extrabold uppercase tracking-wider text-slate-500">
                  Bisnis
                </div>
              ) : (
                <div className="h-px bg-slate-800 my-3" />
              )}
              
              <div className="space-y-1">
                
                <Link
                  href="/dashboard/admin/stores"
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-bold transition-all duration-200 ${
                    pathname === '/dashboard/admin/stores'
                      ? 'bg-[#2b3546] text-sky-400 shadow-inner'
                      : 'text-slate-400 hover:bg-[#202836] hover:text-white'
                  } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                  title="Outlet"
                >
                  <Building2 size={16} className={pathname === '/dashboard/admin/stores' ? 'text-sky-400' : 'text-slate-400'} />
                  {!isSidebarCollapsed && <span>Outlet</span>}
                </Link>

                
                <Link
                  href="/dashboard/admin/cashier"
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-bold transition-all duration-200 ${
                    pathname === '/dashboard/admin/cashier'
                      ? 'bg-[#2b3546] text-sky-400 shadow-inner'
                      : 'text-slate-400 hover:bg-[#202836] hover:text-white'
                  } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                  title="Karyawan"
                >
                  <Users size={16} className={pathname === '/dashboard/admin/cashier' ? 'text-sky-400' : 'text-slate-400'} />
                  {!isSidebarCollapsed && <span>Karyawan</span>}
                </Link>

                <Link
                  href="/dashboard/admin/shifts"
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-bold transition-all duration-200 ${
                    pathname === '/dashboard/admin/shifts'
                      ? 'bg-[#2b3546] text-sky-400 shadow-inner'
                      : 'text-slate-400 hover:bg-[#202836] hover:text-white'
                  } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                  title="Shift Kasir"
                >
                  <KeyRound size={16} className={pathname === '/dashboard/admin/shifts' ? 'text-sky-400' : 'text-slate-400'} />
                  {!isSidebarCollapsed && <span>Shift Kasir</span>}
                </Link>

                {/* Kelola Admin */}
                <Link
                  href="/dashboard/admin/admins"
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-bold transition-all duration-200 ${
                    pathname === '/dashboard/admin/admins'
                      ? 'bg-[#2b3546] text-sky-400 shadow-inner'
                      : 'text-slate-400 hover:bg-[#202836] hover:text-white'
                  } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                  title="Kelola Admin"
                >
                  <Shield size={16} className={pathname === '/dashboard/admin/admins' ? 'text-sky-400' : 'text-slate-400'} />
                  {!isSidebarCollapsed && <span>Kelola Admin</span>}
                </Link>

                
                <Link
                  href="/dashboard/admin/salaries"
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-bold transition-all duration-200 ${
                    pathname === '/dashboard/admin/salaries'
                      ? 'bg-[#2b3546] text-sky-400 shadow-inner'
                      : 'text-slate-400 hover:bg-[#202836] hover:text-white'
                  } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                  title="Gaji Staf"
                >
                  <Coins size={16} className={pathname === '/dashboard/admin/salaries' ? 'text-sky-400' : 'text-slate-400'} />
                  {!isSidebarCollapsed && <span>Gaji Staf</span>}
                </Link>

                
                <Link
                  href="/dashboard/admin/customers"
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-bold transition-all duration-200 ${
                    pathname === '/dashboard/admin/customers'
                      ? 'bg-[#2b3546] text-sky-400 shadow-inner'
                      : 'text-slate-400 hover:bg-[#202836] hover:text-white'
                  } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                  title="Pelanggan"
                >
                  <UserCheck size={16} className={pathname === '/dashboard/admin/customers' ? 'text-sky-400' : 'text-slate-400'} />
                  {!isSidebarCollapsed && <span>Pelanggan</span>}
                </Link>

                
                <Link
                  href="/dashboard/admin/receipt-design"
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-bold transition-all duration-200 ${
                    pathname === '/dashboard/admin/receipt-design'
                      ? 'bg-[#2b3546] text-sky-400 shadow-inner'
                      : 'text-slate-400 hover:bg-[#202836] hover:text-white'
                  } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                  title="Perangkat"
                >
                  <Printer size={16} className={pathname === '/dashboard/admin/receipt-design' ? 'text-sky-400' : 'text-slate-400'} />
                  {!isSidebarCollapsed && <span>Perangkat</span>}
                </Link>

                <Link
                  href="/dashboard/admin/settings"
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-bold transition-all duration-200 ${
                    pathname === '/dashboard/admin/settings'
                      ? 'bg-[#2b3546] text-sky-400 shadow-inner'
                      : 'text-slate-400 hover:bg-[#202836] hover:text-white'
                  } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                  title="Konfigurasi Fitur"
                >
                  <Settings size={16} className={pathname === '/dashboard/admin/settings' ? 'text-sky-400' : 'text-slate-400'} />
                  {!isSidebarCollapsed && <span>Konfigurasi Fitur</span>}
                </Link>
              </div>
            </div>

          </div>
        </div>

        
        <div className="pt-4 border-t border-slate-700/60 space-y-3 shrink-0">
          {!isSidebarCollapsed && user && (
            <div className="flex items-center gap-3 px-2 py-1">
              <div className="h-9 w-9 rounded-full bg-slate-800 text-sky-400 border border-slate-700 flex items-center justify-center font-black text-xs shrink-0">
                {user.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-extrabold text-slate-100 truncate leading-tight">{user.name}</p>
                <p className="text-[8.5px] font-black uppercase text-slate-400 tracking-wider mt-0.5 leading-none">{user.type}</p>
              </div>
            </div>
          )}
          
          <button
            onClick={logout}
            className={`flex w-full items-center justify-center gap-2 rounded-lg bg-slate-800 border border-slate-700/65 px-3 py-2.5 text-xs font-bold text-slate-300 hover:bg-rose-950/45 hover:text-red-400 hover:border-red-900/50 active:scale-97 transition-all cursor-pointer ${
              isSidebarCollapsed ? 'justify-center' : ''
            }`}
            title="Keluar Sesi"
          >
            <LogOut size={14} className="text-slate-400 hover:text-red-400" />
            {!isSidebarCollapsed && <span>Keluar</span>}
          </button>
          
          {!isSidebarCollapsed && (
            <div className="text-center text-[9px] text-slate-500 font-semibold pt-1">
              +62 888 1500 360 | Cara Pakai
            </div>
          )}
        </div>

      </aside>

      
      <div className="flex-1 flex flex-col min-w-0">
        
        
        <header className="flex h-14 items-center bg-white px-5 border-b border-slate-200/80 justify-between sticky top-0 z-35 shadow-3xs flex-shrink-0">
          
          <div className="flex items-center gap-3">
            
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 md:hidden"
            >
              <Menu size={20} />
            </button>

            
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hidden md:block"
            >
              <ChevronLeft size={18} className={`transition-transform duration-250 ${isSidebarCollapsed ? 'rotate-180' : ''}`} />
            </button>

            
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-amber-50 border border-amber-200/80 rounded-md px-1.5 py-0.5 text-amber-600 font-extrabold text-[10px] uppercase shadow-3xs select-none">
                <Star size={11} className="fill-amber-500 stroke-amber-500" />
                <span>Executive</span>
              </div>
            </div>

            <div className="h-4 w-px bg-slate-200 hidden md:block" />

            
            <div className="hidden sm:block">
              {getBreadcrumbs()}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <NotificationDropdown />

            <div className="h-5 w-px bg-slate-200" />

            <div className="flex items-center gap-2.5">
              <div className="text-right hidden md:block">
                <p className="text-xs font-bold text-slate-900 leading-tight">
                  Hi, {user ? user.name : 'Kasir'}
                </p>
                <p className="text-[9px] text-slate-400 font-semibold leading-none mt-0.5">
                  Laila Collections
                </p>
              </div>
              <div className="h-8 w-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-600">
                {user ? user.name.slice(0, 2).toUpperCase() : 'U'}
              </div>
            </div>
          </div>

        </header>

        
        <main className="flex-1 p-5 md:p-8 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl">
            {children}
          </div>
        </main>
      </div>
      <ChatWidget />
    </div>
  )
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-full items-center justify-center bg-[#f4f6f9]">
        <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
      </div>
    }>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </Suspense>
  )
}

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Wallet,
  Clock3,
  LogOut,
  Menu,
  X,
  Store,
  ArrowLeft,
  UserCheck,
  ChefHat,
  Printer
} from 'lucide-react'
import { api } from '@/lib/api'

const menus = [
  { name: 'Dashboard', path: '/dashboard/store', icon: LayoutDashboard },
  { name: 'Terminal Kasir', path: '/dashboard/store/cashier', icon: Wallet },
  { name: 'Layar Dapur (KDS)', path: '/dashboard/store/kds', icon: ChefHat },
  { name: 'Riwayat Shift', path: '/dashboard/store/shifts', icon: Clock3 },
]

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [storeName, setStoreName] = useState('')
  const [staffName, setStaffName] = useState('Staff Laila')
  const [hasTables, setHasTables] = useState(false)

  useEffect(() => {
    setSidebarOpen(false)

    try {
      const hasCookieToken = document.cookie.split('; ').some((row) => row.startsWith('token='))
      const userToken = localStorage.getItem('token')
      if (!hasCookieToken || !userToken) {
        localStorage.clear()
        document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
        document.cookie = 'userRole=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
        document.cookie = 'user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
        window.location.href = '/login'
        return
      }

      const cachedUser = localStorage.getItem('user')
      let currentStoreId = localStorage.getItem('storeId') || ''

      if (cachedUser) {
        const user = JSON.parse(cachedUser)
        if (user?.name) {
          setStaffName(user.name)
        }
        if (user?.storeId && !currentStoreId) {
          localStorage.setItem('storeId', user.storeId)
          currentStoreId = user.storeId
        }
      }

      if (currentStoreId) {
        api.get(`/stores/${currentStoreId}`, {
          headers: { Authorization: `Bearer ${userToken}` }
        })
        .then((res) => {
          if (res.data?.name) {
            setStoreName(res.data.name)
          }
        })
        .catch((err) => {
          console.error('Gagal mengambil detail nama outlet:', err)
          setStoreName('Outlet Aktif')
        })

        api.get(`/tables/store/${currentStoreId}`, {
          headers: { Authorization: `Bearer ${userToken}` }
        })
        .then((res) => {
          setHasTables(res.data && res.data.length > 0)
        })
        .catch(() => {
          setHasTables(false)
        })
      }
    } catch {
      localStorage.clear()
      document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      document.cookie = 'userRole=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      document.cookie = 'user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      window.location.href = '/login'
    }
  }, [pathname, router])

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


  return (
    <div className="flex h-screen bg-slate-50 antialiased text-slate-800">
      
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-45 bg-slate-950/20 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 h-full w-64 border-r border-slate-200/80 bg-white transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-5 h-full flex flex-col justify-between">
          <div className="space-y-6 flex-1 overflow-y-auto">
            
            <div className="flex items-center justify-between px-1">
              <div className="flex gap-2 items-center">
                <div className="h-5 w-5 rounded bg-indigo-600 shadow-3xs" />
                <span className="font-extrabold text-slate-900 tracking-tight text-sm">
                  laila<span className="text-indigo-600">collections</span>
                </span>
              </div>
              <button className="lg:hidden p-1 text-slate-400 hover:text-slate-900" onClick={() => setSidebarOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <nav className="space-y-1.5">
              {menus
                .filter((m) => m.path !== '/dashboard/store/kds' || hasTables)
                .map((m) => {
                  const Icon = m.icon
                  const isActive = pathname === m.path
                  return (
                    <Link
                      key={m.path}
                      href={m.path}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-3xs scale-[1.01]'
                          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 hover:translate-x-1'
                      }`}
                    >
                      <Icon size={14} />
                      <span>{m.name}</span>
                    </Link>
                  )
                })}
            </nav>

            {/* Store Information */}
            <div className="rounded-2xl border border-slate-200/80 p-4 bg-slate-50/70 shadow-3xs relative overflow-hidden group hover:border-indigo-250 transition-all duration-200">
              <div className="absolute -right-4 -bottom-4 h-12 w-12 rounded-full bg-indigo-500/5 blur-xl group-hover:bg-indigo-500/10 transition-colors" />
              <div className="flex items-center gap-2 text-slate-500">
                <Store size={13} className="text-slate-400 shrink-0" />
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Outlet Terikat</span>
              </div>
              <p className="mt-2 text-xs font-black text-slate-900 leading-normal">
                {storeName || 'Memuat...'}
              </p>
              <div className="text-[10px] font-semibold text-slate-400 mt-0.5">Petugas: {staffName}</div>
            </div>
            
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-3">
            <button
              onClick={logout}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-500 transition-all hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 cursor-pointer active:scale-[0.98]"
            >
              <LogOut size={14} />
              <span>Logout Sesi</span>
            </button>
            <div className="text-center text-[10px] text-slate-400 font-bold tracking-wider">
              Laila Collections v.1.0
            </div>
          </div>
        </div>
      </aside>

      {/* Main Container Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between lg:justify-start flex-shrink-0">
          <div className="flex items-center gap-2">
            <button className="lg:hidden p-1 text-slate-600 rounded-lg hover:bg-slate-100" onClick={() => setSidebarOpen(true)}>
              <Menu size={20} />
            </button>
            <h2 className="text-xs font-black text-slate-900 tracking-tight ml-2 lg:ml-0 uppercase bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200/60">
              {menus.find((x) => x.path === pathname)?.name || 'Panel Toko'}
            </h2>
          </div>
          <span className="text-xs font-extrabold tracking-tight text-slate-900 lg:hidden block">
            laila<span className="text-indigo-600">collections</span>
          </span>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto w-full max-w-5xl">
            {children}
          </div>
        </main>
      </div>

    </div>
  )
}

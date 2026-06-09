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
} from 'lucide-react'
import { api } from '@/lib/api'

const menus = [
  { name: 'Dashboard', path: '/dashboard/store', icon: LayoutDashboard },
  { name: 'Terminal Kasir', path: '/dashboard/store/cashier', icon: Wallet },
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

  useEffect(() => {
    setSidebarOpen(false)

    try {
      const userToken = localStorage.getItem('token')
      if (!userToken) {
        router.replace('/')
        return
      }

      const cachedUser = localStorage.getItem('user')
      let currentStoreId = localStorage.getItem('storeId') || ''

      if (cachedUser) {
        const user = JSON.parse(cachedUser)
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
      }
    } catch {
      router.replace('/')
    }
  }, [pathname, router])

  function logout() {
    localStorage.clear()
    document.cookie = 'token=; Max-Age=0; path=/'
    document.cookie = 'userRole=; Max-Age=0; path=/'
    router.replace('/')
  }

  return (
    <div className="flex h-screen bg-slate-50 antialiased text-slate-800">
      
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/20 backdrop-blur-xs lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 h-full w-64 border-r border-slate-200 bg-white transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-5 h-full flex flex-col justify-between">
          <div className="space-y-6 flex-1 overflow-y-auto">
            
            <div className="flex items-center justify-between px-1">
              <div className="flex gap-2 items-center">
                <div className="h-5 w-5 rounded bg-blue-600 shadow-3xs" />
                <span className="font-bold text-slate-900 tracking-tight">
                  Store<span className="text-blue-600">Flow</span>
                </span>
              </div>
              <button className="lg:hidden p-1 text-slate-400 hover:text-slate-900" onClick={() => setSidebarOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <nav className="space-y-1">
              {menus.map((m) => {
                const Icon = m.icon
                const isActive = pathname === m.path
                return (
                  <Link
                    key={m.path}
                    href={m.path}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-3xs'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Icon size={14} />
                    <span>{m.name}</span>
                  </Link>
                )
              })}
            </nav>

            <div className="rounded-xl border border-slate-200 p-3.5 bg-slate-50">
              <div className="flex items-center gap-2 text-slate-700">
                <Store size={14} className="text-slate-500" />
                <span className="text-xs font-semibold">Outlet Terikat</span>
              </div>
              <p className="mt-1.5 text-xs font-bold text-slate-900 leading-normal">
                {storeName || 'Memuat...'}
              </p>
            </div>
            
          </div>

          <div className="pt-4 border-t border-slate-100">
            <button
              onClick={logout}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600 hover:border-red-200"
            >
              <LogOut size={14} />
              <span>Logout Sesi</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Container Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between lg:justify-start flex-shrink-0">
          <div className="flex items-center gap-2">
            <button className="lg:hidden p-1 text-slate-600 rounded-lg hover:bg-slate-100" onClick={() => setSidebarOpen(true)}>
              <Menu size={20} />
            </button>
            <h2 className="text-sm font-semibold text-slate-900 tracking-tight ml-2 lg:ml-0">
              {menus.find((x) => x.path === pathname)?.name || 'Store Panel'}
            </h2>
          </div>
          <span className="text-sm font-bold tracking-tight text-slate-900 lg:hidden block">
            Store<span className="text-blue-600">Flow</span>
          </span>
        </header>

        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="mx-auto w-full max-w-5xl">
            {children}
          </div>
        </main>
      </div>

    </div>
  )
}
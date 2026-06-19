'use client'

import { useState, useEffect, useRef } from 'react'
import { api } from '@/lib/api'
import { Bell, Check, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'

type Notification = {
  id: string
  title: string
  content: string
  isRead: boolean
  createdAt: string
}

export default function NotificationDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const prevNotifIdsRef = useRef<string[] | null>(null)

  
  const unreadCount = notifications.filter(n => !n.isRead).length

  useEffect(() => {
    fetchNotifications()

    
    const interval = setInterval(fetchNotifications, 15000)
    return () => clearInterval(interval)
  }, [])

  
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function fetchNotifications() {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const headers = { Authorization: `Bearer ${token}` }
      const res = await api.get('/notifications', { headers })
      const data = res.data || []

      
      if (prevNotifIdsRef.current !== null) {
        const newUnread = data.filter((n: Notification) => !n.isRead && !prevNotifIdsRef.current!.includes(n.id))
        
        if (newUnread.length > 0) {
          try {
            const audio = new Audio('/sounds/iphone_notification.mp3')
            audio.play().catch(e => console.log('Audio play blocked (user gesture required):', e))
          } catch (e) {
            console.error('Gagal memutar audio:', e)
          }
        }

        newUnread.forEach((n: Notification) => {
          toast.info(n.title, {
            description: n.content,
            duration: 5000,
          })
        })
      }

      setNotifications(data)
      prevNotifIdsRef.current = data.map((n: Notification) => n.id)
    } catch (err) {
      console.warn('Gagal memuat notifikasi:', err)
    }
  }

  async function handleMarkRead(id: string) {
    try {
      const token = localStorage.getItem('token')
      const headers = { Authorization: `Bearer ${token}` }
      await api.patch(`/notifications/${id}/read`, {}, { headers })
      
      
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
      )
    } catch (err) {
      console.error('Gagal menandai dibaca:', err)
    }
  }

  async function handleMarkAllRead() {
    if (unreadCount === 0) return
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const headers = { Authorization: `Bearer ${token}` }
      await api.patch('/notifications/read-all', {}, { headers })
      
      
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    } catch (err) {
      console.error('Gagal menandai semua dibaca:', err)
    } finally {
      setLoading(false)
    }
  }

  function formatTime(dateStr: string) {
    try {
      const date = new Date(dateStr)
      return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' - ' + date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 relative cursor-pointer transition-all active:scale-95"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 h-4 min-w-4 px-1 flex items-center justify-center bg-rose-500 text-white rounded-full text-[9px] font-black leading-none animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl border border-slate-200 shadow-xl z-55 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          
          
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h4 className="text-xs font-black text-slate-900">Notifikasi Peringatan</h4>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Informasi status & aktivitas sistem</p>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={loading}
                className="text-[10px] font-extrabold text-indigo-600 hover:text-indigo-700 transition-colors flex items-center gap-1 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <Loader2 size={10} className="animate-spin" />
                ) : (
                  <Check size={10} />
                )}
                <span>Baca Semua</span>
              </button>
            )}
          </div>

          
          <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 scrollbar-thin">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <p className="text-xs font-bold">Tidak ada notifikasi baru</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Semua peringatan sistem telah dibaca.</p>
              </div>
            ) : (
              notifications.map(notif => (
                <div
                  key={notif.id}
                  onClick={() => !notif.isRead && handleMarkRead(notif.id)}
                  className={`p-4 transition-colors text-left flex gap-3 items-start cursor-pointer hover:bg-slate-50/60 ${
                    !notif.isRead ? 'bg-slate-50/30' : ''
                  }`}
                >
                  
                  {!notif.isRead && (
                    <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0 mt-1.5" />
                  )}
                  {notif.isRead && (
                    <span className="h-2 w-2 rounded-full bg-transparent shrink-0 mt-1.5" />
                  )}
                  
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className={`text-xs leading-tight truncate ${
                      !notif.isRead ? 'font-extrabold text-slate-900' : 'font-semibold text-slate-550'
                    }`}>
                      {notif.title}
                    </p>
                    <p className="text-[10.5px] text-slate-400 font-semibold leading-relaxed break-words">
                      {notif.content}
                    </p>
                    <p className="text-[9px] text-slate-350 font-mono">
                      {formatTime(notif.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

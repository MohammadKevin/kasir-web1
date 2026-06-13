'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import {
  Clock,
  UserCheck,
  LogIn,
  LogOut,
  Calendar,
  Loader2,
  CheckCircle2,
  FileSpreadsheet
} from 'lucide-react'

type Attendance = {
  id: string
  userId: string
  clockIn: string
  clockOut?: string
  user: {
    name: string
  }
}

export default function AttendancePage() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const [isClockedIn, setIsClockedIn] = useState(false)
  const [activeAttendance, setActiveAttendance] = useState<Attendance | null>(null)
  const [history, setHistory] = useState<Attendance[]>()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setCurrentTime(new Date())
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    if (typeof window !== 'undefined') {
      const cachedCashier = localStorage.getItem('cashier')
      const cachedUser = localStorage.getItem('user')
      if (cachedCashier) {
        const parsed = JSON.parse(cachedCashier)
        setCurrentUser({ ...parsed, isCashier: true })
        checkAttendanceStatus(parsed.id)
      } else if (cachedUser) {
        const parsed = JSON.parse(cachedUser)
        setCurrentUser({ ...parsed, isStoreUser: parsed.type === 'STORE' })
        if (parsed.type === 'STORE') {
          loadHistory()
        } else {
          checkAttendanceStatus(parsed.id)
        }
      }
    }

    return () => clearInterval(timer)
  }, [])

  async function checkAttendanceStatus(userId: string) {
    try {
      const token = localStorage.getItem('token')
      const headers = { Authorization: `Bearer ${token}` }
      const res = await api.get(`/attendance/status/${userId}`, { headers })
      setIsClockedIn(res.data.isClockedIn)
      setActiveAttendance(res.data.attendance)
      loadHistory()
    } catch (error) {
      console.error('Gagal mengecek status absensi:', error)
      setLoading(false)
    }
  }

  async function loadHistory() {
    try {
      const storeId = localStorage.getItem('storeId')
      const token = localStorage.getItem('token')
      const headers = { Authorization: `Bearer ${token}` }
      const res = await api.get(`/attendance/store/${storeId}`, { headers })
      setHistory(res.data || [])
    } catch (error) {
      console.error('Gagal memuat riwayat absensi:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleClockIn() {
    if (!currentUser) return
    setSubmitting(true)
    try {
      const token = localStorage.getItem('token')
      const headers = { Authorization: `Bearer ${token}` }
      const res = await api.post('/attendance/clock-in', { userId: currentUser.id }, { headers })
      setIsClockedIn(true)
      setActiveAttendance(res.data)
      alert('Berhasil Clock-In! Selamat bekerja.')
      loadHistory()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Gagal melakukan Clock-In')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleClockOut() {
    if (!currentUser) return
    setSubmitting(true)
    try {
      const token = localStorage.getItem('token')
      const headers = { Authorization: `Bearer ${token}` }
      await api.post('/attendance/clock-out', { userId: currentUser.id }, { headers })
      setIsClockedIn(false)
      setActiveAttendance(null)
      alert('Berhasil Clock-Out! Terima kasih atas kerja kerasnya.')
      loadHistory()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Gagal melakukan Clock-Out')
    } finally {
      setSubmitting(false)
    }
  }

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return d.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
  }

  const getDuration = (inStr: string, outStr?: string) => {
    const start = new Date(inStr).getTime()
    const end = outStr ? new Date(outStr).getTime() : new Date().getTime()
    const diffMs = end - start
    const diffHrs = Math.floor(diffMs / 3600000)
    const diffMins = Math.floor((diffMs % 3600000) / 60000)
    return `${diffHrs} jam ${diffMins} menit`
  }

  if (loading || !currentTime) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-2">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-xs font-bold text-slate-650">Memuat modul absensi...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 bg-indigo-50 border border-indigo-100/55 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
          <Clock size={20} />
        </div>
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Presensi Kehadiran Karyawan</h1>
          <p className="text-xs font-semibold text-slate-400 mt-0.5">Lakukan pencatatan masuk (clock-in) dan keluar (clock-out) kerja staf kasir secara langsung.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6 items-start">
        {/* Absensi Action Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs space-y-6 text-center relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-indigo-500 to-purple-600"></div>

          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Waktu Presensi Lokal</p>
            <h2 className="text-3xl font-black font-mono text-slate-800 tracking-tight">
              {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </h2>
            <p className="text-xs font-bold text-slate-500 flex items-center justify-center gap-1.5 mt-1">
              <Calendar size={13} className="text-slate-400" />
              <span>{currentTime.toLocaleDateString('id-ID', { dateStyle: 'full' })}</span>
            </p>
          </div>

          <div className="border-t border-b border-slate-100 py-4 space-y-2">
            <div className="text-xs text-slate-450 font-bold">Karyawan Aktif:</div>
            <div className="text-sm font-black text-slate-800">{currentUser?.name || 'Kasir Laila'}</div>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black border ${
              isClockedIn
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isClockedIn ? 'bg-emerald-500 animate-ping' : 'bg-rose-500'}`} />
              <span>{isClockedIn ? 'Sedang Bekerja (Clocked-In)' : 'Di Luar Shift (Clocked-Out)'}</span>
            </span>
          </div>

          {isClockedIn && activeAttendance && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-2 text-xs font-semibold text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-400">Jam Masuk:</span>
                <span className="font-bold text-slate-800">{formatDateTime(activeAttendance.clockIn)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Durasi Shift:</span>
                <span className="font-bold text-slate-800">{getDuration(activeAttendance.clockIn)}</span>
              </div>
            </div>
          )}

          <div className="pt-2">
            {currentUser?.isStoreUser ? (
              <div className="bg-amber-50 border border-amber-250 rounded-2xl p-4 text-left text-xs font-semibold text-amber-700 leading-normal shadow-3xs">
                Menu absensi masuk/keluar hanya berlaku untuk Personel Kasir aktif. Silakan pilih petugas kasir dan masukkan PIN di menu <strong>Terminal Kasir</strong> terlebih dahulu.
              </div>
            ) : isClockedIn ? (
              <button
                onClick={handleClockOut}
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-600 px-5 py-4 text-sm font-black text-white hover:bg-rose-700 transition-all shadow-md shadow-rose-500/10 cursor-pointer active:scale-97 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="animate-spin w-4 h-4" /> : <LogOut size={16} />}
                <span>Clock-Out (Selesai Kerja)</span>
              </button>
            ) : (
              <button
                onClick={handleClockIn}
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-4 text-sm font-black text-white hover:bg-indigo-700 transition-all shadow-md shadow-indigo-500/10 cursor-pointer active:scale-97 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="animate-spin w-4 h-4" /> : <LogIn size={16} />}
                <span>Clock-In (Mulai Kerja)</span>
              </button>
            )}
          </div>
        </div>

        {/* Attendance History */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-xs font-black text-slate-900">Riwayat Kehadiran Cabang</h3>
              <p className="text-[10px] font-semibold text-slate-450 mt-0.5">Catatan presensi masuk dan keluar staf kasir pada outlet ini.</p>
            </div>
            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
              <FileSpreadsheet size={13} />
              <span>{history?.length || 0} Log Kehadiran</span>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider text-[9px]">
                  <th className="px-4 py-3">Nama Staf</th>
                  <th className="px-4 py-3">Waktu Masuk</th>
                  <th className="px-4 py-3">Waktu Keluar</th>
                  <th className="px-4 py-3">Durasi</th>
                  <th className="px-4 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-bold text-slate-800">
                {history?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-400">
                      Belum ada catatan absensi terdaftar.
                    </td>
                  </tr>
                ) : (
                  history?.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-indigo-50 border border-indigo-150 text-indigo-600 flex items-center justify-center text-[10px] font-extrabold shrink-0">
                          {log.user.name.slice(0,2).toUpperCase()}
                        </div>
                        <span>{log.user.name}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-700">{formatDateTime(log.clockIn)}</td>
                      <td className="px-4 py-3 font-mono text-slate-700">{formatDateTime(log.clockOut)}</td>
                      <td className="px-4 py-3 text-slate-500 font-normal">
                        {getDuration(log.clockIn, log.clockOut)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {log.clockOut ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 text-slate-600 px-2 py-0.5 text-[9px] font-black">
                            Selesai
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[9px] font-black border border-emerald-150">
                            Aktif
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

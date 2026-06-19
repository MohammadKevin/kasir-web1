'use client'

import { useState, useEffect, useRef } from 'react'
import { api } from '@/lib/api'
import {
  MessageCircle,
  X,
  ChevronLeft,
  Send,
  Loader2,
  Building2,
  ShieldCheck,
  Trash2
} from 'lucide-react'

type Contact = {
  id: string
  name: string
  type: 'ADMIN' | 'STORE'
}

type Message = {
  id: string
  senderId: string
  senderType: string
  senderName: string
  receiverId: string
  receiverType: string
  content: string
  createdAt: string
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)

  
  const [myUserId, setMyUserId] = useState('')
  const [myUserType, setMyUserType] = useState('')
  const [mySenderName, setMySenderName] = useState('')

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)

  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser)
          setMyUserId(user.id)
          setMyUserType(user.type)
          
          let senderName = user.name
          
          const cachedCashier = localStorage.getItem('cashier')
          if (cachedCashier) {
            const cashierObj = JSON.parse(cachedCashier)
            if (cashierObj?.name) {
              senderName = `${user.name} (${cashierObj.name})`
            }
          }
          setMySenderName(senderName)
        } catch (e) {
          console.error(e)
        }
      }
    }
  }, [isOpen])

  
  useEffect(() => {
    if (isOpen) {
      fetchContacts()
    } else {
      setSelectedContact(null)
      stopPolling()
    }
  }, [isOpen])

  
  useEffect(() => {
    if (selectedContact) {
      fetchMessages(selectedContact)
      startPolling(selectedContact)
    } else {
      stopPolling()
      setMessages([])
    }
  }, [selectedContact])

  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function startPolling(contact: Contact) {
    stopPolling()
    pollingRef.current = setInterval(() => {
      fetchMessages(contact, true)
    }, 3000) 
  }

  function stopPolling() {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }

  async function fetchContacts() {
    setLoadingContacts(true)
    try {
      const token = localStorage.getItem('token')
      const headers = { Authorization: `Bearer ${token}` }
      const res = await api.get('/chat/contacts', { headers })
      setContacts(res.data || [])
    } catch (err) {
      console.warn('Gagal memuat kontak chat:', err)
    } finally {
      setLoadingContacts(false)
    }
  }

  async function fetchMessages(contact: Contact, isSilent = false) {
    if (!isSilent) setLoadingMessages(true)
    try {
      const token = localStorage.getItem('token')
      const headers = { Authorization: `Bearer ${token}` }
      const res = await api.get(`/chat/messages/${contact.id}/${contact.type}`, { headers })
      
      
      if (res.data && res.data.length !== messages.length) {
        if (isSilent && res.data.length > messages.length) {
          const lastMsg = res.data[res.data.length - 1]
          const isFromOther = lastMsg && !(lastMsg.senderId === myUserId && lastMsg.senderType === myUserType)
          if (isFromOther) {
            try {
              const audio = new Audio('/sounds/iphone_notification.mp3')
              audio.play().catch(e => console.log('Audio play blocked (user gesture required):', e))
            } catch (e) {
              console.error(e)
            }
          }
        }
        setMessages(res.data)
      }
    } catch (err) {
      console.warn('Gagal memuat percakapan:', err)
    } finally {
      if (!isSilent) setLoadingMessages(false)
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!inputText.trim() || !selectedContact || sending) return

    setSending(true)
    const content = inputText.trim()
    setInputText('')

    try {
      const token = localStorage.getItem('token')
      const headers = { Authorization: `Bearer ${token}` }
      const payload = {
        receiverId: selectedContact.id,
        receiverType: selectedContact.type,
        content,
        senderName: mySenderName
      }

      const res = await api.post('/chat/send', payload, { headers })
      setMessages(prev => [...prev, res.data])
    } catch (err) {
      console.error('Gagal mengirim pesan:', err)
    } finally {
      setSending(false)
    }
  }

  async function handleDeleteMessage(id: string) {
    if (!confirm('Apakah Anda yakin ingin menghapus pesan ini?')) return

    try {
      const token = localStorage.getItem('token')
      const headers = { Authorization: `Bearer ${token}` }
      await api.delete(`/chat/message/${id}`, { headers })
      setMessages(prev => prev.filter(msg => msg.id !== id))
    } catch (err) {
      console.error('Gagal menghapus pesan:', err)
      alert('Gagal menghapus pesan.')
    }
  }

  function formatTime(dateStr: string) {
    try {
      const date = new Date(dateStr)
      return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    } catch {
      return ''
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-45 font-sans">
      
      
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-xl hover:shadow-2xl cursor-pointer active:scale-95 transition-all animate-bounce duration-1000"
          title="Buka Chat Hubungan"
        >
          <MessageCircle size={24} className="stroke-[2]" />
        </button>
      )}

      
      {isOpen && (
        <div className="w-80 sm:w-96 h-[480px] bg-white rounded-3xl border border-slate-200/90 shadow-2xl overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-5 duration-250">
          
          
          <div className="bg-[#1a202c] text-white p-4 shrink-0 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              {selectedContact ? (
                <>
                  <button
                    onClick={() => setSelectedContact(null)}
                    className="p-1 hover:bg-slate-800 rounded-lg text-slate-350 hover:text-white transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold truncate leading-tight">{selectedContact.name}</h4>
                    <span className="text-[9px] font-bold text-sky-400 uppercase tracking-widest leading-none">
                      {selectedContact.type === 'ADMIN' ? 'Admin Pusat' : 'Store Outlet'}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                    <MessageCircle size={15} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black tracking-tight">Hub Chat Laila</h4>
                    <p className="text-[9px] text-slate-400 font-semibold leading-none mt-0.5">Komunikasi & koordinasi antar role</p>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>

          
          {selectedContact ? (
            <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
              
              <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
                {loadingMessages ? (
                  <div className="h-full flex items-center justify-center">
                    <Loader2 size={20} className="animate-spin text-indigo-600" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                    <MessageCircle size={30} className="stroke-[1.5] text-slate-300 mb-2" />
                    <p className="text-xs font-bold text-slate-500">Mulai Percakapan</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Kirimkan pesan pertama Anda ke {selectedContact.name}.</p>
                  </div>
                ) : (
                  messages.map(msg => {
                    const isMine = msg.senderId === myUserId && msg.senderType === myUserType
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col max-w-[85%] ${
                          isMine ? 'ml-auto items-end' : 'mr-auto items-start'
                        }`}
                      >
                        
                        {!isMine && (
                          <span className="text-[8.5px] font-bold text-slate-400 mb-0.5 px-1 truncate max-w-full">
                            {msg.senderName}
                          </span>
                        )}
                        <div className="flex items-center gap-1.5 group max-w-full">
                          {isMine && (
                            <button
                              onClick={() => handleDeleteMessage(msg.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 cursor-pointer"
                              title="Hapus pesan"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                          <div
                            className={`px-3 py-2 rounded-2xl text-[11.5px] font-semibold break-words leading-relaxed shadow-3xs ${
                              isMine
                                ? 'bg-indigo-600 text-white rounded-tr-none'
                                : 'bg-white text-slate-800 border border-slate-200/70 rounded-tl-none'
                            }`}
                          >
                            {msg.content}
                          </div>
                        </div>
                        <span className="text-[8px] text-slate-350 font-mono mt-0.5 px-1">
                          {formatTime(msg.createdAt)}
                        </span>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              
              <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200/80 shrink-0 flex items-center gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Ketik pesan Anda..."
                  disabled={sending}
                  className="flex-1 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-full text-xs font-semibold outline-none focus:bg-white focus:border-indigo-600 transition-all placeholder:text-slate-400 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || sending}
                  className="h-8 w-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 hover:bg-indigo-700 disabled:opacity-30 disabled:hover:bg-indigo-600 transition-all cursor-pointer"
                >
                  <Send size={13} />
                </button>
              </form>
            </div>
          ) : (
            
            <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin">
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-2 px-1">Daftar Kontak Peran</span>
              
              {loadingContacts ? (
                <div className="py-10 text-center">
                  <Loader2 size={18} className="animate-spin text-indigo-600 mx-auto" />
                </div>
              ) : contacts.length === 0 ? (
                <div className="py-10 text-center text-slate-400">
                  <p className="text-xs font-bold">Tidak ada kontak tersedia</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Role kontak tujuan chat belum terdaftar.</p>
                </div>
              ) : (
                contacts.map(contact => (
                  <button
                    key={contact.id}
                    onClick={() => setSelectedContact(contact)}
                    className="w-full text-left p-3 rounded-2xl border border-slate-200/60 bg-white hover:bg-slate-50/50 hover:border-slate-300 transition-all flex items-center gap-3 shadow-3xs cursor-pointer active:scale-99"
                  >
                    <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${
                      contact.type === 'ADMIN' 
                        ? 'bg-amber-50 border border-amber-100 text-amber-600'
                        : 'bg-sky-50 border border-sky-100 text-sky-600'
                    }`}>
                      {contact.type === 'ADMIN' ? (
                        <ShieldCheck size={16} />
                      ) : (
                        <Building2 size={16} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-extrabold text-slate-800 truncate">{contact.name}</p>
                      <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider block mt-0.5">
                        {contact.type === 'ADMIN' ? 'Pusat' : 'Toko / Cabang'}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

        </div>
      )}

    </div>
  )
}

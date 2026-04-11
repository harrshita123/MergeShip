'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, Loader2, Search, Circle } from 'lucide-react'
import { account, client as appwriteClient } from '@/lib/appwrite'
import { getConversations, getMessages, sendMessage, markAsRead } from './actions'
import Topbar from '@/components/layout/Topbar'

export default function MessagesPage() {
  const [currentUser, setCurrentUser] = useState(null)
  const [conversations, setConversations] = useState([])
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [isMock, setIsMock] = useState(false)
  const messagesEndRef = useRef(null)

  // Get current user
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('mergeship_handle')
          if (stored && mounted) {
            setCurrentUser(stored)
            return
          }
        }
        
        const ids = await account.listIdentities()
        const gh = (ids?.identities || []).find((i) => i.provider === 'github')
        if (gh?.providerUid) {
          const r = await fetch(`https://api.github.com/user/${gh.providerUid}`)
          if (r.ok) {
            const u = await r.json()
            if (mounted) {
              setCurrentUser(u.login)
              localStorage.setItem('mergeship_handle', u.login)
            }
          }
        }
      } catch (e) {
        console.warn('Failed to get user:', e)
      }
    })()
    return () => { mounted = false }
  }, [])

  // Load conversations
  useEffect(() => {
    if (!currentUser) return
    let mounted = true
    ;(async () => {
      setLoading(true)
      try {
        const result = await getConversations(currentUser)
        if (mounted) {
          setConversations(result.conversations || [])
          setIsMock(result.isMock || false)
        }
      } catch (error) {
        console.error('Failed to load conversations:', error)
        if (mounted) {
          setConversations([])
          setIsMock(true)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    })()
    return () => { mounted = false }
  }, [currentUser])

  // Load messages for selected conversation
  useEffect(() => {
    if (!currentUser || !selectedConversation) return
    let mounted = true
    ;(async () => {
      const result = await getMessages(currentUser, selectedConversation.handle)
      if (mounted) {
        setMessages(result.messages || [])
        setIsMock(result.isMock || false)
        // Mark as read
        await markAsRead(selectedConversation.handle, currentUser)
      }
    })()
    return () => { mounted = false }
  }, [currentUser, selectedConversation])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Real-time subscription (Appwrite Realtime)
  useEffect(() => {
    if (!currentUser || !selectedConversation) return

    const DATABASE_ID = '69e12a90002821b7a144'
    const MESSAGES_COLLECTION = 'messages'

    // Subscribe to new messages
    const unsubscribe = appwriteClient.subscribe(
      `databases.${DATABASE_ID}.collections.${MESSAGES_COLLECTION}.documents`,
      (response) => {
        const payload = response.payload
        
        // Check if message is for current conversation
        if (
          (payload.fromHandle === currentUser && payload.toHandle === selectedConversation.handle) ||
          (payload.fromHandle === selectedConversation.handle && payload.toHandle === currentUser)
        ) {
          // Add new message to the list
          setMessages(prev => [...prev, {
            id: payload.$id,
            from: payload.fromHandle,
            to: payload.toHandle,
            content: payload.content,
            timestamp: payload.$createdAt,
            read: payload.read
          }])
        }
      }
    )

    return () => {
      unsubscribe()
    }
  }, [currentUser, selectedConversation])

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedConversation || sending) return

    setSending(true)
    try {
      const result = await sendMessage(currentUser, selectedConversation.handle, newMessage.trim())
      
      if (result.success) {
        // Add message to UI (if not using real-time or mock)
        if (result.isMock) {
          setMessages(prev => [...prev, result.message])
        }
        // Real-time will handle adding it otherwise
        
        setNewMessage('')
      }
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setSending(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <>
      <Topbar
        title="Messages"
        subtitle={isMock ? "Demo mode - Real-time chat coming soon" : "Direct messaging with contributors"}
      />

      <div className="flex h-[calc(100vh-80px)]">
        {/* Sidebar - Conversations List */}
        <div className="w-80 border-r border-white/5 bg-[#0D0D15] flex flex-col">
          {/* Search */}
          <div className="p-4 border-b border-white/5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8B7E9F]" />
              <input
                type="text"
                placeholder="Search conversations..."
                className="w-full pl-10 pr-4 py-2 bg-[#1E1826] border border-white/5 rounded-lg text-[13px] text-white placeholder-[#8B7E9F] focus:outline-none focus:border-[#A78BFA]"
              />
            </div>
          </div>

          {/* Conversations */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-[#A78BFA]" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-[13px] text-[#8B7E9F]">No conversations yet</p>
                <p className="text-[11px] text-[#606080] mt-1">Start chatting with mentors!</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.handle}
                  onClick={() => setSelectedConversation(conv)}
                  className={`w-full p-4 border-b border-white/5 hover:bg-[#1E1826] transition-colors text-left ${
                    selectedConversation?.handle === conv.handle ? 'bg-[#1E1826]' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img
                        src={conv.avatar}
                        alt={conv.handle}
                        className="w-12 h-12 rounded-full"
                      />
                      {conv.unread && (
                        <Circle className="absolute -top-1 -right-1 h-3 w-3 fill-[#4ADE80] text-[#4ADE80]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[14px] font-bold text-[#F8F8FF]">@{conv.handle}</span>
                        <span className="text-[10px] text-[#606080]">
                          {new Date(conv.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className={`text-[12px] truncate ${conv.unread ? 'text-[#F8F8FF] font-medium' : 'text-[#8B7E9F]'}`}>
                        {conv.lastMessage}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col bg-[#060611]">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-white/5 bg-[#0D0D15]">
                <div className="flex items-center gap-3">
                  <img
                    src={selectedConversation.avatar}
                    alt={selectedConversation.handle}
                    className="w-10 h-10 rounded-full"
                  />
                  <div>
                    <div className="text-[14px] font-bold text-[#F8F8FF]">@{selectedConversation.handle}</div>
                    <div className="text-[11px] text-[#8B7E9F]">Active now</div>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => {
                  const isMe = msg.from === currentUser
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-md px-4 py-2 rounded-2xl ${
                        isMe 
                          ? 'bg-[#A78BFA] text-white' 
                          : 'bg-[#1E1826] text-[#F8F8FF]'
                      }`}>
                        <p className="text-[13px]">{msg.content}</p>
                        <p className={`text-[10px] mt-1 ${isMe ? 'text-white/70' : 'text-[#606080]'}`}>
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t border-white/5 bg-[#0D0D15]">
                <div className="flex items-end gap-2">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    rows={1}
                    className="flex-1 px-4 py-3 bg-[#1E1826] border border-white/5 rounded-xl text-[13px] text-white placeholder-[#8B7E9F] focus:outline-none focus:border-[#A78BFA] resize-none"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!newMessage.trim() || sending}
                    className="p-3 bg-[#A78BFA] hover:bg-[#8B5CF6] text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sending ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </button>
                </div>
                <p className="text-[10px] text-[#606080] mt-2">
                  Press Enter to send, Shift+Enter for new line
                </p>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#1E1826] flex items-center justify-center">
                  <Send className="h-8 w-8 text-[#8B7E9F]" />
                </div>
                <p className="text-[14px] text-[#F8F8FF] font-bold mb-1">Select a conversation</p>
                <p className="text-[12px] text-[#8B7E9F]">Choose a conversation from the sidebar to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

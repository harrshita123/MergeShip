'use client'

import { useEffect, useState } from 'react'
import { account, OAuthProvider } from '@/lib/appwrite'
import { Github, LogOut, LogIn, Loader2 } from 'lucide-react'

export default function AuthStatus({ variant = 'primary', redirectPath = '/onboarding' }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const me = await account.get()
        if (mounted) setUser(me)
      } catch (_) {
        if (mounted) setUser(null)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  const login = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    account.createOAuth2Session(
      OAuthProvider.Github,
      `${origin}${redirectPath}`,
      `${origin}/?auth=failed`
    )
  }


  const logout = async () => {
    try {
      await account.deleteSession('current')
    } catch (_) {}
    setUser(null)
    if (typeof window !== 'undefined') window.location.href = '/'
  }

  if (loading) {
    return (
      <div className="inline-flex items-center gap-2 text-[#A0A0C0] text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading…</span>
      </div>
    )
  }

  if (!user) {
    if (variant === 'primary') {
      return (
        <button onClick={login} className="btn-primary">
          <Github className="h-4 w-4" />
          Start Your Journey
        </button>
      )
    }
    return (
      <button onClick={login} className="btn-secondary">
        <LogIn className="h-4 w-4" />
        Sign in with GitHub
      </button>
    )
  }

  const initials = (user?.name || user?.email || 'U').slice(0, 1).toUpperCase()

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#06B6D4] flex items-center justify-center text-white font-bold text-sm">
          {initials}
        </div>
        <span className="text-sm text-[#F8F8FF] hidden sm:inline">
          {user?.name || user?.email}
        </span>
      </div>
      <button
        onClick={logout}
        className="text-[#A0A0C0] hover:text-[#F8F8FF] flex items-center gap-1 text-sm"
      >
        <LogOut className="h-4 w-4" />
        Logout
      </button>
    </div>
  )
}

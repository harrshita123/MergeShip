'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { GitMerge, Settings, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { account } from '@/lib/appwrite'

/**
 * BaseSidebar
 *
 * Props:
 *   navItems: [{ label, icon: LucideComponent, href }]
 *   currentPath: string
 *   mode: 'contributor' | 'maintainer'
 *   accentColor: hex string (ring / highlight)
 */
export default function BaseSidebar({
  navItems = [],
  currentPath = '/',
  mode = 'contributor',
  accentColor = '#D8B4FE',
}) {
  const router = useRouter()

  const handleLogout = async () => {
    try {
      // Delete ALL Appwrite sessions (including OAuth)
      try {
        const sessions = await account.listSessions()
        // Delete all sessions to ensure OAuth is fully cleared
        for (const session of sessions.sessions) {
          await account.deleteSession(session.$id)
        }
      } catch (e) {
        // Fallback: delete current session only
        await account.deleteSession('current')
      }
      
      // Clear all localStorage
      if (typeof window !== 'undefined') {
        localStorage.clear()
      }
      
      // Clear sessionStorage
      if (typeof window !== 'undefined') {
        sessionStorage.clear()
      }
      
      // Clear all cookies
      if (typeof document !== 'undefined') {
        document.cookie.split(";").forEach((c) => {
          document.cookie = c
            .replace(/^ +/, "")
            .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        })
      }
      
      // Redirect to landing page with force refresh
      if (typeof window !== 'undefined') {
        window.location.href = '/'
      }
    } catch (error) {
      console.error('Logout failed:', error)
      // Force logout even if API fails
      if (typeof window !== 'undefined') {
        localStorage.clear()
        sessionStorage.clear()
        window.location.href = '/'
      }
    }
  }

  const handleSettings = () => {
    // Navigate to settings page (to be implemented)
    router.push('/settings')
  }

  return (
    <aside
      className="fixed left-0 top-0 h-screen w-64 bg-[#0D0D15] border-r border-[rgba(255,255,255,0.05)] flex flex-col z-40"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 h-16 border-b border-[rgba(255,255,255,0.05)]">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: accentColor }}
        >
          <GitMerge className="h-5 w-5 text-[#0D0D15]" strokeWidth={2.5} />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="font-bold text-[#F8F8FF] text-[15px] tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
            MergeShip
          </span>
          <span
            className="text-[10px] uppercase tracking-[0.15em] font-semibold"
            style={{ color: accentColor, opacity: 0.75 }}
          >
            {mode}
          </span>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive =
            currentPath === item.href ||
            (item.href !== '/' && currentPath?.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 rounded-lg text-[14px] transition-colors',
                'text-[#A0A0C0] hover:text-[#F8F8FF] hover:bg-[rgba(255,255,255,0.03)]',
                isActive && 'nav-active font-semibold'
              )}
            >
              {Icon ? <Icon className="h-[18px] w-[18px]" /> : null}
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer - Settings + Logout with working handlers */}
      <div className="px-3 py-4 border-t border-[rgba(255,255,255,0.05)]">
        <div className="flex items-center justify-between px-2">
          <button 
            onClick={handleSettings}
            className="flex items-center gap-2 text-[13px] text-[#A0A0C0] hover:text-[#F8F8FF] transition-colors cursor-pointer"
          >
            <Settings className="h-4 w-4" />
            Settings
          </button>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-[13px] text-[#A0A0C0] hover:text-[#EF4444] transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </div>
    </aside>
  )
}

'use client'

import { useEffect, useState, useCallback } from 'react'
import { Loader2, Github } from 'lucide-react'
import { account } from '@/lib/appwrite'
import DashboardHeader from '@/components/dashboard/DashboardHeader'
import StatSection from '@/components/dashboard/StatSection'
import IssueFeed from '@/components/dashboard/IssueFeed'
import ContributionHeatmap from '@/components/dashboard/ContributionHeatmap'
import SidebarWidgets from '@/components/dashboard/SidebarWidgets'

export default function DashboardPage() {
  const [handle, setHandle] = useState(null)
  const [resolving, setResolving] = useState(true)
  const [forceSync, setForceSync] = useState(0) // bumping this re-fetches children
  const [userMeta, setUserMeta] = useState({ name: null, level: 'L1 Beginner' })
  const [promptInput, setPromptInput] = useState('')

  /* ---------- Resolve GitHub handle ---------- */
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search)
          const qp = params.get('handle') || params.get('demo')
          if (qp) {
            localStorage.setItem('mergeship_handle', qp)
            if (alive) { setHandle(qp); setResolving(false) }
            return
          }
          const stored = localStorage.getItem('mergeship_handle')
          if (stored) {
            if (alive) { setHandle(stored); setResolving(false) }
            return
          }
        }
        // Try Appwrite identities
        const identities = await account.listIdentities()
        const gh = (identities?.identities || []).find((i) => i.provider === 'github')
        if (gh?.providerUid) {
          const ghUserRes = await fetch(`https://api.github.com/user/${gh.providerUid}`)
          if (ghUserRes.ok) {
            const ghUser = await ghUserRes.json()
            if (ghUser.login) {
              localStorage.setItem('mergeship_handle', ghUser.login)
              if (alive) { setHandle(ghUser.login); setResolving(false) }
              return
            }
          }
        }
        if (alive) setResolving(false)
      } catch (e) {
        if (alive) setResolving(false)
      }
    })()
    return () => { alive = false }
  }, [])

  const handleSync = useCallback(() => {
    setForceSync((n) => n + 1)
  }, [])

  const onStatsLoaded = useCallback((s) => {
    if (s) setUserMeta({ name: s.name, level: s.level })
  }, [])

  const submitHandle = (e) => {
    e.preventDefault()
    const v = promptInput.trim().replace(/^@/, '')
    if (!v) return
    localStorage.setItem('mergeship_handle', v)
    setHandle(v)
  }

  if (resolving) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-[#A0A0C0]">
          <Loader2 className="h-5 w-5 animate-spin text-[#D8B4FE]" />
          <span>Resolving your GitHub identity…</span>
        </div>
      </div>
    )
  }

  if (!handle) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <form
          onSubmit={submitHandle}
          className="w-full max-w-md bg-[#1E1826] border border-white/5 rounded-2xl p-8 text-center"
        >
          <div className="w-12 h-12 mx-auto rounded-xl bg-[#D8B4FE]/20 border border-[#D8B4FE]/40 flex items-center justify-center mb-4">
            <Github className="h-5 w-5 text-[#D8B4FE]" />
          </div>
          <h2 className="text-xl font-extrabold mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Pick a GitHub handle to explore
          </h2>
          <p className="text-[13px] text-[#8B7E9F] mb-6">
            Try any public username (e.g. <span className="text-[#D8B4FE]">torvalds</span>,{' '}
            <span className="text-[#D8B4FE]">gaearon</span>,{' '}
            <span className="text-[#D8B4FE]">sindresorhus</span>).
          </p>
          <input
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            placeholder="github username"
            className="w-full bg-[#15111A] border border-white/10 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#D8B4FE]/40 mb-4"
          />
          <button type="submit" className="btn-primary w-full justify-center">
            Load Dashboard
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-10 md:py-14">
        <DashboardHeader
          name={userMeta.name}
          handle={handle}
          onSync={handleSync}
          isSyncing={false}
        />

        <div className="mb-10">
          <StatSection
            handle={handle}
            forceSync={forceSync > 0}
            onLoaded={onStatsLoaded}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
          <div className="space-y-6 min-w-0">
            <IssueFeed handle={handle} userLevel={userMeta.level} forceSync={forceSync > 0} />
            <ContributionHeatmap handle={handle} forceSync={forceSync > 0} />
          </div>
          <SidebarWidgets handle={handle} />
        </div>

        <footer className="mt-20 pt-8 border-t border-white/5 text-center text-[11px] text-[#606080] tracking-widest uppercase">
          © {new Date().getFullYear()} MergeShip ·· Build together, level up faster.
        </footer>
      </div>
    </div>
  )
}

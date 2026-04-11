'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Loader2, Github, ChevronDown } from 'lucide-react'
import { account } from '@/lib/appwrite'
import { getMaintainerDashboardData } from './actions'
import Topbar from '@/components/layout/Topbar'
import KpiBanner from '@/components/dashboard/maintainer/KpiBanner'
import PriorityQueue from '@/components/dashboard/maintainer/PriorityQueue'
import OpenPRs from '@/components/dashboard/maintainer/OpenPRs'
import StaleIssues from '@/components/dashboard/maintainer/StaleIssues'
import { RepoHealthMini, TeamSnapshot, ActivityFeed } from '@/components/dashboard/maintainer/SidebarWidgets'

const TABS = [
  { key: 'priority', label: 'Priority Queue' },
  { key: 'prs', label: 'Open PRs' },
]

export default function MaintainerDashboardPage() {
  const router = useRouter()
  const [handle, setHandle] = useState(null)
  const [resolving, setResolving] = useState(true)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [activeTab, setActiveTab] = useState('priority')
  const [selectedRepo, setSelectedRepo] = useState('all')
  const [repoDropdown, setRepoDropdown] = useState(false)

  /* ---- Resolve handle ---- */
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        if (typeof window !== 'undefined') {
          const qp = new URLSearchParams(window.location.search).get('handle')
          if (qp) {
            localStorage.setItem('mergeship_handle', qp)
            if (alive) { setHandle(qp); setResolving(false); return }
          }
          const stored = localStorage.getItem('mergeship_handle')
          if (stored) { if (alive) { setHandle(stored); setResolving(false); return } }
        }
        const ids = await account.listIdentities()
        const gh = (ids?.identities || []).find((i) => i.provider === 'github')
        if (gh?.providerUid) {
          const r = await fetch(`https://api.github.com/user/${gh.providerUid}`)
          if (r.ok) {
            const u = await r.json()
            if (u.login) {
              localStorage.setItem('mergeship_handle', u.login)
              if (alive) { setHandle(u.login); setResolving(false); return }
            }
          }
        }
      } catch {}
      if (alive) setResolving(false)
    })()
    return () => { alive = false }
  }, [])

  /* ---- Load dashboard data ---- */
  useEffect(() => {
    if (!handle) return
    let alive = true
    setLoading(true)
    ;(async () => {
      const result = await getMaintainerDashboardData(handle)
      if (!alive) return
      if (result.success) {
        setData(result)
      }
      setLoading(false)
    })()
    return () => { alive = false }
  }, [handle])

  const filteredUrgent = selectedRepo === 'all'
    ? data?.urgentIssues || []
    : (data?.urgentIssues || []).filter(i => i.repo === selectedRepo)

  const filteredPRs = selectedRepo === 'all'
    ? data?.openPRs || []
    : (data?.openPRs || []).filter(i => i.repo === selectedRepo)

  if (resolving) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-[#A0A0C0]">
          <Loader2 className="h-5 w-5 animate-spin text-[#06B6D4]" />
          <span>Resolving your GitHub identity…</span>
        </div>
      </div>
    )
  }

  if (!handle) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center bg-[#1E1826] border border-white/5 rounded-2xl p-10 max-w-md">
          <Github className="h-8 w-8 mx-auto text-[#06B6D4] mb-3" />
          <h2 className="text-lg font-extrabold mb-2">No GitHub handle found</h2>
          <p className="text-[13px] text-[#8B7E9F] mb-5">Head to the dashboard first to connect your profile.</p>
          <button onClick={() => router.push('/dashboard')} className="btn-primary">Go to Dashboard</button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <>
        <Topbar title="Maintainer Command Center" subtitle="Manage your repositories and team" />
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-10">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#06B6D4]" />
          </div>
        </div>
      </>
    )
  }

  if (!data || !data.success) {
    return (
      <>
        <Topbar title="Maintainer Command Center" subtitle="Manage your repositories and team" />
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-10">
          <div className="text-center py-20">
            <p className="text-[#8B7E9F]">Unable to load dashboard data. Please try again.</p>
          </div>
        </div>
      </>
    )
  }

  const repoOptions = [
    { label: 'All Repositories', value: 'all' },
    ...(data.allRepoNames || []),
  ]

  return (
    <>
      <Topbar
        title="Maintainer Command Center"
        subtitle={`Managing ${data.mainRepo || 'repositories'}`}
      />

      <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-10">
        <KpiBanner stats={data.stats} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2">
            {/* Tab switcher + Repo filter */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              {/* Tabs */}
              <div className="flex items-center gap-2 bg-[#1E1826] border border-white/5 rounded-xl p-1">
                {TABS.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className="relative px-4 py-2 rounded-lg text-[13px] font-bold transition-colors"
                  >
                    {activeTab === tab.key && (
                      <motion.div
                        layoutId="maintainer-tab"
                        className="absolute inset-0 bg-[#06B6D4] rounded-lg"
                        style={{ boxShadow: '0 0 20px rgba(6,182,212,0.4)' }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      />
                    )}
                    <span className={`relative z-10 ${activeTab === tab.key ? 'text-white' : 'text-[#8B7E9F]'}`}>
                      {tab.label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Repo filter */}
              <div className="relative">
                <button
                  onClick={() => setRepoDropdown(o => !o)}
                  className="flex items-center gap-2 bg-[#1E1826] border border-white/5 rounded-lg px-3 py-2 text-[13px] hover:border-white/15 transition-colors min-w-[240px] max-w-[320px]"
                >
                  <span className="truncate flex-1 text-left">
                    {repoOptions.find(r => r.value === selectedRepo)?.label || 'All Repositories'}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-[#8B7E9F]" />
                </button>
                {repoDropdown && (
                  <div className="absolute right-0 mt-2 w-[340px] bg-[#15111A] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-20 max-h-[320px] overflow-y-auto">
                    {repoOptions.map((repo) => (
                      <button
                        key={repo.value}
                        onClick={() => { setSelectedRepo(repo.value); setRepoDropdown(false) }}
                        className="w-full text-left px-3 py-2 hover:bg-white/5 text-[13px] truncate"
                      >
                        {repo.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Tab content */}
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'priority' ? (
                <PriorityQueue issues={filteredUrgent} />
              ) : (
                <OpenPRs prs={filteredPRs} />
              )}
            </motion.div>

            {/* Stale issues */}
            <StaleIssues issues={data.staleIssues || []} todayStats={data.stats} />
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <RepoHealthMini repos={[{ name: data.mainRepo, health: data.repoHealth }]} />
            <TeamSnapshot members={data.teamMembers || []} />
            <ActivityFeed events={data.activityFeed || []} />
          </div>
        </div>
      </div>
    </>
  )
}

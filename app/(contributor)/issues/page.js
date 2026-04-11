'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  ChevronDown,
  ShieldCheck,
  Zap,
  Clock,
  Tag,
  BookmarkCheck,
  Bookmark,
  Sparkles,
  Loader2,
  ExternalLink,
  Github,
  Lock,
} from 'lucide-react'
import { account } from '@/lib/appwrite'
import {
  getContributorContext,
  getDashboardData,
} from '@/app/(contributor)/dashboard/actions'
import { getAnalyzedIssuesLive } from '@/app/(contributor)/issues/actions'
import Topbar from '@/components/layout/Topbar'
import LevelBadge, { LevelProgress } from '@/components/dashboard/LevelBadge'
import { getUserLevelInfo } from '@/lib/levels'

const TIER_BUCKETS = [
  { key: 'EASY',   label: 'Easy Pickings',    color: '#4ADE80', glow: 'rgba(74,222,128,0.4)' },
  { key: 'MEDIUM', label: 'Standard Quests',  color: '#FACC15', glow: 'rgba(250,204,21,0.4)' },
  { key: 'HARD',   label: 'Elite Challenges', color: '#EF4444', glow: 'rgba(239,68,68,0.4)' },
]

const FILTERS = [
  { key: 'ALL',    label: 'All Issues' },
  { key: 'EASY',   label: 'Easy' },
  { key: 'MEDIUM', label: 'Medium' },
  { key: 'HARD',   label: 'Hard' },
]

export default function IssuesExplorerPage() {
  const router = useRouter()
  const [handle, setHandle] = useState(null)
  const [resolving, setResolving] = useState(true)
  const [filter, setFilter] = useState('ALL')
  const [repos, setRepos] = useState([])
  const [repo, setRepo] = useState('')
  const [issues, setIssues] = useState([])
  const [allIssues, setAllIssues] = useState([])
  const [lockedDifficulties, setLockedDifficulties] = useState([])
  const [loading, setLoading] = useState(false)
  const [classifying, setClassifying] = useState(false)
  const [error, setError] = useState(null)
  const [fromCache, setFromCache] = useState(false)
  const [bookmarks, setBookmarks] = useState(new Set())
  const [dropOpen, setDropOpen] = useState(false)
  const [repoFilter, setRepoFilter] = useState('')
  const [userLevel, setUserLevel] = useState(1)
  const [levelInfo, setLevelInfo] = useState(null)

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
          const saved = localStorage.getItem('mergeship_bookmarks')
          if (saved) {
            try { setBookmarks(new Set(JSON.parse(saved))) } catch {}
          }
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

  /* ---- Load repos and user level ---- */
  useEffect(() => {
    if (!handle) return
    let alive = true
    ;(async () => {
      const [reposData, dashData] = await Promise.all([
        getContributorContext(handle),
        getDashboardData(handle),
      ])
      if (!alive) return
      setRepos(reposData.repos || [])
      const pick = (reposData.repos || []).find((x) => x.openIssues > 0) || reposData.repos?.[0]
      setRepo(pick?.value || 'vercel/next.js')
      
      // Set user level
      if (dashData.success && dashData.stats) {
        const level = dashData.stats.userLevel || 1
        setUserLevel(level)
        const info = getUserLevelInfo(dashData.stats)
        setLevelInfo(info)
      }
    })()
    return () => { alive = false }
  }, [handle])

  /* ---- Load issues ---- */
  useEffect(() => {
    if (!repo) return
    let alive = true
    setLoading(true)
    setClassifying(true)
    setError(null)
    setFromCache(false)
    ;(async () => {
      const r = await getAnalyzedIssuesLive(repo, userLevel)
      if (!alive) return
      
      if (!r.success) {
        setError(r.message || 'Failed to fetch issues')
        setIssues([])
        setAllIssues([])
        setLoading(false)
        setClassifying(false)
        return
      }
      
      // Use grouped data for tier display
      const allClassified = [
        ...(r.grouped?.easy || []),
        ...(r.grouped?.medium || []),
        ...(r.grouped?.hard || [])
      ]
      
      setIssues(r.issues || [])
      setAllIssues(allClassified)
      setLockedDifficulties(r.lockedDifficulties || [])
      setFromCache(r.fromCache || false)
      setLoading(false)
      setClassifying(false)
    })()
    return () => { alive = false }
  }, [repo, userLevel])

  const toggleBookmark = useCallback((id) => {
    setBookmarks((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      try { localStorage.setItem('mergeship_bookmarks', JSON.stringify([...next])) } catch {}
      return next
    })
  }, [])

  const filteredIssues = useMemo(() => {
    if (filter === 'ALL') return issues
    return issues.filter((i) => i.difficulty === filter)
  }, [issues, filter])

  const grouped = useMemo(() => {
    const g = { EASY: [], MEDIUM: [], HARD: [] }
    // Use allIssues to show locked ones too
    allIssues.forEach((i) => g[i.difficulty]?.push(i))
    return g
  }, [allIssues])

  const reposFiltered = useMemo(() => {
    if (!repoFilter) return repos.slice(0, 30)
    const q = repoFilter.toLowerCase()
    return repos.filter((r) => r.label.toLowerCase().includes(q)).slice(0, 30)
  }, [repos, repoFilter])

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
        <div className="text-center bg-[#1E1826] border border-white/5 rounded-2xl p-10 max-w-md">
          <Github className="h-8 w-8 mx-auto text-[#D8B4FE] mb-3" />
          <h2 className="text-lg font-extrabold mb-2">No GitHub handle found</h2>
          <p className="text-[13px] text-[#8B7E9F] mb-5">Head to the dashboard first to connect your profile.</p>
          <button onClick={() => router.push('/dashboard')} className="btn-primary">Go to Dashboard</button>
        </div>
      </div>
    )
  }

  return (
    <>
      <Topbar
        title="Explore Credible Issues"
        subtitle="Your personalized feed is strictly filtered to repositories within your active GitHub network."
      />

      <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-10">
        <TrustBanner />

        {/* Level Header */}
        {levelInfo && (
          <div className="mb-8 bg-[#1E1826] border border-white/5 rounded-2xl p-6">
            <LevelProgress levelInfo={levelInfo} />
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div className="flex items-center gap-2 flex-wrap">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-4 py-2 rounded-full text-[12px] font-bold tracking-wide transition-all ${
                  filter === f.key
                    ? 'bg-[#D8B4FE] text-[#15111A]'
                    : 'bg-[#1E1826] border border-white/5 text-[#A0A0C0] hover:border-white/15'
                }`}
              >
                {f.label}
              </button>
            ))}
            <span className="ml-3 text-[11px] text-[#606080] uppercase tracking-widest font-bold">
              {filteredIssues.length} issue{filteredIssues.length === 1 ? '' : 's'}
            </span>
          </div>

          <RepoPicker
            repo={repo}
            open={dropOpen}
            setOpen={setDropOpen}
            filter={repoFilter}
            setFilter={setRepoFilter}
            items={reposFiltered}
            onSelect={(v) => { setRepo(v); setDropOpen(false); setRepoFilter('') }}
          />
        </div>

        {/* Loading/Classifying Banner */}
        {classifying && (
          <div className="bg-[#1E1826] border border-[#A78BFA]/30 rounded-xl p-5 mb-6 flex items-center gap-4">
            <Loader2 className="h-5 w-5 animate-spin text-[#A78BFA]" />
            <div>
              <div className="text-[13px] font-bold text-[#F8F8FF]">
                🤖 AI is analyzing issues...
              </div>
              <div className="text-[11px] text-[#8B7E9F] mt-0.5">
                Fetching from GitHub and classifying with Groq AI
              </div>
            </div>
          </div>
        )}

        {/* Cache indicator */}
        {fromCache && !classifying && (
          <div className="bg-[#1E1826] border border-white/5 rounded-lg p-3 mb-4 text-[11px] text-[#8B7E9F] flex items-center gap-2">
            <Clock className="h-3 w-3" />
            Cached results (refreshes every 5 minutes)
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-xl p-5 mb-6">
            <div className="text-[13px] font-bold text-[#EF4444] mb-1">
              Failed to fetch issues
            </div>
            <div className="text-[11px] text-[#F8F8FF]/70">
              {error}
            </div>
          </div>
        )}

        {loading && issues.length === 0 ? (
          <SkeletonTiers />
        ) : (
          <div className="space-y-10">
            {TIER_BUCKETS.map((b) => {
              const items = grouped[b.key] || []
              const isLocked = lockedDifficulties.includes(b.key)
              if (filter !== 'ALL' && filter !== b.key) return null
              return (
                <div key={b.key}>
                  <TierHeader bucket={b} count={items.length} isLocked={isLocked} />
                  {items.length === 0 ? (
                    <div className="text-[13px] text-[#606080] bg-[#1E1826] border border-white/5 rounded-xl p-6 text-center">
                      No issues in this tier right now. Try another repo.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {items.map((issue) => (
                        <IssueCard
                          key={issue.id}
                          issue={issue}
                          bucket={b}
                          bookmarked={bookmarks.has(issue.id)}
                          onBookmark={toggleBookmark}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}

/* ------------ Small pieces ------------ */
function TrustBanner() {
  return (
    <div className="bg-[#1E1826] border border-white/5 rounded-2xl p-5 mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-[#4ADE80]/15 border border-[#4ADE80]/35 flex items-center justify-center">
          <ShieldCheck className="h-5 w-5 text-[#4ADE80]" />
        </div>
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#4ADE80] mb-0.5">
            Trust Filter Active
          </div>
          <div className="text-[14px] text-[#F8F8FF]">
            We do not suggest random repositories — only ones in your real GitHub network.
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <span className="text-[10px] px-3 py-1.5 rounded-full font-bold tracking-widest uppercase bg-[#4ADE80]/15 text-[#4ADE80] border border-[#4ADE80]/30">
          Personal Projects
        </span>
        <span className="text-[10px] px-3 py-1.5 rounded-full font-bold tracking-widest uppercase bg-[#D8B4FE]/15 text-[#D8B4FE] border border-[#D8B4FE]/30">
          Owned by You
        </span>
      </div>
    </div>
  )
}

function TierHeader({ bucket, count, isLocked }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span
        className="inline-block w-2 h-2 rounded-full"
        style={{ background: bucket.color, boxShadow: `0 0 8px ${bucket.glow}` }}
      />
      <span className="text-[10px] font-black uppercase tracking-[0.22em]">
        {bucket.label}
      </span>
      {isLocked && <Lock className="h-3 w-3 text-[#8B7E9F]" />}
      <span className="text-[10px] text-[#606080]">· {count} match{count === 1 ? '' : 'es'}</span>
      <span className="flex-1 ml-3 h-px bg-gradient-to-r from-white/10 to-transparent" />
    </div>
  )
}

function IssueCard({ issue, bucket, bookmarked, onBookmark }) {
  const owner = issue.repo.split('/')[0] || 'org'
  const difficultyClass =
    issue.difficulty === 'EASY' ? 'badge-easy' :
    issue.difficulty === 'HARD' ? 'badge-hard' : 'badge-medium'
  
  const isLocked = issue.locked
  
  return (
    <div className="group relative bg-[#1E1826] border border-white/5 hover:border-[#D8B4FE]/30 rounded-2xl p-5 transition-all hover:-translate-y-0.5 flex flex-col">
      {/* Locked Overlay */}
      {isLocked && (
        <div className="absolute inset-0 bg-black/60 rounded-2xl flex flex-col items-center justify-center z-10 backdrop-blur-[2px]">
          <Lock className="h-8 w-8 text-[#8B7E9F] mb-2" />
          <span className="text-[11px] font-bold text-[#8B7E9F]">
            Reach Level {issue.difficulty === 'HARD' ? '3' : '2'} to unlock
          </span>
        </div>
      )}
      
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (!isLocked) onBookmark(issue.id) }}
        className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-white/5 hover:bg-[#D8B4FE]/15 flex items-center justify-center transition-colors"
        aria-label="Bookmark issue"
        disabled={isLocked}
      >
        {bookmarked ? (
          <BookmarkCheck className="h-4 w-4 text-[#D8B4FE]" />
        ) : (
          <Bookmark className="h-4 w-4 text-[#8B7E9F] group-hover:text-[#D8B4FE]" />
        )}
      </button>

      <div className="flex items-center gap-2 mb-3 pr-10">
        <img
          src={`https://github.com/${owner}.png?size=32`}
          alt=""
          className="w-6 h-6 rounded"
          onError={(e) => { e.currentTarget.style.visibility = 'hidden' }}
        />
        <span className="text-[11px] text-[#8B7E9F] truncate">{issue.repo} · #{issue.number}</span>
      </div>

      <a
        href={issue.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 block"
      >
        <h3 className="text-[14px] font-bold text-[#F8F8FF] leading-snug mb-3 line-clamp-2">
          {issue.title}
        </h3>

        {issue.highlight && (
          <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-[#67E8F9] bg-[#67E8F9]/10 border border-[#67E8F9]/25 px-2 py-1 rounded-full mb-3">
            <Sparkles className="h-2.5 w-2.5" /> {issue.highlight}
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap mb-4">
          <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${difficultyClass}`}>
            {issue.difficulty}
          </span>
          {(issue.labels || []).slice(0, 2).map((l) => (
            <span
              key={l}
              className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-[#8B7E9F]"
            >
              <Tag className="h-2.5 w-2.5" /> {l}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-white/5">
          <div className="flex items-center gap-3 text-[11px] text-[#8B7E9F]">
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {issue.time}</span>
            <span className="flex items-center gap-1 font-bold text-[#D8B4FE]"><Zap className="h-3 w-3" /> {issue.xp} XP</span>
          </div>
          <ExternalLink className="h-3.5 w-3.5 text-[#606080] group-hover:text-[#D8B4FE] transition-colors" />
        </div>
      </a>
    </div>
  )
}

function RepoPicker({ repo, open, setOpen, filter, setFilter, items, onSelect }) {
  // Group items by category
  const grouped = items.reduce((acc, item) => {
    const cat = item.category || 'Other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})

  const categories = ['Your Repos', 'Contributed To', 'Starred'].filter(c => grouped[c]?.length > 0)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 bg-[#1E1826] border border-white/5 rounded-lg px-3 py-2 text-[13px] hover:border-white/15 transition-colors min-w-[240px] max-w-[320px]"
      >
        <Search className="h-3.5 w-3.5 text-[#8B7E9F]" />
        <span className="truncate flex-1 text-left">{repo || 'Select repo'}</span>
        <ChevronDown className="h-3.5 w-3.5 text-[#8B7E9F]" />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-[380px] bg-[#15111A] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-20">
          <div className="p-2 border-b border-white/5 flex items-center gap-2">
            <Search className="h-3.5 w-3.5 text-[#8B7E9F]" />
            <input
              autoFocus
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search repos…"
              className="flex-1 bg-transparent text-[13px] py-1.5 outline-none placeholder-[#606080]"
            />
          </div>
          <div className="max-h-[380px] overflow-y-auto">
            {items.length === 0 && (
              <div className="px-3 py-6 text-center text-[12px] text-[#8B7E9F]">
                <Github className="h-6 w-6 mx-auto mb-2 opacity-50" />
                <p>No repositories found.</p>
                <p className="text-[10px] mt-1">Star some repos on GitHub to see them here.</p>
              </div>
            )}
            {categories.map((category) => (
              <div key={category}>
                <div className="px-3 py-2 bg-white/3">
                  <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#606080]">
                    {category}
                  </div>
                </div>
                {grouped[category].map((r) => (
                  <button
                    key={r.value}
                    onClick={() => onSelect(r.value)}
                    className="w-full text-left px-3 py-2.5 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                  >
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <span className="truncate text-[13px] font-medium text-[#F8F8FF]">{r.label}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-[#8B7E9F]">
                      {r.language && (
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-[#A78BFA]" />
                          {r.language}
                        </span>
                      )}
                      <span>{r.openIssues || 0} open</span>
                      {r.stars > 0 && <span>⭐ {r.stars > 1000 ? `${Math.floor(r.stars/1000)}k` : r.stars}</span>}
                    </div>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SkeletonTiers() {
  return (
    <div className="space-y-10">
      {[0,1,2].map((i) => (
        <div key={i}>
          <div className="h-4 w-48 bg-white/5 rounded mb-4 animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0,1,2].map((j) => (
              <div key={j} className="h-64 rounded-2xl bg-[#1E1826] border border-white/5 animate-pulse" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

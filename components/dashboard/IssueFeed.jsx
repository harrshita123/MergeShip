'use client'

import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, ChevronDown, Search, Tag, Clock, Zap, Sparkles } from 'lucide-react'
import {
  getAnalyzedIssues,
  getContributorContext,
} from '@/app/(contributor)/dashboard/actions'

const BUCKETS = [
  { key: 'EASY',   label: 'Easy Pickings',     color: '#4ADE80', glow: 'rgba(74,222,128,0.35)',  tag: 'badge-easy' },
  { key: 'MEDIUM', label: 'Standard Quests',   color: '#FACC15', glow: 'rgba(250,204,21,0.35)', tag: 'badge-medium' },
  { key: 'HARD',   label: 'Elite Challenges',  color: '#EF4444', glow: 'rgba(239,68,68,0.35)',   tag: 'badge-hard' },
]

export default function IssueFeed({ handle, userLevel = 'L1 Beginner', forceSync = false }) {
  const [repos, setRepos] = useState([])
  const [repo, setRepo] = useState('')
  const [issues, setIssues] = useState([])
  const [loadingRepos, setLoadingRepos] = useState(true)
  const [loadingIssues, setLoadingIssues] = useState(false)
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState('')

  /* --------- Load repos --------- */
  useEffect(() => {
    if (!handle) return
    let alive = true
    setLoadingRepos(true)
    ;(async () => {
      const r = await getContributorContext(handle)
      if (!alive) return
      setRepos(r.repos || [])
      // Pick default: first repo with open issues > 0, or first
      const withIssues = (r.repos || []).find((x) => x.openIssues > 0)
      setRepo(withIssues?.value || r.repos?.[0]?.value || 'vercel/next.js')
      setLoadingRepos(false)
    })()
    return () => { alive = false }
  }, [handle])

  /* --------- Load issues for selected repo --------- */
  useEffect(() => {
    if (!repo) return
    let alive = true
    setLoadingIssues(true)
    ;(async () => {
      const r = await getAnalyzedIssues(repo, userLevel, forceSync)
      if (!alive) return
      setIssues(r.issues || [])
      setLoadingIssues(false)
    })()
    return () => { alive = false }
  }, [repo, userLevel, forceSync])

  const grouped = useMemo(() => {
    const g = { EASY: [], MEDIUM: [], HARD: [] }
    issues.forEach((i) => {
      if (g[i.difficulty]) g[i.difficulty].push(i)
    })
    return g
  }, [issues])

  const filteredRepos = useMemo(() => {
    if (!filter) return repos.slice(0, 30)
    const q = filter.toLowerCase()
    return repos.filter((r) => r.label.toLowerCase().includes(q)).slice(0, 30)
  }, [repos, filter])

  return (
    <div className="bg-[#1E1826] border border-white/5 rounded-2xl p-6 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#606080] mb-2">
            AI-Matched Quests
          </div>
          <h2
            className="text-xl md:text-2xl font-bold"
            style={{ fontFamily: 'Outfit, sans-serif' }}
          >
            Issues tuned to <span className="gradient-text">your level</span>
          </h2>
        </div>
        <RepoPicker
          repo={repo}
          open={open}
          setOpen={setOpen}
          filter={filter}
          setFilter={setFilter}
          filteredRepos={filteredRepos}
          onSelect={(v) => { setRepo(v); setOpen(false); setFilter('') }}
          loadingRepos={loadingRepos}
        />
      </div>

      {loadingIssues && issues.length === 0 ? (
        <SkeletonColumns />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {BUCKETS.map((b) => (
            <Bucket key={b.key} bucket={b} items={grouped[b.key]} />
          ))}
        </div>
      )}
    </div>
  )
}

function RepoPicker({ repo, open, setOpen, filter, setFilter, filteredRepos, onSelect, loadingRepos }) {
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 bg-[#15111A] border border-white/5 rounded-lg px-3 py-2 text-[13px] hover:border-white/15 transition-colors min-w-[220px] max-w-[300px]"
      >
        <Search className="h-3.5 w-3.5 text-[#8B7E9F]" />
        <span className="truncate flex-1 text-left">{repo || 'Select a repository'}</span>
        <ChevronDown className="h-3.5 w-3.5 text-[#8B7E9F]" />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-[340px] bg-[#15111A] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-20">
          <div className="p-2 border-b border-white/5">
            <input
              autoFocus
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search repos…"
              className="w-full bg-transparent text-[13px] px-2 py-1.5 outline-none placeholder-[#606080]"
            />
          </div>
          <div className="max-h-[300px] overflow-y-auto">
            {loadingRepos && (
              <div className="px-3 py-4 text-[12px] text-[#8B7E9F]">Loading repositories…</div>
            )}
            {!loadingRepos && filteredRepos.length === 0 && (
              <div className="px-3 py-4 text-[12px] text-[#8B7E9F]">No repos found</div>
            )}
            {filteredRepos.map((r) => (
              <button
                key={r.value}
                onClick={() => onSelect(r.value)}
                className="w-full text-left px-3 py-2 hover:bg-white/5 flex items-center justify-between gap-3"
              >
                <span className="truncate text-[13px]">{r.label}</span>
                <span className="text-[10px] text-[#8B7E9F]">
                  {r.language || '—'} · {r.openIssues || 0} open
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Bucket({ bucket, items }) {
  return (
    <div className="bg-[#15111A] border border-white/5 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <span
          className="inline-block w-2 h-2 rounded-full"
          style={{ background: bucket.color, boxShadow: `0 0 8px ${bucket.glow}` }}
        />
        <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[#F8F8FF]">
          {bucket.label}
        </span>
        <span className="ml-auto text-[10px] text-[#606080]">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <div className="text-[12px] text-[#606080] text-center py-10">
          No quests in this tier right now.
        </div>
      ) : (
        <div className="space-y-3">
          {items.slice(0, 6).map((it) => (
            <IssueCard key={it.id} issue={it} bucket={bucket} />
          ))}
        </div>
      )}
    </div>
  )
}

function IssueCard({ issue, bucket }) {
  return (
    <a
      href={issue.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block group bg-[#1E1826] border border-white/5 hover:border-white/15 rounded-xl p-4 transition-all hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-[10px] text-[#606080] truncate">{issue.repo} · #{issue.number}</span>
        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${bucket.tag}`}>
          {issue.difficulty}
        </span>
      </div>
      <h3 className="text-[13px] font-semibold text-[#F8F8FF] leading-snug mb-3 line-clamp-2">
        {issue.title}
      </h3>
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-3 text-[11px] text-[#8B7E9F]">
          <span className="flex items-center gap-1 font-bold text-[#D8B4FE]">
            <Zap className="h-3 w-3" /> {issue.xp} XP
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" /> {issue.time}
          </span>
        </div>
        <ExternalLink className="h-3.5 w-3.5 text-[#606080] group-hover:text-[#D8B4FE] transition-colors" />
      </div>
      {issue.labels?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {issue.labels.slice(0, 3).map((l) => (
            <span
              key={l}
              className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-[#8B7E9F]"
            >
              <Tag className="h-2.5 w-2.5" /> {l}
            </span>
          ))}
        </div>
      )}
      {issue.highlight && (
        <div className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-semibold text-[#67E8F9] bg-[#67E8F9]/10 border border-[#67E8F9]/25 px-2 py-1 rounded-full">
          <Sparkles className="h-2.5 w-2.5" /> {issue.highlight}
        </div>
      )}
    </a>
  )
}

function SkeletonColumns() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {[0,1,2].map((i) => (
        <div key={i} className="bg-[#15111A] border border-white/5 rounded-xl p-4 animate-pulse">
          <div className="h-3 w-24 bg-white/5 rounded mb-4" />
          {[0,1,2].map((j) => (
            <div key={j} className="h-24 bg-white/5 rounded-lg mb-3" />
          ))}
        </div>
      ))}
    </div>
  )
}

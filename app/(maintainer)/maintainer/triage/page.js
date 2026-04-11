'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Github, ChevronDown, Tag, X, CheckCircle } from 'lucide-react'
import { account } from '@/lib/appwrite'
import { getTriageData, triageIssue, closeDuplicate } from '../actions'
import Topbar from '@/components/layout/Topbar'
import { formatDistanceToNow } from 'date-fns'

const CATEGORIES = [
  { key: 'All', label: 'All', color: '#06B6D4' },
  { key: 'Bug', label: 'Bug', color: '#EF4444' },
  { key: 'Feature', label: 'Feature', color: '#A78BFA' },
  { key: 'Duplicate', label: 'Duplicate', color: '#FBBF24' },
  { key: 'Question', label: 'Question', color: '#67E8F9' },
  { key: 'Docs', label: 'Docs', color: '#4ADE80' },
]

export default function TriagePage() {
  const router = useRouter()
  const [handle, setHandle] = useState(null)
  const [resolving, setResolving] = useState(true)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [selectedRepo, setSelectedRepo] = useState(null)
  const [repoDropdown, setRepoDropdown] = useState(false)
  const [activeCategory, setActiveCategory] = useState('All')
  const [processingIssue, setProcessingIssue] = useState(null)

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

  /* ---- Load triage data ---- */
  useEffect(() => {
    if (!handle) return
    let alive = true
    setLoading(true)
    ;(async () => {
      const result = await getTriageData(handle, null, selectedRepo)
      if (!alive) return
      if (result.success) {
        setData(result)
        if (!selectedRepo) setSelectedRepo(result.repoName)
      }
      setLoading(false)
    })()
    return () => { alive = false }
  }, [handle, selectedRepo])

  const handleCategorize = useCallback(async (issueNumber, category) => {
    if (!selectedRepo) return
    setProcessingIssue(issueNumber)
    const result = await triageIssue(selectedRepo, issueNumber, category)
    if (result.success) {
      // Reload data
      const newData = await getTriageData(handle, null, selectedRepo)
      if (newData.success) setData(newData)
    }
    setProcessingIssue(null)
  }, [selectedRepo, handle])

  const handleCloseDuplicate = useCallback(async (issueNumber) => {
    if (!selectedRepo) return
    const duplicateOf = prompt('Enter the issue number this is a duplicate of:')
    if (!duplicateOf) return
    
    setProcessingIssue(issueNumber)
    const result = await closeDuplicate(selectedRepo, issueNumber, duplicateOf)
    if (result.success) {
      const newData = await getTriageData(handle, null, selectedRepo)
      if (newData.success) setData(newData)
    }
    setProcessingIssue(null)
  }, [selectedRepo, handle])

  const filteredQueue = activeCategory === 'All'
    ? data?.triageQueue || []
    : (data?.triageQueue || []).filter(i => i.category === activeCategory)

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

  return (
    <>
      <Topbar
        title="AI-Powered Triage"
        subtitle="Categorize and manage open issues efficiently"
      />

      <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-10">
        {/* Repo selector */}
        <div className="relative mb-6">
          <label className="text-[10px] font-black uppercase tracking-[0.22em] text-[#606080] mb-2 block">
            Repository
          </label>
          <button
            onClick={() => setRepoDropdown(o => !o)}
            className="flex items-center gap-2 bg-[#1E1826] border border-white/5 rounded-lg px-3 py-2 text-[13px] hover:border-white/15 transition-colors w-full max-w-md"
          >
            <span className="truncate flex-1 text-left">
              {data?.repoName || 'Select repository'}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-[#8B7E9F]" />
          </button>
          {repoDropdown && (
            <div className="absolute left-0 mt-2 w-full max-w-md bg-[#15111A] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-20 max-h-[320px] overflow-y-auto">
              {(data?.allRepoNames || []).map((repo) => (
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

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#06B6D4]" />
          </div>
        ) : (
          <>
            {/* Category tabs */}
            <div className="flex items-center gap-2 mb-6 flex-wrap">
              {CATEGORIES.map((cat) => {
                const count = cat.key === 'All'
                  ? data?.triageQueue?.length || 0
                  : data?.categoryCounts?.[cat.key] || 0
                
                return (
                  <button
                    key={cat.key}
                    onClick={() => setActiveCategory(cat.key)}
                    className={`px-4 py-2 rounded-full text-[12px] font-bold tracking-wide transition-all ${
                      activeCategory === cat.key
                        ? 'text-white'
                        : 'bg-[#1E1826] border border-white/5 text-[#A0A0C0] hover:border-white/15'
                    }`}
                    style={activeCategory === cat.key ? { background: cat.color } : {}}
                  >
                    {cat.label} ({count})
                  </button>
                )
              })}
            </div>

            {/* Triage queue */}
            {filteredQueue.length === 0 ? (
              <div className="text-center py-20 text-[#8B7E9F]">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No issues to triage in this category</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredQueue.map((issue) => (
                  <TriageCard
                    key={issue.number}
                    issue={issue}
                    processing={processingIssue === issue.number}
                    onCategorize={handleCategorize}
                    onCloseDuplicate={handleCloseDuplicate}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}

function TriageCard({ issue, processing, onCategorize, onCloseDuplicate }) {
  const [actionMenu, setActionMenu] = useState(false)

  const categoryColor = CATEGORIES.find(c => c.key === issue.category)?.color || '#06B6D4'

  return (
    <div className="bg-[#1E1826] border border-white/5 rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest"
            style={{ background: `${categoryColor}22`, color: categoryColor, border: `1px solid ${categoryColor}44` }}
          >
            {issue.category}
          </span>
          {(issue.labels || []).slice(0, 3).map((label) => (
            <span
              key={label}
              className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-[#8B7E9F]"
            >
              <Tag className="h-2.5 w-2.5" /> {label}
            </span>
          ))}
        </div>
        <a
          href={issue.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-[#06B6D4] hover:underline"
        >
          #{issue.number}
        </a>
      </div>

      <h3 className="text-[15px] font-bold text-[#F8F8FF] mb-2">
        {issue.title}
      </h3>

      {issue.body && (
        <p className="text-[12px] text-[#8B7E9F] mb-4 line-clamp-2">
          {issue.body}
        </p>
      )}

      {/* Contributor card */}
      <div className="flex items-center gap-3 mb-4 p-3 bg-white/5 rounded-lg">
        <img
          src={issue.user.avatar}
          alt={issue.user.login}
          className="w-10 h-10 rounded-full"
          onError={(e) => { e.currentTarget.src = 'https://github.com/github.png?size=64' }}
        />
        <div className="flex-1">
          <div className="text-[12px] font-bold text-[#F8F8FF]">{issue.user.login}</div>
          <div className="text-[10px] text-[#8B7E9F]">{issue.user.level} · Trust Score: {issue.user.trustScore}</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-[#606080]">
            {issue.comments} comment{issue.comments === 1 ? '' : 's'}
          </div>
          <div className="text-[9px] text-[#606080]">
            {formatDistanceToNow(new Date(issue.created_at), { addSuffix: true })}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <button
            onClick={() => setActionMenu(o => !o)}
            disabled={processing}
            className="px-4 py-2 rounded-lg bg-[#06B6D4] text-white text-[12px] font-bold hover:bg-[#38BDF8] transition-colors disabled:opacity-50"
          >
            {processing ? 'Processing...' : 'Categorize'}
          </button>
          {actionMenu && (
            <div className="absolute left-0 mt-2 w-48 bg-[#15111A] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-20">
              {CATEGORIES.filter(c => c.key !== 'All').map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => { onCategorize(issue.number, cat.key); setActionMenu(false) }}
                  className="w-full text-left px-3 py-2 hover:bg-white/5 text-[12px]"
                  style={{ color: cat.color }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => onCloseDuplicate(issue.number)}
          disabled={processing}
          className="px-4 py-2 rounded-lg border border-white/10 text-[#F8F8FF] text-[12px] font-bold hover:bg-white/5 transition-colors disabled:opacity-50"
        >
          Close Duplicate
        </button>

        <button
          disabled={processing}
          className="px-4 py-2 rounded-lg border border-white/10 text-[#F8F8FF] text-[12px] font-bold hover:bg-white/5 transition-colors disabled:opacity-50"
        >
          Assign
        </button>
      </div>
    </div>
  )
}

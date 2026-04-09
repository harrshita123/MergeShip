'use client'

import { RefreshCw, Sparkles } from 'lucide-react'

function greeting() {
  const h = new Date().getHours()
  if (h < 5) return 'Still coding'
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function DashboardHeader({ name, handle, onSync, isSyncing = false, cached }) {
  const display = name || (handle ? `@${handle}` : 'contributor')
  return (
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
      <div>
        <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[#606080] mb-3 flex items-center gap-2">
          <Sparkles className="h-3 w-3 text-[#D8B4FE]" />
          Contributor Home
        </div>
        <h1
          className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight"
          style={{ fontFamily: 'Outfit, sans-serif' }}
        >
          {greeting()}, <span className="gradient-text">{display}</span>
          <span className="inline-block ml-2" role="img" aria-label="wave">👋</span>
        </h1>
        <p className="mt-2 text-[14px] text-[#8B7E9F] max-w-xl">
          Here’s your open-source command center. Ship quests, earn XP, climb levels.
        </p>
      </div>
      <div className="flex items-center gap-3">
        {cached && (
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#606080]">
            Cached
          </span>
        )}
        <button
          onClick={onSync}
          disabled={isSyncing}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-bold tracking-wide transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
          style={{
            background:
              'linear-gradient(135deg, rgba(124,58,237,0.25), rgba(6,182,212,0.2))',
            border: '1px solid rgba(216,180,254,0.35)',
            color: '#D8B4FE',
            boxShadow: '0 8px 22px rgba(124,58,237,0.25)',
          }}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Syncing…' : 'Sync Now'}
        </button>
      </div>
    </div>
  )
}

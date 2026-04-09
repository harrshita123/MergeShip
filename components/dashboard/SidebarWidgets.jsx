'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Trophy, Users, Crown, ArrowRight, Sparkles, Star } from 'lucide-react'
import { getAchievements } from '@/app/(contributor)/dashboard/actions'

/* ----------------- Badge widget ----------------- */
export function BadgeWidget({ handle }) {
  const [data, setData] = useState({ badges: [], achievements: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!handle) return
    let alive = true
    setLoading(true)
    ;(async () => {
      const r = await getAchievements(handle)
      if (!alive) return
      setData({ badges: r.badges || [], achievements: r.achievements || [] })
      setLoading(false)
    })()
    return () => { alive = false }
  }, [handle])

  return (
    <div className="bg-[#1E1826] border border-white/5 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#606080]">
          Recent Badges
        </div>
        <Trophy className="h-4 w-4 text-[#FBBF24]" />
      </div>
      {loading ? (
        <div className="space-y-3">
          {[0,1,2].map((i) => (
            <div key={i} className="h-14 bg-white/5 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {data.badges.slice(0, 3).map((b) => (
            <BadgeRow key={b.id} badge={b} />
          ))}
          {data.achievements.find((a) => a.unlocked) && (
            <div className="pt-3 mt-2 border-t border-white/5">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#606080] mb-2">
                Achievement
              </div>
              <AchievementRow ach={data.achievements.find((a) => a.unlocked)} />
            </div>
          )}
        </div>
      )}
      <Link
        href="/achievements"
        className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-bold text-[#D8B4FE] hover:translate-x-1 transition-transform"
      >
        View all <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  )
}

function BadgeRow({ badge }) {
  const rarityColors = {
    Common:    '#A0A0C0',
    Rare:      '#67E8F9',
    Epic:      '#F472B6',
    Legendary: '#FBBF24',
  }
  const color = rarityColors[badge.rarity] || '#A0A0C0'
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg border ${
        badge.unlocked ? 'bg-white/5 border-white/10' : 'border-white/5 opacity-60'
      }`}
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0"
        style={{
          background: `${color}22`,
          border: `1px solid ${color}55`,
          boxShadow: badge.unlocked ? `0 0 16px ${color}44` : 'none',
          filter: badge.unlocked ? 'none' : 'grayscale(1)',
        }}
      >
        {badge.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[13px] truncate">{badge.title}</span>
          <span
            className="text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded"
            style={{ background: `${color}22`, color }}
          >
            {badge.rarity}
          </span>
        </div>
        <div className="text-[11px] text-[#8B7E9F] truncate">{badge.description}</div>
      </div>
    </div>
  )
}

function AchievementRow({ ach }) {
  const pct = Math.round((ach.progress / ach.target) * 100)
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-[#D8B4FE]/15 border border-[#D8B4FE]/30 flex items-center justify-center text-xl">
        {ach.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="font-bold text-[13px] truncate">{ach.title}</span>
          <span className="text-[11px] text-[#D8B4FE] font-bold">+{ach.xpReward} XP</span>
        </div>
        <div className="xp-bar" style={{ height: 5 }}>
          <div className="xp-bar-fill" style={{ width: `${Math.max(4, Math.min(100, pct))}%` }} />
        </div>
      </div>
    </div>
  )
}

/* ----------------- Community / Guilds widget ----------------- */
export function CommunityWidget() {
  const guilds = [
    { name: 'TypeScript Titans', members: 1284, online: 42, challenge: 'Merge 3 PRs this week', accent: '#67E8F9' },
    { name: 'Rust Pioneers',     members: 512,  online: 17, challenge: 'Ship a crate update',    accent: '#F472B6' },
  ]
  return (
    <div className="bg-[#1E1826] border border-white/5 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#606080]">
          Your Guilds
        </div>
        <Users className="h-4 w-4 text-[#67E8F9]" />
      </div>
      <div className="space-y-3">
        {guilds.map((g) => (
          <div key={g.name} className="p-3 rounded-lg border border-white/5 hover:border-white/10 transition-colors">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-[13px]">{g.name}</span>
              <span className="flex items-center gap-1 text-[10px] text-[#4ADE80] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80] status-online" />
                {g.online}
              </span>
            </div>
            <div className="text-[11px] text-[#8B7E9F] mb-2">{g.members.toLocaleString()} members</div>
            <div
              className="text-[10px] font-bold tracking-widest uppercase px-2 py-1 rounded-full inline-block"
              style={{ background: `${g.accent}18`, color: g.accent, border: `1px solid ${g.accent}35` }}
            >
              {g.challenge}
            </div>
          </div>
        ))}
      </div>
      <Link
        href="/community"
        className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-bold text-[#67E8F9] hover:translate-x-1 transition-transform"
      >
        Explore guilds <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  )
}

/* ----------------- Pro upsell widget ----------------- */
export function ProWidget() {
  return (
    <div
      className="relative rounded-2xl p-6 overflow-hidden"
      style={{
        background:
          'linear-gradient(135deg, rgba(124,58,237,0.35), rgba(6,182,212,0.25))',
        border: '1px solid rgba(216,180,254,0.3)',
      }}
    >
      <div className="absolute -top-16 -right-16 w-44 h-44 rounded-full bg-[#D8B4FE]/25 blur-3xl" />
      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <Crown className="h-4 w-4 text-[#FBBF24]" />
          <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[#FBBF24]">
            MergeShip Pro
          </span>
        </div>
        <h3
          className="text-lg font-extrabold mb-2 leading-snug"
          style={{ fontFamily: 'Outfit, sans-serif' }}
        >
          Unlock <span className="gradient-text-pink">mentor matching</span> and unlimited AI quests
        </h3>
        <ul className="space-y-1.5 mb-4 text-[12px] text-[#F8F8FF]/90">
          <li className="flex items-center gap-2"><Star className="h-3 w-3 text-[#FBBF24]" /> Senior mentor pairings</li>
          <li className="flex items-center gap-2"><Star className="h-3 w-3 text-[#FBBF24]" /> Unlimited repo tracking</li>
          <li className="flex items-center gap-2"><Sparkles className="h-3 w-3 text-[#D8B4FE]" /> Advanced analytics</li>
        </ul>
        <button className="w-full btn-primary text-[12px] py-2">
          Upgrade — $9/mo
        </button>
      </div>
    </div>
  )
}

export default function SidebarWidgets({ handle }) {
  return (
    <div className="space-y-5">
      <BadgeWidget handle={handle} />
      <CommunityWidget />
      <ProWidget />
    </div>
  )
}

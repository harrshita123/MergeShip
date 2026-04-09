'use client'

import { useEffect, useState } from 'react'
import { Flame, Zap, TrendingUp, CalendarDays, Users, GitFork } from 'lucide-react'
import { getDashboardData } from '@/app/(contributor)/dashboard/actions'

function StatCard({ icon: Icon, label, value, accent, sub, children }) {
  return (
    <div
      className="bg-[#1E1826] border border-white/5 rounded-2xl p-6 relative overflow-hidden transition-card hover:border-white/10"
      style={{ minHeight: 156 }}
    >
      <div
        className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl"
        style={{ background: `${accent}18` }}
      />
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#606080]">
            {label}
          </div>
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: `${accent}22`, color: accent }}
          >
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <div className="stat-number text-4xl md:text-5xl leading-none">{value}</div>
        {sub && <div className="mt-2 text-[12px] text-[#8B7E9F]">{sub}</div>}
        {children}
      </div>
    </div>
  )
}

export default function StatSection({ handle, forceSync = false, onLoaded }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [cached, setCached] = useState(false)

  useEffect(() => {
    if (!handle) return
    let alive = true
    setLoading(true)
    ;(async () => {
      try {
        const r = await getDashboardData(handle, !!forceSync)
        if (!alive) return
        setStats(r.stats)
        setCached(!!r.cached)
        onLoaded?.(r.stats, !!r.cached)
      } catch (e) {
        console.warn(e)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handle, forceSync])

  if (loading && !stats) return <SkeletonGrid />

  const s = stats || {}
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      <StatCard
        icon={TrendingUp}
        label="Level"
        value={s.levelNum ? `L${s.levelNum}` : 'L1'}
        accent="#A78BFA"
      >
        <div className="mt-4">
          <div className="flex items-center justify-between text-[11px] mb-2">
            <span className="text-[#D8B4FE] font-semibold">{s.level || 'Beginner'}</span>
            <span className="text-[#8B7E9F]">{s.progress ?? 0}%</span>
          </div>
          <div className="xp-bar">
            <div
              className="xp-bar-fill"
              style={{ width: `${Math.max(4, Math.min(100, s.progress || 0))}%` }}
            />
          </div>
          <div className="mt-2 text-[11px] text-[#606080]">Next: {s.nextLevel || 'L2 Intermediate'}</div>
        </div>
      </StatCard>

      <StatCard
        icon={Zap}
        label="Total XP"
        value={s.totalXP || '0'}
        accent="#67E8F9"
        sub={`${s.displayXP || 0} lifetime points`}
      />

      <StatCard
        icon={Flame}
        label="Current Streak"
        value={`${s.streak ?? 0}d`}
        accent="#F59E0B"
        sub={s.streak > 0 ? 'Keep the fire alive 🔥' : 'Push today to start a streak'}
      />

      <StatCard
        icon={CalendarDays}
        label="Active Days"
        value={`${s.activeDays ?? 0}`}
        accent="#F472B6"
        sub={`${s.contributions?.toLocaleString?.() || 0} contributions / year`}
      >
        <div className="mt-3 flex items-center gap-3 text-[11px] text-[#8B7E9F]">
          <span className="flex items-center gap-1"><GitFork className="h-3 w-3" /> {s.repos || 0}</span>
          <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {s.followers || 0}</span>
        </div>
      </StatCard>
    </div>
  )
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-[#1E1826] border border-white/5 rounded-2xl p-6 min-h-[156px] animate-pulse">
          <div className="h-3 w-24 bg-white/5 rounded mb-4" />
          <div className="h-10 w-28 bg-white/10 rounded mb-3" />
          <div className="h-2 w-full bg-white/5 rounded" />
        </div>
      ))}
    </div>
  )
}

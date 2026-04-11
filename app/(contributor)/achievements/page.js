'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import confetti from 'canvas-confetti'
import {
  Trophy,
  Target,
  Award,
  Sparkles,
  Share2,
  X,
  ArrowLeft,
  Loader2,
  Github,
} from 'lucide-react'
import { account } from '@/lib/appwrite'
import { getAchievements } from '@/app/(contributor)/dashboard/actions'
import { STATIC_ACHIEVEMENTS, RARITY_GRADIENTS, RARITY_COLORS } from '@/data/achievements'
import Topbar from '@/components/layout/Topbar'

export default function AchievementsPage() {
  const router = useRouter()
  const [handle, setHandle] = useState(null)
  const [resolving, setResolving] = useState(true)
  const [data, setData] = useState({ achievements: [], badges: [], summary: null })
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null) // badge for celebration

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

  /* ---- Load achievements ---- */
  useEffect(() => {
    if (!handle) return
    let alive = true
    setLoading(true)
    ;(async () => {
      try {
        const r = await getAchievements(handle)
        if (!alive) return
        // Merge with static fallback so we always have 8 achievements
        const serverMap = new Map((r.achievements || []).map((a) => [a.id, a]))
        const merged = STATIC_ACHIEVEMENTS.map((s) => {
          const live = serverMap.get(s.id)
          return live || s
        })
        setData({
          achievements: merged,
          badges: r.badges || [],
          summary: {
            unlocked: merged.filter((a) => a.unlocked).length,
            total: merged.length,
            badgesEarned: (r.badges || []).filter((b) => b.unlocked).length,
            totalBadges: (r.badges || []).length || 6,
            masteryPct: Math.round(
              (merged.filter((a) => a.unlocked).length / merged.length) * 100
            ),
          },
        })
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [handle])

  const unlockedAch = data.achievements.filter((a) => a.unlocked)
  const lockedAch = data.achievements.filter((a) => !a.unlocked)

  const openCelebration = useCallback((badge) => setSelected(badge), [])
  const closeCelebration = useCallback(() => setSelected(null), [])

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

  const summary = data.summary || { unlocked: 0, total: 8, badgesEarned: 0, totalBadges: 6, masteryPct: 0 }

  return (
    <>
      <Topbar
        title="Achievements"
        subtitle="Your open source trophy room."
      />

      <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-10">
        {loading ? (
          <SkeletonLayout />
        ) : (
          <>
            <SummaryGrid summary={summary} />

            {/* Badge Collection */}
            <Section title="Badge Collection" caption={`${summary.badgesEarned} of ${summary.totalBadges} earned`}>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {data.badges.map((b) => (
                  <BadgeTile key={b.id} badge={b} onOpen={() => b.unlocked && openCelebration(b)} />
                ))}
                {data.badges.length === 0 && (
                  <div className="col-span-full text-[13px] text-[#606080] py-10 text-center">
                    Ship more PRs to start earning badges.
                  </div>
                )}
              </div>
            </Section>

            {/* Milestones unlocked */}
            <Section title="Milestones" caption={`${unlockedAch.length} unlocked`}>
              {unlockedAch.length === 0 ? (
                <EmptyHint text="You'll start unlocking milestones as soon as you merge your first PR." />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {unlockedAch.map((a) => (
                    <MilestoneCard key={a.id} ach={a} />
                  ))}
                </div>
              )}
            </Section>

            {/* In progress */}
            <Section title="In Progress" caption={`${lockedAch.length} remaining`}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {lockedAch.map((a) => (
                  <ProgressCard key={a.id} ach={a} />
                ))}
              </div>
            </Section>
          </>
        )}
      </div>

      <AnimatePresence>
        {selected && (
          <CelebrationModal
            key={selected.id}
            badge={selected}
            onClose={closeCelebration}
          />
        )}
      </AnimatePresence>
    </>
  )
}

/* ========================================================= */
function SummaryGrid({ summary }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
      <SummaryCard
        icon={Trophy}
        color="#A78BFA"
        label="Unlocked"
        value={`${summary.unlocked} / ${summary.total}`}
      />
      <SummaryCard
        icon={Target}
        color="#67E8F9"
        label="Remaining"
        value={`${summary.total - summary.unlocked}`}
      />
      <SummaryCard
        icon={Award}
        color="#FBBF24"
        label="Badges Earned"
        value={`${summary.badgesEarned} / ${summary.totalBadges}`}
      />
      <div className="bg-[#1E1826] border border-white/5 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#606080]">
            Overall Mastery
          </div>
          <div className="text-[11px] font-bold text-[#D8B4FE]">{summary.masteryPct}%</div>
        </div>
        <div className="xp-bar">
          <div className="xp-bar-fill" style={{ width: `${Math.max(4, summary.masteryPct)}%` }} />
        </div>
        <div className="mt-3 text-[11px] text-[#8B7E9F]">Climb from novice to legend.</div>
      </div>
    </div>
  )
}

function SummaryCard({ icon: Icon, color, label, value }) {
  return (
    <div className="bg-[#1E1826] border border-white/5 rounded-2xl p-5 relative overflow-hidden">
      <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full blur-3xl" style={{ background: `${color}22` }} />
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#606080]">
            {label}
          </div>
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: `${color}22`, color }}
          >
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <div className="stat-number text-4xl leading-none">{value}</div>
      </div>
    </div>
  )
}

function Section({ title, caption, children }) {
  return (
    <div className="mb-12">
      <div className="flex items-end justify-between mb-4">
        <h2 className="text-xl md:text-2xl font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>
          {title}
        </h2>
        <div className="text-[11px] text-[#606080] uppercase tracking-widest font-bold">{caption}</div>
      </div>
      {children}
    </div>
  )
}

function EmptyHint({ text }) {
  return (
    <div className="bg-[#1E1826] border border-white/5 rounded-2xl p-8 text-center text-[13px] text-[#8B7E9F]">
      {text}
    </div>
  )
}

/* ---- Badge Tile ---- */
function BadgeTile({ badge, onOpen }) {
  const gradient = RARITY_GRADIENTS[badge.rarity] || RARITY_GRADIENTS.Common
  const color = RARITY_COLORS[badge.rarity] || RARITY_COLORS.Common
  const locked = !badge.unlocked
  
  const handleClick = () => {
    if (!locked && onOpen) {
      onOpen()
    }
  }
  
  return (
    <div
      onClick={handleClick}
      className={`relative aspect-square rounded-3xl p-[2px] transition-all hover:-translate-y-1 ${
        locked ? 'opacity-45 grayscale' : 'cursor-pointer'
      }`}
      style={{ background: gradient }}
    >
      <div className="relative w-full h-full rounded-3xl bg-[#15111A] flex flex-col items-center justify-center text-center overflow-hidden group">
        <div
          className="absolute inset-0 opacity-20"
          style={{ background: `radial-gradient(circle at 50% 30%, ${color}66, transparent 60%)` }}
        />

        {!locked && (
          <>
            <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#4ADE80] status-online" />
            <div
              className="absolute top-2 left-2 w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
              aria-label="Celebrate"
            >
              <Sparkles className="h-3 w-3 text-white" />
            </div>
          </>
        )}

        <div className="relative text-4xl md:text-5xl mb-2" style={{ filter: locked ? 'grayscale(1)' : 'none' }}>
          {badge.emoji}
        </div>
        <div className="px-2 text-[10px] font-black uppercase tracking-[0.16em] leading-tight">
          {badge.title}
        </div>
        {badge.count > 1 && (
          <div
            className="mt-1 text-[10px] font-bold"
            style={{ color }}
          >
            ×{badge.count}
          </div>
        )}
        <div
          className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[8px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full"
          style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}
        >
          {badge.rarity}
        </div>
      </div>
    </div>
  )
}

/* ---- Milestone Card (unlocked) ---- */
function MilestoneCard({ ach }) {
  return (
    <div
      className="rounded-2xl p-6 border border-[#D8B4FE]/25 transition-card"
      style={{
        background:
          'linear-gradient(135deg, #1A1A2E 0%, #0D0D1A 100%)',
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="text-3xl">{ach.emoji}</div>
        <div className="text-[10px] font-bold tracking-widest uppercase px-2 py-1 rounded-full bg-[#D8B4FE]/15 text-[#D8B4FE] border border-[#D8B4FE]/30">
          +{ach.xpReward} XP
        </div>
      </div>
      <h3 className="text-[15px] font-bold mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>
        {ach.title}
      </h3>
      <p className="text-[12px] text-[#8B7E9F] mb-4">{ach.description}</p>
      <div className="xp-bar"><div className="xp-bar-fill" style={{ width: '100%' }} /></div>
      <div className="mt-2 flex items-center justify-between text-[11px]">
        <span className="text-[#4ADE80] font-bold">Earned 100%</span>
        <span className="text-[#606080]">{ach.progress} / {ach.target}</span>
      </div>
    </div>
  )
}

/* ---- Progress Card (locked) ---- */
function ProgressCard({ ach }) {
  const pct = Math.min(100, Math.round((ach.progress / ach.target) * 100))
  return (
    <div className="bg-[#1E1826] border border-white/5 rounded-2xl p-6 opacity-80">
      <div className="flex items-start justify-between mb-4">
        <div className="text-3xl" style={{ filter: 'grayscale(0.5)' }}>{ach.emoji}</div>
        <div className="text-[10px] font-bold tracking-widest uppercase px-2 py-1 rounded-full bg-[#FBBF24]/10 text-[#FBBF24] border border-[#FBBF24]/25">
          Reward +{ach.xpReward} XP
        </div>
      </div>
      <h3 className="text-[15px] font-bold mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>
        {ach.title}
      </h3>
      <p className="text-[12px] text-[#8B7E9F] mb-4">{ach.description}</p>
      <div className="xp-bar">
        <div className="xp-bar-fill" style={{ width: `${Math.max(4, pct)}%` }} />
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px]">
        <span className="text-[#D8B4FE] font-bold">{pct}%</span>
        <span className="text-[#606080]">{ach.progress} / {ach.target}</span>
      </div>
    </div>
  )
}

/* ---- Celebration Modal with confetti ---- */
function CelebrationModal({ badge, onClose }) {
  useEffect(() => {
    // Fire confetti bursts on mount
    const colors = ['#A78BFA', '#67E8F9', '#FBBF24', '#F472B6']
    try {
      confetti({
        particleCount: 180,
        spread: 80,
        origin: { y: 0.4 },
        colors,
        scalar: 1.1,
        ticks: 300,
      })
      setTimeout(() => {
        confetti({
          particleCount: 80,
          angle: 60,
          spread: 70,
          origin: { x: 0, y: 0.6 },
          colors,
        })
        confetti({
          particleCount: 80,
          angle: 120,
          spread: 70,
          origin: { x: 1, y: 0.6 },
          colors,
        })
      }, 220)
    } catch {}
    return () => { try { confetti.reset?.() } catch {} }
  }, [])

  const gradient = RARITY_GRADIENTS[badge.rarity] || RARITY_GRADIENTS.Common
  const color = RARITY_COLORS[badge.rarity] || RARITY_COLORS.Common

  const share = async () => {
    const text = `I just unlocked “${badge.title}” on MergeShip! 🏆`
    try {
      if (navigator.share) await navigator.share({ title: 'MergeShip', text })
      else await navigator.clipboard.writeText(text)
    } catch {}
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: 'rgba(6,6,17,0.85)', backdropFilter: 'blur(12px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md text-center"
      >
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative inline-block mb-6">
          <div
            className="w-44 h-44 rounded-full p-[4px] mx-auto"
            style={{ background: gradient, boxShadow: `0 0 60px ${color}55` }}
          >
            <div className="w-full h-full rounded-full bg-[#0D0D1A] flex items-center justify-center relative overflow-hidden">
              <div
                className="absolute inset-0"
                style={{ background: `radial-gradient(circle at 50% 30%, ${color}33, transparent 70%)` }}
              />
              <div className="relative text-[84px] leading-none">{badge.emoji}</div>
            </div>
          </div>
          <div
            className="absolute bottom-1 right-1 w-11 h-11 rounded-xl flex items-center justify-center border-2"
            style={{ background: gradient, borderColor: '#0D0D1A', boxShadow: `0 6px 18px ${color}66` }}
          >
            <Trophy className="h-5 w-5 text-white" />
          </div>
        </div>

        <div
          className="text-[11px] font-black uppercase tracking-[0.25em] mb-2"
          style={{ color }}
        >
          {badge.rarity} Badge
        </div>
        <h2
          className="text-4xl md:text-5xl font-extrabold mb-2"
          style={{ fontFamily: 'Outfit, sans-serif' }}
        >
          Magnificent!
        </h2>
        <p className="text-[#A0A0C0] text-[14px] mb-2">
          <span className="font-bold text-white">{badge.title}</span> Unlocked
        </p>
        <p className="text-[13px] text-[#8B7E9F] mb-8 max-w-sm mx-auto">
          {badge.description}
        </p>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={share}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-[#0D0D1A] font-bold text-[13px] hover:scale-105 transition-transform"
          >
            <Share2 className="h-4 w-4" />
            Share Achievement
          </button>
          <button
            onClick={onClose}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-transparent border border-white/20 text-[#F8F8FF] font-bold text-[13px] hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function SkeletonLayout() {
  return (
    <div className="space-y-10">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0,1,2,3].map((i) => (
          <div key={i} className="h-24 rounded-2xl bg-[#1E1826] border border-white/5 animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="aspect-square rounded-3xl bg-[#1E1826] border border-white/5 animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-40 rounded-2xl bg-[#1E1826] border border-white/5 animate-pulse" />
        ))}
      </div>
    </div>
  )
}

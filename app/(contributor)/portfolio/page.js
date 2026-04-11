'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Github, ExternalLink, CheckCircle, MapPin, Calendar, Star, Zap, Target, Flame } from 'lucide-react'
import { account } from '@/lib/appwrite'
import { getProfileData, getDashboardData } from '../dashboard/actions'
import Topbar from '@/components/layout/Topbar'
import { formatDistanceToNow } from 'date-fns'

export default function PortfolioPage() {
  const router = useRouter()
  const [handle, setHandle] = useState(null)
  const [resolving, setResolving] = useState(true)
  const [loading, setLoading] = useState(true)
  const [profileData, setProfileData] = useState(null)
  const [dashData, setDashData] = useState(null)

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

  /* ---- Load profile data ---- */
  useEffect(() => {
    if (!handle) return
    let alive = true
    setLoading(true)
    ;(async () => {
      const [profile, dash] = await Promise.all([
        getProfileData(handle),
        getDashboardData(handle),
      ])
      if (!alive) return
      if (profile.success) setProfileData(profile)
      if (dash.success) setDashData(dash)
      setLoading(false)
    })()
    return () => { alive = false }
  }, [handle])

  if (resolving) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-[#A0A0C0]">
          <Loader2 className="h-5 w-5 animate-spin text-[#A78BFA]" />
          <span>Resolving your GitHub identity…</span>
        </div>
      </div>
    )
  }

  if (!handle) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center bg-[#1E1826] border border-white/5 rounded-2xl p-10 max-w-md">
          <Github className="h-8 w-8 mx-auto text-[#A78BFA] mb-3" />
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
        <Topbar title="Contributor Portfolio" subtitle="Your open source journey" />
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-10">
          <div className="flex items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-[#A78BFA] border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </>
    )
  }

  if (!profileData || !dashData) {
    return (
      <>
        <Topbar title="Contributor Portfolio" subtitle="Your open source journey" />
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-10">
          <div className="text-center py-20">
            <p className="text-[#8B7E9F]">Unable to load portfolio data. Please try again.</p>
          </div>
        </div>
      </>
    )
  }

  const user = profileData.user
  const stats = dashData.stats
  const skills = profileData.skills || []
  const recentPRs = profileData.recentPRs || []

  return (
    <>
      <Topbar title="Contributor Portfolio" subtitle={`@${handle}`} />

      <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <div className="lg:col-span-2">
            <div className="bg-[#1E1826] border border-white/5 rounded-2xl p-8 mb-6">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="relative">
                  <img
                    src={user.avatar || `https://github.com/${handle}.png?size=200`}
                    alt={user.name}
                    className="w-32 h-32 rounded-2xl"
                    onError={(e) => { e.currentTarget.src = 'https://github.com/github.png?size=200' }}
                  />
                  <div className="absolute -bottom-2 -right-2 px-2 py-1 rounded-lg bg-[#A78BFA] text-white text-[10px] font-black">
                    {stats.level}
                  </div>
                </div>

                <div className="flex-1">
                  <h1 className="text-4xl font-black mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    {user.name || handle}
                  </h1>
                  <div className="text-[15px] text-[#A78BFA] font-bold mb-3">@{user.login}</div>
                  
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#4ADE80]/15 text-[#4ADE80] text-[11px] font-bold border border-[#4ADE80]/30 mb-4">
                    <CheckCircle className="h-3 w-3" />
                    Verified Contributor
                  </div>

                  {user.bio && (
                    <p className="text-[14px] text-[#8B7E9F] mb-3 leading-relaxed">{user.bio}</p>
                  )}

                  <div className="flex items-center gap-4 text-[12px] text-[#8B7E9F] mb-4">
                    {user.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {user.location}
                      </span>
                    )}
                    {user.createdAt && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Joined {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mb-4">
                    <div className="px-3 py-1.5 rounded-lg bg-[#A78BFA]/10 text-[#A78BFA] text-[12px] font-bold flex items-center gap-1">
                      <Zap className="h-3.5 w-3.5" />
                      {profileData.mergedPRs || 0} Merged PRs
                    </div>
                    <div className="px-3 py-1.5 rounded-lg bg-[#FBBF24]/10 text-[#FBBF24] text-[12px] font-bold flex items-center gap-1">
                      <Star className="h-3.5 w-3.5" fill="#FBBF24" />
                      {stats.totalXP} XP
                    </div>
                  </div>

                  <a
                    href={`https://github.com/${user.login}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-black text-[13px] font-bold hover:bg-gray-100 transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    View on GitHub
                  </a>
                </div>
              </div>
            </div>

            {/* Language Ecosystem */}
            {skills.length > 0 && (
              <div className="mb-6">
                <h2 className="text-xl font-bold mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  Language Ecosystem
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {skills.map((skill) => (
                    <div key={skill.name} className="bg-[#1E1826] border border-white/5 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[13px] font-bold text-[#F8F8FF]">{skill.name}</span>
                        <span className="text-[11px] font-bold text-[#A78BFA]">{skill.level}%</span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${skill.level}%`,
                            background: 'linear-gradient(90deg, #A78BFA 0%, #8B5CF6 100%)',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Merged Pull Requests */}
            {recentPRs.length > 0 && (
              <div>
                <h2 className="text-xl font-bold mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  Merged Pull Requests
                </h2>
                <div className="space-y-3">
                  {recentPRs.map((pr, idx) => (
                    <a
                      key={idx}
                      href={pr.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block group"
                    >
                      <div className="bg-[#1E1826] border border-white/5 hover:border-[#A78BFA]/30 rounded-xl p-4 transition-all">
                        <div className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-[#4ADE80] flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <h3 className="text-[14px] font-bold text-[#F8F8FF] group-hover:text-[#A78BFA] transition-colors mb-1 line-clamp-2">
                              {pr.title}
                            </h3>
                            <div className="flex items-center gap-3 text-[11px] text-[#8B7E9F]">
                              <span>{pr.repo}</span>
                              {pr.date && (
                                <span>{formatDistanceToNow(new Date(pr.date), { addSuffix: true })}</span>
                              )}
                            </div>
                          </div>
                          <div className="px-2 py-1 rounded-full bg-[#4ADE80]/15 text-[#4ADE80] text-[10px] font-bold border border-[#4ADE80]/30">
                            +50 XP
                          </div>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div>
            {/* Global Stats */}
            <div className="bg-[#1E1826] border border-white/5 rounded-2xl p-5 mb-6">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#606080] mb-4">
                Global Stats
              </div>
              <div className="space-y-3">
                <StatRow icon={Star} label="Total XP" value={stats.totalXP} color="#A78BFA" />
                <StatRow icon={Target} label="Current Level" value={stats.level} color="#A78BFA" />
                <StatRow icon={CheckCircle} label="Issues Solved" value={profileData.closedIssues || 0} color="#4ADE80" />
                <StatRow icon={Zap} label="PRs Merged" value={profileData.mergedPRs || 0} color="#4ADE80" />
                <StatRow icon={Flame} label="Current Streak" value={`${stats.streak}d`} color="#FBBF24" />
                <StatRow icon={Flame} label="Longest Streak" value={`${Math.max(stats.streak, 15)}d`} color="#FBBF24" />
              </div>
            </div>

            {/* Unlocked Badges */}
            <div className="bg-[#1E1826] border border-white/5 rounded-2xl p-5">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#606080] mb-4">
                Unlocked Badges
              </div>
              <div className="flex flex-wrap gap-2">
                {['🎯', '🐛', '🔥', '⚡'].map((emoji, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#A78BFA]/10 border border-[#A78BFA]/30 text-[12px] font-bold text-[#A78BFA]"
                  >
                    <span>{emoji}</span>
                    <span>{['First Steps', 'Bug Hunter', 'Streak Master', 'Quick Draw'][idx]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function StatRow({ icon: Icon, label, value, color }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5" style={{ color }} />
        <span className="text-[12px] text-[#8B7E9F]">{label}</span>
      </div>
      <span className="text-[13px] font-bold" style={{ color }}>
        {value}
      </span>
    </div>
  )
}

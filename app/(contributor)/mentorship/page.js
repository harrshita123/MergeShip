'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Github, Users, Shield, MessageCircle, ExternalLink, CheckCircle, Clock } from 'lucide-react'
import { account } from '@/lib/appwrite'
import { getMentorshipData, requestMentorReview, completeMentorReview } from './actions'
import { getUserLevelInfo } from '@/lib/levels'
import LevelBadge from '@/components/dashboard/LevelBadge'
import Topbar from '@/components/layout/Topbar'
import { formatDistanceToNow } from 'date-fns'

export default function MentorshipPage() {
  const router = useRouter()
  const [handle, setHandle] = useState(null)
  const [resolving, setResolving] = useState(true)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [userLevel, setUserLevel] = useState(1)

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

  /* ---- Load mentorship data ---- */
  useEffect(() => {
    if (!handle) return
    let alive = true
    setLoading(true)
    ;(async () => {
      // Get user level from localStorage (or default to 2 for demo)
      const storedLevel = localStorage.getItem(`level_${handle}`) || '2'
      const level = parseInt(storedLevel, 10)
      setUserLevel(level)
      
      const result = await getMentorshipData(handle, level)
      if (!alive) return
      if (result.success) {
        setData(result)
      }
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
        <Topbar title="Mentorship Hub" subtitle="Learn from experienced contributors" />
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-10">
          <div className="flex items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-[#A78BFA] border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Topbar
        title="Mentorship Hub"
        subtitle={data?.isMentor ? 'Guide the next generation' : 'Learn from experienced contributors'}
      />

      <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-10">
        {data?.isMentor ? (
          <MentorView data={data} handle={handle} />
        ) : (
          <MenteeView data={data} handle={handle} />
        )}
      </div>
    </>
  )
}

function MentorView({ data, handle }) {
  const handleCompleteReview = async (requestId) => {
    const result = await completeMentorReview(requestId, handle, 'approved')
    if (result.success) {
      alert(`Review completed! You earned ${result.xpAwarded} XP`)
      window.location.reload()
    }
  }

  return (
    <div>
      {/* Mentor Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-[#1E1826] border border-white/5 rounded-2xl p-5">
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#606080] mb-2">
            Mentees Helped
          </div>
          <div className="text-3xl font-extrabold text-[#A78BFA]">{data.mentorStats.menteesHelped}</div>
        </div>
        <div className="bg-[#1E1826] border border-white/5 rounded-2xl p-5">
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#606080] mb-2">
            Reviews Completed
          </div>
          <div className="text-3xl font-extrabold text-[#4ADE80]">{data.mentorStats.reviewsCompleted}</div>
        </div>
        <div className="bg-[#1E1826] border border-white/5 rounded-2xl p-5">
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#606080] mb-2">
            Mentor XP Earned
          </div>
          <div className="text-3xl font-extrabold text-[#FBBF24]">{data.mentorStats.mentorXP}</div>
        </div>
      </div>

      {/* Review Queue */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>
          Review Queue
        </h2>
        {data.reviewQueue.length === 0 ? (
          <div className="text-center py-12 text-[#8B7E9F] bg-[#1E1826] border border-white/5 rounded-2xl">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No pending reviews</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.reviewQueue.map((req) => (
              <div key={req.id} className="bg-[#1E1826] border border-white/5 rounded-2xl p-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1">
                    <h3 className="text-[15px] font-bold text-[#F8F8FF] mb-2">{req.prTitle}</h3>
                    <div className="flex items-center gap-3 text-[11px] text-[#8B7E9F]">
                      <span>{req.repo}</span>
                      <span>•</span>
                      <span>{formatDistanceToNow(new Date(req.requestedAt), { addSuffix: true })}</span>
                    </div>
                  </div>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest ${
                    req.difficulty === 'EASY' ? 'bg-[#4ADE80]/15 text-[#4ADE80] border border-[#4ADE80]/30' :
                    req.difficulty === 'MEDIUM' ? 'bg-[#FACC15]/15 text-[#FACC15] border border-[#FACC15]/30' :
                    'bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30'
                  }`}>
                    {req.difficulty}
                  </span>
                </div>

                <div className="flex items-center gap-3 mb-4">
                  <img
                    src={`https://github.com/${req.menteeHandle}.png?size=64`}
                    alt={req.menteeName}
                    className="w-8 h-8 rounded-full"
                    onError={(e) => { e.currentTarget.src = 'https://github.com/github.png?size=64' }}
                  />
                  <div>
                    <div className="text-[13px] font-bold text-[#F8F8FF]">{req.menteeName}</div>
                    <LevelBadge level={req.menteeLevel} size="xs" />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={req.prUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#A78BFA] text-white text-[12px] font-bold hover:bg-[#8B5CF6] transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Review PR
                  </a>
                  <button
                    onClick={() => handleCompleteReview(req.id)}
                    className="px-4 py-2 rounded-lg bg-[#4ADE80] text-black text-[12px] font-bold hover:bg-[#22C55E] transition-colors"
                  >
                    Mark as Reviewed
                  </button>
                  <button className="px-4 py-2 rounded-lg border border-white/10 text-white text-[12px] font-bold hover:bg-white/5 transition-colors">
                    Request Changes
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Your Mentees */}
      <div>
        <h2 className="text-xl font-bold mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>
          Your Mentees
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.mentees.map((mentee) => (
            <div key={mentee.handle} className="bg-[#1E1826] border border-white/5 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <img
                  src={mentee.avatar}
                  alt={mentee.name}
                  className="w-12 h-12 rounded-full"
                  onError={(e) => { e.currentTarget.src = 'https://github.com/github.png?size=64' }}
                />
                <div>
                  <div className="text-[14px] font-bold text-[#F8F8FF]">{mentee.name}</div>
                  <LevelBadge level={mentee.level} size="sm" />
                </div>
              </div>
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-[#8B7E9F]">Active PRs: <span className="text-[#A78BFA] font-bold">{mentee.activePRs}</span></span>
                <span className="text-[#8B7E9F]">Reviews: <span className="text-[#4ADE80] font-bold">{mentee.reviewsRequested}</span></span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function MenteeView({ data, handle }) {
  return (
    <div>
      {/* Current Mentor */}
      {data.currentMentor && (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Your Mentor
          </h2>
          <div className="bg-[#1E1826] border border-white/5 rounded-2xl p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img
                    src={data.currentMentor.avatar}
                    alt={data.currentMentor.name}
                    className="w-16 h-16 rounded-full"
                    onError={(e) => { e.currentTarget.src = 'https://github.com/github.png?size=128' }}
                  />
                  {data.currentMentor.online && (
                    <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-[#4ADE80] border-2 border-[#1E1826]" />
                  )}
                </div>
                <div>
                  <h3 className="text-[17px] font-bold text-[#F8F8FF] mb-1">{data.currentMentor.name}</h3>
                  <LevelBadge level={data.currentMentor.level} size="sm" showName />
                  <div className="flex items-center gap-2 mt-2">
                    {data.currentMentor.specialties.map((spec) => (
                      <span key={spec} className="text-[9px] px-2 py-0.5 rounded-full bg-white/5 text-[#8B7E9F] border border-white/10">
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#A78BFA] text-white text-[12px] font-bold hover:bg-[#8B5CF6] transition-colors">
                <MessageCircle className="h-3.5 w-3.5" />
                Chat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Find a Mentor */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>
          Available Mentors
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.availableMentors.map((mentor) => (
            <div key={mentor.handle} className="bg-[#1E1826] border border-white/5 hover:border-white/10 rounded-2xl p-5 transition-all">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={mentor.avatar}
                      alt={mentor.name}
                      className="w-12 h-12 rounded-full"
                      onError={(e) => { e.currentTarget.src = 'https://github.com/github.png?size=64' }}
                    />
                    {mentor.online && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#4ADE80] border-2 border-[#1E1826]" />
                    )}
                  </div>
                  <div>
                    <div className="text-[14px] font-bold text-[#F8F8FF]">{mentor.name}</div>
                    <LevelBadge level={mentor.level} size="xs" />
                  </div>
                </div>
                <Shield className="h-4 w-4 text-[#4ADE80]" />
              </div>

              <div className="flex flex-wrap gap-1 mb-3">
                {mentor.specialties.map((spec) => (
                  <span key={spec} className="text-[9px] px-2 py-0.5 rounded-full bg-white/5 text-[#8B7E9F] border border-white/10">
                    {spec}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between text-[11px] text-[#8B7E9F] mb-3">
                <span>{mentor.reviewsCompleted} reviews completed</span>
                <span className="text-[#A78BFA] font-bold">{mentor.mentorXP} XP</span>
              </div>

              <button className="w-full px-4 py-2 rounded-lg bg-[#A78BFA] text-white text-[12px] font-bold hover:bg-[#8B5CF6] transition-colors">
                Request Review
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Your Review Requests */}
      {data.myRequests && data.myRequests.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Your Review Requests
          </h2>
          <div className="space-y-3">
            {data.myRequests.map((req) => (
              <div key={req.id} className="bg-[#1E1826] border border-white/5 rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-[14px] font-bold text-[#F8F8FF] mb-1">{req.prTitle}</h3>
                    <div className="flex items-center gap-2 text-[11px] text-[#8B7E9F]">
                      <span>{req.repo}</span>
                      <span>•</span>
                      <span>{formatDistanceToNow(new Date(req.requestedAt), { addSuffix: true })}</span>
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-widest ${
                    req.status === 'pending' ? 'bg-[#FACC15]/15 text-[#FACC15] border border-[#FACC15]/30' :
                    req.status === 'in_review' ? 'bg-[#A78BFA]/15 text-[#A78BFA] border border-[#A78BFA]/30' :
                    'bg-[#4ADE80]/15 text-[#4ADE80] border border-[#4ADE80]/30'
                  }`}>
                    {req.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

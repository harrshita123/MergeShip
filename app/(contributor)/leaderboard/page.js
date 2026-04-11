'use client'

import { useState, useEffect } from 'react'
import { Trophy, Star, TrendingUp, TrendingDown, Minus, GitCommit, Crown, Loader2, Sparkles } from 'lucide-react'
import { account } from '@/lib/appwrite'
import Topbar from '@/components/layout/Topbar'
import { getLeaderboardData } from './actions'

export default function LeaderboardPage() {
  const [timeframe, setTimeframe] = useState('all')
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState([])
  const [currentUserHandle, setCurrentUserHandle] = useState(null)
  const [currentUserRank, setCurrentUserRank] = useState(null)
  const [currentUserData, setCurrentUserData] = useState(null)
  const [isEmpty, setIsEmpty] = useState(false)
  const [error, setError] = useState(null)

  // Get current user handle
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('mergeship_handle')
          if (stored && alive) {
            setCurrentUserHandle(stored)
            return
          }
        }
        const ids = await account.listIdentities()
        const gh = (ids?.identities || []).find((i) => i.provider === 'github')
        if (gh?.providerUid) {
          const r = await fetch(`https://api.github.com/user/${gh.providerUid}`)
          if (r.ok) {
            const u = await r.json()
            if (u.login && alive) {
              setCurrentUserHandle(u.login)
            }
          }
        }
      } catch (e) {
        console.warn('Failed to get user handle:', e)
      }
    })()
    return () => { alive = false }
  }, [])

  // Fetch leaderboard data
  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    ;(async () => {
      const result = await getLeaderboardData(timeframe, currentUserHandle)
      if (!alive) return
      
      if (!result.success) {
        setError(result.error)
        setUsers([])
        setIsEmpty(true)
        setLoading(false)
        return
      }
      
      setUsers(result.users || [])
      setCurrentUserRank(result.currentUserRank)
      setCurrentUserData(result.currentUserData)
      setIsEmpty(result.isEmpty)
      setLoading(false)
    })()
    return () => { alive = false }
  }, [timeframe, currentUserHandle])

  const top3 = users.slice(0, 3)
  const rest = users.slice(3, 50) // Show top 50

  return (
    <>
      <Topbar
        title="Global Leaderboard"
        subtitle="Rankings are updated when users sync their data"
      />

      <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-10">
        {/* Live indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1E1826] border border-[#4ADE80]/30 rounded-full">
            <div className="w-2 h-2 rounded-full bg-[#4ADE80] animate-pulse" />
            <span className="text-[10px] font-bold text-[#4ADE80] uppercase tracking-widest">Live</span>
          </div>
          <span className="text-[11px] text-[#606080]">Real MergeShip users only</span>
        </div>

        {/* Timeframe toggle */}
        <div className="flex items-center justify-center gap-2 mb-10">
          <button
            onClick={() => setTimeframe('month')}
            className={`px-6 py-2 rounded-full text-[13px] font-bold tracking-wide transition-all ${
              timeframe === 'month'
                ? 'bg-[#A78BFA] text-white'
                : 'bg-[#1E1826] border border-white/5 text-[#A0A0C0] hover:border-white/15'
            }`}
          >
            This Month
          </button>
          <button
            onClick={() => setTimeframe('all')}
            className={`px-6 py-2 rounded-full text-[13px] font-bold tracking-wide transition-all ${
              timeframe === 'all'
                ? 'bg-[#A78BFA] text-white'
                : 'bg-[#1E1826] border border-white/5 text-[#A0A0C0] hover:border-white/15'
            }`}
          >
            All Time
          </button>
        </div>

        {/* Your Current Rank Banner */}
        {currentUserData && !loading && (
          <div className="bg-gradient-to-r from-[#A78BFA]/10 to-[#D8B4FE]/10 border border-[#A78BFA]/30 rounded-2xl p-6 mb-10">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#D8B4FE] mb-1">
                  Your Current Rank
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl font-extrabold text-[#F8F8FF]">#{currentUserRank}</span>
                  <span className="text-[14px] text-[#8B7E9F]">out of {users.length} contributors</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-[11px] text-[#8B7E9F] uppercase tracking-widest">Top</div>
                  <div className="text-2xl font-extrabold text-[#A78BFA]">{currentUserData.percentile}%</div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-[#8B7E9F] uppercase tracking-widest">Total XP</div>
                  <div className="text-2xl font-extrabold text-[#F8F8FF]">{currentUserData.totalXP.toLocaleString()}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {!currentUserData && currentUserHandle && !loading && !isEmpty && (
          <div className="bg-[#1E1826] border border-white/10 rounded-xl p-5 mb-10 text-center">
            <Sparkles className="h-6 w-6 mx-auto text-[#8B7E9F] mb-2" />
            <div className="text-[13px] text-[#8B7E9F]">
              You haven't earned XP yet. Complete issues to appear on the leaderboard!
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div>
            {/* Podium Skeleton */}
            <div className="flex items-end justify-center gap-4 mb-12">
              {[2, 1, 3].map((rank) => (
                <div
                  key={rank}
                  className={`${rank === 1 ? 'w-72 h-80' : 'w-64'} ${rank === 2 ? 'h-72' : rank === 3 ? 'h-64' : ''} bg-[#1E1826] border border-white/5 rounded-2xl animate-pulse`}
                />
              ))}
            </div>
            {/* Table Skeleton */}
            <div className="bg-[#1E1826] border border-white/5 rounded-2xl p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-white/5 rounded-lg animate-pulse" />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {isEmpty && !loading && (
          <div className="bg-[#1E1826] border border-white/5 rounded-2xl p-16 text-center">
            <Trophy className="h-12 w-12 mx-auto text-[#8B7E9F] mb-4" />
            <h3 className="text-xl font-extrabold text-[#F8F8FF] mb-2">Leaderboard is empty!</h3>
            <p className="text-[14px] text-[#8B7E9F] max-w-md mx-auto mb-6">
              Be the first contributor. Complete issues to earn XP and claim the #1 spot!
            </p>
            <button
              onClick={() => window.location.href = '/issues'}
              className="btn-primary inline-flex items-center gap-2"
            >
              🚀 Explore Issues
            </button>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-xl p-6 text-center">
            <div className="text-[14px] font-bold text-[#EF4444] mb-1">Failed to load leaderboard</div>
            <div className="text-[12px] text-[#F8F8FF]/70">{error}</div>
          </div>
        )}

        {/* Podium + Table */}
        {!loading && !isEmpty && users.length > 0 && (
          <>
            {/* Podium */}
            {top3.length > 0 && (
              <div className="flex items-end justify-center gap-4 mb-12">
                {/* Rank 2 - Left */}
                {top3[1] && <PodiumCard user={top3[1]} rank={2} color="#E2E8F0" height="h-72" width="w-64" />}
                
                {/* Rank 1 - Center */}
                {top3[0] && <PodiumCard user={top3[0]} rank={1} color="#FBBF24" height="h-80" width="w-72" isWinner />}
                
                {/* Rank 3 - Right */}
                {top3[2] && <PodiumCard user={top3[2]} rank={3} color="#D4A373" height="h-64" width="w-64" />}
              </div>
            )}

            {/* Table */}
            {rest.length > 0 && (
              <div className="bg-[#1E1826] border border-white/5 rounded-2xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="text-left p-4 text-[10px] font-black uppercase tracking-[0.22em] text-[#606080]">Rank</th>
                      <th className="text-left p-4 text-[10px] font-black uppercase tracking-[0.22em] text-[#606080]">Contributor</th>
                      <th className="text-left p-4 text-[10px] font-black uppercase tracking-[0.22em] text-[#606080]">Merged PRs</th>
                      <th className="text-left p-4 text-[10px] font-black uppercase tracking-[0.22em] text-[#606080]">Top Skill</th>
                      <th className="text-right p-4 text-[10px] font-black uppercase tracking-[0.22em] text-[#606080]">Total XP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rest.map((user) => (
                      <LeaderboardRow 
                        key={user.id} 
                        user={user}
                        isCurrentUser={user.githubHandle.toLowerCase() === currentUserHandle?.toLowerCase()}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}

/* ------------ Components ------------ */

function PodiumCard({ user, rank, color, height, width, isWinner }) {
  const crownColors = {
    1: '#FBBF24',
    2: '#E2E8F0',
    3: '#D4A373',
  }

  return (
    <div className={`${width} ${height} bg-[#1E1826] border border-white/5 rounded-2xl p-6 flex flex-col items-center justify-center relative overflow-hidden transition-transform hover:scale-105`}>
      {isWinner && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#FBBF24] via-[#FDE047] to-[#FBBF24]" />
      )}
      
      <Crown
        className="absolute top-4 right-4 h-6 w-6"
        style={{ color: crownColors[rank], opacity: isWinner ? 1 : 0.5 }}
      />

      <div
        className="text-7xl font-extrabold mb-4"
        style={{ color, textShadow: `0 0 20px ${color}40` }}
      >
        #{rank}
      </div>

      <img
        src={user.avatar}
        alt={user.githubHandle}
        className="w-20 h-20 rounded-full border-4 mb-3"
        style={{ borderColor: color }}
      />

      <div className="text-[14px] font-extrabold text-[#F8F8FF] mb-1 text-center">
        @{user.githubHandle}
      </div>
      
      <div className="text-[10px] uppercase tracking-widest text-[#8B7E9F] mb-3">
        {user.levelName}
      </div>

      <div className="flex items-center gap-2 mb-2">
        <Star className="h-4 w-4" style={{ color }} />
        <span className="text-2xl font-extrabold text-[#F8F8FF]">{user.totalXP.toLocaleString()}</span>
        <span className="text-[11px] text-[#8B7E9F]">XP</span>
      </div>

      <div className="text-[11px] text-[#8B7E9F]">
        {user.mergedPRs} PRs merged
      </div>
    </div>
  )
}

function LeaderboardRow({ user, isCurrentUser }) {
  const trendIcon = user.trend === 'up' ? <TrendingUp className="h-3 w-3 text-[#4ADE80]" /> 
    : user.trend === 'down' ? <TrendingDown className="h-3 w-3 text-[#EF4444]" /> 
    : <Minus className="h-3 w-3 text-[#8B7E9F]" />

  return (
    <tr className={`border-b border-white/5 hover:bg-white/5 transition-colors ${isCurrentUser ? 'bg-[#A78BFA]/10 border-[#A78BFA]/30' : ''}`}>
      <td className="p-4">
        <div className="flex items-center gap-2">
          <span className="text-[16px] font-extrabold text-[#F8F8FF]">#{user.rank}</span>
          {trendIcon}
        </div>
      </td>
      <td className="p-4">
        <div className="flex items-center gap-3">
          <img
            src={user.avatar}
            alt={user.githubHandle}
            className="w-10 h-10 rounded-full"
          />
          <div>
            <div className="text-[13px] font-bold text-[#F8F8FF]">@{user.githubHandle}</div>
            <div className="text-[10px] text-[#8B7E9F] uppercase tracking-widest">{user.levelName}</div>
          </div>
        </div>
      </td>
      <td className="p-4">
        <div className="flex items-center gap-1 text-[13px] text-[#A0A0C0]">
          <GitCommit className="h-3.5 w-3.5" />
          {user.mergedPRs}
        </div>
      </td>
      <td className="p-4">
        <span className="text-[12px] px-2.5 py-1 rounded-full bg-[#D8B4FE]/10 text-[#D8B4FE] border border-[#D8B4FE]/20">
          {user.topSkill}
        </span>
      </td>
      <td className="p-4 text-right">
        <div className="flex items-center justify-end gap-1">
          <Star className="h-3.5 w-3.5 text-[#FBBF24]" />
          <span className="text-[14px] font-extrabold text-[#F8F8FF]">{user.totalXP.toLocaleString()}</span>
        </div>
      </td>
    </tr>
  )
}

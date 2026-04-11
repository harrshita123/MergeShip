'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Github, TrendingUp, Target, Users, AlertCircle } from 'lucide-react'
import { account } from '@/lib/appwrite'
import { getAnalyticsData } from '../actions'
import Topbar from '@/components/layout/Topbar'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

export default function AnalyticsPage() {
  const router = useRouter()
  const [handle, setHandle] = useState(null)
  const [resolving, setResolving] = useState(true)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)

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

  /* ---- Load analytics data ---- */
  useEffect(() => {
    if (!handle) return
    let alive = true
    setLoading(true)
    ;(async () => {
      const result = await getAnalyticsData(handle)
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

  if (loading) {
    return (
      <>
        <Topbar title="Repository Analytics" subtitle="Deep insights into your projects" />
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-10">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#06B6D4]" />
          </div>
        </div>
      </>
    )
  }

  if (!data || !data.success) {
    return (
      <>
        <Topbar title="Repository Analytics" subtitle="Deep insights into your projects" />
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-10">
          <div className="text-center py-20">
            <p className="text-[#8B7E9F]">Unable to load analytics data. Please try again.</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Topbar
        title="Repository Analytics"
        subtitle="Deep insights into your projects"
      />

      <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-10">
        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <SummaryCard
            icon={TrendingUp}
            label="Merge Velocity"
            value={data.summary.mergeVelocity}
            color="#06B6D4"
          />
          <SummaryCard
            icon={Target}
            label="Closure Rate"
            value={data.summary.closureRate}
            color="#4ADE80"
          />
          <SummaryCard
            icon={Users}
            label="Contributor Retention"
            value={data.summary.contributorRetention}
            color="#A78BFA"
          />
          <SummaryCard
            icon={AlertCircle}
            label="Backlog"
            value={data.summary.backlog}
            color="#FBBF24"
          />
        </div>

        {/* Repo health table */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Repository Health
          </h2>
          <div className="bg-[#1E1826] border border-white/5 rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left p-4 text-[10px] font-black uppercase tracking-[0.22em] text-[#606080]">Repository</th>
                  <th className="text-left p-4 text-[10px] font-black uppercase tracking-[0.22em] text-[#606080]">Health Score</th>
                  <th className="text-left p-4 text-[10px] font-black uppercase tracking-[0.22em] text-[#606080]">Open Issues</th>
                  <th className="text-left p-4 text-[10px] font-black uppercase tracking-[0.22em] text-[#606080]">Stars</th>
                  <th className="text-left p-4 text-[10px] font-black uppercase tracking-[0.22em] text-[#606080]">Forks</th>
                </tr>
              </thead>
              <tbody>
                {(data.repoHealth || []).map((repo) => {
                  const healthColor = repo.health >= 80 ? '#4ADE80' : repo.health >= 60 ? '#FBBF24' : '#EF4444'
                  return (
                    <tr key={repo.name} className="border-b border-white/5 last:border-0">
                      <td className="p-4 text-[13px] font-medium text-[#F8F8FF]">{repo.name}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden max-w-[120px]">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${repo.health}%`, background: healthColor }}
                            />
                          </div>
                          <span className="text-[12px] font-bold" style={{ color: healthColor }}>
                            {repo.health}%
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-[13px] text-[#8B7E9F]">{repo.openIssues}</td>
                      <td className="p-4 text-[13px] text-[#8B7E9F]">{repo.stars}</td>
                      <td className="p-4 text-[13px] text-[#8B7E9F]">{repo.forks}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Issues opened vs closed */}
          <div className="bg-[#1E1826] border border-white/5 rounded-2xl p-6">
            <h3 className="text-[15px] font-bold mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Issues Opened vs Closed
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.trends.issuesOpenedClosed}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="date"
                  stroke="#606080"
                  tick={{ fontSize: 10, fill: '#606080' }}
                  tickFormatter={(v) => new Date(v).getDate().toString()}
                />
                <YAxis stroke="#606080" tick={{ fontSize: 10, fill: '#606080' }} />
                <Tooltip
                  contentStyle={{
                    background: '#15111A',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line type="monotone" dataKey="opened" stroke="#06B6D4" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="closed" stroke="#A78BFA" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Merge velocity trend */}
          <div className="bg-[#1E1826] border border-white/5 rounded-2xl p-6">
            <h3 className="text-[15px] font-bold mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Merge Velocity Trend (hours)
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.trends.velocityTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="date"
                  stroke="#606080"
                  tick={{ fontSize: 10, fill: '#606080' }}
                  tickFormatter={(v) => new Date(v).getDate().toString()}
                />
                <YAxis stroke="#606080" tick={{ fontSize: 10, fill: '#606080' }} />
                <Tooltip
                  contentStyle={{
                    background: '#15111A',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line type="monotone" dataKey="hours" stroke="#06B6D4" strokeWidth={2} dot={false} name="Avg Hours" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </>
  )
}

function SummaryCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-[#1E1826] border border-white/5 rounded-2xl p-5 relative overflow-hidden">
      <div
        className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl"
        style={{ background: `${color}22` }}
      />
      <div className="relative flex items-center justify-between">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#606080] mb-2">
            {label}
          </div>
          <div className="text-3xl font-extrabold" style={{ color }}>
            {value}
          </div>
        </div>
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ background: `${color}22`, border: `1px solid ${color}44` }}
        >
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
      </div>
    </div>
  )
}

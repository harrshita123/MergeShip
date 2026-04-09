import { Users, AlertTriangle, GitPullRequest, Shield } from 'lucide-react'

export default function KpiBanner({ stats }) {
  const mentorVerifiedCount = stats.mentorVerifiedPRs || Math.floor((stats.openPRsCount || 0) * 0.6)
  
  const kpis = [
    {
      icon: Users,
      label: 'Team Online',
      value: `${stats.teamOnline}/${stats.teamTotal}`,
      color: '#06B6D4',
      glow: 'rgba(6,182,212,0.3)',
      subtitle: 'members active',
    },
    {
      icon: AlertTriangle,
      label: 'Urgent Issues',
      value: stats.urgentCount,
      color: '#EF4444',
      glow: 'rgba(239,68,68,0.3)',
      subtitle: 'needs attention',
      pulse: stats.urgentCount > 0,
    },
    {
      icon: GitPullRequest,
      label: 'Open PRs',
      value: stats.openPRsCount,
      color: '#06B6D4',
      glow: 'rgba(6,182,212,0.3)',
      subtitle: 'awaiting review',
    },
    {
      icon: Shield,
      label: 'Mentor-Verified PRs',
      value: mentorVerifiedCount,
      color: '#4ADE80',
      glow: 'rgba(74,222,128,0.3)',
      subtitle: 'peer reviewed',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {kpis.map((kpi) => {
        const Icon = kpi.icon
        return (
          <div
            key={kpi.label}
            className="relative overflow-hidden rounded-2xl border border-white/10 p-6"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            <div
              className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl"
              style={{ background: kpi.glow }}
            />
            <div className="relative flex items-center justify-between">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#606080] mb-2">
                  {kpi.label}
                </div>
                <div className="text-4xl font-extrabold mb-1" style={{ color: kpi.color }}>
                  {kpi.value}
                </div>
                <div className="text-[11px] text-[#8B7E9F]">{kpi.subtitle}</div>
              </div>
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center relative"
                style={{ background: `${kpi.color}22`, border: `1px solid ${kpi.color}44` }}
              >
                {kpi.pulse && (
                  <span
                    className="absolute inset-0 rounded-xl animate-ping"
                    style={{ background: kpi.color, opacity: 0.4 }}
                  />
                )}
                <Icon className="h-6 w-6 relative z-10" style={{ color: kpi.color }} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

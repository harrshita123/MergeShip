import { Clock, AlertCircle, TrendingUp, Users, Zap, Timer } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export default function StaleIssues({ issues, todayStats }) {
  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>
          Stale Issues (30+ days)
        </h2>
        <span className="text-[11px] text-[#606080] uppercase tracking-widest font-bold">
          {issues.length} issue{issues.length === 1 ? '' : 's'}
        </span>
      </div>

      {issues.length === 0 ? (
        <div className="bg-[#1E1826] border border-white/5 rounded-xl p-8 text-center text-[#8B7E9F]">
          <Clock className="h-6 w-6 mx-auto mb-2 opacity-50" />
          <p>No stale issues — great job! 🎉</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {issues.map((issue) => {
            const daysSinceUpdate = issue.updated_at
              ? Math.floor((Date.now() - new Date(issue.updated_at).getTime()) / (24 * 60 * 60 * 1000))
              : 0

            return (
              <a
                key={`${issue.repo}#${issue.number}`}
                href={issue.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block group"
              >
                <div className="bg-[#1E1826] border border-white/5 hover:border-[#FBBF24]/30 rounded-xl p-4 transition-all hover:-translate-y-0.5">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-[13px] font-bold text-[#F8F8FF] line-clamp-2 flex-1">
                      {issue.title}
                    </h3>
                    <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-[#FBBF24]/15 text-[#FBBF24] border border-[#FBBF24]/30 whitespace-nowrap">
                      {daysSinceUpdate}d ago
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-[#8B7E9F]">
                    <span>{issue.repo}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      #{issue.number}
                    </span>
                  </div>
                </div>
              </a>
            )
          })}
        </div>
      )}

      {todayStats && (
        <div className="mt-6">
          <TodayStats stats={todayStats} />
        </div>
      )}
    </div>
  )
}

function TodayStats({ stats }) {
  const items = [
    { icon: TrendingUp, label: 'New Issues', value: stats.newIssuesToday, color: '#06B6D4' },
    { icon: AlertCircle, label: 'PRs Merged', value: stats.prsMergedToday, color: '#4ADE80' },
    { icon: Clock, label: 'Issues Closed', value: stats.issuesClosedToday, color: '#A78BFA' },
    { icon: Users, label: 'Active Contributors', value: stats.activeContributors, color: '#FBBF24' },
    { icon: Timer, label: 'Avg Response Time', value: stats.avgResponseTime, color: '#06B6D4' },
  ]

  return (
    <div className="bg-[#1E1826] border border-white/5 rounded-xl p-5">
      <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#606080] mb-4">
        Today's Activity
      </div>
      <div className="space-y-3">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <div key={item.label} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon className="h-3.5 w-3.5" style={{ color: item.color }} />
                <span className="text-[12px] text-[#8B7E9F]">{item.label}</span>
              </div>
              <span className="text-[13px] font-bold" style={{ color: item.color }}>
                {item.value}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

import { Activity, TrendingUp, GitCommit, GitPullRequest, AlertCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export function RepoHealthMini({ repos }) {
  if (!repos || repos.length === 0) return null

  return (
    <div className="bg-[#1E1826] border border-white/5 rounded-xl p-5 mb-4">
      <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#606080] mb-4">
        Repo Health
      </div>
      <div className="space-y-3">
        {repos.slice(0, 5).map((repo) => {
          const health = repo.health || 75
          const color = health >= 80 ? '#4ADE80' : health >= 60 ? '#FBBF24' : '#EF4444'
          
          return (
            <div key={repo.name}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-[#F8F8FF] truncate">{repo.name}</span>
                <span className="text-[10px] font-bold" style={{ color }}>{health}%</span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${health}%`, background: color }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function TeamSnapshot({ members }) {
  if (!members || members.length === 0) return null

  return (
    <div className="bg-[#1E1826] border border-white/5 rounded-xl p-5 mb-4">
      <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#606080] mb-4">
        Team Snapshot
      </div>
      <div className="space-y-3">
        {members.slice(0, 6).map((member) => {
          const workloadColor = member.workload >= 80 ? '#EF4444' : member.workload >= 50 ? '#FBBF24' : '#06B6D4'
          
          return (
            <div key={member.login} className="flex items-center gap-3">
              <div className="relative">
                <img
                  src={member.avatar || `https://github.com/${member.login}.png?size=64`}
                  alt={member.login}
                  className="w-8 h-8 rounded-full"
                  onError={(e) => { e.currentTarget.src = 'https://github.com/github.png?size=64' }}
                />
                {member.online && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#4ADE80] border-2 border-[#1E1826]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-[#F8F8FF] truncate">{member.login}</span>
                  <span className="text-[9px] text-[#8B7E9F]">{member.role}</span>
                </div>
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${member.workload}%`, background: workloadColor }}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function ActivityFeed({ events }) {
  if (!events || events.length === 0) return null

  const getEventIcon = (type) => {
    if (type === 'PushEvent') return GitCommit
    if (type === 'PullRequestEvent') return GitPullRequest
    if (type === 'IssuesEvent') return AlertCircle
    return Activity
  }

  const getEventColor = (type) => {
    if (type === 'PushEvent') return '#06B6D4'
    if (type === 'PullRequestEvent') return '#A78BFA'
    if (type === 'IssuesEvent') return '#FBBF24'
    return '#8B7E9F'
  }

  const getEventLabel = (event) => {
    if (event.type === 'PushEvent') return `pushed to ${event.repo}`
    if (event.type === 'PullRequestEvent') return `${event.payload?.action || 'opened'} PR in ${event.repo}`
    if (event.type === 'IssuesEvent') return `${event.payload?.action || 'opened'} issue in ${event.repo}`
    return event.type.replace('Event', '')
  }

  return (
    <div className="bg-[#1E1826] border border-white/5 rounded-xl p-5">
      <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#606080] mb-4">
        Activity Feed
      </div>
      <div className="space-y-3">
        {events.slice(0, 8).map((event, idx) => {
          const Icon = getEventIcon(event.type)
          const color = getEventColor(event.type)
          
          return (
            <div key={`${event.type}-${idx}`} className="flex items-start gap-2">
              <div
                className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: `${color}22` }}
              >
                <Icon className="h-3 w-3" style={{ color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-[#F8F8FF] leading-tight mb-1">
                  <span className="font-bold">{event.actor}</span>{' '}
                  <span className="text-[#8B7E9F]">{getEventLabel(event)}</span>
                </p>
                {event.created_at && (
                  <span className="text-[9px] text-[#606080]">
                    {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

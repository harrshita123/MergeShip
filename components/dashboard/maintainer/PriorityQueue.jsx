import { AlertCircle, MessageSquare, ExternalLink, Clock, Shield } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import LevelBadge from '../LevelBadge'

export default function PriorityQueue({ issues }) {
  if (!issues || issues.length === 0) {
    return (
      <div className="text-center py-12 text-[#8B7E9F]">
        <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No urgent issues at the moment 🎉</p>
      </div>
    )
  }

  // Smart sorting: mentor-reviewed first, then by level
  const sorted = [...issues].sort((a, b) => {
    // Mentor-reviewed PRs first
    if (a.mentorReviewed && !b.mentorReviewed) return -1
    if (!a.mentorReviewed && b.mentorReviewed) return 1
    
    // Then by contributor level (higher first)
    const levelA = a.contributorLevel || 0
    const levelB = b.contributorLevel || 0
    if (levelA !== levelB) return levelB - levelA
    
    // Then by urgency
    if (a.isUrgent && !b.isUrgent) return -1
    if (!a.isUrgent && b.isUrgent) return 1
    
    return 0
  })

  return (
    <div className="space-y-3">
      {sorted.map((issue) => {
        const priorityColor = issue.isUrgent ? '#EF4444' : '#FBBF24'
        const priorityLabel = issue.isUrgent ? 'Critical' : 'High'
        const contributorLevel = issue.contributorLevel || 1
        const mentorReviewed = issue.mentorReviewed
        const mentorLevel = issue.mentorLevel || 2
        
        return (
          <a
            key={issue.number}
            href={issue.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block group"
          >
            <div className="bg-[#1E1826] border border-white/5 hover:border-[#06B6D4]/30 rounded-xl p-4 transition-all hover:-translate-y-0.5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest"
                    style={{ background: `${priorityColor}22`, color: priorityColor, border: `1px solid ${priorityColor}44` }}
                  >
                    {priorityLabel}
                  </span>
                  <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest bg-[#06B6D4]/15 text-[#06B6D4] border border-[#06B6D4]/30">
                    {issue.category}
                  </span>
                  {mentorReviewed && (
                    <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest bg-[#4ADE80]/15 text-[#4ADE80] border border-[#4ADE80]/30 flex items-center gap-1">
                      <Shield className="h-2.5 w-2.5" />
                      ✓ Reviewed by L{mentorLevel} Mentor
                    </span>
                  )}
                  {!mentorReviewed && contributorLevel === 1 && (
                    <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest bg-[#FBBF24]/15 text-[#FBBF24] border border-[#FBBF24]/30">
                      ⚠ No peer review
                    </span>
                  )}
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-[#606080] group-hover:text-[#06B6D4] transition-colors" />
              </div>

              <h3 className="text-[14px] font-bold text-[#F8F8FF] mb-2 line-clamp-2">
                {issue.title}
              </h3>

              {issue.body && (
                <p className="text-[12px] text-[#8B7E9F] mb-3 line-clamp-2">
                  {issue.body}
                </p>
              )}

              <div className="flex items-center justify-between text-[11px] text-[#8B7E9F]">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5">
                    <img
                      src={issue.user?.avatar_url || `https://github.com/${issue.user?.login}.png?size=32`}
                      alt=""
                      className="w-4 h-4 rounded-full"
                      onError={(e) => { e.currentTarget.style.visibility = 'hidden' }}
                    />
                    {issue.user?.login}
                    <LevelBadge level={contributorLevel} size="xs" />
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" /> {issue.comments || 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {issue.created_at && formatDistanceToNow(new Date(issue.created_at), { addSuffix: true })}
                  </span>
                </div>
                <span className="text-[10px] text-[#606080]">{issue.repo}</span>
              </div>
            </div>
          </a>
        )
      })}
    </div>
  )
}

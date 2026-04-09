import { GitPullRequest, Plus, Minus, ExternalLink, CheckCircle, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export default function OpenPRs({ prs }) {
  if (!prs || prs.length === 0) {
    return (
      <div className="text-center py-12 text-[#8B7E9F]">
        <GitPullRequest className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No open pull requests</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {prs.map((pr) => {
        const statusColor = pr.mergeable_state === 'clean' ? '#4ADE80' : '#FBBF24'
        const statusLabel = pr.mergeable_state === 'clean' ? 'Approved' : 'Pending'

        return (
          <a
            key={pr.number}
            href={pr.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block group"
          >
            <div className="bg-[#1E1826] border border-white/5 hover:border-[#06B6D4]/30 rounded-xl p-4 transition-all hover:-translate-y-0.5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <GitPullRequest className="h-4 w-4 text-[#06B6D4]" />
                  <span
                    className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest"
                    style={{ background: `${statusColor}22`, color: statusColor, border: `1px solid ${statusColor}44` }}
                  >
                    {statusLabel}
                  </span>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-[#606080] group-hover:text-[#06B6D4] transition-colors" />
              </div>

              <h3 className="text-[14px] font-bold text-[#F8F8FF] mb-3 line-clamp-2">
                {pr.title}
              </h3>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-[11px]">
                  <span className="flex items-center gap-1">
                    <img
                      src={pr.user?.avatar_url || `https://github.com/${pr.user?.login}.png?size=32`}
                      alt=""
                      className="w-4 h-4 rounded-full"
                      onError={(e) => { e.currentTarget.style.visibility = 'hidden' }}
                    />
                    <span className="text-[#8B7E9F]">{pr.user?.login}</span>
                  </span>
                  <span className="flex items-center gap-1 text-[#4ADE80]">
                    <Plus className="h-3 w-3" /> {pr.additions || 0}
                  </span>
                  <span className="flex items-center gap-1 text-[#EF4444]">
                    <Minus className="h-3 w-3" /> {pr.deletions || 0}
                  </span>
                  {pr.created_at && (
                    <span className="flex items-center gap-1 text-[#8B7E9F]">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(pr.created_at), { addSuffix: true })}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-[#606080]">{pr.repo}</span>
              </div>
            </div>
          </a>
        )
      })}
    </div>
  )
}

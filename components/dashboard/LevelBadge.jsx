import { LEVEL_CONFIG } from '@/lib/levels'

export default function LevelBadge({ level, size = 'md', showName = false, className = '' }) {
  const config = LEVEL_CONFIG[level] || LEVEL_CONFIG[0]
  
  const sizeClasses = {
    xs: 'text-[8px] px-1.5 py-0.5',
    sm: 'text-[9px] px-2 py-0.5',
    md: 'text-[10px] px-2 py-1',
    lg: 'text-[11px] px-3 py-1',
  }
  
  return (
    <span
      className={`inline-flex items-center rounded-full font-black uppercase tracking-widest border ${config.bgClass} ${config.textClass} ${config.borderClass} ${sizeClasses[size]} ${className}`}
      style={config.glow ? { boxShadow: `0 0 12px ${config.color}66` } : {}}
    >
      {showName ? config.name : config.short}
    </span>
  )
}

export function LevelProgress({ levelInfo, className = '' }) {
  const { level, name, progressPercent, xpEarned, xpRequired, xpToNextLevel, color } = levelInfo
  
  return (
    <div className={`${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <LevelBadge level={level} size="lg" showName />
          <span className="text-[11px] text-[#8B7E9F]">
            {level < 3 ? `${xpToNextLevel} XP to Level ${level + 1}` : 'Max Level'}
          </span>
        </div>
        <span className="text-[12px] font-bold" style={{ color }}>
          {xpEarned.toLocaleString()} XP
        </span>
      </div>
      
      {level < 3 && (
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${progressPercent}%`, background: color }}
          />
        </div>
      )}
    </div>
  )
}

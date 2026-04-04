// Shape references for app data structures (JS doesn't enforce these at runtime,
// but they document expected fields for Appwrite documents and UI state).

// UserStats
//   level: string (e.g., 'L3 Intermediate')
//   progress: number (0-100)
//   totalXP: string (e.g., '12,450')
//   displayXP: string
//   streak: number
//   activeDays: number
//   repos: number
//   followers: number
//   contributions: number
//   claimedBadges: string[]

// BaseIssue: { id, title, repo, difficulty ('EASY'|'MEDIUM'|'HARD'),
//              xpReward, labels: string[], time, url, highlight }

// AchievementBadge: { id, title, emoji, description, xpReward, unlocked,
//                     progress, target }

// CommunityGroup: { id, name, level, members, weeklyChallenge }

// MaintainerData: { repoName, openIssues, openPRs, teamOnline, urgentCount }

export const DIFFICULTY = {
  EASY: 'EASY',
  MEDIUM: 'MEDIUM',
  HARD: 'HARD',
  EXPERT: 'EXPERT',
};

export const PRIORITY = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
};

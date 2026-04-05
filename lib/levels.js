/**
 * Level System for MergeShip
 * 
 * Level 0 (NEWCOMER): Just signed up, no activity → Course only
 * Level 1 (BEGINNER): Course completed OR has GitHub activity → EASY issues
 * Level 2 (INTERMEDIATE): Significant GitHub activity OR earned XP → EASY + MEDIUM
 * Level 3 (EXPERT): Level 2 + 5000+ XP from solving L2 issues → All issues
 */

export const LEVEL_CONFIG = {
  0: {
    name: 'NEWCOMER',
    short: 'L0',
    color: '#9CA3AF',
    bgClass: 'bg-gray-800',
    textClass: 'text-gray-400',
    borderClass: 'border-gray-600',
    minXP: 0,
    maxXP: 0,
    issueAccess: [],
    description: 'Complete foundational course to unlock issues',
  },
  1: {
    name: 'BEGINNER',
    short: 'L1',
    color: '#4ADE80',
    bgClass: 'bg-green-900/50',
    textClass: 'text-green-400',
    borderClass: 'border-green-500/30',
    minXP: 0,
    maxXP: 2000,
    issueAccess: ['EASY'],
    description: 'Solve easy issues to level up',
  },
  2: {
    name: 'INTERMEDIATE',
    short: 'L2',
    color: '#A78BFA',
    bgClass: 'bg-purple-900/50',
    textClass: 'text-purple-400',
    borderClass: 'border-purple-500/30',
    minXP: 2000,
    maxXP: 5000,
    issueAccess: ['EASY', 'MEDIUM'],
    description: 'Tackle medium complexity issues',
  },
  3: {
    name: 'EXPERT',
    short: 'L3',
    color: '#FBBF24',
    bgClass: 'bg-amber-900/50',
    textClass: 'text-amber-400',
    borderClass: 'border-amber-500/30',
    minXP: 5000,
    maxXP: null,
    issueAccess: ['EASY', 'MEDIUM', 'HARD'],
    description: 'Master of complex challenges',
    glow: true,
  },
}

export function calculateUserLevel(stats) {
  const {
    courseCompleted = false,
    xpEarned = 0,
    commits = 0,
    mergedPRs = 0,
    repos = 0,
  } = stats || {}

  // Level 0: No activity and course not completed
  if (!courseCompleted && commits === 0 && mergedPRs === 0) {
    return 0
  }

  // Level 1: Course completed OR has some GitHub activity
  if (courseCompleted || commits > 0 || mergedPRs > 0) {
    // Check if qualifies for Level 2 auto-placement
    const hasSignificantActivity = commits >= 100 && mergedPRs >= 10
    
    if (hasSignificantActivity && xpEarned < 2000) {
      // Auto-place at Level 2 (experienced user, but cap at L2)
      return 2
    }
  }

  // XP-based progression
  if (xpEarned >= 5000) return 3
  if (xpEarned >= 2000) return 2
  if (xpEarned > 0 || courseCompleted) return 1
  
  return 0
}

export function getUserLevelInfo(stats) {
  const level = calculateUserLevel(stats)
  const config = LEVEL_CONFIG[level]
  const xpEarned = stats?.xpEarned || 0
  
  let xpToNextLevel = 0
  let xpRequired = 0
  let progressPercent = 0
  
  if (level < 3) {
    const nextConfig = LEVEL_CONFIG[level + 1]
    xpRequired = nextConfig.minXP
    xpToNextLevel = xpRequired - xpEarned
    progressPercent = Math.min(100, Math.floor((xpEarned / xpRequired) * 100))
  } else {
    progressPercent = 100
  }
  
  return {
    level,
    ...config,
    xpEarned,
    xpToNextLevel: Math.max(0, xpToNextLevel),
    xpRequired,
    progressPercent,
    canAccessIssues: level > 0,
  }
}

export function canAccessDifficulty(level, difficulty) {
  const config = LEVEL_CONFIG[level]
  return config?.issueAccess?.includes(difficulty.toUpperCase()) || false
}

export function getMentorEligibility(level) {
  return {
    canMentor: level >= 2,
    canMentorLevels: level >= 3 ? [1, 2] : level === 2 ? [1] : [],
    needsMentor: level <= 2,
    canRequestMentorFrom: level === 2 ? [3] : level === 1 ? [2, 3] : [],
  }
}

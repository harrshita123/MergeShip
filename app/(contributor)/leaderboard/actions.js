'use server'

/**
 * Phase 10: Real Leaderboard with Appwrite Users
 * Shows only registered MergeShip users ranked by XP
 */

import { Client, Databases, Query } from 'node-appwrite'

const DATABASE_ID = '69e12a90002821b7a144'
const COLLECTION_ID = 'user_stats'

/**
 * Initialize Appwrite client for server-side operations
 */
function getAppwriteClient() {
  if (!process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 
      !process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || 
      !process.env.APPWRITE_API_KEY) {
    throw new Error('Missing required Appwrite environment variables')
  }
  
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY)
  
  return new Databases(client)
}

/**
 * Parse user stats from statsJson string
 */
function parseUserStats(doc) {
  let stats = {}
  try {
    stats = JSON.parse(doc.statsJson || '{}')
  } catch (e) {
    console.warn(`[parseUserStats] Failed to parse statsJson for ${doc.githubHandle}:`, e)
    stats = {}
  }
  
  return {
    id: doc.$id,
    githubHandle: doc.githubHandle,
    avatar: `https://github.com/${doc.githubHandle}.png`,
    totalXP: stats.totalXP || stats.xpEarned || stats.score || 0,
    level: stats.userLevel || stats.level || 1,
    levelName: stats.levelName || getLevelName(stats.userLevel || stats.level || 1),
    mergedPRs: stats.mergedPRs || stats.contributions || 0,
    topSkill: stats.topLanguage || stats.topSkill || stats.primaryTech || 'N/A',
    lastActive: doc.$updatedAt || doc.lastSync,
    currentStreak: stats.currentStreak || 0,
    contributions: stats.totalContributions || stats.contributions || 0
  }
}

/**
 * Get level name from level number
 */
function getLevelName(level) {
  if (level === 0) return 'NEWCOMER'
  if (level === 1) return 'L1 Beginner'
  if (level === 2) return 'L2 Intermediate'
  if (level === 3) return 'L3 Advanced'
  if (level === 4) return 'L4 Expert'
  if (level >= 5) return 'L5 Mentor'
  return 'NEWCOMER'
}

/**
 * Filter users by timeframe
 */
function filterByTimeframe(users, timeframe) {
  if (timeframe === 'all') {
    return users
  }
  
  // "month" - filter by last active this month
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  
  return users.filter(user => {
    if (!user.lastActive) return false
    
    const lastActive = new Date(user.lastActive)
    return lastActive.getMonth() === currentMonth && lastActive.getFullYear() === currentYear
  })
}

/**
 * Main action: Get leaderboard data from Appwrite
 */
export async function getLeaderboardData(timeframe = 'all', currentUserHandle = null) {
  try {
    const databases = getAppwriteClient()
    
    // Fetch all user documents
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTION_ID,
      [
        Query.limit(100), // Get top 100 users
        Query.orderDesc('$updatedAt')
      ]
    )
    
    // Parse statsJson from each user and extract data
    let users = response.documents
      .map(doc => parseUserStats(doc))
      .filter(user => user.totalXP > 0) // Only include users with XP
    
    // Filter by timeframe
    users = filterByTimeframe(users, timeframe)
    
    // Sort by XP (descending)
    users.sort((a, b) => b.totalXP - a.totalXP)
    
    // Assign ranks and calculate trends
    const ranked = users.map((user, idx) => {
      // Calculate percentile
      const percentile = users.length > 0 
        ? Math.ceil((1 - idx / users.length) * 100)
        : 0
      
      return {
        ...user,
        rank: idx + 1,
        trend: 'stable', // TODO: Track trends over time
        percentile
      }
    })
    
    // Find current user's rank
    let currentUserRank = null
    let currentUserData = null
    if (currentUserHandle) {
      const userIndex = ranked.findIndex(u => 
        u.githubHandle.toLowerCase() === currentUserHandle.toLowerCase()
      )
      if (userIndex !== -1) {
        currentUserRank = userIndex + 1
        currentUserData = ranked[userIndex]
      }
    }
    
    return {
      success: true,
      users: ranked,
      totalUsers: ranked.length,
      currentUserRank,
      currentUserData,
      timeframe,
      lastUpdated: new Date().toISOString(),
      isEmpty: ranked.length === 0
    }
    
  } catch (error) {
    console.error('[getLeaderboardData] Error:', error)
    return {
      success: false,
      error: error.message || 'Failed to fetch leaderboard data',
      users: [],
      totalUsers: 0,
      isEmpty: true
    }
  }
}

/**
 * Get user's current rank and stats
 */
export async function getUserRank(githubHandle) {
  try {
    const result = await getLeaderboardData('all', githubHandle)
    
    if (!result.success) {
      return {
        success: false,
        error: result.error
      }
    }
    
    if (!result.currentUserData) {
      return {
        success: true,
        found: false,
        message: 'You haven\'t earned XP yet. Complete issues to appear on the leaderboard!'
      }
    }
    
    return {
      success: true,
      found: true,
      rank: result.currentUserRank,
      percentile: result.currentUserData.percentile,
      totalUsers: result.totalUsers,
      user: result.currentUserData
    }
    
  } catch (error) {
    console.error('[getUserRank] Error:', error)
    return {
      success: false,
      error: error.message || 'Failed to fetch user rank'
    }
  }
}

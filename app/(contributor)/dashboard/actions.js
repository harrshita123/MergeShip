'use server'

import { serverDatabases, ID, Query } from '@/lib/appwrite-server'
import { calculateUserLevel, getUserLevelInfo, canAccessDifficulty } from '@/lib/levels'

// Appwrite Database Configuration
// Database ID: 69e12a90002821b7a144
// Collection ID: user_stats
// IMPORTANT: Collection permissions must allow "Any" role to Read, Create, and Update
// See /app/APPWRITE_SETUP.md for detailed setup instructions
const DATABASE_ID = '69e12a90002821b7a144'
const COLLECTION_ID = 'user_stats'
const CACHE_TTL = 1000 * 60 * 60 // 1 hour

/* =========================================================
 *                 GITHUB HELPERS
 * ========================================================= */
function ghHeaders(token) {
  const h = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'MergeShip',
    'X-GitHub-Api-Version': '2022-11-28',
  }
  if (token) h.Authorization = `Bearer ${token}`
  return h
}

async function ghFetch(url, token) {
  try {
    const res = await fetch(url, { headers: ghHeaders(token), cache: 'no-store' })
    if (!res.ok) return null
    return await res.json()
  } catch (e) {
    return null
  }
}

/* =========================================================
 *                 APPWRITE CACHE HELPERS
 * ========================================================= */
async function getAppwriteUserStats(handle) {
  const key = String(handle || '').toLowerCase()
  if (!key) return null
  try {
    const list = await serverDatabases.listDocuments(DATABASE_ID, COLLECTION_ID, [
      Query.equal('githubHandle', key),
      Query.limit(1),
    ])
    return list.documents?.[0] || null
  } catch (e) {
    // Collection may not exist / attribute missing
    return null
  }
}

async function updateAppwriteUserStats(handle, data) {
  const key = String(handle || '').toLowerCase()
  if (!key) return null
  const payload = {
    githubHandle: key,  // Fixed: was 'handle', should be 'githubHandle'
    lastSync: Date.now(),
    ...data,
  }
  try {
    const existing = await getAppwriteUserStats(key)
    // Preserve claimedBadges if present and not overwritten
    if (existing?.claimedBadges && !payload.claimedBadges) {
      payload.claimedBadges = existing.claimedBadges
    }
    if (existing) {
      return await serverDatabases.updateDocument(
        DATABASE_ID, COLLECTION_ID, existing.$id, payload
      )
    }
    return await serverDatabases.createDocument(
      DATABASE_ID, COLLECTION_ID, ID.unique(), payload
    )
  } catch (e) {
    // DB not configured — log and move on
    console.warn('[appwrite cache] skipped:', e?.message || e)
    return null
  }
}

function safeParse(json, fallback) {
  if (!json || typeof json !== 'string') return fallback
  try { return JSON.parse(json) } catch { return fallback }
}

/* =========================================================
 *                 LEVEL / XP MAPPING
 * ========================================================= */
function computeLevel(contributions) {
  if (contributions >= 300) {
    const xp = contributions * 10
    const base = 300 * 10
    const span = 700 * 10
    const progress = Math.min(100, Math.round(((xp - base) / span) * 100))
    return { level: 'L3 Expert', levelNum: 3, progress, nextLevel: 'L4 Master' }
  }
  if (contributions >= 100) {
    const xp = contributions * 10
    const base = 100 * 10
    const span = 200 * 10
    const progress = Math.min(100, Math.round(((xp - base) / span) * 100))
    return { level: 'L2 Intermediate', levelNum: 2, progress, nextLevel: 'L3 Expert' }
  }
  const xp = Math.max(0, contributions) * 10
  const progress = Math.min(100, Math.round((xp / 1000) * 100))
  return { level: 'L1 Beginner', levelNum: 1, progress, nextLevel: 'L2 Intermediate' }
}

function formatXP(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

/* =========================================================
 *       ACTION 1: getDashboardData
 * ========================================================= */
export async function getDashboardData(githubHandle, forceSync = false, token) {
  const handle = String(githubHandle || '').trim()
  if (!handle) {
    return { success: false, error: 'missing handle', stats: emptyStats() }
  }

  const cached = await getAppwriteUserStats(handle)
  if (!forceSync && cached?.lastSync && Date.now() - Number(cached.lastSync) < CACHE_TTL) {
    const stats = safeParse(cached.statsJson, null)
    if (stats) return { success: true, stats, cached: true }
  }

  // --- Fetch GitHub live ---
  const userInfo = await ghFetch(`https://api.github.com/users/${handle}`, token)
  const events   = await ghFetch(`https://api.github.com/users/${handle}/events/public?per_page=100`, token)

  let total = 0
  let activeDays = 0
  try {
    const hm = await fetch(
      `https://github-contributions-api.jogruber.de/v4/${handle}?y=last`,
      { cache: 'no-store' }
    )
    if (hm.ok) {
      const data = await hm.json()
      const contribs = data?.contributions || []
      total = contribs.reduce((a, c) => a + (c.count || 0), 0)
      activeDays = contribs.filter((c) => (c.count || 0) > 0).length
    }
  } catch {}

  const streak = computeStreak(Array.isArray(events) ? events : [])
  const { level, levelNum, progress, nextLevel } = computeLevel(total)
  const totalXP = Math.max(0, total) * 10

  // Calculate user level using the new 4-tier system
  const mergedPRsCount = (Array.isArray(events) ? events : []).filter(e => 
    e.type === 'PullRequestEvent' && e.payload?.pull_request?.merged
  ).length
  
  const levelData = calculateUserLevel({
    courseCompleted: cached ? safeParse(cached.statsJson, {})?.courseCompleted || false : false,
    xpEarned: cached ? safeParse(cached.statsJson, {})?.xpEarned || 0 : 0,
    commits: total,
    mergedPRs: mergedPRsCount,
    repos: userInfo?.public_repos || 0,
  })
  
  const levelInfo = getUserLevelInfo({
    courseCompleted: cached ? safeParse(cached.statsJson, {})?.courseCompleted || false : false,
    xpEarned: cached ? safeParse(cached.statsJson, {})?.xpEarned || 0 : 0,
    commits: total,
    mergedPRs: mergedPRsCount,
    repos: userInfo?.public_repos || 0,
  })

  const stats = {
    level,
    levelNum,
    nextLevel,
    progress,
    totalXP: formatXP(totalXP),
    displayXP: totalXP.toLocaleString(),
    rawXP: totalXP,
    // New level system fields
    userLevel: levelData,
    levelName: levelInfo.name,
    levelColor: levelInfo.color,
    xpToNextLevel: levelInfo.xpToNextLevel,
    xpRequired: levelInfo.xpRequired,
    levelProgress: levelInfo.progressPercent,
    canAccessIssues: levelInfo.canAccessIssues,
    xpEarned: levelInfo.xpEarned,
    // Other stats
    streak,
    activeDays,
    repos: userInfo?.public_repos || 0,
    followers: userInfo?.followers || 0,
    following: userInfo?.following || 0,
    contributions: total,
    avatar: userInfo?.avatar_url || null,
    name: userInfo?.name || handle,
    claimedBadges: cached ? safeParse(cached.claimedBadges, []) : [],
    courseCompleted: cached ? safeParse(cached.statsJson, {})?.courseCompleted || false : false,
  }

  await updateAppwriteUserStats(handle, {
    statsJson: JSON.stringify(stats),
  })

  return { success: true, stats, cached: false }
}

function computeStreak(events) {
  if (!events?.length) return 0
  const dayKey = (d) => d.toISOString().slice(0, 10)
  const daysSet = new Set(
    events
      .map((e) => (e?.created_at ? dayKey(new Date(e.created_at)) : null))
      .filter(Boolean)
  )
  let streak = 0
  const today = new Date()
  // walk back day by day until we miss one
  for (let i = 0; i < 400; i++) {
    const d = new Date(today)
    d.setUTCDate(today.getUTCDate() - i)
    const key = dayKey(d)
    if (daysSet.has(key)) {
      streak++
    } else if (i === 0) {
      // allow today to be empty, check yesterday only
      continue
    } else {
      break
    }
  }
  return streak
}

function emptyStats() {
  return {
    level: 'L1 Beginner', levelNum: 1, nextLevel: 'L2 Intermediate',
    progress: 0, totalXP: '0', displayXP: '0', rawXP: 0,
    streak: 0, activeDays: 0, repos: 0, followers: 0, following: 0,
    contributions: 0, avatar: null, name: '', claimedBadges: [],
  }
}

/* =========================================================
 *       ACTION 2: getProfileData
 * ========================================================= */
export async function getProfileData(githubHandle, token) {
  const handle = String(githubHandle || '').trim()
  if (!handle) return { success: false, user: null }

  const [user, prsData, issuesData, repos] = await Promise.all([
    ghFetch(`https://api.github.com/users/${handle}`, token),
    ghFetch(`https://api.github.com/search/issues?q=author:${handle}+type:pr+is:merged&per_page=5`, token),
    ghFetch(`https://api.github.com/search/issues?q=author:${handle}+type:issue+is:closed&per_page=1`, token),
    ghFetch(`https://api.github.com/users/${handle}/repos?per_page=50&sort=pushed`, token),
  ])

  const mergedPRs = prsData?.total_count || 0
  const closedIssues = issuesData?.total_count || 0

  const langCount = {}
  ;(Array.isArray(repos) ? repos : []).forEach((r) => {
    if (r.language) langCount[r.language] = (langCount[r.language] || 0) + 1
  })
  const skills = Object.entries(langCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({
      name,
      level: Math.min(100, 25 + count * 9),
    }))

  const recentPRs = (prsData?.items || []).slice(0, 5).map((p) => ({
    title: p.title,
    repo: p.repository_url?.replace('https://api.github.com/repos/', '') || '',
    date: p.closed_at || p.updated_at,
    url: p.html_url,
  }))

  return {
    success: true,
    user: user
      ? {
          login: user.login,
          name: user.name,
          bio: user.bio,
          avatar: user.avatar_url,
          location: user.location,
          company: user.company,
          blog: user.blog,
          publicRepos: user.public_repos,
          followers: user.followers,
          createdAt: user.created_at,
        }
      : null,
    skills,
    mergedPRs,
    closedIssues,
    recentPRs,
    stats: {
      totalLanguages: Object.keys(langCount).length,
    },
  }
}

/* =========================================================
 *       ACTION 3: getContributorContext (personalized repos)
 * ========================================================= */
export async function getContributorContext(githubHandle, token) {
  const handle = String(githubHandle || '').trim()
  if (!handle) return { success: false, repos: [] }

  try {
    // Fetch user's own repos
    const ownRepos = (await ghFetch(
      `https://api.github.com/users/${handle}/repos?sort=pushed&per_page=30`,
      token
    )) || []

    // Fetch starred repos
    const starredRepos = (await ghFetch(
      `https://api.github.com/users/${handle}/starred?sort=updated&per_page=10`,
      token
    )) || []

    // Categorize repos
    const seen = new Set()
    const categorized = {
      yourRepos: [],
      contributedTo: [],
      starred: [],
    }

    // Process own repos (filter out forks to get actual owned repos)
    const actualOwn = (Array.isArray(ownRepos) ? ownRepos : []).filter(r => !r.fork)
    actualOwn.slice(0, 15).forEach((r) => {
      if (!r?.full_name || seen.has(r.full_name)) return
      seen.add(r.full_name)
      categorized.yourRepos.push({
        label: r.full_name,
        value: r.full_name,
        category: 'Your Repos',
        language: r.language || 'Other',
        openIssues: r.open_issues_count || 0,
        stars: r.stargazers_count || 0,
      })
    })

    // Process forked repos (these indicate contribution interest)
    const forkedRepos = (Array.isArray(ownRepos) ? ownRepos : []).filter(r => r.fork && r.parent)
    forkedRepos.slice(0, 15).forEach((r) => {
      const parent = r.parent
      if (!parent?.full_name || seen.has(parent.full_name)) return
      seen.add(parent.full_name)
      categorized.contributedTo.push({
        label: parent.full_name,
        value: parent.full_name,
        category: 'Contributed To',
        language: parent.language || 'Other',
        openIssues: parent.open_issues_count || 0,
        stars: parent.stargazers_count || 0,
      })
    })

    // Process starred repos
    ;(Array.isArray(starredRepos) ? starredRepos : []).slice(0, 15).forEach((r) => {
      if (!r?.full_name || seen.has(r.full_name)) return
      seen.add(r.full_name)
      categorized.starred.push({
        label: r.full_name,
        value: r.full_name,
        category: 'Starred',
        language: r.language || 'Other',
        openIssues: r.open_issues_count || 0,
        stars: r.stargazers_count || 0,
      })
    })

    // Combine all categorized repos
    const allRepos = [
      ...categorized.yourRepos,
      ...categorized.contributedTo,
      ...categorized.starred,
    ]

    return { 
      success: true, 
      repos: allRepos,
      categorized,
      hasRepos: allRepos.length > 0,
    }
  } catch (error) {
    console.error('Error fetching repos:', error)
    return { 
      success: false, 
      repos: [],
      error: 'Unable to fetch your repositories. Please try again.',
    }
  }
}

/* =========================================================
 *       ACTION 4: getAnalyzedIssues
 * ========================================================= */
export async function getAnalyzedIssues(repo, userLevel = 1, forceSync = false, count = 3, token) {
  if (!repo) return { success: false, issues: [] }

  // Level 0: No issues - must complete course
  if (userLevel === 0) {
    return {
      success: false,
      issues: [],
      allIssues: [],
      userLevel: 0,
      lockedDifficulties: ['EASY', 'MEDIUM', 'HARD'],
      message: 'Complete the foundational course to unlock issues',
    }
  }

  // Resolve forks
  const repoInfo = await ghFetch(`https://api.github.com/repos/${repo}`, token)
  const targetRepo = repoInfo?.parent?.full_name || repoInfo?.full_name || repo

  const raw = (await ghFetch(
    `https://api.github.com/repos/${targetRepo}/issues?state=open&per_page=20&sort=created&direction=desc`,
    token
  )) || []

  const openIssues = (Array.isArray(raw) ? raw : [])
    .filter((i) => !i.pull_request)
    .slice(0, 12)

  if (openIssues.length === 0) return { success: true, issues: [], allIssues: [], userLevel, lockedDifficulties: [] }

  const byIdx = openIssues.map((i, idx) => ({
    idx,
    number: i.number,
    title: i.title,
    labels: (i.labels || []).map((l) => (typeof l === 'string' ? l : l.name)).filter(Boolean).slice(0, 4),
    url: i.html_url,
    body: String(i.body || '').slice(0, 200),
    comments: i.comments || 0,
  }))

  const classified = await classifyIssuesWithGroq(byIdx, `L${userLevel}`, targetRepo)

  // Merge and cap per difficulty
  const allClassifiedIssues = openIssues.map((issue, i) => {
    const c = classified[i] || { difficulty: 'MEDIUM', xp: 100, time: '1 h', highlight: 'Solid contribution opportunity' }
    const diff = ['EASY','MEDIUM','HARD'].includes(c.difficulty) ? c.difficulty : 'MEDIUM'
    return {
      id: `${targetRepo}#${issue.number}`,
      title: issue.title,
      labels: byIdx[i].labels,
      difficulty: diff,
      xp: Number(c.xp) || { EASY: 50, MEDIUM: 100, HARD: 200 }[diff],
      time: c.time || { EASY: '30 min', MEDIUM: '1-2 h', HARD: '3-4 h' }[diff],
      url: issue.html_url,
      repo: targetRepo,
      highlight: c.highlight || 'AI-matched to your profile',
      number: issue.number,
      comments: issue.comments || 0,
      locked: !canAccessDifficulty(userLevel, diff),
    }
  })

  // Filter by level access
  const filteredIssues = allClassifiedIssues.filter(issue => canAccessDifficulty(userLevel, issue.difficulty))
  
  // Determine locked difficulties
  const lockedDifficulties = []
  if (userLevel === 1) {
    lockedDifficulties.push('MEDIUM', 'HARD')
  } else if (userLevel === 2) {
    lockedDifficulties.push('HARD')
  }

  // Balance to at least ~count per bucket if available
  return {
    success: true,
    issues: filteredIssues,
    allIssues: allClassifiedIssues,
    userLevel,
    lockedDifficulties,
  }
}

async function classifyIssuesWithGroq(issues, userLevel, repoName) {
  const key = process.env.GROQ_API_KEY
  if (!key || !issues.length) return fallbackClassification(issues)

  const sys =
    'You are an open-source issue classifier for MergeShip. For each issue, pick difficulty EASY/MEDIUM/HARD and award XP (EASY 40-80, MEDIUM 90-180, HARD 200-320). ' +
    'Provide a short time estimate and a punchy 1-line highlight tuned to a contributor of this level. ' +
    'Return ONLY JSON: {"items":[{"idx":0,"difficulty":"EASY","xp":60,"time":"30 min","highlight":"Perfect for a quick win!"}]}. No commentary.'

  const user = {
    repo: repoName,
    userLevel,
    issues: issues.map((i) => ({
      idx: i.idx,
      title: i.title,
      labels: i.labels,
      bodyPreview: i.body,
      comments: i.comments,
    })),
  }

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        temperature: 0.4,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: JSON.stringify(user) },
        ],
      }),
      cache: 'no-store',
    })
    if (!res.ok) return fallbackClassification(issues)
    const data = await res.json()
    const raw = data?.choices?.[0]?.message?.content || ''
    let parsed
    try { parsed = JSON.parse(raw) } catch {
      const m = raw.match(/\{[\s\S]*\}/)
      parsed = m ? JSON.parse(m[0]) : null
    }
    const items = parsed?.items || parsed?.issues || []
    if (!Array.isArray(items) || items.length === 0) return fallbackClassification(issues)

    const byIdx = new Map()
    for (const it of items) byIdx.set(Number(it.idx), it)
    return issues.map((i) => byIdx.get(i.idx) || defaultClassEntry(i))
  } catch {
    return fallbackClassification(issues)
  }
}

function defaultClassEntry(i) {
  const hasGoodFirst = (i.labels || []).some((l) =>
    /good first|easy|starter|beginner|help wanted/i.test(l)
  )
  const hard = (i.labels || []).some((l) => /hard|complex|advanced|breaking/i.test(l))
  const diff = hasGoodFirst ? 'EASY' : hard ? 'HARD' : 'MEDIUM'
  return {
    difficulty: diff,
    xp: { EASY: 60, MEDIUM: 120, HARD: 240 }[diff],
    time: { EASY: '30 min', MEDIUM: '1-2 h', HARD: '3-4 h' }[diff],
    highlight:
      diff === 'EASY'
        ? 'Perfect for a quick win!'
        : diff === 'HARD'
        ? 'High-impact, flex your skills'
        : 'Solid contribution opportunity',
  }
}

function fallbackClassification(issues) {
  return issues.map(defaultClassEntry)
}

/* =========================================================
 *       ACTION 5: getContributionData (heatmap)
 * ========================================================= */
export async function getContributionData(githubHandle, forceSync = false) {
  const handle = String(githubHandle || '').trim()
  if (!handle) return { success: false, data: generateSimulated() }

  const cached = await getAppwriteUserStats(handle)
  if (!forceSync && cached?.heatmapJson && cached?.lastSync && Date.now() - Number(cached.lastSync) < CACHE_TTL) {
    const hm = safeParse(cached.heatmapJson, null)
    if (hm) return { success: true, data: hm, cached: true }
  }

  try {
    const res = await fetch(`https://github-contributions-api.jogruber.de/v4/${handle}?y=last`, {
      cache: 'no-store',
    })
    if (!res.ok) throw new Error('heatmap api failed')
    const data = await res.json()
    const contribs = (data?.contributions || []).slice(-365).map((c) => ({
      date: c.date,
      count: c.count || 0,
      level: c.level ?? levelFromCount(c.count || 0),
    }))
    const total = contribs.reduce((a, c) => a + c.count, 0)
    const hm = { total, contributions: contribs }
    await updateAppwriteUserStats(handle, { heatmapJson: JSON.stringify(hm) })
    return { success: true, data: hm, cached: false }
  } catch (e) {
    return { success: true, data: generateSimulated(), fallback: true }
  }
}

function levelFromCount(c) {
  if (c === 0) return 0
  if (c < 3) return 1
  if (c < 6) return 2
  if (c < 10) return 3
  return 4
}

function generateSimulated() {
  const contribs = []
  const now = new Date()
  for (let i = 364; i >= 0; i--) {
    const d = new Date(now)
    d.setUTCDate(now.getUTCDate() - i)
    const t = d.getTime() / 86400000
    const base = (Math.sin(t / 7) + Math.sin(t / 3.1)) * 2 + 2
    const noise = Math.random() < 0.2 ? Math.floor(Math.random() * 6) : 0
    const count = Math.max(0, Math.floor(base + noise))
    contribs.push({
      date: d.toISOString().slice(0, 10),
      count,
      level: levelFromCount(count),
    })
  }
  const total = contribs.reduce((a, c) => a + c.count, 0)
  return { total, contributions: contribs, simulated: true }
}

/* =========================================================
 *       ACTION 6: getAchievements
 * ========================================================= */
export async function getAchievements(githubHandle, token, forceSync = false) {
  const handle = String(githubHandle || '').trim()
  if (!handle) return { success: false, achievements: [], badges: [] }

  const [dash, prof] = await Promise.all([
    getDashboardData(handle, forceSync, token),
    getProfileData(handle, token),
  ])
  const s = dash.stats || emptyStats()
  const p = prof || {}
  const followers = s.followers || 0

  const ach = [
    mk('first_contribution', 'First Steps', '🎯', 'Merge your first PR', 100, p.mergedPRs || 0, 1),
    mk('bug_hunter',         'Bug Hunter',  '🐛', 'Close 5 issues', 200, p.closedIssues || 0, 5),
    mk('streak_master',      'Streak Master','🔥', 'Maintain a 7-day streak', 150, s.streak, 7),
    mk('quick_draw',         'Quick Draw', '⚡', 'Merge 10 pull requests', 300, p.mergedPRs || 0, 10),
    mk('mentor',             'Mentor', '🎓', 'Earn 5 followers', 400, followers, 5),
    mk('docs_master',        'Documentation Master', '📚', 'Ship 10 docs contributions', 250, Math.min(3, p.mergedPRs || 0), 10),
    mk('polyglot',           'Polyglot', '🌐', 'Ship in 5 languages', 350, p.stats?.totalLanguages || 0, 5),
    mk('community_leader',   'Community Leader', '👑', 'Reach 100 followers', 1000, followers, 100),
  ]

  const badges = [
    { id: 'pull-shark',   title: 'Pull Shark',    emoji: '🦈', rarity: 'Rare',
      unlocked: (p.mergedPRs || 0) >= 2,  count: Math.max(1, Math.min(9, Math.floor((p.mergedPRs||0)/5))),
      description: 'Opened 2+ pull requests.' },
    { id: 'quickdraw',    title: 'Quickdraw',     emoji: '⚡', rarity: 'Common',
      unlocked: (s.streak || 0) >= 1, count: 1,
      description: 'Active this week.' },
    { id: 'yolo',         title: 'YOLO',          emoji: '🌈', rarity: 'Epic',
      unlocked: (p.mergedPRs || 0) >= 10, count: Math.max(1, Math.min(5, Math.floor((p.mergedPRs||0)/25))),
      description: 'Merged 10+ PRs.' },
    { id: 'exterminator', title: 'Exterminator',  emoji: '🤖', rarity: 'Legendary',
      unlocked: (p.closedIssues || 0) >= 25, count: 1,
      description: 'Closed 25+ issues.' },
    { id: 'open-sourcerer', title: 'Open Sourcerer', emoji: '🧙', rarity: 'Epic',
      unlocked: (s.contributions || 0) >= 200, count: 1,
      description: '200+ contributions in a year.' },
    { id: 'galaxy-brain', title: 'Galaxy Brain',  emoji: '🧠', rarity: 'Legendary',
      unlocked: followers >= 100, count: 1,
      description: '100+ followers on GitHub.' },
  ]

  const summary = {
    unlocked: ach.filter((a) => a.unlocked).length,
    total: ach.length,
    badgesEarned: badges.filter((b) => b.unlocked).length,
    totalBadges: badges.length,
    nextAch: ach.find((a) => !a.unlocked) || null,
    masteryPct: Math.round(
      (ach.filter((a) => a.unlocked).length / ach.length) * 100
    ),
  }

  return { success: true, achievements: ach, badges, summary }
}

function mk(id, title, emoji, description, xpReward, progress, target) {
  return {
    id, title, emoji, description, xpReward,
    progress: Math.min(progress, target),
    target,
    unlocked: progress >= target,
  }
}

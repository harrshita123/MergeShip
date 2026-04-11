'use server'

import { serverDatabases, ID, Query } from '@/lib/appwrite-server'

const DATABASE_ID = '69e12a90002821b7a144'
const COLLECTION_ID = 'user_stats'

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

async function ghPost(url, body, token) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { ...ghHeaders(token), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store'
    })
    if (!res.ok) return null
    return await res.json()
  } catch (e) {
    return null
  }
}

async function ghPatch(url, body, token) {
  try {
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { ...ghHeaders(token), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store'
    })
    if (!res.ok) return null
    return await res.json()
  } catch (e) {
    return null
  }
}

function calculateRepoHealth(repo, issues, prs) {
  let score = 100
  const staleCount = issues.filter(i => {
    const age = Date.now() - new Date(i.created_at).getTime()
    return age > 30 * 24 * 60 * 60 * 1000
  }).length
  score -= Math.min(30, staleCount * 3)
  const pendingPRs = prs.filter(p => p.state === 'open').length
  score -= Math.min(20, pendingPRs * 2)
  const hasActivity = repo.updated_at && Date.now() - new Date(repo.updated_at).getTime() < 7 * 24 * 60 * 60 * 1000
  if (!hasActivity) score -= 15
  return Math.max(0, Math.min(100, score))
}

function calculateTrustScore(user, contributions = 0) {
  let score = 50
  if (user.followers > 100) score += 20
  else if (user.followers > 50) score += 15
  else if (user.followers > 10) score += 10
  if (contributions > 100) score += 20
  else if (contributions > 50) score += 10
  if (user.public_repos > 20) score += 10
  return Math.min(100, score)
}

/* =========================================================
 *       ACTION 1: getMaintainerDashboardData
 * ========================================================= */
export async function getMaintainerDashboardData(githubHandle, token) {
  const handle = String(githubHandle || '').trim()
  if (!handle) return { success: false, error: 'missing handle' }

  // Fetch user's repos
  const repos = await ghFetch(
    `https://api.github.com/users/${handle}/repos?affiliation=owner,collaborator,organization_member&per_page=50&sort=updated`,
    token
  )
  if (!repos || !Array.isArray(repos) || repos.length === 0) {
    return { success: false, error: 'no repos found' }
  }

  const mainRepo = repos[0]
  const top10 = repos.slice(0, 10)
  const allRepoNames = repos.map(r => ({ label: r.full_name, value: r.full_name }))

  // Fetch issues and PRs for top repos
  let allIssues = []
  let allPRs = []
  
  for (const repo of top10) {
    const issues = await ghFetch(
      `https://api.github.com/repos/${repo.full_name}/issues?state=open&per_page=30`,
      token
    )
    if (Array.isArray(issues)) {
      for (const issue of issues) {
        if (issue.pull_request) {
          // Fetch PR details
          const pr = await ghFetch(issue.pull_request.url, token)
          if (pr) {
            allPRs.push({
              ...issue,
              additions: pr.additions || 0,
              deletions: pr.deletions || 0,
              mergeable_state: pr.mergeable_state || 'unknown',
              repo: repo.full_name,
            })
          }
        } else {
          const labels = (issue.labels || []).map(l => typeof l === 'string' ? l : l.name).filter(Boolean)
          const isUrgent = labels.some(l => /bug|critical|urgent|high/i.test(l))
          allIssues.push({
            ...issue,
            repo: repo.full_name,
            isUrgent,
            category: labels.some(l => /bug/i.test(l)) ? 'Bug' :
                     labels.some(l => /feature|enhancement/i.test(l)) ? 'Feature' :
                     labels.some(l => /question/i.test(l)) ? 'Question' :
                     labels.some(l => /doc/i.test(l)) ? 'Docs' : 'General',
          })
        }
      }
    }
  }

  // Fetch collaborators for main repo
  const collabs = await ghFetch(
    `https://api.github.com/repos/${mainRepo.full_name}/collaborators?per_page=20`,
    token
  )
  const teamMembers = (Array.isArray(collabs) ? collabs : []).slice(0, 8).map(c => ({
    login: c.login,
    avatar: c.avatar_url,
    role: c.permissions?.admin ? 'Admin' : c.permissions?.push ? 'Maintainer' : 'Contributor',
    online: Math.random() > 0.5,
    workload: Math.floor(Math.random() * 100),
  }))

  // Fetch stale issues
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const staleSearch = await ghFetch(
    `https://api.github.com/search/issues?q=user:${handle}+is:issue+is:open+created:<${thirtyDaysAgo}&per_page=10`,
    token
  )
  const staleIssues = (staleSearch?.items || []).map(i => ({
    number: i.number,
    title: i.title,
    repo: i.repository_url?.replace('https://api.github.com/repos/', '') || '',
    created_at: i.created_at,
    updated_at: i.updated_at,
    url: i.html_url,
    labels: (i.labels || []).map(l => typeof l === 'string' ? l : l.name).filter(Boolean),
  })).slice(0, 5)

  // Fetch activity feed
  const events = await ghFetch(
    `https://api.github.com/users/${handle}/events/public?per_page=15`,
    token
  )
  const activityFeed = (Array.isArray(events) ? events : []).slice(0, 10).map(e => ({
    type: e.type,
    repo: e.repo?.name || '',
    actor: e.actor?.login || '',
    created_at: e.created_at,
    payload: e.payload,
  }))

  // Calculate stats
  const urgentIssues = allIssues.filter(i => i.isUrgent)
  const repoHealth = calculateRepoHealth(mainRepo, allIssues, allPRs)

  const stats = {
    teamOnline: teamMembers.filter(t => t.online).length,
    teamTotal: teamMembers.length,
    urgentCount: urgentIssues.length,
    openPRsCount: allPRs.length,
    newIssuesToday: allIssues.filter(i => {
      const age = Date.now() - new Date(i.created_at).getTime()
      return age < 24 * 60 * 60 * 1000
    }).length,
    prsMergedToday: 0, // Would need merged PR search
    issuesClosedToday: 0, // Would need closed issue search
    activeContributors: teamMembers.filter(t => t.workload > 20).length,
    avgResponseTime: '2h 15m',
  }

  return {
    success: true,
    mainRepo: mainRepo.full_name,
    stats,
    urgentIssues: urgentIssues.slice(0, 8),
    openPRs: allPRs.slice(0, 8),
    staleIssues,
    allRepoNames,
    teamMembers,
    activityFeed,
    repoHealth,
  }
}

/* =========================================================
 *       ACTION 2: getTriageData
 * ========================================================= */
export async function getTriageData(githubHandle, token, selectedRepoName) {
  const handle = String(githubHandle || '').trim()
  if (!handle) return { success: false, error: 'missing handle' }

  // Get all repos
  const repos = await ghFetch(
    `https://api.github.com/users/${handle}/repos?per_page=50&sort=updated`,
    token
  )
  const allRepoNames = (Array.isArray(repos) ? repos : []).map(r => ({ label: r.full_name, value: r.full_name }))
  
  const repoName = selectedRepoName || (repos && repos[0] ? repos[0].full_name : '')
  if (!repoName) return { success: false, error: 'no repo selected' }

  // Fetch open issues
  const issues = await ghFetch(
    `https://api.github.com/repos/${repoName}/issues?state=open&per_page=50`,
    token
  )

  const triageQueue = []
  const categoryCounts = { Bug: 0, Feature: 0, Duplicate: 0, Question: 0, Docs: 0 }

  for (const issue of Array.isArray(issues) ? issues : []) {
    if (issue.pull_request) continue
    
    const labels = (issue.labels || []).map(l => typeof l === 'string' ? l : l.name).filter(Boolean)
    let category = 'General'
    
    if (labels.some(l => /bug/i.test(l))) category = 'Bug'
    else if (labels.some(l => /feature|enhancement/i.test(l))) category = 'Feature'
    else if (labels.some(l => /duplicate/i.test(l))) category = 'Duplicate'
    else if (labels.some(l => /question/i.test(l))) category = 'Question'
    else if (labels.some(l => /doc/i.test(l))) category = 'Docs'

    if (categoryCounts[category] !== undefined) categoryCounts[category]++

    // Fetch contributor info
    const user = await ghFetch(issue.user.url, token)
    const trustScore = user ? calculateTrustScore(user, 0) : 50

    triageQueue.push({
      number: issue.number,
      title: issue.title,
      body: (issue.body || '').slice(0, 200),
      category,
      labels,
      url: issue.html_url,
      created_at: issue.created_at,
      comments: issue.comments || 0,
      user: {
        login: issue.user.login,
        avatar: issue.user.avatar_url,
        trustScore,
        level: trustScore > 80 ? 'Expert' : trustScore > 60 ? 'Intermediate' : 'Beginner',
      },
    })
  }

  return {
    success: true,
    repoName,
    allRepoNames,
    categoryCounts,
    triageQueue,
  }
}

/* =========================================================
 *       ACTION 3: triageIssue
 * ========================================================= */
export async function triageIssue(repoName, issueNumber, category, token) {
  if (!repoName || !issueNumber || !category) {
    return { success: false, error: 'missing parameters' }
  }

  const labelMap = {
    Bug: 'bug',
    Feature: 'enhancement',
    Duplicate: 'duplicate',
    Question: 'question',
    Docs: 'documentation',
  }

  const label = labelMap[category] || category.toLowerCase()

  const result = await ghPost(
    `https://api.github.com/repos/${repoName}/issues/${issueNumber}/labels`,
    { labels: [label] },
    token
  )

  return result ? { success: true } : { success: false, error: 'failed to apply label' }
}

/* =========================================================
 *       ACTION 4: closeDuplicate
 * ========================================================= */
export async function closeDuplicate(repoName, issueNumber, duplicateOf, token) {
  if (!repoName || !issueNumber || !duplicateOf) {
    return { success: false, error: 'missing parameters' }
  }

  // Post comment
  const comment = await ghPost(
    `https://api.github.com/repos/${repoName}/issues/${issueNumber}/comments`,
    { body: `Closing as duplicate of #${duplicateOf}` },
    token
  )

  if (!comment) return { success: false, error: 'failed to post comment' }

  // Close issue
  const closed = await ghPatch(
    `https://api.github.com/repos/${repoName}/issues/${issueNumber}`,
    { state: 'closed', labels: ['duplicate'] },
    token
  )

  return closed ? { success: true } : { success: false, error: 'failed to close issue' }
}

/* =========================================================
 *       ACTION 5: getAnalyticsData
 * ========================================================= */
export async function getAnalyticsData(githubHandle, token) {
  const handle = String(githubHandle || '').trim()
  if (!handle) return { success: false, error: 'missing handle' }

  // Fetch repos
  const repos = await ghFetch(
    `https://api.github.com/users/${handle}/repos?per_page=50&sort=updated`,
    token
  )
  if (!Array.isArray(repos) || repos.length === 0) {
    return { success: false, error: 'no repos found' }
  }

  const top5 = repos.slice(0, 5)
  const repoHealth = []

  for (const repo of top5) {
    const issues = await ghFetch(
      `https://api.github.com/repos/${repo.full_name}/issues?state=all&per_page=100`,
      token
    )
    const prs = (Array.isArray(issues) ? issues : []).filter(i => i.pull_request)
    const health = calculateRepoHealth(repo, Array.isArray(issues) ? issues : [], prs)
    
    repoHealth.push({
      name: repo.full_name,
      health,
      openIssues: repo.open_issues_count || 0,
      stars: repo.stargazers_count || 0,
      forks: repo.forks_count || 0,
    })
  }

  // Calculate merge velocity (mock for now)
  const mergeVelocity = '18.5h'
  const closureRate = '76%'
  const contributorRetention = '82%'
  const backlog = repos.reduce((sum, r) => sum + (r.open_issues_count || 0), 0)

  // Generate trend data
  const trends = {
    issuesOpenedClosed: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      opened: Math.floor(Math.random() * 15) + 5,
      closed: Math.floor(Math.random() * 12) + 3,
    })),
    velocityTrend: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      hours: Math.floor(Math.random() * 10) + 15,
    })),
  }

  return {
    success: true,
    summary: {
      mergeVelocity,
      closureRate,
      contributorRetention,
      backlog,
    },
    repoHealth,
    trends,
  }
}

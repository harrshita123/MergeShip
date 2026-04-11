'use server'

/**
 * Phase 10: Live Issue Classification
 * Fetches REAL GitHub issues and classifies them with Groq AI
 */

const GH_HEADERS = {
  'Accept': 'application/vnd.github.v3+json',
  'User-Agent': 'MergeShip-App'
}

const GROQ_API_KEY = process.env.GROQ_API_KEY

/**
 * Fetch real open issues from any public GitHub repository
 */
async function fetchRepoIssues(repoFullName) {
  try {
    const url = `https://api.github.com/repos/${repoFullName}/issues?state=open&per_page=30&sort=updated&direction=desc`
    
    const res = await fetch(url, {
      headers: GH_HEADERS,
      next: { revalidate: 300 } // Cache for 5 minutes
    })
    
    if (!res.ok) {
      if (res.status === 403 || res.status === 429) {
        return { success: false, error: 'rate_limit', message: 'GitHub API rate limit reached. Try again in a few minutes.' }
      }
      if (res.status === 404) {
        return { success: false, error: 'not_found', message: 'Repository not found or is private.' }
      }
      return { success: false, error: 'api_error', message: 'Failed to fetch issues from GitHub.' }
    }
    
    const issues = await res.json()
    
    // Filter out pull requests (GitHub API returns PRs in issues endpoint)
    const realIssues = (Array.isArray(issues) ? issues : []).filter(i => !i.pull_request)
    
    return {
      success: true,
      issues: realIssues.map(i => ({
        id: i.id,
        number: i.number,
        title: i.title,
        body: i.body ? i.body.substring(0, 500) : '',
        labels: (i.labels || []).map(l => l.name),
        url: i.html_url,
        created_at: i.created_at,
        comments: i.comments,
        user: i.user?.login || 'unknown',
        repo: repoFullName
      }))
    }
  } catch (error) {
    console.error('[fetchRepoIssues] Error:', error)
    return { success: false, error: 'network_error', message: 'Network error while fetching issues.' }
  }
}

/**
 * Classify issues using Groq AI into EASY/MEDIUM/HARD
 */
async function classifyIssuesWithGroq(issues) {
  if (!GROQ_API_KEY) {
    console.warn('[classifyIssues] No GROQ_API_KEY - using fallback')
    return fallbackClassification(issues)
  }
  
  if (issues.length === 0) {
    return []
  }
  
  try {
    // Batch issues for classification (up to 15 at a time)
    const issueBatch = issues.slice(0, 15)
    const issueSummaries = issueBatch.map((issue, idx) => 
      `Issue ${idx + 1}: "${issue.title}" | Labels: [${issue.labels.join(', ')}] | Comments: ${issue.comments} | Body: ${issue.body.substring(0, 200)}`
    ).join('\n')
    
    const prompt = `You are a GitHub issue difficulty classifier for open source contributors.

Classify each issue as EASY, MEDIUM, or HARD based on:
- EASY: documentation fixes, typos, simple bug fixes, good-first-issue labeled, small scope, clear instructions
- MEDIUM: feature additions with clear scope, moderate bug fixes, refactoring tasks, requires understanding of codebase
- HARD: complex features, architectural changes, performance optimization, security fixes, requires deep knowledge

Also estimate:
- timeEstimate: "30 min", "1-2 hours", "3-5 hours", "1-2 days", "3-5 days"
- xpReward: EASY=50-100, MEDIUM=150-300, HARD=400-800

Return ONLY a JSON array like:
[{"issueIndex": 1, "difficulty": "EASY", "timeEstimate": "30 min", "xpReward": 75, "reason": "Simple docs fix"}]

Issues to classify:
${issueSummaries}`

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 2000
      })
    })
    
    if (!response.ok) {
      console.warn('[classifyIssues] Groq API error:', response.status)
      return fallbackClassification(issues)
    }
    
    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''
    
    // Parse JSON from response (handle markdown code blocks)
    let classifications
    try {
      // Try to extract JSON array from response
      const jsonMatch = content.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        classifications = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON array found in response')
      }
    } catch (e) {
      console.warn('[classifyIssues] Failed to parse Groq response:', e)
      return fallbackClassification(issues)
    }
    
    return classifications
    
  } catch (error) {
    console.error('[classifyIssues] Error:', error)
    return fallbackClassification(issues)
  }
}

/**
 * Fallback classification based on labels
 */
function fallbackClassification(issues) {
  return issues.map((issue, idx) => {
    const labels = issue.labels.map(l => l.toLowerCase())
    
    // Check for easy indicators
    const isEasy = labels.some(l => 
      l.includes('good first') || 
      l.includes('beginner') || 
      l.includes('easy') || 
      l.includes('documentation') ||
      l.includes('typo')
    )
    
    // Check for hard indicators
    const isHard = labels.some(l => 
      l.includes('critical') || 
      l.includes('performance') || 
      l.includes('security') || 
      l.includes('architecture') ||
      l.includes('complex')
    )
    
    let difficulty = 'MEDIUM'
    let timeEstimate = '1-2 hours'
    let xpReward = 150
    
    if (isEasy) {
      difficulty = 'EASY'
      timeEstimate = '30 min'
      xpReward = 75
    } else if (isHard) {
      difficulty = 'HARD'
      timeEstimate = '3-5 hours'
      xpReward = 500
    }
    
    // Check if it's a bug (usually medium)
    if (labels.some(l => l.includes('bug')) && !isEasy && !isHard) {
      difficulty = 'MEDIUM'
      xpReward = 200
    }
    
    return {
      issueIndex: idx + 1,
      difficulty,
      timeEstimate,
      xpReward,
      reason: 'Auto-classified by labels'
    }
  })
}

/**
 * Check if user can access a difficulty tier based on level
 */
function canAccessDifficulty(userLevel, difficulty) {
  // Level 0: Course not completed - no access
  if (userLevel === 0) return false
  
  // Level 1 (Beginner): Only EASY
  if (userLevel === 1) return difficulty === 'EASY'
  
  // Level 2 (Intermediate): EASY + MEDIUM
  if (userLevel === 2) return difficulty === 'EASY' || difficulty === 'MEDIUM'
  
  // Level 3+ (Advanced/Expert/Mentor): All difficulties
  return true
}

/**
 * Main action: Get analyzed issues for a repository
 */
export async function getAnalyzedIssuesLive(repoFullName, userLevel = 1) {
  try {
    // Check cache first
    const cacheKey = `issues_${repoFullName}`
    const cached = getCachedIssues(cacheKey)
    if (cached) {
      return {
        ...cached,
        fromCache: true,
        cacheAge: Math.floor((Date.now() - cached.timestamp) / 1000)
      }
    }
    
    // 1. Fetch real issues
    const fetchResult = await fetchRepoIssues(repoFullName)
    if (!fetchResult.success) {
      return fetchResult
    }
    
    if (fetchResult.issues.length === 0) {
      return { 
        success: true, 
        issues: [], 
        grouped: { easy: [], medium: [], hard: [] },
        totalCount: 0,
        message: 'No open issues in this repository.' 
      }
    }
    
    // 2. Classify with AI
    const classifications = await classifyIssuesWithGroq(fetchResult.issues)
    
    // 3. Merge classification with issue data
    const classifiedIssues = fetchResult.issues.map((issue, idx) => {
      const classification = classifications.find(c => c.issueIndex === idx + 1) || {
        difficulty: 'MEDIUM',
        timeEstimate: '1-2 hours',
        xpReward: 150,
        reason: 'Unclassified'
      }
      
      return {
        id: `${issue.repo}#${issue.number}`,
        number: issue.number,
        title: issue.title,
        url: issue.url,
        labels: issue.labels,
        comments: issue.comments,
        repo: issue.repo,
        difficulty: classification.difficulty,
        time: classification.timeEstimate,
        xp: classification.xpReward,
        highlight: classification.reason,
        locked: !canAccessDifficulty(userLevel, classification.difficulty)
      }
    })
    
    // 4. Group by difficulty
    const easy = classifiedIssues.filter(i => i.difficulty === 'EASY')
    const medium = classifiedIssues.filter(i => i.difficulty === 'MEDIUM')
    const hard = classifiedIssues.filter(i => i.difficulty === 'HARD')
    
    const result = {
      success: true,
      issues: classifiedIssues,
      grouped: { easy, medium, hard },
      totalCount: classifiedIssues.length,
      userLevel,
      lockedDifficulties: getLockedDifficulties(userLevel),
      timestamp: Date.now()
    }
    
    // Cache the result
    setCachedIssues(cacheKey, result)
    
    return result
    
  } catch (error) {
    console.error('[getAnalyzedIssuesLive] Error:', error)
    return {
      success: false,
      error: 'internal_error',
      message: 'An error occurred while analyzing issues.'
    }
  }
}

function getLockedDifficulties(userLevel) {
  if (userLevel === 0) return ['EASY', 'MEDIUM', 'HARD']
  if (userLevel === 1) return ['MEDIUM', 'HARD']
  if (userLevel === 2) return ['HARD']
  return []
}

// Simple in-memory cache (5 minute TTL)
const issueCache = new Map()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

function getCachedIssues(key) {
  const cached = issueCache.get(key)
  if (!cached) return null
  
  const age = Date.now() - cached.timestamp
  if (age > CACHE_TTL) {
    issueCache.delete(key)
    return null
  }
  
  return cached
}

function setCachedIssues(key, data) {
  issueCache.set(key, data)
  
  // Clean up old cache entries
  if (issueCache.size > 50) {
    const oldestKey = issueCache.keys().next().value
    issueCache.delete(oldestKey)
  }
}

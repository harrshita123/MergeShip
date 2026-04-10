'use server'

/**
 * Fetch GitHub stats and ask Groq for 2 learning paths.
 * Returns { success, stats: { commits, prRate }, paths }
 */

const GH_HEADERS = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'MergeShip',
  'X-GitHub-Api-Version': '2022-11-28',
}

async function safeJson(res) {
  try { return await res.json() } catch { return null }
}

async function getCommitCount(handle) {
  try {
    const r = await fetch(
      `https://api.github.com/search/commits?q=author:${encodeURIComponent(handle)}&per_page=1`,
      {
        headers: {
          ...GH_HEADERS,
          Accept: 'application/vnd.github.cloak-preview+json',
        },
        cache: 'no-store',
      }
    )
    const data = await safeJson(r)
    return data?.total_count ?? 0
  } catch {
    return 0
  }
}

async function getPRs(handle) {
  try {
    const [totalRes, mergedRes] = await Promise.all([
      fetch(
        `https://api.github.com/search/issues?q=author:${encodeURIComponent(handle)}+type:pr&per_page=1`,
        { headers: GH_HEADERS, cache: 'no-store' }
      ),
      fetch(
        `https://api.github.com/search/issues?q=author:${encodeURIComponent(handle)}+type:pr+is:merged&per_page=1`,
        { headers: GH_HEADERS, cache: 'no-store' }
      ),
    ])
    const total = (await safeJson(totalRes))?.total_count ?? 0
    const merged = (await safeJson(mergedRes))?.total_count ?? 0
    const rate = total > 0 ? Math.round((merged / total) * 100) : 0
    return { totalPRs: total, mergedPRs: merged, prRate: rate }
  } catch {
    return { totalPRs: 0, mergedPRs: 0, prRate: 0 }
  }
}

async function getRepos(handle) {
  try {
    const r = await fetch(
      `https://api.github.com/users/${encodeURIComponent(handle)}/repos?per_page=30&sort=updated`,
      { headers: GH_HEADERS, cache: 'no-store' }
    )
    const data = await safeJson(r)
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

function fallbackPaths(techStack) {
  const primary = techStack[0] || 'TypeScript'
  return [
    {
      title: `Advanced ${primary} Architectures`,
      desc: `Level up your ${primary} patterns with production-grade design and scalability tactics.`,
      icon: 'Brain',
    },
    {
      title: 'Infrastructure as Code',
      desc: 'Master IaC, CI/CD pipelines and cloud deployment for serious open-source contributors.',
      icon: 'Rocket',
    },
  ]
}

async function askGroqForPaths({ handle, repoCount, ageYears, commits, prRate, techStack, highlights }) {
  const GROQ_API_KEY = process.env.GROQ_API_KEY
  if (!GROQ_API_KEY) return fallbackPaths(techStack)

  const systemPrompt =
    'You are a senior open source mentor for MergeShip. Suggest 2 professional learning paths based on the developer profile. ' +
    'Return ONLY valid JSON in this exact shape: {"paths": [{"title": "string", "desc": "string <=120 chars", "icon": "Brain|TrendingUp|Rocket|TerminalSquare|Layers"}]}. ' +
    'No markdown, no commentary.'

  const userContent =
    `Developer: @${handle}\n` +
    `Account age: ${ageYears} year(s)\n` +
    `Public repos: ${repoCount}\n` +
    `Total commits (searchable): ${commits}\n` +
    `PR merge rate: ${prRate}%\n` +
    `Tech stack: ${techStack.join(', ') || 'unknown'}\n` +
    `Notable repos: ${highlights || 'none'}\n` +
    'Suggest 2 advanced learning paths that push this developer to the next level.'

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        temperature: 0.7,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
      }),
      cache: 'no-store',
    })
    if (!res.ok) {
      console.error('[groq] bad status', res.status, await res.text())
      return fallbackPaths(techStack)
    }
    const data = await res.json()
    const raw = data?.choices?.[0]?.message?.content || ''
    let parsed
    try {
      parsed = JSON.parse(raw)
    } catch {
      const match = raw.match(/\{[\s\S]*\}/)
      parsed = match ? JSON.parse(match[0]) : null
    }
    let paths = parsed?.paths || parsed?.data || parsed
    if (!Array.isArray(paths)) paths = fallbackPaths(techStack)
    const allowedIcons = ['Brain', 'TrendingUp', 'Rocket', 'TerminalSquare', 'Layers']
    paths = paths.slice(0, 2).map((p) => ({
      title: String(p.title || 'Learning Path').slice(0, 80),
      desc: String(p.desc || p.description || '').slice(0, 160),
      icon: allowedIcons.includes(p.icon) ? p.icon : 'Brain',
    }))
    if (paths.length < 2) {
      const fillers = fallbackPaths(techStack)
      while (paths.length < 2) paths.push(fillers[paths.length])
    }
    return paths
  } catch (err) {
    console.error('[groq] request failed', err)
    return fallbackPaths(techStack)
  }
}

export async function analyzeGithubProfile(githubHandle, repoCount = 0, ageYears = 0) {
  if (!githubHandle) {
    return {
      success: false,
      error: 'Missing github handle',
      stats: { commits: 0, prRate: 0, score: 25, level: 'BEGINNER' },
      paths: fallbackPaths([]),
    }
  }

  try {
    const [commits, prs, repos] = await Promise.all([
      getCommitCount(githubHandle),
      getPRs(githubHandle),
      getRepos(githubHandle),
    ])

    const techStack = [
      ...new Set(
        repos
          .map((r) => r.language)
          .filter(Boolean)
      ),
    ].slice(0, 8)

    const highlights = repos
      .slice(0, 5)
      .map((r) => `${r.name}(★${r.stargazers_count || 0}, ${r.language || 'n/a'})`)
      .join(', ')

    // Simple skill score out of 100
    const ageScore    = Math.min(ageYears / 5, 1) * 20
    const repoScore   = Math.min(repoCount / 30, 1) * 25
    const commitScore = Math.min(commits / 1000, 1) * 30
    const prScore     = (prs.prRate / 100) * 25
    const score = Math.round(ageScore + repoScore + commitScore + prScore)

    let level = 'BEGINNER'
    if (score >= 70) level = 'EXPERT'
    else if (score >= 40) level = 'INTERMEDIATE'

    const paths = await askGroqForPaths({
      handle: githubHandle,
      repoCount,
      ageYears,
      commits,
      prRate: prs.prRate,
      techStack,
      highlights,
    })

    return {
      success: true,
      stats: {
        commits,
        prRate: prs.prRate,
        totalPRs: prs.totalPRs,
        mergedPRs: prs.mergedPRs,
        score,
        level,
        repoCount,
        ageYears,
        techStack,
      },
      paths,
    }
  } catch (err) {
    console.error('[analyzeGithubProfile] failed', err)
    return {
      success: false,
      error: String(err),
      stats: { commits: 0, prRate: 0, score: 30, level: 'BEGINNER' },
      paths: fallbackPaths([]),
    }
  }
}


/* =========================================================
 *       MAINTAINER ONBOARDING ACTIONS
 * ========================================================= */

export async function getUserOrganizations(githubHandle) {
  try {
    const orgsRes = await fetch(`https://api.github.com/users/${githubHandle}/orgs`, {
      headers: GH_HEADERS,
      cache: 'no-store',
    })
    
    // Check for rate limit
    if (orgsRes.status === 403 || orgsRes.status === 429) {
      const resetTime = orgsRes.headers.get('X-RateLimit-Reset')
      console.warn('[getUserOrganizations] Rate limit exceeded. Reset at:', resetTime)
      return {
        success: false,
        error: 'rate_limit',
        personalAccount: {
          login: githubHandle,
          type: 'personal',
          avatar_url: `https://github.com/${githubHandle}.png?size=200`,
        },
        organizations: [],
      }
    }
    
    const orgs = await safeJson(orgsRes) || []
    
    return {
      success: true,
      personalAccount: {
        login: githubHandle,
        type: 'personal',
        avatar_url: `https://github.com/${githubHandle}.png?size=200`,
      },
      organizations: (Array.isArray(orgs) ? orgs : []).map(o => ({
        login: o.login,
        avatar_url: o.avatar_url,
        description: o.description,
        type: 'organization',
      })),
    }
  } catch (error) {
    console.error('[getUserOrganizations] failed', error)
    return {
      success: false,
      error: String(error),
      personalAccount: {
        login: githubHandle,
        type: 'personal',
        avatar_url: `https://github.com/${githubHandle}.png?size=200`,
      },
      organizations: [],
    }
  }
}

export async function getOrgRepos(orgLogin, isPersonal) {
  try {
    const url = isPersonal
      ? `https://api.github.com/users/${orgLogin}/repos?sort=pushed&per_page=50`
      : `https://api.github.com/orgs/${orgLogin}/repos?sort=pushed&per_page=50`

    const res = await fetch(url, {
      headers: GH_HEADERS,
      cache: 'no-store',
    })
    
    // Check for rate limit
    if (res.status === 403 || res.status === 429) {
      const resetTime = res.headers.get('X-RateLimit-Reset')
      console.warn('[getOrgRepos] Rate limit exceeded. Reset at:', resetTime)
      return {
        success: false,
        error: 'rate_limit',
        repos: [],
      }
    }
    
    const repos = await safeJson(res) || []

    return {
      success: true,
      repos: (Array.isArray(repos) ? repos : []).map(r => ({
        name: r.name,
        full_name: r.full_name,
        language: r.language,
        stars: r.stargazers_count,
        open_issues: r.open_issues_count,
        description: r.description,
        private: r.private,
      })),
    }
  } catch (error) {
    console.error('[getOrgRepos] failed', error)
    return { success: false, error: String(error), repos: [] }
  }
}

export async function getRepoQuickStats(repos) {
  try {
    let totalOpenIssues = 0
    let totalOpenPRs = 0
    const contributors = new Set()

    // Fetch stats for each repo
    for (const repo of repos.slice(0, 10)) { // Limit to first 10 repos for performance
      try {
        // Get open issues count (already have it from repo object)
        totalOpenIssues += repo.open_issues || 0

        // Get open PRs
        const prRes = await fetch(
          `https://api.github.com/repos/${repo.full_name}/pulls?state=open&per_page=1`,
          { headers: GH_HEADERS, cache: 'no-store' }
        )
        const linkHeader = prRes.headers.get('Link')
        if (linkHeader) {
          const match = linkHeader.match(/page=(\d+)>; rel="last"/)
          if (match) totalOpenPRs += parseInt(match[1], 10)
        }

        // Get contributors (sample from recent commits)
        const commitsRes = await fetch(
          `https://api.github.com/repos/${repo.full_name}/commits?per_page=30`,
          { headers: GH_HEADERS, cache: 'no-store' }
        )
        const commits = await safeJson(commitsRes) || []
        ;(Array.isArray(commits) ? commits : []).forEach(c => {
          if (c.author?.login) contributors.add(c.author.login)
        })
      } catch (e) {
        console.error(`Failed to fetch stats for ${repo.full_name}`, e)
      }
    }

    return {
      success: true,
      stats: {
        openIssues: totalOpenIssues,
        openPRs: totalOpenPRs,
        contributors: contributors.size,
      },
    }
  } catch (error) {
    console.error('[getRepoQuickStats] failed', error)
    return {
      success: true,
      stats: { openIssues: 0, openPRs: 0, contributors: 0 },
    }
  }
}

export async function saveMaintainerConfig(githubHandle, config) {
  try {
    const { serverDatabases, ID, Query } = await import('@/lib/appwrite-server')
    const DATABASE_ID = '69e12a90002821b7a144'
    const COLLECTION_ID = 'user_stats'
    
    // Look up existing user_stats doc
    try {
      const docs = await serverDatabases.listDocuments(DATABASE_ID, COLLECTION_ID, [
        Query.equal('githubHandle', githubHandle),  // Fixed: was 'handle'
        Query.limit(1),
      ])
      
      let doc = docs.documents?.[0]
      
      if (doc) {
        // Update existing document
        const currentStats = typeof doc.statsJson === 'string' 
          ? JSON.parse(doc.statsJson || '{}') 
          : (doc.statsJson || {})
        
        currentStats.maintainerConfig = {
          role: 'maintainer',
          org: config.org,
          repos: config.repos,
          repoAccess: config.repoAccess,
          setupCompleted: true,
          setupDate: new Date().toISOString(),
        }
        
        await serverDatabases.updateDocument(
          DATABASE_ID,
          COLLECTION_ID,
          doc.$id,
          { statsJson: JSON.stringify(currentStats) }
        )
      } else {
        // Create new document
        const newStats = {
          maintainerConfig: {
            role: 'maintainer',
            org: config.org,
            repos: config.repos,
            repoAccess: config.repoAccess,
            setupCompleted: true,
            setupDate: new Date().toISOString(),
          },
        }
        
        await serverDatabases.createDocument(
          DATABASE_ID,
          COLLECTION_ID,
          ID.unique(),
          {
            githubHandle: githubHandle,  // Fixed: was 'handle'
            statsJson: JSON.stringify(newStats),
            heatmapJson: '{}',
            lastSync: new Date().toISOString(),
            // claimedBadges removed - attribute doesn't exist in Appwrite collection
          }
        )
      }
      
      return { success: true }
    } catch (dbError) {
      console.error('[saveMaintainerConfig] Appwrite error:', dbError)
      return { success: false, error: String(dbError) }
    }
  } catch (error) {
    console.error('[saveMaintainerConfig] failed', error)
    return { success: false, error: String(error) }
  }
}

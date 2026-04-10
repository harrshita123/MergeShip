'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Check, CheckCircle, Lock, Search, Shield, Rocket, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'
import { getUserOrganizations, getOrgRepos, getRepoQuickStats, saveMaintainerConfig } from './actions'
import confetti from 'canvas-confetti'

const STEPS = [
  { id: 1, name: 'Connect' },
  { id: 2, name: 'Organization' },
  { id: 3, name: 'Repositories' },
  { id: 4, name: 'Permissions' },
  { id: 5, name: 'Complete' },
]

export default function MaintainerWizard({ githubHandle, onComplete }) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(2) // Start at step 2 (org selection) since GitHub is already connected
  const [loading, setLoading] = useState(false)
  
  // Step 2: Organization selection
  const [orgs, setOrgs] = useState([])
  const [selectedOrg, setSelectedOrg] = useState(null)
  
  // Step 3: Repository selection
  const [repos, setRepos] = useState([])
  const [repoAccess, setRepoAccess] = useState('all')
  const [selectedRepos, setSelectedRepos] = useState([])
  const [repoSearch, setRepoSearch] = useState('')
  
  // Step 5: Quick stats
  const [quickStats, setQuickStats] = useState(null)

  // Load organizations on mount
  useEffect(() => {
    if (currentStep === 2) {
      loadOrganizations()
    }
  }, [currentStep])

  const loadOrganizations = async () => {
    setLoading(true)
    try {
      const result = await getUserOrganizations(githubHandle)
      if (result.success) {
        const allOrgs = [result.personalAccount, ...result.organizations]
        setOrgs(allOrgs)
      } else {
        // Fallback to personal account only
        setOrgs([{
          login: githubHandle,
          type: 'personal',
          avatar_url: `https://github.com/${githubHandle}.png?size=200`,
        }])
      }
    } catch (error) {
      console.error('Failed to load organizations:', error)
      // Fallback to personal account
      setOrgs([{
        login: githubHandle,
        type: 'personal',
        avatar_url: `https://github.com/${githubHandle}.png?size=200`,
      }])
    } finally {
      setLoading(false)
    }
  }

  const loadRepositories = async (org) => {
    setLoading(true)
    try {
      const isPersonal = org.type === 'personal'
      const result = await getOrgRepos(org.login, isPersonal)
      if (result.success) {
        setRepos(result.repos)
        if (result.repos.length === 0) {
          console.warn('No repositories found for this organization')
        }
      } else {
        setRepos([])
      }
    } catch (error) {
      console.error('Failed to load repositories:', error)
      setRepos([])
    } finally {
      setLoading(false)
    }
  }

  const handleOrgSelect = async (org) => {
    setSelectedOrg(org)
    await loadRepositories(org)
    setCurrentStep(3)
  }

  const handleRepoAccessChange = (access) => {
    setRepoAccess(access)
    if (access === 'all') {
      setSelectedRepos(repos)
    } else {
      setSelectedRepos([])
    }
  }

  const toggleRepo = (repo) => {
    setSelectedRepos(prev => {
      const exists = prev.find(r => r.full_name === repo.full_name)
      if (exists) {
        return prev.filter(r => r.full_name !== repo.full_name)
      } else {
        return [...prev, repo]
      }
    })
  }

  const handleContinueToPermissions = () => {
    if (repoAccess === 'selected' && selectedRepos.length === 0) {
      alert('Please select at least one repository')
      return
    }
    setCurrentStep(4)
  }

  const handleInstall = async () => {
    setLoading(true)
    
    // Fetch quick stats
    const statsResult = await getRepoQuickStats(repoAccess === 'all' ? repos : selectedRepos)
    setQuickStats(statsResult.stats)
    
    // Save config
    await saveMaintainerConfig(githubHandle, {
      org: selectedOrg.login,
      repos: (repoAccess === 'all' ? repos : selectedRepos).map(r => r.full_name),
      repoAccess,
    })
    
    setLoading(false)
    setCurrentStep(5)
    
    // Trigger confetti
    setTimeout(() => {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#A78BFA', '#06B6D4', '#FBBF24'],
      })
    }, 300)
  }

  const filteredRepos = repos.filter(r => 
    r.full_name.toLowerCase().includes(repoSearch.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-[#060611] flex items-center justify-center p-6">
      <div className="w-full max-w-3xl">
        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((step, idx) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-[13px] transition-all ${
                  step.id < currentStep
                    ? 'bg-[#4ADE80] text-white'
                    : step.id === currentStep
                    ? 'bg-[#A78BFA] text-white'
                    : 'bg-[#1E1826] text-[#606080]'
                }`}
              >
                {step.id < currentStep ? <Check className="h-5 w-5" /> : step.id}
              </div>
              {idx < STEPS.length - 1 && (
                <div className={`w-12 h-1 mx-1 ${step.id < currentStep ? 'bg-[#4ADE80]' : 'bg-[#1E1826]'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Main Card */}
        <div className="bg-[#15111A] border border-white/10 rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-[#A78BFA]/20 border border-[#A78BFA]/30 flex items-center justify-center">
              <Shield className="h-6 w-6 text-[#A78BFA]" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#606080]">
                Maintainer Setup
              </div>
              <h1 className="text-2xl font-extrabold" style={{ fontFamily: 'Outfit, sans-serif' }}>
                {currentStep === 2 && 'Select Organization'}
                {currentStep === 3 && 'Choose Repositories'}
                {currentStep === 4 && 'Permissions Overview'}
                {currentStep === 5 && 'Setup Complete'}
              </h1>
            </div>
          </div>

          {/* Step 2: Organization Selection */}
          {currentStep === 2 && (
            <div>
              <p className="text-[14px] text-[#8B7E9F] mb-6">
                Where do you want to install MergeShip?
              </p>
              
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-[#A78BFA]" />
                </div>
              ) : (
                <div className="space-y-3">
                  {orgs.map((org) => (
                    <button
                      key={org.login}
                      onClick={() => handleOrgSelect(org)}
                      className="w-full flex items-center justify-between p-4 bg-[#1E1826] border border-white/5 hover:border-[#A78BFA]/30 hover:bg-white/5 rounded-xl transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={org.avatar_url}
                          alt={org.login}
                          className="w-10 h-10 rounded-full"
                          onError={(e) => { e.currentTarget.src = 'https://github.com/github.png?size=64' }}
                        />
                        <div className="text-left">
                          <div className="text-[14px] font-bold text-[#F8F8FF]">
                            {org.type === 'personal' ? '🟢 ' : '🟣 '}@{org.login}
                          </div>
                          <div className="text-[11px] text-[#8B7E9F]">
                            {org.type === 'personal' ? 'Personal Account' : 'Organization'}
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="h-5 w-5 text-[#606080] group-hover:text-[#A78BFA] transition-colors" />
                    </button>
                  ))}
                </div>
              )}
              
              <p className="text-[12px] text-[#606080] mt-6 text-center">
                Don't see your organization? You need admin access to install MergeShip.
              </p>
            </div>
          )}

          {/* Step 3: Repository Selection */}
          {currentStep === 3 && (
            <div>
              <p className="text-[14px] text-[#8B7E9F] mb-6">
                Configure MergeShip for: <span className="text-[#A78BFA] font-bold">@{selectedOrg?.login}</span>
              </p>
              
              <div className="space-y-4 mb-6">
                <button
                  onClick={() => handleRepoAccessChange('all')}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    repoAccess === 'all'
                      ? 'border-[#A78BFA]/50 bg-[#A78BFA]/10'
                      : 'border-white/5 bg-[#1E1826] hover:border-white/10'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-5 h-5 rounded-full mt-0.5 flex items-center justify-center border-2 ${
                      repoAccess === 'all' ? 'border-[#A78BFA] bg-[#A78BFA]' : 'border-white/20'
                    }`}>
                      {repoAccess === 'all' && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <div>
                      <div className="text-[14px] font-bold text-[#F8F8FF] mb-1">All repositories</div>
                      <div className="text-[12px] text-[#8B7E9F]">Includes all current and future repos</div>
                    </div>
                  </div>
                </button>
                
                <button
                  onClick={() => handleRepoAccessChange('selected')}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    repoAccess === 'selected'
                      ? 'border-[#A78BFA]/50 bg-[#A78BFA]/10'
                      : 'border-white/5 bg-[#1E1826] hover:border-white/10'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-5 h-5 rounded-full mt-0.5 flex items-center justify-center border-2 ${
                      repoAccess === 'selected' ? 'border-[#A78BFA] bg-[#A78BFA]' : 'border-white/20'
                    }`}>
                      {repoAccess === 'selected' && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <div>
                      <div className="text-[14px] font-bold text-[#F8F8FF] mb-1">Only select repositories</div>
                      <div className="text-[12px] text-[#8B7E9F]">Choose specific repos to manage</div>
                    </div>
                  </div>
                </button>
              </div>

              {repoAccess === 'selected' && (
                <div>
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8B7E9F]" />
                    <input
                      type="text"
                      value={repoSearch}
                      onChange={(e) => setRepoSearch(e.target.value)}
                      placeholder="Search repositories..."
                      className="w-full pl-10 pr-4 py-2 bg-[#1E1826] border border-white/10 rounded-lg text-[13px] text-white placeholder-[#8B7E9F] focus:outline-none focus:border-[#A78BFA]"
                    />
                  </div>
                  
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-[#A78BFA]" />
                    </div>
                  ) : filteredRepos.length === 0 ? (
                    <div className="text-center py-12 bg-[#1E1826] rounded-xl">
                      <p className="text-[13px] text-[#8B7E9F] mb-2">
                        {repos.length === 0 ? 'No repositories found' : 'No matching repositories'}
                      </p>
                      <p className="text-[11px] text-[#606080]">
                        {repos.length === 0 
                          ? 'This account has no public repositories' 
                          : 'Try adjusting your search'}
                      </p>
                    </div>
                  ) : (
                    <div className="max-h-[320px] overflow-y-auto space-y-2 bg-[#1E1826] rounded-xl p-3">
                      {filteredRepos.map((repo) => {
                        const isSelected = selectedRepos.find(r => r.full_name === repo.full_name)
                        return (
                          <button
                            key={repo.full_name}
                            onClick={() => toggleRepo(repo)}
                            className="w-full flex items-center gap-3 p-3 hover:bg-white/5 rounded-lg transition-colors"
                          >
                            <div className={`w-5 h-5 rounded flex items-center justify-center border-2 flex-shrink-0 ${
                              isSelected ? 'border-[#A78BFA] bg-[#A78BFA]' : 'border-white/20'
                            }`}>
                              {isSelected && <Check className="h-3 w-3 text-white" />}
                            </div>
                            <div className="flex-1 text-left">
                              <div className="text-[13px] font-medium text-[#F8F8FF]">{repo.full_name}</div>
                              <div className="flex items-center gap-2 text-[10px] text-[#8B7E9F] mt-0.5">
                                {repo.language && <span>{repo.language}</span>}
                                <span>⭐ {repo.stars}</span>
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                  
                  <p className="text-[11px] text-[#8B7E9F] mt-3">
                    {selectedRepos.length} {selectedRepos.length === 1 ? 'repository' : 'repositories'} selected
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between mt-8">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="flex items-center gap-2 px-4 py-2 text-[13px] font-bold text-[#8B7E9F] hover:text-[#F8F8FF] transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
                <button
                  onClick={handleContinueToPermissions}
                  disabled={repoAccess === 'selected' && selectedRepos.length === 0}
                  className="flex items-center gap-2 px-6 py-3 bg-[#A78BFA] text-white text-[13px] font-bold rounded-lg hover:bg-[#8B5CF6] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Permissions Overview */}
          {currentStep === 4 && (
            <div>
              <p className="text-[14px] text-[#8B7E9F] mb-6">
                MergeShip needs these permissions:
              </p>
              
              <div className="space-y-6 mb-6">
                <div>
                  <div className="text-[12px] font-bold uppercase tracking-widest text-[#606080] mb-3">
                    Organization Permissions
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[13px]">
                      <CheckCircle className="h-4 w-4 text-[#4ADE80]" />
                      <span className="text-[#F8F8FF]">Read access to members and metadata</span>
                    </div>
                    <div className="flex items-center gap-2 text-[13px]">
                      <CheckCircle className="h-4 w-4 text-[#4ADE80]" />
                      <span className="text-[#F8F8FF]">Read & write access to issues and PRs</span>
                    </div>
                    <div className="flex items-center gap-2 text-[13px]">
                      <CheckCircle className="h-4 w-4 text-[#4ADE80]" />
                      <span className="text-[#F8F8FF]">Read access to organization projects</span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-[12px] font-bold uppercase tracking-widest text-[#606080] mb-3">
                    Repository Permissions
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[13px]">
                      <CheckCircle className="h-4 w-4 text-[#4ADE80]" />
                      <span className="text-[#F8F8FF]">Read access to code and metadata</span>
                    </div>
                    <div className="flex items-center gap-2 text-[13px]">
                      <CheckCircle className="h-4 w-4 text-[#4ADE80]" />
                      <span className="text-[#F8F8FF]">Read & write access to issues</span>
                    </div>
                    <div className="flex items-center gap-2 text-[13px]">
                      <CheckCircle className="h-4 w-4 text-[#4ADE80]" />
                      <span className="text-[#F8F8FF]">Read & write access to pull requests</span>
                    </div>
                    <div className="flex items-center gap-2 text-[13px]">
                      <CheckCircle className="h-4 w-4 text-[#4ADE80]" />
                      <span className="text-[#F8F8FF]">Read access to commit statuses</span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-[12px] font-bold uppercase tracking-widest text-[#606080] mb-3">
                    User Permissions
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[13px]">
                      <CheckCircle className="h-4 w-4 text-[#4ADE80]" />
                      <span className="text-[#F8F8FF]">Read access to email addresses</span>
                    </div>
                    <div className="flex items-center gap-2 text-[13px]">
                      <CheckCircle className="h-4 w-4 text-[#4ADE80]" />
                      <span className="text-[#F8F8FF]">Read access to profile information</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[#4ADE80]/10 border border-[#4ADE80]/20 rounded-xl p-4 mb-8">
                <div className="flex items-start gap-3">
                  <Lock className="h-5 w-5 text-[#4ADE80] flex-shrink-0 mt-0.5" />
                  <div className="text-[12px] text-[#F8F8FF] leading-relaxed">
                    <span className="font-bold">MergeShip never modifies your code.</span> We only read issues, PRs, and metadata to power your command center.
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={() => setCurrentStep(3)}
                  className="flex items-center gap-2 px-4 py-2 text-[13px] font-bold text-[#8B7E9F] hover:text-[#F8F8FF] transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
                <button
                  onClick={handleInstall}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-3 bg-[#4ADE80] text-black text-[13px] font-bold rounded-lg hover:bg-[#22C55E] transition-colors disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Installing...
                    </>
                  ) : (
                    <>
                      Install & Continue
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Setup Complete */}
          {currentStep === 5 && (
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-[#4ADE80]/20 border-2 border-[#4ADE80] flex items-center justify-center mx-auto mb-6">
                <Check className="h-10 w-10 text-[#4ADE80]" />
              </div>
              
              <h2 className="text-3xl font-extrabold mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                MergeShip is ready!
              </h2>
              
              <div className="text-[13px] text-[#8B7E9F] mb-8 space-y-1">
                <p>Connected to: <span className="text-[#A78BFA] font-bold">@{selectedOrg?.login}</span></p>
                <p>Repositories: <span className="text-[#A78BFA] font-bold">{(repoAccess === 'all' ? repos : selectedRepos).length} repos configured</span></p>
                <p>Role: <span className="text-[#A78BFA] font-bold">Maintainer</span></p>
              </div>

              {quickStats && (
                <div className="bg-[#1E1826] border border-white/5 rounded-xl p-6 mb-8">
                  <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#606080] mb-4">
                    📊 Quick Stats from your repos
                  </div>
                  <div className="grid grid-cols-3 gap-6">
                    <div>
                      <div className="text-2xl font-bold text-[#06B6D4]">{quickStats.openIssues}</div>
                      <div className="text-[11px] text-[#8B7E9F]">Open Issues</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-[#A78BFA]">{quickStats.openPRs}</div>
                      <div className="text-[11px] text-[#8B7E9F]">Open PRs</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-[#FBBF24]">{quickStats.contributors}</div>
                      <div className="text-[11px] text-[#8B7E9F]">Contributors</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="text-left bg-white/5 rounded-xl p-5 mb-8">
                <div className="text-[12px] font-bold mb-3">What's next:</div>
                <div className="space-y-2 text-[12px] text-[#8B7E9F]">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#A78BFA]" />
                    <span>Triage issues with AI-powered labels</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#A78BFA]" />
                    <span>Review PRs sorted by contributor level</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#A78BFA]" />
                    <span>Monitor repo health and merge velocity</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  // Save handle to localStorage for persistence
                  if (typeof window !== 'undefined' && githubHandle) {
                    localStorage.setItem('mergeship_handle', githubHandle)
                  }
                  router.push(`/maintainer?handle=${githubHandle}`)
                }}
                className="flex items-center justify-center gap-2 w-full px-8 py-4 bg-gradient-to-r from-[#A78BFA] to-[#8B5CF6] text-white text-[15px] font-bold rounded-xl hover:from-[#8B5CF6] hover:to-[#7C3AED] transition-all shadow-lg"
              >
                <Rocket className="h-5 w-5" />
                Go to Command Center
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

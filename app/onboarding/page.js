'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GitMerge,
  Bell,
  User,
  Rocket,
  ShieldCheck,
  Globe,
  Users,
  TrendingUp,
  Award,
  BarChart2,
  GitCommit,
  Database,
  Code2,
  Lock,
  ArrowRight,
  Brain,
  TerminalSquare,
  Layers,
  Trophy,
  Target,
  Zap,
  Sparkles,
  CheckCircle2,
  Loader2,
} from 'lucide-react'
import { account, OAuthProvider } from '@/lib/appwrite'
import { analyzeGithubProfile } from './actions'
import MaintainerWizard from './MaintainerWizard'

const STEPS = {
  ROLE: 'role_selection',
  CONNECT: 'connect',
  ANALYZING: 'analyzing',
  ASSESSMENT: 'assessment',
  COURSE: 'course',
  MAINTAINER_WIZARD: 'maintainer_wizard',
}

const ICON_MAP = {
  Brain,
  TrendingUp,
  Rocket,
  TerminalSquare,
  Layers,
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(STEPS.ROLE)
  const [me, setMe] = useState(null)
  const [githubHandle, setGithubHandle] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [selectedRole, setSelectedRole] = useState(null) // 'contributor' or 'maintainer'
  const kickedOffRef = useRef(false)

  /* --------- On mount: detect post-OAuth return + demo mode --------- */
  useEffect(() => {
    let mounted = true
    ;(async () => {
      // Demo mode: skip OAuth, jump into the analyzing flow with a handle.
      // Usage: /onboarding?demo=1  (defaults to 'octocat')
      //        /onboarding?demo=vercel
      //        /onboarding?demo=gaearon&role=maintainer (for maintainer flow)
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search)
        const demo = params.get('demo')
        const demoRole = params.get('role') // 'maintainer' or 'contributor'
        if (demo) {
          const handle = demo === '1' ? 'octocat' : demo
          setMe({ name: handle })
          setGithubHandle(handle)
          setSelectedRole(demoRole === 'maintainer' ? 'maintainer' : 'contributor')
          setStep(STEPS.ANALYZING)
          return
        }
      }
      try {
        const user = await account.get()
        if (!mounted) return
        setMe(user)
        const oauthInitiated =
          typeof window !== 'undefined' &&
          sessionStorage.getItem('mergeship_oauth') === '1'
        if (oauthInitiated) {
          sessionStorage.removeItem('mergeship_oauth')
          // CRITICAL: Restore selected role from sessionStorage after OAuth redirect
          const savedRole = sessionStorage.getItem('mergeship_role')
          if (savedRole) {
            setSelectedRole(savedRole)
            sessionStorage.removeItem('mergeship_role') // Clean up
          }
          setStep(STEPS.ANALYZING)
        }
      } catch (_) {
        // not signed in — stay on role step
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  /* --------- Analyzing: fetch identity + call Groq --------- */
  useEffect(() => {
    if (step !== STEPS.ANALYZING || kickedOffRef.current) return
    kickedOffRef.current = true
    setAnalyzing(true)

    const startedAt = Date.now()
    ;(async () => {
      let handle = null
      let repoCount = 0
      let ageYears = 0
      try {
        const identities = await account.listIdentities()
        const gh = (identities?.identities || []).find(
          (i) => i.provider === 'github'
        )
        if (gh?.providerUid) {
          // providerUid is the GitHub numeric id
          const ghUserRes = await fetch(
            `https://api.github.com/user/${gh.providerUid}`
          )
          if (ghUserRes.ok) {
            const ghUser = await ghUserRes.json()
            handle = ghUser.login
            repoCount = ghUser.public_repos || 0
            if (ghUser.created_at) {
              const ms = Date.now() - new Date(ghUser.created_at).getTime()
              ageYears = Math.max(0, +(ms / (365.25 * 24 * 3600 * 1000)).toFixed(1))
            }
          }
        }
      } catch (e) {
        console.warn('[onboarding] identity lookup failed', e)
      }

      // Fallback handle for demo/testing without a real github link
      if (!handle) handle = me?.name?.replace(/\s+/g, '') || 'octocat'
      setGithubHandle(handle)

      // If maintainer role, skip analysis and go straight to wizard
      if (selectedRole === 'maintainer') {
        const elapsed = Date.now() - startedAt
        const wait = Math.max(0, 2000 - elapsed)
        setTimeout(() => {
          setAnalyzing(false)
          setStep(STEPS.MAINTAINER_WIZARD)
        }, wait)
        return
      }

      // Contributor flow: analyze profile
      try {
        const result = await analyzeGithubProfile(handle, repoCount, ageYears)
        setAnalysis(result)
      } catch (err) {
        console.error(err)
        setAnalysis({
          success: false,
          stats: { commits: 0, prRate: 0, score: 30, level: 'BEGINNER' },
          paths: [],
        })
      } finally {
        // Ensure at least 4s of progress animation
        const elapsed = Date.now() - startedAt
        const wait = Math.max(0, 4000 - elapsed)
        setTimeout(() => {
          setAnalyzing(false)
          setStep(STEPS.ASSESSMENT)
        }, wait)
      }
    })()
  }, [step, me, selectedRole])

  /* --------- Connect GitHub handler --------- */
  const connectGithub = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    sessionStorage.setItem('mergeship_oauth', '1')
    // CRITICAL: Save selected role before OAuth redirect so we can restore it after
    if (selectedRole) {
      sessionStorage.setItem('mergeship_role', selectedRole)
    }
    account.createOAuth2Session(
      OAuthProvider.Github,
      `${origin}/onboarding`,
      `${origin}/onboarding?auth=failed`
    )
  }

  /* --------- Skip: browse without analysis --------- */
  const handleSkip = () => {
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-[#15111A] text-[#F8F8FF] flex flex-col">
      <OnboardingNav />

      <main className="flex-1 w-full">
        <AnimatePresence mode="wait">
          {step === STEPS.ROLE && (
            <RoleSelection
              key="role"
              onContributor={() => {
                setSelectedRole('contributor')
                setStep(STEPS.CONNECT)
              }}
              onMaintainer={() => {
                setSelectedRole('maintainer')
                setStep(STEPS.CONNECT)
              }}
            />
          )}
          {step === STEPS.CONNECT && (
            <ConnectStep
              key="connect"
              onConnect={connectGithub}
              onSkip={handleSkip}
            />
          )}
          {step === STEPS.ANALYZING && (
            <AnalyzingStep 
              key="analyzing" 
              handle={githubHandle} 
              analyzing={analyzing}
              isMaintainer={selectedRole === 'maintainer'}
            />
          )}
          {step === STEPS.ASSESSMENT && analysis && (
            <AssessmentStep
              key="assessment"
              analysis={analysis}
              handle={githubHandle}
              onChoosePath={() => setStep(STEPS.COURSE)}
            />
          )}
          {step === STEPS.COURSE && (
            <CourseStep
              key="course"
              level={analysis?.stats?.level || 'BEGINNER'}
              onStart={() => router.push('/dashboard')}
            />
          )}
          {step === STEPS.MAINTAINER_WIZARD && (
            <MaintainerWizard
              key="maintainer-wizard"
              githubHandle={githubHandle}
              onComplete={() => router.push('/maintainer')}
            />
          )}
        </AnimatePresence>
      </main>

      {step !== STEPS.COURSE && <OnboardingFooter />}
    </div>
  )
}

/* =========================================================
 *                       TOP NAV
 * ========================================================= */
function OnboardingNav() {
  return (
    <header className="sticky top-0 z-30 bg-[rgba(21,17,26,0.8)] backdrop-blur-md border-b border-white/5">
      <div className="max-w-6xl mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#D8B4FE] flex items-center justify-center">
            <GitMerge className="h-4 w-4 text-[#0D0D15]" strokeWidth={2.5} />
          </div>
          <span
            className="font-bold text-[15px]"
            style={{ fontFamily: 'Outfit, sans-serif' }}
          >
            MergeShip
          </span>
        </Link>
        <div className="flex items-center gap-5 text-[#8B7E9F]">
          <button className="hover:text-white transition-colors" aria-label="Notifications">
            <Bell className="h-5 w-5" />
          </button>
          <button className="hover:text-white transition-colors" aria-label="User">
            <User className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  )
}

function OnboardingFooter() {
  return (
    <footer className="border-t border-white/5 py-6 mt-10">
      <div className="max-w-6xl mx-auto px-6 md:px-10 flex flex-wrap items-center justify-center gap-x-10 gap-y-2 text-[11px] tracking-[0.2em] uppercase font-semibold text-[#8B7E9F]">
        <a href="#" className="hover:text-white transition-colors">Documentation</a>
        <a href="#" className="hover:text-white transition-colors">Discord Community</a>
        <a href="#" className="hover:text-white transition-colors">Support</a>
      </div>
    </footer>
  )
}

/* =========================================================
 *                  STEP 1 — ROLE SELECTION
 * ========================================================= */
function RoleSelection({ onContributor, onMaintainer }) {
  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="max-w-5xl mx-auto px-6 md:px-10 py-20 md:py-28"
    >
      <div className="text-center mb-14 animate-fade-in">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2A2136] border border-white/5 text-[11px] tracking-widest uppercase text-[#D8B4FE] mb-6">
          <Sparkles className="h-3 w-3" />
          Step 1 of 4
        </div>
        <h1
          className="text-4xl md:text-5xl font-extrabold tracking-tight"
          style={{ fontFamily: 'Outfit, sans-serif' }}
        >
          How do you want to use <span className="gradient-text">MergeShip</span>?
        </h1>
        <p className="mt-4 text-[15px] text-[#8B7E9F] max-w-xl mx-auto">
          Pick a track to tailor your experience. You can switch between modes anytime
          from the sidebar.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 animate-fade-in" style={{ animationDelay: '120ms' }}>
        <RoleCard
          icon={Rocket}
          accent="#D8B4FE"
          hoverBorder="hover:border-[#D8B4FE]/50"
          label="Contributor"
          title="I am a Contributor"
          desc="Level up with curated issues, XP, achievements and community quests."
          bullets={[
            'AI-matched issues by skill level',
            'Earn XP, badges, and streaks',
            'Join guilds and mentor pairings',
          ]}
          onClick={onContributor}
        />
        <RoleCard
          icon={ShieldCheck}
          accent="#38BDF8"
          hoverBorder="hover:border-[#38BDF8]/50"
          label="Maintainer"
          title="I am a Maintainer"
          desc="Keep your repo healthy with AI triage, team workload balancing and analytics."
          bullets={[
            'AI-assisted issue triage',
            'Team availability & workload',
            'Repo health + PR velocity',
          ]}
          onClick={onMaintainer}
        />
      </div>
    </motion.section>
  )
}

function RoleCard({ icon: Icon, accent, hoverBorder, label, title, desc, bullets, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`group relative text-left bg-[#1E1826] border border-white/5 ${hoverBorder} rounded-2xl p-8 transition-all hover:-translate-y-1`}
      style={{ transition: 'transform 0.25s ease, border-color 0.25s ease' }}
    >
      <div
        className="w-14 h-14 rounded-xl flex items-center justify-center mb-6"
        style={{ background: `${accent}22`, color: accent }}
      >
        <Icon className="h-7 w-7" strokeWidth={2} />
      </div>
      <div className="text-[11px] tracking-[0.2em] uppercase font-semibold mb-2" style={{ color: accent }}>
        {label}
      </div>
      <h3
        className="text-2xl font-bold text-white mb-3"
        style={{ fontFamily: 'Outfit, sans-serif' }}
      >
        {title}
      </h3>
      <p className="text-[14px] text-[#8B7E9F] leading-relaxed mb-5">{desc}</p>
      <ul className="space-y-2 mb-7">
        {bullets.map((b) => (
          <li key={b} className="flex items-start gap-2 text-[13px] text-[#A0A0C0]">
            <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" style={{ color: accent }} />
            {b}
          </li>
        ))}
      </ul>
      <div
        className="inline-flex items-center gap-2 text-[13px] font-semibold"
        style={{ color: accent }}
      >
        Choose this path
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </div>
    </button>
  )
}

/* =========================================================
 *                  STEP 2 — CONNECT
 * ========================================================= */
function ConnectStep({ onConnect, onSkip }) {
  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="max-w-4xl mx-auto px-6 md:px-10 py-16 md:py-20"
    >
      <div className="relative">
        {/* vertical spine */}
        <div className="absolute left-[22px] top-6 bottom-6 w-px bg-gradient-to-b from-[#D8B4FE]/60 via-[#D8B4FE]/20 to-transparent" />

        {/* SECTION 1 */}
        <Section
          icon={Globe}
          step={1}
          title="What is Open Source?"
          subtitle="Software built in public. Anyone can read, improve, and ship it."
        >
          <div className="grid sm:grid-cols-3 gap-4 mt-6">
            <InfoCard
              icon={Users}
              color="#A78BFA"
              title="Community"
              desc="Build with developers across the world — from indie hackers to Fortune 500 teams."
            />
            <InfoCard
              icon={TrendingUp}
              color="#67E8F9"
              title="Skill Growth"
              desc="Real code review and production-grade PRs teach faster than any tutorial."
            />
            <InfoCard
              icon={Award}
              color="#F472B6"
              title="Recognition"
              desc="A public portfolio of shipped work becomes your strongest hiring signal."
            />
          </div>
        </Section>

        {/* SECTION 2 */}
        <Section
          icon={BarChart2}
          step={2}
          title="Your Path, Data-Driven"
          subtitle="We analyze your GitHub to match issues and learning paths to your exact skill."
        >
          <div className="mt-6 grid grid-cols-3 gap-4">
            {[
              { Icon: GitCommit, label: 'COMMITS', color: '#A78BFA' },
              { Icon: Database,  label: 'REPOS',   color: '#67E8F9' },
              { Icon: Code2,     label: 'LANGUAGES', color: '#F472B6' },
            ].map((m) => (
              <div
                key={m.label}
                className="bg-[#1E1826] border border-white/5 rounded-xl p-5 flex flex-col items-center justify-center text-center"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
                  style={{ background: `${m.color}22`, color: m.color }}
                >
                  <m.Icon className="h-6 w-6" />
                </div>
                <div
                  className="text-[11px] tracking-[0.2em] uppercase font-semibold text-[#8B7E9F]"
                >
                  {m.label}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* SECTION 3 */}
        <Section
          icon={Rocket}
          step={3}
          title="Ready to start your journey?"
          subtitle="Connect GitHub and we’ll build your personalized launch plan in seconds."
          last
        >
          <div className="mt-6 bg-[#1E1826] border border-white/5 rounded-2xl p-8 md:p-10 text-center relative overflow-hidden">
            <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-[#D8B4FE]/10 blur-3xl" />
            <div className="relative">
              <div
                className="mx-auto w-16 h-16 rounded-full bg-[#D8B4FE] flex items-center justify-center mb-6"
                style={{ boxShadow: '0 0 30px rgba(216,180,254,0.55)' }}
              >
                <Rocket className="h-7 w-7 text-[#0D0D15]" strokeWidth={2.2} />
              </div>
              <button
                onClick={onConnect}
                className="inline-flex items-center gap-2 px-7 py-3 rounded-full font-bold text-[14px] transition-all hover:-translate-y-0.5"
                style={{
                  background: '#4ADE80',
                  color: '#062A15',
                  boxShadow: '0 10px 30px rgba(74,222,128,0.35)',
                }}
              >
                <GitMerge className="h-4 w-4" />
                Connect GitHub Account
                <ArrowRight className="h-4 w-4" />
              </button>
              <div className="mt-5 inline-flex items-center gap-2 text-[12px] text-[#8B7E9F]">
                <Lock className="h-3.5 w-3.5" />
                We only request read-only access to your public profile.
              </div>
              <div className="mt-6">
                <button
                  onClick={onSkip}
                  className="text-[11px] tracking-[0.2em] uppercase font-bold text-[#8B7E9F] hover:text-white transition-colors inline-flex items-center gap-1.5"
                >
                  Browse paths without data analysis
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        </Section>
      </div>
    </motion.section>
  )
}

function Section({ icon: Icon, step, title, subtitle, children, last }) {
  return (
    <div className={`relative pl-16 ${last ? '' : 'mb-14'} animate-fade-in`}>
      <div className="absolute left-0 top-0 w-11 h-11 rounded-full bg-[#2A2136] border border-white/10 flex items-center justify-center">
        <Icon className="h-5 w-5 text-[#D8B4FE]" />
      </div>
      <div className="text-[11px] tracking-[0.2em] uppercase font-bold text-[#D8B4FE] mb-2">
        Step {step}
      </div>
      <h2
        className="text-2xl md:text-3xl font-bold text-white"
        style={{ fontFamily: 'Outfit, sans-serif' }}
      >
        {title}
      </h2>
      <p className="mt-2 text-[14px] text-[#8B7E9F] max-w-xl">{subtitle}</p>
      {children}
    </div>
  )
}

function InfoCard({ icon: Icon, color, title, desc }) {
  return (
    <div className="bg-[#1E1826] border border-white/5 rounded-xl p-5 hover:border-white/10 transition-colors">
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
        style={{ background: `${color}22`, color }}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="font-semibold text-white mb-1">{title}</div>
      <p className="text-[13px] text-[#8B7E9F] leading-relaxed">{desc}</p>
    </div>
  )
}

/* =========================================================
 *                  STEP 3 — ANALYZING
 * ========================================================= */
function AnalyzingStep({ handle, analyzing, isMaintainer }) {
  const maintainerMessages = [
    'Connecting to GitHub…',
    'Fetching organization data…',
    'Loading repository access…',
    'Preparing maintainer dashboard…',
    'Almost there…',
  ]
  
  const contributorMessages = [
    'Fetching GitHub identity…',
    'Scanning commit patterns…',
    'Measuring PR acceptance rate…',
    'Detecting tech stack…',
    'Consulting MergeShip AI mentor…',
  ]
  
  const messages = isMaintainer ? maintainerMessages : contributorMessages
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % messages.length), 900)
    return () => clearInterval(t)
  }, [])

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="max-w-3xl mx-auto px-6 md:px-10 py-24 md:py-32"
    >
      <div className="bg-[#1E1826] border border-white/5 rounded-3xl p-10 md:p-14 text-center animate-fade-in relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-[#9333EA]/20 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-[#D8B4FE]/20 blur-3xl" />

        <div className="relative">
          <div className="mx-auto w-16 h-16 rounded-full bg-[#2A2136] flex items-center justify-center mb-6 animate-spin-slow">
            <Brain className="h-7 w-7 text-[#D8B4FE]" />
          </div>
          <div className="text-[11px] tracking-[0.2em] uppercase font-bold text-[#D8B4FE] mb-3">
            {isMaintainer ? 'Preparing Setup' : 'AI Brain Scan'}
          </div>
          <h2
            className="text-3xl md:text-4xl font-extrabold mb-3"
            style={{ fontFamily: 'Outfit, sans-serif' }}
          >
            {isMaintainer ? (
              <>Setting up <span className="gradient-text">{handle || 'your account'}</span>…</>
            ) : (
              <>Analyzing <span className="gradient-text">{handle || 'your profile'}</span>…</>
            )}
          </h2>
          <p className="text-[14px] text-[#8B7E9F] max-w-md mx-auto mb-10">
            {isMaintainer 
              ? 'Preparing your maintainer command center and connecting to your repositories.'
              : 'Crunching commits, PRs, languages and repository signals to build your tailored learning path.'}
          </p>

          <div className="w-full h-3 rounded-full bg-[#2A2136] overflow-hidden">
            <div
              className="h-full rounded-full animate-pulse-bar"
              style={{
                background: 'linear-gradient(90deg, #9333EA, #D8B4FE)',
                boxShadow: '0 0 18px rgba(216,180,254,0.45)',
              }}
            />
          </div>

          <div className="mt-6 h-6 flex items-center justify-center gap-2 text-[13px] text-[#A0A0C0]">
            <Loader2 className="h-4 w-4 animate-spin text-[#D8B4FE]" />
            <span className="transition-opacity">{messages[idx]}</span>
          </div>
        </div>
      </div>
    </motion.section>
  )
}

/* =========================================================
 *                  STEP 4 — ASSESSMENT
 * ========================================================= */
function AssessmentStep({ analysis, handle, onChoosePath }) {
  const stats = analysis.stats || {}
  const paths = analysis.paths || []
  const score = Math.max(0, Math.min(100, stats.score || 0))
  const level = stats.level || 'BEGINNER'

  const timelineItems = [
    { label: 'Connect GitHub Account', state: 'done' },
    { label: 'Analyzing commit patterns', state: 'done' },
    { label: 'Assessment Complete', state: 'active' },
    { label: 'Choose a Learning Path', state: 'pending' },
  ]

  const levelColor =
    level === 'EXPERT' ? '#F472B6' : level === 'INTERMEDIATE' ? '#67E8F9' : '#4ADE80'

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="max-w-6xl mx-auto px-6 md:px-10 py-14 md:py-20 grid md:grid-cols-[240px_1fr] gap-10"
    >
      {/* Timeline */}
      <aside className="hidden md:block relative animate-fade-in">
        <div className="text-[11px] tracking-[0.2em] uppercase font-bold text-[#8B7E9F] mb-6">
          Your Journey
        </div>
        <div className="relative pl-6">
          <div className="absolute left-[9px] top-1 bottom-1 w-px bg-white/10" />
          {timelineItems.map((t) => (
            <div key={t.label} className="relative mb-6 last:mb-0">
              <div
                className={`absolute -left-6 top-1 w-[18px] h-[18px] rounded-full flex items-center justify-center ${
                  t.state === 'done'
                    ? 'bg-[#D8B4FE]'
                    : t.state === 'active'
                    ? 'bg-[#D8B4FE] ring-4 ring-[#D8B4FE]/25'
                    : 'bg-[#2A2136] border border-white/10'
                }`}
              >
                {t.state === 'done' && (
                  <CheckCircle2 className="h-3 w-3 text-[#15111A]" />
                )}
                {t.state === 'active' && (
                  <div className="w-1.5 h-1.5 rounded-full bg-[#15111A]" />
                )}
              </div>
              <div
                className={`text-[13px] leading-tight ${
                  t.state === 'pending' ? 'text-[#8B7E9F]' : 'text-white'
                }`}
              >
                {t.label}
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Main */}
      <div className="space-y-8">
        <div className="animate-fade-in">
          <div className="text-[11px] tracking-[0.2em] uppercase font-bold text-[#D8B4FE] mb-2">
            AI Assessment Complete
          </div>
          <h2
            className="text-3xl md:text-4xl font-extrabold mb-2"
            style={{ fontFamily: 'Outfit, sans-serif' }}
          >
            Level up your open-source career
          </h2>
          <p className="text-[14px] text-[#8B7E9F] max-w-xl">
            Based on <span className="text-white font-semibold">@{handle}</span>’s
            public activity, here’s your current snapshot and recommended paths.
          </p>
        </div>

        {/* Score card */}
        <div
          className="bg-[#1E1826] border border-white/5 rounded-2xl p-8 grid md:grid-cols-[220px_1fr] gap-8 items-center animate-fade-in"
          style={{ animationDelay: '120ms' }}
        >
          <ScoreRing score={score} level={level} levelColor={levelColor} />
          <div>
            <div className="text-[11px] tracking-[0.2em] uppercase font-bold text-[#8B7E9F] mb-4">
              Signal Breakdown
            </div>
            <div className="grid grid-cols-2 gap-4">
              <StatBar label="Account Age" value={`${stats.ageYears || 0}y`} pct={Math.min(((stats.ageYears || 0) / 5) * 100, 100)} color="#A78BFA" />
              <StatBar label="Repo Count" value={String(stats.repoCount || 0)} pct={Math.min(((stats.repoCount || 0) / 30) * 100, 100)} color="#67E8F9" />
              <StatBar label="Commits" value={(stats.commits || 0).toLocaleString()} pct={Math.min(((stats.commits || 0) / 1000) * 100, 100)} color="#F472B6" />
              <StatBar label="PR Acceptance" value={`${stats.prRate || 0}%`} pct={stats.prRate || 0} color="#4ADE80" />
            </div>
          </div>
        </div>

        {/* Learning paths */}
        <div className="animate-fade-in" style={{ animationDelay: '220ms' }}>
          <div className="text-[11px] tracking-[0.2em] uppercase font-bold text-[#D8B4FE] mb-4">
            Recommended Learning Paths
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {paths.map((p, i) => {
              const Icon = ICON_MAP[p.icon] || Brain
              const accent = i === 0 ? '#A78BFA' : '#67E8F9'
              return (
                <button
                  key={p.title + i}
                  onClick={onChoosePath}
                  className="group text-left bg-[#1E1826] border border-white/5 hover:border-[#D8B4FE]/40 rounded-2xl p-6 transition-all hover:-translate-y-0.5"
                >
                  <div
                    className="w-11 h-11 rounded-lg flex items-center justify-center mb-4"
                    style={{ background: `${accent}22`, color: accent }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="text-[11px] tracking-[0.2em] uppercase font-bold text-[#8B7E9F] mb-1">
                    AI-Recommended Path
                  </div>
                  <h3
                    className="text-[17px] font-bold text-white mb-2"
                    style={{ fontFamily: 'Outfit, sans-serif' }}
                  >
                    {p.title}
                  </h3>
                  <p className="text-[13px] text-[#8B7E9F] leading-relaxed mb-4">
                    {p.desc}
                  </p>
                  <div className="inline-flex items-center gap-2 text-[12px] font-semibold text-[#D8B4FE]">
                    Start this path
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </motion.section>
  )
}

function ScoreRing({ score, level, levelColor }) {
  // circle r=15, circumference ≈ 94.25
  const C = 2 * Math.PI * 15
  const offset = C - (score / 100) * C
  return (
    <div className="relative mx-auto w-[180px] h-[180px] flex items-center justify-center">
      <svg viewBox="0 0 40 40" className="w-full h-full -rotate-90">
        <circle cx="20" cy="20" r="15" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2.5" />
        <circle
          cx="20" cy="20" r="15"
          fill="none"
          stroke="url(#grad)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(0.16,1,0.3,1)' }}
        />
        <defs>
          <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#A78BFA" />
            <stop offset="100%" stopColor="#67E8F9" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-[10px] tracking-[0.25em] uppercase text-[#8B7E9F]">Score</div>
        <div className="text-5xl font-extrabold stat-number leading-none">{score}</div>
        <div
          className="mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-[0.15em]"
          style={{
            background: `${levelColor}22`,
            color: levelColor,
            border: `1px solid ${levelColor}55`,
          }}
        >
          {level}
        </div>
      </div>
    </div>
  )
}

function StatBar({ label, value, pct, color }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-[10px] tracking-[0.2em] uppercase font-bold text-[#8B7E9F]">
          {label}
        </span>
        <span className="text-[13px] font-bold text-white">{value}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: color,
            boxShadow: `0 0 8px ${color}55`,
            transition: 'width 1.2s cubic-bezier(0.16,1,0.3,1)',
          }}
        />
      </div>
    </div>
  )
}

/* =========================================================
 *                  STEP 5 — COURSE
 * ========================================================= */
function CourseStep({ level, onStart }) {
  const steps = [
    {
      n: 1,
      icon: Target,
      title: 'Clear the Board',
      desc: 'Pick AI-matched issues and ship your first merged PR this week.',
      color: '#A78BFA',
    },
    {
      n: 2,
      icon: Zap,
      title: 'Earn XP & Badges',
      desc: 'Every merged PR powers your profile, unlocks badges and fuels streaks.',
      color: '#67E8F9',
    },
    {
      n: 3,
      icon: TrendingUp,
      title: 'Level Up',
      desc: 'Climb from Novice to Expert, unlock guilds and earn mentor pairings.',
      color: '#F472B6',
    },
  ]

  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="max-w-4xl mx-auto px-6 md:px-10 py-20 md:py-28 text-center relative"
    >
      <div className="absolute inset-0 hero-bg opacity-70 pointer-events-none" />

      <div className="relative">
        {/* Celebration badge */}
        <div className="flex justify-center mb-8 animate-fade-in">
          <div
            className="relative rotate-[-4deg] bg-gradient-to-br from-[#7C3AED] to-[#06B6D4] rounded-2xl px-7 py-5 flex items-center gap-4 text-left"
            style={{ boxShadow: '0 20px 60px rgba(124,58,237,0.45)' }}
          >
            <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center">
              <Trophy className="h-6 w-6 text-[#FDE68A]" />
            </div>
            <div>
              <div className="text-[10px] tracking-[0.25em] uppercase font-bold text-white/80">
                Achievement Unlocked
              </div>
              <div
                className="text-xl font-extrabold text-white"
                style={{ fontFamily: 'Outfit, sans-serif' }}
              >
                {level === 'EXPERT' ? 'Level 5 UNLOCKED' : level === 'INTERMEDIATE' ? 'Level 3 UNLOCKED' : 'Level 1 UNLOCKED'}
              </div>
            </div>
          </div>
        </div>

        <h1
          className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 animate-fade-in"
          style={{ fontFamily: 'Outfit, sans-serif', animationDelay: '120ms' }}
        >
          Welcome to Your <span className="gradient-text">Open-Source Journey</span>
        </h1>
        <p
          className="text-[15px] text-[#8B7E9F] max-w-xl mx-auto mb-14 animate-fade-in"
          style={{ animationDelay: '200ms' }}
        >
          MergeShip turns your GitHub grind into a clear, rewarding loop.
          Here’s how the loop works.
        </p>

        <div className="grid md:grid-cols-3 gap-5 mb-14">
          {steps.map((s, i) => (
            <div
              key={s.n}
              className="bg-[#1E1826] border border-white/5 rounded-2xl p-6 text-left animate-fade-in"
              style={{ animationDelay: `${280 + i * 100}ms` }}
            >
              <div className="flex items-center justify-between mb-5">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: `${s.color}22`, color: s.color }}
                >
                  <s.icon className="h-5 w-5" />
                </div>
                <div
                  className="text-4xl font-extrabold opacity-40"
                  style={{ fontFamily: 'Outfit, sans-serif', color: s.color }}
                >
                  0{s.n}
                </div>
              </div>
              <h3
                className="text-lg font-bold text-white mb-2"
                style={{ fontFamily: 'Outfit, sans-serif' }}
              >
                {s.title}
              </h3>
              <p className="text-[13px] text-[#8B7E9F] leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>

        <button
          onClick={onStart}
          className="btn-primary animate-fade-in"
          style={{ animationDelay: '600ms' }}
        >
          <Rocket className="h-4 w-4" />
          Start Contributing
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </motion.section>
  )
}

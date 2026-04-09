'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  GitMerge,
  Trophy,
  Shield,
  Users,
  Sparkles,
  ArrowRight,
  Github,
  Zap,
  Target,
  Rocket,
} from 'lucide-react'
import AuthStatus from '@/components/auth/AuthStatus'
import { account } from '@/lib/appwrite'

const featureCards = [
  {
    title: 'Contributor Portal',
    icon: Trophy,
    accent: '#A78BFA',
    glow: 'glow-purple',
    bullets: [
      'Gamified dashboard with XP & levels',
      'Curated issues tuned to your skill',
      'Streaks, badges and daily quests',
    ],
    copy: 'Grind issues like a game. Earn XP, climb levels, unlock badges — all driven by real-world open-source work.',
  },
  {
    title: 'Maintainer Hub',
    icon: Shield,
    accent: '#67E8F9',
    glow: 'glow-cyan',
    bullets: [
      'AI-assisted triage & labeling',
      'Team workload & availability',
      'Repo health + PR merge velocity',
    ],
    copy: 'The layer GitHub never built. Keep your repo healthy, your team balanced, and your triage queue cold.',
  },
  {
    title: 'Community',
    icon: Users,
    accent: '#F0ABFC',
    glow: 'glow-pink',
    bullets: [
      'Skill-based guilds & challenges',
      'Mentor pairings that actually match',
      'Leaderboards that celebrate craft',
    ],
    copy: 'Find your crew. Join guilds by language or stack, pair with mentors, and ship together.',
  },
]

const stats = [
  { value: '2,500+', label: 'Contributors' },
  { value: '150+',   label: 'Repositories' },
  { value: '50,000+', label: 'Issues Solved' },
]

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
}

export default function LandingPage() {
  const router = useRouter()
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  // Protected route: Redirect logged-in users to dashboard
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const user = await account.get()
        if (user && mounted) {
          // User is logged in, redirect to dashboard
          router.push('/dashboard')
        }
      } catch (error) {
        // User not logged in, stay on landing page
      } finally {
        if (mounted) {
          setIsCheckingAuth(false)
        }
      }
    })()
    return () => { mounted = false }
  }, [router])

  // Show loading while checking auth
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#060611]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#A78BFA] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[14px] text-[#8B7E9F]">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* ---------- NAV ---------- */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-[rgba(6,6,17,0.6)] border-b border-[rgba(255,255,255,0.05)]">
        <div className="max-w-7xl mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#D8B4FE] flex items-center justify-center">
              <GitMerge className="h-5 w-5 text-[#0D0D15]" strokeWidth={2.5} />
            </div>
            <span
              className="font-bold text-[#F8F8FF] text-lg"
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              MergeShip
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-[#A0A0C0]">
            <a href="#features" className="hover:text-[#F8F8FF] transition-colors">Features</a>
            <a href="#stats" className="hover:text-[#F8F8FF] transition-colors">Impact</a>
            <Link href="/dashboard" className="hover:text-[#F8F8FF] transition-colors">Contributor</Link>
            <Link href="/maintainer" className="hover:text-[#F8F8FF] transition-colors">Maintainer</Link>
          </nav>
          <div>
            <AuthStatus variant="secondary" redirectPath="/onboarding" />
          </div>
        </div>
      </header>

      {/* ---------- HERO ---------- */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 hero-bg" />
        <div className="absolute inset-0 grid-bg opacity-50" />
        {/* decorative floating blobs */}
        <div className="absolute -top-32 -left-24 w-[460px] h-[460px] rounded-full bg-[#7C3AED]/20 blur-[120px] float-slow" />
        <div className="absolute top-20 -right-32 w-[520px] h-[520px] rounded-full bg-[#06B6D4]/20 blur-[140px] float-slow" />

        <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-10 py-24 md:py-32 text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[rgba(124,58,237,0.4)] bg-[rgba(124,58,237,0.1)] text-[12px] font-semibold tracking-widest uppercase text-[#A78BFA] mb-8"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Open source, leveled up
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="text-5xl md:text-7xl font-extrabold leading-[1.05] tracking-tight"
            style={{ fontFamily: 'Outfit, sans-serif' }}
          >
            Level Up Your <br className="hidden md:block" />
            <span className="gradient-text">Open Source Journey</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="mt-6 max-w-2xl mx-auto text-lg md:text-xl text-[#A0A0C0]"
          >
            MergeShip turns open source into a skill-building RPG. Curated issues,
            XP and achievements for contributors — AI-assisted triage and analytics
            for maintainers.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-10 flex items-center justify-center gap-4 flex-wrap"
          >
            <Link href="/onboarding" className="btn-primary text-sm">
              <Rocket className="h-4 w-4" />
              Start Your Journey
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary text-sm"
            >
              <Github className="h-4 w-4" />
              View on GitHub
            </a>
          </motion.div>

          {/* floating mini cards */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto"
          >
            {[
              { icon: Zap, label: 'Daily quests', accent: '#FBBF24' },
              { icon: Target, label: 'AI-matched issues', accent: '#06B6D4' },
              { icon: Trophy, label: 'XP & badges', accent: '#EC4899' },
            ].map((pill, i) => (
              <div
                key={i}
                className="glass-card px-5 py-4 flex items-center gap-3 text-left"
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: `${pill.accent}22`, color: pill.accent }}
                >
                  <pill.icon className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-[13px] text-[#A0A0C0]">Feature</div>
                  <div className="text-[15px] font-semibold text-[#F8F8FF]">
                    {pill.label}
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ---------- FEATURES ---------- */}
      <section id="features" className="relative py-24">
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <div className="max-w-3xl mb-16">
            <div className="text-[11px] uppercase tracking-[0.2em] font-bold text-[#A78BFA] mb-4">
              The layer GitHub never built
            </div>
            <h2
              className="text-4xl md:text-5xl font-extrabold text-[#F8F8FF]"
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              Two sides of the same <span className="gradient-text-pink">mission</span>.
            </h2>
            <p className="mt-4 text-lg text-[#A0A0C0]">
              Whether you&apos;re shipping your first PR or maintaining a top-tier
              repo, MergeShip gives you the tools, the feedback loop, and the
              community to go further.
            </p>
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {featureCards.map((card) => {
              const Icon = card.icon
              return (
                <motion.div
                  key={card.title}
                  variants={fadeUp}
                  className="glass-card transition-card p-8 group"
                >
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 ${card.glow}`}
                    style={{ background: `${card.accent}22`, color: card.accent }}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3
                    className="text-2xl font-bold text-[#F8F8FF] mb-3"
                    style={{ fontFamily: 'Outfit, sans-serif' }}
                  >
                    {card.title}
                  </h3>
                  <p className="text-[15px] text-[#A0A0C0] leading-relaxed mb-6">
                    {card.copy}
                  </p>
                  <ul className="space-y-2">
                    {card.bullets.map((b) => (
                      <li
                        key={b}
                        className="flex items-start gap-2 text-[13px] text-[#A0A0C0]"
                      >
                        <span
                          className="mt-1 inline-block w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ background: card.accent }}
                        />
                        {b}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </section>

      {/* ---------- STATS ---------- */}
      <section id="stats" className="relative py-20">
        <div className="max-w-6xl mx-auto px-6 md:px-10">
          <div className="glass-card p-10 md:p-14">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 text-center md:text-left">
              {stats.map((s, i) => (
                <div key={s.label} className={i !== 0 ? 'md:pl-10 md:border-l md:border-[rgba(255,255,255,0.08)]' : ''}>
                  <div className="stat-number text-5xl md:text-6xl">
                    {s.value}
                  </div>
                  <div className="mt-3 text-[13px] uppercase tracking-[0.2em] font-semibold text-[#A0A0C0]">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section className="relative py-28">
        <div className="absolute inset-0 hero-bg opacity-60" />
        <div className="relative max-w-4xl mx-auto px-6 md:px-10 text-center">
          <h2
            className="text-4xl md:text-5xl font-extrabold text-[#F8F8FF]"
            style={{ fontFamily: 'Outfit, sans-serif' }}
          >
            Ready to <span className="gradient-text">ship your first quest</span>?
          </h2>
          <p className="mt-5 text-lg text-[#A0A0C0] max-w-xl mx-auto">
            Connect your GitHub, pick a repo, and we&apos;ll match you to issues
            perfectly scoped to your level. Your journey starts in 30 seconds.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4 flex-wrap">
            <Link href="/onboarding" className="btn-primary">
              <Rocket className="h-4 w-4" />
              Start Your Journey
            </Link>
            <Link href="/maintainer" className="btn-secondary">
              <Shield className="h-4 w-4" />
              I&apos;m a Maintainer
            </Link>
          </div>
        </div>
      </section>

      {/* ---------- FOOTER ---------- */}
      <footer className="border-t border-[rgba(255,255,255,0.05)] py-10">
        <div className="max-w-7xl mx-auto px-6 md:px-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#D8B4FE] flex items-center justify-center">
              <GitMerge className="h-4 w-4 text-[#0D0D15]" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-[#F8F8FF]" style={{ fontFamily: 'Outfit, sans-serif' }}>
              MergeShip
            </span>
          </div>
          <div className="flex items-center gap-6 text-[13px] text-[#A0A0C0]">
            <a href="#features" className="hover:text-[#F8F8FF]">Features</a>
            <a href="#stats" className="hover:text-[#F8F8FF]">Impact</a>
            <Link href="/onboarding" className="hover:text-[#F8F8FF]">Get Started</Link>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-[#F8F8FF]">GitHub</a>
          </div>
          <div className="text-[12px] text-[#606080]">
            © {new Date().getFullYear()} MergeShip. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}

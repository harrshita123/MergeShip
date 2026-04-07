'use client'

import {
  LayoutDashboard,
  Search,
  Trophy,
  BarChart3,
  User,
  Users as UsersIcon,
  MessageCircle,
} from 'lucide-react'
import { usePathname } from 'next/navigation'
import BaseSidebar from './BaseSidebar'

const navItems = [
  { label: 'Dashboard',    icon: LayoutDashboard, href: '/dashboard' },
  { label: 'Issues',       icon: Search,          href: '/issues' },
  { label: 'Achievements', icon: Trophy,          href: '/achievements' },
  { label: 'Mentorship',   icon: UsersIcon,       href: '/mentorship' },
  { label: 'Leaderboard',  icon: BarChart3,       href: '/leaderboard' },
  { label: 'Portfolio',    icon: User,            href: '/portfolio' },
  { label: 'Community',    icon: UsersIcon,       href: '/community' },
  { label: 'Messages',     icon: MessageCircle,   href: '/messages' },
]

export default function ContributorSidebar() {
  const pathname = usePathname()
  return (
    <BaseSidebar
      navItems={navItems}
      currentPath={pathname}
      mode="contributor"
      accentColor="#D8B4FE"
    />
  )
}

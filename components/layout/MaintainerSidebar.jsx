'use client'

import { Shield, AlertCircle, TrendingUp, MessageCircle } from 'lucide-react'
import { usePathname } from 'next/navigation'
import BaseSidebar from './BaseSidebar'

const navItems = [
  { label: 'Command Center', icon: Shield,         href: '/maintainer' },
  { label: 'Triage',         icon: AlertCircle,    href: '/maintainer/triage' },
  { label: 'Analytics',      icon: TrendingUp,     href: '/maintainer/analytics' },
  { label: 'Messages',       icon: MessageCircle,  href: '/messages' },
]

export default function MaintainerSidebar() {
  const pathname = usePathname()
  return (
    <BaseSidebar
      navItems={navItems}
      currentPath={pathname}
      mode="maintainer"
      accentColor="#38BDF8"
    />
  )
}

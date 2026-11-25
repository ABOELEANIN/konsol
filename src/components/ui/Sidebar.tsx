'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Package, Settings, LogOut, LayoutDashboard,
  Users, Building2, FileText, ChevronRight
} from 'lucide-react'

const NAV = [
  { href: '/shipments', label: 'Shipments', icon: Package },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/templates', label: 'Templates', icon: FileText },
  { href: '/stakeholders', label: 'Stakeholders', icon: Users },
  { href: '/tenants', label: 'Tenants', icon: Building2 },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-60 flex-shrink-0 bg-konsol-800 border-r border-konsol-600 flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-konsol-600">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-konsol-accent rounded-md flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-xs">BK</span>
          </div>
          <div>
            <div className="text-white font-semibold text-sm leading-tight">ByKonsol</div>
            <div className="text-gray-500 text-xs">Logistics OS</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors group ${
                active
                  ? 'bg-konsol-accent/15 text-konsol-accent'
                  : 'text-gray-400 hover:text-white hover:bg-konsol-700'
              }`}
            >
              <Icon size={16} className={active ? 'text-konsol-accent' : 'text-gray-500 group-hover:text-gray-300'} />
              {label}
              {active && <ChevronRight size={12} className="ml-auto text-konsol-accent/60" />}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-konsol-600">
        <div className="px-3 py-2 mb-1">
          <div className="text-white text-xs font-medium truncate">{userEmail}</div>
          <div className="text-gray-500 text-xs">Admin</div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  )
}

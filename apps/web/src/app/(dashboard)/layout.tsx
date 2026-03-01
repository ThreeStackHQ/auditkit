'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Activity, FolderOpen, Settings, Menu, X, Bell, LogOut, ChevronRight } from 'lucide-react'

const navItems = [
  { href: '/projects', label: 'Projects', icon: FolderOpen },
  { href: '/settings', label: 'Settings', icon: Settings },
]

const BRAND = '#f97415'

function Sidebar({ pathname, onClose }: { pathname: string; onClose?: () => void }) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-white/10">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: BRAND }}>
          <Activity className="w-4 h-4 text-white" />
        </div>
        <span className="text-sm font-semibold text-white">AuditKit</span>
        {onClose && <button onClick={onClose} className="ml-auto md:hidden text-gray-400 hover:text-white" aria-label="Close"><X className="w-5 h-5" /></button>}
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link key={href} href={href} onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors group ${active ? 'text-orange-300' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}
              style={active ? { background: `${BRAND}20` } : {}}>
              <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-orange-400' : 'text-gray-500 group-hover:text-gray-300'}`} />
              {label}
              {active && <ChevronRight className="ml-auto w-3 h-3 text-orange-400 opacity-60" />}
            </Link>
          )
        })}
      </nav>
      <div className="border-t border-white/10 px-3 py-3">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white" style={{ background: `linear-gradient(135deg, ${BRAND}, #c2410c)` }}>U</div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-200 truncate">Account</p>
            <p className="text-[11px] text-gray-500 truncate">Manage account</p>
          </div>
          <button className="text-gray-500 hover:text-gray-300 p-1" aria-label="Sign out"><LogOut className="w-3.5 h-3.5" /></button>
        </div>
      </div>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const currentLabel = navItems.find(n => pathname === n.href || pathname.startsWith(n.href + '/'))?.label ?? 'Dashboard'

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      <aside className="hidden md:flex flex-col w-60 flex-shrink-0 bg-gray-900/80 border-r border-white/[0.07]"><Sidebar pathname={pathname} /></aside>
      {mobileOpen && <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMobileOpen(false)}><div className="absolute inset-0 bg-black/60 backdrop-blur-sm" /></div>}
      <aside className={`fixed inset-y-0 left-0 z-50 w-60 flex flex-col bg-gray-900 border-r border-white/[0.07] transform transition-transform duration-200 md:hidden ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar pathname={pathname} onClose={() => setMobileOpen(false)} />
      </aside>
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="flex items-center h-14 px-4 border-b border-white/[0.07] bg-gray-950 flex-shrink-0">
          <button className="md:hidden mr-3 text-gray-400 hover:text-white" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu className="w-5 h-5" /></button>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span className="text-gray-600">AuditKit</span>
            <ChevronRight className="w-3 h-3 text-gray-700" />
            <span className="text-gray-200 font-medium">{currentLabel}</span>
          </div>
          <div className="ml-auto"><button className="relative w-8 h-8 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-200 hover:bg-white/5"><Bell className="w-4 h-4" /></button></div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}

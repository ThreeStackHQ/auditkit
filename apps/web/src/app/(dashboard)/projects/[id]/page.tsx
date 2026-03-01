'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  ChevronLeft,
  Search,
  Filter,
  Download,
  RefreshCw,
  Activity,
  User,
  Globe,
  ChevronRight,
  X,
  Circle,
  AlertTriangle,
  Shield,
  Settings,
  FileText,
} from 'lucide-react'

// Sprint 1.10 — Event Stream Dashboard — Wren

// ─── Types ─────────────────────────────────────────────────────────────────────

type EventCategory = 'auth' | 'resource' | 'settings' | 'billing' | 'security'

interface AuditEvent {
  id: string
  action: string
  category: EventCategory
  actorEmail: string
  actorName: string
  resourceType: string | null
  resourceName: string | null
  ipAddress: string
  userAgent: string
  metadata: Record<string, string>
  createdAt: string
  severity: 'info' | 'warn' | 'critical'
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<EventCategory, { icon: typeof Activity; color: string; bg: string }> = {
  auth:     { icon: User,          color: 'text-blue-400',    bg: 'bg-blue-500/10' },
  resource: { icon: FileText,      color: 'text-gray-400',    bg: 'bg-gray-500/10' },
  settings: { icon: Settings,      color: 'text-amber-400',   bg: 'bg-amber-500/10' },
  billing:  { icon: Activity,      color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  security: { icon: Shield,        color: 'text-red-400',     bg: 'bg-red-500/10' },
}

const SEVERITY_CONFIG = {
  info:     { color: 'text-blue-400',    dot: 'bg-blue-400' },
  warn:     { color: 'text-amber-400',   dot: 'bg-amber-400' },
  critical: { color: 'text-red-400',     dot: 'bg-red-400' },
}

const ACTION_FILTERS = [
  { label: 'All Actions', value: 'all' },
  { label: 'Auth', value: 'auth' },
  { label: 'Resources', value: 'resource' },
  { label: 'Settings', value: 'settings' },
  { label: 'Security', value: 'security' },
]

// ─── Mock Data ─────────────────────────────────────────────────────────────────

const BASE_EVENTS: AuditEvent[] = [
  {
    id: '1', action: 'user.login', category: 'auth', actorEmail: 'alex@acme.com', actorName: 'Alex Chen',
    resourceType: null, resourceName: null, ipAddress: '192.168.1.45', userAgent: 'Chrome/120 macOS',
    metadata: { method: 'email_password' }, createdAt: '10:32:14', severity: 'info',
  },
  {
    id: '2', action: 'project.delete', category: 'resource', actorEmail: 'sarah@acme.com', actorName: 'Sarah Kim',
    resourceType: 'project', resourceName: 'Q4 Campaign', ipAddress: '10.0.0.12', userAgent: 'Firefox/121 Windows',
    metadata: { projectId: 'proj_abc123', reason: 'completed' }, createdAt: '10:31:07', severity: 'warn',
  },
  {
    id: '3', action: 'api_key.revoked', category: 'security', actorEmail: 'root@acme.com', actorName: 'Admin',
    resourceType: 'api_key', resourceName: 'sk_live_xxxx...', ipAddress: '172.16.0.5', userAgent: 'Chrome/120 Linux',
    metadata: { keyId: 'key_12345', reason: 'compromised' }, createdAt: '10:29:55', severity: 'critical',
  },
  {
    id: '4', action: 'user.invited', category: 'auth', actorEmail: 'alex@acme.com', actorName: 'Alex Chen',
    resourceType: 'user', resourceName: 'new@acme.com', ipAddress: '192.168.1.45', userAgent: 'Chrome/120 macOS',
    metadata: { role: 'member' }, createdAt: '10:28:30', severity: 'info',
  },
  {
    id: '5', action: 'settings.updated', category: 'settings', actorEmail: 'sarah@acme.com', actorName: 'Sarah Kim',
    resourceType: 'workspace', resourceName: 'Acme Inc.', ipAddress: '10.0.0.12', userAgent: 'Firefox/121 Windows',
    metadata: { field: 'retention_days', from: '30', to: '90' }, createdAt: '10:25:18', severity: 'info',
  },
  {
    id: '6', action: 'invoice.created', category: 'billing', actorEmail: 'billing@acme.com', actorName: 'Billing Bot',
    resourceType: 'invoice', resourceName: 'INV-2026-031', ipAddress: '10.0.1.1', userAgent: 'AuditKit/1.0',
    metadata: { amount: '$299.00', currency: 'USD' }, createdAt: '10:20:44', severity: 'info',
  },
  {
    id: '7', action: 'login.failed', category: 'security', actorEmail: 'unknown@attacker.io', actorName: 'Unknown',
    resourceType: null, resourceName: null, ipAddress: '45.33.32.156', userAgent: 'Python Requests/2.28',
    metadata: { attempts: '5', blocked: 'true' }, createdAt: '10:19:02', severity: 'critical',
  },
  {
    id: '8', action: 'user.logout', category: 'auth', actorEmail: 'alex@acme.com', actorName: 'Alex Chen',
    resourceType: null, resourceName: null, ipAddress: '192.168.1.45', userAgent: 'Chrome/120 macOS',
    metadata: {}, createdAt: '10:15:33', severity: 'info',
  },
  {
    id: '9', action: 'document.updated', category: 'resource', actorEmail: 'sarah@acme.com', actorName: 'Sarah Kim',
    resourceType: 'document', resourceName: 'Privacy Policy v3', ipAddress: '10.0.0.12', userAgent: 'Firefox/121 Windows',
    metadata: { changes: '3 sections', version: '3.2' }, createdAt: '10:12:11', severity: 'info',
  },
  {
    id: '10', action: 'permission.granted', category: 'security', actorEmail: 'alex@acme.com', actorName: 'Alex Chen',
    resourceType: 'role', resourceName: 'admin', ipAddress: '192.168.1.45', userAgent: 'Chrome/120 macOS',
    metadata: { grantedTo: 'sarah@acme.com' }, createdAt: '10:08:59', severity: 'warn',
  },
]

// ─── Event Detail Panel ────────────────────────────────────────────────────────

function EventDetailPanel({ event, onClose }: { event: AuditEvent; onClose: () => void }) {
  const cat = CATEGORY_CONFIG[event.category]
  const sev = SEVERITY_CONFIG[event.severity]
  const Icon = cat.icon

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-96 bg-[#0d1117] border-l border-white/10 flex flex-col shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-lg ${cat.bg} flex items-center justify-center`}>
            <Icon className={`w-4 h-4 ${cat.color}`} />
          </div>
          <div>
            <p className="text-sm font-semibold text-white font-mono">{event.action}</p>
            <p className="text-xs text-gray-500">{event.createdAt}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-600 hover:text-gray-300 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Severity */}
        <div className="flex items-center gap-2">
          <Circle className={`w-2.5 h-2.5 fill-current ${sev.color}`} />
          <span className={`text-xs font-medium capitalize ${sev.color}`}>{event.severity}</span>
        </div>

        {/* Actor */}
        <div>
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Actor</p>
          <div className="bg-[#161b22] border border-white/5 rounded-lg p-3 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Name</span>
              <span className="text-white">{event.actorName}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Email</span>
              <span className="text-gray-300 font-mono">{event.actorEmail}</span>
            </div>
          </div>
        </div>

        {/* Resource */}
        {event.resourceType && (
          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Resource</p>
            <div className="bg-[#161b22] border border-white/5 rounded-lg p-3 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Type</span>
                <span className="text-white capitalize">{event.resourceType}</span>
              </div>
              {event.resourceName && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Name</span>
                  <span className="text-gray-300 truncate ml-4">{event.resourceName}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Request */}
        <div>
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Request</p>
          <div className="bg-[#161b22] border border-white/5 rounded-lg p-3 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">IP</span>
              <span className="text-gray-300 font-mono">{event.ipAddress}</span>
            </div>
            <div className="flex justify-between text-xs gap-2">
              <span className="text-gray-500 flex-shrink-0">User Agent</span>
              <span className="text-gray-400 text-[10px] text-right truncate">{event.userAgent}</span>
            </div>
          </div>
        </div>

        {/* Metadata */}
        {Object.keys(event.metadata).length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Metadata</p>
            <div className="bg-[#161b22] border border-white/5 rounded-lg p-3 space-y-1.5">
              {Object.entries(event.metadata).map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs gap-2">
                  <span className="text-gray-500 font-mono">{k}</span>
                  <span className="text-gray-300 font-mono text-right truncate">{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Raw JSON */}
        <div>
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Raw Event</p>
          <pre className="bg-[#161b22] border border-white/5 rounded-lg p-3 text-[10px] text-emerald-400 font-mono overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify({ action: event.action, actor: { email: event.actorEmail }, resource: event.resourceType, metadata: event.metadata }, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ProjectEventsPage({ params }: { params: { id: string } }) {
  const [events, setEvents] = useState<AuditEvent[]>(BASE_EVENTS)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null)
  const [isLive, setIsLive] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  // Simulate live event stream — add a new event every 8s
  useEffect(() => {
    if (!isLive) return
    const timer = setInterval(() => {
      const live: AuditEvent = {
        id: Date.now().toString(),
        action: ['user.login', 'document.viewed', 'api_key.used', 'user.updated'][Math.floor(Math.random() * 4)],
        category: ['auth', 'resource', 'settings'][Math.floor(Math.random() * 3)] as EventCategory,
        actorEmail: 'live@acme.com',
        actorName: 'Live User',
        resourceType: null,
        resourceName: null,
        ipAddress: '10.10.10.10',
        userAgent: 'Chrome/120',
        metadata: {},
        createdAt: new Date().toLocaleTimeString('en-GB', { hour12: false }),
        severity: 'info',
      }
      setEvents(prev => [live, ...prev].slice(0, 50))
      setLastRefresh(new Date())
    }, 8000)
    return () => clearInterval(timer)
  }, [isLive])

  const filtered = events
    .filter(e => categoryFilter === 'all' || e.category === categoryFilter)
    .filter(e => !search || e.action.includes(search.toLowerCase()) || e.actorEmail.toLowerCase().includes(search.toLowerCase()) || (e.resourceName?.toLowerCase().includes(search.toLowerCase()) ?? false))

  const counts = {
    total: events.length,
    critical: events.filter(e => e.severity === 'critical').length,
    warn: events.filter(e => e.severity === 'warn').length,
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] relative">
      {selectedEvent && (
        <EventDetailPanel event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}

      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <Link href="/projects" className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors">
          <ChevronLeft className="w-3.5 h-3.5" />
          Projects
        </Link>
      </div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-white">Acme Inc. · Events</h1>
            {isLive && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 border border-emerald-500/25 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                LIVE
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            {counts.total} events · {counts.critical} critical · Updated {lastRefresh.toLocaleTimeString('en-GB', { hour12: false })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsLive(!isLive)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              isLive
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLive ? 'animate-spin' : ''}`} style={isLive ? { animationDuration: '3s' } : {}} />
            {isLive ? 'Live' : 'Paused'}
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-gray-400 hover:border-white/20 transition-colors">
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-[#161b22] border border-white/10 rounded-xl p-3.5">
          <p className="text-xs text-gray-500 mb-1">Total Events</p>
          <p className="text-2xl font-bold text-white">{counts.total.toLocaleString()}</p>
        </div>
        <div className="bg-[#161b22] border border-red-500/20 rounded-xl p-3.5">
          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3 text-red-400" />Critical
          </p>
          <p className="text-2xl font-bold text-red-400">{counts.critical}</p>
        </div>
        <div className="bg-[#161b22] border border-amber-500/20 rounded-xl p-3.5">
          <p className="text-xs text-gray-500 mb-1">Warnings</p>
          <p className="text-2xl font-bold text-amber-400">{counts.warn}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" />
          <input
            placeholder="Search events, actors..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 pr-3 py-1.5 w-full rounded-lg bg-[#161b22] border border-white/10 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#f97415]/40"
          />
        </div>
        <div className="flex items-center gap-1">
          <Filter className="w-3.5 h-3.5 text-gray-600 mr-0.5" />
          {ACTION_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setCategoryFilter(f.value)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                categoryFilter === f.value
                  ? 'text-[#f97415] bg-[#f97415]/15 border border-[#f97415]/25'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Event stream table */}
      <div className="flex-1 overflow-auto bg-[#161b22] border border-white/10 rounded-xl min-h-0">
        <table className="w-full">
          <thead className="sticky top-0 bg-[#161b22] z-10 border-b border-white/5">
            <tr>
              <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Action</th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Actor</th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Resource</th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">IP</th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Time</th>
              <th className="px-4 py-3 w-8" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((event, i) => {
              const cat = CATEGORY_CONFIG[event.category]
              const sev = SEVERITY_CONFIG[event.severity]
              const Icon = cat.icon

              return (
                <tr
                  key={event.id}
                  onClick={() => setSelectedEvent(event)}
                  className={`border-b border-white/5 hover:bg-white/3 cursor-pointer transition-colors group ${
                    i === 0 && isLive ? 'animate-pulse-once bg-[#f97415]/5' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${sev.dot}`} />
                      <div className={`w-6 h-6 rounded ${cat.bg} flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-3 h-3 ${cat.color}`} />
                      </div>
                      <span className="text-xs font-mono text-white">{event.action}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-xs text-white">{event.actorName}</p>
                      <p className="text-[10px] text-gray-500">{event.actorEmail}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {event.resourceType ? (
                      <div>
                        <p className="text-xs text-gray-400 capitalize">{event.resourceType}</p>
                        {event.resourceName && <p className="text-[10px] text-gray-600 truncate max-w-[120px]">{event.resourceName}</p>}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-700">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="flex items-center gap-1 text-xs text-gray-500 font-mono">
                      <Globe className="w-3 h-3" />
                      {event.ipAddress}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-500 font-mono">{event.createdAt}</span>
                  </td>
                  <td className="px-4 py-3">
                    <ChevronRight className="w-3.5 h-3.5 text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Activity className="w-8 h-8 text-gray-700 mb-3" />
            <p className="text-sm text-gray-500">No events found</p>
          </div>
        )}
      </div>
    </div>
  )
}

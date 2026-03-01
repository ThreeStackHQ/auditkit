'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ChevronLeft,
  Code2,
  Key,
  Bell,
  AlertTriangle,
  Plus,
  X,
  Copy,
  Check,
  ChevronRight,
} from 'lucide-react'

// Sprint 1.9 — Project Settings & Embed Config UI — Wren

const BRAND = '#f97415'

type Section = 'embed' | 'apikeys' | 'notifications' | 'danger'

const sections: { id: Section; label: string; icon: typeof Code2 }[] = [
  { id: 'embed', label: 'Embed Config', icon: Code2 },
  { id: 'apikeys', label: 'API Keys', icon: Key },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'danger', label: 'Danger Zone', icon: AlertTriangle },
]

// ─── Embed Config Section ─────────────────────────────────────────────────────

function EmbedConfig({ projectId }: { projectId: string }) {
  const [projectName, setProjectName] = useState('MyApp Production')
  const [domains, setDomains] = useState(['myapp.com', 'staging.myapp.com'])
  const [domainInput, setDomainInput] = useState('')
  const [retention, setRetention] = useState('365')
  const [maskPii, setMaskPii] = useState(true)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)

  const embedSnippet = `<script
  src="https://cdn.auditkit.io/v1/embed.js"
  data-project-id="${projectId}"
  async>
</script>`

  function addDomain() {
    const d = domainInput.trim().replace(/^https?:\/\//, '')
    if (d && !domains.includes(d)) {
      setDomains([...domains, d])
      setDomainInput('')
    }
  }

  function removeDomain(d: string) {
    setDomains(domains.filter((x) => x !== d))
  }

  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function handleCopy() {
    navigator.clipboard.writeText(embedSnippet).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-white mb-1">Embed Configuration</h2>
        <p className="text-sm text-gray-500">Configure how the AuditKit widget behaves in your app.</p>
      </div>

      {/* Project name */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">Project Name</label>
        <input
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          className="w-full px-3 py-2.5 bg-[#161b22] border border-white/10 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#f97415]/40 transition-colors"
        />
      </div>

      {/* Allowed domains */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">Allowed Domains</label>
        <p className="text-xs text-gray-500 mb-2">
          Only events from these domains will be accepted. Leave empty to allow all.
        </p>
        {/* Domain chips */}
        <div className="flex flex-wrap gap-2 mb-2">
          {domains.map((d) => (
            <span
              key={d}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-[#f97415]/10 text-orange-300 border border-[#f97415]/20"
            >
              {d}
              <button
                onClick={() => removeDomain(d)}
                className="text-orange-400/60 hover:text-orange-300 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        {/* Add domain */}
        <div className="flex gap-2">
          <input
            placeholder="example.com"
            value={domainInput}
            onChange={(e) => setDomainInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addDomain()}
            className="flex-1 px-3 py-2 bg-[#161b22] border border-white/10 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#f97415]/40 transition-colors"
          />
          <button
            onClick={addDomain}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white transition-colors"
            style={{ background: BRAND }}
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
      </div>

      {/* Event retention */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">Event Retention</label>
        <p className="text-xs text-gray-500 mb-2">How long to keep audit events before automatic deletion.</p>
        <select
          value={retention}
          onChange={(e) => setRetention(e.target.value)}
          className="w-full sm:w-48 px-3 py-2.5 bg-[#161b22] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#f97415]/40 transition-colors appearance-none cursor-pointer"
        >
          <option value="30">30 days</option>
          <option value="60">60 days</option>
          <option value="90">90 days</option>
          <option value="365">365 days</option>
        </select>
      </div>

      {/* Data masking */}
      <div className="flex items-start justify-between gap-4 p-4 bg-[#161b22] border border-white/10 rounded-xl">
        <div className="flex-1">
          <p className="text-sm font-medium text-white mb-0.5">Data Masking</p>
          <p className="text-xs text-gray-500">
            Automatically mask PII like email addresses, IP addresses, and phone numbers in event logs.
          </p>
        </div>
        <button
          onClick={() => setMaskPii(!maskPii)}
          className={`relative w-10 h-5.5 rounded-full flex-shrink-0 mt-0.5 transition-colors`}
          style={{ height: '22px', width: '40px', background: maskPii ? BRAND : '#374151' }}
        >
          <span
            className={`absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full shadow transition-all`}
            style={{
              width: '18px',
              height: '18px',
              left: maskPii ? '19px' : '3px',
            }}
          />
        </button>
      </div>

      {/* Install snippet */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">Installation Script</label>
        <p className="text-xs text-gray-500 mb-2">
          Paste this snippet in the <code className="text-gray-400 bg-white/5 px-1 rounded">&lt;head&gt;</code> of your HTML to start capturing events.
        </p>
        <div className="relative bg-[#0d1117] border border-white/10 rounded-xl overflow-hidden">
          {/* Code header */}
          <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-white/5">
            <span className="text-xs text-gray-500 font-mono">embed.html</span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs font-medium transition-colors"
              style={{ color: copied ? '#10b981' : '#f97415' }}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <pre className="px-4 py-4 text-sm text-emerald-400 font-mono leading-relaxed overflow-x-auto">
            {embedSnippet}
          </pre>
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center justify-end pt-2">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-all"
          style={{ background: saved ? '#10b981' : BRAND }}
        >
          {saved ? <Check className="w-4 h-4" /> : null}
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}

// ─── API Keys Section ─────────────────────────────────────────────────────────

function ApiKeys() {
  const [showNew, setShowNew] = useState(false)

  const keys = [
    { id: 'key_1', name: 'Production', key: 'ak_live_xxxx...4f2a', created: 'Jan 15, 2026', last: '2 hours ago' },
    { id: 'key_2', name: 'Staging', key: 'ak_live_xxxx...7b8c', created: 'Dec 3, 2025', last: '1 day ago' },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-white mb-1">API Keys</h2>
          <p className="text-sm text-gray-500">Keys used to authenticate server-side event ingestion.</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white transition-colors"
          style={{ background: BRAND }}
        >
          <Plus className="w-4 h-4" />
          New Key
        </button>
      </div>

      {showNew && (
        <div className="bg-[#161b22] border border-[#f97415]/20 rounded-xl p-4">
          <p className="text-sm font-medium text-white mb-3">Create new API key</p>
          <div className="flex gap-2">
            <input
              placeholder="Key name (e.g. Production)"
              className="flex-1 px-3 py-2 bg-[#0d1117] border border-white/10 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#f97415]/40"
            />
            <button
              className="px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ background: BRAND }}
            >
              Create
            </button>
            <button
              onClick={() => setShowNew(false)}
              className="px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white bg-white/5"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-[#161b22] border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-white/5">
            <tr>
              <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Key</th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Last used</th>
              <th className="px-4 py-3 w-16" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {keys.map((k) => (
              <tr key={k.id} className="hover:bg-white/2 transition-colors">
                <td className="px-4 py-3.5">
                  <p className="text-sm font-medium text-white">{k.name}</p>
                  <p className="text-xs text-gray-500">Created {k.created}</p>
                </td>
                <td className="px-4 py-3.5 hidden sm:table-cell">
                  <code className="text-xs text-gray-400 bg-white/5 px-2 py-0.5 rounded font-mono">{k.key}</code>
                </td>
                <td className="px-4 py-3.5 hidden md:table-cell">
                  <span className="text-xs text-gray-500">{k.last}</span>
                </td>
                <td className="px-4 py-3.5">
                  <button className="text-xs text-red-400/60 hover:text-red-400 transition-colors font-medium">
                    Revoke
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Notifications Section ────────────────────────────────────────────────────

function Notifications() {
  const [webhookUrl, setWebhookUrl] = useState('')
  const [emailAlerts, setEmailAlerts] = useState(true)
  const [slackAlerts, setSlackAlerts] = useState(false)

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-white mb-1">Notifications</h2>
        <p className="text-sm text-gray-500">Get notified when critical events occur in your project.</p>
      </div>

      {/* Webhook */}
      <div className="bg-[#161b22] border border-white/10 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-white">Webhook URL</p>
            <p className="text-xs text-gray-500">Receive a POST request for critical and warning events.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <input
            placeholder="https://yourapp.com/webhooks/audit"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            className="flex-1 px-3 py-2 bg-[#0d1117] border border-white/10 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#f97415]/40"
          />
          <button className="px-3 py-2 rounded-lg text-sm font-medium text-white" style={{ background: BRAND }}>
            Save
          </button>
        </div>
      </div>

      {/* Email alerts */}
      <div className="flex items-center justify-between p-4 bg-[#161b22] border border-white/10 rounded-xl">
        <div>
          <p className="text-sm font-medium text-white">Email Alerts</p>
          <p className="text-xs text-gray-500">Send email for critical severity events.</p>
        </div>
        <button
          onClick={() => setEmailAlerts(!emailAlerts)}
          style={{ height: '22px', width: '40px', background: emailAlerts ? BRAND : '#374151' }}
          className="relative rounded-full flex-shrink-0 transition-colors"
        >
          <span
            className="absolute top-0.5 bg-white rounded-full shadow transition-all"
            style={{ width: '18px', height: '18px', left: emailAlerts ? '19px' : '3px' }}
          />
        </button>
      </div>

      {/* Slack */}
      <div className="flex items-center justify-between p-4 bg-[#161b22] border border-white/10 rounded-xl">
        <div>
          <p className="text-sm font-medium text-white">Slack Notifications</p>
          <p className="text-xs text-gray-500">Post to a Slack channel for warnings and criticals.</p>
        </div>
        <button
          onClick={() => setSlackAlerts(!slackAlerts)}
          style={{ height: '22px', width: '40px', background: slackAlerts ? BRAND : '#374151' }}
          className="relative rounded-full flex-shrink-0 transition-colors"
        >
          <span
            className="absolute top-0.5 bg-white rounded-full shadow transition-all"
            style={{ width: '18px', height: '18px', left: slackAlerts ? '19px' : '3px' }}
          />
        </button>
      </div>
    </div>
  )
}

// ─── Danger Zone ──────────────────────────────────────────────────────────────

function DangerZone() {
  const [deleteInput, setDeleteInput] = useState('')
  const PROJECT_NAME = 'MyApp Production'

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-red-400 mb-1">Danger Zone</h2>
        <p className="text-sm text-gray-500">Irreversible actions. Proceed with extreme caution.</p>
      </div>

      <div className="border border-red-500/20 rounded-xl overflow-hidden">
        <div className="p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-white">Delete all events</p>
            <p className="text-xs text-gray-500">Permanently delete all audit events in this project. This cannot be undone.</p>
          </div>
          <button className="flex-shrink-0 px-3 py-2 border border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-lg text-sm font-medium transition-colors">
            Clear Events
          </button>
        </div>
        <div className="border-t border-red-500/10 p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-white">Delete Project</p>
            <p className="text-xs text-gray-500">
              Permanently delete <span className="text-white font-medium">{PROJECT_NAME}</span> and all its data.
              Type the project name below to confirm.
            </p>
          </div>
          <div className="flex-shrink-0 space-y-2">
            <input
              placeholder={PROJECT_NAME}
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              className="block w-48 px-3 py-2 bg-[#0d1117] border border-red-500/20 rounded-lg text-sm text-white placeholder-gray-700 focus:outline-none focus:border-red-500/40"
            />
            <button
              disabled={deleteInput !== PROJECT_NAME}
              className="w-full px-3 py-2 bg-red-600/80 hover:bg-red-600 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-all"
            >
              Delete Project
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ProjectSettingsPage({ params }: { params: { id: string } }) {
  const [activeSection, setActiveSection] = useState<Section>('embed')

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-5 text-sm text-gray-400">
        <Link href="/projects" className="hover:text-gray-200 transition-colors">Projects</Link>
        <ChevronRight className="w-3.5 h-3.5 text-gray-700" />
        <Link href={`/projects/${params.id}`} className="hover:text-gray-200 transition-colors">
          MyApp Production
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-gray-700" />
        <span className="text-white font-medium">Settings</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        {/* Settings sidebar */}
        <nav className="md:col-span-1 space-y-0.5">
          {sections.map(({ id, label, icon: Icon }) => {
            const active = activeSection === id
            const isDanger = id === 'danger'
            return (
              <button
                key={id}
                onClick={() => setActiveSection(id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                  active
                    ? isDanger
                      ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                      : 'text-orange-300'
                    : isDanger
                      ? 'text-red-400/60 hover:text-red-400 hover:bg-red-500/5'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                }`}
                style={active && !isDanger ? { background: `${BRAND}18`, borderLeft: `2px solid ${BRAND}` } : {}}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </button>
            )
          })}
        </nav>

        {/* Content */}
        <div className="md:col-span-3 bg-[#161b22] border border-white/10 rounded-xl p-5">
          {activeSection === 'embed' && <EmbedConfig projectId={params.id} />}
          {activeSection === 'apikeys' && <ApiKeys />}
          {activeSection === 'notifications' && <Notifications />}
          {activeSection === 'danger' && <DangerZone />}
        </div>
      </div>
    </div>
  )
}

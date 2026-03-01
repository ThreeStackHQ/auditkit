import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AuditKit — Audit Logging for Indie SaaS',
  description: 'Drop-in audit logging for SaaS teams. Know exactly who did what, when. 5-minute setup, zero infrastructure.',
  keywords: ['audit logging', 'audit trail', 'saas security', 'compliance', 'event tracking'],
  authors: [{ name: 'ThreeStack' }],
  openGraph: {
    title: 'AuditKit — Audit Logging for Indie SaaS',
    description: 'Drop-in audit logging for SaaS teams. Know exactly who did what, when.',
    url: 'https://auditkit.threestack.io',
    siteName: 'AuditKit',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AuditKit — Audit Logging for Indie SaaS',
    description: 'Drop-in audit logging for SaaS teams. 5-minute setup.',
  },
}

const FEATURES = [
  { icon: '⚡', title: 'Instant Event Capture', desc: 'Track any user action in real-time with a single function call.' },
  { icon: '🔍', title: 'Searchable Logs', desc: 'Full-text search across all events. Filter by user, action, or time range.' },
  { icon: '🔒', title: 'Tamper-Proof Storage', desc: 'Immutable audit trail. Once written, logs cannot be modified or deleted.' },
  { icon: '📡', title: 'Real-Time Stream', desc: 'Live event stream dashboard. Watch your audit log update as events happen.' },
  { icon: '</>', title: 'SDK + REST API', desc: 'Official Node.js SDK and REST API. Works with any language or framework.' },
  { icon: '🛡️', title: 'GDPR Ready', desc: 'Data residency controls, retention policies, and right-to-erasure support.' },
]

const COMPARISON = [
  { name: 'AuditKit', price: '$9/mo', setup: '5 min', retention: '90 days', sdk: true, realtime: true, selfHosted: false, color: 'text-orange-400' },
  { name: 'Datadog', price: '$100+/mo', setup: '1-2 days', retention: '15 days', sdk: true, realtime: true, selfHosted: false, color: 'text-gray-400' },
  { name: 'Custom-built', price: '$$$', setup: 'Weeks', retention: 'Manual', sdk: false, realtime: false, selfHosted: true, color: 'text-gray-400' },
]

const PLANS = [
  { name: 'Free', price: '$0', period: '/mo', events: '10k events/mo', features: ['REST API', 'Node.js SDK', '30-day retention', '1 project', 'Community support'], cta: 'Start Free', highlight: false },
  { name: 'Pro', price: '$9', period: '/mo', events: '1M events/mo', features: ['Everything in Free', '90-day retention', 'Unlimited projects', 'Real-time stream', 'Email alerts', 'Priority support'], cta: 'Start Pro Trial', highlight: true },
  { name: 'Business', price: '$29', period: '/mo', events: 'Unlimited', features: ['Everything in Pro', 'Custom retention', 'SSO / SAML', 'SOC2 reports', 'Custom SLA', 'Dedicated support'], cta: 'Contact Sales', highlight: false },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#0f172a]/80 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
              <span className="text-white text-sm font-bold">A</span>
            </div>
            <span className="font-bold text-white">AuditKit</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
            <Link href="/docs" className="hover:text-white transition-colors">Docs</Link>
            <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
            <a href="https://github.com/ThreeStackHQ/auditkit" className="hover:text-white transition-colors">GitHub</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors hidden md:block">Sign in</Link>
            <Link href="/signup" className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-400 transition-colors">
              Start Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-1.5 text-xs text-orange-400 mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
          Now in public beta — free forever for small teams
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
          Your App&apos;s Audit Trail,{' '}
          <span className="text-orange-400">Done Right</span>
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
          Drop-in audit logging for SaaS teams. Know exactly who did what, when.{' '}
          <span className="text-gray-200">5-minute setup</span>, zero infrastructure.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <Link href="/signup" className="rounded-xl bg-orange-500 px-8 py-4 text-base font-semibold text-white hover:bg-orange-400 transition-colors shadow-lg shadow-orange-500/25">
            Get API Key — Free
          </Link>
          <Link href="/docs" className="rounded-xl border border-white/20 px-8 py-4 text-base font-semibold text-gray-300 hover:bg-white/5 transition-colors">
            View Demo →
          </Link>
        </div>

        {/* Code snippet */}
        <div className="mx-auto max-w-2xl rounded-2xl border border-white/10 bg-[#1e293b] text-left overflow-hidden shadow-2xl">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-[#0f172a]/50">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/60" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
              <div className="w-3 h-3 rounded-full bg-green-500/60" />
            </div>
            <span className="text-xs text-gray-500 ml-2">your-app.ts</span>
          </div>
          <pre className="p-6 text-sm text-gray-300 overflow-x-auto">
            <code>{`import { AuditKit } from '@auditkit/node'

const audit = new AuditKit({ apiKey: process.env.AUDITKIT_KEY })

// Track any user action
await audit.track('user.login', {
  userId: user.id,
  ip: req.ip,
  userAgent: req.headers['user-agent'],
})

await audit.track('invoice.created', {
  userId: user.id,
  resourceId: invoice.id,
  amount: invoice.total,
})`}</code>
          </pre>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Everything you need to stay compliant</h2>
          <p className="text-gray-400">Built for indie hackers who ship fast and need audit trails that just work.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-white/10 bg-white/5 p-6 hover:border-orange-500/30 transition-colors group">
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="font-semibold text-white mb-2 group-hover:text-orange-400 transition-colors">{f.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Comparison */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">The affordable choice</h2>
          <p className="text-gray-400">Stop paying enterprise prices for indie-scale audit logging.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border border-white/10 rounded-2xl overflow-hidden">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Product</th>
                <th className="px-6 py-4 text-sm font-medium text-gray-400">Price</th>
                <th className="px-6 py-4 text-sm font-medium text-gray-400">Setup Time</th>
                <th className="px-6 py-4 text-sm font-medium text-gray-400">Retention</th>
                <th className="px-6 py-4 text-sm font-medium text-gray-400">SDK</th>
                <th className="px-6 py-4 text-sm font-medium text-gray-400">Real-time</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((c, i) => (
                <tr key={c.name} className={`border-b border-white/10 last:border-0 ${i === 0 ? 'bg-orange-500/5' : ''}`}>
                  <td className="px-6 py-4">
                    <span className={`font-semibold ${c.color}`}>{c.name}</span>
                    {i === 0 && <span className="ml-2 text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full">Best Value</span>}
                  </td>
                  <td className="px-6 py-4 text-center text-sm text-gray-300">{c.price}</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-300">{c.setup}</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-300">{c.retention}</td>
                  <td className="px-6 py-4 text-center">{c.sdk ? '✅' : '❌'}</td>
                  <td className="px-6 py-4 text-center">{c.realtime ? '✅' : '❌'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* NPM Install */}
      <section className="mx-auto max-w-4xl px-6 py-20">
        <div className="rounded-3xl border border-orange-500/20 bg-orange-500/5 p-10 text-center">
          <h2 className="text-3xl font-bold mb-4">Add to your app in 5 minutes</h2>
          <p className="text-gray-400 mb-8">One package, one API key, one line to track an event.</p>
          <div className="mx-auto max-w-lg rounded-xl border border-white/10 bg-[#1e293b] p-4 text-left mb-8">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-gray-500 text-xs font-mono">$</span>
              <code className="text-sm text-orange-300">npm install @auditkit/node</code>
            </div>
          </div>
          <Link href="/signup" className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-8 py-4 text-base font-semibold text-white hover:bg-orange-400 transition-colors shadow-lg shadow-orange-500/25">
            Get Your Free API Key →
          </Link>
        </div>
      </section>

      {/* Pricing */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Simple, honest pricing</h2>
          <p className="text-gray-400">No surprise overages. No enterprise contracts. Cancel anytime.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan) => (
            <div key={plan.name} className={`rounded-2xl border p-8 flex flex-col ${plan.highlight ? 'border-orange-500 bg-orange-500/10 shadow-xl shadow-orange-500/10' : 'border-white/10 bg-white/5'}`}>
              {plan.highlight && (
                <div className="text-xs font-semibold text-orange-400 bg-orange-500/20 rounded-full px-3 py-1 self-start mb-4">Most Popular</div>
              )}
              <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-4xl font-extrabold">{plan.price}</span>
                <span className="text-gray-400 mb-1">{plan.period}</span>
              </div>
              <p className="text-sm text-gray-400 mb-6">{plan.events}</p>
              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-300">
                    <span className="text-orange-400 mt-0.5">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/signup" className={`text-center rounded-xl py-3 text-sm font-semibold transition-colors ${plan.highlight ? 'bg-orange-500 text-white hover:bg-orange-400 shadow-lg shadow-orange-500/25' : 'border border-white/20 text-gray-300 hover:bg-white/5'}`}>
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 mt-8">
        <div className="mx-auto max-w-6xl px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center">
              <span className="text-white text-xs font-bold">A</span>
            </div>
            <span className="font-semibold">AuditKit</span>
            <span className="text-gray-500 text-sm ml-2">by ThreeStack</span>
          </div>
          <div className="flex gap-6 text-sm text-gray-400">
            <Link href="/docs" className="hover:text-white transition-colors">Docs</Link>
            <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
            <a href="https://github.com/ThreeStackHQ/auditkit" className="hover:text-white transition-colors">GitHub</a>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

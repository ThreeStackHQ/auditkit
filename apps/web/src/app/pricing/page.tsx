import Link from 'next/link'
import type { Metadata } from 'next'
import { Check, Minus } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Pricing — AuditKit',
  description: 'Simple, transparent pricing for AuditKit. Start free, upgrade as you grow. No surprise overages.',
  openGraph: {
    title: 'Pricing — AuditKit',
    description: 'Simple, transparent pricing for audit logging. Starter free, Pro $19/mo, Business $79/mo.',
    url: 'https://auditkit.threestack.io/pricing',
    siteName: 'AuditKit',
    type: 'website',
  },
}

const ORANGE = '#f97415'

const PLANS = [
  {
    name: 'Starter',
    price: '$0',
    period: '/mo',
    desc: 'Perfect for indie hackers and solo devs',
    events: '10,000 events/mo',
    retention: '7-day retention',
    projects: '1 project',
    support: 'Community support',
    highlight: false,
    cta: 'Start for Free',
    href: '/signup',
    features: [
      '10k events/month',
      '7-day log retention',
      '1 project',
      'REST API access',
      'Node.js SDK',
      'Community support',
    ],
  },
  {
    name: 'Pro',
    price: '$19',
    period: '/mo',
    desc: 'For growing SaaS products that need more',
    events: '1M events/mo',
    retention: '90-day retention',
    projects: '10 projects',
    support: 'Email support',
    highlight: true,
    cta: 'Start Pro Trial',
    href: '/signup?plan=pro',
    features: [
      '1M events/month',
      '90-day log retention',
      '10 projects',
      'Custom domains',
      'Real-time stream',
      'Email alerts',
      'Email support',
      'API rate limit increase',
    ],
  },
  {
    name: 'Business',
    price: '$79',
    period: '/mo',
    desc: 'Unlimited scale with enterprise controls',
    events: 'Unlimited events',
    retention: '1-year retention',
    projects: 'Unlimited projects',
    support: 'Priority + SLA',
    highlight: false,
    cta: 'Contact Sales',
    href: '/contact',
    features: [
      'Unlimited events',
      '1-year log retention',
      'Unlimited projects',
      'SSO / SAML',
      'Priority support + SLA',
      'SOC2 compliance reports',
      'Custom data retention',
      'Dedicated Slack channel',
    ],
  },
]

const FEATURES_TABLE = [
  { feature: 'Events / month',       starter: '10k',        pro: '1M',              business: 'Unlimited' },
  { feature: 'Log retention',        starter: '7 days',     pro: '90 days',          business: '1 year' },
  { feature: 'Projects',             starter: '1',          pro: '10',               business: 'Unlimited' },
  { feature: 'REST API',             starter: true,         pro: true,               business: true },
  { feature: 'Node.js SDK',          starter: true,         pro: true,               business: true },
  { feature: 'Real-time stream',     starter: false,        pro: true,               business: true },
  { feature: 'Email alerts',         starter: false,        pro: true,               business: true },
  { feature: 'Custom domains',       starter: false,        pro: true,               business: true },
  { feature: 'SSO / SAML',          starter: false,        pro: false,              business: true },
  { feature: 'SOC2 reports',         starter: false,        pro: false,              business: true },
  { feature: 'Custom retention',     starter: false,        pro: false,              business: true },
  { feature: 'Support',              starter: 'Community',  pro: 'Email',            business: 'Priority + SLA' },
  { feature: 'Dedicated Slack',      starter: false,        pro: false,              business: true },
]

const FAQS = [
  {
    q: 'What counts as an event?',
    a: 'Any call to audit.track() counts as one event. Reading or querying events does not count toward your limit. We reset event counts at the start of each billing cycle.',
  },
  {
    q: 'How does billing work?',
    a: 'You\'re billed monthly on the date you upgrade. Pro and Business plans can also be paid annually for a 20% discount. We accept all major credit cards via Stripe.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. You can cancel your subscription from the billing settings page at any time. You\'ll continue to have access until the end of your billing period — no refunds for partial months.',
  },
  {
    q: 'Can I export my audit log data?',
    a: 'Absolutely. You can export your audit logs in JSON or CSV format from the dashboard, or via the REST API. We believe your data belongs to you — always.',
  },
  {
    q: 'How is my data kept secure?',
    a: 'All audit logs are encrypted at rest (AES-256) and in transit (TLS 1.3). We store data in EU and US regions with strict access controls. SOC2 Type II audit is in progress for Business customers.',
  },
]

function FeatureCell({ value }: { value: boolean | string }) {
  if (value === true) return <span className="text-orange-400 text-lg">✓</span>
  if (value === false) return <Minus className="w-4 h-4 text-gray-700 mx-auto" />
  return <span className="text-sm text-gray-300">{value}</span>
}

function FAQItem({ q, a }: { q: string; a: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
      <h3 className="font-semibold text-white mb-3">{q}</h3>
      <p className="text-sm text-gray-400 leading-relaxed">{a}</p>
    </div>
  )
}

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      {/* Nav — matches landing page */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#0f172a]/80 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
              <span className="text-white text-sm font-bold">A</span>
            </div>
            <span className="font-bold text-white">AuditKit</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
            <Link href="/docs" className="hover:text-white transition-colors">Docs</Link>
            <Link href="/pricing" className="text-white font-medium">Pricing</Link>
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

      {/* Header */}
      <section className="mx-auto max-w-6xl px-6 pt-20 pb-12 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-1.5 text-xs text-orange-400 mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
          No credit card required for Starter
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-5 leading-tight">
          Simple, transparent{' '}
          <span className="text-orange-400">pricing</span>
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
          Start free. Upgrade as your product grows. No surprise overages, no enterprise contracts.
        </p>
      </section>

      {/* Pricing Cards */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className="rounded-2xl border p-8 flex flex-col"
              style={{
                borderColor: plan.highlight ? ORANGE : 'rgba(255,255,255,0.1)',
                background: plan.highlight ? `${ORANGE}0d` : 'rgba(255,255,255,0.03)',
                boxShadow: plan.highlight ? `0 20px 60px ${ORANGE}20` : undefined,
              }}
            >
              {plan.highlight && (
                <div className="text-xs font-semibold text-orange-400 bg-orange-500/20 rounded-full px-3 py-1 self-start mb-4">
                  Most Popular
                </div>
              )}
              <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-4xl font-extrabold">{plan.price}</span>
                <span className="text-gray-400 mb-1">{plan.period}</span>
              </div>
              <p className="text-sm text-gray-500 mb-6">{plan.desc}</p>
              <div className="grid grid-cols-1 gap-2 mb-6 p-4 rounded-xl bg-white/5 border border-white/5">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span className="text-orange-400">⚡</span> {plan.events}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span className="text-orange-400">🗓</span> {plan.retention}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span className="text-orange-400">📁</span> {plan.projects}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span className="text-orange-400">🎧</span> {plan.support}
                </div>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-300">
                    <Check className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={plan.href}
                className="text-center rounded-xl py-3 text-sm font-semibold transition-colors"
                style={
                  plan.highlight
                    ? { background: ORANGE, color: 'white', boxShadow: `0 4px 20px ${ORANGE}40` }
                    : { border: '1px solid rgba(255,255,255,0.2)', color: '#d1d5db' }
                }
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          All plans include a 14-day Pro trial. Annual billing saves 20%.{' '}
          <Link href="/contact" className="text-orange-400 hover:underline">Contact us</Link> for custom pricing.
        </p>
      </section>

      {/* Feature Comparison Table */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Compare plans in detail</h2>
          <p className="text-gray-400">Every feature, side by side.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border border-white/10 rounded-2xl overflow-hidden">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Feature</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-200 text-center">Starter</th>
                <th className="px-6 py-4 text-sm font-semibold text-center" style={{ color: ORANGE }}>Pro</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-200 text-center">Business</th>
              </tr>
            </thead>
            <tbody>
              {FEATURES_TABLE.map((row, i) => (
                <tr
                  key={row.feature}
                  className="border-b border-white/10 last:border-0"
                  style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.01)' : undefined }}
                >
                  <td className="px-6 py-3.5 text-sm text-gray-300">{row.feature}</td>
                  <td className="px-6 py-3.5 text-center">
                    <FeatureCell value={row.starter} />
                  </td>
                  <td className="px-6 py-3.5 text-center" style={{ background: `${ORANGE}05` }}>
                    <FeatureCell value={row.pro} />
                  </td>
                  <td className="px-6 py-3.5 text-center">
                    <FeatureCell value={row.business} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Frequently asked questions</h2>
          <p className="text-gray-400">Can&apos;t find your answer? <Link href="/contact" className="text-orange-400 hover:underline">Chat with us →</Link></p>
        </div>
        <div className="space-y-4">
          {FAQS.map((faq) => (
            <FAQItem key={faq.q} q={faq.q} a={faq.a} />
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-4xl px-6 py-20">
        <div className="rounded-3xl border border-orange-500/20 bg-orange-500/5 p-12 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to add audit logging?</h2>
          <p className="text-gray-400 mb-10 max-w-lg mx-auto">
            Get started in minutes. Free tier includes everything you need to build and ship.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="rounded-xl bg-orange-500 px-8 py-4 text-base font-semibold text-white hover:bg-orange-400 transition-colors shadow-lg shadow-orange-500/25"
            >
              Start for Free →
            </Link>
            <Link
              href="/signup?plan=pro"
              className="rounded-xl border border-orange-500/40 px-8 py-4 text-base font-semibold text-orange-400 hover:bg-orange-500/10 transition-colors"
            >
              Start Pro Trial
            </Link>
          </div>
          <p className="text-sm text-gray-600 mt-6">No credit card required · Cancel anytime · 14-day Pro trial</p>
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
            <Link href="/pricing" className="text-orange-400">Pricing</Link>
            <a href="https://github.com/ThreeStackHQ/auditkit" className="hover:text-white transition-colors">GitHub</a>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

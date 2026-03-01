# AuditKit Security Audit Report

**Sprint 3.4 — Security Audit**
**Date:** 2026-03-01
**Auditor:** Sage (ThreeStack AI)
**Repo:** https://github.com/ThreeStackHQ/auditkit
**Branch audited:** `feat/bolt-backend-wave2` (all backend sprints 1.4–3.3 merged)

---

## Executive Summary

| | |
|---|---|
| **Overall Result** | ❌ FAIL — not production-ready as-is |
| **Severity Level** | 🔴 CRITICAL |
| **Critical findings** | 2 |
| **High findings** | 3 |
| **Medium findings** | 3 |
| **Low findings** | 4 |
| **Passed checks** | 15 |

Two critical vulnerabilities must be fixed before any production deployment:
1. The Next.js middleware does **not** protect the actual dashboard routes — the entire dashboard is publicly accessible without authentication.
2. The internal webhook delivery endpoint is publicly accessible, allowing anyone to trigger webhook spam or SSRF attacks.

---

## Findings

### 🔴 Critical

| # | File | Description | Recommendation |
|---|------|-------------|----------------|
| C-1 | `src/middleware.ts` | **Middleware protects wrong path — dashboard unauthenticated.** The matcher is `"/dashboard/:path*"` but the actual dashboard routes live under the `(dashboard)` Next.js route group, which maps to `/projects/:path*` and `/settings/:path*`. The middleware never fires for real dashboard pages, meaning any unauthenticated user can access all project data in the UI. | Change matcher to `["/projects/:path*", "/settings/:path*"]` or use a catch-all `"/((?!api|_next|login|signup|pricing|.*\\..*).*)"`  and verify auth in the dashboard layout server component. |
| C-2 | `src/app/api/webhooks/send/route.ts` | **Internal webhook endpoint is publicly accessible.** `/api/webhooks/send` is intended as an internal fire-and-forget call from `/api/v1/events`, but it has **no authentication**. Any external caller can POST `{ workspaceId: "<any-uuid>", event: {...} }` to trigger webhook delivery to all active webhook URLs in any workspace. This enables: (a) webhook spam/flooding of customer endpoints, (b) SSRF if webhook URLs point to internal services. | Add a shared internal secret: generate a random `INTERNAL_WEBHOOK_SECRET` env var and require it as a header (`X-Internal-Token`). Validate it as the first check in the handler. |

---

### 🟠 High

| # | File | Description | Recommendation |
|---|------|-------------|----------------|
| H-1 | `apps/widget/src/index.ts`, `packages/react-sdk/src/index.tsx` | **API key exposed in client-side code.** The `ak_live_*` workspace API key is passed as a prop/attribute directly in browser code (React SDK, Vanilla embed). This is the **same key** used for server-side event ingestion. Anyone who inspects the page source or network requests can steal the key and (1) spam/poison the audit log with fake events, (2) read all audit log entries via `/api/widget/events`. | Introduce a separate **read-only embed token** (e.g. `ak_pub_*`) that can only call the widget read endpoint. The write (`/api/v1/events`) endpoint should reject these tokens. Rotate any keys that have already been used client-side. |
| H-2 | `src/app/api/digest/route.ts` | **Unauthenticated GET endpoint leaks workspace stats.** `GET /api/digest?slug=<slug>` returns weekly event counts, top actor emails, and top actions for **any** workspace — no authentication required. Workspace slugs are often predictable (e.g. company name). | Require session auth (`const session = await auth(); if (!session) return 401`) on the GET handler, or remove the GET handler and keep only the CRON-protected POST. |
| H-3 | `src/app/api/v1/events/route.ts`, `src/app/api/widget/events/route.ts` | **CORS wildcard (`*`) on data-serving widget endpoint.** `Access-Control-Allow-Origin: *` on the widget events endpoint allows any origin to read audit logs using a stolen API key. Combined with H-1 (key in client code), this means any malicious site can fetch another company's audit events if they obtain the key. | For `/api/widget/events`, replace the wildcard CORS with workspace-specific allowed-origin validation (use the `allowedDomains` list from workspace settings, stored in DB). The ingest endpoint (`/api/v1/events`) may reasonably keep `*` for server-side callers. |

---

### 🟡 Medium

| # | File | Description | Recommendation |
|---|------|-------------|----------------|
| M-1 | `src/app/api/digest/route.ts` | **CRON_SECRET is optional — POST endpoint can be unprotected.** The auth check is `if (cronSecret && ...)` — meaning if `CRON_SECRET` is not set in the environment, the POST endpoint is fully public. Anyone can trigger email digests to arbitrary email addresses. | Make `CRON_SECRET` **required** in production: throw or return 500 if `process.env.CRON_SECRET` is missing. Remove the conditional: always enforce the secret. |
| M-2 | `src/app/api/v1/events/route.ts`, `src/app/api/auth/signup/route.ts` | **In-memory rate limiters don't work across multiple instances.** The `Map`-based rate limiters reset on process restart and are not shared across Node.js workers or container replicas. In production (any multi-instance deployment), this provides no meaningful protection. | Replace with Redis-backed rate limiting (e.g. `@upstash/ratelimit` or `ioredis` + sliding window). |
| M-3 | `src/app/api/auth/signup/route.ts` | **`X-Forwarded-For` header trusted without proxy validation.** The signup rate limiter reads the IP from `x-forwarded-for` without checking if the request came through a trusted reverse proxy. A client can forge this header (e.g. `X-Forwarded-For: 1.2.3.4`) to bypass IP-based rate limiting entirely. | Only trust `x-forwarded-for` if the request originates from a known proxy IP range. On Vercel/Cloudflare, use their specific trusted header (`cf-connecting-ip`, `x-vercel-forwarded-for`). |

---

### 🔵 Low

| # | File | Description | Recommendation |
|---|------|-------------|----------------|
| L-1 | `apps/web/next.config.js` | **No HTTP security headers configured.** The Next.js config has no `headers()` function. Missing: `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`. | Add a `headers()` block in `next.config.js` setting at minimum HSTS, X-Frame-Options, X-Content-Type-Options, and a restrictive CSP. |
| L-2 | `src/lib/workspace.ts` | **Subscription status not checked when enforcing event limits.** `getWorkspaceByApiKey` joins on the subscriptions table and returns `tier` but does not filter by `status = 'active'`. A workspace with a `canceled` or `past_due` subscription retains its higher-tier event limits. | In `getWorkspaceByApiKey` (or `getMonthlyLimit`), check that `sub.status === 'active'`; otherwise downgrade to `'free'` tier limits. |
| L-3 | `src/app/api/v1/events/route.ts`, `src/app/api/widget/events/route.ts` | **Rate limiter Map entries never cleaned up.** The `rl` Maps accumulate entries indefinitely. Each unique API key adds an entry, and expired entries are never purged. Over time this causes unbounded memory growth. | Either switch to Redis (see M-2), or add a periodic cleanup sweep to remove entries where `entry.resetAt < Date.now()`. |
| L-4 | `src/app/api/stripe/webhook/route.ts` | **Dead Pages Router config in App Router context.** `export const config = { api: { bodyParser: false } }` is Pages Router syntax and has zero effect in the App Router. It creates confusion about whether the body parser is actually disabled. | Remove the dead export. The App Router already reads the raw body correctly via `await req.text()`. |

---

## Passed Checks ✅

The following areas were reviewed and found to be correctly implemented:

1. ✅ **Stripe webhook signature verification** — `stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)` used correctly with raw text body
2. ✅ **HMAC webhook signing** — Outgoing webhooks signed with `createHmac("sha256", wh.secret).update(payload).digest("hex")` and sent as `X-AuditKit-Signature: sha256=<sig>`
3. ✅ **Zod input validation** — All API route bodies validated with Zod schemas before processing
4. ✅ **SQL injection prevention** — Drizzle ORM used exclusively with parameterised queries; no raw string interpolation in SQL
5. ✅ **Password hashing** — bcryptjs with cost factor 12; password length enforced (8–72 chars)
6. ✅ **Email normalisation** — Lowercased before storage and lookup (prevents duplicate accounts via case tricks)
7. ✅ **Rate limiting on event ingest** — 300 req/min per API key implemented (caveat: in-memory, see M-2)
8. ✅ **Rate limiting on signup** — 5 signups/hour per IP implemented (caveat: X-Forwarded-For trust, see M-3)
9. ✅ **JWT session strategy** — NextAuth configured with `strategy: "jwt"`, 30-day maxAge
10. ✅ **Secrets not exposed client-side** — `STRIPE_SECRET_KEY`, `DATABASE_URL`, `AUTH_SECRET`, `RESEND_API_KEY` not present in any `NEXT_PUBLIC_*` env vars
11. ✅ **Workspace ownership enforced** — CSV export verifies `ws.userId === session.user.id` before returning data
12. ✅ **Subscription tier enforcement** — CSV export gated to Pro/Business active subscribers
13. ✅ **Proper HTTP status codes** — 401 for unauthenticated, 403 for forbidden, 422 for invalid input, 429 for rate limit
14. ✅ **No sensitive data in error messages** — Error responses return generic messages; no stack traces or internal details leaked
15. ✅ **Stripe Stripe version pinned** — `stripe@20.4.0` is current; no known CVEs

---

## Recommended Fixes for v1 (Before Production)

Priority order:

1. **[C-1]** Fix middleware matcher to cover actual dashboard routes
2. **[C-2]** Add `INTERNAL_WEBHOOK_SECRET` header check to `/api/webhooks/send`
3. **[H-2]** Add auth to `GET /api/digest`
4. **[H-1]** Create a read-only embed token; separate from write API key
5. **[M-1]** Make `CRON_SECRET` mandatory in production
6. **[H-3]** Implement per-workspace CORS for widget events endpoint
7. **[M-3]** Fix IP extraction to trust only known proxy headers

---

## Recommendations for v2

- **Redis-backed rate limiting** (Upstash) — replace all in-memory Maps (M-2, L-3)
- **Webhook delivery retries with dead-letter queue** — current implementation is fire-and-forget with no retry on failure
- **Webhook URL allowlist / SSRF protection** — validate that webhook URLs are public HTTPS (not `localhost`, RFC 1918, etc.)
- **Audit log tamper protection** — consider append-only DB policy or cryptographic chaining for compliance use cases
- **CSP + security headers** — add via `next.config.js` `headers()` (L-1)
- **API key rotation** — implement key rotation without downtime (create new key before revoking old)
- **Subscription status guard in event ingest** — downgrade expired subscriptions to free limits (L-2)
- **OWASP Dependency Check in CI** — add `pnpm audit` to CI pipeline to catch future CVEs
- **SOC 2 preparation** — implement access logs for admin actions, data retention enforcement job

---

*Audit performed by Sage (ThreeStack AI) — Sprint 3.4*

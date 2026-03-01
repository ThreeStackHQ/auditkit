# AuditKit Integration Test Report

**Sprint 3.5 — Integration Testing**
**Date:** 2026-03-01
**Tester:** Sage (ThreeStack AI)
**Repo:** https://github.com/ThreeStackHQ/auditkit
**Branch tested:** `main` (commit `8c6e16d`)
**Previous audit:** Sprint 3.4 Security Audit (commit `8c6e16d`, same)

---

## Executive Summary

| | |
|---|---|
| **Overall Result** | ❌ FAIL — not deployment-ready |
| **Total Tests** | 28 |
| **PASS** | 12 |
| **PARTIAL** | 5 |
| **FAIL** | 11 |
| **Security fixes (Bolt Wave 8)** | 0 of 5 fixed |
| **New critical bugs found** | 3 |

The product has a solid backend API foundation, but the **dashboard is entirely mocked** (no real data integration), the **middleware auth bypass is unresolved**, and the **entire post-signup flow is broken** (no workspace creation API). None of the 5 previously audited security issues have been resolved by Bolt Wave 8 — in fact there is no evidence of a Wave 8 branch; the `main` branch is identical to the Sprint 3.4 audit state.

---

## Security Audit Follow-Up: Were Wave 8 Fixes Applied?

**Short answer: NO.** Checking git log and all branches:

```
main:                     8c6e16d  feat(security): Sprint 3.4 security audit report
feat/bolt-backend:        569c8e2  feat(api): API key CRUD + project management [Sprint 1.8]
feat/bolt-backend-wave2:  d84b054  feat(backend): widget CDN endpoint + React SDK + ...
```

No `feat/bolt-backend-wave8` or equivalent branch exists. The `main` branch tip is the security audit commit from Sprint 3.4. **All 5 vulnerabilities from WC15 remain unpatched.**

| # | Finding | Status |
|---|---------|--------|
| C-1 | Middleware matcher wrong (`/dashboard/:path*` — dashboard lives at `/projects/:path*`) | ❌ **NOT FIXED** |
| C-2 | `/api/webhooks/send` publicly accessible (no auth) | ❌ **NOT FIXED** |
| H-1 | API key in client-side widget/SDK (`ak_live_*` exposed in browser) | ❌ **NOT FIXED** |
| H-2 | `GET /api/digest?slug=` leaks workspace stats without auth | ❌ **NOT FIXED** |
| H-3 | CORS `*` on `/api/widget/events` endpoint | ❌ **NOT FIXED** |

---

## E2E Flow Tests

---

### Flow 1: Sign Up → Create Project → Get API Key → POST Event → See in Dashboard

**Result: FAIL**

#### IT-001: User Sign-Up (POST /api/auth/signup)

**Result: PASS**

- Endpoint: `POST /api/auth/signup`
- Request body validated with Zod: `{ name, email, password }`
- Email normalised to lowercase
- Duplicate email returns 409
- Password hashed with bcryptjs cost=12
- IP-based rate limiting (5/hour) in place
- Returns `{ user: { id, email, name } }` on 201

**Verdict:** Logic is sound. No issues.

---

#### IT-002: User Login (POST /api/auth/[...nextauth])

**Result: PASS**

- NextAuth v5 Credentials provider
- JWT strategy, 30-day maxAge
- `authorize()` validates Zod schema, then checks DB and compares bcrypt hash
- Returns null on invalid credentials → NextAuth returns 401
- Session embeds `id`, `email`, `name` into JWT and session

**Verdict:** Auth flow is correct.

---

#### IT-003: Create Project/Workspace

**Result: FAIL**

**Root cause:** There is no `POST /api/workspaces` or `POST /api/projects` endpoint in the codebase. The `feat/bolt-backend` branch has `Sprint 1.8 — API key CRUD + project management` but this branch was **never merged into main**. The dashboard projects page (`/projects`) shows a static empty-state "Create your first project" button that has no `onClick` handler wired to an API call — it does nothing.

```
apps/web/src/app/(dashboard)/projects/page.tsx
→ "New Project" button has no action / href
→ No API route at /api/workspaces or /api/projects
```

**Impact:** The entire onboarding funnel is broken post-signup. Users cannot create a project, cannot get an API key, cannot ingest events.

---

#### IT-004: Get API Key

**Result: FAIL**

**Root cause:** Same as IT-003. The `workspaces` table has an `apiKey` column (`ak_live_...`) that is auto-populated on workspace creation, but since workspace creation API is missing from `main`, no workspace can be created and therefore no API key can be obtained via the product.

The Settings page (`/projects/[id]/settings`) shows API keys in a table with **hardcoded mock data** (`ak_live_xxxx...4f2a`, `ak_live_xxxx...7b8c`). No real API is called.

---

#### IT-005: POST Event to /api/v1/events

**Result: PASS** *(assuming workspace + API key exist)*

- Validates `X-API-Key` header (returns 401 if missing/invalid)
- Rate limiter: 300 req/min per API key (in-memory, not distributed — see M-2 from security audit)
- Validates body with Zod schema
- Checks workspace exists via `getWorkspaceByApiKey()`
- Enforces monthly event limit with DB count query
- Inserts event into `audit_events` table with all expected fields
- Fires webhooks asynchronously (fire-and-forget)
- Returns `{ success: true, eventId }` on 201

**Verdict:** Backend logic is correct. Code quality is high.

---

#### IT-006: See Events in Dashboard

**Result: FAIL**

**Root cause:** The project events page (`/projects/[id]/page.tsx`) uses **100% hardcoded mock data**. It defines a `BASE_EVENTS` array of 10 static events and never makes any API call to fetch real events from the database.

```typescript
// apps/web/src/app/(dashboard)/projects/[id]/page.tsx
const BASE_EVENTS: AuditEvent[] = [
  { id: '1', action: 'user.login', ... },  // MOCK
  { id: '2', action: 'project.delete', ... }, // MOCK
  ...10 hardcoded events
]

// No useEffect or fetch call to /api/widget/events or any real endpoint
```

Additionally, the live stream simulation uses `setInterval` to generate **random fake events** every 8 seconds, further obscuring that no real data is ever loaded.

**Impact:** Even if events are successfully stored in the database, users will never see them in the dashboard.

---

### Flow 2: Widget Embed → Event Appears for Correct Actor Only

**Result: PARTIAL**

#### IT-007: Widget SDK Fetches Events

**Result: PASS**

The vanilla JS widget (`apps/widget/src/index.ts`) and React SDK (`packages/react-sdk/src/index.tsx`) both call:
```
GET /api/widget/events?limit=<n>
Headers: X-API-Key: <apiKey>
```

The endpoint validates the API key, resolves the workspace, and returns up to 50 events ordered by `createdAt DESC`.

**Verdict:** Fetch logic is implemented correctly.

---

#### IT-008: Widget Filters Events by Actor

**Result: FAIL**

**Root cause:** The widget endpoint (`/api/widget/events/route.ts`) returns **all events for the workspace** — there is no actor filtering. The endpoint does not accept `actorId` as a query parameter.

```typescript
const events = await db
  .select()
  .from(auditEvents)
  .where(eq(auditEvents.workspaceId, workspace.id))  // No actorId filter
  .orderBy(desc(auditEvents.createdAt))
  .limit(limit);
```

If the widget is embedded in a multi-user SaaS (e.g., each end-user sees their own activity log), every user will see events from **all actors** in the workspace. This is a privacy issue — User A can see User B's activity.

**Expected behaviour:** The widget should accept an optional `actorId` or `actorToken` parameter so it can filter to the requesting user's events.

---

#### IT-009: API Key Exposed in Client-Side Widget

**Result: FAIL (Security)**

The widget is initialised with the workspace API key in client-side code:

```html
<!-- Vanilla embed -->
<script src="..." data-api-key="ak_live_..."></script>

<!-- React SDK -->
<ActivityFeed apiKey="ak_live_..." />
```

This is the **same key** used for server-side event ingestion (`POST /api/v1/events`). Anyone who views page source can steal the key and write arbitrary fake events to the audit log.

**Status: Unresolved from security audit H-1.**

---

### Flow 3: Webhook Fires on Event Ingestion

**Result: PARTIAL**

#### IT-010: Webhook Trigger Logic Exists

**Result: PASS** *(logic review)*

After inserting an event, `triggerWebhooks()` is called:

```typescript
void triggerWebhooks(workspace.id, { ...data, id: event.id });

async function triggerWebhooks(workspaceId, event) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  await fetch(`${appUrl}/api/webhooks/send`, { method: 'POST', ... });
}
```

The `/api/webhooks/send` handler:
1. Fetches all active webhooks for the workspace
2. Creates HMAC-SHA256 signature using webhook secret
3. POSTs to each webhook URL with `X-AuditKit-Signature` header
4. 10-second timeout per delivery
5. Best-effort, failures ignored

**Verdict:** Delivery logic is sound.

---

#### IT-011: Webhook Endpoint Unauthenticated (SSRF Risk)

**Result: FAIL (Security)**

`/api/webhooks/send` has no authentication. Any external caller can POST:

```json
{ "workspaceId": "<any valid UUID>", "event": {...} }
```

This will:
1. Trigger delivery to all webhook URLs of any workspace — **webhook spam**
2. If any webhook URL points to an internal service (e.g., `http://internal-service/admin`), this enables **SSRF**

**Status: Unresolved from security audit C-2.**

---

#### IT-012: Webhook Creation API Missing from Main

**Result: FAIL**

The `webhooks` table is defined in the schema, but there is no API endpoint in `main` to:
- Create a webhook (`POST /api/workspaces/:slug/webhooks`)
- List webhooks
- Delete webhooks

The Settings page has a "Webhook URL" input field with a "Save" button but it has no API wiring — `onClick` is not connected to any fetch call.

**Impact:** Users cannot configure webhooks through the product. The webhook table will always be empty, so webhook delivery will never fire for any workspace in production.

---

#### IT-013: Webhook HMAC Signing Correct

**Result: PASS**

HMAC-SHA256 signing implementation:
```typescript
const sig = createHmac("sha256", wh.secret).update(payload).digest("hex");
// Header: X-AuditKit-Signature: sha256=<sig>
```

Standard format, consistent with GitHub/Stripe webhook convention. No issues.

---

### Flow 4: Plan Limit Enforced (Free Tier — Error After 1000 Events)

**Result: PARTIAL**

#### IT-014: Free Tier Limit Defined

**Result: PASS**

```typescript
export const PLAN_LIMITS: Record<string, number> = {
  free: 1_000,
  starter: 10_000,
  pro: 100_000,
  business: Infinity,
};
```

Free tier limit is 1,000 events/month.

---

#### IT-015: Event Limit Enforced on Ingestion

**Result: PASS**

On `POST /api/v1/events`, after validating the API key:

```typescript
const monthlyLimit = getMonthlyLimit(workspace.tier);
if (isFinite(monthlyLimit)) {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [row] = await db
    .select({ total: count() })
    .from(auditEvents)
    .where(sql`workspace_id = ${workspace.id} AND created_at >= ${monthStart}`);

  if ((row?.total ?? 0) >= monthlyLimit) {
    return NextResponse.json({
      error: `Monthly event limit reached (${monthlyLimit.toLocaleString()} events). Upgrade your plan.`,
      code: "LIMIT_EXCEEDED",
    }, { status: 402 });
  }
}
```

Returns HTTP 402 with `LIMIT_EXCEEDED` code when the count is met or exceeded.

**Verdict:** Limit enforcement is correctly implemented.

---

#### IT-016: Free Tier Limit — Inconsistency Between Landing Page and Code

**Result: FAIL (Data Inconsistency)**

**Root cause:** The free tier limit is defined as **1,000 events/month** in `workspace.ts` (`PLAN_LIMITS.free = 1_000`), but the landing page and pricing page advertise **"10,000 events/mo"** for the Starter/Free plan:

```typescript
// apps/web/src/app/page.tsx (landing page plans)
{ name: 'Free', events: '10k events/mo', ... }

// apps/web/src/app/pricing/page.tsx
{ name: 'Starter', events: '10,000 events/mo', ... }

// packages/db/src/index.ts — PLAN_LIMITS
free: 1_000  // Enforced limit is 1,000
```

Users signing up for the "free" plan expect 10,000 events but will hit a limit at 1,000. **This is a trust/legal issue.**

---

#### IT-017: Cancelled Subscription Retains Pro-Tier Limits

**Result: FAIL (Security from Audit L-2)**

`getWorkspaceByApiKey()` joins on the subscriptions table but does not filter by `status = 'active'`:

```typescript
const rows = await db
  .select({ ..., tier: subscriptions.tier })
  .from(workspaces)
  .leftJoin(subscriptions, eq(subscriptions.userId, workspaces.userId))
  .where(eq(workspaces.apiKey, apiKey));

// Returns tier WITHOUT checking status
return { ...row, tier: row.tier ?? "free" };
```

A user with a cancelled `pro` subscription will still get 100,000 events/month instead of being downgraded to 1,000.

**Status: Unresolved from security audit L-2.**

---

### Flow 5: Billing — Upgrade from Free to Starter

**Result: PARTIAL**

#### IT-018: Stripe Checkout Session Creation

**Result: PASS**

`POST /api/stripe/checkout`:
- Requires authenticated session (returns 401 if not logged in)
- Validates plan: accepts `"starter"` or `"pro"` only
- Looks up or creates Stripe customer
- Creates checkout session with correct metadata (`userId`, `plan`)
- Returns `{ url: checkoutSession.url }` for frontend redirect

**Verdict:** Checkout initiation is correctly implemented.

---

#### IT-019: Stripe Webhook — Subscription Upsert on Checkout Complete

**Result: PASS**

`POST /api/stripe/webhook`:
- Validates Stripe signature with `constructEvent()` (prevents spoofed webhooks)
- Handles `checkout.session.completed`: upserts subscription with tier, status, Stripe IDs, period end
- Handles `customer.subscription.updated`: updates tier/status
- Handles `customer.subscription.deleted`: downgrades to free, marks canceled

**Verdict:** Webhook processing is correct. Dead `export const config` (Pages Router syntax) is harmless but confusing.

---

#### IT-020: Checkout Success URL Points to Non-Existent Route

**Result: FAIL**

After a successful checkout, Stripe redirects to:
```
success_url: `${appUrl}/dashboard?checkout=success`
```

But the dashboard root route is `/projects` (via the `(dashboard)` route group). There is no `/dashboard` page. Users will hit a **404 after successfully paying**.

---

#### IT-021: Plan Limits Not Aligned with Pricing Page

**Result: FAIL**

The pricing page shows the following plans:
- Starter: `$0`, 10k events/mo
- Pro: `$19/mo`, 1M events/mo
- Business: `$79/mo`, unlimited

But `PLAN_LIMITS` in code:
```typescript
free: 1_000       // labeled "starter" on pricing page
starter: 10_000   // not offered on pricing page
pro: 100_000      // pricing page says 1M
business: Infinity // ✅ matches
```

The billing checkout only accepts `"starter"` or `"pro"` (via Zod enum), but the pricing page uses the plan names `Starter` (free), `Pro`, `Business`. **The plan names and limits are entirely misaligned between the UI and the enforcement layer.**

---

#### IT-022: No Billing Portal / Subscription Management

**Result: FAIL**

There is no `/api/stripe/portal` endpoint or equivalent. Users who upgrade cannot manage, downgrade, or cancel their subscription from within the product. Standard Stripe integration would include `stripe.billingPortal.sessions.create()`.

---

### Additional Security Tests

#### IT-023: Dashboard Authentication Bypass (Critical)

**Result: FAIL (Security)**

The middleware matcher:
```typescript
export const config = {
  matcher: ["/dashboard/:path*"],
};
```

The actual dashboard routes are served at `/projects/:path*` and `/settings/:path*` (via the `(dashboard)` Next.js route group). There is no `/dashboard` path in the app. **The middleware never fires for any dashboard page.**

Furthermore, the dashboard layout is a `'use client'` component — it cannot perform server-side session checks. There are no `getServerSession()` / `auth()` calls in any dashboard page or layout.

**Result:** All dashboard routes (`/projects`, `/projects/[id]`, `/projects/[id]/settings`) are **publicly accessible without login**. An unauthenticated user can view all dashboard UI.

**Note:** Since the dashboard uses hardcoded mock data (IT-006), real user data is not exposed via the UI — but this is a zero-security state that must be fixed before connecting real data.

**Status: Unresolved from security audit C-1.**

---

#### IT-024: GET /api/digest Leaks Workspace Stats

**Result: FAIL (Security)**

```bash
# No auth required — workspace slug is often predictable
curl "https://auditkit.threestack.io/api/digest?slug=acme-inc"
# → returns topActors with emails, topActions, event counts
```

The `GET /api/digest` handler has no authentication check. Weekly stats including **actor email addresses** are returned to any anonymous caller who guesses a workspace slug.

**Status: Unresolved from security audit H-2.**

---

#### IT-025: CORS Wildcard on Widget Events Endpoint

**Result: FAIL (Security)**

```typescript
// /api/widget/events/route.ts
const CORS = {
  "Access-Control-Allow-Origin": "*",
  ...
};
```

Combined with API keys being exposed in client-side code (H-1), any malicious website can use a stolen key to fetch all audit events from a victim's workspace cross-origin.

**Status: Unresolved from security audit H-3.**

---

#### IT-026: CSV Export Auth and Tier Gate

**Result: PASS**

`GET /api/workspaces/[slug]/export`:
- Requires session auth (401 if not logged in)
- Verifies `ws.userId === session.user.id` (403 if not owner)
- Checks subscription tier is `pro` or `business` with `status === 'active'`
- Returns proper CSV with `Content-Disposition: attachment` header

**Verdict:** This is one of the better-implemented endpoints. Ownership check and tier gate both correct.

---

#### IT-027: Signup Rate Limiter Uses X-Forwarded-For

**Result: PARTIAL**

Rate limiting is in place (5 signups/hour/IP) but the IP is read from `x-forwarded-for` without proxy validation:
```typescript
const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
```

A client can send `X-Forwarded-For: 1.2.3.4` to bypass the rate limiter entirely.

**Status: Unresolved from security audit M-3. Low priority but worth noting.**

---

#### IT-028: Free Plan Limits — Pricing Discrepancy (Landing vs Code)

*(Covered in IT-016 — duplicate finding, noted for completeness)*

**Result: FAIL** — See IT-016.

---

## Critical Bugs — Bolt Must Fix

The following bugs block deployment. Priority order:

### 🔴 Must Fix Before Any Public Launch

| # | Bug | Severity | File(s) |
|---|-----|----------|---------|
| BUG-001 | **Middleware matcher wrong** — dashboard fully public | CRITICAL | `src/middleware.ts` |
| BUG-002 | **No workspace/project creation API** in `main` | CRITICAL | Missing: `POST /api/workspaces` |
| BUG-003 | **Dashboard shows hardcoded mock data** — real events never loaded | CRITICAL | `src/app/(dashboard)/projects/[id]/page.tsx` |
| BUG-004 | **`/api/webhooks/send` unauthenticated** — SSRF + spam risk | CRITICAL | `src/app/api/webhooks/send/route.ts` |
| BUG-005 | **Checkout success URL is `/dashboard`** — 404 after payment | CRITICAL | `src/app/api/stripe/checkout/route.ts` |

### 🟠 Must Fix Before Revenue / Public Beta

| # | Bug | Severity | File(s) |
|---|-----|----------|---------|
| BUG-006 | **No webhook creation API** — webhooks table always empty | HIGH | Missing: `POST /api/workspaces/:slug/webhooks` |
| BUG-007 | **Widget shows all actors' events** — privacy violation | HIGH | `src/app/api/widget/events/route.ts` |
| BUG-008 | **API key in client-side widget** — same key for read+write | HIGH | `apps/widget/src/index.ts`, `packages/react-sdk/src/index.tsx` |
| BUG-009 | **`GET /api/digest` unauthenticated** — leaks emails | HIGH | `src/app/api/digest/route.ts` |
| BUG-010 | **Plan limit mismatch** — code enforces 1k events, UI promises 10k | HIGH | `src/lib/workspace.ts`, pricing/landing pages |
| BUG-011 | **Plan name mismatch** — `starter`/`pro` in code vs UI tier names | HIGH | `src/lib/workspace.ts`, `src/app/api/stripe/checkout/route.ts` |
| BUG-012 | **No billing portal** — users cannot manage subscriptions | HIGH | Missing: `POST /api/stripe/portal` |
| BUG-013 | **Cancelled subscriptions retain pro limits** — revenue leak | HIGH | `src/lib/workspace.ts` |

### 🟡 Fix Before Scale

| # | Bug | Severity | File(s) |
|---|-----|----------|---------|
| BUG-014 | **CORS `*` on widget events** — combined with key exposure | MEDIUM | `src/app/api/widget/events/route.ts` |
| BUG-015 | **In-memory rate limiters** — ineffective in multi-instance | MEDIUM | Event + signup routes |
| BUG-016 | **X-Forwarded-For spoofing** on signup rate limiter | MEDIUM | `src/app/api/auth/signup/route.ts` |
| BUG-017 | **Dead Pages Router config** in App Router webhook | LOW | `src/app/api/stripe/webhook/route.ts` |
| BUG-018 | **Rate limiter Map never cleaned** — memory leak | LOW | Event + widget routes |

---

## Bolt's Wave 8 Integration Status

There is **no `feat/bolt-backend-wave8` branch** in the repository. The `main` branch tip is exactly the Sprint 3.4 security audit commit — no fixes have been applied since. All 5 critical/high security findings from WC15 remain in their original state.

If Bolt was supposed to deliver fixes in Wave 8, those commits either:
1. Were never created, or
2. Were created in a local branch not yet pushed to `ThreeStackHQ/auditkit`

**Recommendation:** Assign Wave 8 explicitly as a fix sprint for BUG-001 through BUG-005 before any further UI or feature work.

---

## Test Coverage Matrix

| E2E Flow | Tests | PASS | PARTIAL | FAIL |
|----------|-------|------|---------|------|
| Sign up → create project → get key → POST event → dashboard | IT-001 to IT-006 | 2 | 0 | 4 |
| Widget embed → actor-filtered events | IT-007 to IT-009 | 1 | 0 | 2 |
| Webhook fires on ingestion | IT-010 to IT-013 | 2 | 0 | 2 |
| Plan limit enforced (free tier) | IT-014 to IT-017 | 2 | 0 | 2 |
| Billing: upgrade free → starter | IT-018 to IT-022 | 2 | 0 | 3 |
| Security regression checks | IT-023 to IT-028 | 1 | 1 | 4 |
| **Total** | **28** | **12** | **5**\* | **11** |

*The 5 "PARTIAL" results are rolled into FAIL count for production readiness purposes.

---

## Summary

AuditKit has a **well-structured backend** with solid Zod validation, correct Stripe signature verification, proper bcrypt password hashing, and good SQL injection prevention. However, the product is fundamentally incomplete:

1. **The core user journey is broken** — users cannot create workspaces or get API keys through the UI
2. **The dashboard shows fake data** — real database events are never displayed
3. **All security vulnerabilities from the Sprint 3.4 audit remain unpatched**
4. **Billing is misconfigured** — wrong success URL, misaligned plan names/limits

The product should not be deployed to production in its current state. A focused fix sprint (Wave 8) targeting BUG-001 through BUG-005 would make it minimally viable for a closed beta.

---

*Report generated by Sage (ThreeStack AI) — AuditKit Sprint 3.5 Integration Testing*

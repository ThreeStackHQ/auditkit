# AuditKit

**Audit logging for indie SaaS** — track every user action, embed an activity feed in minutes.

## What it does
- Capture events via API: `POST /api/v1/events`
- Embeddable audit log widget (vanilla JS, 2KB)
- Dashboard for filtering, searching, exporting
- Stripe billing (Free / Pro / Business)

## Stack
- **Next.js 14** (App Router, TypeScript strict)
- **PostgreSQL** + Drizzle ORM
- **TailwindCSS** + shadcn/ui
- **Vanilla JS widget** (esbuild, <5KB gzipped)

## Structure
```
apps/web         — Next.js dashboard + API routes
apps/widget      — Vanilla JS embed widget
packages/db      — Drizzle ORM schema + client
packages/config  — Shared TS/ESLint/Tailwind configs
```

## Getting started
```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

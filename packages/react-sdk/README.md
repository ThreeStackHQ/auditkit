# @auditkit/react

React components for embedding AuditKit audit logs in your app.

## Install

```bash
npm install @auditkit/react
# or
pnpm add @auditkit/react
```

## Usage

### ActivityFeed

Renders a flat list of recent audit events.

```tsx
import { ActivityFeed } from '@auditkit/react'

export default function Page() {
  return (
    <ActivityFeed
      apiKey="ak_live_your_api_key"
      limit={25}
      theme="dark"
    />
  )
}
```

### ActivityTimeline

Same as ActivityFeed but groups events by date with a vertical timeline.

```tsx
import { ActivityTimeline } from '@auditkit/react'

export default function Page() {
  return (
    <ActivityTimeline
      apiKey="ak_live_your_api_key"
      limit={50}
      theme="light"
    />
  )
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `apiKey` | `string` | required | Your AuditKit API key (`ak_live_...`) |
| `limit` | `number` | `20` | Max events to fetch |
| `theme` | `"light" \| "dark"` | `"dark"` | Color theme |
| `baseUrl` | `string` | `"https://auditkit.threestack.io"` | Override API base URL (useful for self-hosting) |

## TypeScript

All types are exported:

```ts
import type { AuditEvent, ActivityFeedProps, ActivityTimelineProps } from '@auditkit/react'
```

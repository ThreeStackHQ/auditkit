/**
 * AuditKit Embed Widget
 * Renders an audit log feed in any web app.
 * Usage: <script src="https://cdn.auditkit.threestack.io/widget.js" data-api-key="ak_live_..."></script>
 */

interface AuditKitConfig {
  apiKey: string;
  containerId?: string;
  theme?: "light" | "dark";
  limit?: number;
}

interface AuditEvent {
  id: string;
  actorName: string | null;
  actorEmail: string | null;
  action: string;
  resourceName: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

const API_BASE = "https://auditkit.threestack.io";

async function fetchEvents(apiKey: string, limit = 20): Promise<AuditEvent[]> {
  const res = await fetch(`${API_BASE}/api/widget/events?limit=${limit}`, {
    headers: { "X-API-Key": apiKey },
  });
  if (!res.ok) throw new Error("Failed to fetch audit events");
  const data = await res.json() as { events: AuditEvent[] };
  return data.events;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function renderEvents(events: AuditEvent[], theme: string): string {
  if (events.length === 0) {
    return '<div class="ak-empty">No audit events yet.</div>';
  }
  return events.map(e => {
    const actor = e.actorName || e.actorEmail || "Unknown";
    const initials = actor.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
    return `
      <div class="ak-event">
        <div class="ak-avatar">${initials}</div>
        <div class="ak-content">
          <span class="ak-actor">${actor}</span>
          <span class="ak-action">${e.action.replace(".", " ")}</span>
          ${e.resourceName ? `<span class="ak-resource">${e.resourceName}</span>` : ""}
          <span class="ak-time">${formatTime(e.createdAt)}</span>
        </div>
      </div>`;
  }).join("");
}

function injectStyles(theme: string) {
  const isDark = theme === "dark";
  const style = document.createElement("style");
  style.textContent = `
    .ak-container{font-family:system-ui,sans-serif;max-height:400px;overflow-y:auto;background:${isDark?"#1a1a2e":"#fff"};border:1px solid ${isDark?"#333":"#e5e7eb"};border-radius:8px;padding:8px}
    .ak-event{display:flex;align-items:flex-start;gap:10px;padding:8px;border-radius:6px;margin-bottom:4px}
    .ak-event:hover{background:${isDark?"#252540":"#f9fafb"}}
    .ak-avatar{width:32px;height:32px;border-radius:50%;background:#f59e0b;color:#000;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;flex-shrink:0}
    .ak-content{flex:1;font-size:13px;color:${isDark?"#e5e7eb":"#374151"}}
    .ak-actor{font-weight:600}
    .ak-action{margin:0 4px;color:${isDark?"#9ca3af":"#6b7280"}}
    .ak-resource{font-weight:500;color:${isDark?"#fbbf24":"#d97706"}}
    .ak-time{display:block;font-size:11px;color:${isDark?"#6b7280":"#9ca3af"};margin-top:2px}
    .ak-empty{text-align:center;padding:24px;color:${isDark?"#6b7280":"#9ca3af"};font-size:14px}
  `;
  document.head.appendChild(style);
}

export function init(config: AuditKitConfig) {
  const { apiKey, containerId = "auditkit-feed", theme = "dark", limit = 20 } = config;
  const container = document.getElementById(containerId);
  if (!container) { console.error(`AuditKit: container #${containerId} not found`); return; }
  injectStyles(theme);
  container.className = "ak-container";
  container.innerHTML = '<div class="ak-empty">Loading…</div>';
  fetchEvents(apiKey, limit)
    .then(events => { container.innerHTML = renderEvents(events, theme); })
    .catch(err => { container.innerHTML = '<div class="ak-empty">Failed to load events.</div>'; console.error(err); });
}

// Auto-init from script tag
const script = document.currentScript as HTMLScriptElement | null;
if (script?.dataset.apiKey) {
  document.addEventListener("DOMContentLoaded", () => {
    init({ apiKey: script.dataset.apiKey!, theme: (script.dataset.theme as "light" | "dark") || "dark" });
  });
}

(window as unknown as Record<string, unknown>).AuditKit = { init };

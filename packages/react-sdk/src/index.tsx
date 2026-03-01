import React, { useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuditEvent {
  id: string;
  actorId: string;
  actorName: string | null;
  actorEmail: string | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  resourceName: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface ActivityFeedProps {
  apiKey: string;
  limit?: number;
  theme?: "light" | "dark";
  /** Override the API base URL (default: https://auditkit.threestack.io) */
  baseUrl?: string;
}

export interface ActivityTimelineProps extends ActivityFeedProps {}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function initials(name: string | null, email: string | null): string {
  if (name) {
    const parts = name.split(" ");
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return "??";
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

async function fetchEvents(
  apiKey: string,
  limit: number,
  baseUrl: string
): Promise<AuditEvent[]> {
  const res = await fetch(`${baseUrl}/api/widget/events?limit=${limit}`, {
    headers: { "X-API-Key": apiKey },
  });
  if (!res.ok) throw new Error(`AuditKit: ${res.status} ${res.statusText}`);
  const data = (await res.json()) as { events: AuditEvent[] };
  return data.events;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const COLORS = {
  dark: {
    bg: "#0f172a",
    card: "#1e293b",
    border: "rgba(255,255,255,0.08)",
    text: "#f1f5f9",
    subtext: "#94a3b8",
    accent: "#f97316",
    avatarBg: "#334155",
    spinnerBorder: "#334155",
    spinnerActive: "#f97316",
  },
  light: {
    bg: "#f8fafc",
    card: "#ffffff",
    border: "rgba(0,0,0,0.08)",
    text: "#0f172a",
    subtext: "#64748b",
    accent: "#f97316",
    avatarBg: "#e2e8f0",
    spinnerBorder: "#e2e8f0",
    spinnerActive: "#f97316",
  },
};

// ─── Spinner ─────────────────────────────────────────────────────────────────

function Spinner({ c }: { c: typeof COLORS.dark }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        padding: "32px",
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          border: `3px solid ${c.spinnerBorder}`,
          borderTopColor: c.spinnerActive,
          animation: "ak-spin 0.7s linear infinite",
        }}
      />
      <style>{`@keyframes ak-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── EventRow ─────────────────────────────────────────────────────────────────

function EventRow({ event, c }: { event: AuditEvent; c: typeof COLORS.dark }) {
  const init = initials(event.actorName, event.actorEmail);
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        padding: "12px 0",
        borderBottom: `1px solid ${c.border}`,
        alignItems: "flex-start",
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: c.avatarBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          fontSize: 12,
          fontWeight: 600,
          color: c.text,
        }}
      >
        {init}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontWeight: 600, color: c.text, fontSize: 14 }}>
            {event.actorName ?? event.actorEmail ?? event.actorId}
          </span>
          <span
            style={{
              fontSize: 12,
              background: `${c.accent}22`,
              color: c.accent,
              padding: "1px 8px",
              borderRadius: 999,
              fontFamily: "monospace",
              fontWeight: 500,
            }}
          >
            {event.action}
          </span>
          {event.resourceName && (
            <span style={{ fontSize: 13, color: c.subtext }}>
              on <em>{event.resourceName}</em>
            </span>
          )}
        </div>
        <div style={{ fontSize: 12, color: c.subtext, marginTop: 2 }}>
          {timeAgo(event.createdAt)}
        </div>
      </div>
    </div>
  );
}

// ─── ActivityFeed ─────────────────────────────────────────────────────────────

/**
 * ActivityFeed — renders a flat list of audit events.
 *
 * @example
 * <ActivityFeed apiKey="ak_live_..." limit={25} theme="dark" />
 */
export function ActivityFeed({
  apiKey,
  limit = 20,
  theme = "dark",
  baseUrl = "https://auditkit.threestack.io",
}: ActivityFeedProps) {
  const c = COLORS[theme];
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchEvents(apiKey, limit, baseUrl)
      .then(setEvents)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [apiKey, limit, baseUrl]);

  return (
    <div
      style={{
        background: c.bg,
        borderRadius: 16,
        border: `1px solid ${c.border}`,
        padding: "16px 20px",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        boxSizing: "border-box",
      }}
    >
      <h3
        style={{
          margin: "0 0 12px",
          fontSize: 15,
          fontWeight: 700,
          color: c.text,
        }}
      >
        Activity Log
      </h3>

      {loading && <Spinner c={c} />}

      {!loading && error && (
        <div
          style={{
            padding: "16px",
            color: "#f87171",
            fontSize: 13,
            textAlign: "center",
          }}
        >
          {error}
        </div>
      )}

      {!loading && !error && events.length === 0 && (
        <div
          style={{
            padding: "32px",
            color: c.subtext,
            fontSize: 13,
            textAlign: "center",
          }}
        >
          No audit events yet.
        </div>
      )}

      {!loading &&
        !error &&
        events.map((e) => <EventRow key={e.id} event={e} c={c} />)}
    </div>
  );
}

// ─── ActivityTimeline ─────────────────────────────────────────────────────────

/**
 * ActivityTimeline — same as ActivityFeed but groups events by date with
 * vertical timeline line and date separators.
 *
 * @example
 * <ActivityTimeline apiKey="ak_live_..." theme="dark" />
 */
export function ActivityTimeline({
  apiKey,
  limit = 20,
  theme = "dark",
  baseUrl = "https://auditkit.threestack.io",
}: ActivityTimelineProps) {
  const c = COLORS[theme];
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchEvents(apiKey, limit, baseUrl)
      .then(setEvents)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [apiKey, limit, baseUrl]);

  // Group by date
  const grouped = events.reduce<Record<string, AuditEvent[]>>((acc, ev) => {
    const key = formatDate(ev.createdAt);
    if (!acc[key]) acc[key] = [];
    acc[key].push(ev);
    return acc;
  }, {});

  return (
    <div
      style={{
        background: c.bg,
        borderRadius: 16,
        border: `1px solid ${c.border}`,
        padding: "16px 20px",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        boxSizing: "border-box",
      }}
    >
      <h3
        style={{
          margin: "0 0 16px",
          fontSize: 15,
          fontWeight: 700,
          color: c.text,
        }}
      >
        Activity Timeline
      </h3>

      {loading && <Spinner c={c} />}

      {!loading && error && (
        <div
          style={{
            padding: "16px",
            color: "#f87171",
            fontSize: 13,
            textAlign: "center",
          }}
        >
          {error}
        </div>
      )}

      {!loading && !error && events.length === 0 && (
        <div
          style={{
            padding: "32px",
            color: c.subtext,
            fontSize: 13,
            textAlign: "center",
          }}
        >
          No audit events yet.
        </div>
      )}

      {!loading &&
        !error &&
        Object.entries(grouped).map(([date, dayEvents]) => (
          <div key={date} style={{ marginBottom: 8 }}>
            {/* Date separator */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                margin: "8px 0",
              }}
            >
              <div
                style={{
                  flex: 1,
                  height: 1,
                  background: c.border,
                }}
              />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: c.subtext,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  whiteSpace: "nowrap",
                }}
              >
                {date}
              </span>
              <div style={{ flex: 1, height: 1, background: c.border }} />
            </div>

            {/* Events for this day */}
            <div style={{ position: "relative", paddingLeft: 24 }}>
              {/* Vertical line */}
              <div
                style={{
                  position: "absolute",
                  left: 7,
                  top: 0,
                  bottom: 0,
                  width: 2,
                  background: c.border,
                  borderRadius: 2,
                }}
              />

              {dayEvents.map((e) => {
                const init = initials(e.actorName, e.actorEmail);
                return (
                  <div
                    key={e.id}
                    style={{
                      position: "relative",
                      display: "flex",
                      gap: 10,
                      padding: "8px 0",
                      alignItems: "flex-start",
                    }}
                  >
                    {/* Dot */}
                    <div
                      style={{
                        position: "absolute",
                        left: -20,
                        top: 14,
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: c.accent,
                        border: `2px solid ${c.bg}`,
                        boxSizing: "border-box",
                      }}
                    />

                    {/* Avatar */}
                    <div
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: "50%",
                        background: c.avatarBg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        fontSize: 11,
                        fontWeight: 600,
                        color: c.text,
                      }}
                    >
                      {init}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 600,
                            color: c.text,
                            fontSize: 13,
                          }}
                        >
                          {e.actorName ?? e.actorEmail ?? e.actorId}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            background: `${c.accent}22`,
                            color: c.accent,
                            padding: "1px 7px",
                            borderRadius: 999,
                            fontFamily: "monospace",
                          }}
                        >
                          {e.action}
                        </span>
                        {e.resourceName && (
                          <span style={{ fontSize: 12, color: c.subtext }}>
                            <em>{e.resourceName}</em>
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: c.subtext,
                          marginTop: 1,
                        }}
                      >
                        {timeAgo(e.createdAt)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
    </div>
  );
}

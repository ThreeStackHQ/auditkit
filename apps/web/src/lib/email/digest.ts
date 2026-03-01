import { db, auditEvents, workspaces, eq, sql, desc, count } from "@auditkit/db";

interface WeeklyStats {
  totalEvents: number;
  topActors: { actorId: string; actorName: string | null; actorEmail: string | null; count: number }[];
  topActions: { action: string; count: number }[];
  workspaceName: string;
  slug: string;
  periodStart: Date;
  periodEnd: Date;
}

export async function getWeeklyStats(workspaceId: string): Promise<WeeklyStats | null> {
  const now = new Date();
  const periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [ws] = await db
    .select({ name: workspaces.name, slug: workspaces.slug })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  if (!ws) return null;

  // Total events this week
  const [totalRow] = await db
    .select({ total: count() })
    .from(auditEvents)
    .where(
      sql`${auditEvents.workspaceId} = ${workspaceId} AND ${auditEvents.createdAt} >= ${periodStart}`
    );

  // Top actors by event count
  const topActors = await db
    .select({
      actorId: auditEvents.actorId,
      actorName: auditEvents.actorName,
      actorEmail: auditEvents.actorEmail,
      count: count(),
    })
    .from(auditEvents)
    .where(
      sql`${auditEvents.workspaceId} = ${workspaceId} AND ${auditEvents.createdAt} >= ${periodStart}`
    )
    .groupBy(auditEvents.actorId, auditEvents.actorName, auditEvents.actorEmail)
    .orderBy(desc(count()))
    .limit(5);

  // Top actions
  const topActions = await db
    .select({ action: auditEvents.action, count: count() })
    .from(auditEvents)
    .where(
      sql`${auditEvents.workspaceId} = ${workspaceId} AND ${auditEvents.createdAt} >= ${periodStart}`
    )
    .groupBy(auditEvents.action)
    .orderBy(desc(count()))
    .limit(5);

  return {
    totalEvents: totalRow?.total ?? 0,
    topActors,
    topActions,
    workspaceName: ws.name,
    slug: ws.slug,
    periodStart,
    periodEnd: now,
  };
}

function buildDigestHtml(stats: WeeklyStats): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const actorRows = stats.topActors
    .map(
      (a) => `
    <tr>
      <td style="padding:8px 12px;color:#94a3b8;font-size:13px;">${a.actorName ?? a.actorEmail ?? a.actorId}</td>
      <td style="padding:8px 12px;text-align:right;color:#f97316;font-weight:600;font-size:13px;">${a.count}</td>
    </tr>`
    )
    .join("");

  const actionRows = stats.topActions
    .map(
      (a) => `
    <tr>
      <td style="padding:8px 12px;color:#94a3b8;font-size:13px;font-family:monospace;">${a.action}</td>
      <td style="padding:8px 12px;text-align:right;color:#f97316;font-weight:600;font-size:13px;">${a.count}</td>
    </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AuditKit Weekly Digest</title></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1e293b 0%,#0f172a 100%);border:1px solid rgba(255,255,255,0.08);border-radius:16px 16px 0 0;padding:32px 40px;text-align:center;">
            <div style="display:inline-flex;align-items:center;gap:8px;margin-bottom:16px;">
              <div style="width:36px;height:36px;border-radius:10px;background:#f97316;display:inline-flex;align-items:center;justify-content:center;font-weight:700;color:#fff;font-size:16px;">A</div>
              <span style="font-size:18px;font-weight:700;color:#f1f5f9;">AuditKit</span>
            </div>
            <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#f1f5f9;">Weekly Digest</h1>
            <p style="margin:0;color:#94a3b8;font-size:14px;">${stats.workspaceName} &middot; ${fmt(stats.periodStart)} – ${fmt(stats.periodEnd)}</p>
          </td>
        </tr>

        <!-- Total events stat card -->
        <tr>
          <td style="background:#1e293b;border-left:1px solid rgba(255,255,255,0.08);border-right:1px solid rgba(255,255,255,0.08);padding:32px 40px 0;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:rgba(249,115,22,0.1);border:1px solid rgba(249,115,22,0.2);border-radius:12px;padding:24px;text-align:center;">
                  <div style="font-size:48px;font-weight:800;color:#f97316;line-height:1;">${stats.totalEvents.toLocaleString()}</div>
                  <div style="margin-top:4px;font-size:14px;color:#94a3b8;font-weight:500;">Total Events This Week</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Top Actors -->
        <tr>
          <td style="background:#1e293b;border-left:1px solid rgba(255,255,255,0.08);border-right:1px solid rgba(255,255,255,0.08);padding:24px 40px 0;">
            <h2 style="margin:0 0 16px;font-size:16px;font-weight:600;color:#f1f5f9;">Top Actors</h2>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid rgba(255,255,255,0.08);border-radius:10px;overflow:hidden;">
              <thead>
                <tr style="background:rgba(255,255,255,0.03);">
                  <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Actor</th>
                  <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Events</th>
                </tr>
              </thead>
              <tbody>${actorRows || '<tr><td colspan="2" style="padding:16px 12px;color:#64748b;font-size:13px;text-align:center;">No activity this week</td></tr>'}</tbody>
            </table>
          </td>
        </tr>

        <!-- Top Actions -->
        <tr>
          <td style="background:#1e293b;border-left:1px solid rgba(255,255,255,0.08);border-right:1px solid rgba(255,255,255,0.08);padding:24px 40px;">
            <h2 style="margin:0 0 16px;font-size:16px;font-weight:600;color:#f1f5f9;">Top Actions</h2>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid rgba(255,255,255,0.08);border-radius:10px;overflow:hidden;">
              <thead>
                <tr style="background:rgba(255,255,255,0.03);">
                  <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Action</th>
                  <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Count</th>
                </tr>
              </thead>
              <tbody>${actionRows || '<tr><td colspan="2" style="padding:16px 12px;color:#64748b;font-size:13px;text-align:center;">No actions this week</td></tr>'}</tbody>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#0f172a;border:1px solid rgba(255,255,255,0.08);border-top:none;border-radius:0 0 16px 16px;padding:24px 40px;text-align:center;">
            <p style="margin:0 0 8px;font-size:12px;color:#475569;">You're receiving this because you enabled weekly digests for <strong style="color:#94a3b8;">${stats.workspaceName}</strong>.</p>
            <p style="margin:0;font-size:12px;color:#334155;">AuditKit &middot; by ThreeStack</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * Send weekly digest email for a workspace via Resend.
 */
export async function sendWeeklyDigest(workspaceId: string, recipientEmail: string): Promise<void> {
  const stats = await getWeeklyStats(workspaceId);
  if (!stats) throw new Error(`Workspace ${workspaceId} not found`);

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) throw new Error("RESEND_API_KEY not configured");

  const html = buildDigestHtml(stats);
  const subject = `AuditKit: Your ${stats.workspaceName} weekly digest (${stats.totalEvents.toLocaleString()} events)`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "AuditKit <digest@auditkit.threestack.io>",
      to: [recipientEmail],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error: ${err}`);
  }
}

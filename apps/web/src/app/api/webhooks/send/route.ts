import { NextRequest, NextResponse } from "next/server";
import { db, webhooks, eq, and } from "@auditkit/db";
import { createHmac } from "crypto";
import { z } from "zod";

const bodySchema = z.object({
  workspaceId: z.string().uuid(),
  event: z.record(z.unknown()),
});

/**
 * Internal endpoint: triggers all active webhooks for a workspace.
 * Called by /api/v1/events (fire-and-forget).
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { workspaceId, event } = parsed.data;

  const activeWebhooks = await db
    .select()
    .from(webhooks)
    .where(
      and(
        eq(webhooks.workspaceId, workspaceId),
        eq(webhooks.isActive, true)
      )
    );

  const payload = JSON.stringify({
    type: "audit.event",
    timestamp: new Date().toISOString(),
    data: event,
  });

  const deliveries = activeWebhooks.map(async (wh) => {
    const sig = createHmac("sha256", wh.secret).update(payload).digest("hex");
    try {
      await fetch(wh.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-AuditKit-Signature": `sha256=${sig}`,
        },
        body: payload,
        signal: AbortSignal.timeout(10_000), // 10s timeout
      });
    } catch {
      // Best-effort; failures are not retried here
    }
  });

  await Promise.allSettled(deliveries);

  return NextResponse.json({ delivered: activeWebhooks.length });
}

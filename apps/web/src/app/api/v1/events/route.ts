import { NextRequest, NextResponse } from "next/server";
import { db, auditEvents, eq, sql, count } from "@auditkit/db";
import { z } from "zod";
import { getWorkspaceByApiKey, getMonthlyLimit } from "@/lib/workspace";

// Simple IP-based rate limit: 5 req/min per API key
const rl = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = rl.get(key);
  if (!entry || entry.resetAt < now) {
    rl.set(key, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  if (entry.count >= 300) return true; // 300/min per key
  entry.count++;
  return false;
}

const eventSchema = z.object({
  actorId: z.string().min(1).max(255),
  actorEmail: z.string().email().max(255).optional(),
  actorName: z.string().max(255).optional(),
  action: z.string().min(1).max(255),
  resourceType: z.string().max(100).optional(),
  resourceId: z.string().max(255).optional(),
  resourceName: z.string().max(255).optional(),
  metadata: z.record(z.unknown()).optional(),
  ipAddress: z.string().max(45).optional(),
  userAgent: z.string().max(500).optional(),
});

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "X-API-Key, Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key") ?? req.headers.get("X-API-Key");
  if (!apiKey) {
    return NextResponse.json({ error: "Missing X-API-Key header" }, { status: 401, headers: CORS });
  }

  if (isRateLimited(apiKey)) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429, headers: CORS });
  }

  const workspace = await getWorkspaceByApiKey(apiKey);
  if (!workspace) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401, headers: CORS });
  }

  // Parse body
  const body = await req.json().catch(() => null);
  const parsed = eventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 422, headers: CORS }
    );
  }

  // Enforce monthly event limit
  const monthlyLimit = getMonthlyLimit(workspace.tier);
  if (isFinite(monthlyLimit)) {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [row] = await db
      .select({ total: count() })
      .from(auditEvents)
      .where(
        sql`${auditEvents.workspaceId} = ${workspace.id} AND ${auditEvents.createdAt} >= ${monthStart}`
      );

    if ((row?.total ?? 0) >= monthlyLimit) {
      return NextResponse.json(
        {
          error: `Monthly event limit reached (${monthlyLimit.toLocaleString()} events). Upgrade your plan.`,
          code: "LIMIT_EXCEEDED",
        },
        { status: 402, headers: CORS }
      );
    }
  }

  const data = parsed.data;

  const [event] = await db
    .insert(auditEvents)
    .values({
      workspaceId: workspace.id,
      actorId: data.actorId,
      actorEmail: data.actorEmail,
      actorName: data.actorName,
      action: data.action,
      resourceType: data.resourceType,
      resourceId: data.resourceId,
      resourceName: data.resourceName,
      metadata: data.metadata,
      ipAddress:
        data.ipAddress ??
        req.headers.get("x-forwarded-for")?.split(",")[0].trim(),
      userAgent: data.userAgent ?? req.headers.get("user-agent") ?? undefined,
    })
    .returning({ id: auditEvents.id });

  // Trigger webhooks asynchronously (fire-and-forget)
  void triggerWebhooks(workspace.id, { ...data, id: event.id });

  return NextResponse.json({ success: true, eventId: event.id }, { status: 201, headers: CORS });
}

async function triggerWebhooks(workspaceId: string, event: Record<string, unknown>) {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    await fetch(`${appUrl}/api/webhooks/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId, event }),
    });
  } catch {
    // Webhook delivery failure should not affect event ingestion
  }
}

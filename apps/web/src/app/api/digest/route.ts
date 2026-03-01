import { NextRequest, NextResponse } from "next/server";
import { db, workspaces, subscriptions, eq } from "@auditkit/db";
import { getWeeklyStats, sendWeeklyDigest } from "@/lib/email/digest";

/**
 * GET /api/digest?slug=<workspaceSlug>
 * Returns weekly stats JSON for a workspace. Used by cron jobs or dashboards.
 *
 * POST /api/digest { workspaceId, email }
 * Actually sends the digest email via Resend. Called by cron.
 */

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");

  if (!slug) {
    return NextResponse.json({ error: "Missing ?slug query param" }, { status: 400 });
  }

  const [ws] = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.slug, slug))
    .limit(1);

  if (!ws) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const stats = await getWeeklyStats(ws.id);
  if (!stats) {
    return NextResponse.json({ error: "Failed to compute stats" }, { status: 500 });
  }

  return NextResponse.json({ stats });
}

export async function POST(req: NextRequest) {
  // Simple shared secret protection for cron callers
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null) as { workspaceId?: string; email?: string } | null;
  if (!body?.workspaceId || !body?.email) {
    return NextResponse.json({ error: "Missing workspaceId or email" }, { status: 400 });
  }

  await sendWeeklyDigest(body.workspaceId, body.email);
  return NextResponse.json({ sent: true });
}

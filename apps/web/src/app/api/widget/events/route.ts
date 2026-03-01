import { NextRequest, NextResponse } from "next/server";
import { db, auditEvents, eq, desc } from "@auditkit/db";
import { getWorkspaceByApiKey } from "@/lib/workspace";

// Simple in-memory rate limiter: max 60 req/min per API key
const rl = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = rl.get(key);
  if (!entry || entry.resetAt < now) {
    rl.set(key, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  if (entry.count >= 60) return true;
  entry.count++;
  return false;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "X-API-Key, Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key") ?? req.headers.get("X-API-Key");
  if (!apiKey) {
    return NextResponse.json({ error: "Missing X-API-Key header" }, { status: 401, headers: CORS });
  }

  if (isRateLimited(apiKey)) {
    return NextResponse.json({ error: "Rate limit exceeded (60/min)" }, { status: 429, headers: CORS });
  }

  const workspace = await getWorkspaceByApiKey(apiKey);
  if (!workspace) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401, headers: CORS });
  }

  const { searchParams } = new URL(req.url);
  const rawLimit = parseInt(searchParams.get("limit") ?? "20", 10);
  const limit = Math.max(1, Math.min(rawLimit, 50));

  const events = await db
    .select()
    .from(auditEvents)
    .where(eq(auditEvents.workspaceId, workspace.id))
    .orderBy(desc(auditEvents.createdAt))
    .limit(limit);

  return NextResponse.json({ events }, { headers: CORS });
}

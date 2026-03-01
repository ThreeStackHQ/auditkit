export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db, apiKeys, events, projects, users, eq, and, isNull, gte, count } from "@auditkit/db";
import { checkRateLimit } from "@/lib/rate-limiter";
import bcrypt from "bcryptjs";
import { z } from "zod";

// ─── Plan Limits ──────────────────────────────────────────────────────────────

const PLAN_LIMITS: Record<string, number> = {
  free: 10_000,
  starter: 100_000,
  pro: Infinity,
};

// ─── Validation ───────────────────────────────────────────────────────────────

const eventBodySchema = z.object({
  actor: z.object({
    id: z.string().min(1),
    name: z.string().optional(),
    email: z.string().email().optional(),
  }),
  action: z.string().min(1, "action is required"),
  resource: z
    .object({
      type: z.string().optional(),
      id: z.string().optional(),
      name: z.string().optional(),
    })
    .optional(),
  metadata: z.record(z.unknown()).optional(),
});

// ─── Helper: Extract Bearer token ─────────────────────────────────────────────

function extractBearer(req: NextRequest): string | null {
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return null;
  return auth.slice(7).trim();
}

// ─── Helper: Get client IP ────────────────────────────────────────────────────

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

// ─── POST /api/v1/events ──────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Extract API key from Bearer token
  const rawKey = extractBearer(req);
  if (!rawKey) {
    return NextResponse.json(
      { error: "Missing Authorization header" },
      { status: 401 },
    );
  }

  // 2. Look up API key by prefix (first 8 chars of the hex portion)
  //    Format: ak_live_<64-hex-chars>  → prefix = first 8 chars of the hex part
  const prefix = rawKey.startsWith("ak_live_")
    ? rawKey.slice(8, 16) // 8 chars of hex after "ak_live_"
    : rawKey.slice(0, 8);

  const [keyRecord] = await db
    .select()
    .from(apiKeys)
    .where(
      and(
        eq(apiKeys.keyPrefix, prefix),
        isNull(apiKeys.revokedAt),
      ),
    )
    .limit(1);

  if (!keyRecord) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  // 3. Compare bcrypt hash
  const valid = await bcrypt.compare(rawKey, keyRecord.keyHash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  // 4. Rate limit: 1000 req/min per API key (in-memory)
  if (!checkRateLimit(keyRecord.id, 1000, 60_000)) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Max 1000 requests per minute." },
      { status: 429 },
    );
  }

  // 5. Get project + user plan
  const [project] = await db
    .select({
      id: projects.id,
      userId: projects.userId,
    })
    .from(projects)
    .where(eq(projects.id, keyRecord.projectId))
    .limit(1);

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // 6. Get user plan
  const [userRow] = await db
    .select({ plan: users.plan })
    .from(users)
    .where(eq(users.id, project.userId))
    .limit(1);

  const plan = userRow?.plan ?? "free";
  const limit = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;

  // 7. Enforce plan limits (count events this calendar month)
  if (limit !== Infinity) {
    const startOfMonth = new Date();
    startOfMonth.setUTCDate(1);
    startOfMonth.setUTCHours(0, 0, 0, 0);

    const [countRow] = await db
      .select({ total: count() })
      .from(events)
      .where(
        and(
          eq(events.projectId, project.id),
          gte(events.createdAt, startOfMonth),
        ),
      );

    const total = countRow?.total ?? 0;
    if (total >= limit) {
      return NextResponse.json(
        {
          error: `Monthly event limit reached (${limit.toLocaleString()} events). Upgrade your plan.`,
        },
        { status: 402 },
      );
    }
  }

  // 8. Validate request body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = eventBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Validation error", details: parsed.error.errors },
      { status: 400 },
    );
  }

  const { actor, action, resource, metadata } = parsed.data;

  // 9. Insert event
  const [inserted] = await db
    .insert(events)
    .values({
      projectId: project.id,
      actorId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      action,
      resourceType: resource?.type,
      resourceId: resource?.id,
      resourceName: resource?.name,
      metadata: metadata as Record<string, unknown> | undefined,
      ipAddress: getIp(req),
    })
    .returning({ id: events.id, createdAt: events.createdAt });

  if (!inserted) {
    return NextResponse.json({ error: "Failed to insert event" }, { status: 500 });
  }

  // 10. Update lastUsedAt on the API key (fire-and-forget)
  void db.update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, keyRecord.id))
    .catch(console.error);

  return NextResponse.json(
    { id: inserted.id, created_at: inserted.createdAt },
    { status: 201 },
  );
}

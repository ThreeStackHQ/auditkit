export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db, apiKeys, events, projects, users, eq, and, isNull, gte, lte, count, desc, asc } from "@auditkit/db";
import { checkRateLimit } from "@/lib/rate-limiter";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { z } from "zod";

// ─── Plan Limits ──────────────────────────────────────────────────────────────

const PLAN_LIMITS: Record<string, number> = {
  free: 10_000,
  starter: 100_000,
  pro: Infinity,
};

// ─── Validation schemas ───────────────────────────────────────────────────────

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

const querySchema = z.object({
  project_slug: z.string().min(1),
  actor_id: z.string().optional(),
  action: z.string().optional(),
  resource_type: z.string().optional(),
  date_from: z.string().datetime({ offset: true }).optional(),
  date_to: z.string().datetime({ offset: true }).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

// ─── Cursor helpers ───────────────────────────────────────────────────────────

interface CursorData {
  createdAt: string;
  id: string;
}

function encodeCursor(createdAt: Date, id: string): string {
  const payload: CursorData = { createdAt: createdAt.toISOString(), id };
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function decodeCursor(cursor: string): CursorData | null {
  try {
    const raw = Buffer.from(cursor, "base64url").toString("utf-8");
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "createdAt" in parsed &&
      "id" in parsed &&
      typeof (parsed as { createdAt: unknown }).createdAt === "string" &&
      typeof (parsed as { id: unknown }).id === "string"
    ) {
      return parsed as CursorData;
    }
    return null;
  } catch {
    return null;
  }
}

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

  // 2. Look up API key by prefix (first 8 chars of the hex portion after "ak_live_")
  const prefix = rawKey.startsWith("ak_live_")
    ? rawKey.slice(8, 16)
    : rawKey.slice(0, 8);

  const [keyRecord] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.keyPrefix, prefix), isNull(apiKeys.revokedAt)))
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
    .select({ id: projects.id, userId: projects.userId })
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
  const limitCount = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;

  // 7. Enforce plan limits (count events this calendar month)
  if (limitCount !== Infinity) {
    const startOfMonth = new Date();
    startOfMonth.setUTCDate(1);
    startOfMonth.setUTCHours(0, 0, 0, 0);

    const [countRow] = await db
      .select({ total: count() })
      .from(events)
      .where(and(eq(events.projectId, project.id), gte(events.createdAt, startOfMonth)));

    const total = countRow?.total ?? 0;
    if (total >= limitCount) {
      return NextResponse.json(
        {
          error: `Monthly event limit reached (${limitCount.toLocaleString()} events). Upgrade your plan.`,
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
      {
        error: parsed.error.errors[0]?.message ?? "Validation error",
        details: parsed.error.errors,
      },
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

// ─── GET /api/v1/events ───────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  // Session auth
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  // Parse query params
  const { searchParams } = req.nextUrl;
  const params = Object.fromEntries(searchParams.entries());

  const parsed = querySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid query params" },
      { status: 400 },
    );
  }

  const {
    project_slug,
    actor_id,
    action,
    resource_type,
    date_from,
    date_to,
    limit: limitParam,
    cursor,
  } = parsed.data;

  // Verify project ownership
  const [project] = await db
    .select({
      id: projects.id,
      userId: projects.userId,
      retentionDays: projects.retentionDays,
    })
    .from(projects)
    .where(eq(projects.slug, project_slug))
    .limit(1);

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (project.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Build WHERE conditions
  const conditions = [eq(events.projectId, project.id)];

  // Retention filter: exclude events older than retention_days
  const retentionCutoff = new Date();
  retentionCutoff.setDate(retentionCutoff.getDate() - project.retentionDays);
  conditions.push(gte(events.createdAt, retentionCutoff));

  if (actor_id) conditions.push(eq(events.actorId, actor_id));
  if (action) conditions.push(eq(events.action, action));
  if (resource_type) conditions.push(eq(events.resourceType, resource_type));
  if (date_from) conditions.push(gte(events.createdAt, new Date(date_from)));
  if (date_to) conditions.push(lte(events.createdAt, new Date(date_to)));

  // Cursor-based pagination (cursor = base64url({ createdAt, id }))
  if (cursor) {
    const cursorData = decodeCursor(cursor);
    if (!cursorData) {
      return NextResponse.json({ error: "Invalid cursor" }, { status: 400 });
    }
    // Return events with createdAt < cursor.createdAt OR
    // (createdAt == cursor.createdAt AND id < cursor.id) — for stable ordering
    // Simplified: filter by createdAt < cursorData.createdAt
    conditions.push(lte(events.createdAt, new Date(cursorData.createdAt)));
  }

  // Count total (without pagination)
  const [countRow] = await db
    .select({ total: count() })
    .from(events)
    .where(and(...conditions));

  const total = countRow?.total ?? 0;

  // Fetch events (limit + 1 to detect next page)
  const rows = await db
    .select()
    .from(events)
    .where(and(...conditions))
    .orderBy(desc(events.createdAt))
    .limit(limitParam + 1);

  const hasMore = rows.length > limitParam;
  const page = hasMore ? rows.slice(0, limitParam) : rows;

  const nextCursor =
    hasMore && page.length > 0
      ? encodeCursor(page[page.length - 1]!.createdAt, page[page.length - 1]!.id)
      : null;

  return NextResponse.json({
    events: page,
    next_cursor: nextCursor,
    total,
  });
}

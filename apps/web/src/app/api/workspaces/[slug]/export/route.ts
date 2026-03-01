import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db, workspaces, auditEvents, subscriptions, eq, and, gte, lte } from "@auditkit/db";

const CSV_HEADERS = [
  "id",
  "actor_id",
  "actor_email",
  "actor_name",
  "action",
  "resource_type",
  "resource_id",
  "resource_name",
  "metadata",
  "ip_address",
  "created_at",
];

function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str =
    typeof value === "object" ? JSON.stringify(value) : String(value);
  // Escape double-quotes and wrap in quotes if needed
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = params;
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from"); // YYYY-MM-DD
  const to = searchParams.get("to"); // YYYY-MM-DD

  // Find workspace owned by this user
  const [ws] = await db
    .select({ id: workspaces.id, userId: workspaces.userId })
    .from(workspaces)
    .where(eq(workspaces.slug, slug))
    .limit(1);

  if (!ws) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  if (ws.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Check subscription tier — Pro+ only
  const [sub] = await db
    .select({ tier: subscriptions.tier, status: subscriptions.status })
    .from(subscriptions)
    .where(eq(subscriptions.userId, session.user.id))
    .limit(1);

  const tier = sub?.tier ?? "free";
  const isPro = ["pro", "business"].includes(tier) && sub?.status === "active";

  if (!isPro) {
    return NextResponse.json(
      {
        error: "CSV export requires a Pro or Business plan.",
        code: "UPGRADE_REQUIRED",
      },
      { status: 402 }
    );
  }

  // Build date filters
  const conditions = [eq(auditEvents.workspaceId, ws.id)];

  if (from) {
    const fromDate = new Date(from);
    if (!isNaN(fromDate.getTime())) {
      conditions.push(gte(auditEvents.createdAt, fromDate));
    }
  }
  if (to) {
    const toDate = new Date(to);
    if (!isNaN(toDate.getTime())) {
      toDate.setHours(23, 59, 59, 999);
      conditions.push(lte(auditEvents.createdAt, toDate));
    }
  }

  const events = await db
    .select()
    .from(auditEvents)
    .where(and(...conditions))
    .orderBy(auditEvents.createdAt);

  // Build CSV
  const rows: string[] = [CSV_HEADERS.join(",")];

  for (const e of events) {
    rows.push(
      [
        escapeCSV(e.id),
        escapeCSV(e.actorId),
        escapeCSV(e.actorEmail),
        escapeCSV(e.actorName),
        escapeCSV(e.action),
        escapeCSV(e.resourceType),
        escapeCSV(e.resourceId),
        escapeCSV(e.resourceName),
        escapeCSV(e.metadata),
        escapeCSV(e.ipAddress),
        escapeCSV(e.createdAt?.toISOString()),
      ].join(",")
    );
  }

  const csv = rows.join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="audit-export-${slug}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

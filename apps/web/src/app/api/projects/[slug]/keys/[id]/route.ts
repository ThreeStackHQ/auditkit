export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db, apiKeys, projects, eq, and, isNull } from "@auditkit/db";
import { auth } from "@/lib/auth";

type RouteParams = { params: { slug: string; id: string } };

// ─── DELETE /api/projects/[slug]/keys/[id] ────────────────────────────────────

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify project ownership
  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.slug, params.slug), eq(projects.userId, session.user.id)))
    .limit(1);

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Verify key belongs to this project and is not already revoked
  const [keyRecord] = await db
    .select({ id: apiKeys.id, revokedAt: apiKeys.revokedAt })
    .from(apiKeys)
    .where(and(eq(apiKeys.id, params.id), eq(apiKeys.projectId, project.id)))
    .limit(1);

  if (!keyRecord) {
    return NextResponse.json({ error: "API key not found" }, { status: 404 });
  }

  if (keyRecord.revokedAt) {
    return NextResponse.json({ error: "API key is already revoked" }, { status: 409 });
  }

  // Revoke: set revoked_at = now()
  await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(eq(apiKeys.id, keyRecord.id));

  return NextResponse.json({ success: true, message: "API key revoked" });
}

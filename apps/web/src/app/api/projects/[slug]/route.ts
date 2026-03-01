export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db, projects, eq, and } from "@auditkit/db";
import { auth } from "@/lib/auth";
import { z } from "zod";

const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  retentionDays: z.number().int().min(1).max(3650).optional(),
});

type RouteParams = { params: { slug: string } };

async function getProjectBySlugAndOwner(slug: string, userId: string) {
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.slug, slug), eq(projects.userId, userId)))
    .limit(1);
  return project ?? null;
}

// ─── GET /api/projects/[slug] ─────────────────────────────────────────────────

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const project = await getProjectBySlugAndOwner(params.slug, session.user.id);
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ project });
}

// ─── PATCH /api/projects/[slug] ───────────────────────────────────────────────

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const project = await getProjectBySlugAndOwner(params.slug, session.user.id);
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Validation error" },
      { status: 400 },
    );
  }

  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const [updated] = await db
    .update(projects)
    .set(parsed.data)
    .where(eq(projects.id, project.id))
    .returning();

  return NextResponse.json({ project: updated });
}

// ─── DELETE /api/projects/[slug] ──────────────────────────────────────────────

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const project = await getProjectBySlugAndOwner(params.slug, session.user.id);
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.delete(projects).where(eq(projects.id, project.id));

  return NextResponse.json({ success: true });
}

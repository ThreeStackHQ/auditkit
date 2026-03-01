export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db, projects, eq, and } from "@auditkit/db";
import { auth } from "@/lib/auth";
import { customAlphabet } from "nanoid";
import { randomBytes } from "crypto";
import { z } from "zod";

// nanoid for slug generation (url-safe, lowercase)
const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 8);

function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `${base}-${nanoid()}`;
}

function generateApiKey(): string {
  const hex = randomBytes(32).toString("hex"); // 64 hex chars
  return `ak_live_${hex}`;
}

const createProjectSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  retentionDays: z.number().int().min(1).max(3650).default(90).optional(),
});

const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  retentionDays: z.number().int().min(1).max(3650).optional(),
});

// ─── GET /api/projects ────────────────────────────────────────────────────────

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, session.user.id));

  return NextResponse.json({ projects: rows });
}

// ─── POST /api/projects ───────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Validation error" },
      { status: 400 },
    );
  }

  const { name, description, retentionDays = 90 } = parsed.data;
  const slug = generateSlug(name);
  const apiKey = generateApiKey();

  const [project] = await db
    .insert(projects)
    .values({
      userId: session.user.id,
      name,
      slug,
      description,
      apiKey,
      retentionDays,
    })
    .returning();

  return NextResponse.json({ project }, { status: 201 });
}

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db, apiKeys, projects, eq, and, isNull } from "@auditkit/db";
import { auth } from "@/lib/auth";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";

type RouteParams = { params: { slug: string } };

const createKeySchema = z.object({
  name: z.string().min(1, "Key name is required").max(100),
});

/** Generate a new API key: ak_live_<64-hex-chars> */
function generateApiKey(): string {
  const hex = randomBytes(32).toString("hex"); // 64 hex chars
  return `ak_live_${hex}`;
}

/** Extract the 8-char prefix from ak_live_<hex>: first 8 chars of hex */
function extractPrefix(key: string): string {
  return key.startsWith("ak_live_") ? key.slice(8, 16) : key.slice(0, 8);
}

async function getProjectBySlug(slug: string, userId: string) {
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.slug, slug), eq(projects.userId, userId)))
    .limit(1);
  return project ?? null;
}

// ─── GET /api/projects/[slug]/keys ────────────────────────────────────────────

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const project = await getProjectBySlug(params.slug, session.user.id);
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // List keys — never return full key or hash
  const keys = await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      lastUsedAt: apiKeys.lastUsedAt,
      createdAt: apiKeys.createdAt,
      revokedAt: apiKeys.revokedAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.projectId, project.id));

  return NextResponse.json({ keys });
}

// ─── POST /api/projects/[slug]/keys ───────────────────────────────────────────

export async function POST(req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const project = await getProjectBySlug(params.slug, session.user.id);
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createKeySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Validation error" },
      { status: 400 },
    );
  }

  // Generate key
  const plaintext = generateApiKey();
  const prefix = extractPrefix(plaintext);
  const keyHash = await bcrypt.hash(plaintext, 12);

  const [keyRecord] = await db
    .insert(apiKeys)
    .values({
      projectId: project.id,
      name: parsed.data.name,
      keyHash,
      keyPrefix: prefix,
    })
    .returning({
      id: apiKeys.id,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      createdAt: apiKeys.createdAt,
    });

  // Return plaintext ONCE — never stored after this response
  return NextResponse.json(
    {
      key: keyRecord,
      plaintext, // ⚠ displayed once, store securely!
    },
    { status: 201 },
  );
}

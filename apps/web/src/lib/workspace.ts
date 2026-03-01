import { db, workspaces, subscriptions, users, eq } from "@auditkit/db";

export type WorkspaceWithSub = {
  id: string;
  userId: string;
  name: string;
  slug: string;
  apiKey: string;
  retentionDays: number;
  tier: string; // free | starter | pro | business
};

/**
 * Look up a workspace by its API key and resolve the owner's subscription tier.
 */
export async function getWorkspaceByApiKey(
  apiKey: string
): Promise<WorkspaceWithSub | null> {
  const rows = await db
    .select({
      id: workspaces.id,
      userId: workspaces.userId,
      name: workspaces.name,
      slug: workspaces.slug,
      apiKey: workspaces.apiKey,
      retentionDays: workspaces.retentionDays,
      tier: subscriptions.tier,
    })
    .from(workspaces)
    .leftJoin(subscriptions, eq(subscriptions.userId, workspaces.userId))
    .where(eq(workspaces.apiKey, apiKey))
    .limit(1);

  if (!rows.length) return null;

  const row = rows[0];
  return { ...row, tier: row.tier ?? "free" };
}

// ─── Plan limits ─────────────────────────────────────────────────────────────

export const PLAN_LIMITS: Record<string, number> = {
  free: 1_000,
  starter: 10_000,
  pro: 100_000,
  business: Infinity,
};

export function getMonthlyLimit(tier: string): number {
  return PLAN_LIMITS[tier] ?? PLAN_LIMITS.free;
}

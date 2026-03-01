import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { db, users, eq } from "@auditkit/db";
import { z } from "zod";

// Basic in-memory rate limit: max 5 signups per IP per hour
const ipSignupMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = ipSignupMap.get(ip);
  if (!entry || entry.resetAt < now) {
    ipSignupMap.set(ip, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return false;
  }
  if (entry.count >= 5) return true;
  entry.count++;
  return false;
}

const schema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(255),
  password: z.string().min(8).max(72),
});

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many signups from this IP. Try again later." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const { name, email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  // Check duplicate
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists." },
      { status: 409 }
    );
  }

  const passwordHash = await hash(password, 12);

  const [user] = await db
    .insert(users)
    .values({ name, email: normalizedEmail, passwordHash })
    .returning({ id: users.id, email: users.email, name: users.name });

  return NextResponse.json({ user }, { status: 201 });
}

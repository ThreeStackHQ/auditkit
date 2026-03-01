import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db, subscriptions, users, eq } from "@auditkit/db";
import { getStripe } from "@/lib/stripe";
import { z } from "zod";

const schema = z.object({
  plan: z.enum(["starter", "pro"]),
});

const PLAN_PRICE_ENV: Record<"starter" | "pro", string> = {
  starter: "STRIPE_STARTER_PRICE_ID",
  pro: "STRIPE_PRO_PRICE_ID",
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const { plan } = parsed.data;
  const priceId = process.env[PLAN_PRICE_ENV[plan]];
  if (!priceId) {
    return NextResponse.json(
      { error: `${PLAN_PRICE_ENV[plan]} env var not set` },
      { status: 500 }
    );
  }

  const stripe = getStripe();
  const userId = session.user.id;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // Find or create Stripe customer
  let customerId: string | undefined;
  const [sub] = await db
    .select({ stripeCustomerId: subscriptions.stripeCustomerId })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  if (sub?.stripeCustomerId) {
    customerId = sub.stripeCustomerId;
  } else {
    const [user] = await db
      .select({ email: users.email, name: users.name })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const customer = await stripe.customers.create({
      email: user?.email,
      name: user?.name ?? undefined,
      metadata: { userId },
    });
    customerId = customer.id;
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/dashboard?checkout=success`,
    cancel_url: `${appUrl}/pricing?checkout=cancelled`,
    metadata: { userId, plan },
    subscription_data: { metadata: { userId, plan } },
  });

  return NextResponse.json({ url: checkoutSession.url });
}

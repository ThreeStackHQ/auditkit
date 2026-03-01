import { NextRequest, NextResponse } from "next/server";
import { db, subscriptions, eq } from "@auditkit/db";
import { getStripe } from "@/lib/stripe";
import type Stripe from "stripe";

export const config = { api: { bodyParser: false } };

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: "Missing signature or secret" }, { status: 400 });
  }

  const rawBody = await req.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Webhook signature verification failed: ${msg}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription") break;

        const userId = session.metadata?.userId;
        const plan = session.metadata?.plan ?? "starter";
        const stripeCustomerId = session.customer as string;
        const stripeSubId = session.subscription as string;

        if (!userId) break;

        // Compute period end from trial_end or a reasonable future date
        const stripeSub = await stripe.subscriptions.retrieve(stripeSubId);
        // In Stripe v20, trial_end is the period end if in trial; otherwise billing_cycle_anchor + 30 days
        const periodEnd = stripeSub.trial_end
          ? new Date(stripeSub.trial_end * 1000)
          : new Date(stripeSub.billing_cycle_anchor * 1000 + 30 * 24 * 60 * 60 * 1000);

        // Upsert subscription
        const [existing] = await db
          .select({ id: subscriptions.id })
          .from(subscriptions)
          .where(eq(subscriptions.userId, userId))
          .limit(1);

        if (existing) {
          await db
            .update(subscriptions)
            .set({
              tier: plan,
              status: "active",
              stripeCustomerId,
              stripeSubscriptionId: stripeSubId,
              currentPeriodEnd: periodEnd,
              updatedAt: new Date(),
            })
            .where(eq(subscriptions.userId, userId));
        } else {
          await db.insert(subscriptions).values({
            userId,
            tier: plan,
            status: "active",
            stripeCustomerId,
            stripeSubscriptionId: stripeSubId,
            currentPeriodEnd: periodEnd,
          });
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId;
        if (!userId) break;

        const plan = sub.metadata?.plan ?? "starter";
        const status =
          sub.status === "active"
            ? "active"
            : sub.status === "canceled"
            ? "canceled"
            : "past_due";

        await db
          .update(subscriptions)
          .set({
            tier: sub.status === "active" ? plan : "free",
            status,
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.stripeSubscriptionId, sub.id));
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await db
          .update(subscriptions)
          .set({ tier: "free", status: "canceled", updatedAt: new Date() })
          .where(eq(subscriptions.stripeSubscriptionId, sub.id));
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error("Stripe webhook handler error:", err);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

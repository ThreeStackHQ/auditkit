import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _stripe = new Stripe(key, {} as any);
  }
  return _stripe;
}

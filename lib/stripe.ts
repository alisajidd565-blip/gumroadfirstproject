import Stripe from 'stripe';

// ─── Singleton Stripe client ──────────────────────────────────────────────────

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) throw new Error('Missing STRIPE_SECRET_KEY environment variable.');
    _stripe = new Stripe(secretKey, {
      apiVersion: '2023-10-16',
      typescript: true,
    });
  }
  return _stripe;
}

// ─── Create or retrieve a Stripe customer ────────────────────────────────────

export async function getOrCreateStripeCustomer(
  userId: string,
  email: string,
  existingCustomerId?: string | null
): Promise<string> {
  const stripe = getStripe();

  if (existingCustomerId) {
    return existingCustomerId;
  }

  const customer = await stripe.customers.create({
    email,
    metadata: { userId },
  });

  return customer.id;
}

// ─── Create a checkout session for plan upgrade ──────────────────────────────

export async function createCheckoutSession(params: {
  customerId: string;
  priceId: string;
  userId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<string> {
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: params.customerId,
    line_items: [
      {
        price: params.priceId,
        quantity: 1,
      },
    ],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: {
      userId: params.userId,
    },
    subscription_data: {
      metadata: {
        userId: params.userId,
      },
    },
    allow_promotion_codes: true,
  });

  return session.url!;
}

// ─── Create a billing portal session ─────────────────────────────────────────

export async function createBillingPortalSession(
  customerId: string,
  returnUrl: string
): Promise<string> {
  const stripe = getStripe();

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session.url;
}

// ─── Parse a Stripe webhook event safely ─────────────────────────────────────

export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) throw new Error('Missing STRIPE_WEBHOOK_SECRET.');

  return getStripe().webhooks.constructEvent(payload, signature, webhookSecret);
}

// ─── Resolve plan name from Stripe price ID ──────────────────────────────────

export function planFromPriceId(priceId?: string | null): 'pro' | 'business' | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PAID_PLAN_PRICE_ID) return 'pro';
  if (priceId === process.env.STRIPE_BUSINESS_PLAN_PRICE_ID) return 'business';
  return null;
}

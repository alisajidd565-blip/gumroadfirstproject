import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';
import { getOrCreateStripeCustomer, createCheckoutSession } from '@/lib/stripe';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const payload = requireAuth(req, res);
  if (!payload) return;

  const { plan } = req.body as { plan: 'pro' | 'business' };
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  // Resolve price ID from plan
  const priceMap: Record<string, string | undefined> = {
    pro:      process.env.STRIPE_PAID_PLAN_PRICE_ID,
    business: process.env.STRIPE_BUSINESS_PLAN_PRICE_ID,
  };

  const priceId = plan && priceMap[plan];
  if (!priceId) {
    return res.status(400).json({ error: 'Invalid or missing plan.' });
  }

  const db = getAdminSupabase();

  const { data: rawUser, error } = await db
  .from('users')
  .select('id, email, stripe_customer_id')
  .eq('id', payload.sub)
  .single();

if (error || !rawUser) {
  return res.status(404).json({ error: 'User not found.' });
}

const user = rawUser as { id: string; email: string; stripe_customer_id: string | null };

  try {
    // Get or create Stripe customer
    const customerId = await getOrCreateStripeCustomer(
      user.id,
      user.email,
      user.stripe_customer_id
    );

    // Persist the customer ID if it was just created
    if (!user.stripe_customer_id) {
      await db
        .from('users')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }

    // Create Stripe Checkout session
    const checkoutUrl = await createCheckoutSession({
      customerId,
      priceId,
      userId: user.id,
      successUrl: `${appUrl}/settings?upgrade=success`,
      cancelUrl: `${appUrl}/settings?upgrade=canceled`,
    });

    return res.status(200).json({ url: checkoutUrl });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    return res.status(500).json({ error: 'Failed to create checkout session.' });
  }
}

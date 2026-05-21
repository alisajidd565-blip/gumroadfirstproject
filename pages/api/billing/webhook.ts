// @ts-nocheck - Supabase type inference issues with complex queries
import type { NextApiRequest, NextApiResponse } from 'next';
import { buffer } from 'micro';
import Stripe from 'stripe';
import { constructWebhookEvent, planFromPriceId } from '@/lib/stripe';
import { getAdminSupabase } from '@/lib/supabase';

// Disable Next.js body parsing — Stripe needs the raw body to verify signatures
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const signature = req.headers['stripe-signature'];
  if (!signature) {
    return res.status(400).json({ error: 'Missing Stripe signature.' });
  }

  let event: Stripe.Event;

  try {
    const rawBody = await buffer(req);
    event = constructWebhookEvent(rawBody, signature as string);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return res.status(400).json({ error: 'Invalid webhook signature.' });
  }

  const db = getAdminSupabase();

  try {
    switch (event.type) {
      // ── Subscription activated (initial purchase) ─────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const subscriptionId = session.subscription as string;
        if (!userId || !subscriptionId) break;

        // Retrieve the subscription to get the price ID
        const stripe = (await import('@/lib/stripe')).getStripe();
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0]?.price?.id;
        const planName = planFromPriceId(priceId);

        if (!planName) {
          console.error('Unknown Stripe price ID:', priceId);
          break;
        }

        const { data: plan } = await db
          .from('plans')
          .select('id')
          .eq('name', planName)
          .single();

        if (plan) {
          await db
            .from('users')
            .update({
              plan_id: plan.id,
              stripe_subscription_id: subscriptionId,
              subscription_status: 'active',
              subscription_ends_at: null,
            })
            .eq('id', userId);
        }
        break;
      }

      // ── Subscription updated (e.g., upgrade/downgrade) ────────────────────
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;
        if (!userId) break;

        const status = subscription.status === 'active' ? 'active' : 'inactive';
        const endsAt = subscription.cancel_at
          ? new Date(subscription.cancel_at * 1000).toISOString()
          : null;
        const priceId = subscription.items.data[0]?.price?.id;
        const planName = planFromPriceId(priceId);

        const updates: Record<string, string | null> = {
          subscription_status: status,
          subscription_ends_at: endsAt,
        };

        if (planName) {
          const { data: plan } = await db
            .from('plans')
            .select('id')
            .eq('name', planName)
            .single();

          if (plan) {
            updates.plan_id = plan.id;
          }
        }

        await db
          .from('users')
          .update(updates)
          .eq('id', userId);
        break;
      }

      // ── Subscription canceled ─────────────────────────────────────────────
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;
        if (!userId) break;

        // Downgrade to free plan
        const { data: freePlan } = await db
          .from('plans')
          .select('id')
          .eq('name', 'free')
          .single();

        if (freePlan) {
          await db
            .from('users')
            .update({
              plan_id: freePlan.id,
              subscription_status: 'canceled',
              stripe_subscription_id: null,
              subscription_ends_at: null,
            })
            .eq('id', userId);
        }
        break;
      }

      // ── Invoice payment failed ────────────────────────────────────────────
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        await db
          .from('users')
          .update({ subscription_status: 'inactive' })
          .eq('stripe_customer_id', customerId);
        break;
      }

      default:
        // Unhandled event type — return 200 so Stripe doesn't retry
        break;
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('Webhook processing error:', err);
    // Return 200 to prevent Stripe from retrying on our processing error
    return res.status(200).json({ received: true, error: 'Processing error.' });
  }
}

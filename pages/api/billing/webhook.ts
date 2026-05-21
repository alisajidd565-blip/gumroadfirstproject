import type { NextApiRequest, NextApiResponse } from 'next';
import { buffer } from 'micro';
import {
  verifyPaddleWebhook,
  planFromPriceId,
  getPriceIdFromItems,
  getUserIdFromCustomData,
} from '@/lib/paddle';
import { getAdminSupabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type UserUpdate = Database['public']['Tables']['users']['Update'];

interface PaddleWebhookEvent {
  event_id: string;
  event_type: string;
  data: Record<string, unknown>;
}

export const config = {
  api: {
    bodyParser: false,
  },
};

async function resolveUserId(
  db: ReturnType<typeof getAdminSupabase>,
  data: Record<string, unknown>
): Promise<string | null> {
  const fromCustom = getUserIdFromCustomData(
    data.custom_data as Record<string, unknown> | undefined
  );
  if (fromCustom) return fromCustom;

  const customerId = data.customer_id as string | undefined;
  if (!customerId) return null;

  const { data: user } = await db
    .from('users')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  return (user as { id: string } | null)?.id ?? null;
}

async function applyPlan(
  db: ReturnType<typeof getAdminSupabase>,
  userId: string,
  planName: 'pro' | 'business',
  subscriptionId: string | null,
  status: 'active' | 'inactive' | 'canceled',
  endsAt: string | null = null
) {
  const { data: plan } = await db
    .from('plans')
    .select('id')
    .eq('name', planName)
    .single();

  if (!plan) return;

  const updates: UserUpdate = {
    plan_id: plan.id,
    subscription_status: status,
    subscription_ends_at: endsAt,
  };

  if (subscriptionId) {
    updates.stripe_subscription_id = subscriptionId;
  }

  await db.from('users').update(updates).eq('id', userId);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const signature = req.headers['paddle-signature'];
  if (!signature || typeof signature !== 'string') {
    return res.status(400).json({ error: 'Missing Paddle signature.' });
  }

  let event: PaddleWebhookEvent;

  try {
    const rawBody = await buffer(req);
    const bodyText = rawBody.toString('utf8');

    if (!verifyPaddleWebhook(bodyText, signature)) {
      return res.status(400).json({ error: 'Invalid webhook signature.' });
    }

    event = JSON.parse(bodyText) as PaddleWebhookEvent;
  } catch (err) {
    console.error('Webhook verification failed:', err);
    return res.status(400).json({ error: 'Invalid webhook payload.' });
  }

  const db = getAdminSupabase();

  try {
    const data = event.data;
    const items = data.items as Array<{ price?: { id?: string }; price_id?: string }> | undefined;
    const priceId = getPriceIdFromItems(items);
    const planName = planFromPriceId(priceId);
    const userId = await resolveUserId(db, data);
    const subscriptionId = (data.id as string) || (data.subscription_id as string) || null;

    switch (event.event_type) {
      case 'subscription.activated':
      case 'subscription.created': {
        if (!userId || !planName) break;
        await applyPlan(db, userId, planName, subscriptionId, 'active');
        break;
      }

      case 'subscription.updated': {
        if (!userId) break;
        const status = data.status === 'active' ? 'active' : 'inactive';

        if (planName) {
          await applyPlan(db, userId, planName, subscriptionId, status);
        } else {
          await db
            .from('users')
            .update({ subscription_status: status })
            .eq('id', userId);
        }
        break;
      }

      case 'subscription.canceled': {
        if (!userId) break;

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

      case 'subscription.past_due': {
        if (!userId) break;
        await db
          .from('users')
          .update({ subscription_status: 'inactive' })
          .eq('id', userId);
        break;
      }

      default:
        break;
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('Webhook processing error:', err);
    return res.status(500).json({ error: 'Webhook processing failed.' });
  }
}

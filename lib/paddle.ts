import { createHmac, timingSafeEqual } from 'crypto';

// ─── API client ───────────────────────────────────────────────────────────────

function getApiBase(): string {
  const env = process.env.PADDLE_ENVIRONMENT;
  if (env === 'sandbox') return 'https://sandbox-api.paddle.com';
  if (env === 'production') return 'https://api.paddle.com';
  const key = process.env.PADDLE_API_KEY ?? '';
  return key.includes('_sandbox_') ? 'https://sandbox-api.paddle.com' : 'https://api.paddle.com';
}

function getApiKey(): string {
  const apiKey = process.env.PADDLE_API_KEY;
  if (!apiKey) throw new Error('Missing PADDLE_API_KEY environment variable.');
  return apiKey;
}

interface PaddleResponse<T> {
  data: T;
  error?: { detail?: string; message?: string };
}

async function paddleRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${getApiBase()}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const json = (await res.json()) as PaddleResponse<T>;

  if (!res.ok) {
    const detail = json.error?.detail || json.error?.message || res.statusText;
    throw new Error(`Paddle API error: ${detail}`);
  }

  return json.data;
}

// ─── Customers ────────────────────────────────────────────────────────────────

export async function getOrCreatePaddleCustomer(
  userId: string,
  email: string,
  existingCustomerId?: string | null
): Promise<string> {
  if (existingCustomerId) return existingCustomerId;

  const customer = await paddleRequest<{ id: string }>('/customers', {
    method: 'POST',
    body: JSON.stringify({
      email,
      custom_data: { userId },
    }),
  });

  return customer.id;
}

// ─── Checkout ───────────────────────────────────────────────────────────────────

export async function createCheckoutTransaction(params: {
  priceId: string;
  userId: string;
  customerId?: string | null;
  successUrl: string;
  cancelUrl: string;
}): Promise<string> {
  const body: Record<string, unknown> = {
    items: [{ price_id: params.priceId, quantity: 1 }],
    collection_mode: 'automatic',
    custom_data: { userId: params.userId },
    checkout: {
      url: params.successUrl,
    },
  };

  if (params.customerId) {
    body.customer_id = params.customerId;
  }

  const transaction = await paddleRequest<{
    id: string;
    checkout?: { url?: string | null };
  }>('/transactions', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  const checkoutUrl =
    transaction.checkout?.url ?? buildCheckoutUrl(transaction.id);

  if (!checkoutUrl) {
    throw new Error(
      'Paddle did not return a checkout URL. Set PADDLE_DEFAULT_PAYMENT_LINK in your env.'
    );
  }

  return checkoutUrl;
}

function buildCheckoutUrl(transactionId: string): string | null {
  const base = process.env.PADDLE_DEFAULT_PAYMENT_LINK;
  if (!base) return null;
  const url = new URL(base);
  url.searchParams.set('_ptxn', transactionId);
  return url.toString();
}

// ─── Webhooks ─────────────────────────────────────────────────────────────────

export function verifyPaddleWebhook(rawBody: string, signatureHeader: string): boolean {
  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!secret) throw new Error('Missing PADDLE_WEBHOOK_SECRET.');

  const match = signatureHeader.match(/^ts=(\d+);h1=([a-f0-9]+)$/i);
  if (!match) return false;

  const [, ts, received] = match;
  const expected = createHmac('sha256', secret)
    .update(`${ts}:${rawBody}`)
    .digest('hex');

  try {
    return timingSafeEqual(Buffer.from(received, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}

export function planFromPriceId(priceId?: string | null): 'pro' | 'business' | null {
  if (!priceId) return null;
  if (priceId === process.env.PADDLE_PAID_PLAN_PRICE_ID) return 'pro';
  if (priceId === process.env.PADDLE_BUSINESS_PLAN_PRICE_ID) return 'business';
  return null;
}

// ─── Webhook payload helpers ──────────────────────────────────────────────────

export function getPriceIdFromItems(
  items?: Array<{ price?: { id?: string }; price_id?: string }>
): string | null {
  const item = items?.[0];
  return item?.price?.id ?? item?.price_id ?? null;
}

export function getUserIdFromCustomData(
  customData?: Record<string, unknown> | null
): string | null {
  const userId = customData?.userId;
  return typeof userId === 'string' ? userId : null;
}

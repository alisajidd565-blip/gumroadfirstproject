# ContentRepurposer AI

Transform any blog post or article into platform-optimized content for **Twitter/X, LinkedIn, Instagram, and Email** — powered by GPT-4 Turbo.

---

## Features

- **GPT-4 Turbo generation** with per-channel prompt engineering
- **4 channels**: Twitter, LinkedIn, Instagram, Email Newsletter
- **6 brand voices**: Professional, Casual, Witty, Authoritative, Inspirational, Educational
- **User auth**: Secure email/password with JWT + HttpOnly cookies
- **Subscription plans**: Free (3/mo), Pro (50/mo), Business (500/mo)
- **Stripe billing**: Checkout sessions, webhooks, auto plan sync
- **Project history**: All past projects saved, paginated dashboard
- **Editable outputs**: In-app editing + save
- **Copy & download**: One-click clipboard copy and .txt download
- **Dark mode**: System-aware + toggleable
- **Responsive**: Mobile-first Tailwind CSS design
- **Supabase**: Postgres database + Row Level Security
- **Deployable to Vercel** out of the box

---

## Tech Stack

| Layer       | Technology                              |
|-------------|----------------------------------------|
| Framework   | Next.js 14 (Pages Router)              |
| Language    | TypeScript                             |
| Styling     | Tailwind CSS                           |
| Database    | Supabase (Postgres)                    |
| Auth        | Custom JWT + bcrypt                    |
| AI          | OpenAI GPT-4 Turbo                     |
| Payments    | Stripe Checkout + Webhooks             |
| Deployment  | Vercel                                 |

---

## Project Structure

```
content-repurposer/
├── components/          # Reusable UI components
│   ├── Layout.tsx       # Page wrapper with Navbar/Footer
│   ├── Navbar.tsx       # Top navigation
│   ├── Footer.tsx       # Site footer
│   ├── ChannelSelector.tsx  # Channel toggle UI
│   ├── ContentOutput.tsx    # Tabbed output viewer/editor
│   └── PlanBadge.tsx    # Plan label badge
├── hooks/
│   ├── useAuth.ts       # Client-side auth state
│   └── useDarkMode.ts   # Dark mode toggle
├── lib/
│   ├── auth.ts          # JWT, bcrypt, cookie helpers
│   ├── supabase.ts      # Supabase client (browser + admin)
│   ├── openai.ts        # OpenAI generation logic
│   ├── stripe.ts        # Stripe checkout + webhook helpers
│   └── prompts.ts       # Per-channel prompt templates
├── pages/
│   ├── index.tsx        # Marketing / home
│   ├── login.tsx        # Login form
│   ├── signup.tsx       # Signup form
│   ├── dashboard.tsx    # Project list
│   ├── settings.tsx     # Account + billing settings
│   └── projects/
│       ├── new.tsx      # New project form
│       └── [id].tsx     # Project detail + outputs
├── pages/api/
│   ├── auth/
│   │   ├── signup.ts
│   │   ├── login.ts
│   │   ├── logout.ts
│   │   └── me.ts
│   ├── projects/
│   │   ├── index.ts     # List + create
│   │   └── [id].ts      # Get + delete
│   ├── outputs/
│   │   └── [id].ts      # Edit output content
│   ├── generate.ts      # AI generation trigger
│   ├── billing/
│   │   ├── create-checkout.ts
│   │   └── webhook.ts
│   └── user/
│       └── settings.ts
├── types/index.ts        # All TypeScript types + constants
├── styles/globals.css    # Tailwind + global styles
├── middleware.ts         # Route protection
├── schema.sql            # Database schema + seeds
├── .env.example          # Required environment variables
└── vercel.json           # Vercel deployment config
```

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/yourname/content-repurposer.git
cd content-repurposer
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Then fill in all values in `.env.local`. See below for where to get each one.

### 3. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **Settings → API** and copy your project URL, anon key, and service role key
3. Go to **SQL Editor** and run the full contents of `schema.sql`
4. Verify the `plans`, `users`, `projects`, and `outputs` tables exist

### 4. Set up OpenAI

1. Create an API key at [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Make sure your account has access to `gpt-4-turbo-preview`
3. Set `OPENAI_API_KEY` in your `.env.local`

### 5. Set up Stripe (optional for local dev)

1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Use **Test mode** (toggle in top-right of Stripe dashboard)
3. Go to **Products** → Create a product named "Pro Plan" → Add a price ($19/month, recurring)
4. Create a product named "Business Plan" → Add a price ($49/month, recurring)
5. Copy the Pro **Price ID** (starts with `price_`) → set as `STRIPE_PAID_PLAN_PRICE_ID`
6. Copy the Business **Price ID** → set as `STRIPE_BUSINESS_PLAN_PRICE_ID`
7. Copy your test secret key → `STRIPE_SECRET_KEY`
8. Copy your publishable key → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

For webhooks locally, use the Stripe CLI:

```bash
stripe listen --forward-to localhost:3000/api/billing/webhook
# Copy the webhook signing secret it prints → STRIPE_WEBHOOK_SECRET
```

### 6. Generate a JWT secret

```bash
openssl rand -base64 64
# Paste the output as JWT_SECRET in .env.local
```

### 7. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deployment to Vercel

### Option A: Vercel CLI

```bash
npm install -g vercel
vercel
```

Follow the prompts. Then add environment variables in the Vercel dashboard under **Project → Settings → Environment Variables**.

### Option B: GitHub integration

1. Push the repo to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import your repo
3. Add all environment variables from `.env.example` in the Vercel dashboard
4. Deploy

### After deploying

1. Update `NEXT_PUBLIC_APP_URL` to your production URL (e.g. `https://yourapp.vercel.app`)
2. Go to Stripe Dashboard → **Webhooks** → Add endpoint:
   - URL: `https://yourapp.vercel.app/api/billing/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
3. Copy the webhook signing secret → update `STRIPE_WEBHOOK_SECRET` in Vercel

---

## Environment Variables Reference

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_APP_URL` | Your app's URL (e.g. `https://yourapp.vercel.app`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API |
| `JWT_SECRET` | Generate with `openssl rand -base64 64` |
| `OPENAI_API_KEY` | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API keys |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe Dashboard → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Webhooks → signing secret |
| `STRIPE_PAID_PLAN_PRICE_ID` | Stripe Dashboard → Products → your Pro plan price ID |
| `STRIPE_BUSINESS_PLAN_PRICE_ID` | Stripe Dashboard → Products → your Business plan price ID |

---

## Monthly Limits Enforcement

Limits are enforced at the API level in `/api/projects/index.ts`:

1. On every project creation request, the API fetches the user's `projects_this_month` and `month_reset_at`
2. If `month_reset_at` is in the past, the counter is reset to 0
3. If `projects_this_month >= plan.project_limit`, the request is rejected with HTTP 403 and `code: "PLAN_LIMIT_REACHED"`
4. On success, `projects_this_month` is incremented

For automatic monthly resets without user login, you can set up a Supabase cron job:

```sql
-- In Supabase SQL editor, using pg_cron:
SELECT cron.schedule(
  'reset-monthly-counts',
  '0 0 1 * *',   -- midnight on the 1st of each month
  $$SELECT reset_monthly_project_counts()$$
);
```

---

## Adding More Channels

To add a new channel (e.g. TikTok):

1. Add `'tiktok'` to the `Channel` type in `types/index.ts`
2. Add its config to `CHANNEL_CONFIGS` in `types/index.ts`
3. Add a prompt builder function in `lib/prompts.ts`
4. Add the case to the `buildPrompt` switch statement
5. Add generation config to `CHANNEL_CONFIG` in `lib/openai.ts`

---

## License

MIT — use freely, build something great.
